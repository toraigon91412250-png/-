export type AscentNodeType = 'COMBAT' | 'SHRINE' | 'FORGE' | 'ELITE' | 'BOSS';
export type AscentAction = 'STRIKE' | 'GUARD' | 'CHARGE' | 'BURST';
export type AscentIntent = 'HEAVY' | 'SWEEP' | 'RECOVER';
export type PrototypeStatus = 'ACTIVE' | 'VICTORY' | 'DEFEAT';

export interface AscentRouteNode {
  id: string;
  type: AscentNodeType;
  title: string;
  risk: string;
  reward: string;
}

export interface AscentRelic {
  id: string;
  name: string;
  symbol: string;
  description: string;
  attackBonus: number;
  burstBonus: number;
  guardReduction: number;
  maxHpBonus: number;
  healOnAcquire: number;
}

export const ASCENT_RELICS: readonly AscentRelic[] = [
  { id: 'IRON_FEATHER', name: '黒鉄の羽', symbol: '羽', description: '通常攻撃の威力 +4', attackBonus: 4, burstBonus: 0, guardReduction: 0, maxHpBonus: 0, healOnAcquire: 0 },
  { id: 'VOID_HEART', name: '虚空の心臓', symbol: '核', description: '最大HP +15、獲得時にHPを15回復', attackBonus: 0, burstBonus: 0, guardReduction: 0, maxHpBonus: 15, healOnAcquire: 15 },
  { id: 'ECHO_BATTERY', name: '残響電池', symbol: '雷', description: '共鳴解放の威力 +12', attackBonus: 0, burstBonus: 12, guardReduction: 0, maxHpBonus: 0, healOnAcquire: 0 },
  { id: 'QUIET_WARD', name: '静寂の護符', symbol: '盾', description: '防御時の被ダメージを追加で20%軽減', attackBonus: 0, burstBonus: 0, guardReduction: 0.2, maxHpBonus: 0, healOnAcquire: 0 },
  { id: 'LAST_SPARK', name: '最後の火花', symbol: '火', description: '各戦闘開始時にエネルギー+1', attackBonus: 0, burstBonus: 0, guardReduction: 0, maxHpBonus: 0, healOnAcquire: 0 },
  { id: 'EXECUTION_MARK', name: '終局の刻印', symbol: '刻', description: '敵HPが30%以下なら通常攻撃 +8', attackBonus: 0, burstBonus: 0, guardReduction: 0, maxHpBonus: 0, healOnAcquire: 0 },
];

