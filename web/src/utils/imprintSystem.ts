import type { BattleAction, ImprintId } from '../types/game';
import { isImprintId, MAX_EQUIPPED_IMPRINTS } from '../data/imprints';

export function normalizeEquippedImprints(value: unknown): ImprintId[] {
  if (!Array.isArray(value)) return [];
  const result: ImprintId[] = [];
  for (const candidate of value) {
    if (!isImprintId(candidate) || result.includes(candidate)) continue;
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
