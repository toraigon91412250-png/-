import { AbilityId, AbilityProgress, FeatherSkillPath, IrenaSkillId, IrenaSkillProgress, OverallStats, RecruitmentProgress, RuinSkillPath } from '../types/game';
import { getRecruitmentRewardForPull, RecruitmentDraw, RECRUITMENT_REWARDS } from '../data/recruitment';
import { MAX_ABILITY_LEVEL } from '../data/abilities';

const STORAGE_KEY = 'duel_arena_battle_stats';
const SKILL_PROGRESS_KEY = 'duel_arena_irena_skill_progress';
const STAT_POINTS_KEY = 'duel_arena_stat_points';

const INITIAL_SKILL_PROGRESS: IrenaSkillProgress = {
  shards: 50,
  featherLevel: 1,
  ruinLevel: 1,
  featherPath: null,
  ruinPath: null,
  superFallenShotUnlocked: false,
};

export const BATTLE_REWARD_WIN = 50;
export const INITIAL_STAT_POINTS = 12;
export const STAT_POINTS_PER_WIN = 2;
export const BATTLE_REWARD_LOSS = 20;
export const PATH_MASTERY_REWARD = 15;
export const MAX_SKILL_LEVEL = 10;

export function loadStatPoints(): number {
  try {
    const raw = localStorage.getItem(STAT_POINTS_KEY);
    if (raw === null) return INITIAL_STAT_POINTS;
    const points = Number(raw);
    return Number.isFinite(points) ? Math.max(0, Math.floor(points)) : INITIAL_STAT_POINTS;
  } catch {
    return INITIAL_STAT_POINTS;
  }
}

export function addStatPoints(amount: number): number {
  const next = loadStatPoints() + Math.max(0, Math.floor(amount));
  try {
    localStorage.setItem(STAT_POINTS_KEY, String(next));
  } catch {
    // ignore
  }
  return next;
}

const ABILITY_PROGRESS_KEY = 'duel_arena_ability_progress';

const INITIAL_ABILITY_PROGRESS: AbilityProgress = {
  // 権能は召喚で本体を入手した時点でLv.1解放される。
  levels: {
    ABYSS: 0,
    FALLEN: 0,
    BLACK_WING: 0,
    FALLEN_KING: 0,
    JUDGMENT: 0,
  },
  shards: {
    ABYSS: 0,
    FALLEN: 0,
    BLACK_WING: 0,
    FALLEN_KING: 0,
    JUDGMENT: 0,
  },
};

function createEmptyAbilityLevels(): Record<AbilityId, number> {
  return {
    ABYSS: 0,
    FALLEN: 0,
    BLACK_WING: 0,
    FALLEN_KING: 0,
    JUDGMENT: 0,
  };
}

function createEmptyAbilityShards(): Record<AbilityId, number> {
  return {
    ABYSS: 0,
    FALLEN: 0,
    BLACK_WING: 0,
    FALLEN_KING: 0,
    JUDGMENT: 0,
  };
}

function normalizeAbilityProgress(
  parsed: Partial<AbilityProgress> | null | undefined,
): AbilityProgress {
  const levels = createEmptyAbilityLevels();
  const shards = createEmptyAbilityShards();

  (Object.keys(levels) as AbilityId[]).forEach(id => {
    const rawLevel = Number(parsed?.levels?.[id]);
    const rawShards = Number(parsed?.shards?.[id]);
    levels[id] = Number.isFinite(rawLevel)
      ? Math.min(MAX_ABILITY_LEVEL, Math.max(0, Math.floor(rawLevel)))
      : INITIAL_ABILITY_PROGRESS.levels[id];
    shards[id] = Number.isFinite(rawShards)
      ? Math.max(0, Math.floor(rawShards))
      : INITIAL_ABILITY_PROGRESS.shards[id];
  });

  return { levels, shards };
}

