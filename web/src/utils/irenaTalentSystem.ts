import type { CharacterDef } from '../types/game';

export const IRENA_TALENT_PROGRESS_KEY = 'duel_arena_irena_talent_progress';
export const IRENA_TALENT_MAX_LEVEL = 20;
export const IRENA_TALENT_MAX_RANK = 3;
export const IRENA_TALENT_MAX_POINTS = 9;
export const IRENA_TALENT_WIN_XP = 100;
export const IRENA_TALENT_LOSS_XP = 35;

export type IrenaTalentId = 'WIND_READ' | 'FEATHER_RESONANCE' | 'ABYSS_RESONANCE';

export interface IrenaTalentRanks {
  WIND_READ: number;
  FEATHER_RESONANCE: number;
  ABYSS_RESONANCE: number;
}

export interface IrenaTalentProgress {
  experience: number;
  ranks: IrenaTalentRanks;
}

export const INITIAL_IRENA_TALENT_PROGRESS: IrenaTalentProgress = {
  experience: 0,
  ranks: {
    WIND_READ: 0,
    FEATHER_RESONANCE: 0,
    ABYSS_RESONANCE: 0,
  },
};

const TALENT_IDS: readonly IrenaTalentId[] = [
  'WIND_READ',
  'FEATHER_RESONANCE',
  'ABYSS_RESONANCE',
];

export function getIrenaXpForLevel(level: number): number {
  const targetLevel = Math.min(IRENA_TALENT_MAX_LEVEL, Math.max(1, Math.floor(level)));
  let total = 0;
  for (let currentLevel = 1; currentLevel < targetLevel; currentLevel += 1) {
    total += 80 + (currentLevel - 1) * 20;
  }
  return total;
}

export function getIrenaLevel(experience: number): number {
  const safeExperience = Math.min(
    getIrenaXpForLevel(IRENA_TALENT_MAX_LEVEL),
    Math.max(0, Math.floor(Number.isFinite(experience) ? experience : 0)),
  );
  let level = 1;
  while (
    level < IRENA_TALENT_MAX_LEVEL &&
    safeExperience >= getIrenaXpForLevel(level + 1)
  ) {
    level += 1;
  }
  return level;
}

export function getIrenaLevelProgress(experience: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  const safeExperience = Math.min(
    getIrenaXpForLevel(IRENA_TALENT_MAX_LEVEL),
    Math.max(0, Math.floor(Number.isFinite(experience) ? experience : 0)),
  );
  const level = getIrenaLevel(safeExperience);
  const currentLevelXp = getIrenaXpForLevel(level);
  const nextLevelXp = getIrenaXpForLevel(Math.min(IRENA_TALENT_MAX_LEVEL, level + 1));
  const span = nextLevelXp - currentLevelXp;
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progressPercent: span <= 0 ? 100 : Math.max(0, Math.min(100, ((safeExperience - currentLevelXp) / span) * 100)),
  };
}

export function getIrenaTalentPointsForLevel(level: number): number {
  return Math.min(IRENA_TALENT_MAX_POINTS, Math.floor(Math.max(1, level) / 2));
}

export function getSpentIrenaTalentPoints(progress: IrenaTalentProgress): number {
  return TALENT_IDS.reduce((total, id) => total + progress.ranks[id], 0);
}

export function getAvailableIrenaTalentPoints(progress: IrenaTalentProgress): number {
  return Math.max(
    0,
    getIrenaTalentPointsForLevel(getIrenaLevel(progress.experience)) - getSpentIrenaTalentPoints(progress),
  );
}

