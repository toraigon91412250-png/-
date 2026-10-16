import type {
  AbilityId,
  AbilityProgress,
  BattleChallengeLevel,
  CpuDifficulty,
  ImprintId,
  ImprintProgress,
  IrenaSkillProgress,
  OverallStats,
  PlayerBattleAction,
  RaidRewardProgress,
  RecruitmentProgress,
} from '../types/game';
import { ABILITY_DEFINITIONS } from '../data/abilities';
import { IMPRINT_DEFINITIONS } from '../data/imprints';
import { RECRUITMENT_REWARDS } from '../data/recruitment';

export type AchievementCategory = 'BATTLE' | 'KAISER' | 'MASTERY' | 'COLLECTION';
export type AchievementRewardKind = 'STAT_POINTS' | 'RECRUITMENT_TICKETS' | 'IMPRINT_TICKETS' | 'SKILL_SHARDS' | 'CORE_FRAGMENTS';

export interface AchievementReward {
  kind: AchievementRewardKind;
  amount: number;
}

export type AchievementMetric =
  | 'WINS' | 'WIN_STREAK' | 'QUICK_WINS' | 'LOW_HP_WINS'
  | 'NO_ABILITY_WINS' | 'NO_SPECIAL_ULTIMATE_WINS' | 'EXPERT_WINS' | 'NO_IMPRINT_WINS'
  | 'KAISER_10' | 'KAISER_30' | 'KAISER_50' | 'KAISER_70' | 'KAISER_90' | 'KAISER_100'
  | 'EX_KAISER' | 'FINAL_BATTLE'
  | 'ABILITIES_3' | 'ABILITIES_ALL' | 'ABILITY_MAXED_1' | 'ABILITIES_MAXED_ALL'
  | 'TALENT_20' | 'SKILLS_MAXED'
  | 'PULLS_10' | 'PULLS_50' | 'COLLECTION_ALL'
  | 'IMPRINTS_5' | 'IMPRINTS_ALL' | 'IMPRINTS_EQUIPPED_3'
  | 'RAID_WINS_10' | 'LAST_STAND_WIN' | 'STARFALL_WIN'
  | 'SPECIALS_25' | 'ULTIMATES_10' | 'IMPRINTS_USED_ALL';

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  metric: AchievementMetric;
  target: number;
  reward: AchievementReward;
  secret?: boolean;
}

export interface AchievementProgress {
  wonKaiserLevels: BattleChallengeLevel[];
  /** Wins from eligible normal gameplay only; Developer Tools test battles are excluded. */
  eligibleWins: number;
  currentWinStreak: number;
  bestWinStreak: number;
  quickWins: number;
  lowHpWins: number;
  noAbilityWins: number;
  noSpecialUltimateWins: number;
  expertWins: number;
  noImprintWins: number;
  lastStandWins: number;
  starfallWins: number;
  exKaiserCleared: boolean;
  actionCounts: Partial<Record<PlayerBattleAction, number>>;
  usedImprintIds: ImprintId[];
  completedIds: string[];
  claimedRewardIds: string[];
}

export interface AchievementBattleSample {
  playerWon: boolean;
  kaiserLevel: BattleChallengeLevel;
  challengeMode: 'NORMAL' | 'EX';
  turnNumber: number;
  playerHp: number;
  playerMaxHp: number;
  actionsTaken: readonly PlayerBattleAction[];
  abilities: readonly { id: AbilityId; level: number }[];
  equippedImprints: readonly ImprintId[];
  usedImprints: readonly ImprintId[];
  logLines: readonly string[];
  difficulty: CpuDifficulty;
}

export interface AchievementSnapshot {
  overallStats: OverallStats;
  abilityProgress: AbilityProgress;
  skillProgress: IrenaSkillProgress;
  imprintProgress: ImprintProgress;
  recruitmentProgress: RecruitmentProgress;
  raidRewardProgress: RaidRewardProgress;
  kaiserUnlockedLevel: number;
  kaiser100RewardClaimed: boolean;
  exKaiserDefeated: boolean;
  finalBattleCleared: boolean;
  developerModeEnabled: boolean;
  talentLevel: number;
}