export function loadAbilityProgress(): AbilityProgress {
  try {
    const raw = localStorage.getItem(ABILITY_PROGRESS_KEY);
    if (raw) {
      const normalized = normalizeAbilityProgress(JSON.parse(raw));
      // Lv.0の空セーブは現在の正規状態なので、そのまま返す。
      return normalized;
    }
  } catch {
    // fallback
  }
  return {
    levels: { ...INITIAL_ABILITY_PROGRESS.levels },
    shards: { ...INITIAL_ABILITY_PROGRESS.shards },
  };
}

function persistAbilityProgress(progress: AbilityProgress): AbilityProgress {
  const normalized = normalizeAbilityProgress(progress);
  try {
    localStorage.setItem(ABILITY_PROGRESS_KEY, JSON.stringify(normalized));
  } catch {
    // ignore
  }
  return normalized;
}

export function addAbilityShards(abilityId: AbilityId, amount: number): AbilityProgress {
  const current = loadAbilityProgress();
  return persistAbilityProgress({
    levels: { ...current.levels },
    shards: {
      ...current.shards,
      [abilityId]: current.shards[abilityId] + Math.max(0, Math.floor(amount)),
    },
  });
}

export function unlockAbility(abilityId: AbilityId): AbilityProgress {
  const current = loadAbilityProgress();
  return persistAbilityProgress({
    levels: {
      ...current.levels,
      [abilityId]: Math.max(1, current.levels[abilityId]),
    },
    shards: { ...current.shards },
  });
}

export function getAbilityUpgradeCost(currentLevel: number): number {
  if (currentLevel >= MAX_ABILITY_LEVEL) return Infinity;
  return 40 + Math.max(0, currentLevel - 1) * 40;
}

export function upgradeAbility(abilityId: AbilityId): AbilityProgress | null {
  const current = loadAbilityProgress();
  const currentLevel = current.levels[abilityId];
  const cost = getAbilityUpgradeCost(currentLevel);

  if (currentLevel <= 0 || currentLevel >= MAX_ABILITY_LEVEL || current.shards[abilityId] < cost) {
    return null;
  }

  return persistAbilityProgress({
    levels: {
      ...current.levels,
      [abilityId]: currentLevel + 1,
    },
    shards: {
      ...current.shards,
      [abilityId]: current.shards[abilityId] - cost,
    },
  });
}

export function setAbilityForDeveloper(abilityId: AbilityId, level: number, shards?: number): AbilityProgress {
  const current = loadAbilityProgress();
  return persistAbilityProgress({
    levels: {
      ...current.levels,
      [abilityId]: Math.min(MAX_ABILITY_LEVEL, Math.max(0, Math.floor(level))),
    },
    shards: {
      ...current.shards,
      [abilityId]: shards === undefined
        ? current.shards[abilityId]
        : Math.max(0, Math.floor(shards)),
    },
  });
}

export function setAllAbilitiesForDeveloper(level: number, shards = 0): AbilityProgress {
  const normalizedLevel = Math.min(MAX_ABILITY_LEVEL, Math.max(0, Math.floor(level)));
  const normalizedShards = Math.max(0, Math.floor(shards));
  return persistAbilityProgress({
    levels: {
      ABYSS: normalizedLevel,
      FALLEN: normalizedLevel,
      BLACK_WING: normalizedLevel,
      FALLEN_KING: normalizedLevel,
      JUDGMENT: normalizedLevel,
    },
    shards: {
      ABYSS: normalizedShards,
      FALLEN: normalizedShards,
      BLACK_WING: normalizedShards,
      FALLEN_KING: normalizedShards,
      JUDGMENT: normalizedShards,
    },
  });
}

export function addAbilityShardsForDeveloper(abilityId: AbilityId, amount: number): AbilityProgress {
  return addAbilityShards(abilityId, amount);
}

export function setRecruitmentTicketsForDeveloper(tickets: number): RecruitmentProgress {
  return persistRecruitmentProgress({
    ...loadRecruitmentProgress(),
    tickets: Math.max(0, Math.floor(tickets)),
  });
}