export function getAscentRouteChoices(floor: number, seed = 0): AscentRouteNode[] {
  if (floor >= 5) {
    return [{ id: 'boss-5', type: 'BOSS', title: '虚空皇帝', risk: '最終試験', reward: '踏破評価' }];
  }
  const routeByFloor: Record<number, AscentRouteNode[]> = {
    1: [
      { id: 'f1-combat', type: 'COMBAT', title: '侵食兵を突破', risk: '標準', reward: '遺物を1つ獲得' },
      { id: 'f1-shrine', type: 'SHRINE', title: '静寂の祭壇', risk: '安全', reward: 'HPを回復' },
      { id: 'f1-forge', type: 'FORGE', title: '裂隙鍛造所', risk: '安全', reward: '遺物を1つ選択' },
    ],
    2: [
      { id: 'f2-combat', type: 'COMBAT', title: '侵食兵を突破', risk: '標準', reward: '遺物を1つ獲得' },
      { id: 'f2-elite', type: 'ELITE', title: '精鋭・断罪機', risk: '高', reward: '高得点と遺物' },
      { id: 'f2-forge', type: 'FORGE', title: '裂隙鍛造所', risk: '安全', reward: '遺物を1つ選択' },
    ],
    3: [
      { id: 'f3-combat', type: 'COMBAT', title: '王域の番人', risk: '標準', reward: '遺物を1つ獲得' },
      { id: 'f3-shrine', type: 'SHRINE', title: '静寂の祭壇', risk: '安全', reward: 'HPを回復' },
      { id: 'f3-elite', type: 'ELITE', title: '精鋭・王翼兵', risk: '高', reward: '高得点と遺物' },
    ],
    4: [
      { id: 'f4-elite', type: 'ELITE', title: '精鋭・深淵騎士', risk: '高', reward: '遺物を1つ獲得' },
      { id: 'f4-shrine', type: 'SHRINE', title: '最後の祭壇', risk: '安全', reward: 'HPを回復' },
      { id: 'f4-forge', type: 'FORGE', title: '最終鍛造所', risk: '安全', reward: '最終遺物を選択' },
    ],
  };
  const routeVariants: Record<number, AscentNodeType[][]> = {
    1: [['COMBAT', 'SHRINE', 'FORGE'], ['COMBAT', 'SHRINE', 'ELITE'], ['COMBAT', 'FORGE', 'ELITE']],
    2: [['COMBAT', 'ELITE', 'FORGE'], ['COMBAT', 'SHRINE', 'ELITE'], ['COMBAT', 'FORGE', 'SHRINE']],
    3: [['COMBAT', 'SHRINE', 'ELITE'], ['COMBAT', 'FORGE', 'ELITE'], ['SHRINE', 'FORGE', 'ELITE']],
    4: [['ELITE', 'SHRINE', 'FORGE'], ['ELITE', 'COMBAT', 'FORGE'], ['SHRINE', 'COMBAT', 'FORGE']],
  };
  const availableTemplates = Object.values(routeByFloor).flat();
  const variants = routeVariants[floor] ?? routeVariants[1];
  const chosenTypes = variants[Math.abs(Math.floor(seed + floor - 1)) % variants.length];
  return chosenTypes.map((type, index) => {
    const template = availableTemplates.find(node => node.type === type);
    if (!template) throw new Error('Missing experiment route template: ' + type);
    return { ...template, id: 'f' + floor + '-' + type.toLowerCase() + '-' + index };
  });
}

export function getAscentRelicChoices(ownedRelicIds: readonly string[], floor: number, seed = 0): AscentRelic[] {
  const available = ASCENT_RELICS.filter(relic => !ownedRelicIds.includes(relic.id));
  if (available.length <= 3) return available.slice(0, 3);
  const offset = (Math.max(0, floor - 1) + Math.abs(Math.floor(seed)) * 2) % available.length;
  return [0, 1, 2].map(index => available[(offset + index) % available.length]);
}

export interface AscentCombatState {
  playerHp: number;
  playerMaxHp: number;
  energy: number;
  enemyHp: number;
  enemyMaxHp: number;
  enemyName: string;
  floor: number;
  isBoss: boolean;
  isElite: boolean;
  turn: number;
  intent: AscentIntent;
  attackBonus: number;
  burstBonus: number;
  guardReduction: number;
  lowHpBonus: number;
  combo: number;
  score: number;
  status: PrototypeStatus;
  logs: string[];
}

export function getAscentIntent(turn: number): AscentIntent {
  return (['HEAVY', 'SWEEP', 'RECOVER'] as const)[Math.max(0, turn - 1) % 3];
}

