import { IRENA } from '../data/characters';
import { STELLA_FINAL_BATTLE_TUNING } from '../data/stellaFinalBattleConfig';
import type { StatAllocation } from '../types/game';
import {
  applyStatAllocation,
  getRemainingStatPoints,
  getSpentStatPoints,
  normalizeStatAllocation,
} from './statBuild';

export type ShortIrenaBossPhase = 1 | 2 | 3;

export interface ShortIrenaBossDamageResolution {
  remainingHp: number;
  actualDamage: number;
  cappedAtPhaseGate: boolean;
}

/** Derive the Kaiser phase from the same HP boundaries used by the final-battle screen. */
export function getShortIrenaBossPhase(hp: number): ShortIrenaBossPhase {
  const maxHp = STELLA_FINAL_BATTLE_TUNING.bossMaxHp;
  if (hp > maxHp * (2 / 3)) return 1;
  if (hp > maxHp / 3) return 2;
  return 3;
}

/**
 * Apply the final-Irena phase gate to a requested hit.
 * Phases one and two stop at the next HP boundary; the final phase can defeat Kaiser
 * only when allowDefeat is true (the ultimate finisher path).
 */
export function resolveShortIrenaBossDamage(
  currentHp: number,
  requestedDamage: number,
  currentPhase: ShortIrenaBossPhase,
  allowDefeat = false,
): ShortIrenaBossDamageResolution {
  const safeDamage = Math.max(0, Math.ceil(requestedDamage));
  const hpBeforeGate = Math.max(0, currentHp - safeDamage);
  const maxHp = STELLA_FINAL_BATTLE_TUNING.bossMaxHp;
  const phaseGateHp = currentPhase === 1
    ? Math.ceil(maxHp * (2 / 3))
    : currentPhase === 2
      ? Math.ceil(maxHp / 3)
      : allowDefeat ? 0 : 1;
  const remainingHp = Math.min(currentHp, Math.max(phaseGateHp, hpBeforeGate));
  return {
    remainingHp,
    actualDamage: Math.max(0, currentHp - remainingHp),
    cappedAtPhaseGate: currentHp > phaseGateHp && hpBeforeGate < phaseGateHp,
  };
}

/** The finisher multipliers are design constants: GOD ×5 and DEMON ×8. */
export function getShortIrenaFinisherMultiplier(alignment: ShortIrenaAlignment): number {
  return alignment === 'GOD' ? 5 : 8;
}

/** Calculate the displayed finisher power using the live battle formula and its 2,000 minimum. */
export function calculateShortIrenaFinisherPower(
  normalAttackDamage: number,
  effectiveAttackMultiplier: number,
  alignment: ShortIrenaAlignment,
): number {
  const finisherMultiplier = getShortIrenaFinisherMultiplier(alignment);
  return applyShortIrenaDamageFloor(
    Math.ceil(normalAttackDamage * effectiveAttackMultiplier * finisherMultiplier),
    2000,
  );
}

export const SHORT_IRENA_STAT_POINT_TOTAL = 150;
export const SHORT_IRENA_NORMAL_ATTACK_MULTIPLIER = 8;

export const SHORT_IRENA_TERMINUS_COOLDOWN_TURNS = 5;
export const SHORT_IRENA_TERMINUS_MIN_DAMAGE = 5000;
export const SHORT_IRENA_TERMINUS_RECOIL_ACTION_LOCK_TURNS = 1;
export const SHORT_IRENA_TERMINUS_SPEED_DOWN_MULTIPLIER = 0.5;
export const SHORT_IRENA_TERMINUS_SPEED_DOWN_TURNS = 2;

export const SHORT_IRENA_ASCENSION_MULTIPLIER = 3;
export const SHORT_IRENA_ASCENSION_TURNS = 3;
export const SHORT_IRENA_ASCENSION_RECOVERY_TURNS = 1;
export const SHORT_IRENA_ASCENSION_DEFENSE_DOWN_MULTIPLIER = 0.5;
export const SHORT_IRENA_ASCENSION_DEFENSE_DOWN_TURNS = 3;

export const SHORT_IRENA_ALL_MIGHT_TURN_MULTIPLIER = 0.3;
export const SHORT_IRENA_ALL_MIGHT_SPEED_MULTIPLIER = 1000;
export const SHORT_IRENA_STAT_ALLOCATION_KEY = 'duel_arena_short_irena_stat_allocation';

export const SHORT_IRENA_GAUGE_MIN = -100;
export const SHORT_IRENA_GAUGE_MAX = 100;
export const SHORT_IRENA_GAUGE_STEP = 15;
export const SHORT_IRENA_AUTHORITY_STAGE_ONE = 30;
export const SHORT_IRENA_AUTHORITY_STAGE_TWO = 60;

export type ShortIrenaAuthorityStage = 0 | 1 | 2 | 3;

export type ShortIrenaRoute = 'GOD' | 'DEMON';
export type ShortIrenaAlignment = ShortIrenaRoute;

export const EMPTY_SHORT_IRENA_ALLOCATION: StatAllocation = {
  maxHp: 0,
  attack: 0,
  defense: 0,
  speed: 0,
};