export interface AchievementBoardItem extends AchievementDefinition {
  current: number;
  complete: boolean;
  claimed: boolean;
  progressLabel: string;
  rewardLabel: string;
}

const REGULAR_ABILITY_IDS: readonly AbilityId[] = ABILITY_DEFINITIONS
  .map(item => item.id)
  .filter(id => id !== 'ASTRAL_DOMINION');

export const ACHIEVEMENT_PROGRESS_STORAGE_KEY = 'duel_arena_achievement_progress';

export const INITIAL_ACHIEVEMENT_PROGRESS: AchievementProgress = {
  wonKaiserLevels: [],
  eligibleWins: 0,
  currentWinStreak: 0,
  bestWinStreak: 0,
  quickWins: 0,
  lowHpWins: 0,
  noAbilityWins: 0,
  noSpecialUltimateWins: 0,
  expertWins: 0,
  noImprintWins: 0,
  lastStandWins: 0,
  starfallWins: 0,
  exKaiserCleared: false,
  actionCounts: {},
  usedImprintIds: [],
  completedIds: [],
  claimedRewardIds: [],
};

const A = (
  id: string,
  category: AchievementCategory,
  name: string,
  description: string,
  metric: AchievementMetric,
  target: number,
  rewardKind: AchievementRewardKind,
  amount: number,
  secret = false,
): AchievementDefinition => ({
  id, category, name, description, metric, target,
  reward: { kind: rewardKind, amount },
  ...(secret ? { secret: true } : {}),
});

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  A('first-victory', 'BATTLE', '初勝利', 'カイザーとの戦いで初めて勝利する。', 'WINS', 1, 'STAT_POINTS', 5),
  A('ten-victories', 'BATTLE', '常勝への一歩', '通算10勝を達成する。', 'WINS', 10, 'STAT_POINTS', 10),
  A('fifty-victories', 'BATTLE', '闘技場の常連', '通算50勝を達成する。', 'WINS', 50, 'STAT_POINTS', 25),
  A('five-win-streak', 'BATTLE', '連勝街道', '5連勝を達成する。', 'WIN_STREAK', 5, 'RECRUITMENT_TICKETS', 3),
  A('quick-victory', 'BATTLE', '瞬撃', '5ターン以内に勝利する。', 'QUICK_WINS', 1, 'STAT_POINTS', 15),
  A('last-breath', 'BATTLE', 'あと一歩の奇跡', 'HP10%以下の状態から勝利する。', 'LOW_HP_WINS', 1, 'STAT_POINTS', 20),
  A('empty-loadout', 'BATTLE', '己の腕一本', '権能を装備せずに勝利する。', 'NO_ABILITY_WINS', 1, 'STAT_POINTS', 20),
  A('basic-technique', 'BATTLE', '基本を極めし者', '特殊技と必殺技を一度も使わずに勝利する。', 'NO_SPECIAL_ULTIMATE_WINS', 1, 'STAT_POINTS', 15),
  A('expert-win', 'BATTLE', '読み合いの極致', 'CPU難易度「EXPERT」で勝利する。', 'EXPERT_WINS', 1, 'RECRUITMENT_TICKETS', 3),
  A('unadorned-win', 'BATTLE', '飾らぬ勝利', '刻印を装備せずに勝利する。', 'NO_IMPRINT_WINS', 1, 'STAT_POINTS', 15),

  A('kaiser-10', 'KAISER', '最初の壁', 'カイザーLv.10を撃破する。', 'KAISER_10', 1, 'STAT_POINTS', 5),
  A('kaiser-30', 'KAISER', '強敵撃破', 'カイザーLv.30を撃破する。', 'KAISER_30', 1, 'STAT_POINTS', 10),
  A('kaiser-50', 'KAISER', '折り返し地点', 'カイザーLv.50を撃破する。', 'KAISER_50', 1, 'STAT_POINTS', 15),
  A('kaiser-70', 'KAISER', '極限への挑戦', 'カイザーLv.70を撃破する。', 'KAISER_70', 1, 'RECRUITMENT_TICKETS', 4),
  A('kaiser-90', 'KAISER', '王座目前', 'カイザーLv.90を撃破する。', 'KAISER_90', 1, 'STAT_POINTS', 25),
  A('kaiser-100', 'KAISER', '百戦錬磨', '通常カイザーLv.100を撃破する。', 'KAISER_100', 1, 'STAT_POINTS', 40),
  A('ex-kaiser', 'KAISER', '終局を越えて', 'EXカイザーを撃破する。', 'EX_KAISER', 1, 'IMPRINT_TICKETS', 5),
  A('stella-final', 'KAISER', '星を越えた決戦', 'ステラで最終決戦をクリアする。', 'FINAL_BATTLE', 1, 'STAT_POINTS', 40),

  A('three-authorities', 'MASTERY', '権能の収集者', '通常の権能を3種類以上解放する。', 'ABILITIES_3', 3, 'SKILL_SHARDS', 50),
  A('all-authorities', 'MASTERY', '五権能の使い手', '通常の権能5種類をすべて解放する。', 'ABILITIES_ALL', 5, 'STAT_POINTS', 25),
  A('first-max-authority', 'MASTERY', '極限強化', '通常の権能を1種類Lv.5まで強化する。', 'ABILITY_MAXED_1', 1, 'SKILL_SHARDS', 100),
  A('all-max-authorities', 'MASTERY', '権能の完全掌握', '通常の権能5種類をすべてLv.5にする。', 'ABILITIES_MAXED_ALL', 5, 'STAT_POINTS', 40),
  A('talent-master', 'MASTERY', '堕天の極致', 'いれーなの才能レベルを20にする。', 'TALENT_20', 20, 'STAT_POINTS', 25),
  A('skill-master', 'MASTERY', '技術の到達点', '羽弾と破壊の権能を両方Lv.10にする。', 'SKILLS_MAXED', 1, 'SKILL_SHARDS', 200),

  A('first-ten-pulls', 'COLLECTION', '召喚の幕開け', '召喚を通算10回行う。', 'PULLS_10', 10, 'RECRUITMENT_TICKETS', 3),
  A('fifty-pulls', 'COLLECTION', '召喚研究家', '召喚を通算50回行う。', 'PULLS_50', 50, 'RECRUITMENT_TICKETS', 5),
  A('complete-recruitment', 'COLLECTION', '黒翼の収集家', '召喚報酬をすべてコレクションする。', 'COLLECTION_ALL', RECRUITMENT_REWARDS.length, 'RECRUITMENT_TICKETS', 10),
  A('five-imprints', 'COLLECTION', '刻印の蒐集者', '刻印を5種類以上集める。', 'IMPRINTS_5', 5, 'IMPRINT_TICKETS', 3),
  A('all-imprints', 'COLLECTION', '十刻印の覇者', '10種類すべての刻印を集める。', 'IMPRINTS_ALL', IMPRINT_DEFINITIONS.length, 'IMPRINT_TICKETS', 10),
  A('full-imprint-loadout', 'COLLECTION', '三重刻印', '刻印スロットを3つすべて埋める。', 'IMPRINTS_EQUIPPED_3', 3, 'STAT_POINTS', 15),
  A('raid-veteran', 'COLLECTION', '深淵の踏破者', '深淵レイドで10回勝利する。', 'RAID_WINS_10', 10, 'CORE_FRAGMENTS', 10),

  A('last-stand', 'BATTLE', '不屈の証', '刻印「不屈の印」の致死回避を発動させ、その戦闘に勝利する。', 'LAST_STAND_WIN', 1, 'STAT_POINTS', 30, true),
  A('starfall', 'BATTLE', '星墜の一撃', '刻印「星墜の印」を発動させた必殺技で勝利する。', 'STARFALL_WIN', 1, 'STAT_POINTS', 25, true),
  A('special-veteran', 'BATTLE', '羽弾の熟練者', '特殊技を通算25回使用する。', 'SPECIALS_25', 25, 'SKILL_SHARDS', 100),
  A('ultimate-veteran', 'BATTLE', '必殺の求道者', '必殺技を通算10回使用する。', 'ULTIMATES_10', 10, 'STAT_POINTS', 20),
  A('imprint-completionist', 'COLLECTION', '刻印を使いこなす者', '10種類すべての刻印を戦闘で実際に発動する。', 'IMPRINTS_USED_ALL', IMPRINT_DEFINITIONS.length, 'IMPRINT_TICKETS', 10, true),
];

