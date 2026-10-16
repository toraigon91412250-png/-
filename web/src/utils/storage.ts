import { AbilityId, AbilityProgress, FeatherSkillPath, ImprintId, ImprintProgress, IrenaSkillId, IrenaSkillProgress, OverallStats, RaidRewardProgress, RecruitmentProgress, RuinSkillPath } from '../types/game';
import { getRecruitmentRewardForPull, RecruitmentDraw, RECRUITMENT_REWARDS } from '../data/recruitment';
import { MAX_ABILITY_LEVEL } from '../data/abilities';
import { IMPRINT_DEFINITIONS, isImprintId, MAX_EQUIPPED_IMPRINTS } from '../data/imprints';
import type { ImprintDefinition } from '../data/imprints';
import { normalizeEquippedImprints } from './imprintSystem';
import { addIrenaBattleExperience, getIrenaXpForLevel, INITIAL_IRENA_TALENT_PROGRESS, IRENA_TALENT_MAX_LEVEL, IRENA_TALENT_PROGRESS_KEY, loadIrenaTalentProgress, normalizeIrenaTalentProgress } from './irenaTalentSystem';
import { KAISER_CHALLENGE_PROGRESS_KEY } from './kaiserChallengeProgress';
import { ACHIEVEMENT_DEFINITIONS, ACHIEVEMENT_PROGRESS_STORAGE_KEY, INITIAL_ACHIEVEMENT_PROGRESS, completeAchievementIds, markAllAchievementsForDeveloper, normalizeAchievementProgress, recordAchievementBattle, type AchievementBattleSample, type AchievementProgress } from './achievementSystem';

const STORAGE_KEY = 'duel_arena_battle_stats';
const SKILL_PROGRESS_KEY = 'duel_arena_irena_skill_progress';
const STAT_POINTS_KEY = 'duel_arena_stat_points';
const RAID_REWARD_PROGRESS_KEY = 'duel_arena_raid_reward_progress';
export const STELLA_MODE_PROGRESS_KEY = 'duel_arena_stella_mode_progress';

interface StorageWrite {
  key: string;
  value: string;
}

/**
 * Persist related progression keys as one best-effort transaction. localStorage
 * has no native transaction API, so restore previous values if any write fails
 * rather than leaving battle or summon rewards partially applied.
 */
function persistStorageTransaction(writes: StorageWrite[]): boolean {
  const previous: Array<{ key: string; value: string | null }> = [];

  try {
    for (const { key } of writes) {
      previous.push({ key, value: localStorage.getItem(key) });
    }
  } catch {
    return false;
  }

  try {
    for (const { key, value } of writes) {
      localStorage.setItem(key, value);
    }
    return true;
  } catch {
    for (let index = previous.length - 1; index >= 0; index -= 1) {
      const saved = previous[index];
      try {
        if (saved.value === null) localStorage.removeItem(saved.key);
        else localStorage.setItem(saved.key, saved.value);
      } catch {
        // Rollback is best-effort when the storage backend itself is failing.
      }
    }
    return false;
  }
}


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

function loadBaseStatPoints(): number {
  try {
    const raw = localStorage.getItem(STAT_POINTS_KEY);
    if (raw === null) return INITIAL_STAT_POINTS;
    const points = Number(raw);
    return Number.isFinite(points) ? Math.max(0, Math.floor(points)) : INITIAL_STAT_POINTS;
  } catch {
    return INITIAL_STAT_POINTS;
  }
}

/** Normal points from the main game plus the permanent bonus redeemed from raid items. */
export function loadStatPoints(): number {
  return loadBaseStatPoints() + loadRaidRewardProgress().bonusStatPoints;
}

export function addStatPoints(amount: number): number {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  const nextBase = loadBaseStatPoints() + safeAmount;
  try {
    localStorage.setItem(STAT_POINTS_KEY, String(nextBase));
  } catch {
    // ignore
  }
  return nextBase + loadRaidRewardProgress().bonusStatPoints;
}

export const KAISER_100_VICTORY_STAT_POINT_REWARD = 50;

export interface StellaModeProgress {
  /** Legacy final-battle unlock marker; now set after the EX Kaiser challenge. */
  isUnlocked: boolean;
  /** Playable Stella mode unlocked after the Lv.100 reveal and warp. */
  stellaModeUnlocked: boolean;
  /** True only after defeating EX Kaiser in the post-Lv.100 challenge. */
  exKaiserDefeated: boolean;
  revealAvailable: boolean;
  kaiser100RewardClaimed: boolean;
  /** Set together with the first-clear reward in one atomic storage transaction. */
  finalBattleCleared: boolean;
  /** Authoritative one-time marker for the +100P reward and final-battle Irena unlock. */
  finalBattleRewardClaimed: boolean;
  /** True after developer mode has been enabled; absent in legacy saves means off. */
  developerModeEnabled?: boolean;
  /** All game modes and normal progression gates were opened by the full-unlock action. */
  allGameFeaturesUnlocked?: boolean;
}

export interface Kaiser100VictoryRewardResult {
  progress: StellaModeProgress;
  rewardGranted: boolean;
  /** False if either the reward or its claim marker could not be saved. */
  persisted: boolean;
}

export const STELLA_FINAL_BATTLE_STAT_POINT_REWARD = 100;