export function createAscentCombatState(input: {
  floor: number;
  nodeType: Exclude<AscentNodeType, 'SHRINE' | 'FORGE'>;
  playerHp: number;
  playerMaxHp: number;
  energy: number;
  score: number;
  relicIds: readonly string[];
}): AscentCombatState {
  const isBoss = input.nodeType === 'BOSS';
  const isElite = input.nodeType === 'ELITE';
  const enemyMaxHp = isBoss ? 170 : 48 + input.floor * 12 + (isElite ? 26 : 0);
  const relics = ASCENT_RELICS.filter(relic => input.relicIds.includes(relic.id));
  return {
    playerHp: Math.max(0, Math.min(input.playerMaxHp, input.playerHp)),
    playerMaxHp: input.playerMaxHp,
    energy: Math.max(0, Math.min(3, input.energy + (input.relicIds.includes('LAST_SPARK') ? 1 : 0))),
    enemyHp: enemyMaxHp,
    enemyMaxHp,
    enemyName: isBoss ? '虚空皇帝' : isElite ? '精鋭・断罪機' : input.floor <= 2 ? '侵食兵' : '王域の番人',
    floor: input.floor,
    isBoss,
    isElite,
    turn: 1,
    intent: getAscentIntent(1),
    attackBonus: relics.reduce((sum, relic) => sum + relic.attackBonus, 0),
    burstBonus: relics.reduce((sum, relic) => sum + relic.burstBonus, 0),
    guardReduction: Math.min(0.82, 0.55 + relics.reduce((sum, relic) => sum + relic.guardReduction, 0)),
    lowHpBonus: input.relicIds.includes('EXECUTION_MARK') ? 8 : 0,
    combo: 0,
    score: input.score,
    status: 'ACTIVE',
    logs: [isBoss ? '最終試験開始。5階層を踏破せよ。' : isElite ? '精鋭が進路を塞いだ。予告を読んで突破しよう。' : '戦闘開始。敵の次の行動を確認しよう。'],
  };
}

export function resolveAscentTurn(state: AscentCombatState, action: AscentAction): AscentCombatState {
  if (state.status !== 'ACTIVE') return state;
  let playerHp = state.playerHp;
  let energy = state.energy;
  let enemyHp = state.enemyHp;
  let combo = state.combo;
  let score = state.score;
  let guarding = false;
  const logs = [...state.logs];
  let damage = 0;

  if (action === 'STRIKE') {
    damage = 14 + state.attackBonus + combo * 2;
    if (state.intent === 'RECOVER') damage += 10;
    if (state.lowHpBonus > 0 && enemyHp / state.enemyMaxHp <= 0.3) damage += state.lowHpBonus;
    combo += 1;
    energy = Math.min(3, energy + 1);
    score += damage;
    logs.push(`斬撃！ ${damage}ダメージ。`);
  } else if (action === 'GUARD') {
    guarding = true;
    energy = Math.min(3, energy + 1);
    combo = 0;
    score += 4;
    logs.push('防御姿勢。次の攻撃を軽減。');
  } else if (action === 'CHARGE') {
    energy = Math.min(3, energy + 2);
    combo = 0;
    logs.push('エネルギーを蓄積。');
  } else if (energy >= 3) {
    damage = 34 + state.burstBonus + state.attackBonus;
    energy = 0;
    combo = 0;
    score += damage + 8;
    logs.push(`共鳴解放！ ${damage}ダメージ。`);
  } else {
    logs.push('エネルギー不足。解放には3ゲージ必要。');
  }

  enemyHp = Math.max(0, enemyHp - damage);
  if (enemyHp <= 0) {
    logs.push('敵を撃破。次の階層への報酬を獲得。');
    return { ...state, playerHp, energy, enemyHp, combo, score: score + Math.max(0, playerHp), status: 'VICTORY', logs: logs.slice(-6), turn: state.turn + 1, intent: getAscentIntent(state.turn + 1) };
  }

  const enemyPhaseBonus = state.isBoss && state.enemyHp / state.enemyMaxHp < 0.5 ? 6 : state.isElite ? 3 : 0;
  if (state.intent === 'RECOVER') {
    const heal = state.isBoss ? 8 : 6;
    enemyHp = Math.min(state.enemyMaxHp, enemyHp + heal);
    logs.push(`敵は隙を作りHPを${Math.min(heal, state.enemyMaxHp - Math.max(0, state.enemyHp - damage))}回復。`);
  } else {
    const baseIncoming = (state.intent === 'HEAVY' ? 13 : 8) + state.floor * 2 + enemyPhaseBonus;
    const incoming = guarding ? Math.max(1, Math.round(baseIncoming * (1 - state.guardReduction))) : baseIncoming;
    playerHp = Math.max(0, playerHp - incoming);
    logs.push(`敵の攻撃！ ${incoming}ダメージ。`);
  }

  const status: PrototypeStatus = playerHp <= 0 ? 'DEFEAT' : 'ACTIVE';
  if (status === 'DEFEAT') logs.push('HPが尽きた。今回の踏破はここまで。');
  return {
    ...state,
    playerHp,
    energy,
    enemyHp,
    combo,
    score,
    status,
    turn: state.turn + 1,
    intent: getAscentIntent(state.turn + 1),
    logs: logs.slice(-6),
  };
}