export function normalizeAchievementProgress(value: unknown): AchievementProgress {
  const input = value && typeof value === 'object' ? value as Partial<AchievementProgress> : {};
  const numeric = (x: unknown) => Number.isFinite(Number(x)) ? Math.max(0, Math.floor(Number(x))) : 0;
  const validLevels = Array.isArray(input.wonKaiserLevels)
    ? Array.from(new Set(input.wonKaiserLevels.filter((level): level is BattleChallengeLevel =>
      [10, 20, 30, 40, 50, 60, 70, 80, 90, 100].includes(Number(level)),
    )))
    : [];
  const validImprints = Array.isArray(input.usedImprintIds)
    ? Array.from(new Set(input.usedImprintIds.filter(id => IMPRINT_DEFINITIONS.some(item => item.id === id))))
    : [];
  const actions = input.actionCounts && typeof input.actionCounts === 'object' ? input.actionCounts : {};
  const actionCounts: Partial<Record<PlayerBattleAction, number>> = {};
  for (const action of ['ATTACK', 'EVADE', 'BUFF', 'SPECIAL', 'ULTIMATE', 'YIN_YANG', 'COSTLY_SHOT'] as const) {
    actionCounts[action] = numeric(actions[action]);
  }
  const safeIds = (ids: unknown): string[] => Array.isArray(ids)
    ? Array.from(new Set(ids.filter((id): id is string => typeof id === 'string' && ACHIEVEMENT_DEFINITIONS.some(def => def.id === id))))
    : [];
  return {
    wonKaiserLevels: validLevels,
    eligibleWins: numeric(input.eligibleWins),
    currentWinStreak: numeric(input.currentWinStreak),
    bestWinStreak: numeric(input.bestWinStreak),
    quickWins: numeric(input.quickWins),
    lowHpWins: numeric(input.lowHpWins),
    noAbilityWins: numeric(input.noAbilityWins),
    noSpecialUltimateWins: numeric(input.noSpecialUltimateWins),
    expertWins: numeric(input.expertWins),
    noImprintWins: numeric(input.noImprintWins),
    lastStandWins: numeric(input.lastStandWins),
    starfallWins: numeric(input.starfallWins),
    exKaiserCleared: input.exKaiserCleared === true,
    actionCounts,
    usedImprintIds: validImprints,
    completedIds: safeIds(input.completedIds),
    claimedRewardIds: safeIds(input.claimedRewardIds),
  };
}

