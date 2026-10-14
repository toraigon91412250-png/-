import { IRENA } from '../data/characters';
import type { StatAllocation } from '../types/game';
import {
  applyStatAllocation,
  getRemainingStatPoints,
  getSpentStatPoints,
  normalizeStatAllocation,
} from './statBuild';

export const SHORT_IRENA_STAT_POINT_TOTAL = 150;
export const SHORT_IRENA_NORMAL_ATTACK_MULTIPLIER = 6;
export const SHORT_IRENA_ASCENSION_MULTIPLIER = 1.8;
export const SHORT_IRENA_ASCENSION_TURNS = 3;
export const SHORT_IRENA_OUTSIDE_CONTROL_TURNS = 2;
export const SHORT_IRENA_END_KAI_DAMAGE = 6200;
export const SHORT_IRENA_STAT_ALLOCATION_KEY = 'duel_arena_short_irena_stat_allocation';

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

/** Uses exactly the existing stat-point conversion values on the unchanged IRENA base. */
export function getShortIrenaCombatStats(allocation?: Partial<StatAllocation> | null) {
  const normalized = normalizeShortIrenaAllocation(allocation);
  const character = applyStatAllocation(IRENA, normalized, SHORT_IRENA_STAT_POINT_TOTAL);
  return {
    maxHp: character.maxHp,
    attack: character.attack,
    defense: character.defense,
    speed: character.speed,
    evasionRate: character.evasionRate,
    normalAttackDamage: Math.max(1, Math.round(character.attack * SHORT_IRENA_NORMAL_ATTACK_MULTIPLIER)),
    spentPoints: getSpentStatPoints(normalized, SHORT_IRENA_STAT_POINT_TOTAL),
    remainingPoints: getRemainingStatPoints(normalized, SHORT_IRENA_STAT_POINT_TOTAL),
    allocation: normalized,
  };
}

/**
 * At a strong lean, opposite movement is reduced to one quarter. Once an end
 * is reached the screen locks the alignment, so small reversals cannot flip art.
 */
export function shiftDatenGauge(currentValue: number, requestedDelta: number): number {
  const current = Math.max(-100, Math.min(100, Math.round(currentValue)));
  let delta = Math.round(requestedDelta);
  if (current >= 60 && delta < 0) delta = Math.ceil(delta * 0.25);
  else if (current <= -60 && delta > 0) delta = Math.floor(delta * 0.25);
  return Math.max(-100, Math.min(100, current + delta));
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
