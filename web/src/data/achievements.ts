export const ACHIEVEMENT_PROGRESS_KEY = 'duel_arena_achievement_progress';

export type AchievementCategory = '戦闘記録' | '高難度' | '育成・収集' | '深淵の記録';

export type AchievementMetric =
  | 'wins'
  | 'battles'
  | 'level30'
  | 'level50'
  | 'level70'
  | 'level90'
  | 'normalLv100Clear'
  | 'stellaUnlocked'
  | 'exKaiserDefeated'
  | 'exKaiserWins'
  | 'finalBattleCleared'
  | 'expertWins'
  | 'noAbilityWins'
  | 'noAbilityLv100Wins'
  | 'noAbilityExWins'
  | 'lowHpWins'
  | 'stellaWins'
  | 'longestWinStreak'
  | 'longestHighLevelWinStreak'
  | 'noImprintWins'
  | 'recruitmentPulls'
  | 'uniqueAbilities'
  | 'maxedAbilities'
  | 'allRecruitmentRewards'
  | 'specializedSkills'
  | 'maxSkills'
  | 'allImprints'
  | 'equippedImprints'
  | 'raidWins';

export interface AchievementReward {
  statPoints?: number;
  recruitmentTickets?: number;
  imprintTickets?: number;
  skillShards?: number;
}

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  metric: AchievementMetric;
  target: number;
  reward: AchievementReward;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  { id: 'first-victory', title: '初陣', description: '通常バトルで初勝利する。', category: '戦闘記録', metric: 'wins', target: 1, reward: { statPoints: 10, recruitmentTickets: 1 } },
  { id: 'ten-victories', title: '戦い慣れた者', description: '通常バトルで10勝する。', category: '戦闘記録', metric: 'wins', target: 10, reward: { statPoints: 15, recruitmentTickets: 2 } },
  { id: 'thirty-victories', title: '闘技場の常連', description: '通常バトルで30勝する。', category: '戦闘記録', metric: 'wins', target: 30, reward: { statPoints: 20, recruitmentTickets: 3 } },
  { id: 'seventy-five-victories', title: '百戦錬磨への道', description: '通常バトルで75勝する。', category: '戦闘記録', metric: 'wins', target: 75, reward: { statPoints: 30, recruitmentTickets: 4 } },
  { id: 'one-hundred-fifty-victories', title: '不敗の伝説', description: '通常バトルで150勝する。', category: '戦闘記録', metric: 'wins', target: 150, reward: { statPoints: 45, recruitmentTickets: 6 } },
  { id: 'fifty-battles', title: '積み重ねた経験', description: '通常バトルを合計50戦行う。', category: '戦闘記録', metric: 'battles', target: 50, reward: { statPoints: 10, skillShards: 40 } },
  { id: 'one-hundred-battles', title: '闘技場の住人', description: '通常バトルを合計100戦行う。', category: '戦闘記録', metric: 'battles', target: 100, reward: { statPoints: 20, skillShards: 80 } },

  { id: 'kaiser-level-30', title: '試練の入口', description: 'カイザーLv.30を撃破する。', category: '高難度', metric: 'level30', target: 1, reward: { statPoints: 10, recruitmentTickets: 1 } },
  { id: 'kaiser-level-50', title: '半ばの覇者', description: 'カイザーLv.50を撃破する。', category: '高難度', metric: 'level50', target: 1, reward: { statPoints: 15, recruitmentTickets: 2 } },
  { id: 'kaiser-level-70', title: '極限への歩み', description: 'カイザーLv.70を撃破する。', category: '高難度', metric: 'level70', target: 1, reward: { statPoints: 20, recruitmentTickets: 2 } },
  { id: 'kaiser-level-90', title: '終局の門番', description: 'カイザーLv.90を撃破する。', category: '高難度', metric: 'level90', target: 1, reward: { statPoints: 25, recruitmentTickets: 3 } },
  { id: 'normal-lv100', title: '百の壁を越えて', description: '通常カイザーLv.100を撃破する。', category: '高難度', metric: 'normalLv100Clear', target: 1, reward: { statPoints: 25, recruitmentTickets: 3 } },
  { id: 'stella-awakened', title: '星の目覚め', description: 'ワープの先でステラモードを解放する。', category: '高難度', metric: 'stellaUnlocked', target: 1, reward: { statPoints: 10, recruitmentTickets: 2 } },
  { id: 'ex-kaiser-first', title: '終局への挑戦', description: 'EXカイザーを初めて撃破する。', category: '高難度', metric: 'exKaiserDefeated', target: 1, reward: { statPoints: 20, recruitmentTickets: 3 } },
  { id: 'ex-kaiser-three', title: '魔帝討伐隊', description: 'EXカイザーに合計3回勝利する。', category: '高難度', metric: 'exKaiserWins', target: 3, reward: { statPoints: 25, recruitmentTickets: 4 } },
  { id: 'stella-final-duel', title: '星を超えた決戦', description: 'ステラ最終決戦をクリアする。', category: '高難度', metric: 'finalBattleCleared', target: 1, reward: { statPoints: 35, imprintTickets: 5 } },

  { id: 'expert-first', title: '読み合いの始まり', description: 'EXPERT難易度で1勝する。', category: '深淵の記録', metric: 'expertWins', target: 1, reward: { statPoints: 5, recruitmentTickets: 1 } },
  { id: 'expert-ten', title: '先読みの達人', description: 'EXPERT難易度で10勝する。', category: '深淵の記録', metric: 'expertWins', target: 10, reward: { statPoints: 20, recruitmentTickets: 3 } },
  { id: 'lv100-no-abilities', title: '権能なき挑戦者', description: '権能を一つも装備せず、通常カイザーLv.100に勝利する。', category: '深淵の記録', metric: 'noAbilityLv100Wins', target: 1, reward: { statPoints: 25, recruitmentTickets: 4 } },
  { id: 'ex-no-abilities', title: '無装の魔帝狩り', description: '権能を一つも装備せず、EXカイザーに勝利する。', category: '深淵の記録', metric: 'noAbilityExWins', target: 1, reward: { statPoints: 35, recruitmentTickets: 5 } },
  { id: 'last-breath', title: '紙一重の勝利', description: '残りHPが最大HPの10%以下の状態で通常バトルに勝利する。', category: '深淵の記録', metric: 'lowHpWins', target: 1, reward: { statPoints: 10, skillShards: 60 } },
  { id: 'stella-veteran', title: '星翼の戦士', description: 'ステラを操作して通常バトルに10回勝利する。', category: '深淵の記録', metric: 'stellaWins', target: 10, reward: { statPoints: 15, recruitmentTickets: 2 } },
  { id: 'ten-win-streak', title: '連勝の軌跡', description: '通常バトルで10連勝する。', category: '深淵の記録', metric: 'longestWinStreak', target: 10, reward: { statPoints: 20, recruitmentTickets: 3 } },
  { id: 'high-level-streak', title: '強敵連破', description: 'カイザーLv.70以上のバトルで3連勝する。', category: '深淵の記録', metric: 'longestHighLevelWinStreak', target: 3, reward: { statPoints: 20, recruitmentTickets: 3 } },
  { id: 'no-imprint-ten', title: '刻印に頼らぬ者', description: '刻印を一つも装備せず、通常バトルで10勝する。', category: '深淵の記録', metric: 'noImprintWins', target: 10, reward: { statPoints: 15, skillShards: 100 } },

  { id: 'ten-summons', title: '召喚の幕開け', description: '召喚を合計10回行う。', category: '育成・収集', metric: 'recruitmentPulls', target: 10, reward: { statPoints: 5, recruitmentTickets: 1 } },
  { id: 'fifty-summons', title: '召喚の探究者', description: '召喚を合計50回行う。', category: '育成・収集', metric: 'recruitmentPulls', target: 50, reward: { statPoints: 15, recruitmentTickets: 2 } },
  { id: 'one-hundred-summons', title: '召喚の極み', description: '召喚を合計100回行う。', category: '育成・収集', metric: 'recruitmentPulls', target: 100, reward: { statPoints: 25, recruitmentTickets: 3 } },
  { id: 'all-abilities', title: '五つの権能', description: '通常権能5種をすべて解放する。', category: '育成・収集', metric: 'uniqueAbilities', target: 5, reward: { statPoints: 10, skillShards: 50 } },
  { id: 'maxed-abilities', title: '権能の極致', description: '通常権能5種をすべてLv.5にする。', category: '育成・収集', metric: 'maxedAbilities', target: 5, reward: { statPoints: 20, skillShards: 100 } },
  { id: 'all-recruitment-rewards', title: '召喚記録の完成', description: '召喚アルバムの報酬をすべて収集する。', category: '育成・収集', metric: 'allRecruitmentRewards', target: 11, reward: { statPoints: 25, recruitmentTickets: 5 } },
  { id: 'both-specializations', title: '二系統の熟練者', description: '羽弾と必殺技の両方で専門ルートを選ぶ。', category: '育成・収集', metric: 'specializedSkills', target: 2, reward: { statPoints: 10, skillShards: 50 } },
  { id: 'maxed-skills', title: '技術の完成形', description: '羽弾と必殺技を両方Lv.10にする。', category: '育成・収集', metric: 'maxSkills', target: 2, reward: { statPoints: 20, skillShards: 100 } },
  { id: 'all-imprints', title: '十刻印の収集家', description: '登録済みの刻印10種をすべて解放する。', category: '育成・収集', metric: 'allImprints', target: 10, reward: { statPoints: 25, imprintTickets: 5 } },
  { id: 'three-imprints', title: '三重刻印', description: '刻印を3つ同時に装備する。', category: '育成・収集', metric: 'equippedImprints', target: 3, reward: { statPoints: 5, imprintTickets: 1 } },
  { id: 'raid-first', title: '深淵への初踏破', description: '深淵レイドで1回勝利する。', category: '育成・収集', metric: 'raidWins', target: 1, reward: { statPoints: 5, imprintTickets: 1 } },
  { id: 'raid-five', title: '深淵の探検家', description: '深淵レイドで5回勝利する。', category: '育成・収集', metric: 'raidWins', target: 5, reward: { statPoints: 15, imprintTickets: 2 } },
  { id: 'raid-ten', title: '深淵の覇者', description: '深淵レイドで10回勝利する。', category: '育成・収集', metric: 'raidWins', target: 10, reward: { statPoints: 25, imprintTickets: 4 } },
] as const;

export const CORE_ABILITY_IDS = ['ABYSS', 'FALLEN', 'BLACK_WING', 'FALLEN_KING', 'JUDGMENT'] as const;