export function addRecruitmentTicketsForDeveloper(amount: number): RecruitmentProgress {
  return addRecruitmentTickets(amount);
}

export function setSkillProgressForDeveloper(
  featherLevel: number,
  ruinLevel: number,
  shards = 0,
): IrenaSkillProgress {
  const current = loadSkillProgress();
  return persistSkillProgress({
    ...current,
    shards: Math.max(0, Math.floor(shards)),
    featherLevel: Math.min(MAX_SKILL_LEVEL, Math.max(1, Math.floor(featherLevel))),
    ruinLevel: Math.min(MAX_SKILL_LEVEL, Math.max(1, Math.floor(ruinLevel))),
  });
}

export function resetProgressForDeveloper(): {
  abilityProgress: AbilityProgress;
  recruitmentProgress: RecruitmentProgress;
  skillProgress: IrenaSkillProgress;
  overallStats: OverallStats;
} {
  const abilityProgress = persistAbilityProgress({
    levels: { ...INITIAL_ABILITY_PROGRESS.levels },
    shards: { ...INITIAL_ABILITY_PROGRESS.shards },
  });
  const recruitmentProgress = persistRecruitmentProgress({
    tickets: 10,
    totalPulls: 0,
    collectedIds: [],
    lastResults: [],
  });
  const skillProgress = persistSkillProgress({ ...INITIAL_SKILL_PROGRESS });
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ totalBattles: 0, wins: 0, losses: 0 }));
    localStorage.setItem(STAT_POINTS_KEY, String(INITIAL_STAT_POINTS));
  } catch {
    // ignore
  }
  return {
    abilityProgress,
    recruitmentProgress,
    skillProgress,
    overallStats: { totalBattles: 0, wins: 0, losses: 0 },
  };
}