export function recordAchievementBattle(currentValue: unknown, sample: AchievementBattleSample): AchievementProgress {
  const current = normalizeAchievementProgress(currentValue);
  const next: AchievementProgress = {
    ...current,
    wonKaiserLevels: [...current.wonKaiserLevels],
    usedImprintIds: [...current.usedImprintIds],
    actionCounts: { ...current.actionCounts },
  };

  for (const action of sample.actionsTaken) {
    next.actionCounts[action] = (next.actionCounts[action] ?? 0) + 1;
  }
  for (const id of sample.usedImprints) {
    if (!next.usedImprintIds.includes(id)) next.usedImprintIds.push(id);
  }
  for (const log of sample.logLines) {
    for (const imprint of IMPRINT_DEFINITIONS) {
      if (log.includes('【' + imprint.name + '】') && !next.usedImprintIds.includes(imprint.id)) {
        next.usedImprintIds.push(imprint.id);
      }
    }
  }
  if (sample.actionsTaken.includes('YIN_YANG') && !next.usedImprintIds.includes('YIN_YANG')) next.usedImprintIds.push('YIN_YANG');
  if (sample.actionsTaken.includes('COSTLY_SHOT') && !next.usedImprintIds.includes('COSTLY_SHOT')) next.usedImprintIds.push('COSTLY_SHOT');

  if (sample.playerWon) {
    next.eligibleWins += 1;
    next.currentWinStreak += 1;
    next.bestWinStreak = Math.max(next.bestWinStreak, next.currentWinStreak);
    if (sample.turnNumber <= 5) next.quickWins += 1;
    if (sample.playerMaxHp > 0 && sample.playerHp > 0 && sample.playerHp / sample.playerMaxHp <= 0.1) next.lowHpWins += 1;
    if (sample.abilities.every(ability => ability.level <= 0)) next.noAbilityWins += 1;
    if (!sample.actionsTaken.includes('SPECIAL') && !sample.actionsTaken.includes('ULTIMATE')) next.noSpecialUltimateWins += 1;
    if (sample.difficulty === 'EXPERT') next.expertWins += 1;
    if (sample.equippedImprints.length === 0) next.noImprintWins += 1;
    if (sample.usedImprints.includes('LAST_STAND')) next.lastStandWins += 1;
    if (sample.usedImprints.includes('STARFALL')) next.starfallWins += 1;
    if (sample.challengeMode === 'EX' && sample.kaiserLevel === 100) next.exKaiserCleared = true;
    else if (!next.wonKaiserLevels.includes(sample.kaiserLevel)) next.wonKaiserLevels.push(sample.kaiserLevel);
  } else {
    next.currentWinStreak = 0;
  }
  return normalizeAchievementProgress(next);
}