export type ObservatoryAction = 'STRIKE' | 'GUARD' | 'DODGE' | 'INTERCEPT';
export type ObservatoryIntentKind = 'LINE' | 'CORE' | 'SWEEP' | 'NOVA';
export interface ObservatoryIntent {
  kind: ObservatoryIntentKind;
  title: string;
  description: string;
  targetLane: number;
  dangerLanes: number[];
  damage: number;
}
export interface ObservatoryState {
  playerHp: number;
  coreHp: number;
  bossHp: number;
  bossMaxHp: number;
  energy: number;
  turn: number;
  playerLane: number;
  combo: number;
  score: number;
  status: PrototypeStatus;
  logs: string[];
}
export function getObservatoryIntent(turn: number, bossHp: number, bossMaxHp: number): ObservatoryIntent {
  if (bossHp / Math.max(1, bossMaxHp) <= 0.35 && turn % 4 === 0) {
    return { kind: 'NOVA', title: '全域崩壊', description: '全レーンが危険。迎撃か防御で耐えろ。', targetLane: -1, dangerLanes: [0, 1, 2], damage: 25 };
  }
  const patterns: ObservatoryIntent[] = [
    { kind: 'LINE', title: '直線断罪', description: '指定レーンだけを攻撃。安全なレーンへ移動しろ。', targetLane: 1, dangerLanes: [1], damage: 19 },
    { kind: 'CORE', title: '核砲撃', description: '操作キャラでなく拠点を狙う。移動では防げない。', targetLane: -1, dangerLanes: [], damage: 23 },
    { kind: 'SWEEP', title: '両翼掃討', description: '左右両レーンが危険。中央が安全。', targetLane: -1, dangerLanes: [0, 2], damage: 16 },
    { kind: 'LINE', title: '直線断罪', description: '左レーンを狙う。位置をずらせ。', targetLane: 0, dangerLanes: [0], damage: 19 },
    { kind: 'CORE', title: '核砲撃', description: '拠点への砲撃。迎撃なら無効化できる。', targetLane: -1, dangerLanes: [], damage: 23 },
    { kind: 'SWEEP', title: '両翼掃討', description: '中央と右が危険。左へ退避。', targetLane: -1, dangerLanes: [1, 2], damage: 16 },
  ];
  const selected = patterns[Math.max(0, turn - 1) % patterns.length];
  const phaseBonus = bossHp / Math.max(1, bossMaxHp) <= 0.6 ? 5 : 0;
  return { ...selected, damage: selected.damage + phaseBonus, dangerLanes: [...selected.dangerLanes] };
}

export function createObservatoryState(): ObservatoryState {
  return { playerHp: 100, coreHp: 100, bossHp: 180, bossMaxHp: 180, energy: 1, turn: 1, playerLane: 1, combo: 0, score: 0, status: 'ACTIVE', logs: ['観測開始。赤く示された攻撃範囲を読んで次の一手を選べ。'] };
}

