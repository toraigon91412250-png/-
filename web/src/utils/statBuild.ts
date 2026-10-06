import { AbilityId, CharacterDef, StatAllocation } from '../types/game';

export const STAT_BUILD_POINT_TOTAL = 12;

export const STAT_BUILD_POINT_VALUES = {
  maxHp: 200,
  attack: 12,
  defense: 6,
  speed: 6,
} as const;

export type StatAllocationKey = keyof StatAllocation;

export const STAT_ALLOCATION_KEYS: readonly StatAllocationKey[] = [
  'maxHp',
  'attack',
  'defense',
  'speed',
];

export const EMPTY_STAT_ALLOCATION: StatAllocation = {
  maxHp: 0,
  attack: 0,
  defense: 0,
  speed: 0,
};

export function normalizeStatAllocation(input?: Partial<StatAllocation> | null): StatAllocation {
  const normalized: StatAllocation = {
    maxHp: Math.max(0, Math.floor(Number(input?.maxHp) || 0)),
    attack: Math.max(0, Math.floor(Number(input?.attack) || 0)),
    defense: Math.max(0, Math.floor(Number(input?.defense) || 0)),
    speed: Math.max(0, Math.floor(Number(input?.speed) || 0)),
  };

  let remaining = STAT_BUILD_POINT_TOTAL;
  for (const key of STAT_ALLOCATION_KEYS) {
    normalized[key] = Math.min(normalized[key], remaining);
    remaining -= normalized[key];
  }

  return normalized;
}

export function getSpentStatPoints(allocation?: Partial<StatAllocation> | null): number {
  const normalized = normalizeStatAllocation(allocation);
  return STAT_ALLOCATION_KEYS.reduce((sum, key) => sum + normalized[key], 0);
}

export function getRemainingStatPoints(allocation?: Partial<StatAllocation> | null): number {
  return STAT_BUILD_POINT_TOTAL - getSpentStatPoints(allocation);
}

export function applyStatAllocation(character: CharacterDef, allocation?: Partial<StatAllocation> | null): CharacterDef {
  const normalized = normalizeStatAllocation(allocation);

  return {
    ...character,
    maxHp: Math.max(1, character.maxHp + normalized.maxHp * STAT_BUILD_POINT_VALUES.maxHp),
    attack: Math.max(1, character.attack + normalized.attack * STAT_BUILD_POINT_VALUES.attack),
    defense: Math.max(0, character.defense + normalized.defense * STAT_BUILD_POINT_VALUES.defense),
    speed: Math.max(1, character.speed + normalized.speed * STAT_BUILD_POINT_VALUES.speed),
  };
}

const ABILITY_STAT_HINTS: Record<
  AbilityId,
  { stats: readonly StatAllocationKey[]; label: string }
> = {
  ABYSS: {
    stats: ['speed', 'defense'],
    label: 'SPD / DEF配分と相性が良い',
  },
  FALLEN: {
    stats: ['maxHp', 'attack'],
    label: 'HP / ATK配分と相性が良い',
  },
  BLACK_WING: {
    stats: ['maxHp', 'attack', 'defense', 'speed'],
    label: '幅広い配分に対応',
  },
  FALLEN_KING: {
    stats: ['maxHp', 'defense'],
    label: 'HP / DEF配分と相性が良い',
  },
  JUDGMENT: {
    stats: ['attack', 'speed'],
    label: 'ATK / SPD配分と相性が良い',
  },
};

export function getAbilityBuildHint(id: AbilityId): string {
  return ABILITY_STAT_HINTS[id].label;
}

export function getAbilityBuildMatchPercent(
  id: AbilityId,
  allocation?: Partial<StatAllocation> | null,
): number {
  const normalized = normalizeStatAllocation(allocation);
  const total = getSpentStatPoints(normalized);
  if (total === 0) return 0;

  const hint = ABILITY_STAT_HINTS[id];
  const matchingPoints = hint.stats.reduce((sum, key) => sum + normalized[key], 0);
  return Math.round((matchingPoints / total) * 100);
}