export function completeAchievementIds(currentValue: unknown, ids: readonly string[]): AchievementProgress {
  const current = normalizeAchievementProgress(currentValue);
  const completed = new Set(current.completedIds);
  for (const id of ids) {
    if (ACHIEVEMENT_DEFINITIONS.some(definition => definition.id === id)) completed.add(id);
  }
  return normalizeAchievementProgress({ ...current, completedIds: [...completed] });
}

export function markAllAchievementsForDeveloper(currentValue: unknown): AchievementProgress {
  return completeAchievementIds(currentValue, ACHIEVEMENT_DEFINITIONS.map(definition => definition.id));
}

export interface AchievementBoardContext {
  progress: AchievementProgress;
  snapshot: AchievementSnapshot;
}

export function getAchievementMetricValue(metric: AchievementMetric, context: AchievementBoardContext): number {
  const { progress, snapshot } = context;
  const regularLevels = REGULAR_ABILITY_IDS.map(id => snapshot.abilityProgress.levels[id] ?? 0);
  const normalLevelClear = (level: BattleChallengeLevel) => {
    if (progress.wonKaiserLevels.includes(level)) return true;
    if (snapshot.developerModeEnabled) return false;
    if (level === 100) return snapshot.kaiser100RewardClaimed;
    return snapshot.kaiserUnlockedLevel >= level + 10;
  };
  switch (metric) {
    case 'WINS': return progress.eligibleWins;
    case 'WIN_STREAK': return progress.bestWinStreak;
    case 'QUICK_WINS': return progress.quickWins;
    case 'LOW_HP_WINS': return progress.lowHpWins;
    case 'NO_ABILITY_WINS': return progress.noAbilityWins;
    case 'NO_SPECIAL_ULTIMATE_WINS': return progress.noSpecialUltimateWins;
    case 'EXPERT_WINS': return progress.expertWins;
    case 'NO_IMPRINT_WINS': return progress.noImprintWins;
    case 'KAISER_10': return normalLevelClear(10) ? 1 : 0;
    case 'KAISER_30': return normalLevelClear(30) ? 1 : 0;
    case 'KAISER_50': return normalLevelClear(50) ? 1 : 0;
    case 'KAISER_70': return normalLevelClear(70) ? 1 : 0;
    case 'KAISER_90': return normalLevelClear(90) ? 1 : 0;
    case 'KAISER_100': return normalLevelClear(100) ? 1 : 0;
    case 'EX_KAISER': return progress.exKaiserCleared || (snapshot.exKaiserDefeated && !snapshot.developerModeEnabled) ? 1 : 0;
    case 'FINAL_BATTLE': return snapshot.finalBattleCleared ? 1 : 0;
    case 'ABILITIES_3':
    case 'ABILITIES_ALL': return regularLevels.filter(level => level > 0).length;
    case 'ABILITY_MAXED_1': return regularLevels.some(level => level >= 5) ? 1 : 0;
    case 'ABILITIES_MAXED_ALL': return regularLevels.filter(level => level >= 5).length;
    case 'TALENT_20': return snapshot.talentLevel;
    case 'SKILLS_MAXED': return snapshot.skillProgress.featherLevel >= 10 && snapshot.skillProgress.ruinLevel >= 10 ? 1 : 0;
    case 'PULLS_10':
    case 'PULLS_50': return snapshot.recruitmentProgress.totalPulls;
    case 'COLLECTION_ALL': return snapshot.recruitmentProgress.collectedIds.filter(id => RECRUITMENT_REWARDS.some(reward => reward.id === id)).length;
    case 'IMPRINTS_5':
    case 'IMPRINTS_ALL': return snapshot.imprintProgress.unlockedIds.length;
    case 'IMPRINTS_EQUIPPED_3': return snapshot.imprintProgress.equippedIds.length;
    case 'RAID_WINS_10': return snapshot.raidRewardProgress.claimedVictoryRunIds.length;
    case 'LAST_STAND_WIN': return progress.lastStandWins;
    case 'STARFALL_WIN': return progress.starfallWins;
    case 'SPECIALS_25': return progress.actionCounts.SPECIAL ?? 0;
    case 'ULTIMATES_10': return progress.actionCounts.ULTIMATE ?? 0;
    case 'IMPRINTS_USED_ALL': return progress.usedImprintIds.length;
  }
}