export function resolveObservatoryTurn(state: ObservatoryState, action: ObservatoryAction, selectedLane: number): ObservatoryState {
  if (state.status !== 'ACTIVE') return state;
  const intent = getObservatoryIntent(state.turn, state.bossHp, state.bossMaxHp);
  const lane = Math.max(0, Math.min(2, Math.round(selectedLane)));
  let playerHp = state.playerHp;
  let coreHp = state.coreHp;
  let bossHp = state.bossHp;
  let energy = state.energy;
  let combo = state.combo;
  let score = state.score;
  let guarding = false;
  let interrupting = false;
  let logs = [...state.logs];
  let bossDamage = 0;

  if (action === 'STRIKE') {
    bossDamage = 20 + combo * 3 + (intent.kind === 'CORE' ? 8 : 0);
    combo += 1;
    energy = Math.min(3, energy + 1);
    score += bossDamage;
    logs.push(`攻撃！ 皇帝に${bossDamage}ダメージ。`);
  } else if (action === 'GUARD') {
    guarding = true;
    energy = Math.min(3, energy + 1);
    combo = 0;
    score += 3;
    logs.push('防御を構えた。核砲撃も受け止められる。');
  } else if (action === 'INTERCEPT') {
    if (energy <= 0) {
      logs.push('迎撃にはエネルギーが1必要。');
    } else {
      energy -= 1;
      interrupting = true;
      bossDamage = 12;
      score += 12;
      logs.push('迎撃弾を発射。核砲撃を止める準備。');
    }
  } else {
    logs.push(`レーンを${['左', '中央', '右'][lane]}へ移動。`);
  }
  bossHp = Math.max(0, bossHp - bossDamage);
  if (bossHp <= 0) {
    logs.push('皇帝の撃破に成功。拠点を守り抜いた。');
    return { ...state, playerLane: lane, playerHp, coreHp, bossHp, energy, combo, score: score + playerHp + coreHp, status: 'VICTORY', turn: state.turn + 1, logs: logs.slice(-6) };
  }

  if (intent.kind === 'CORE') {
    if (guarding || (interrupting && energy < state.energy)) {
      score += 18;
      logs.push(guarding ? '防御成功。拠点への砲撃を完全に防いだ。' : '迎撃成功。核砲撃を撃ち落とした。');
    } else {
      coreHp = Math.max(0, coreHp - intent.damage);
      logs.push(`拠点に${intent.damage}ダメージ。`);
    }
  } else {
    const inDanger = intent.dangerLanes.includes(lane);
    if (inDanger) {
      const reduction = guarding ? 0.65 : interrupting ? 0.4 : 0;
      const incoming = Math.max(0, Math.round(intent.damage * (1 - reduction)));
      playerHp = Math.max(0, playerHp - incoming);
      logs.push(`攻撃範囲にいた！ ${incoming}ダメージ。`);
    } else {
      score += 12;
      if (action === 'DODGE') energy = Math.min(3, energy + 1);
      logs.push('回避成功。攻撃範囲の外から反撃の機会を得た。');
    }
  }

  const status: PrototypeStatus = playerHp <= 0 || coreHp <= 0 ? 'DEFEAT' : 'ACTIVE';
  if (status === 'DEFEAT') logs.push(playerHp <= 0 ? '操作キャラが倒れた。' : '拠点が破壊された。');
  return { ...state, playerLane: lane, playerHp, coreHp, bossHp, energy, combo, score, status, turn: state.turn + 1, logs: logs.slice(-6) };
}

