import { IrenaSkillId, IrenaSkillProgress, OverallStats } from '../types/game';

const STORAGE_KEY = 'duel_arena_battle_stats';
const SKILL_PROGRESS_KEY = 'duel_arena_irena_skill_progress';

const INITIAL_SKILL_PROGRESS: IrenaSkillProgress = {
  shards: 50,
  featherLevel: 1,
  ruinLevel: 1,
};

export const BATTLE_REWARD_WIN = 50;
export const BATTLE_REWARD_LOSS = 20;
export const MAX_SKILL_LEVEL = 10;

export function getBattleReward(playerWon: boolean): number {
  return playerWon ? BATTLE_REWARD_WIN : BATTLE_REWARD_LOSS;
}

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

function normalizeSkillProgress(parsed: Partial<IrenaSkillProgress> | null | undefined): IrenaSkillProgress {
  const storedShards = Number(parsed && parsed.shards);
  const shards = Number.isFinite(storedShards)
    ? Math.max(0, Math.floor(storedShards))
    : INITIAL_SKILL_PROGRESS.shards;

  return {
    shards,
    featherLevel: Math.min(
      MAX_SKILL_LEVEL,
      Math.max(1, Math.floor(Number(parsed && parsed.featherLevel) || INITIAL_SKILL_PROGRESS.featherLevel)),
    ),
    ruinLevel: Math.min(
      MAX_SKILL_LEVEL,
      Math.max(1, Math.floor(Number(parsed && parsed.ruinLevel) || INITIAL_SKILL_PROGRESS.ruinLevel)),
    ),
  };
}

export function loadSkillProgress(): IrenaSkillProgress {
  try {
    const raw = localStorage.getItem(SKILL_PROGRESS_KEY);
    if (raw) return normalizeSkillProgress(JSON.parse(raw));
  } catch {
    // fallback
  }
  return { ...INITIAL_SKILL_PROGRESS };
}

function persistSkillProgress(progress: IrenaSkillProgress): IrenaSkillProgress {
  const normalized = normalizeSkillProgress(progress);
  try {
    localStorage.setItem(SKILL_PROGRESS_KEY, JSON.stringify(normalized));
  } catch {
    // ignore
  }
  return normalized;
}

export function addSkillShards(amount: number): IrenaSkillProgress {
  const current = loadSkillProgress();
  return persistSkillProgress({
    ...current,
    shards: current.shards + Math.max(0, Math.floor(amount)),
  });
}

export function getSkillUpgradeCost(currentLevel: number): number {
  if (currentLevel >= MAX_SKILL_LEVEL) return Infinity;
  return 40 + (Math.max(1, currentLevel) - 1) * 20;
}

export function upgradeIrenaSkill(skillId: IrenaSkillId): IrenaSkillProgress | null {
  const current = loadSkillProgress();
  const levelKey = skillId === 'FEATHER' ? 'featherLevel' : 'ruinLevel';
  const currentLevel = current[levelKey];
  const cost = getSkillUpgradeCost(currentLevel);

  if (currentLevel >= MAX_SKILL_LEVEL || current.shards < cost) return null;

  return persistSkillProgress({
    ...current,
    shards: current.shards - cost,
    [levelKey]: currentLevel + 1,
  });
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

  addSkillShards(getBattleReward(playerWon));
  return updated;
}
