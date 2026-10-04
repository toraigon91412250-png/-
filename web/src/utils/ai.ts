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

const ACTIONS: BattleAction[] = ['ATTACK', 'EVADE', 'BUFF', 'SPECIAL', 'ULTIMATE'];

const PLAYER_PRIOR: Record<BattleAction, number> = {
  ATTACK: 0.40,
  EVADE: 0.15,
  BUFF: 0.10,
  SPECIAL: 0.25,
  ULTIMATE: 0.10,
};

function predictPlayerAction(history: BattleAction[], windowSize: number): Record<BattleAction, number> {
  const counts: Record<BattleAction, number> = { ...PLAYER_PRIOR };

  if (history.length === 0) {
    return { ...PLAYER_PRIOR };
  }

  const recent = history.slice(-windowSize);
  const recentWeight = recent.reduce((sum, _, index) => sum + index + 1, 0);

  recent.forEach((action, index) => {
    counts[action] += ((index + 1) / recentWeight) * 2.6;
  });

  if (recent.length >= 2 && recent[recent.length - 1] === recent[recent.length - 2]) {
    counts[recent[recent.length - 1]] += 1.4;
  }

  const total = ACTIONS.reduce((sum, action) => sum + counts[action], 0);
  return ACTIONS.reduce(
    (result, action) => {
      result[action] = counts[action] / total;
      return result;
    },
    {} as Record<BattleAction, number>
  );
}

function scoreAction(
  action: BattleAction,
  cpu: BattleFighter,
  player: BattleFighter,
  prediction: Record<BattleAction, number>,
  recentCpuActions: BattleAction[],
  difficulty: CpuDifficulty
): number {
  const repetitionPenalty = difficulty === 'EXPERT' ? 150 : 120;
  const secondRepeatPenalty = difficulty === 'EXPERT' ? 70 : 55;

  const cpuBuff = cpu.isBuffed ? cpu.buffDamageBonus || 125 : 0;
  const cpuAttack = getEffectiveAttack(cpu);
  const playerDefense = getEffectiveDefense(player);
  const normalDamage = Math.max(15, cpuAttack - playerDefense) + cpuBuff;
  const normalFinalDamage = cpu.character.id === 'kaiser'
    ? Math.max(0, normalDamage - 20)
    : normalDamage;
  const specialDamage = cpu.character.specialSkillDamage + cpuBuff;
  const ultimateDamage = cpu.character.ultimateSkillDamage + cpuBuff;

  const lethalNormal = player.currentHp <= normalFinalDamage;
  const lethalSpecial = player.currentHp <= specialDamage;
  const lethalUltimate = player.currentHp <= ultimateDamage;

  const offensivePrediction =
    prediction.ATTACK +
    prediction.SPECIAL * 0.92 +
    prediction.ULTIMATE;
  const burstThreat =
    player.ultimateGauge >= 3
      ? 1
      : player.specialCooldownRemaining <= 0 && player.featherChargeBonus >= 80
        ? 0.85
        : player.specialCooldownRemaining <= 0 && player.featherChargeBonus >= 40
          ? 0.55
          : 0;

  let score = -100000;

  switch (action) {
    case 'ATTACK':
      score = normalFinalDamage;
      score += prediction.ATTACK * 42;
      score += prediction.EVADE * 34;
      score += prediction.BUFF * 20;
      if (lethalNormal) score += 650;
      break;

    case 'SPECIAL':
      if (cpu.specialCooldownRemaining > 0) return -100000;
      score = specialDamage * 0.92;
      score += prediction.ATTACK * 105;
      score += prediction.SPECIAL * 45;
      score += prediction.ULTIMATE * 85;
      score -= prediction.EVADE * 85;
      score += player.currentHp <= player.maxHp * 0.55 ? 50 : 0;
      if (lethalSpecial) score += 800;
      break;

    case 'ULTIMATE':
      if (cpu.ultimateGauge < 3) return -100000;
      score = ultimateDamage * 0.98;
      score += prediction.ATTACK * 70;
      score += prediction.SPECIAL * 85;
      score += prediction.ULTIMATE * 120;
      score -= prediction.EVADE * 110;
      if (player.currentHp <= player.maxHp * 0.70) score += 100;
      if (lethalUltimate) score += 1200;
      if (player.currentHp > player.maxHp * 0.80 && !lethalUltimate) score -= 250;
      break;

    case 'EVADE':
      score = offensivePrediction * 135;
      score += burstThreat * 145;
      score += player.ultimateGauge >= 3 ? 85 : 0;
      score += player.specialCooldownRemaining <= 0 ? 35 : 0;
      score -= (prediction.EVADE + prediction.BUFF) * 55;
      if (lethalUltimate || lethalSpecial || lethalNormal) score += 120;
      break;

    case 'BUFF':
      if (cpu.isBuffed) return -100000;
      score = 145;
      score += prediction.EVADE * 110;
      score += prediction.BUFF * 40;
      score += cpu.specialCooldownRemaining > 0 ? 55 : 0;
      score += cpu.ultimateGauge >= 3 ? 35 : 0;
      score -= offensivePrediction * 115;
      score -= burstThreat * 80;
      if (player.currentHp < player.maxHp * 0.35) score -= 160;
      break;
  }

  const lastCpuAction = recentCpuActions[recentCpuActions.length - 1];
  const secondLastCpuAction = recentCpuActions[recentCpuActions.length - 2];

  if (action === lastCpuAction) score -= repetitionPenalty;
  if (action === secondLastCpuAction) score -= secondRepeatPenalty;

  // A clear kill is always more important than the anti-repeat rule.
  if (action === 'SPECIAL' && lethalSpecial) score += repetitionPenalty + secondRepeatPenalty;
  if (action === 'ULTIMATE' && lethalUltimate) score += repetitionPenalty + secondRepeatPenalty;
  if (action === 'ATTACK' && lethalNormal) score += repetitionPenalty;

  return score;
}

function chooseFromRanked(
  ranked: Array<{ action: BattleAction; score: number }>,
  difficulty: CpuDifficulty
): BattleAction {
  const best = ranked[0];
  if (!best || best.score <= -99999) return 'ATTACK';

  const candidateGap = difficulty === 'EXPERT' ? 45 : 85;
  const candidates = ranked
    .slice(0, 3)
    .filter(entry => entry.score >= best.score - candidateGap);

  if (candidates.length <= 1) return best.action;

  // Never choose a random bad move. Variety is selected only among strategically close moves.
  const variationChance = difficulty === 'EXPERT' ? 0.16 : 0.28;
  if (Math.random() >= variationChance) return best.action;

  const totalWeight = candidates.reduce((sum, entry, index) => sum + (candidates.length - index), 0);
  let roll = Math.random() * totalWeight;
  for (let index = 0; index < candidates.length; index += 1) {
    roll -= candidates.length - index;
    if (roll <= 0) return candidates[index].action;
  }

  return best.action;
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
    const windowSize = difficulty === 'EXPERT' ? 6 : 3;
    const prediction = predictPlayerAction(recentPlayerActions, windowSize);

    const ranked = ACTIONS
      .map(action => ({
        action,
        score: scoreAction(action, cpu, player, prediction, recentCpuActions, difficulty),
      }))
      .sort((a, b) => b.score - a.score);

    return chooseFromRanked(ranked, difficulty);
  },
};
