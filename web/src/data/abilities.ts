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
      '最大5%までATK・DEF・SPDを低下',
      '最大10%までATK・DEF・SPDを低下',
      '最大15%までATK・DEF・SPDを低下',
      '最大20%までATK・DEF・SPDを低下',
      '最大25%までATK・DEF・SPDを低下',
    ],
  },
  {
    id: 'FALLEN',
    name: '堕天',
    symbol: '🩸',
    shortDescription: 'いれーなが瀕死になるほど、堕天使の力を解放する。',
    levelDescriptions: [
      'HP20%以下でステータス上昇。10%以下で完全解放。5%以下かつHP1ではない時に即死攻撃。',
      'HP20%以下でステータス上昇。10%以下で完全解放。5%以下かつHP1ではない時に即死攻撃。',
      'HP20%以下でステータス上昇。10%以下で完全解放。5%以下かつHP1ではない時に即死攻撃。',
      'HP20%以下でステータス上昇。10%以下で完全解放。5%以下かつHP1ではない時に即死攻撃。',
      'HP20%以下で全ステ1.3倍。10%以下で完全解放。5%以下かつHP1ではない時に即死攻撃。',
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
      '最大HP・DEF +20%。致死ダメージを1戦闘1回だけHP1で耐える',
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
      '2段階で執行 / ダメージ×2.00 / DEF40%無視',
    ],
  },
];

export function getAbilityDefinition(id: AbilityId): AbilityDefinition {
  return ABILITY_DEFINITIONS.find(ability => ability.id === id) ?? ABILITY_DEFINITIONS[0];
}
