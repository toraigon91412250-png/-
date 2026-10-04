export type BattleAction = 'ATTACK' | 'EVADE' | 'BUFF' | 'SPECIAL' | 'ULTIMATE';

export const IRENA_FEATHER_CHARGE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [60, 80],
  [40, 60],
  [30, 50],
  [20, 40],
  [15, 35],
  [10, 30],
  [5, 25],
];

export function getIrenaFeatherChargeRange(chargeCount: number): readonly [number, number] {
  return IRENA_FEATHER_CHARGE_RANGES[Math.min(Math.max(chargeCount, 0), IRENA_FEATHER_CHARGE_RANGES.length - 1)];
}

export function rollIrenaFeatherChargeGain(chargeCount: number): number {
  const [min, max] = getIrenaFeatherChargeRange(chargeCount);
  const stepCount = Math.floor((max - min) / 5);
  return min + Math.floor(Math.random() * (stepCount + 1)) * 5;
}

export type StatusAilmentType = 'BLEED' | 'PRESSURE';

export interface StatusAilmentDef {
  type: StatusAilmentType;
  displayName: string;
  defaultDuration: number;
  dotDamage: number;
  speedMod: number;
  defenseMod: number;
  attackMod: number;
  description: string;
}

export const STATUS_AILMENTS: Record<StatusAilmentType, StatusAilmentDef> = {
  BLEED: {
    type: 'BLEED',
    displayName: '出血',
    defaultDuration: 3,
    dotDamage: 30,
    speedMod: -20,
    defenseMod: -20,
    attackMod: 0,
    description: '各ターン開始時に30ダメージ、速度-20、防御-20',
  },
  PRESSURE: {
    type: 'PRESSURE',
    displayName: '重圧',
    defaultDuration: 2,
    dotDamage: 0,
    speedMod: -25,
    defenseMod: 0,
    attackMod: -25,
    description: '速度-25、攻撃力-25',
  },
};

export interface ActiveStatusAilment {
  type: StatusAilmentType;
  remainingTurns: number;
}

export interface CharacterDef {
  id: string;
  name: string;
  title: string;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  evasionRate: number; // e.g. 0.25 (25%) for Irena, 0.10 (10%) for Kaiser
  passiveName: string;
  passiveDescription: string;
  specialSkillName: string;
  specialSkillDamage: number;
  specialSkillCooldown: number;
  specialSkillDescription: string;
  ultimateSkillName: string;
  ultimateSkillDamage: number;
  ultimateSlogan: string;
  imageSrc: string;
  selectImageSrc?: string; // キャラ選択画面用（未指定なら imageSrc）
  iconImageSrc?: string; // 戦闘中ミニアイコン用（未指定なら imageSrc）
  specialCutInSrc?: string; // 特殊技カットイン用（未指定ならカットインなし）
  primaryColor: string;
  secondaryColor: string;
  featherSkillPath?: FeatherSkillPath | null;
  ruinSkillPath?: RuinSkillPath | null;
  featherSkillLevel?: number;
  ruinSkillLevel?: number;
}

export interface BattleFighter {
  character: CharacterDef;
  currentHp: number;
  specialCooldownRemaining: number;
  ultimateGauge: number; // 0..3
  isBuffed: boolean;
  buffDamageBonus: number; // 0 when not buffed; default buff is 50
  featherChargeBonus: number; // 0 until Irena's normal attacks build Feather power
  featherChargeCount: number; // number of successful Irena normal attacks since last Feather
  isEvading: boolean;
  isPlayer: boolean;
  activeAilments: ActiveStatusAilment[];
}

export function getEffectiveSpeed(fighter: BattleFighter): number {
  const mod = fighter.activeAilments.reduce((sum, a) => sum + STATUS_AILMENTS[a.type].speedMod, 0);
  return Math.max(1, fighter.character.speed + mod);
}

export function getEffectiveAttack(fighter: BattleFighter): number {
  const mod = fighter.activeAilments.reduce((sum, a) => sum + STATUS_AILMENTS[a.type].attackMod, 0);
  return Math.max(1, fighter.character.attack + mod);
}

export function getEffectiveDefense(fighter: BattleFighter): number {
  const mod = fighter.activeAilments.reduce((sum, a) => sum + STATUS_AILMENTS[a.type].defenseMod, 0);
  return Math.max(0, fighter.character.defense + mod);
}

export type LogType =
  | 'SYSTEM'
  | 'PLAYER_ACTION'
  | 'ENEMY_ACTION'
  | 'CRITICAL_PLAYER'
  | 'CRITICAL_ENEMY'
  | 'DAMAGE_PLAYER'
  | 'DAMAGE_ENEMY'
  | 'EVADE_SUCCESS_PLAYER'
  | 'EVADE_SUCCESS_ENEMY'
  | 'EVADE_FAIL_PLAYER'
  | 'EVADE_FAIL_ENEMY'
  | 'BUFF_PLAYER'
  | 'BUFF_ENEMY'
  | 'SPECIAL_PLAYER'
  | 'SPECIAL_ENEMY'
  | 'ULTIMATE_PLAYER'
  | 'ULTIMATE_ENEMY'
  | 'GAUGE_CHANGE'
  | 'PASSIVE_TRIGGER'
  | 'AILMENT_APPLIED'
  | 'AILMENT_DOT'
  | 'AILMENT_EXPIRED'
  | 'VICTORY'
  | 'DEFEAT';

export interface BattleLog {
  id: number;
  turn: number;
  text: string;
  type: LogType;
  timestamp: number;
}

export type EffectType =
  | 'NONE'
  | 'NORMAL_HIT'
  | 'EVADE_DODGE'
  | 'BUFF_POWER'
  | 'SPECIAL_FEATHER'
  | 'SPECIAL_SMASH'
  | 'ULTIMATE_BLAST'
  | 'BLEED_TICK'
  | 'PRESSURE_DEBUFF';

export interface VisualEffect {
  targetIsPlayer: boolean;
  damage: number;
  effectType: EffectType;
  isCritical: boolean;
  isEvade: boolean;
  isBuff: boolean;
  isUltimate: boolean;
  actorName: string;
  skillName: string;
  statusAilmentName: string;
  bannerText: string;
  effectId: number;
}

export type CpuDifficulty = 'NORMAL' | 'EXPERT';

export type IrenaSkillId = 'FEATHER' | 'RUIN';
export type FeatherSkillPath = 'ABYSS' | 'JUDGMENT' | 'CHARGE';
export type RuinSkillPath = 'EXECUTION' | 'ANNIHILATION';

export interface IrenaSkillProgress {
  shards: number;
  featherLevel: number;
  ruinLevel: number;
  featherPath: FeatherSkillPath | null;
  ruinPath: RuinSkillPath | null;
}

export type BattlePhase = 'SELECT_ACTION' | 'EXECUTING_TURNS' | 'BATTLE_FINISHED';

export interface BattleUiState {
  turnNumber: number;
  player: BattleFighter;
  enemy: BattleFighter;
  logs: BattleLog[];
  phase: BattlePhase;
  visualEffect: VisualEffect | null;
  winnerIsPlayer: boolean | null;
  cpuDifficulty: CpuDifficulty;
  cpuIntent: BattleAction;
  battleSpeedMultiplier: number;
  isSoundEnabled: boolean;
  isAnimating: boolean;
}

export interface OverallStats {
  totalBattles: number;
  wins: number;
  losses: number;
}
