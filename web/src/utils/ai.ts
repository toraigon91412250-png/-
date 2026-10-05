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

function chooseWeightedAction(
  scores: Array<{ action: BattleAction; score: number }>,
  difficulty: CpuDifficulty
): BattleAction {
  const sorted = scores
    .filter(entry => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score);

  const best = sorted[0]?.action ?? 'ATTACK';
  if (sorted.length <= 1) return best;

  const topScore = sorted[0].score;
  const runnerUpScore = sorted[1].score;
  const closeEnough = sorted.filter(entry => entry.score >= topScore - Math.max(8, topScore * 0.18));

  const variationChance = difficulty === 'EXPERT' ? 0.08 : 0.16;
  const shouldVary = Math.random() < variationChance && closeEnough.length > 1 && topScore - runnerUpScore <= 18;

  if (shouldVary) {
    return closeEnough[Math.floor(Math.random() * closeEnough.length)]?.action ?? best;
  }

  return best;
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

    // How dangerous the next player turn is. This is deliberately based on the
    // actions the player can actually take now, rather than hidden future state.
    const playerBurstThreat =
      player.ultimateGauge >= 3 ||
      (player.specialCooldownRemaining <= 0 && player.featherChargeBonus >= 70);

    const playerOffenseSignal =
      prediction.ATTACK +
      prediction.SPECIAL * 0.92 +
      prediction.ULTIMATE;

    const recentSamePlayerAction =
      recentPlayerActions.length >= 2 &&
      recentPlayerActions[recentPlayerActions.length - 1] === recentPlayerActions[recentPlayerActions.length - 2];

    const lastCpuAction = recentCpuActions[recentCpuActions.length - 1];
    const secondLastCpuAction = recentCpuActions[recentCpuActions.length - 2];
    const cpuRepeated = Boolean(
      lastCpuAction &&
      secondLastCpuAction &&
      lastCpuAction === secondLastCpuAction
    );

    // Finishers are never sacrificed for variety.
    if (cpu.ultimateGauge >= 3 && lethalUltimate) return 'ULTIMATE';
    if (cpu.specialCooldownRemaining <= 0 && lethalSpecial) return 'SPECIAL';
    if (lethalNormal) return 'ATTACK';

    const scores: Array<{ action: BattleAction; score: number }> = [
      { action: 'ATTACK', score: 42 },
      { action: 'EVADE', score: 18 },
      { action: 'BUFF', score: 0 },
      { action: 'SPECIAL', score: -Infinity },
      { action: 'ULTIMATE', score: -Infinity },
    ];

    const scoreOf = (action: BattleAction) =>
      scores.find(entry => entry.action === action)!;

    // ATTACK: reliable pressure, but bad into a strongly telegraphed evade pattern.
    scoreOf('ATTACK').score += prediction.ATTACK * 18;
    scoreOf('ATTACK').score += prediction.BUFF * 16;
    scoreOf('ATTACK').score -= prediction.EVADE * 34;
    if (player.currentHp <= player.character.maxHp * 0.35) {
      scoreOf('ATTACK').score += 14;
    }

    // EVADE: strongest response to an imminent burst, but it should not become
    // the default defensive loop.
    scoreOf('EVADE').score += prediction.SPECIAL * 26;
    scoreOf('EVADE').score += prediction.ULTIMATE * 34;
    scoreOf('EVADE').score += playerBurstThreat ? 32 : 0;
    scoreOf('EVADE').score -= prediction.EVADE * 20;
    if (cpu.currentHp <= cpu.character.maxHp * 0.30) {
      scoreOf('EVADE').score += 8;
    }

    // BUFF: use it when the player is likely to spend a low-pressure turn.
    if (!cpu.isBuffed && player.currentHp > player.character.maxHp * 0.40) {
      const defensiveSignal = prediction.EVADE + prediction.BUFF;
      scoreOf('BUFF').score =
        24 +
        defensiveSignal * 28 +
        (cpu.specialCooldownRemaining > 0 ? 18 : 0) -
        prediction.ULTIMATE * 20 -
        prediction.SPECIAL * 10;
    }

    // SPECIAL: spend it when it is ready and likely to connect for meaningful
    // pressure. A predicted evade strongly discounts it.
    if (cpu.specialCooldownRemaining <= 0) {
      scoreOf('SPECIAL').score =
        34 +
        prediction.ATTACK * 24 +
        prediction.BUFF * 20 +
        playerOffenseSignal * 12 -
        prediction.EVADE * 36;

      if (player.currentHp <= specialDamage * 1.15) {
        scoreOf('SPECIAL').score += 16;
      }
    }

    // ULTIMATE: commit when it is dangerous to hold or when the prediction says
    // the player is about to attack. Otherwise, saving the gauge remains valid.
    if (cpu.ultimateGauge >= 3) {
      const hpPressure = 1 - player.currentHp / Math.max(1, player.character.maxHp);
      scoreOf('ULTIMATE').score =
        20 +
        hpPressure * 42 +
        playerOffenseSignal * 34 +
        (lethalUltimate ? 120 : 0) -
        prediction.EVADE * 28;

      if (difficulty === 'EXPERT') {
        scoreOf('ULTIMATE').score += playerBurstThreat ? 12 : 0;
      }
    }

    // Learning from repeated player habits is the central second-stage change:
    // strong current patterns directly move the CPU toward a counter-action.
    if (recentSamePlayerAction) {
      const repeated = recentPlayerActions[recentPlayerActions.length - 1];
      if (repeated === 'ATTACK') {
        scoreOf('EVADE').score += difficulty === 'EXPERT' ? 14 : 9;
        scoreOf('SPECIAL').score += 7;
      } else if (repeated === 'SPECIAL' || repeated === 'ULTIMATE') {
        scoreOf('EVADE').score += difficulty === 'EXPERT' ? 18 : 11;
      } else if (repeated === 'EVADE') {
        scoreOf('BUFF').score += 12;
        scoreOf('ATTACK').score += 8;
      } else if (repeated === 'BUFF') {
        scoreOf('ATTACK').score += difficulty === 'EXPERT' ? 18 : 12;
        scoreOf('SPECIAL').score += 9;
      }
    }

    // Avoid mindless CPU loops while retaining tactical exceptions above.
    if (cpuRepeated && lastCpuAction) {
      scoreOf(lastCpuAction).score -= difficulty === 'EXPERT' ? 16 : 22;
    }

    // Expert keeps a little more weight on prediction; Normal remains readable
    // and somewhat fallible so the telegraph is useful without being perfect.
    if (difficulty === 'EXPERT') {
      if (prediction.ATTACK >= 0.45) scoreOf('SPECIAL').score += 6;
      if (prediction.EVADE >= 0.42) scoreOf('BUFF').score += 8;
      if (playerBurstThreat) scoreOf('EVADE').score += 8;
    }

    // Never select an unavailable action.
    const legalScores = scores.filter(entry => {
      if (entry.action === 'SPECIAL') return cpu.specialCooldownRemaining <= 0;
      if (entry.action === 'ULTIMATE') return cpu.ultimateGauge >= 3;
      if (entry.action === 'BUFF') return !cpu.isBuffed;
      return true;
    });

    const best = legalScores
      .filter(entry => Number.isFinite(entry.score))
      .sort((a, b) => b.score - a.score)[0];

    if (!best) return 'ATTACK';

    return chooseWeightedAction(legalScores, difficulty);
  },
};
