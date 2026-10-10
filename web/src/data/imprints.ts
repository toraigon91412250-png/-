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
] as const;

export function isImprintId(value: unknown): value is ImprintId {
  return IMPRINT_DEFINITIONS.some(imprint => imprint.id === value);
}

export function getImprintDefinition(id: ImprintId): ImprintDefinition {
  return IMPRINT_DEFINITIONS.find(imprint => imprint.id === id) ?? IMPRINT_DEFINITIONS[0];
}