export interface StellaFinalBattleRewardResult {
  progress: StellaModeProgress;
  rewardGranted: boolean;
  /** False if the points or first-clear marker could not be saved atomically. */
  persisted: boolean;
}

const INITIAL_STELLA_MODE_PROGRESS: StellaModeProgress = {
  isUnlocked: false,
  stellaModeUnlocked: false,
  exKaiserDefeated: false,
  revealAvailable: false,
  kaiser100RewardClaimed: false,
  finalBattleCleared: false,
  finalBattleRewardClaimed: false,
};

function normalizeStellaModeProgress(value: unknown): StellaModeProgress {
  if (!value || typeof value !== 'object') return { ...INITIAL_STELLA_MODE_PROGRESS };
  const parsed = value as Partial<StellaModeProgress>;
  const isUnlocked = parsed.isUnlocked === true;
  // Before this split, isUnlocked meant the player had already cleared EX Kaiser.
  // Treat those old saves as unlocked for both stages, but keep the new stages independent.
  const exKaiserDefeated = parsed.exKaiserDefeated === true || isUnlocked;
  const stellaModeUnlocked = parsed.stellaModeUnlocked === true || isUnlocked;
  const kaiser100RewardClaimed = parsed.kaiser100RewardClaimed === true;
  const finalBattleRewardClaimed = parsed.finalBattleRewardClaimed === true;
  return {
    isUnlocked,
    stellaModeUnlocked,
    exKaiserDefeated,
    // Saves from the old flow have the +50P marker but no warp flag. Send them to
    // the reveal now, so they are not stranded at the old EX-first screen.
    revealAvailable: !stellaModeUnlocked && !isUnlocked && kaiser100RewardClaimed,
    kaiser100RewardClaimed,
    // Old saves lack these fields and remain uncleared. A persisted reward marker
    // also repairs a missing clear marker without allowing the reward to repeat.
    finalBattleCleared: parsed.finalBattleCleared === true || finalBattleRewardClaimed,
    finalBattleRewardClaimed,
    ...(parsed.developerModeEnabled === true ? { developerModeEnabled: true } : {}),
    ...(parsed.allGameFeaturesUnlocked === true ? { allGameFeaturesUnlocked: true } : {}),
  };
}

/** Missing keys in older saves are treated as an untouched, locked Stella mode. */
export function loadStellaModeProgress(): StellaModeProgress {
  try {
    const raw = localStorage.getItem(STELLA_MODE_PROGRESS_KEY);
    if (raw === null) return { ...INITIAL_STELLA_MODE_PROGRESS };
    return normalizeStellaModeProgress(JSON.parse(raw) as unknown);
  } catch {
    return { ...INITIAL_STELLA_MODE_PROGRESS };
  }
}

/** Permanently enables developer mode until the normal in-game reset clears progression. */
export function enableDeveloperMode(): { progress: StellaModeProgress; persisted: boolean } {
  const current = loadStellaModeProgress();
  if (current.developerModeEnabled === true) return { progress: current, persisted: true };

  const next: StellaModeProgress = { ...current, developerModeEnabled: true };
  try {
    localStorage.setItem(STELLA_MODE_PROGRESS_KEY, JSON.stringify(next));
    return { progress: next, persisted: true };
  } catch {
    return { progress: current, persisted: false };
  }
}

/**
 * Grants the one-time Lv.100 victory bonus and makes the hidden warp entrance
 * available. Stella mode unlocks after that warp; the EX challenge follows it.
 */
export function claimKaiser100VictoryReward(): Kaiser100VictoryRewardResult {
  const current = loadStellaModeProgress();
  if (current.kaiser100RewardClaimed) {
    return { progress: current, rewardGranted: false, persisted: true };
  }

  const rewardGranted = !current.kaiser100RewardClaimed;
  const next: StellaModeProgress = {
    ...current,
    isUnlocked: current.isUnlocked,
    stellaModeUnlocked: current.stellaModeUnlocked,
    exKaiserDefeated: current.exKaiserDefeated,
    revealAvailable: !current.stellaModeUnlocked && !current.isUnlocked,
    kaiser100RewardClaimed: true,
  };
  const writes: StorageWrite[] = [
    { key: STELLA_MODE_PROGRESS_KEY, value: JSON.stringify(next) },
  ];

  if (rewardGranted) {
    writes.push({
      key: STAT_POINTS_KEY,
      value: String(loadBaseStatPoints() + KAISER_100_VICTORY_STAT_POINT_REWARD),
    });
  }

  const persisted = persistStorageTransaction(writes);
  return {
    progress: persisted ? next : current,
    rewardGranted: persisted && rewardGranted,
    persisted,
  };
}

/**
 * Persist the first Stella final-battle victory, its +100 base points, and the
 * final-battle Irena unlock marker together. Never include raid bonus points
 * in the stored base total, because loadStatPoints adds those separately.
 * The caller must pass the actual victory state; losses cannot claim rewards.
 */
