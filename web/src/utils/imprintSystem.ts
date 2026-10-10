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
