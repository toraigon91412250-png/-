import type { BattleSetupConfig, ResonanceAbilityId } from '../types/game';

export type WeaknessKey = 'attack' | 'defense' | 'speed' | 'specialSkillDamage' | 'ultimateSkillDamage';

export interface ResonanceExecutionStats {
  threshold: number;
  multiplier: number;
  defenseIgnore: number;
  currentHpBonus: number;
  lowHpBonuses?: readonly [number, number, number];
  overflowMultiplierPerMark?: number;
  overflowMultiplierCap?: number;
}

export function getEquippedResonance(config: BattleSetupConfig): { id: ResonanceAbilityId; level: number } | null {
  const equipped = config.abilities.find(item =>
    typeof item.id === 'string' &&
    item.id in RESONANCE_THRESHOLDS &&
    item.level > 0,
  );
  if (!equipped || !(equipped.id in RESONANCE_THRESHOLDS)) return null;
  return {
    id: equipped.id as ResonanceAbilityId,
    level: Math.min(5, Math.max(1, Math.floor(equipped.level))),
  };
}

const RESONANCE_THRESHOLDS: Record<ResonanceAbilityId, true> = {
  FALLEN_GOD: true,
  FALLEN_WING: true,
  FALLEN_JUDGMENT: true,
  ABYSS_FALLEN: true,
  KING_WING: true,
  KING_JUDGMENT: true,
  ABYSS_KING: true,
  JUDGMENT_WING: true,
  ABYSS_WING: true,
  ABYSS_JUDGMENT: true,
};

export function isResonanceAbility(config: BattleSetupConfig, id: ResonanceAbilityId): boolean {
  return getEquippedResonance(config)?.id === id;
}

export function getResonanceExecutionStats(id: ResonanceAbilityId, level: number): ResonanceExecutionStats | null {
  const l = Math.min(5, Math.max(1, Math.floor(level))) - 1;
  const tables: Partial<Record<ResonanceAbilityId, readonly ResonanceExecutionStats[]>> = {
    FALLEN_JUDGMENT: [
      { threshold: 2, multiplier: 3.5, defenseIgnore: .65, currentHpBonus: .22, lowHpBonuses: [.05, .10, .15] },
      { threshold: 2, multiplier: 4, defenseIgnore: .70, currentHpBonus: .24, lowHpBonuses: [.10, .20, .30] },
      { threshold: 2, multiplier: 4.5, defenseIgnore: .75, currentHpBonus: .26, lowHpBonuses: [.15, .30, .45] },
      { threshold: 1, multiplier: 5.25, defenseIgnore: .82, currentHpBonus: .28, lowHpBonuses: [.20, .40, .60] },
      { threshold: 1, multiplier: 6, defenseIgnore: .90, currentHpBonus: .30, lowHpBonuses: [.25, .50, .75] },
    ],
    KING_JUDGMENT: [
      { threshold: 4, multiplier: 3.5, defenseIgnore: .65, currentHpBonus: .20 },
      { threshold: 3, multiplier: 4, defenseIgnore: .70, currentHpBonus: .22 },
      { threshold: 3, multiplier: 4.75, defenseIgnore: .75, currentHpBonus: .25 },
      { threshold: 2, multiplier: 5.5, defenseIgnore: .82, currentHpBonus: .28 },
      { threshold: 2, multiplier: 6.5, defenseIgnore: .90, currentHpBonus: .30 },
    ],
    JUDGMENT_WING: [
      { threshold: 4, multiplier: 1.5, defenseIgnore: .40, currentHpBonus: .10 },
      { threshold: 3, multiplier: 2, defenseIgnore: .50, currentHpBonus: .15 },
      { threshold: 3, multiplier: 2.5, defenseIgnore: .60, currentHpBonus: .20 },
      { threshold: 2, multiplier: 3, defenseIgnore: .75, currentHpBonus: .25 },
      { threshold: 2, multiplier: 4, defenseIgnore: .90, currentHpBonus: .30 },
    ],
    ABYSS_JUDGMENT: [
      { threshold: 20, multiplier: 3, defenseIgnore: .50, currentHpBonus: .10, overflowMultiplierPerMark: .25, overflowMultiplierCap: .5 },
      { threshold: 16, multiplier: 4, defenseIgnore: .60, currentHpBonus: .15, overflowMultiplierPerMark: .25, overflowMultiplierCap: .75 },
      { threshold: 12, multiplier: 5, defenseIgnore: .70, currentHpBonus: .20, overflowMultiplierPerMark: .25, overflowMultiplierCap: 1 },
      { threshold: 9, multiplier: 6.5, defenseIgnore: .80, currentHpBonus: .25, overflowMultiplierPerMark: .25, overflowMultiplierCap: 1.5 },
      { threshold: 6, multiplier: 8, defenseIgnore: .90, currentHpBonus: .35, overflowMultiplierPerMark: .25, overflowMultiplierCap: 2 },
    ],
  };
  return tables[id]?.[l] ?? null;
}

