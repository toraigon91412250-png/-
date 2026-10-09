import type { RaidAction, RaidOutcome, RaidPattern, RaidPhase, RaidState } from './types';

export const RAID_RULES = {
  PLAYER_MAX_HP: 4000,
  PLAYER_MAX_MP: 60,
  PLAYER_MAX_TP: 100,
  PHASE_ONE_BOSS_HP: 5200,
  PHASE_TWO_BOSS_HP: 6800,
  BREAK_MAX: 100,
  MP_REGEN_PER_TURN: 5,
  GUARD_COST: 8,
  COUNTER_COST: 12,
  FEATHER_COST: 18,
  FOCUS_COST: 8,
  FEATHER_COOLDOWN: 2,
} as const;

const ACTION_COST: Partial<Record<RaidAction, number>> = {
  FEATHER: RAID_RULES.FEATHER_COST,
  GUARD: RAID_RULES.GUARD_COST,
  COUNTER: RAID_RULES.COUNTER_COST,
  FOCUS: RAID_RULES.FOCUS_COST,
};

const PATTERN_DAMAGE: Record<RaidPattern, { min: number; max: number }> = {
  SWEEP: { min: 420, max: 620 },
  CHARGE: { min: 850, max: 1120 },
  VOID: { min: 560, max: 760 },
  RAGE: { min: 1050, max: 1380 },
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function rollInteger(min: number, max: number, random: () => number): number {
  const sample = clamp(random(), 0, 0.999999999);
  return Math.floor(min + sample * (max - min + 1));
}

function isHeavyPattern(pattern: RaidPattern): boolean {
  return pattern === 'CHARGE' || pattern === 'RAGE';
}

export function createInitialRaidState(): RaidState {
  return {
    turn: 1,
    phase: 1,
    bossHp: RAID_RULES.PHASE_ONE_BOSS_HP,
    bossMaxHp: RAID_RULES.PHASE_ONE_BOSS_HP,
    playerHp: RAID_RULES.PLAYER_MAX_HP,
    playerMaxHp: RAID_RULES.PLAYER_MAX_HP,
    mp: RAID_RULES.PLAYER_MAX_MP,
    maxMp: RAID_RULES.PLAYER_MAX_MP,
    tp: 0,
    breakGauge: 0,
    brokenTurns: 0,
    bossPattern: 'SWEEP',
    featherCooldown: 0,
    focusCharge: false,
    combo: 0,
    repeatCount: 0,
    maxCombo: 0,
    totalDamage: 0,
    lastDamage: 0,
    damageTaken: 0,
    lastIncomingDamage: 0,
    bestHit: 0,
    perfectReads: 0,
    breakCount: 0,
    adaptation: 0,
    lastAction: null,
    lastRead: 'neutral',
    outcome: {
      title: '予告を読め',
      detail: 'ボスの予告に合った行動を選び、反撃の機会を作ろう。',
      tone: 'neutral',
    },
    score: 0,
    result: 'ACTIVE',
    log: 'アビスコアが動き出した。最初の予告は「黒爪薙ぎ」。',
  };
}

export function canUseRaidAction(state: RaidState, action: RaidAction): boolean {
  if (state.result !== 'ACTIVE') return false;
  if (action === 'FEATHER' && state.featherCooldown > 0) return false;
  if (action === 'ULTIMATE' && state.tp < RAID_RULES.PLAYER_MAX_TP) return false;
  return state.mp >= (ACTION_COST[action] ?? 0);
}

function chooseNextPattern(
  phase: RaidPhase,
  previous: RaidPattern,
  lastAction: RaidAction,
  repeats: number,
  random: () => number,
): RaidPattern {
  const pool: RaidPattern[] = phase === 1
    ? ['SWEEP', 'CHARGE', 'VOID']
    : ['SWEEP', 'CHARGE', 'VOID', 'RAGE'];

  const actionBias: Partial<Record<RaidAction, Partial<Record<RaidPattern, number>>>> = {
    ATTACK: { CHARGE: 2, VOID: 1 },
    FEATHER: { SWEEP: 2, CHARGE: 1 },
    GUARD: { VOID: 2, CHARGE: 1 },
    COUNTER: { SWEEP: 2, VOID: 1 },
    FOCUS: { CHARGE: 2, RAGE: 2 },
    ULTIMATE: { VOID: 2, RAGE: 2 },
  };

  const bias = phase === 2 && repeats >= 2 ? actionBias[lastAction] ?? {} : {};
  const weighted = pool.map(pattern => {
    if (pattern === previous) return { pattern, weight: 0 };
    const repeatPressure = phase === 2 && repeats >= 2 ? 1.4 : 1;
    const weight = 3 + (bias[pattern] ?? 0) * repeatPressure;
    return { pattern, weight };
  }).filter(item => item.weight > 0);

  const total = weighted.reduce((sum, item) => sum + item.weight, 0);
  if (total <= 0) return pool.find(pattern => pattern !== previous) ?? pool[0];

  let roll = clamp(random(), 0, 0.999999999) * total;
  for (const item of weighted) {
    roll -= item.weight;
    if (roll < 0) return item.pattern;
  }
  return weighted[weighted.length - 1].pattern;
}

function calculateScore(state: Pick<RaidState,
  'totalDamage' | 'perfectReads' | 'breakCount' | 'maxCombo' | 'damageTaken' | 'turn' | 'result'
>): number {
  const victoryBonus = state.result === 'VICTORY' ? 2500 : 0;
  return Math.max(0, Math.round(
    state.totalDamage +
    state.perfectReads * 650 +
    state.breakCount * 1200 +
    state.maxCombo * 180 -
    state.damageTaken * 0.5 -
    state.turn * 35 +
    victoryBonus,
  ));
}

function withScore(state: RaidState): RaidState {
  return { ...state, score: calculateScore(state) };
}

/**
 * Resolve one committed player action and the boss response as one deterministic
 * state transition. Supplying a seeded/random function makes combat rules testable.
 */
export function resolveRaidAction(
  state: RaidState,
  action: RaidAction,
  random: () => number = Math.random,
): RaidState {
  if (!canUseRaidAction(state, action)) return state;

  const pattern = state.bossPattern;
  const heavy = isHeavyPattern(pattern);
  const wasBroken = state.brokenTurns > 0;
  const repeatCount = state.lastAction === action ? state.repeatCount + 1 : 1;
  const perfectCounter = action === 'COUNTER' && heavy && !wasBroken;
  const featherInterrupt = action === 'FEATHER' && pattern === 'VOID' && !wasBroken;
  const perfectGuard = action === 'GUARD' && heavy && !wasBroken;
  const sweepOpening = action === 'ATTACK' && pattern === 'SWEEP';
  const counterMiss = action === 'COUNTER' && !perfectCounter && !wasBroken;
  const mpCost = ACTION_COST[action] ?? 0;
  let nextMp = clamp(state.mp - mpCost, 0, RAID_RULES.PLAYER_MAX_MP);
  let nextTp = state.tp;
  let baseDamage = 0;
  let breakGain = 0;

  switch (action) {
    case 'ATTACK':
      baseDamage = rollInteger(650, 760, random);
      breakGain = sweepOpening ? 24 : 16;
      nextTp += 12;
      break;
    case 'FEATHER':
      baseDamage = rollInteger(900, 1080, random);
      breakGain = featherInterrupt ? 48 : 27;
      nextTp += 18;
      break;
    case 'COUNTER':
      baseDamage = perfectCounter ? rollInteger(1080, 1280, random) : rollInteger(180, 280, random);
      breakGain = perfectCounter ? 42 : 5;
      nextTp += perfectCounter ? 22 : 9;
      break;
    case 'GUARD':
      nextTp += perfectGuard ? 22 : 14;
      breakGain = perfectGuard ? 28 : 0;
      break;
    case 'FOCUS':
      nextTp += 28;
      break;
    case 'ULTIMATE':
      baseDamage = rollInteger(1850, 2200, random);
      breakGain = 22;
      nextTp = 0;
      break;
  }

  const hasDamage = baseDamage > 0;
  const comboMultiplier = hasDamage ? 1 + Math.min(state.combo, 3) * 0.045 : 1;
  const focusMultiplier = hasDamage && state.focusCharge && action !== 'FOCUS' ? 1.42 : 1;
  const brokenMultiplier = hasDamage && wasBroken ? 1.5 : 1;
  const readMultiplier = sweepOpening ? 1.12 : perfectCounter || featherInterrupt ? 1.08 : 1;
  const finalDamage = Math.round(baseDamage * comboMultiplier * focusMultiplier * brokenMultiplier * readMultiplier);
  const damageDealt = Math.min(state.bossHp, finalDamage);
  const nextBossHp = Math.max(0, state.bossHp - damageDealt);

  const nextBreakGauge = wasBroken
    ? state.breakGauge
    : clamp(state.breakGauge + breakGain, 0, RAID_RULES.BREAK_MAX);
  const triggersBreak = !wasBroken && nextBreakGauge >= RAID_RULES.BREAK_MAX;
  const playerHpAfterGuard = action === 'GUARD'
    ? Math.min(state.playerMaxHp, state.playerHp + 120)
    : state.playerHp;
  nextTp = clamp(nextTp, 0, RAID_RULES.PLAYER_MAX_TP);
  nextMp = Math.min(RAID_RULES.PLAYER_MAX_MP, nextMp + RAID_RULES.MP_REGEN_PER_TURN);
  const nextFeatherCooldown = action === 'FEATHER'
    ? RAID_RULES.FEATHER_COOLDOWN
    : Math.max(0, state.featherCooldown - 1);
  const nextFocusCharge = action === 'FOCUS'
    ? true
    : hasDamage ? false : state.focusCharge;

  let nextCombo = hasDamage && !counterMiss ? state.combo + 1 : 0;
  if (wasBroken && !hasDamage) nextCombo = state.combo;
  const nextMaxCombo = Math.max(state.maxCombo, nextCombo);

  let readOutcome: RaidOutcome = {
    title: action === 'FOCUS'
      ? '集中を整える'
      : action === 'GUARD'
        ? '防御態勢'
        : action === 'FEATHER'
          ? '羽弾を放つ'
          : action === 'COUNTER'
            ? '迎撃を試みる'
            : action === 'ULTIMATE'
              ? '必殺技を解放'
              : '攻撃を仕掛ける',
    detail: action === 'FOCUS'
      ? '次の攻撃を強化。必殺ゲージも大きく上昇した。'
      : action === 'GUARD'
        ? 'このターンの被害を抑え、少しだけHPを回復した。'
        : action === 'FEATHER'
          ? '羽弾を放ち、ボスにダメージを与える。虚無落雷なら中断できる。'
          : action === 'COUNTER'
            ? '大技の予告に合わせて迎撃を試みる。'
            : action === 'ULTIMATE'
              ? '蓄積した必殺ゲージを使い、強力な一撃を放つ。'
              : 'ダメージと必殺ゲージを蓄積する。',
    tone: 'neutral',
  };

  if (perfectCounter) {
    readOutcome = { title: 'PERFECT READ', detail: '迎撃成功。大技を打ち消し、BREAKを大きく進めた。', tone: 'perfect' };
  } else if (featherInterrupt) {
    readOutcome = { title: 'SPELL INTERRUPT', detail: '羽弾が虚無落雷の詠唱を断ち切った。', tone: 'perfect' };
  } else if (perfectGuard) {
    readOutcome = { title: 'PERFECT GUARD', detail: '大技を読み、防御とBREAKを同時に整えた。', tone: 'good' };
  } else if (counterMiss) {
    readOutcome = { title: 'COUNTER MISS', detail: '予告と行動が噛み合わない。反撃を受ける危険が高まった。', tone: 'danger' };
  } else if (sweepOpening) {
    readOutcome = { title: 'OPENING HIT', detail: '予備動作中に攻撃を差し込んだ。ダメージは伸びるが、反撃への注意も必要。', tone: 'good' };
  } else if (wasBroken) {
    readOutcome = { title: 'BURST WINDOW', detail: 'BREAK中。火力が大きく上昇している。', tone: 'good' };
  }

  const nextPhaseTwo = state.phase === 1 && nextBossHp <= 0;
  const victory = state.phase === 2 && nextBossHp <= 0;
  const perfectReadCount = state.perfectReads + (perfectCounter || featherInterrupt || perfectGuard ? 1 : 0);
  const nextBreakCount = state.breakCount + (triggersBreak ? 1 : 0);
  const nextDamageTotal = state.totalDamage + damageDealt;
  const nextBestHit = Math.max(state.bestHit, damageDealt);
  const nextLog = counterMiss
    ? '迎撃を外した。アビスコアが強い反撃を準備している。'
    : perfectCounter
      ? '大技を迎撃。アビスコアの攻撃を止めた。'
      : featherInterrupt
        ? '羽弾で詠唱を中断。ボスの攻撃を止めた。'
        : action === 'ULTIMATE'
          ? '終天羽星穿ちが炸裂。深淵の核を貫いた。'
          : action === 'FEATHER'
            ? 'いれーな「羽弾」。核へ向けて高速の一撃を放つ。'
            : action === 'GUARD'
              ? '防御態勢。攻撃を受け止め、次の判断へつなげる。'
              : action === 'FOCUS'
                ? '集中。次の攻撃と必殺ゲージに力を蓄えた。'
                : '通常攻撃。核の表面に亀裂が走る。';

  let incomingDamage = 0;
  let mpDrain = 0;
  const nextAdaptation = state.phase === 2
    ? repeatCount >= 2 ? Math.min(3, state.adaptation + 1) : Math.max(0, state.adaptation - 1)
    : 0;
  const bossShouldAttack = !wasBroken && !perfectCounter && !featherInterrupt && !triggersBreak && !nextPhaseTwo && !victory;

  if (bossShouldAttack) {
    const range = PATTERN_DAMAGE[pattern];
    const rawDamage = rollInteger(range.min, range.max, random);
    const adaptationMultiplier = state.phase === 2 ? 1.08 + nextAdaptation * 0.08 : 1;
    const counterPunishment = counterMiss ? 1.2 : 1;
    const guardMultiplier = action === 'GUARD' ? (heavy ? 0.45 : 0.65) : 1;
    const reducedDamage = Math.round(rawDamage * adaptationMultiplier * counterPunishment * guardMultiplier);
    const guardShield = action === 'GUARD' ? (heavy ? 420 : 220) : 0;
    incomingDamage = Math.max(0, reducedDamage - guardShield);
    if (pattern === 'VOID') {
      mpDrain = Math.min(nextMp, 8);
      nextMp = Math.max(0, nextMp - mpDrain);
    }
  }

  const nextPlayerHp = Math.max(0, playerHpAfterGuard - incomingDamage);
  const defeated = nextPlayerHp <= 0;
  const newResult = victory ? 'VICTORY' : defeated ? 'DEFEAT' : 'ACTIVE';

  let nextPhase: RaidPhase = state.phase;
  let nextBossHpValue = nextBossHp;
  let nextBossMaxHp = state.bossMaxHp;
  let nextPattern = pattern;
  let nextBrokenTurns = wasBroken ? Math.max(0, state.brokenTurns - 1) : triggersBreak ? 1 : 0;
  let nextGauge = triggersBreak ? 0 : nextBreakGauge;
  let finalLog = nextLog;
  let finalOutcome = readOutcome;

  if (nextPhaseTwo) {
    nextPhase = 2;
    nextBossHpValue = RAID_RULES.PHASE_TWO_BOSS_HP;
    nextBossMaxHp = RAID_RULES.PHASE_TWO_BOSS_HP;
    nextGauge = 0;
    nextBrokenTurns = 0;
    nextPattern = 'RAGE';
    finalLog = '深淵解放。アビスコアが第2形態へ移行した。同じ行動を続けると対応が鋭くなる。';
    finalOutcome = { title: 'PHASE II · 深淵解放', detail: 'ボスの攻撃が激化。行動を変えて適応を崩そう。', tone: 'phase' };
  } else if (victory) {
    nextBossHpValue = 0;
    nextBrokenTurns = 0;
    finalLog = '討伐成功。深淵の核は砕け散った。';
    finalOutcome = { title: 'RAID CLEAR', detail: 'アビスコアを討伐。戦闘スコアが記録された。', tone: 'victory' };
  } else if (defeated) {
    finalLog = 'HPが尽きた。アビスコアに押し切られた。行動を読み直して再挑戦しよう。';
    finalOutcome = { title: 'RAID FAILED', detail: '防御、迎撃、詠唱中断を予告に合わせよう。', tone: 'danger' };
  } else if (triggersBreak) {
    finalLog = 'BREAK! 深淵の核が崩壊。次の行動でバーストを狙える。';
    finalOutcome = { title: 'BREAK!', detail: '次の攻撃は1.5倍。必殺技を温存していたなら大きな好機。', tone: 'good' };
  } else if (wasBroken) {
    finalLog = 'BREAK WINDOW終了。アビスコアが次の予告を組み立てる。';
    nextPattern = chooseNextPattern(nextPhase, pattern, action, repeatCount, random);
  } else if (perfectCounter || featherInterrupt) {
    nextPattern = chooseNextPattern(nextPhase, pattern, action, repeatCount, random);
  } else if (bossShouldAttack) {
    nextPattern = chooseNextPattern(nextPhase, pattern, action, repeatCount, random);
    finalLog += pattern === 'VOID'
      ? ` 虚無の衝撃でHP-${incomingDamage}、MP-${mpDrain}。`
      : ` ボスの反撃でHP-${incomingDamage}。`;
  }

  const nextState: RaidState = {
    ...state,
    turn: state.turn + 1,
    phase: nextPhase,
    bossHp: nextBossHpValue,
    bossMaxHp: nextBossMaxHp,
    playerHp: nextPlayerHp,
    mp: nextMp,
    tp: nextTp,
    breakGauge: nextGauge,
    brokenTurns: nextBrokenTurns,
    bossPattern: nextPattern,
    featherCooldown: nextFeatherCooldown,
    focusCharge: nextFocusCharge,
    combo: nextCombo,
    repeatCount,
    maxCombo: nextMaxCombo,
    totalDamage: nextDamageTotal,
    lastDamage: damageDealt,
    damageTaken: state.damageTaken + incomingDamage,
    lastIncomingDamage: incomingDamage,
    bestHit: nextBestHit,
    perfectReads: perfectReadCount,
    breakCount: nextBreakCount,
    adaptation: nextPhase === 2 ? nextAdaptation : 0,
    lastAction: action,
    lastRead: finalOutcome.tone,
    outcome: finalOutcome,
    result: newResult,
    log: finalLog,
    score: 0,
  };

  return withScore(nextState);
}
