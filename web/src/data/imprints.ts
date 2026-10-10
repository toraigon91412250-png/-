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
] as const;

export function isImprintId(value: unknown): value is ImprintId {
  return IMPRINT_DEFINITIONS.some(imprint => imprint.id === value);
}

export function getImprintDefinition(id: ImprintId): ImprintDefinition {
  return IMPRINT_DEFINITIONS.find(imprint => imprint.id === id) ?? IMPRINT_DEFINITIONS[0];
}