export type ResonanceDoctrine = 'BURST' | 'SURVIVE' | 'EROSION';
export type ResonanceTrialAction = 'STRIKE' | 'GUARD' | 'CHARGE' | 'BURST';
export interface ResonancePrototypeAnalysis {
  title: string;
  score: number;
  style: string;
  description: string;
  attackBonus: number;
  guardBonus: number;
  burstBonus: number;
}
const RECIPE_ANALYSIS: Record<string, Omit<ResonancePrototypeAnalysis, 'attackBonus' | 'guardBonus' | 'burstBonus'>> = {
  'FALLEN|FALLEN_KING': { title: '不屈の王冠', score: 96, style: '瀕死反転型', description: '瀕死域から大きく反転し、耐えた一撃を決定打へ変える。' },
  'FALLEN|BLACK_WING': { title: '血翼突撃', score: 91, style: '高速爆発型', description: 'リスクを背負い、短い手数で一気に削り切る。' },
  'FALLEN|JUDGMENT': { title: '断罪の瀕死圏', score: 88, style: '終局特化型', description: '瀕死域と処刑圏のタイミングを重ねる。' },
  'ABYSS|FALLEN': { title: '深淵の代償', score: 83, style: '侵食反転型', description: '時間を稼いで相手を削り、反転の一撃につなげる。' },
  'BLACK_WING|FALLEN_KING': { title: '王翼連撃', score: 87, style: '連撃維持型', description: '手数と耐久を組み合わせ、攻めの時間を延長する。' },
  'FALLEN_KING|JUDGMENT': { title: '王権裁定', score: 86, style: '確定打型', description: '王権で整え、断罪で締める。' },
  'ABYSS|FALLEN_KING': { title: '侵食王域', score: 84, style: '長期制圧型', description: '時間とともに相手を弱らせ、安定して優位を作る。' },
  'JUDGMENT|BLACK_WING': { title: '裁きの飛翔', score: 89, style: '機動処刑型', description: '速度で機会を作り、終局の一撃を当てる。' },
  'ABYSS|JUDGMENT': { title: '深淵断罪', score: 95, style: '侵食処刑型', description: '長期の侵食から処刑圏へつなぐ、時間差の決定力。' },
  'ABYSS|BLACK_WING': { title: '深淵翼', score: 85, style: '侵食機動型', description: '守り切れる手数を稼ぎ、侵食速度で差を広げる。' },
};

function powerFamily(id: string): string {
  if (id.includes('ABYSS')) return 'EROSION';
  if (id.includes('FALLEN') && id.includes('WING')) return 'RISK';
  if (id.includes('FALLEN')) return 'RISK';
  if (id.includes('JUDGMENT')) return 'FINISH';
  if (id.includes('WING')) return 'BURST';
  if (id.includes('KING') || id.includes('GOD')) return 'SURVIVE';
  return 'FLEX';
}

export function getResonancePrototypeAnalysis(firstId: string, secondId: string): ResonancePrototypeAnalysis {
  if (firstId === secondId) {
    return { title: '単一権能特化', score: 54, style: '一点集中型', description: '同じ系統に寄せ、明確な強みを伸ばす代わりに対応幅を失う。', attackBonus: 2, guardBonus: 0, burstBonus: 8 };
  }
  const key = [firstId, secondId].sort().join('|');
  const exact = RECIPE_ANALYSIS[key];
  if (exact) {
    return { ...exact, attackBonus: Math.round((exact.score - 50) / 5), guardBonus: ['SURVIVE', 'RISK'].includes(powerFamily(firstId)) && ['SURVIVE', 'RISK'].includes(powerFamily(secondId)) ? 7 : 3, burstBonus: Math.round((exact.score - 45) / 4) };
  }
  const firstFamily = powerFamily(firstId);
  const secondFamily = powerFamily(secondId);
  const complement = firstFamily !== secondFamily && firstFamily !== 'FLEX' && secondFamily !== 'FLEX';
  const score = Math.max(45, Math.min(82, (firstFamily === secondFamily ? 66 : complement ? 73 : 60) + (firstId.includes('GOD') || secondId.includes('GOD') ? 4 : 0)));
  return {
    title: complement ? '異系統オーバードライブ' : '連結未検証モデル',
    score,
    style: complement ? `${firstFamily} × ${secondFamily}` : '自由連結型',
    description: complement ? '系統の異なる強みをつなぐ。試験結果で有効な行動ループを探る。' : '公式レシピ外の構成。安定性と爆発力の差を試すための仮説モデル。',
    attackBonus: Math.round((score - 55) / 6),
    guardBonus: firstFamily === 'SURVIVE' || secondFamily === 'SURVIVE' ? 7 : 2,
    burstBonus: Math.round((score - 40) / 4),
  };
}