export function claimStellaFinalBattleReward(playerWon: boolean): StellaFinalBattleRewardResult {
  const current = loadStellaModeProgress();
  if (!playerWon) return { progress: current, rewardGranted: false, persisted: false };
  if (current.finalBattleRewardClaimed) {
    return { progress: current, rewardGranted: false, persisted: true };
  }

  const next: StellaModeProgress = {
    ...current,
    finalBattleCleared: true,
    finalBattleRewardClaimed: true,
  };
  const persisted = persistStorageTransaction([
    { key: STELLA_MODE_PROGRESS_KEY, value: JSON.stringify(next) },
    { key: STAT_POINTS_KEY, value: String(loadBaseStatPoints() + STELLA_FINAL_BATTLE_STAT_POINT_REWARD) },
  ]);

  return {
    progress: persisted ? next : current,
    rewardGranted: persisted,
    persisted,
  };
}

/**
 * Records the EX Kaiser victory after the player has unlocked Stella mode.
 * This enables the dedicated final battle; retries are idempotent.
 */
export function recordExKaiserVictory(): { progress: StellaModeProgress; persisted: boolean } {
  const current = loadStellaModeProgress();
  if (current.exKaiserDefeated) return { progress: current, persisted: true };
  if (!current.kaiser100RewardClaimed || !current.stellaModeUnlocked) {
    return { progress: current, persisted: false };
  }

  const next: StellaModeProgress = {
    ...current,
    isUnlocked: true,
    stellaModeUnlocked: true,
    exKaiserDefeated: true,
    revealAvailable: false,
  };
  const persisted = persistStorageTransaction([
    { key: STELLA_MODE_PROGRESS_KEY, value: JSON.stringify(next) },
  ]);
  return { progress: persisted ? next : current, persisted };
}

/** Persist the playable Stella-mode unlock only after the warp/reveal event. */
export function unlockStellaMode(): { progress: StellaModeProgress; persisted: boolean } {
  const current = loadStellaModeProgress();
  if (current.stellaModeUnlocked) return { progress: current, persisted: true };
  if (!current.revealAvailable) return { progress: current, persisted: false };

  const next: StellaModeProgress = {
    ...current,
    isUnlocked: current.exKaiserDefeated,
    stellaModeUnlocked: true,
    exKaiserDefeated: current.exKaiserDefeated,
    revealAvailable: false,
    kaiser100RewardClaimed: current.kaiser100RewardClaimed,
  };
  const persisted = persistStorageTransaction([
    { key: STELLA_MODE_PROGRESS_KEY, value: JSON.stringify(next) },
  ]);
  return { progress: persisted ? next : current, persisted };
}

const INITIAL_RAID_REWARD_PROGRESS: RaidRewardProgress = {
  coreFragments: 0,
  imprintTickets: 0,
  bonusStatPoints: 0,
  claimedVictoryRunIds: [],
};

export interface RaidVictoryRewardClaim {
  progress: RaidRewardProgress;
  claimed: boolean;
  /** False only when the reward could not be persisted. */
  persisted: boolean;
}

export interface RaidCoreFragmentRedemption {
  progress: RaidRewardProgress;
  used: boolean;
  /** False only when the updated inventory could not be persisted. */
  persisted: boolean;
}

function normalizeRaidRewardProgress(
  parsed: Partial<RaidRewardProgress> | null | undefined,
): RaidRewardProgress {
  const normalizeCount = (value: unknown): number => {
    const count = Number(value);
    return Number.isFinite(count) ? Math.min(1_000_000_000, Math.max(0, Math.floor(count))) : 0;
  };
  const runIds = Array.isArray(parsed?.claimedVictoryRunIds)
    ? parsed.claimedVictoryRunIds
        .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        .map(id => id.slice(0, 120))
    : [];

  return {
    coreFragments: normalizeCount(parsed?.coreFragments),
    imprintTickets: normalizeCount(parsed?.imprintTickets),
    bonusStatPoints: normalizeCount(parsed?.bonusStatPoints),
    claimedVictoryRunIds: Array.from(new Set(runIds)).slice(-100),
  };
}

export function loadRaidRewardProgress(): RaidRewardProgress {
  try {
    const raw = localStorage.getItem(RAID_REWARD_PROGRESS_KEY);
    if (raw) return normalizeRaidRewardProgress(JSON.parse(raw));
  } catch {
    // A missing, malformed, or blocked save must never prevent the main game from opening.
  }
  return { ...INITIAL_RAID_REWARD_PROGRESS, claimedVictoryRunIds: [] };
}

function persistRaidRewardProgress(progress: RaidRewardProgress): boolean {
  try {
    localStorage.setItem(RAID_REWARD_PROGRESS_KEY, JSON.stringify(normalizeRaidRewardProgress(progress)));
    return true;
  } catch {
    return false;
  }
}

/** Developer-only helpers for exercising the dedicated imprint gacha. */
export function setImprintTicketsForDeveloper(tickets: number): RaidRewardProgress {
  const next = normalizeRaidRewardProgress({
    ...loadRaidRewardProgress(),
    imprintTickets: Math.max(0, Math.floor(tickets)),
  });
  persistRaidRewardProgress(next);
  return next;
}

export function addImprintTicketsForDeveloper(amount: number): RaidRewardProgress {
  const current = loadRaidRewardProgress();
  return setImprintTicketsForDeveloper(current.imprintTickets + Math.max(0, Math.floor(amount)));
}

