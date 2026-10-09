export type RaidPhase = 1 | 2;

export type RaidPattern = 'SWEEP' | 'CHARGE' | 'VOID' | 'RAGE' | 'CORE_REGEN' | 'COLLAPSE';

export type RaidAction =
  | 'ATTACK'
  | 'FEATHER'
  | 'GUARD'
  | 'COUNTER'
  | 'FOCUS'
  | 'ULTIMATE';

export type RaidResult = 'ACTIVE' | 'VICTORY' | 'DEFEAT';

export type RaidOutcomeTone = 'neutral' | 'good' | 'perfect' | 'danger' | 'phase' | 'victory';

export interface RaidOutcome {
  title: string;
  detail: string;
  tone: RaidOutcomeTone;
}

export interface RaidState {
  turn: number;
  phase: RaidPhase;
  bossHp: number;
  bossMaxHp: number;
  playerHp: number;
  playerMaxHp: number;
  mp: number;
  maxMp: number;
  tp: number;
  breakGauge: number;
  brokenTurns: number;
  bossPattern: RaidPattern;
  /** Turns left before a multi-turn boss attack resolves. Zero means its initial warning. */
  bossWindup: number;
  featherCooldown: number;
  focusCharge: boolean;
  combo: number;
  repeatCount: number;
  maxCombo: number;
  totalDamage: number;
  lastDamage: number;
  damageTaken: number;
  lastIncomingDamage: number;
  bestHit: number;
  perfectReads: number;
  interrupts: number;
  healingPrevented: number;
  breakCount: number;
  adaptation: number;
  lastAction: RaidAction | null;
  actionCounts: Record<RaidAction, number>;
  history: string[];
  lastRead: RaidOutcomeTone;
  outcome: RaidOutcome;
  score: number;
  result: RaidResult;
  log: string;
}
