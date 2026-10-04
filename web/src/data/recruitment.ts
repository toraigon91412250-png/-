import { RecruitmentRarity } from '../types/game';

export interface RecruitmentRewardDef {
  id: string;
  rarity: RecruitmentRarity;
  name: string;
  description: string;
  shards: number;
  ticketBonus: number;
  weight: number;
}

export interface RecruitmentDraw {
  reward: RecruitmentRewardDef;
  isNew: boolean;
  shardGain: number;
  ticketBonus: number;
  collectionCompleted: boolean;
  collectionBonusShards: number;
}

export const RECRUITMENT_REWARDS: readonly RecruitmentRewardDef[] = [
  {
    id: 'shadow-feather',
    rarity: 'R',
    name: '黒羽の欠片',
    description: '黒翼からこぼれた残滓。いれーなの育成に使える。',
    shards: 60,
    ticketBonus: 0,
    weight: 28,
  },
  {
    id: 'wind-memory',
    rarity: 'R',
    name: '風詠の記憶',
    description: '風を読む戦技の記憶。育成資源として残る。',
    shards: 75,
    ticketBonus: 0,
    weight: 20,
  },
  {
    id: 'battle-record',
    rarity: 'R',
    name: '戦闘記録',
    description: '戦いの中で蓄積された判断の記録。',
    shards: 90,
    ticketBonus: 0,
    weight: 16,
  },
  {
    id: 'abyss-fragment',
    rarity: 'R',
    name: '深淵の欠片',
    description: '羽弾の奥に眠る黒い結晶。濃い権能の残滓。',
    shards: 110,
    ticketBonus: 0,
    weight: 11,
  },
  {
    id: 'judgement-fragment',
    rarity: 'SR',
    name: '断罪の欠片',
    description: '断罪の権能を宿した高密度の欠片。',
    shards: 150,
    ticketBonus: 1,
    weight: 7,
  },
  {
    id: 'charge-core',
    rarity: 'R',
    name: '蓄積核',
    description: '力を蓄える核。通常より濃い黒翼の残滓。',
    shards: 125,
    ticketBonus: 0,
    weight: 6,
  },
  {
    id: 'ruin-echo',
    rarity: 'SR',
    name: '破壊の残響',
    description: '破壊の権能が通り過ぎた跡。強い余波が残っている。',
    shards: 190,
    ticketBonus: 1,
    weight: 5,
  },
  {
    id: 'all-god-mark',
    rarity: 'R',
    name: '全神の印',
    description: '複数の権能を束ねた印。通常の残滓より価値が高い。',
    shards: 135,
    ticketBonus: 0,
    weight: 4,
  },
  {
    id: 'irena-oath',
    rarity: 'SR',
    name: '風詠の誓約',
    description: 'いれーなの戦場への誓約を刻んだ特別な記憶。',
    shards: 230,
    ticketBonus: 1,
    weight: 2,
  },
  {
    id: 'omnipotent-crown',
    rarity: 'SSR',
    name: '全能の王冠',
    description: '黒翼の最奥でのみ見える、極めて濃い権能。',
    shards: 360,
    ticketBonus: 2,
    weight: 1,
  },
] as const;

// 旧コードとの互換用。収集数の母数にも使える。
export const RECRUITMENT_REWARD_SEQUENCE = RECRUITMENT_REWARDS;

export const RECRUITMENT_COLLECTION_COMPLETE_BONUS = 500;

const totalWeight = RECRUITMENT_REWARDS.reduce((sum, reward) => sum + reward.weight, 0);

export function drawRecruitmentReward(): RecruitmentRewardDef {
  let roll = Math.random() * totalWeight;

  for (const reward of RECRUITMENT_REWARDS) {
    roll -= reward.weight;
    if (roll < 0) return reward;
  }

  return RECRUITMENT_REWARDS[RECRUITMENT_REWARDS.length - 1];
}

/**
 * 旧API名を残しつつ、固定ローテーションではなく召喚抽選を行う。
 * pullNumber は呼び出し側との互換性のため受け取るが、結果そのものは抽選で決まる。
 */
export function getRecruitmentRewardForPull(_pullNumber: number): RecruitmentRewardDef {
  return drawRecruitmentReward();
}

export function getDuplicateShardBonus(rarity: RecruitmentRarity): number {
  if (rarity === 'SSR') return 180;
  if (rarity === 'SR') return 80;
  return 30;
}