/** Grant one core fragment and one imprint ticket per unique raid victory. */
export function claimRaidVictoryReward(runId: string): RaidVictoryRewardClaim {
  const current = loadRaidRewardProgress();
  const safeRunId = typeof runId === 'string' ? runId.trim().slice(0, 120) : '';

  if (!safeRunId) return { progress: current, claimed: false, persisted: false };
  if (current.claimedVictoryRunIds.includes(safeRunId)) {
    return { progress: current, claimed: false, persisted: true };
  }

  const next = normalizeRaidRewardProgress({
    ...current,
    coreFragments: current.coreFragments + 1,
    imprintTickets: current.imprintTickets + 1,
    claimedVictoryRunIds: [...current.claimedVictoryRunIds, safeRunId],
  });
  if (!persistRaidRewardProgress(next)) {
    return { progress: current, claimed: false, persisted: false };
  }
  return { progress: next, claimed: true, persisted: true };
}

export type ImprintGachaDrawResult =
  | {
      status: 'DRAWN';
      imprint: ImprintDefinition;
      raidRewardProgress: RaidRewardProgress;
      imprintProgress: ImprintProgress;
    }
  | {
      status: 'NO_TICKETS' | 'ALL_COLLECTED' | 'SAVE_FAILED';
      raidRewardProgress: RaidRewardProgress;
      imprintProgress: ImprintProgress;
    };

/**
 * Spend one raid-earned ticket on one random unowned imprint.
 * The ownership pool is read fresh on every call so a repeated click can never
 * award a duplicate from a stale UI state.
 */
export function drawImprintGacha(random: () => number = Math.random): ImprintGachaDrawResult {
  const currentRaid = loadRaidRewardProgress();
  const currentImprints = loadImprintProgress();
  const available = IMPRINT_DEFINITIONS.filter(
    imprint => !currentImprints.unlockedIds.includes(imprint.id),
  );

  if (available.length === 0) {
    return {
      status: 'ALL_COLLECTED',
      raidRewardProgress: currentRaid,
      imprintProgress: currentImprints,
    };
  }
  if (currentRaid.imprintTickets < 1) {
    return {
      status: 'NO_TICKETS',
      raidRewardProgress: currentRaid,
      imprintProgress: currentImprints,
    };
  }

  const roll = random();
  const safeRoll = Number.isFinite(roll) ? Math.min(0.999999999, Math.max(0, roll)) : 0;
  const drawnImprint = available[Math.floor(safeRoll * available.length)];
  if (!drawnImprint) {
    return {
      status: 'SAVE_FAILED',
      raidRewardProgress: currentRaid,
      imprintProgress: currentImprints,
    };
  }

  const nextRaid = normalizeRaidRewardProgress({
    ...currentRaid,
    imprintTickets: currentRaid.imprintTickets - 1,
  });
  const nextImprints = normalizeImprintProgress({
    ...currentImprints,
    unlockedIds: [...currentImprints.unlockedIds, drawnImprint.id],
  });

  if (!persistRaidRewardProgress(nextRaid)) {
    return {
      status: 'SAVE_FAILED',
      raidRewardProgress: currentRaid,
      imprintProgress: currentImprints,
    };
  }

  const savedImprints = persistImprintProgress(nextImprints);
  if (!savedImprints) {
    // Restore the ticket if ownership could not be saved; never charge for a lost draw.
    persistRaidRewardProgress(currentRaid);
    return {
      status: 'SAVE_FAILED',
      raidRewardProgress: loadRaidRewardProgress(),
      imprintProgress: loadImprintProgress(),
    };
  }

  return {
    status: 'DRAWN',
    imprint: drawnImprint,
    raidRewardProgress: nextRaid,
    imprintProgress: savedImprints,
  };
}

/** Convert one raid-only fragment into +2 permanent stat-allocation points in a single save write. */
export function redeemRaidCoreFragment(): RaidCoreFragmentRedemption {
  const current = loadRaidRewardProgress();
  if (current.coreFragments <= 0) {
    return { progress: current, used: false, persisted: true };
  }

  const next = normalizeRaidRewardProgress({
    ...current,
    coreFragments: current.coreFragments - 1,
    bonusStatPoints: current.bonusStatPoints + 2,
  });
  if (!persistRaidRewardProgress(next)) {
    return { progress: current, used: false, persisted: false };
  }
  return { progress: next, used: true, persisted: true };
}


export const IMPRINT_PROGRESS_STORAGE_KEY = 'duel_arena_imprint_progress';
const INITIAL_IMPRINT_PROGRESS: ImprintProgress = {
  // The first prototype imprint is available as a starter so equipment and
  // persistence can be validated before the dedicated imprint summon exists.
  unlockedIds: ['FORESIGHT'],
  equippedIds: [],
};

function normalizeImprintProgress(
  parsed: Partial<ImprintProgress> | null | undefined,
): ImprintProgress {
  const unlockedIds = Array.isArray(parsed?.unlockedIds)
    ? Array.from(new Set(parsed.unlockedIds.filter(isImprintId)))
    : [];
  const equippedIds = normalizeEquippedImprints(parsed?.equippedIds)
    .filter(id => unlockedIds.includes(id))
    .slice(0, MAX_EQUIPPED_IMPRINTS);
  return { unlockedIds, equippedIds };
}

