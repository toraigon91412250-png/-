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

export function normalizeStatAllocation(
  input?: Partial<StatAllocation> | null,
  pointTotal = STAT_BUILD_POINT_TOTAL,
): StatAllocation {
  const normalized: StatAllocation = {
    maxHp: Math.max(0, Math.floor(Number(input?.maxHp) || 0)),
    attack: Math.max(0, Math.floor(Number(input?.attack) || 0)),
    defense: Math.max(0, Math.floor(Number(input?.defense) || 0)),
    speed: Math.max(0, Math.floor(Number(input?.speed) || 0)),
  };

  let remaining = Math.max(0, Math.floor(pointTotal));
  for (const key of STAT_ALLOCATION_KEYS) {
    normalized[key] = Math.min(normalized[key], remaining);
    remaining -= normalized[key];
  }

  return normalized;
}

export function getSpentStatPoints(
  allocation?: Partial<StatAllocation> | null,
  pointTotal = STAT_BUILD_POINT_TOTAL,
): number {
  const normalized = normalizeStatAllocation(allocation, pointTotal);
  return STAT_ALLOCATION_KEYS.reduce((sum, key) => sum + normalized[key], 0);
}

export function getRemainingStatPoints(
  allocation?: Partial<StatAllocation> | null,
  pointTotal = STAT_BUILD_POINT_TOTAL,
): number {
  const total = Math.max(0, Math.floor(pointTotal));
  return Math.max(0, total - getSpentStatPoints(allocation, total));
}

export function applyStatAllocation(
  character: CharacterDef,
  allocation?: Partial<StatAllocation> | null,
  pointTotal = STAT_BUILD_POINT_TOTAL,
): CharacterDef {
  const normalized = normalizeStatAllocation(allocation, pointTotal);

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

export type StatPresetId = 'BALANCED' | 'OFFENSE' | 'DEFENSE' | 'SPEED';

const STAT_PRESET_WEIGHTS: Record<StatPresetId, Record<StatAllocationKey, number>> = {
  BALANCED: { maxHp: 3, attack: 3, defense: 3, speed: 3 },
  OFFENSE: { maxHp: 1, attack: 6, defense: 1, speed: 4 },
  DEFENSE: { maxHp: 6, attack: 1, defense: 5, speed: 0 },
  SPEED: { maxHp: 1, attack: 3, defense: 1, speed: 7 },
};

/** Build a deterministic preset that always spends the full available point pool. */
export function createStatPreset(preset: StatPresetId, pointTotal = STAT_BUILD_POINT_TOTAL): StatAllocation {
  const total = Math.max(0, Math.floor(pointTotal));
  if (total === 0) return { ...EMPTY_STAT_ALLOCATION };

  const weights = STAT_PRESET_WEIGHTS[preset];
  const weightTotal = STAT_ALLOCATION_KEYS.reduce((sum, key) => sum + weights[key], 0);
  if (weightTotal <= 0) return { ...EMPTY_STAT_ALLOCATION };

  const allocation = { ...EMPTY_STAT_ALLOCATION };
  const remainders: Array<{ key: StatAllocationKey; remainder: number }> = [];
  let assigned = 0;

  for (const key of STAT_ALLOCATION_KEYS) {
    const exact = (total * weights[key]) / weightTotal;
    const base = Math.floor(exact);
    allocation[key] = base;
    assigned += base;
    remainders.push({ key, remainder: exact - base });
  }

  remainders.sort((a, b) => b.remainder - a.remainder || STAT_ALLOCATION_KEYS.indexOf(a.key) - STAT_ALLOCATION_KEYS.indexOf(b.key));
  for (let index = assigned; index < total; index += 1) {
    allocation[remainders[index - assigned]?.key ?? STAT_ALLOCATION_KEYS[0]] += 1;
  }

  return allocation;
}

export function getAbilityBuildHint(id: AbilityId): string {
  return ABILITY_STAT_HINTS[id].label;
}

export function getAbilityBuildMatchPercent(
  id: AbilityId,
  allocation?: Partial<StatAllocation> | null,
  pointTotal = STAT_BUILD_POINT_TOTAL,
): number {
  const normalized = normalizeStatAllocation(allocation, pointTotal);
  const total = getSpentStatPoints(normalized, pointTotal);
  if (total === 0) return 0;

  const hint = ABILITY_STAT_HINTS[id];
  const matchingPoints = hint.stats.reduce((sum, key) => sum + normalized[key], 0);
  return Math.round((matchingPoints / total) * 100);
}