export function normalizeIrenaTalentProgress(value: unknown): IrenaTalentProgress {
  if (!value || typeof value !== 'object') {
    return { ...INITIAL_IRENA_TALENT_PROGRESS, ranks: { ...INITIAL_IRENA_TALENT_PROGRESS.ranks } };
  }

  const record = value as { experience?: unknown; ranks?: unknown };
  const parsedExperience = Number(record.experience);
  const experience = Math.min(
    getIrenaXpForLevel(IRENA_TALENT_MAX_LEVEL),
    Math.max(0, Math.floor(Number.isFinite(parsedExperience) ? parsedExperience : 0)),
  );
  const rawRanks = record.ranks && typeof record.ranks === 'object'
    ? record.ranks as Record<string, unknown>
    : {};
  const pointsAllowed = getIrenaTalentPointsForLevel(getIrenaLevel(experience));
  const ranks: IrenaTalentRanks = {
    WIND_READ: 0,
    FEATHER_RESONANCE: 0,
    ABYSS_RESONANCE: 0,
  };
  let pointsRemaining = pointsAllowed;

  // Ignore invalid/excess ranks in corrupt or hand-edited saves.
  for (const id of TALENT_IDS) {
    const parsedRank = Number(rawRanks[id]);
    const requestedRank = Math.min(
      IRENA_TALENT_MAX_RANK,
      Math.max(0, Math.floor(Number.isFinite(parsedRank) ? parsedRank : 0)),
    );
    const acceptedRank = Math.min(requestedRank, pointsRemaining);
    ranks[id] = acceptedRank;
    pointsRemaining -= acceptedRank;
  }

  return { experience, ranks };
}

export function addIrenaBattleExperience(
  progress: IrenaTalentProgress,
  playerWon: boolean,
): IrenaTalentProgress {
  const current = normalizeIrenaTalentProgress(progress);
  if (getIrenaLevel(current.experience) >= IRENA_TALENT_MAX_LEVEL) return current;

  const gained = playerWon ? IRENA_TALENT_WIN_XP : IRENA_TALENT_LOSS_XP;
  return normalizeIrenaTalentProgress({
    ...current,
    experience: current.experience + gained,
  });
}

export function loadIrenaTalentProgress(): IrenaTalentProgress {
  try {
    const raw = window.localStorage.getItem(IRENA_TALENT_PROGRESS_KEY);
    return raw
      ? normalizeIrenaTalentProgress(JSON.parse(raw) as unknown)
      : { ...INITIAL_IRENA_TALENT_PROGRESS, ranks: { ...INITIAL_IRENA_TALENT_PROGRESS.ranks } };
  } catch {
    return { ...INITIAL_IRENA_TALENT_PROGRESS, ranks: { ...INITIAL_IRENA_TALENT_PROGRESS.ranks } };
  }
}

export function saveIrenaTalentProgress(progress: IrenaTalentProgress): boolean {
  const normalized = normalizeIrenaTalentProgress(progress);
  try {
    window.localStorage.setItem(IRENA_TALENT_PROGRESS_KEY, JSON.stringify(normalized));
    return true;
  } catch {
    return false;
  }
}

export function spendIrenaTalentPoint(id: IrenaTalentId): IrenaTalentProgress | null {
  const current = loadIrenaTalentProgress();
  if (getAvailableIrenaTalentPoints(current) <= 0 || current.ranks[id] >= IRENA_TALENT_MAX_RANK) {
    return null;
  }

  const next = normalizeIrenaTalentProgress({
    ...current,
    ranks: { ...current.ranks, [id]: current.ranks[id] + 1 },
  });
  return saveIrenaTalentProgress(next) ? next : null;
}

export function applyIrenaTalentModifiers(
  character: CharacterDef,
  progress: IrenaTalentProgress,
): CharacterDef {
  const normalized = normalizeIrenaTalentProgress(progress);
  const { WIND_READ, FEATHER_RESONANCE, ABYSS_RESONANCE } = normalized.ranks;

  return {
    ...character,
    speed: character.speed + WIND_READ * 5,
    evasionRate: Math.min(0.4, character.evasionRate + WIND_READ * 0.01),
    specialSkillDamage: Math.round(character.specialSkillDamage * (1 + FEATHER_RESONANCE * 0.06)),
    ultimateSkillDamage: Math.round(character.ultimateSkillDamage * (1 + ABYSS_RESONANCE * 0.08)),
    defense: Math.max(0, character.defense - ABYSS_RESONANCE * 3),
  };
}