export function loadImprintProgress(): ImprintProgress {
  try {
    const raw = localStorage.getItem(IMPRINT_PROGRESS_STORAGE_KEY);
    if (raw !== null) return normalizeImprintProgress(JSON.parse(raw));
  } catch {
    // Missing, malformed, or blocked storage must not prevent the game from opening.
  }
  return {
    unlockedIds: [...INITIAL_IMPRINT_PROGRESS.unlockedIds],
    equippedIds: [...INITIAL_IMPRINT_PROGRESS.equippedIds],
  };
}

function persistImprintProgress(progress: ImprintProgress): ImprintProgress | null {
  const normalized = normalizeImprintProgress(progress);
  try {
    localStorage.setItem(IMPRINT_PROGRESS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return null;
  }
}

/** Called by the future imprint-summon reward flow; repeated unlocks are idempotent. */
export function unlockImprint(id: ImprintId): ImprintProgress | null {
  if (!isImprintId(id)) return null;
  const current = loadImprintProgress();
  if (current.unlockedIds.includes(id)) return current;
  return persistImprintProgress({ ...current, unlockedIds: [...current.unlockedIds, id] });
}

/** Unlock every currently registered imprint for manual test setup. */
export function unlockAllImprintsForDeveloper(): ImprintProgress | null {
  const current = loadImprintProgress();
  return persistImprintProgress({
    ...current,
    unlockedIds: IMPRINT_DEFINITIONS.map(imprint => imprint.id),
  });
}

export function equipImprint(id: ImprintId): ImprintProgress | null {
  const current = loadImprintProgress();
  if (!isImprintId(id) || !current.unlockedIds.includes(id)) return null;
  if (current.equippedIds.includes(id)) return current;

  // Equipping one blood imprint automatically replaces the other so saved data
  // and UI interactions can never leave both mutually exclusive effects active.
  const opposingBloodImprint = id === 'BLOOD_TEAR'
    ? 'BLOOD_MEDIA'
    : id === 'BLOOD_MEDIA'
      ? 'BLOOD_TEAR'
      : null;
  const compatibleIds = opposingBloodImprint
    ? current.equippedIds.filter(equippedId => equippedId !== opposingBloodImprint)
    : current.equippedIds;
  if (compatibleIds.length >= MAX_EQUIPPED_IMPRINTS) return null;
  return persistImprintProgress({ ...current, equippedIds: [...compatibleIds, id] });
}

export function unequipImprint(id: ImprintId): ImprintProgress | null {
  const current = loadImprintProgress();
  if (!current.equippedIds.includes(id)) return current;
  return persistImprintProgress({
    ...current,
    equippedIds: current.equippedIds.filter(equippedId => equippedId !== id),
  });
}

/** Replace only the equipped loadout; ownership and every other saved progression field stay intact. */
export function replaceEquippedImprints(ids: readonly ImprintId[]): ImprintProgress | null {
  if (!Array.isArray(ids) || ids.length > MAX_EQUIPPED_IMPRINTS) return null;
  if (new Set(ids).size !== ids.length || !ids.every(isImprintId)) return null;
  if (ids.includes('BLOOD_TEAR') && ids.includes('BLOOD_MEDIA')) return null;

  const current = loadImprintProgress();
  if (!ids.every(id => current.unlockedIds.includes(id))) return null;
  return persistImprintProgress({ ...current, equippedIds: [...ids] });
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
    ASTRAL_DOMINION: 0,
  },
  shards: {
    ABYSS: 0,
    FALLEN: 0,
    BLACK_WING: 0,
    FALLEN_KING: 0,
    JUDGMENT: 0,
    ASTRAL_DOMINION: 0,
  },
};

function createEmptyAbilityLevels(): Record<AbilityId, number> {
  return {
    ABYSS: 0,
    FALLEN: 0,
    BLACK_WING: 0,
    FALLEN_KING: 0,
    JUDGMENT: 0,
    ASTRAL_DOMINION: 0,
  };
}

