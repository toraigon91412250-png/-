import {
  BattleAction,
  BattleFighter,
  CpuDifficulty,
  getEffectiveAttack,
  getEffectiveDefense,
} from '../types/game';

export interface CpuAiContext {
  recentPlayerActions?: BattleAction[];
  recentCpuActions?: BattleAction[];
  turnNumber?: number;
}

const ACTION_KEYS = ['ATTACK', 'EVADE', 'BUFF', 'SPECIAL', 'ULTIMATE'] as const;
type ActionKey = typeof ACTION_KEYS[number];

const PLAYER_PRIOR: Record<ActionKey, number> = {
  ATTACK: 0.40,
  EVADE: 0.15,
  BUFF: 0.10,
  SPECIAL: 0.25,
  ULTIMATE: 0.10,
};

function toKey(action: BattleAction): ActionKey {
  return action;
}

function predictPlayerAction(
  recentPlayerActions: BattleAction[],
  windowSize: number
): Record<ActionKey, number> {
  if (recentPlayerActions.length === 0) {
    return { ...PLAYER_PRIOR };
  }

  const recent = recentPlayerActions.slice(-windowSize);
  const scores: Record<ActionKey, number> = { ...PLAYER_PRIOR };
  const totalRecencyWeight = recent.reduce((sum, _, index) => sum + index + 1, 0);

  recent.forEach((action, index) => {
    scores[toKey(action)] += ((index + 1) / totalRecencyWeight) * 2.6;
  });

  // Repeating the same player action twice is a strong signal.
  if (recent.length >= 2 && recent[recent.length - 1] === recent[recent.length - 2]) {
    scores[toKey(recent[recent.length - 1])] += 1.4;
  }

  const total = ACTION_KEYS.reduce((sum, action) => sum + scores[action], 0);
  return ACTION_KEYS.reduce(
    (result, action) => {
      result[action] = scores[action] / total;
      return result;
    },
    {} as Record<ActionKey, number>
  );
}

function chooseReadableVariation(
  candidates: BattleAction[],
  best: BattleAction,
  difficulty: CpuDifficulty
): BattleAction {
  if (candidates.length <= 1) return best;

  // Randomness is constrained to strategically close alternatives.
  const variationChance = difficulty === 'EXPERT' ? 0.12 : 0.22;
  if (Math.random() >= variationChance) return best;

  return candidates[Math.floor(Math.random() * candidates.length)] ?? best;
}

export const CpuAi = {
  decideAction(
    cpu: BattleFighter,
    player: BattleFighter,
    difficulty: CpuDifficulty,
    context: CpuAiContext = {}
  ): BattleAction {
    const recentPlayerActions = context.recentPlayerActions ?? [];
    const recentCpuActions = context.recentCpuActions ?? [];
    const prediction = predictPlayerAction(
      recentPlayerActions,
      difficulty === 'EXPERT' ? 6 : 3
    );

    const cpuAttack = getEffectiveAttack(cpu);
    const playerDefense = getEffectiveDefense(player);
    const buffBonus = cpu.isBuffed ? cpu.buffDamageBonus || 125 : 0;
    const normalDamage = Math.max(15, cpuAttack - playerDefense) + buffBonus;
    const specialDamage = cpu.character.specialSkillDamage + buffBonus;
    const ultimateDamage = cpu.character.ultimateSkillDamage + buffBonus;

    const finalNormalDamage = cpu.character.id === 'kaiser'
      ? Math.max(0, normalDamage - 20)
      : normalDamage;

    const lethalNormal = player.currentHp <= finalNormalDamage;
    const lethalSpecial = player.currentHp <= specialDamage;
    const lethalUltimate = player.currentHp <= ultimateDamage;

    const playerBurstThreat =
      player.ultimateGauge >= 3 ||
      (player.specialCooldownRemaining <= 0 && player.featherChargeBonus >= 70);

    const playerOffenseSignal =
      prediction.ATTACK +
      prediction.SPECIAL * 0.92 +
      prediction.ULTIMATE;

    const candidates: BattleAction[] = [];
    const addCandidate = (action: BattleAction) => {
      if (!candidates.includes(action)) candidates.push(action);
    };

    // Guaranteed finishers come first. This prevents the anti-repeat rules
    // from ever throwing away an actual winning move.
    if (cpu.ultimateGauge >= 3 && lethalUltimate) return 'ULTIMATE';
    if (cpu.specialCooldownRemaining <= 0 && lethalSpecial) return 'SPECIAL';
    if (lethalNormal) return 'ATTACK';

    // Predict and answer burst turns.
    if (
      playerBurstThreat &&
      prediction.SPECIAL + prediction.ULTIMATE >= 0.40 &&
      player.currentHp >= cpu.maxHp * 0.45
    ) {
      return 'EVADE';
    }

    // If the player repeatedly chooses an offensive/defensive pattern,
    // select the response that makes that pattern less profitable.
    if (prediction.EVADE >= 0.48) {
      if (!cpu.isBuffed && cpu.currentHp > cpu.maxHp * 0.45) {
        addCandidate('BUFF');
      }
      addCandidate('ATTACK');
    } else if (prediction.BUFF >= 0.40) {
      if (cpu.specialCooldownRemaining <= 0) addCandidate('SPECIAL');
      addCandidate('ATTACK');
    } else if (prediction.ATTACK >= 0.48) {
      if (cpu.specialCooldownRemaining <= 0) addCandidate('SPECIAL');
      addCandidate('ATTACK');
    } else {
      addCandidate('ATTACK');
      if (cpu.specialCooldownRemaining <= 0) addCandidate('SPECIAL');
    }

    // Build pressure instead of spending a strong action on a bad timing.
    if (!cpu.isBuffed && player.currentHp > player.maxHp * 0.40) {
      const defensivePlayer =
        prediction.EVADE + prediction.BUFF >= 0.34;
      if (defensivePlayer || cpu.specialCooldownRemaining > 0) {
        addCandidate('BUFF');
      }
    }

    // Situational defense. Expert reacts more often and uses the longer memory.
    if (playerBurstThreat) {
      addCandidate('EVADE');
    }

    // Ultimate is valuable, but should feel like a committed decision rather than
    // an automatic gauge dump against a full-health player.
    if (cpu.ultimateGauge >= 3) {
      const ultimateThreshold = difficulty === 'EXPERT' ? 0.68 : 0.60;
      if (
        player.currentHp <= player.maxHp * ultimateThreshold ||
        prediction.ATTACK + prediction.SPECIAL >= 0.55
      ) {
        addCandidate('ULTIMATE');
      }
    }

    // Repetition breaker: a CPU that used the same action for two rounds in a row
    // strongly prefers a different family of action unless it has lethal.
    const lastCpuAction = recentCpuActions[recentCpuActions.length - 1];
    const secondLastCpuAction = recentCpuActions[recentCpuActions.length - 2];
    if (lastCpuAction && lastCpuAction === secondLastCpuAction) {
      const filtered = candidates.filter(action => action !== lastCpuAction);
      if (filtered.length > 0) {
        return chooseReadableVariation(filtered, filtered[0], difficulty);
      }
    }

    const filteredLast = lastCpuAction
      ? candidates.filter(action => action !== lastCpuAction)
      : candidates;

    if (filteredLast.length > 0) {
      return chooseReadableVariation(filteredLast, filteredLast[0], difficulty);
    }

    // Absolute fallback: valid and deterministic enough to remain debuggable.
    if (cpu.specialCooldownRemaining <= 0 && playerOffenseSignal > 0.55) {
      return 'SPECIAL';
    }

    return 'ATTACK';
  },
};