export function getResonanceFeatherMultiplier(id: ResonanceAbilityId, level: number, kingWingStacks = 0): number | null {
  const l = Math.min(5, Math.max(1, Math.floor(level))) - 1;
  if (id === 'FALLEN_WING') return [6, 7, 8, 9, 10][l];
  if (id === 'JUDGMENT_WING') return [6, 8, 10, 12, 15][l];
  if (id === 'ABYSS_WING') return [6, 7, 8, 9, 10][l];
  if (id === 'KING_WING') return 5 * (1 + Math.min([1, 1, 2, 2, 3][l], Math.max(0, kingWingStacks)) * [0.20, 0.25, 0.30, 0.35, 0.40][l]);
  return null;
}

export function getFallenDynamicMultiplier(id: ResonanceAbilityId, level: number, hpRatio: number): number {
  const l = Math.min(5, Math.max(1, Math.floor(level))) - 1;
  if (id === 'FALLEN_WING') {
    if (hpRatio <= .10) return [4.8, 5.25, 5.7, 6.15, 6.6][l];
    if (hpRatio <= .25) return [3.8, 4.15, 4.5, 4.85, 5.2][l];
    if (hpRatio <= .50) return [2.8, 3.05, 3.3, 3.55, 3.8][l];
    return 1;
  }
  if (id === 'FALLEN_JUDGMENT' || id === 'ABYSS_FALLEN') {
    if (hpRatio <= .10) return 3.8;
    if (hpRatio <= .25) return 3.1;
    if (hpRatio <= .50) return 2.4;
  }
  return 1;
}

export function getFallenGodStatMultiplier(level: number, stage: number): number {
  const table = [
    [1.50, 2.00, 2.50],
    [1.65, 2.25, 2.90],
    [1.80, 2.50, 3.30],
    [1.90, 2.75, 3.65],
    [2.00, 3.00, 4.00],
  ] as const;
  return stage >= 1 && stage <= 3 ? table[Math.min(5, Math.max(1, Math.floor(level))) - 1][stage - 1] : 1;
}

export function getFallenGodRevivalHpFraction(level: number, revivalIndex: number): number | null {
  const l = Math.min(5, Math.max(1, Math.floor(level)));
  const sequence = l === 1 ? [.50, 0]
    : l === 2 ? [.50, .25, 0, 0]
      : l === 3 ? [.50, .25, .05, 0, 0]
        : l === 4 ? [.50, .25, .05, 0, 0, 0]
          : [.50, .25, .05, 0, 0, 0, 0];
  return revivalIndex >= 0 && revivalIndex < sequence.length ? sequence[revivalIndex] : null;
}

export function getResonanceSurvivalLimit(id: ResonanceAbilityId, level: number): number {
  if (id === 'KING_WING') return [5, 5, 6, 6, 7][Math.min(5, Math.max(1, Math.floor(level))) - 1];
  if (id === 'KING_JUDGMENT' || id === 'ABYSS_KING') return 5;
  if (id === 'FALLEN_GOD') {
    const counts = [2, 4, 5, 6, 7];
    return counts[Math.min(5, Math.max(1, Math.floor(level))) - 1];
  }
  return 0;
}

export function getTurnErosionRate(id: ResonanceAbilityId, level: number, hpRatio: number): number {
  const l = Math.min(5, Math.max(1, Math.floor(level))) - 1;
  if (id === 'ABYSS_FALLEN') {
    const table = [
      [8, 12, 18, 25], [10, 15, 22, 30], [12, 18, 27, 35],
      [14, 21, 31, 40], [16, 24, 36, 45],
    ] as const;
    const tier = hpRatio <= .10 ? 3 : hpRatio <= .25 ? 2 : hpRatio <= .50 ? 1 : 0;
    return table[l][tier];
  }
  if (id === 'ABYSS_WING') return [8, 10, 12, 15, 18][l];
  if (id === 'ABYSS_JUDGMENT') return [6, 8, 10, 12, 15][l];
  if (id === 'ABYSS_KING') return 6;
  return 0;
}

export function getFeatherErosionRate(id: ResonanceAbilityId, level: number): number {
  if (id !== 'ABYSS_WING') return 0;
  return [5, 7, 9, 12, 15][Math.min(5, Math.max(1, Math.floor(level))) - 1];
}

export function getKingZoneValues(level: number): { maxStacks: number; defenseBonusPerStack: number; directDamageReductionPerStack: number } {
  const l = Math.min(5, Math.max(1, Math.floor(level))) - 1;
  return {
    maxStacks: [2, 3, 4, 5, 6][l],
    defenseBonusPerStack: [4, 5, 6, 7, 8][l] / 100,
    directDamageReductionPerStack: [2, 3, 4, 5, 6][l] / 100,
  };
}

export function getKingWingStackValues(level: number): { maxStacks: number; damagePerStack: number } {
  const l = Math.min(5, Math.max(1, Math.floor(level))) - 1;
  return {
    maxStacks: [1, 1, 2, 2, 3][l],
    damagePerStack: [20, 25, 30, 35, 40][l] / 100,
  };
}