export function getBattleReward(playerWon: boolean, masteryBonus = 0): number {
  const baseReward = playerWon ? BATTLE_REWARD_WIN : BATTLE_REWARD_LOSS;
  return baseReward + Math.max(0, Math.floor(masteryBonus));
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

  const featherPath: FeatherSkillPath | null =
    parsed?.featherPath === 'ABYSS' || parsed?.featherPath === 'JUDGMENT' || parsed?.featherPath === 'CHARGE'
      ? parsed.featherPath
      : null;
  const ruinPath: RuinSkillPath | null =
    parsed?.ruinPath === 'EXECUTION' || parsed?.ruinPath === 'ANNIHILATION'
      ? parsed.ruinPath
      : null;

  return {
    shards,
    featherPath,
    ruinPath,
    superFallenShotUnlocked: Boolean(parsed?.superFallenShotUnlocked),
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
  const selectedPath = skillId === 'FEATHER' ? current.featherPath : current.ruinPath;
  const cost = getSkillUpgradeCost(currentLevel);

  // Specialization must be chosen before any level at or above Lv.3 can progress.
  if (currentLevel >= 3 && !selectedPath) return null;
  if (currentLevel >= MAX_SKILL_LEVEL || current.shards < cost) return null;

  return persistSkillProgress({
    ...current,
    shards: current.shards - cost,
    [levelKey]: currentLevel + 1,
  });
}

export function chooseIrenaSkillPath(
  skillId: 'FEATHER',
  path: FeatherSkillPath,
): IrenaSkillProgress | null;
export function chooseIrenaSkillPath(
  skillId: 'RUIN',
  path: RuinSkillPath,
): IrenaSkillProgress | null;
export function chooseIrenaSkillPath(
  skillId: IrenaSkillId,
  path: FeatherSkillPath | RuinSkillPath,
): IrenaSkillProgress | null {
  const current = loadSkillProgress();

  if (skillId === 'FEATHER') {
    if (current.featherPath || current.featherLevel < 3) return null;
    if (path !== 'ABYSS' && path !== 'JUDGMENT' && path !== 'CHARGE') return null;
    return persistSkillProgress({ ...current, featherPath: path });
  }

  if (current.ruinPath || current.ruinLevel < 3) return null;
  if (path !== 'EXECUTION' && path !== 'ANNIHILATION') return null;
  return persistSkillProgress({ ...current, ruinPath: path });
}

export function saveBattleResult(playerWon: boolean, masteryBonus = 0): OverallStats {
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

  addSkillShards(getBattleReward(playerWon, masteryBonus));
  addRecruitmentTickets(1);
  if (playerWon) addStatPoints(STAT_POINTS_PER_WIN);
  return updated;
}


const RECRUITMENT_KEY = 'duel_arena_recruitment_progress';
const INITIAL_RECRUITMENT_PROGRESS: RecruitmentProgress = {
  tickets: 10,
  totalPulls: 0,
  collectedIds: [],
  lastResults: [],
};

const COLLECTION_COMPLETE_TICKET_BONUS = 10;
const MAXED_ABILITY_SHARD_EXCHANGE_RATE = 2;

function normalizeRecruitmentProgress(
  parsed: Partial<RecruitmentProgress> | null | undefined,
): RecruitmentProgress {
  const tickets = Number(parsed?.tickets);
  const totalPulls = Number(parsed?.totalPulls);
  const collectedIds = Array.isArray(parsed?.collectedIds)
    ? parsed!.collectedIds.filter((id): id is string => typeof id === 'string')
    : [];
  const lastResults = Array.isArray(parsed?.lastResults)
    ? parsed!.lastResults.filter((id): id is string => typeof id === 'string').slice(-20)
    : [];

  return {
    tickets: Number.isFinite(tickets) ? Math.max(0, Math.floor(tickets)) : INITIAL_RECRUITMENT_PROGRESS.tickets,
    totalPulls: Number.isFinite(totalPulls) ? Math.max(0, Math.floor(totalPulls)) : 0,
    collectedIds: Array.from(new Set(collectedIds)),
    lastResults,
  };
}

export function loadRecruitmentProgress(): RecruitmentProgress {
  try {
    const raw = localStorage.getItem(RECRUITMENT_KEY);
    if (raw) return normalizeRecruitmentProgress(JSON.parse(raw));
  } catch {
    // fallback
  }
  return { ...INITIAL_RECRUITMENT_PROGRESS, collectedIds: [], lastResults: [] };
}

function persistRecruitmentProgress(progress: RecruitmentProgress): RecruitmentProgress {
  const normalized = normalizeRecruitmentProgress(progress);
  try {
    localStorage.setItem(RECRUITMENT_KEY, JSON.stringify(normalized));
  } catch {
    // ignore
  }
  return normalized;
}

export function addRecruitmentTickets(amount: number): RecruitmentProgress {
  const current = loadRecruitmentProgress();
  return persistRecruitmentProgress({
    ...current,
    tickets: current.tickets + Math.max(0, Math.floor(amount)),
  });
}

export function performRecruitment(pullCount = 1): { progress: RecruitmentProgress; results: RecruitmentDraw[] } | null {
  const current = loadRecruitmentProgress();
  const normalizedCount = pullCount === 10 ? 10 : 1;
  if (current.tickets < normalizedCount) return null;

  const collected = new Set(current.collectedIds);
  const draws: RecruitmentDraw[] = [];
  let nextTickets = current.tickets - normalizedCount;
  let abilityProgress = loadAbilityProgress();
  let skillProgress = loadSkillProgress();

  const addAbilityReward = (abilityId: AbilityId, amount: number) => {
    abilityProgress = {
      levels: {
        ...abilityProgress.levels,
      },
      shards: {
        ...abilityProgress.shards,
        [abilityId]: abilityProgress.shards[abilityId] + amount,
      },
    };
  };

  const addSkillReward = (amount: number) => {
    skillProgress = {
      ...skillProgress,
      shards: skillProgress.shards + Math.max(0, Math.floor(amount)),
    };
  };

  for (let index = 0; index < normalizedCount; index += 1) {
    let reward = getRecruitmentRewardForPull(current.totalPulls + index + 1);

    // 初回10連は権能本体を2種確定させ、召喚開始直後からバトルに必要な
    // 権能を2つ確保できるようにする。以降の召喚確率は変更しない。
    if (normalizedCount === 10 && current.totalPulls === 0 && index < 2) {
      do {
        reward = getRecruitmentRewardForPull(-1, true);
      } while (draws.some(draw => draw.reward.kind === 'ABILITY_CORE' && draw.reward.abilityId === reward.abilityId));
    }

    // Every 10-pull guarantees at least one ability core (SSR).
    // The first 10-pull keeps its stronger two-distinct-core guarantee above.
    if (
      normalizedCount === 10 &&
      index === normalizedCount - 1 &&
      !draws.some(draw => draw.reward.kind === 'ABILITY_CORE')
    ) {
      reward = getRecruitmentRewardForPull(-1, true);
    }

    const isNew = !collected.has(reward.id);
    if (isNew) collected.add(reward.id);

    let shardGain = 0;

    if (reward.kind === 'ABILITY_CORE' && reward.abilityId) {
      if (isNew) {
        abilityProgress = {
          levels: {
            ...abilityProgress.levels,
            [reward.abilityId]: Math.max(1, abilityProgress.levels[reward.abilityId]),
          },
          shards: { ...abilityProgress.shards },
        };
      } else {
        shardGain = reward.duplicateShards;
        addAbilityReward(reward.abilityId, shardGain);
      }
    } else if (reward.kind === 'ABILITY_SHARD' && reward.abilityId) {
      const currentLevel = abilityProgress.levels[reward.abilityId];
      if (currentLevel >= MAX_ABILITY_LEVEL) {
        // MAX後の権能欠片は死に資源にせず、技強化の欠片へ自動交換する。
        const exchangedSkillShards = Math.floor(
          reward.shardAmount / MAXED_ABILITY_SHARD_EXCHANGE_RATE,
        );
        shardGain = exchangedSkillShards;
        addSkillReward(exchangedSkillShards);
      } else {
        shardGain = reward.shardAmount;
        addAbilityReward(reward.abilityId, shardGain);
      }
    } else if (reward.kind === 'SKILL_SHARD') {
      shardGain = isNew ? reward.shardAmount : reward.duplicateShards;
      addSkillReward(shardGain);
    } else if (reward.kind === 'SPECIAL_SKILL' && reward.specialSkillId === 'SUPER_FALLEN_SHOT') {
      if (isNew) {
        skillProgress = {
          ...skillProgress,
          superFallenShotUnlocked: true,
        };
      } else {
        shardGain = reward.duplicateShards;
        addSkillReward(shardGain);
      }
    }

    draws.push({
      reward,
      isNew,
      shardGain,
      ticketBonus: 0,
      collectionCompleted: false,
      collectionBonusShards: 0,
    });
  }

  const collectionCompleted =
    collected.size >= RECRUITMENT_REWARDS.length &&
    current.collectedIds.filter(id => RECRUITMENT_REWARDS.some(reward => reward.id === id)).length < RECRUITMENT_REWARDS.length;

  if (collectionCompleted && draws.length > 0) {
    const collectionReward = COLLECTION_COMPLETE_TICKET_BONUS;
    nextTickets += collectionReward;
    draws[draws.length - 1] = {
      ...draws[draws.length - 1],
      collectionCompleted: true,
      ticketBonus: collectionReward,
    };
  }

  persistAbilityProgress(abilityProgress);
  persistSkillProgress(skillProgress);
  const nextProgress = persistRecruitmentProgress({
    ...current,
    tickets: nextTickets,
    totalPulls: current.totalPulls + normalizedCount,
    collectedIds: Array.from(collected),
    lastResults: current.lastResults.concat(draws.map(draw => draw.reward.id)).slice(-20),
  });

  return { progress: nextProgress, results: draws };
}