function createEmptyAbilityShards(): Record<AbilityId, number> {
  return {
    ABYSS: 0,
    FALLEN: 0,
    BLACK_WING: 0,
    FALLEN_KING: 0,
    JUDGMENT: 0,
    ASTRAL_DOMINION: 0,
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
    return normalized;
  } catch {
    // Never present an unsaved upgrade/reward as the current progression.
    return loadAbilityProgress();
  }
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
  const current = loadAbilityProgress();
  const normalizedLevel = Math.min(MAX_ABILITY_LEVEL, Math.max(0, Math.floor(level)));
  const normalizedShards = Math.max(0, Math.floor(shards));
  return persistAbilityProgress({
    levels: {
      ABYSS: normalizedLevel,
      FALLEN: normalizedLevel,
      BLACK_WING: normalizedLevel,
      FALLEN_KING: normalizedLevel,
      JUDGMENT: normalizedLevel,
      ASTRAL_DOMINION: current.levels.ASTRAL_DOMINION,
    },
    shards: {
      ABYSS: normalizedShards,
      FALLEN: normalizedShards,
      BLACK_WING: normalizedShards,
      FALLEN_KING: normalizedShards,
      JUDGMENT: normalizedShards,
      ASTRAL_DOMINION: current.shards.ASTRAL_DOMINION,
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

/** Unlock 超堕天撃 directly for focused combat testing in Developer Tools. */
export function unlockSuperFallenShotForDeveloper(): IrenaSkillProgress {
  const current = loadSkillProgress();
  return persistSkillProgress({ ...current, superFallenShotUnlocked: true });
}

export function resetProgressForDeveloper(): {
  abilityProgress: AbilityProgress;
  recruitmentProgress: RecruitmentProgress;
  skillProgress: IrenaSkillProgress;
  imprintProgress: ImprintProgress;
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
  const imprintProgress = persistImprintProgress({
    unlockedIds: [...INITIAL_IMPRINT_PROGRESS.unlockedIds],
    equippedIds: [...INITIAL_IMPRINT_PROGRESS.equippedIds],
  });
  try {
    // Clear developer mode first, without letting this write block the other reset operations.
    localStorage.setItem(STELLA_MODE_PROGRESS_KEY, JSON.stringify(INITIAL_STELLA_MODE_PROGRESS));
    localStorage.setItem(ACHIEVEMENT_PROGRESS_STORAGE_KEY, JSON.stringify(INITIAL_ACHIEVEMENT_PROGRESS));
  } catch {
    // Keep attempting the remaining reset writes if this key cannot be saved.
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ totalBattles: 0, wins: 0, losses: 0 }));
    localStorage.setItem(STAT_POINTS_KEY, String(INITIAL_STAT_POINTS));
    localStorage.setItem(IRENA_TALENT_PROGRESS_KEY, JSON.stringify({
      ...INITIAL_IRENA_TALENT_PROGRESS,
      ranks: { ...INITIAL_IRENA_TALENT_PROGRESS.ranks },
    }));
    persistRaidRewardProgress({ ...INITIAL_RAID_REWARD_PROGRESS, claimedVictoryRunIds: [] });
  } catch {
    // ignore
  }
  return {
    abilityProgress,
    recruitmentProgress,
    skillProgress,
    imprintProgress: imprintProgress ?? loadImprintProgress(),
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
    return normalized;
  } catch {
    // Never present an unsaved upgrade/reward as the current progression.
    return loadSkillProgress();
  }
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

export interface BattleResultSave {
  stats: OverallStats;
  persisted: boolean;
}

export function saveBattleResult(playerWon: boolean, masteryBonus = 0, playerCharacterId = 'irena'): BattleResultSave {
  const current = loadOverallStats();
  const updated: OverallStats = {
    totalBattles: current.totalBattles + 1,
    wins: current.wins + (playerWon ? 1 : 0),
    losses: current.losses + (playerWon ? 0 : 1),
  };

  const currentSkills = loadSkillProgress();
  const nextSkills = playerCharacterId === 'irena'
    ? normalizeSkillProgress({
        ...currentSkills,
        shards: currentSkills.shards + getBattleReward(playerWon, masteryBonus),
      })
    : currentSkills;
  const currentTalentProgress = loadIrenaTalentProgress();
  const nextTalentProgress = playerCharacterId === 'irena'
    ? addIrenaBattleExperience(currentTalentProgress, playerWon)
    : currentTalentProgress;
  const currentRecruitment = loadRecruitmentProgress();
  const nextRecruitment = normalizeRecruitmentProgress({
    ...currentRecruitment,
    tickets: currentRecruitment.tickets + 1,
  });
  const writes: StorageWrite[] = [
    { key: STORAGE_KEY, value: JSON.stringify(updated) },
    { key: SKILL_PROGRESS_KEY, value: JSON.stringify(nextSkills) },
    { key: IRENA_TALENT_PROGRESS_KEY, value: JSON.stringify(nextTalentProgress) },
    { key: RECRUITMENT_KEY, value: JSON.stringify(nextRecruitment) },
  ];

  if (playerWon) {
    writes.push({
      key: STAT_POINTS_KEY,
      value: String(loadBaseStatPoints() + STAT_POINTS_PER_WIN),
    });
  }

  const persisted = persistStorageTransaction(writes);
  return { stats: persisted ? updated : current, persisted };
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
    return normalized;
  } catch {
    // Never present unsaved tickets/collection progress as if the save succeeded.
    return loadRecruitmentProgress();
  }
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

  const nextAbilityProgress = normalizeAbilityProgress(abilityProgress);
  const nextSkillProgress = normalizeSkillProgress(skillProgress);
  const nextProgress = normalizeRecruitmentProgress({
    ...current,
    tickets: nextTickets,
    totalPulls: current.totalPulls + normalizedCount,
    collectedIds: Array.from(collected),
    lastResults: current.lastResults.concat(draws.map(draw => draw.reward.id)).slice(-20),
  });

  const persisted = persistStorageTransaction([
    { key: ABILITY_PROGRESS_KEY, value: JSON.stringify(nextAbilityProgress) },
    { key: SKILL_PROGRESS_KEY, value: JSON.stringify(nextSkillProgress) },
    { key: RECRUITMENT_KEY, value: JSON.stringify(nextProgress) },
  ]);
  if (!persisted) return null;

  return { progress: nextProgress, results: draws };
}

/**
 * Unlock all currently implemented game modes and give enough development
 * resources to exercise every progression screen. Related saves are committed
 * together so a storage failure cannot leave only part of the game unlocked.
 */
export function unlockAllGameFeaturesForDeveloper(): {
  progress: StellaModeProgress;
  persisted: boolean;
} {
  const currentStellaProgress = loadStellaModeProgress();
  const currentAbilities = loadAbilityProgress();
  const currentRecruitment = loadRecruitmentProgress();
  const currentSkills = loadSkillProgress();
  const currentImprints = loadImprintProgress();
  const currentRaidRewards = loadRaidRewardProgress();
  const currentTalents = loadIrenaTalentProgress();

  const nextStellaProgress: StellaModeProgress = {
    ...currentStellaProgress,
    isUnlocked: true,
    stellaModeUnlocked: true,
    exKaiserDefeated: true,
    revealAvailable: false,
    kaiser100RewardClaimed: true,
    developerModeEnabled: true,
    allGameFeaturesUnlocked: true,
  };
  const nextAbilities = normalizeAbilityProgress({
    levels: {
      ABYSS: MAX_ABILITY_LEVEL,
      FALLEN: MAX_ABILITY_LEVEL,
      BLACK_WING: MAX_ABILITY_LEVEL,
      FALLEN_KING: MAX_ABILITY_LEVEL,
      JUDGMENT: MAX_ABILITY_LEVEL,
      ASTRAL_DOMINION: MAX_ABILITY_LEVEL,
    },
    shards: {
      ABYSS: Math.max(9999, currentAbilities.shards.ABYSS),
      FALLEN: Math.max(9999, currentAbilities.shards.FALLEN),
      BLACK_WING: Math.max(9999, currentAbilities.shards.BLACK_WING),
      FALLEN_KING: Math.max(9999, currentAbilities.shards.FALLEN_KING),
      JUDGMENT: Math.max(9999, currentAbilities.shards.JUDGMENT),
      ASTRAL_DOMINION: Math.max(9999, currentAbilities.shards.ASTRAL_DOMINION),
    },
  });
  const nextRecruitment = normalizeRecruitmentProgress({
    ...currentRecruitment,
    tickets: Math.max(9999, currentRecruitment.tickets),
  });
  const nextSkills = normalizeSkillProgress({
    ...currentSkills,
    // A path must be selected at Lv.3 before the skill can reach its cap.
    // Keep unchosen branches selectable; already-specialized skills can be maxed.
    featherLevel: currentSkills.featherPath ? MAX_SKILL_LEVEL : 3,
    ruinLevel: currentSkills.ruinPath ? MAX_SKILL_LEVEL : 3,
    shards: Math.max(9999, currentSkills.shards),
    superFallenShotUnlocked: true,
  });
  const nextImprints = normalizeImprintProgress({
    ...currentImprints,
    unlockedIds: IMPRINT_DEFINITIONS.map(imprint => imprint.id),
  });
  const nextRaidRewards = normalizeRaidRewardProgress({
    ...currentRaidRewards,
    coreFragments: Math.max(9999, currentRaidRewards.coreFragments),
    imprintTickets: Math.max(9999, currentRaidRewards.imprintTickets),
  });
  const nextTalents = normalizeIrenaTalentProgress({
    ...currentTalents,
    experience: getIrenaXpForLevel(IRENA_TALENT_MAX_LEVEL),
  });
  const pointReward = currentStellaProgress.kaiser100RewardClaimed
    ? 0
    : KAISER_100_VICTORY_STAT_POINT_REWARD;

  const persisted = persistStorageTransaction([
    { key: STELLA_MODE_PROGRESS_KEY, value: JSON.stringify(nextStellaProgress) },
    { key: STAT_POINTS_KEY, value: String(loadBaseStatPoints() + pointReward) },
    { key: KAISER_CHALLENGE_PROGRESS_KEY, value: JSON.stringify({ unlockedLevel: 100 }) },
    { key: ABILITY_PROGRESS_KEY, value: JSON.stringify(nextAbilities) },
    { key: RECRUITMENT_KEY, value: JSON.stringify(nextRecruitment) },
    { key: SKILL_PROGRESS_KEY, value: JSON.stringify(nextSkills) },
    { key: IMPRINT_PROGRESS_STORAGE_KEY, value: JSON.stringify(nextImprints) },
    { key: RAID_REWARD_PROGRESS_KEY, value: JSON.stringify(nextRaidRewards) },
    { key: IRENA_TALENT_PROGRESS_KEY, value: JSON.stringify(nextTalents) },
  ]);

  return {
    progress: persisted ? nextStellaProgress : currentStellaProgress,
    persisted,
  };
}



export function loadAchievementProgress(): AchievementProgress {
  try {
    const raw = localStorage.getItem(ACHIEVEMENT_PROGRESS_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) as unknown : null;
    const savedRecord = saved && typeof saved === 'object'
      ? saved as Record<string, unknown>
      : null;
    if (savedRecord && Object.prototype.hasOwnProperty.call(savedRecord, 'eligibleWins')) {
      return normalizeAchievementProgress(saved);
    }

    // Migrate legacy win totals once. Existing Developer Tools sessions may have
    // polluted general statistics with test battles, so never import that total
    // when persistent developer mode is active.
    const legacyWins = loadStellaModeProgress().developerModeEnabled === true
      ? 0
      : loadOverallStats().wins;
    const migrated = normalizeAchievementProgress({
      ...(savedRecord ?? INITIAL_ACHIEVEMENT_PROGRESS),
      eligibleWins: legacyWins,
    });
    try {
      localStorage.setItem(ACHIEVEMENT_PROGRESS_STORAGE_KEY, JSON.stringify(migrated));
    } catch {
      // Keep the in-memory migration usable even when persistence is blocked.
    }
    return migrated;
  } catch {
    return normalizeAchievementProgress(INITIAL_ACHIEVEMENT_PROGRESS);
  }
}

export function persistAchievementProgress(value: AchievementProgress): AchievementProgress | null {
  const normalized = normalizeAchievementProgress(value);
  try {
    localStorage.setItem(ACHIEVEMENT_PROGRESS_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    return null;
  }
}

export function recordAchievementBattleProgress(sample: AchievementBattleSample): AchievementProgress | null {
  return persistAchievementProgress(recordAchievementBattle(loadAchievementProgress(), sample));
}

export function syncAchievementCompletion(ids: readonly string[]): AchievementProgress | null {
  return persistAchievementProgress(completeAchievementIds(loadAchievementProgress(), ids));
}

export function markAllAchievementsCompleteForDeveloper(): AchievementProgress | null {
  return persistAchievementProgress(markAllAchievementsForDeveloper(loadAchievementProgress()));
}

export function resetAchievementProgressForDeveloper(): AchievementProgress | null {
  const currentAbilities = loadAbilityProgress();
  const nextAbilities = normalizeAbilityProgress({
    levels: { ...currentAbilities.levels, ASTRAL_DOMINION: 0 },
    shards: { ...currentAbilities.shards, ASTRAL_DOMINION: 0 },
  });
  const nextAchievements = normalizeAchievementProgress(INITIAL_ACHIEVEMENT_PROGRESS);
  const persisted = persistStorageTransaction([
    { key: ACHIEVEMENT_PROGRESS_STORAGE_KEY, value: JSON.stringify(nextAchievements) },
    { key: ABILITY_PROGRESS_KEY, value: JSON.stringify(nextAbilities) },
  ]);
  return persisted ? nextAchievements : null;
}

export function unlockAchievementUltimateAuthority(): { progress: AbilityProgress; persisted: boolean } {
  const achievementProgress = loadAchievementProgress();
  const allComplete = achievementProgress.completedIds.length >= ACHIEVEMENT_DEFINITIONS.length;
  const current = loadAbilityProgress();
  if (!allComplete || current.levels.ASTRAL_DOMINION >= MAX_ABILITY_LEVEL) {
    return { progress: current, persisted: true };
  }
  const next = normalizeAbilityProgress({
    levels: { ...current.levels, ASTRAL_DOMINION: MAX_ABILITY_LEVEL },
    shards: { ...current.shards },
  });
  const persisted = persistStorageTransaction([
    { key: ABILITY_PROGRESS_KEY, value: JSON.stringify(next) },
  ]);
  return { progress: persisted ? next : current, persisted };
}

export interface AchievementRewardClaimResult {
  progress: AchievementProgress;
  persisted: boolean;
  claimed: boolean;
}

export function claimAchievementReward(id: string): AchievementRewardClaimResult {
  const current = loadAchievementProgress();
  const definition = ACHIEVEMENT_DEFINITIONS.find(item => item.id === id);
  if (!definition || !current.completedIds.includes(id) || current.claimedRewardIds.includes(id)) {
    return { progress: current, persisted: true, claimed: false };
  }

  const nextAchievement = normalizeAchievementProgress({
    ...current,
    claimedRewardIds: [...current.claimedRewardIds, id],
  });
  const reward = definition.reward;
  let rewardWrite: StorageWrite | null = null;

  switch (reward.kind) {
    case 'STAT_POINTS':
      rewardWrite = { key: STAT_POINTS_KEY, value: String(loadBaseStatPoints() + reward.amount) };
      break;
    case 'RECRUITMENT_TICKETS': {
      const next = normalizeRecruitmentProgress({
        ...loadRecruitmentProgress(),
        tickets: loadRecruitmentProgress().tickets + reward.amount,
      });
      rewardWrite = { key: RECRUITMENT_KEY, value: JSON.stringify(next) };
      break;
    }
    case 'IMPRINT_TICKETS':
    case 'CORE_FRAGMENTS': {
      const raid = loadRaidRewardProgress();
      const next = normalizeRaidRewardProgress({
        ...raid,
        ...(reward.kind === 'IMPRINT_TICKETS' ? { imprintTickets: raid.imprintTickets + reward.amount } : {}),
        ...(reward.kind === 'CORE_FRAGMENTS' ? { coreFragments: raid.coreFragments + reward.amount } : {}),
      });
      rewardWrite = { key: RAID_REWARD_PROGRESS_KEY, value: JSON.stringify(next) };
      break;
    }
    case 'SKILL_SHARDS': {
      const skill = loadSkillProgress();
      const next = normalizeSkillProgress({ ...skill, shards: skill.shards + reward.amount });
      rewardWrite = { key: SKILL_PROGRESS_KEY, value: JSON.stringify(next) };
      break;
    }
  }

  const writes: StorageWrite[] = [
    { key: ACHIEVEMENT_PROGRESS_STORAGE_KEY, value: JSON.stringify(nextAchievement) },
  ];
  if (rewardWrite) writes.push(rewardWrite);
  const persisted = persistStorageTransaction(writes);
  return {
    progress: persisted ? nextAchievement : current,
    persisted,
    claimed: persisted,
  };
}
