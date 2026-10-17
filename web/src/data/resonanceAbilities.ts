import type { AbilityId, ResonanceAbilityId } from '../types/game';

export interface ResonanceDefinition {
  id: ResonanceAbilityId;
  name: string;
  symbol: string;
  ingredients: readonly [AbilityId, AbilityId];
  shortDescription: string;
  levelDescriptions: readonly [string, string, string, string, string];
}

export const RESONANCE_UPGRADE_COSTS = [0, 40, 80, 120, 160] as const;

export const RESONANCE_DEFINITIONS: readonly ResonanceDefinition[] = [
  {
    id: 'FALLEN_GOD',
    name: '堕天の神',
    symbol: '♛',
    ingredients: ['FALLEN', 'FALLEN_KING'],
    shortDescription: '最大7段階の致死耐性。瀕死になるほど全ステータスが増幅する。',
    levelDescriptions: [
      '致死耐性：HP50%復活1回、HP1耐え1回。HP50%以下×1.50、25%以下×2.00、HP1×2.50（各2ターン）。',
      '致死耐性：HP50%復活1回、HP25%復活1回、HP1耐え2回。倍率×1.65／×2.25／×2.90（各2ターン）。',
      '致死耐性：HP50%・25%・5%復活各1回、HP1耐え2回。倍率×1.80／×2.50／×3.30（各2ターン）。',
      '致死耐性：HP50%・25%・5%復活各1回、HP1耐え3回。倍率×1.90／×2.75／×3.65（各2ターン）。',
      '致死耐性：HP50%・25%・5%復活各1回、HP1耐え4回。倍率×2.00／×3.00／×4.00（各2ターン）。',
    ],
  },
  {
    id: 'FALLEN_WING',
    name: '堕天翼',
    symbol: '🪽',
    ingredients: ['FALLEN', 'BLACK_WING'],
    shortDescription: '瀕死時に全ステータスを大幅強化し、羽弾の最終ダメージを最大10倍にする。',
    levelDescriptions: [
      'HP50%以下×2.80、25%以下×3.80、10%以下×4.80。羽弾×6、全ステ×1.04。',
      'HP50%以下×3.05、25%以下×4.15、10%以下×5.25。羽弾×7、全ステ×1.08。',
      'HP50%以下×3.30、25%以下×4.50、10%以下×5.70。羽弾×8、全ステ×1.12。',
      'HP50%以下×3.55、25%以下×4.85、10%以下×6.15。羽弾×9、全ステ×1.16。',
      'HP50%以下×3.80、25%以下×5.20、10%以下×6.60。羽弾×10、全ステ×1.20。HP5%以下（HP1以外）は終局効果。',
    ],
  },
  {
    id: 'FALLEN_JUDGMENT',
    name: '堕天審判',
    symbol: '⚖',
    ingredients: ['FALLEN', 'JUDGMENT'],
    shortDescription: '堕天の瀕死強化と、蓄積を解放する防御無視の断罪執行。',
    levelDescriptions: [
      '堕天Lv.5効果を継承。蓄積2：執行×3.5、DEF65%無視、敵現在HP+22%。瀕死補正+5/10/15%。',
      '堕天Lv.5効果を継承。蓄積2：執行×4、DEF70%無視、敵現在HP+24%。瀕死補正+10/20/30%。',
      '堕天Lv.5効果を継承。蓄積2：執行×4.5、DEF75%無視、敵現在HP+26%。瀕死補正+15/30/45%。',
      '堕天Lv.5効果を継承。蓄積1：執行×5.25、DEF82%無視、敵現在HP+28%。瀕死補正+20/40/60%。',
      '堕天Lv.5効果を継承。蓄積1：執行×6、DEF90%無視、敵現在HP+30%。瀕死補正+25/50/75%。',
    ],
  },
  {
    id: 'ABYSS_FALLEN',
    name: '深淵堕天',
    symbol: '🌑',
    ingredients: ['FALLEN', 'ABYSS'],
    shortDescription: '堕天Lv.5効果を継承。瀕死になるほど敵の5種ステータスを急速侵食する。',
    levelDescriptions: [
      '堕天Lv.5効果を継承。敵5項目を毎ターン侵食：HP50%超8%、50%以下12%、25%以下18%、10%以下25%（各95%上限）。',
      '堕天Lv.5効果を継承。敵5項目を毎ターン侵食：10%／15%／22%／30%。',
      '堕天Lv.5効果を継承。敵5項目を毎ターン侵食：12%／18%／27%／35%。',
      '堕天Lv.5効果を継承。敵5項目を毎ターン侵食：14%／21%／31%／40%。',
      '堕天Lv.5効果を継承。敵5項目を毎ターン侵食：16%／24%／36%／45%。',
    ],
  },
  {
    id: 'KING_WING',
    name: '王の翼',
    symbol: '👑',
    ingredients: ['FALLEN_KING', 'BLACK_WING'],
    shortDescription: '高い耐久と致死耐性を持ち、耐えるたびに羽弾が2ターン強化される。',
    levelDescriptions: [
      '最大HP・DEF×1.24、致死耐性5回。耐えるたび王の羽（羽弾+20%、最大1スタック、2ターン）。',
      '最大HP・DEF×1.28、致死耐性5回。王の羽1スタックごとに羽弾+25%（2ターン）。',
      '最大HP・DEF×1.32、致死耐性6回。王の羽1スタックごとに羽弾+30%、最大2スタック（2ターン）。',
      '最大HP・DEF×1.36、致死耐性6回。王の羽1スタックごとに羽弾+35%、最大2スタック（2ターン）。',
      '最大HP・DEF×1.40、致死耐性7回。王の羽1スタックごとに羽弾+40%、最大3スタック（最大+120%、各2ターン）。黒翼の羽弾×5を継承。',
    ],
  },
  {
    id: 'KING_JUDGMENT',
    name: '王権断罪',
    symbol: '⚔',
    ingredients: ['FALLEN_KING', 'JUDGMENT'],
    shortDescription: '堕天王Lv.5の耐久を継承し、攻撃命中と敵からの被弾の両方で断罪を蓄積する。',
    levelDescriptions: [
      '致死耐性5回。自分の攻撃命中・敵の直接攻撃命中で蓄積。必要4、執行×3.5、DEF65%無視、敵現在HP+20%。',
      '致死耐性5回。必要3、執行×4、DEF70%無視、敵現在HP+22%。攻撃・被弾で各1蓄積。',
      '致死耐性5回。必要3、執行×4.75、DEF75%無視、敵現在HP+25%。攻撃・被弾で各1蓄積。',
      '致死耐性5回。必要2、執行×5.5、DEF82%無視、敵現在HP+28%。攻撃・被弾で各1蓄積。',
      '致死耐性5回。必要2、執行×6.5、DEF90%無視、敵現在HP+30%。攻撃・被弾で各1蓄積。',
    ],
  },
  {
    id: 'ABYSS_KING',
    name: '深淵王',
    symbol: '♜',
    ingredients: ['FALLEN_KING', 'ABYSS'],
    shortDescription: '堕天王Lv.5の耐久と通常深淵を継承。敵の弱体化に応じて防御と直接被ダメージ軽減が育つ。',
    levelDescriptions: [
      '堕天王Lv.5耐久、敵5項目を毎ターン6%侵食。10%弱体化段階ごとに王域：DEF+4%、直接被ダメージ-2%、最大2スタック。',
      '同上。王域最大3スタック、1スタックごとにDEF+5%、直接被ダメージ-3%。',
      '同上。王域最大4スタック、1スタックごとにDEF+6%、直接被ダメージ-4%。',
      '同上。王域最大5スタック、1スタックごとにDEF+7%、直接被ダメージ-5%。',
      '同上。王域最大6スタック、1スタックごとにDEF+8%、直接被ダメージ-6%（最大DEF+48%、直接被ダメージ-36%）。',
    ],
  },
  {
    id: 'JUDGMENT_WING',
    name: '断罪翼',
    symbol: '🪶',
    ingredients: ['BLACK_WING', 'JUDGMENT'],
    shortDescription: '羽弾だけで断罪を蓄積し、最大15倍の羽弾に執行倍率を重ねる。',
    levelDescriptions: [
      '羽弾4回で執行。羽弾×6、執行追加×1.5、DEF40%無視、敵現在HP+10%。羽弾以外は蓄積も執行消費もしない。',
      '羽弾3回で執行。羽弾×8、執行追加×2、DEF50%無視、敵現在HP+15%。',
      '羽弾3回で執行。羽弾×10、執行追加×2.5、DEF60%無視、敵現在HP+20%。',
      '羽弾2回で執行。羽弾×12、執行追加×3、DEF75%無視、敵現在HP+25%。',
      '羽弾2回で執行。羽弾×15、執行追加×4、DEF90%無視、敵現在HP+30%。回避された羽弾は執行を消費しない。',
    ],
  },
  {
    id: 'ABYSS_WING',
    name: '深淵の翼',
    symbol: '🌘',
    ingredients: ['BLACK_WING', 'ABYSS'],
    shortDescription: '羽弾火力とターン侵食を置き換え、命中するたびに追加侵食を発生させる。',
    levelDescriptions: [
      '羽弾×6。毎ターン侵食8%。羽弾命中時、敵5項目を追加5%侵食（各95%上限）。',
      '羽弾×7。毎ターン侵食10%。羽弾命中時、追加7%侵食。',
      '羽弾×8。毎ターン侵食12%。羽弾命中時、追加9%侵食。',
      '羽弾×9。毎ターン侵食15%。羽弾命中時、追加12%侵食。',
      '羽弾×10。毎ターン侵食18%。羽弾命中時、追加15%侵食。装甲への命中も発動。',
    ],
  },
  {
    id: 'ABYSS_JUDGMENT',
    name: '深淵断罪',
    symbol: '⚖',
    ingredients: ['ABYSS', 'JUDGMENT'],
    shortDescription: '敵5項目の新しい10%弱体化段階ごとに蓄積し、余剰蓄積で処刑攻撃を強化する。',
    levelDescriptions: [
      '毎ターン侵食6%。必要蓄積20、執行×3、DEF50%無視、敵現在HP+10%。超過1ごと×+0.25、追加上限+0.5。',
      '毎ターン侵食8%。必要16、執行×4、DEF60%無視、敵現在HP+15%。追加上限+0.75。',
      '毎ターン侵食10%。必要12、執行×5、DEF70%無視、敵現在HP+20%。追加上限+1.0。',
      '毎ターン侵食12%。必要9、執行×6.5、DEF80%無視、敵現在HP+25%。追加上限+1.5。',
      '毎ターン侵食15%。必要6、執行×8、DEF90%無視、敵現在HP+35%。追加上限+2.0（最大執行×10）。蓄積上限は必要数の3倍。',
    ],
  },
];

/** The five resonance recipes available through normal progression. All ten remain usable via developer unlocks. */
export const CRAFTABLE_RESONANCE_ABILITY_IDS: readonly ResonanceAbilityId[] = [
  'FALLEN_GOD',
  'FALLEN_WING',
  'ABYSS_KING',
  'JUDGMENT_WING',
  'ABYSS_JUDGMENT',
];

const ABILITY_IDS = new Set<AbilityId>(['ABYSS', 'FALLEN', 'BLACK_WING', 'FALLEN_KING', 'JUDGMENT', 'ASTRAL_DOMINION']);
const RESONANCE_IDS = new Set<string>(RESONANCE_DEFINITIONS.map(definition => definition.id));

export function isResonanceAbilityId(value: string): value is ResonanceAbilityId {
  return RESONANCE_IDS.has(value);
}

export function getResonanceDefinition(id: ResonanceAbilityId): ResonanceDefinition {
  return RESONANCE_DEFINITIONS.find(definition => definition.id === id) ?? RESONANCE_DEFINITIONS[0];
}

export function isRegularAbilityId(value: string): value is AbilityId {
  return ABILITY_IDS.has(value as AbilityId);
}
