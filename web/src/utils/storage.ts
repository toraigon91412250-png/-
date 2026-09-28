import { OverallStats } from '../types/game';

const STORAGE_KEY = 'duel_arena_battle_stats';

export function loadOverallStats(): OverallStats {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        totalBattles: Number(parsed.totalBattles) || 0,
        wins: Number(parsed.wins) || 0,
        losses: Number(parsed.losses) || 0,
      };
    }
  } catch {
    // fallback
  }
  return { totalBattles: 0, wins: 0, losses: 0 };
}

export function saveBattleResult(playerWon: boolean): OverallStats {
  const current = loadOverallStats();
  const updated: OverallStats = {
    totalBattles: current.totalBattles + 1,
    wins: current.wins + (playerWon ? 1 : 0),
    losses: current.losses + (playerWon ? 0 : 1),
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
  return updated;
}
