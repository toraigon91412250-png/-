export type AchievementMetric =
  | 'totalBattles'
  | 'wins'
  | 'kaiserLevel'
  | 'normalLevel100'
  | 'stellaModeUnlocked'
  | 'exKaiserDefeated'
  | 'finalBattleCleared'
  | 'recruitmentPulls'
  | 'recruitmentCollectionComplete'
  | 'abilityUnlockedCount'
  | 'abilityMaxedCount'
  | 'imprintsOwned'
  | 'allImprintsOwned'
  | 'imprintsEquipped'
  | 'raidVictories'
  | 'skillPathsSelected'
  | 'skillMaxedCount';

export type AchievementCategory =
  | '戦闘'
  | '進行'
  | '召喚'
  | '権能'
  | '刻印'
  | 'レイド'
  | '育成';

export interface AchievementReward {
  /** Permanent normal stat-allocation points. */
  statPoints?: number;
  recruitmentTickets?: number;
  imprintTickets?: number;
  skillShards?: number;
  /** Added to every currently registered ability, without unlocking level 0 abilities. */
  abilityShardsEach?: number;
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
  {
    id: 'first-battle',
    title: '初陣',
    description: 'カイザーとの戦闘を1回行う。',
    category: '戦闘',
    metric: 'totalBattles',
    target: 1,
    reward: { statPoints: 5, recruitmentTickets: 1 },
  },
  {
    id: 'first-victory',
    title: '勝利の一歩',
    description: 'カイザーに初勝利する。',
    category: '戦闘',
    metric: 'wins',
    target: 1,
    reward: { statPoints: 10, recruitmentTickets: 2 },
  },
  {
    id: 'ten-victories',
    title: '連戦の戦士',
    description: '通算10勝を達成する。',
    category: '戦闘',
    metric: 'wins',
    target: 10,
    reward: { statPoints: 25, recruitmentTickets: 5 },
  },
  {
    id: 'fifty-victories',
    title: '闘技場の覇者',
    description: '通算50勝を達成する。',
    category: '戦闘',
    metric: 'wins',
    target: 50,
    reward: { statPoints: 60, recruitmentTickets: 10 },
  },
  {
    id: 'hundred-battles',
    title: '百戦錬磨',
    description: '通算100戦を経験する。',
    category: '戦闘',
    metric: 'totalBattles',
    target: 100,
    reward: { statPoints: 50, imprintTickets: 5 },
  },
  {
    id: 'level-twenty',
    title: '壁を越える者',
    description: 'カイザーLv.20への挑戦を解放する。',
    category: '進行',
    metric: 'kaiserLevel',
    target: 20,
    reward: { statPoints: 20, recruitmentTickets: 5 },
  },
  {
    id: 'level-fifty',
    title: '半世紀の試練',
    description: 'カイザーLv.50への挑戦を解放する。',
    category: '進行',
    metric: 'kaiserLevel',
    target: 50,
    reward: { statPoints: 50, abilityShardsEach: 10 },
  },
  {
    id: 'level-eighty',
    title: '終局への登攀',
    description: 'カイザーLv.80への挑戦を解放する。',
    category: '進行',
    metric: 'kaiserLevel',
    target: 80,
    reward: { statPoints: 80, abilityShardsEach: 15 },
  },
  {
    id: 'normal-level-one-hundred',
    title: '限界の向こう側',
    description: '通常カイザーLv.100の初回撃破報酬を獲得する。',
    category: '進行',
    metric: 'normalLevel100',
    target: 1,
    reward: { statPoints: 150, recruitmentTickets: 10 },
  },
  {
    id: 'stella-awakened',
    title: '星の目覚め',
    description: 'ワープを完了し、ステラモードを解放する。',
    category: '進行',
    metric: 'stellaModeUnlocked',
    target: 1,
    reward: { statPoints: 100, imprintTickets: 5 },
  },
  {
    id: 'ex-kaiser-defeated',
    title: '終局の魔帝を超えて',
    description: 'EXカイザーを撃破する。',
    category: '進行',
    metric: 'exKaiserDefeated',
    target: 1,
    reward: { statPoints: 200, imprintTickets: 10 },
  },
  {
    id: 'stella-final-victory',
    title: '星を越える決戦',
    description: 'ステラ最終決戦のクリア記録を獲得する。',
    category: '進行',
    metric: 'finalBattleCleared',
    target: 1,
    reward: { statPoints: 300, recruitmentTickets: 15, abilityShardsEach: 10 },
  },
  {
    id: 'ten-recruitments',
    title: '召喚の入口',
    description: '召喚を累計10回行う。',
    category: '召喚',
    metric: 'recruitmentPulls',
    target: 10,
    reward: { statPoints: 15, recruitmentTickets: 5 },
  },
  {
    id: 'fifty-recruitments',
    title: '召喚の探究者',
    description: '召喚を累計50回行う。',
    category: '召喚',
    metric: 'recruitmentPulls',
    target: 50,
    reward: { statPoints: 50, recruitmentTickets: 10 },
  },
  {
    id: 'hundred-recruitments',
    title: '百召の記録',
    description: '召喚を累計100回行う。',
    category: '召喚',
    metric: 'recruitmentPulls',
    target: 100,
    reward: { statPoints: 100, recruitmentTickets: 20 },
  },
  {
    id: 'recruitment-collection-complete',
    title: '記録庫の完成',
    description: '現在登録されている召喚報酬をすべて収集する。',
    category: '召喚',
    metric: 'recruitmentCollectionComplete',
    target: 1,
    reward: { statPoints: 80, abilityShardsEach: 10 },
  },
  {
    id: 'first-ability',
    title: '権能の継承者',
    description: '権能を1種類以上解放する。',
    category: '権能',
    metric: 'abilityUnlockedCount',
    target: 1,
    reward: { statPoints: 15 },
  },
  {
    id: 'all-abilities-unlocked',
    title: '五つの権能',
    description: '登録されている5種類の権能をすべて解放する。',
    category: '権能',
    metric: 'abilityUnlockedCount',
    target: 5,
    reward: { statPoints: 50, abilityShardsEach: 20 },
  },
  {
    id: 'ability-maxed',
    title: '権能の極致',
    description: '権能を1種類、最大レベルまで強化する。',
    category: '権能',
    metric: 'abilityMaxedCount',
    target: 1,
    reward: { statPoints: 40, abilityShardsEach: 10 },
  },
  {
    id: 'all-abilities-maxed',
    title: '全権能の支配者',
    description: '登録されている5種類の権能をすべて最大レベルにする。',
    category: '権能',
    metric: 'abilityMaxedCount',
    target: 5,
    reward: { statPoints: 120, abilityShardsEach: 25 },
  },
  {
    id: 'four-imprints',
    title: '刻印の蒐集家',
    description: '刻印を4種類以上獲得する。',
    category: '刻印',
    metric: 'imprintsOwned',
    target: 4,
    reward: { statPoints: 20, imprintTickets: 5 },
  },
  {
    id: 'all-imprints',
    title: '刻印の完全記録',
    description: '現在登録されている刻印をすべて獲得する。',
    category: '刻印',
    metric: 'allImprintsOwned',
    target: 1,
    reward: { statPoints: 80, imprintTickets: 20 },
  },
  {
    id: 'three-equipped-imprints',
    title: '刻印の共鳴',
    description: '刻印を3枠すべてに装備する。',
    category: '刻印',
    metric: 'imprintsEquipped',
    target: 3,
    reward: { statPoints: 20, imprintTickets: 5 },
  },
  {
    id: 'first-raid-victory',
    title: 'レイド初制覇',
    description: 'レイドに1回勝利する。',
    category: 'レイド',
    metric: 'raidVictories',
    target: 1,
    reward: { statPoints: 15, imprintTickets: 2 },
  },
  {
    id: 'ten-raid-victories',
    title: 'レイドの熟練者',
    description: 'レイドに累計10回勝利する。',
    category: 'レイド',
    metric: 'raidVictories',
    target: 10,
    reward: { statPoints: 60, imprintTickets: 10 },
  },
  {
    id: 'twenty-five-raid-victories',
    title: 'レイドの伝説',
    description: 'レイドに累計25回勝利する。',
    category: 'レイド',
    metric: 'raidVictories',
    target: 25,
    reward: { statPoints: 100, imprintTickets: 15 },
  },
  {
    id: 'skill-path-master',
    title: '二つの道',
    description: 'いれーなの羽弾と崩壊、それぞれの育成ルートを選択する。',
    category: '育成',
    metric: 'skillPathsSelected',
    target: 2,
    reward: { statPoints: 40, skillShards: 100 },
  },
  {
    id: 'both-skills-maxed',
    title: '技の完成形',
    description: '羽弾と崩壊をどちらも最大レベルにする。',
    category: '育成',
    metric: 'skillMaxedCount',
    target: 2,
    reward: { statPoints: 100, recruitmentTickets: 10 },
  },
] as const;

export type AchievementId = typeof ACHIEVEMENTS[number]['id'];

export const ABSOLUTE_AUTHORITY_NAME = '全理支配';
export const ABSOLUTE_AUTHORITY_DESCRIPTION =
  '実績をすべて達成した者だけが扱える最上位権能。いれーなの最大HP・攻撃・防御・速度・特殊技・必殺技を2倍にし、被ダメージを半減する。';
