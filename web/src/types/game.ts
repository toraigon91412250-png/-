export type BattleAction = 'ATTACK' | 'EVADE' | 'BUFF' | 'SPECIAL' | 'ULTIMATE';

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
    dotDamage: 50,
    speedMod: -20,
    defenseMod: -20,
    attackMod: 0,
    description: '各ターン開始時に50ダメージ、速度-20、防御-20',
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
  primaryColor: string;
  secondaryColor: string;
}

export interface BattleFighter {
  character: CharacterDef;
  currentHp: number;
  specialCooldownRemaining: number;
  ultimateGauge: number; // 0..3
  isBuffed: boolean;
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
  battleSpeedMultiplier: number;
  isSoundEnabled: boolean;
  isAnimating: boolean;
}

export interface OverallStats {
  totalBattles: number;
  wins: number;
  losses: number;
}
