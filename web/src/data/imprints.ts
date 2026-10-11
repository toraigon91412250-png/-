import type { ImprintId } from '../types/game';

export const MAX_EQUIPPED_IMPRINTS = 3;

export interface ImprintDefinition {
  id: ImprintId;
  name: string;
  symbol: string;
  category: string;
  description: string;
  trigger: string;
  effect: string;
  usageLimit: string;
}

export const IMPRINT_DEFINITIONS: readonly ImprintDefinition[] = [
  {
    id: 'FORESIGHT',
    name: '見切り',
    symbol: '👁️',
    category: '予告対応',
    description: '敵の危険な行動を読み、その一撃を見切る。',
    trigger: 'CPUが特殊技または必殺技を予告しているターンに「回避」を選ぶ。',
    effect: 'その予告どおりの攻撃に対する回避を、戦闘中最初の1回だけ確定成功にする。',
    usageLimit: '1戦につき1回。戦闘を再開すると再び使用可能。',
  },
  {
    id: 'CHANT_HUNT',
    name: '詠唱狩り',
    symbol: '⛓️',
    category: '行動妨害',
    description: '敵が力を高めようとする瞬間を狙い、強化行動を断ち切る。',
    trigger: '装備中、CPUが「強化」を選んだときに自動発動。',
    effect: 'CPUの強化効果を無効化する。行動自体は解決済みとして扱い、ターン進行は止めない。',
    usageLimit: '戦闘中、CPUの強化行動ごとに発動。',
  },
  {
    id: 'YIN_YANG',
    name: '陰陽転化',
    symbol: '☯️',
    category: '攻防転換',
    description: '陰の守りで敵の一撃を受け流し、陽の力を次の攻撃へ転化する。',
    trigger: '戦闘中に専用行動「陰陽転化」を選択。',
    effect: 'そのターンのCPUから受ける直接ダメージを50%軽減し、次の攻撃系行動に+125ダメージを付与する。',
    usageLimit: '防御効果はそのターンのみ。攻撃強化は次の攻撃系行動で消費し、重複しない。',
  },
  {
    id: 'BLOOD_TEAR',
    name: '血裂',
    symbol: '🩸',
    category: '出血転化',
    description: '出血を付与した瞬間、その残りダメージを凝縮して一気に叩き込む。',
    trigger: 'いれーなの特殊技「羽弾」で出血を付与すると発動。',
    effect: '出血ダメージ×継続ターン×1.5のダメージを即座に与え、出血状態は残さない。',
    usageLimit: '出血系刻印「血媒」と同時装備不可。',
  },
  {
    id: 'BLOOD_MEDIA',
    name: '血媒',
    symbol: '🩸',
    category: '出血転化',
    description: '出血によって与えたダメージを生命力に変換する。',
    trigger: '装備中、相手が出血ダメージを受けたとき。',
    effect: '実際に与えた出血ダメージ分だけ回復。さらに出血付与時の継続ターンを+1する。',
    usageLimit: '出血系刻印「血裂」と同時装備不可。',
  },
  {
    id: 'WIND_GUARD',
    name: '風守り',
    symbol: '🪶',
    category: '蓄積反撃',
    description: '羽弾の蓄積を守りの風へ変え、受け流しながら反撃する。',
    trigger: '羽弾蓄積が1以上ある状態で、CPUから直接ダメージを受ける。',
    effect: '蓄積した羽弾威力に応じて被ダメージを軽減（+50で5%、最大40%）。被弾時に蓄積した羽弾威力の25%で自動反撃を行う。',
    usageLimit: '蓄積は消費しない。出血ダメージなどの継続ダメージは軽減・反撃の対象外。',
  },
  {
    id: 'COSTLY_SHOT',
    name: '代償撃ち',
    symbol: '♻️',
    category: '代償再装填',
    description: '生命力を代償に、特殊技を即座に再使用可能にする。',
    trigger: '特殊技のクールタイム中に専用行動「代償撃ち」を選択する。',
    effect: 'HPを固定値200消費し、特殊技のクールタイムを0にする。発動自体で相手にダメージは与えない。',
    usageLimit: '1ターンを消費する。HPが200以下、または超堕天撃の充填中は使用不可。',
  },
  {
    id: 'FEATHER_SPLIT',
    name: '羽撃ち分け',
    symbol: '🪽',
    category: '技切替',
    description: '羽弾を「穿羽」と「連羽」に切り替え、一撃の威力と回転率を使い分ける。',
    trigger: '装備中、特殊技の選択欄から「穿羽」または「連羽」を選択して羽弾を使用する。',
    effect: '穿羽：与ダメージ×1.30、クールタイム3。連羽：与ダメージ×0.70、クールタイム2。前回と異なるモードで羽弾を使用すると、その攻撃に交互ボーナス+15%。出血など羽弾本来の追加効果は両モードで発動する。',
    usageLimit: 'モードごとにクールタイムを独立管理。交互ボーナスは1回の攻撃にのみ適用し、重複しない。',
  },
] as const;

export function isImprintId(value: unknown): value is ImprintId {
  return IMPRINT_DEFINITIONS.some(imprint => imprint.id === value);
}

export function getImprintDefinition(id: ImprintId): ImprintDefinition {
  return IMPRINT_DEFINITIONS.find(imprint => imprint.id === id) ?? IMPRINT_DEFINITIONS[0];
}