export function normalizeShortIrenaAllocation(input?: Partial<StatAllocation> | null): StatAllocation {
  return normalizeStatAllocation(input, SHORT_IRENA_STAT_POINT_TOTAL);
}

/** Uses the unchanged normal IRENA base and the existing stat allocation conversion. */
export function getShortIrenaCombatStats(allocation?: Partial<StatAllocation> | null) {
  const normalized = normalizeShortIrenaAllocation(allocation);
  const character = applyStatAllocation(IRENA, normalized, SHORT_IRENA_STAT_POINT_TOTAL);
  return {
    maxHp: character.maxHp,
    attack: character.attack,
    defense: character.defense,
    speed: character.speed,
    evasionRate: character.evasionRate,
    normalAttackDamage: Math.max(1, Math.ceil(character.attack * SHORT_IRENA_NORMAL_ATTACK_MULTIPLIER)),
    spentPoints: getSpentStatPoints(normalized, SHORT_IRENA_STAT_POINT_TOTAL),
    remainingPoints: getRemainingStatPoints(normalized, SHORT_IRENA_STAT_POINT_TOTAL),
    allocation: normalized,
  };
}

/**
 * Apply the requested movement without damping reversals. Explicit gauge controls
 * request 15 points; existing skills and speed-scaled attacks keep their own movement.
 */
export function shiftDatenGauge(currentValue: number, requestedDelta: number): number {
  const current = Math.max(SHORT_IRENA_GAUGE_MIN, Math.min(SHORT_IRENA_GAUGE_MAX, Math.round(currentValue)));
  const delta = Math.round(requestedDelta);
  return Math.max(
    SHORT_IRENA_GAUGE_MIN,
    Math.min(SHORT_IRENA_GAUGE_MAX, current + delta),
  );
}

export function getDatenAuthorityStage(gauge: number): ShortIrenaAuthorityStage {
  const progress = Math.abs(Math.max(SHORT_IRENA_GAUGE_MIN, Math.min(SHORT_IRENA_GAUGE_MAX, gauge)));
  if (progress >= SHORT_IRENA_GAUGE_MAX) return 3;
  if (progress >= SHORT_IRENA_AUTHORITY_STAGE_TWO) return 2;
  if (progress >= SHORT_IRENA_AUTHORITY_STAGE_ONE) return 1;
  return 0;
}

export function shouldRearmShortIrenaFinisher(usedAlignment: ShortIrenaAlignment | null, gauge: number): boolean {
  if (usedAlignment === null) return false;
  const boundedGauge = Math.max(
    SHORT_IRENA_GAUGE_MIN,
    Math.min(SHORT_IRENA_GAUGE_MAX, Math.round(gauge)),
  );
  return Math.abs(boundedGauge) < SHORT_IRENA_AUTHORITY_STAGE_ONE;
}

export function getDatenAlignment(gauge: number): ShortIrenaAlignment | null {
  if (gauge >= 100) return 'GOD';
  if (gauge <= -100) return 'DEMON';
  return null;
}

export function getShortIrenaNormalAttackGaugeDelta(route: ShortIrenaRoute, speed: number): number {
  const speedBonus = Math.min(6, Math.floor(Math.max(0, speed - IRENA.speed) / 120));
  const step = 12 + speedBonus;
  return route === 'GOD' ? step : -step;
}

export function calculateShortIrenaAttackDamage(
  rawAttackDamage: number,
  targetDefense: number,
  defenseNullTurns: number,
): { damage: number; targetDefense: number } {
  const effectiveDefense = defenseNullTurns > 0
    ? 0
    : Math.max(0, Math.floor(targetDefense));
  return {
    targetDefense: effectiveDefense,
    damage: Math.max(1, Math.ceil(rawAttackDamage) - effectiveDefense),
  };
}

export function getShortIrenaCounterDamage(baseCounterDamage: number, defense: number): number {
  return Math.max(50, Math.floor(baseCounterDamage) - Math.floor(Math.max(0, defense) / 2));
}

export function loadShortIrenaAllocation(): StatAllocation {
  try {
    const raw = localStorage.getItem(SHORT_IRENA_STAT_ALLOCATION_KEY);
    return raw ? normalizeShortIrenaAllocation(JSON.parse(raw) as Partial<StatAllocation>) : { ...EMPTY_SHORT_IRENA_ALLOCATION };
  } catch {
    return { ...EMPTY_SHORT_IRENA_ALLOCATION };
  }
}

/** Returns false when local storage is unavailable or refuses the save. */
export function saveShortIrenaAllocation(input: Partial<StatAllocation>): boolean {
  try {
    localStorage.setItem(
      SHORT_IRENA_STAT_ALLOCATION_KEY,
      JSON.stringify(normalizeShortIrenaAllocation(input)),
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Early All Might activation weakens Irena's base attack independently of the
 * persistent turn-based All Might damage multiplier.
 */
export function getShortIrenaOriginalAttackMultiplier(activationTurn: number): number {
  const turn = Math.max(1, Math.floor(activationTurn));
  return Math.min(1, 0.5 + turn * 0.05);
}

/** Guarantees the specified minimum after normal damage calculation and rounding. */
export function applyShortIrenaDamageFloor(damage: number, minimumDamage: number): number {
  return Math.max(Math.ceil(damage), Math.ceil(minimumDamage));
}
