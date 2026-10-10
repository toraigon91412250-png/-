import type { BattleAction, ImprintId, PlayerBattleAction } from '../types/game';
import { isImprintId, MAX_EQUIPPED_IMPRINTS } from '../data/imprints';

export const BLOOD_TEAR_DAMAGE_MULTIPLIER = 1.5;
export const BLOOD_MEDIA_EXTRA_BLEED_TURNS = 1;
export const WIND_GUARD_REDUCTION_PER_CHARGE = 0.001;
export const WIND_GUARD_MAX_REDUCTION = 0.4;
export const WIND_GUARD_COUNTER_DAMAGE_MULTIPLIER = 0.25;
export const COSTLY_SHOT_HP_COST = 200;

/** The two blood imprints represent mutually exclusive ways to use Bleed. */
export function getOpposingBloodImprint(id: ImprintId): ImprintId | null {
  if (id === 'BLOOD_TEAR') return 'BLOOD_MEDIA';
  if (id === 'BLOOD_MEDIA') return 'BLOOD_TEAR';
  return null;
}

export function getBloodTearBurstDamage(dotDamage: number, remainingTurns: number): number {
  const safeDotDamage = Number.isFinite(dotDamage) ? Math.max(0, Math.floor(dotDamage)) : 0;
  const safeTurns = Number.isFinite(remainingTurns) ? Math.max(0, Math.floor(remainingTurns)) : 0;
  return Math.floor(safeDotDamage * safeTurns * BLOOD_TEAR_DAMAGE_MULTIPLIER);
}

export interface WindGuardDamageResult {
  damage: number;
  reducedBy: number;
  counterDamage: number;
  applied: boolean;
}

/** Mitigation and counter damage scale from stored feather damage bonus, with a hard mitigation cap. */
export function resolveWindGuardDamage(
  damage: number,
  featherChargeValue: number,
  enabled: boolean,
): WindGuardDamageResult {
  const safeDamage = Number.isFinite(damage) ? Math.max(0, Math.floor(damage)) : 0;
  const safeCharge = Number.isFinite(featherChargeValue) ? Math.max(0, Math.floor(featherChargeValue)) : 0;
  if (!enabled || safeDamage <= 0 || safeCharge <= 0) {
    return { damage: safeDamage, reducedBy: 0, counterDamage: 0, applied: false };
  }

  const reduction = Math.min(WIND_GUARD_MAX_REDUCTION, safeCharge * WIND_GUARD_REDUCTION_PER_CHARGE);
  const reducedDamage = Math.floor(safeDamage * (1 - reduction));
  return {
    damage: reducedDamage,
    reducedBy: safeDamage - reducedDamage,
    counterDamage: Math.floor(safeCharge * WIND_GUARD_COUNTER_DAMAGE_MULTIPLIER),
    applied: true,
  };
}

export function normalizeEquippedImprints(value: unknown): ImprintId[] {
  if (!Array.isArray(value)) return [];
  const result: ImprintId[] = [];
  for (const candidate of value) {
    if (!isImprintId(candidate) || result.includes(candidate)) continue;
    const opposingBloodImprint = getOpposingBloodImprint(candidate);
    if (opposingBloodImprint && result.includes(opposingBloodImprint)) continue;
    result.push(candidate);
    if (result.length >= MAX_EQUIPPED_IMPRINTS) break;
  }
  return result;
}

export interface ForesightTriggerContext {
  equippedImprints: readonly ImprintId[] | undefined;
  usedImprints: readonly ImprintId[];
  attackerIsPlayer: boolean;
  targetIsPlayer: boolean;
  targetIsEvading: boolean;
  incomingAction: BattleAction;
  predictedAction: BattleAction;
}

export function shouldTriggerForesight(context: ForesightTriggerContext): boolean {
  const incomingActionIsDangerous =
    context.incomingAction === 'SPECIAL' || context.incomingAction === 'ULTIMATE';
  return Boolean(
    !context.attackerIsPlayer &&
    context.targetIsPlayer &&
    context.targetIsEvading &&
    context.equippedImprints?.includes('FORESIGHT') &&
    !context.usedImprints.includes('FORESIGHT') &&
    incomingActionIsDangerous &&
    context.predictedAction === context.incomingAction
  );
}


export const YIN_YANG_DAMAGE_REDUCTION = 0.5;

export interface YinYangDefenseResult {
  damage: number;
  reducedBy: number;
  applied: boolean;
}

/** Suppress only the CPU's BUFF action; never interfere with player actions or other enemy actions. */
export function shouldSuppressCpuBuffAction(
  action: BattleAction,
  actorIsPlayer: boolean,
  equippedImprints: readonly ImprintId[] | undefined,
): boolean {
  return Boolean(
    action === 'BUFF' &&
    !actorIsPlayer &&
    equippedImprints?.includes('CHANT_HUNT')
  );
}

/** Apply the one-turn defensive half of Yin-Yang Conversion to direct hits only. */
export function resolveYinYangDefense(
  damage: number,
  context: {
    attackerIsPlayer: boolean;
    targetIsPlayer: boolean;
    defenseActive: boolean;
  },
): YinYangDefenseResult {
  if (!context.defenseActive || context.attackerIsPlayer || !context.targetIsPlayer || damage <= 0) {
    return { damage, reducedBy: 0, applied: false };
  }
  const safeDamage = Math.max(0, Math.floor(damage));
  const reducedDamage = Math.floor(safeDamage * (1 - YIN_YANG_DAMAGE_REDUCTION));
  return {
    damage: reducedDamage,
    reducedBy: safeDamage - reducedDamage,
    applied: true,
  };
}

export interface TurnExecutionPlan {
  playerGoesFirst: boolean;
  firstIsPlayer: boolean;
  firstAction: PlayerBattleAction;
  secondAction: PlayerBattleAction;
  /** Set before either actor resolves so defense works whether the CPU is first or second. */
  yinYangDefenseActive: boolean;
}

export function getTurnExecutionPlan(
  playerAction: PlayerBattleAction,
  cpuAction: BattleAction,
  playerSpeed: number,
  cpuSpeed: number,
): TurnExecutionPlan {
  const playerGoesFirst = playerSpeed >= cpuSpeed;
  return {
    playerGoesFirst,
    firstIsPlayer: playerGoesFirst,
    firstAction: playerGoesFirst ? playerAction : cpuAction,
    secondAction: playerGoesFirst ? cpuAction : playerAction,
    yinYangDefenseActive: playerAction === 'YIN_YANG',
  };
}
