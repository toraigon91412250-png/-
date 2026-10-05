import { AbilityId } from '../types/game';

export const MAX_ABILITY_LEVEL = 5;

export interface AbilityDefinition {
  id: AbilityId;
  name: string;
  symbol: string;
  shortDescription: string;
  levelDescriptions: readonly [string, string, string, string, string];
}

export const ABILITY_DEFINITIONS: readonly AbilityDefinition[] = [
  {
    id: 'ABYSS',
    name: '深淵',
    symbol: '🌑',
    shortDescription: 'ターンが進むほどカイザーの力を侵食する。',
    levelDescriptions: [
      '毎ターンATK・DEF・SPDを侵食（上限なし）',
      '毎ターンATK・DEF・SPDを侵食（上限なし）',
      '毎ターンATK・DEF・SPDを侵食（上限なし）',
      '毎ターンATK・DEF・SPDを侵食（上限なし）',
      '毎ターンATK・DEF・SPD・特殊技・必殺技を6%ずつ侵食（上限なし）',
    ],
  },
  {
    id: 'FALLEN',
    name: '堕天',
    symbol: '🩸',
    shortDescription: 'いれーなが瀕死になるほど、堕天使の力を解放する。',
    levelDescriptions: [
      'HP50%以下で全ステ×2.0。25%以下で×2.5。10%以下で×3.0。5%以下かつHP1ではない時に即死攻撃。',
      'HP50%以下で全ステ×2.1。25%以下で×2.65。10%以下で×3.2。5%以下かつHP1ではない時に即死攻撃。',
      'HP50%以下で全ステ×2.2。25%以下で×2.8。10%以下で×3.4。5%以下かつHP1ではない時に即死攻撃。',
      'HP50%以下で全ステ×2.3。25%以下で×2.95。10%以下で×3.6。5%以下かつHP1ではない時に即死攻撃。',
      'HP50%以下で全ステ×2.4。25%以下で×3.1。10%以下で×3.8。5%以下かつHP1ではない時に即死攻撃。',
    ],
  },
  {
    id: 'BLACK_WING',
    name: '黒翼',
    symbol: '🪽',
    shortDescription: '黒翼を極限まで強化し、羽弾を倍加する。',
    levelDescriptions: [
      '全ステ×1.02 / 羽弾×1.2',
      '全ステ×1.04 / 羽弾×1.4',
      '全ステ×1.06 / 羽弾×1.6',
      '全ステ×1.08 / 羽弾×1.8',
      '全ステ×1.10 / 羽弾最終ダメージ×5.0',
    ],
  },
  {
    id: 'FALLEN_KING',
    name: '堕天王',
    symbol: '👑',
    shortDescription: '堕天の王として、あらゆる致命傷に抗う。',
    levelDescriptions: [
      '最大HP・DEF +4%',
      '最大HP・DEF +8%',
      '最大HP・DEF +12%',
      '最大HP・DEF +16%',
      '最大HP・DEF +20%。致死ダメージをHP1で5回まで耐える',
    ],
  },
  {
    id: 'JUDGMENT',
    name: '断罪',
    symbol: '⚖️',
    shortDescription: '攻撃を重ねて断罪を蓄積し、一撃を執行する。',
    levelDescriptions: [
      '4段階で執行 / ダメージ×1.40 / DEF20%無視',
      '4段階で執行 / ダメージ×1.55 / DEF25%無視',
      '3段階で執行 / ダメージ×1.70 / DEF30%無視',
      '3段階で執行 / ダメージ×1.85 / DEF35%無視',
      '2段階で執行 / ダメージ×3.00 / DEF60%無視 / 敵現在HP20%追加',
    ],
  },
];

export function getAbilityDefinition(id: AbilityId): AbilityDefinition {
  return ABILITY_DEFINITIONS.find(ability => ability.id === id) ?? ABILITY_DEFINITIONS[0];
}
