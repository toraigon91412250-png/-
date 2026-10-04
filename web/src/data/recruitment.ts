import { AbilityId, RecruitmentRarity } from '../types/game';

export type RecruitmentRewardKind = 'ABILITY_CORE' | 'ABILITY_SHARD';

export interface RecruitmentRewardDef {
  id: string;
  kind: RecruitmentRewardKind;
  rarity: RecruitmentRarity;
  name: string;
  description: string;
  abilityId: AbilityId;
  shardAmount: number;
  duplicateShards: number;
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

const CORE_DEFINITIONS: readonly RecruitmentRewardDef[] = [
  {
    id: 'ability-core-abyss',
    kind: 'ABILITY_CORE',
    rarity: 'SSR',
    name: '深淵',
    description: '深淵の権能本体。初回獲得で権能を解放する。',
    abilityId: 'ABYSS',
    shardAmount: 0,
    duplicateShards: 70,
    weight: 3,
  },
  {
    id: 'ability-core-fallen',
    kind: 'ABILITY_CORE',
    rarity: 'SSR',
    name: '堕天',
    description: '堕天の権能本体。初回獲得で権能を解放する。',
    abilityId: 'FALLEN',
    shardAmount: 0,
    duplicateShards: 70,
    weight: 3,
  },
  {
    id: 'ability-core-black-wing',
    kind: 'ABILITY_CORE',
    rarity: 'SSR',
    name: '黒翼',
    description: '黒翼の権能本体。初回獲得で権能を解放する。',
    abilityId: 'BLACK_WING',
    shardAmount: 0,
    duplicateShards: 70,
    weight: 3,
  },
  {
    id: 'ability-core-fallen-king',
    kind: 'ABILITY_CORE',
    rarity: 'SSR',
    name: '堕天王',
    description: '堕天王の権能本体。初回獲得で権能を解放する。',
    abilityId: 'FALLEN_KING',
    shardAmount: 0,
    duplicateShards: 70,
    weight: 3,
  },
  {
    id: 'ability-core-judgment',
    kind: 'ABILITY_CORE',
    rarity: 'SSR',
    name: '断罪',
    description: '断罪の権能本体。初回獲得で権能を解放する。',
    abilityId: 'JUDGMENT',
    shardAmount: 0,
    duplicateShards: 70,
    weight: 3,
  },
];

const SHARD_DEFINITIONS: readonly RecruitmentRewardDef[] = [
  {
    id: 'ability-shard-abyss',
    kind: 'ABILITY_SHARD',
    rarity: 'R',
    name: '深淵の欠片',
    description: '深淵の権能を強化する欠片。',
    abilityId: 'ABYSS',
    shardAmount: 25,
    duplicateShards: 0,
    weight: 12,
  },
  {
    id: 'ability-shard-fallen',
    kind: 'ABILITY_SHARD',
    rarity: 'R',
    name: '堕天の欠片',
    description: '堕天の権能を強化する欠片。',
    abilityId: 'FALLEN',
    shardAmount: 25,
    duplicateShards: 0,
    weight: 12,
  },
  {
    id: 'ability-shard-black-wing',
    kind: 'ABILITY_SHARD',
    rarity: 'R',
    name: '黒翼の欠片',
    description: '黒翼の権能を強化する欠片。',
    abilityId: 'BLACK_WING',
    shardAmount: 25,
    duplicateShards: 0,
    weight: 12,
  },
  {
    id: 'ability-shard-fallen-king',
    kind: 'ABILITY_SHARD',
    rarity: 'R',
    name: '堕天王の欠片',
    description: '堕天王の権能を強化する欠片。',
    abilityId: 'FALLEN_KING',
    shardAmount: 25,
    duplicateShards: 0,
    weight: 12,
  },
  {
    id: 'ability-shard-judgment',
    kind: 'ABILITY_SHARD',
    rarity: 'R',
    name: '断罪の欠片',
    description: '断罪の権能を強化する欠片。',
    abilityId: 'JUDGMENT',
    shardAmount: 25,
    duplicateShards: 0,
    weight: 12,
  },
  {
    id: 'ability-shard-abyss-sr',
    kind: 'ABILITY_SHARD',
    rarity: 'SR',
    name: '深淵の濃縮欠片',
    description: '深淵の権能が凝縮された高密度の欠片。',
    abilityId: 'ABYSS',
    shardAmount: 60,
    duplicateShards: 0,
    weight: 4,
  },
  {
    id: 'ability-shard-fallen-sr',
    kind: 'ABILITY_SHARD',
    rarity: 'SR',
    name: '堕天の濃縮欠片',
    description: '堕天の権能が凝縮された高密度の欠片。',
    abilityId: 'FALLEN',
    shardAmount: 60,
    duplicateShards: 0,
    weight: 4,
  },
  {
    id: 'ability-shard-black-wing-sr',
    kind: 'ABILITY_SHARD',
    rarity: 'SR',
    name: '黒翼の濃縮欠片',
    description: '黒翼の権能が凝縮された高密度の欠片。',
    abilityId: 'BLACK_WING',
    shardAmount: 60,
    duplicateShards: 0,
    weight: 4,
  },
  {
    id: 'ability-shard-fallen-king-sr',
    kind: 'ABILITY_SHARD',
    rarity: 'SR',
    name: '堕天王の濃縮欠片',
    description: '堕天王の権能が凝縮された高密度の欠片。',
    abilityId: 'FALLEN_KING',
    shardAmount: 60,
    duplicateShards: 0,
    weight: 4,
  },
  {
    id: 'ability-shard-judgment-sr',
    kind: 'ABILITY_SHARD',
    rarity: 'SR',
    name: '断罪の濃縮欠片',
    description: '断罪の権能が凝縮された高密度の欠片。',
    abilityId: 'JUDGMENT',
    shardAmount: 60,
    duplicateShards: 0,
    weight: 4,
  },
];

export const RECRUITMENT_REWARDS: readonly RecruitmentRewardDef[] = [
  ...CORE_DEFINITIONS,
  ...SHARD_DEFINITIONS,
];

export const RECRUITMENT_REWARD_SEQUENCE = RECRUITMENT_REWARDS;

const totalWeight = RECRUITMENT_REWARDS.reduce((sum, reward) => sum + reward.weight, 0);

export function drawRecruitmentReward(forceAbilityCore = false): RecruitmentRewardDef {
  const pool = forceAbilityCore ? CORE_DEFINITIONS : RECRUITMENT_REWARDS;
  const poolWeight = pool.reduce((sum, reward) => sum + reward.weight, 0);
  let roll = Math.random() * (forceAbilityCore ? poolWeight : totalWeight);

  for (const reward of pool) {
    roll -= reward.weight;
    if (roll < 0) return reward;
  }

  return pool[pool.length - 1];
}

export function getRecruitmentRewardForPull(_pullNumber: number, forceAbilityCore = false): RecruitmentRewardDef {
  return drawRecruitmentReward(forceAbilityCore);
}

export function getDuplicateShardBonus(rarity: RecruitmentRarity): number {
  if (rarity === 'SSR') return 70;
  if (rarity === 'SR') return 40;
  return 20;
}