export interface ResonanceTrialState {
  playerHp: number;
  enemyHp: number;
  energy: number;
  turn: number;
  combo: number;
  score: number;
  status: PrototypeStatus;
  logs: string[];
}
export type ResonanceIntent = 'PUNISH' | 'FEINT' | 'EXPOSED';
export function getResonanceIntent(turn: number): ResonanceIntent {
  return (['PUNISH', 'FEINT', 'EXPOSED'] as const)[Math.max(0, turn - 1) % 3];
}
export function createResonanceTrialState(): ResonanceTrialState {
  return { playerHp: 100, enemyHp: 230, energy: 0, turn: 1, combo: 0, score: 0, status: 'ACTIVE', logs: ['構築完了。蓄力・防御・攻撃の順を考え、共鳴解放を通せ。'] };
}
export function resolveResonanceTrialTurn(
  state: ResonanceTrialState,
  action: ResonanceTrialAction,
  analysis: ResonancePrototypeAnalysis,
  doctrine: ResonanceDoctrine,
): ResonanceTrialState {
  if (state.status !== 'ACTIVE') return state;
  const intent = getResonanceIntent(state.turn);
  let playerHp = state.playerHp;
  let enemyHp = state.enemyHp;
  let energy = state.energy;
  let combo = state.combo;
  let score = state.score;
  let guarding = false;
  const logs = [...state.logs];
  let damage = 0;
  if (action === 'STRIKE') {
    damage = 15 + analysis.attackBonus + combo * 2 + (intent === 'EXPOSED' ? 10 : 0) + (doctrine === 'BURST' ? 4 : 0);
    combo += 1;
    energy = Math.min(3, energy + 1);
    score += damage;
    logs.push(`通常攻撃。組み合わせ補正込みで${damage}ダメージ。`);
  } else if (action === 'GUARD') {
    guarding = true;
    energy = Math.min(3, energy + 1);
    combo = 0;
    score += 2;
    logs.push('防御。被害を抑えながらエネルギーを1獲得。');
  } else if (action === 'CHARGE') {
    energy = Math.min(3, energy + 2);
    combo = 0;
    logs.push('蓄力。エネルギーを2獲得。');
  } else if (energy >= 3) {
    damage = 30 + analysis.burstBonus + Math.round(analysis.score * 0.18) + (doctrine === 'BURST' ? 12 : 0);
    energy = 0;
    combo = 0;
    score += damage + 10;
    logs.push(`共鳴解放！ ${damage}ダメージ。`);
  } else {
    logs.push('ゲージ不足。まずは蓄力か通常攻撃で3ゲージを確保しよう。');
  }
  enemyHp = Math.max(0, enemyHp - damage);
  if (doctrine === 'EROSION' && enemyHp > 0) {
    enemyHp = Math.max(0, enemyHp - 5);
    score += 5;
    logs.push('侵食が追加で5ダメージ。');
  }
  if (enemyHp <= 0) {
    logs.push('仮想ターゲットを撃破。構成試験クリア。');
    return { ...state, playerHp, enemyHp, energy, combo, score: score + playerHp, status: 'VICTORY', turn: state.turn + 1, logs: logs.slice(-6) };
  }
  const enemyDamage = intent === 'PUNISH' ? 19 : intent === 'FEINT' ? 10 : 0;
  const mitigation = guarding ? 0.65 : 0;
  const doctrineGuard = doctrine === 'SURVIVE' ? 4 : 0;
  const incoming = Math.max(0, Math.round(enemyDamage * (1 - mitigation)) - doctrineGuard);
  playerHp = Math.max(0, playerHp - incoming);
  if (incoming > 0) logs.push(`敵の圧力。HPを${incoming}失った。`);
  if (intent === 'EXPOSED') logs.push('敵の隙を確認。次の攻撃でチャンスを活かせ。');
  const status: PrototypeStatus = playerHp <= 0 ? 'DEFEAT' : 'ACTIVE';
  if (status === 'DEFEAT') logs.push('HPが尽きた。構成を変えて再試験しよう。');
  return { ...state, playerHp, enemyHp, energy, turn: state.turn + 1, combo, score, status, logs: logs.slice(-6) };
}
