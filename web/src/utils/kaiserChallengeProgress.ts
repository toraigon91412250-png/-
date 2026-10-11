import { BATTLE_CHALLENGE_LEVELS, type BattleChallengeLevel } from '../types/game';

export const KAISER_CHALLENGE_PROGRESS_KEY = 'duel_arena_kaiser_challenge_progress';
export const INITIAL_KAISER_CHALLENGE_LEVEL: BattleChallengeLevel = 10;

export interface KaiserChallengeProgress {
  /** The highest level currently unlocked; it is the next level to beat. */
  unlockedLevel: BattleChallengeLevel;
}

const isBattleChallengeLevel = (value: unknown): value is BattleChallengeLevel =>
  typeof value === 'number' &&
  BATTLE_CHALLENGE_LEVELS.includes(value as BattleChallengeLevel);

export function normalizeKaiserChallengeProgress(value: unknown): KaiserChallengeProgress {
  if (!value || typeof value !== 'object') {
    return { unlockedLevel: INITIAL_KAISER_CHALLENGE_LEVEL };
  }

  const unlockedLevel = (value as { unlockedLevel?: unknown }).unlockedLevel;
  return {
    unlockedLevel: isBattleChallengeLevel(unlockedLevel)
      ? unlockedLevel
      : INITIAL_KAISER_CHALLENGE_LEVEL,
  };
}

/** Only the current challenge and the immediately preceding cleared level are selectable. */
export function getSelectableKaiserLevels(
  unlockedLevel: BattleChallengeLevel,
): BattleChallengeLevel[] {
  return BATTLE_CHALLENGE_LEVELS.filter(
    level => level === unlockedLevel || level === unlockedLevel - 10,
  );
}

/** Pure result resolver: only beating the current unlocked level opens the next one. */
export function resolveKaiserChallengeResult(
  progress: KaiserChallengeProgress,
  defeatedLevel: BattleChallengeLevel,
  playerWon: boolean,
): KaiserChallengeProgress {
  if (!playerWon || defeatedLevel !== progress.unlockedLevel) return progress;

  const currentIndex = BATTLE_CHALLENGE_LEVELS.indexOf(progress.unlockedLevel);
  const nextLevel = BATTLE_CHALLENGE_LEVELS[currentIndex + 1];
  return nextLevel ? { unlockedLevel: nextLevel } : progress;
}

export function loadKaiserChallengeProgress(): KaiserChallengeProgress {
  try {
    const raw = window.localStorage.getItem(KAISER_CHALLENGE_PROGRESS_KEY);
    if (!raw) return { unlockedLevel: INITIAL_KAISER_CHALLENGE_LEVEL };
    return normalizeKaiserChallengeProgress(JSON.parse(raw) as unknown);
  } catch {
    return { unlockedLevel: INITIAL_KAISER_CHALLENGE_LEVEL };
  }
}

export function recordKaiserChallengeResult(
  defeatedLevel: BattleChallengeLevel,
  playerWon: boolean,
): KaiserChallengeProgress {
  const current = loadKaiserChallengeProgress();
  const next = resolveKaiserChallengeResult(current, defeatedLevel, playerWon);

  if (next.unlockedLevel !== current.unlockedLevel) {
    try {
      window.localStorage.setItem(KAISER_CHALLENGE_PROGRESS_KEY, JSON.stringify(next));
    } catch {
      // Keep the current session playable even when browser storage is unavailable.
    }
  }

  return next;
}

export function resetKaiserChallengeProgress(): KaiserChallengeProgress {
  const initial = { unlockedLevel: INITIAL_KAISER_CHALLENGE_LEVEL } as const;
  try {
    window.localStorage.setItem(KAISER_CHALLENGE_PROGRESS_KEY, JSON.stringify(initial));
  } catch {
    // Reset the in-memory UI even when browser storage is unavailable.
  }
  return initial;
}
