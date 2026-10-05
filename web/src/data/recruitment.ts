import { AbilityId, RecruitmentRarity } from '../types/game';

export type RecruitmentRewardKind =
  | 'SKILL_SHARD'
  | 'ABILITY_SHARD'
  | 'ABILITY_CORE'
  | 'SPECIAL_SKILL';

export interface RecruitmentRewardDef {
  id: string;
  kind: RecruitmentRewardKind;
  rarity: RecruitmentRarity;
  name: string;
  description: string;
  abilityId?: AbilityId;
  specialSkillId?: 'SUPER_FALLEN_SHOT';
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
    description: '深淵の権能本体。',
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
    description: '堕天の権能本体。',
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
    description: '黒翼の権能本体。',
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
    description: '堕天王の権能本体。',
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
    description: '断罪の権能本体。',
    abilityId: 'JUDGMENT',
    shardAmount: 0,
    duplicateShards: 70,
    weight: 3,
  },
];

const SHARD_DEFINITIONS: readonly RecruitmentRewardDef[] = [
  {
    id: 'skill-shard',
    kind: 'SKILL_SHARD',
    rarity: 'R',
    name: '技強化の欠片',
    description: 'いれーなの技強化に使う共通の欠片。',
    shardAmount: 25,
    duplicateShards: 25,
    weight: 58,
  },
  {
    id: 'ability-shard-abyss',
    kind: 'ABILITY_SHARD',
    rarity: 'SR',
    name: '深淵の権能の欠片',
    description: '深淵の権能を強化する欠片。',
    abilityId: 'ABYSS',
    shardAmount: 60,
    duplicateShards: 60,
    weight: 5,
  },
  {
    id: 'ability-shard-fallen',
    kind: 'ABILITY_SHARD',
    rarity: 'SR',
    name: '堕天の権能の欠片',
    description: '堕天の権能を強化する欠片。',
    abilityId: 'FALLEN',
    shardAmount: 60,
    duplicateShards: 60,
    weight: 5,
  },
  {
    id: 'ability-shard-black-wing',
    kind: 'ABILITY_SHARD',
    rarity: 'SR',
    name: '黒翼の権能の欠片',
    description: '黒翼の権能を強化する欠片。',
    abilityId: 'BLACK_WING',
    shardAmount: 60,
    duplicateShards: 60,
    weight: 5,
  },
  {
    id: 'ability-shard-fallen-king',
    kind: 'ABILITY_SHARD',
    rarity: 'SR',
    name: '堕天王の権能の欠片',
    description: '堕天王の権能を強化する欠片。',
    abilityId: 'FALLEN_KING',
    shardAmount: 60,
    duplicateShards: 60,
    weight: 5,
  },
  {
    id: 'ability-shard-judgment',
    kind: 'ABILITY_SHARD',
    rarity: 'SR',
    name: '断罪の権能の欠片',
    description: '断罪の権能を強化する欠片。',
    abilityId: 'JUDGMENT',
    shardAmount: 60,
    duplicateShards: 60,
    weight: 5,
  },
];

const SPECIAL_SKILL_DEFINITIONS: readonly RecruitmentRewardDef[] = [
  {
    id: 'special-skill-super-fallen-shot',
    kind: 'SPECIAL_SKILL',
    rarity: 'UR',
    name: '超堕天撃',
    description: '1ターンの充填後、電撃をまとった羽弾を放つ最強級の単発特殊技。充填中は防御力が0になる。',
    specialSkillId: 'SUPER_FALLEN_SHOT',
    shardAmount: 0,
    duplicateShards: 120,
    weight: 2,
  },
];

export const RECRUITMENT_REWARDS: readonly RecruitmentRewardDef[] = [
  ...CORE_DEFINITIONS,
  ...SHARD_DEFINITIONS,
  ...SPECIAL_SKILL_DEFINITIONS,
];

export const RECRUITMENT_REWARD_SEQUENCE = RECRUITMENT_REWARDS;

const totalWeight = RECRUITMENT_REWARDS.reduce((sum, reward) => sum + reward.weight, 0);

export function drawRecruitmentReward(forceAbilityCore = false, forceAtLeastSr = false): RecruitmentRewardDef {
  const pool = forceAbilityCore
    ? CORE_DEFINITIONS
    : forceAtLeastSr
      ? RECRUITMENT_REWARDS.filter(reward => reward.rarity !== 'R')
      : RECRUITMENT_REWARDS;
  const poolWeight = pool.reduce((sum, reward) => sum + reward.weight, 0);
  let roll = Math.random() * (forceAbilityCore || forceAtLeastSr ? poolWeight : totalWeight);

  for (const reward of pool) {
    roll -= reward.weight;
    if (roll < 0) return reward;
  }

  return pool[pool.length - 1];
}

export function getRecruitmentRewardForPull(
  _pullNumber: number,
  forceAbilityCore = false,
  forceAtLeastSr = false,
): RecruitmentRewardDef {
  return drawRecruitmentReward(forceAbilityCore, forceAtLeastSr);
}

export function getDuplicateShardBonus(rarity: RecruitmentRarity): number {
  if (rarity === 'UR') return 120;
  if (rarity === 'SSR') return 70;
  if (rarity === 'SR') return 60;
  return 25;
}
