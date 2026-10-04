import { RecruitmentRarity } from '../types/game';

export interface RecruitmentRewardDef {
  id: string;
  rarity: RecruitmentRarity;
  name: string;
  description: string;
  shards: number;
}

export interface RecruitmentDraw {
  reward: RecruitmentRewardDef;
  isNew: boolean;
  shardGain: number;
}

export const RECRUITMENT_REWARD_SEQUENCE: readonly RecruitmentRewardDef[] = [
  { id: 'shadow-feather', rarity: 'R', name: '黒羽の欠片', description: '暗黒の羽根が残した微細な残滓。', shards: 20 },
  { id: 'wind-memory', rarity: 'R', name: '風詠の記憶', description: 'いれーなの戦技を記録した記憶片。', shards: 25 },
  { id: 'battle-record', rarity: 'R', name: '戦闘記録', description: '一瞬の読み合いを刻んだ記録媒体。', shards: 30 },
  { id: 'abyss-fragment', rarity: 'R', name: '深淵の欠片', description: '羽弾の奥底に眠る黒い結晶。', shards: 35 },
  { id: 'judgement-fragment', rarity: 'SR', name: '断罪の欠片', description: '出血を司る権能の一端。', shards: 55 },
  { id: 'charge-core', rarity: 'R', name: '蓄積核', description: '力を溜め込むための小さな核。', shards: 40 },
  { id: 'ruin-echo', rarity: 'SR', name: '破壊の残響', description: '破壊の権能が通り過ぎた跡。', shards: 65 },
  { id: 'all-god-mark', rarity: 'R', name: '全神の印', description: '全ての権能を束ねるための印。', shards: 45 },
  { id: 'irena-oath', rarity: 'SR', name: '風詠の誓約', description: 'いれーなの戦場での誓いを象徴する札。', shards: 75 },
  { id: 'omnipotent-crown', rarity: 'SSR', name: '全能の王冠', description: '全神の権能、その先を示す特別な収集報酬。', shards: 150 },
] as const;

export function getRecruitmentCandidates(pullNumber: number): RecruitmentRewardDef[] {
  const safePull = Math.max(1, Math.floor(pullNumber));
  const start = (safePull - 1) % RECRUITMENT_REWARD_SEQUENCE.length;
  const candidates = [
    RECRUITMENT_REWARD_SEQUENCE[start],
    RECRUITMENT_REWARD_SEQUENCE[(start + 3) % RECRUITMENT_REWARD_SEQUENCE.length],
    RECRUITMENT_REWARD_SEQUENCE[(start + 6) % RECRUITMENT_REWARD_SEQUENCE.length],
  ];

  if (safePull % 10 === 0) {
    const ssr = RECRUITMENT_REWARD_SEQUENCE.find(reward => reward.rarity === 'SSR');
    if (ssr) candidates[2] = ssr;
  }

  return Array.from(new Map(candidates.map(reward => [reward.id, reward])).values());
}

export function getDuplicateShardBonus(rarity: RecruitmentRarity): number {
  if (rarity === 'SSR') return 80;
  if (rarity === 'SR') return 30;
  return 10;
}