export function buildAchievementBoard(context: AchievementBoardContext): AchievementBoardItem[] {
  const claimedIds = new Set(context.progress.claimedRewardIds);
  const completedIds = new Set(context.progress.completedIds);
  return ACHIEVEMENT_DEFINITIONS.map(definition => {
    const current = Math.max(0, getAchievementMetricValue(definition.metric, context));
    const complete = completedIds.has(definition.id) || current >= definition.target;
    const normalizedCurrent = complete ? Math.max(definition.target, current) : current;
    return {
      ...definition,
      current: normalizedCurrent,
      complete,
      claimed: claimedIds.has(definition.id),
      progressLabel: `${Math.min(normalizedCurrent, definition.target).toLocaleString('ja-JP')} / ${definition.target.toLocaleString('ja-JP')}`,
      rewardLabel: formatAchievementReward(definition.reward),
    };
  });
}

export function formatAchievementReward(reward: AchievementReward): string {
  switch (reward.kind) {
    case 'STAT_POINTS': return `ステータスポイント +${reward.amount}P`;
    case 'RECRUITMENT_TICKETS': return `召喚チケット +${reward.amount}枚`;
    case 'IMPRINT_TICKETS': return `刻印チケット +${reward.amount}枚`;
    case 'SKILL_SHARDS': return `技の欠片 +${reward.amount}個`;
    case 'CORE_FRAGMENTS': return `深淵核片 +${reward.amount}個`;
  }
}

export function getRegularAbilityIds(): readonly AbilityId[] {
  return REGULAR_ABILITY_IDS;
}
