export type BattleAction = 'ATTACK' | 'EVADE' | 'BUFF' | 'SPECIAL' | 'ULTIMATE';
/** Player-only command granted by the Yin-Yang Conversion imprint. */
export type PlayerBattleAction = BattleAction | 'YIN_YANG' | 'COSTLY_SHOT';

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

export function getIrenaFeatherMaxChargeCount(skillLevel = 1): number {
  if (skillLevel >= 10) return 13;
  if (skillLevel >= 7) return 11;
  if (skillLevel >= 4) return 9;
  return 7;
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
  // 出血ダメージは付与時のスキルLvを記録し、後続ターンでも同じ威力を維持する。
  dotDamage?: number;
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
  hasSuperFallenShot?: boolean;
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
  buffDamageBonus: number; // 0 when not buffed; default buff is 125
  featherChargeBonus: number; // 0 until Irena's normal attacks build Feather power
  featherChargeCount: number; // number of successful Irena normal attacks since last Feather
  /** Independent cooldowns for the two Feather Split variants; optional for old fighter snapshots. */
  featherPierceCooldownRemaining?: number;
  featherRapidCooldownRemaining?: number;
  /** Last Feather Split mode used during this battle, for the one-hit alternation bonus. */
  lastFeatherSplitMode?: FeatherSplitMode | null;
  isSuperFallenShotCharging: boolean;
  isEvading: boolean;
  isPlayer: boolean;
  activeAilments: ActiveStatusAilment[];
  /** Kaiser-only armor/phase state. Undefined on older or non-Kaiser fighter objects. */
  kaiserArmorCurrent?: number;
  kaiserArmorMax?: number;
  kaiserArmorBrokenTurns?: number;
  kaiserArmorBrokenAtTurn?: number;
  kaiserPhase?: 1 | 2;
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
  if (fighter.isSuperFallenShotCharging) return 0;
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
  | 'SUPER_FALLEN_CHARGE'
  | 'SUPER_FALLEN_SHOT'
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
  /** Actual duration applied by the current hit; omitted for consumed or non-status effects. */
  statusAilmentDuration?: number;
  bannerText: string;
  effectId: number;
}

export type CpuDifficulty = 'NORMAL' | 'EXPERT';

export type BattleChallengeLevel = 10 | 20 | 30 | 40 | 50 | 60 | 70 | 80 | 90 | 100;
export const BATTLE_CHALLENGE_LEVELS: readonly BattleChallengeLevel[] = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

export type AbilityId = 'ABYSS' | 'FALLEN' | 'BLACK_WING' | 'FALLEN_KING' | 'JUDGMENT';

export type ImprintId = 'FORESIGHT' | 'CHANT_HUNT' | 'YIN_YANG' | 'BLOOD_TEAR' | 'BLOOD_MEDIA' | 'WIND_GUARD' | 'COSTLY_SHOT' | 'FEATHER_SPLIT';

export interface ImprintProgress {
  unlockedIds: ImprintId[];
  equippedIds: ImprintId[];
}

export interface AbilityProgress {
  levels: Record<AbilityId, number>;
  shards: Record<AbilityId, number>;
}

export interface EquippedAbility {
  id: AbilityId;
  level: number;
}

export interface StatAllocation {
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface BattleSetupConfig {
  kaiserLevel: BattleChallengeLevel;
  abilities: EquippedAbility[];
  /** Imprints are persisted separately and snapshotted into each battle config. */
  imprints?: ImprintId[];
  // Optional for backwards compatibility with older saved/config objects.
  statAllocation?: StatAllocation;
  statPointTotal?: number;
}

export type IrenaSkillId = 'FEATHER' | 'RUIN';
export type FeatherSplitMode = 'PIERCE' | 'RAPID';
export type IrenaSpecialSkillId = 'FEATHER' | 'FEATHER_PIERCE' | 'FEATHER_RAPID' | 'SUPER_FALLEN_SHOT';
export type FeatherSkillPath = 'ABYSS' | 'JUDGMENT' | 'CHARGE';
export type RuinSkillPath = 'EXECUTION' | 'ANNIHILATION';

export interface IrenaSkillProgress {
  shards: number;
  featherLevel: number;
  ruinLevel: number;
  featherPath: FeatherSkillPath | null;
  ruinPath: RuinSkillPath | null;
  superFallenShotUnlocked?: boolean;
}

export type BattlePhase = 'SELECT_ACTION' | 'EXECUTING_TURNS' | 'BATTLE_FINISHED';

export interface BattleUiState {
  turnNumber: number;
  player: BattleFighter;
  enemy: BattleFighter;
  logs: BattleLog[];
  phase: BattlePhase;
  visualEffect: VisualEffect | null;
  visualEffects: VisualEffect[];
  judgmentReady: boolean;
  winnerIsPlayer: boolean | null;
  cpuDifficulty: CpuDifficulty;
  cpuIntent: BattleAction;
  /** Once-per-battle imprint activations; reset on every new battle. */
  usedImprints: ImprintId[];
  /** Last Yin-Yang action and its confirmed one-hit mitigation, retained for readable battle feedback. */
  yinYangActivatedTurn?: number | null;
  yinYangDefenseResult?: { turn: number; reducedBy: number } | null;
  /** Latest Wind Guard trigger, retained until the next player action for readable feedback. */
  windGuardResult?: { turn: number; reducedBy: number; counterDamage: number; featherChargeBonus: number } | null;
  /** Latest Blood Media healing event for readable combat feedback. */
  bloodMediaHealResult?: { turn: number; amount: number } | null;
  /** Latest Costly Shot activation and health cost. */
  costlyShotResult?: { turn: number; hpSpent: number } | null;
  battleSpeedMultiplier: number;
  isSoundEnabled: boolean;
  isAnimating: boolean;
  lastBattleReward: number;
  lastBattleMasteryReward: number;
  battleConfig: BattleSetupConfig;
}

export interface OverallStats {
  totalBattles: number;
  wins: number;
  losses: number;
}

/** Persistent currency earned only by clearing the standalone raid. */
export interface RaidRewardProgress {
  coreFragments: number;
  /** One free imprint summon per ticket, awarded for each unique raid victory. */
  imprintTickets: number;
  /** Permanent bonus added to the normal battle's stat-allocation pool. */
  bonusStatPoints: number;
  /** Recent raid run IDs that have already paid out a victory reward. */
  claimedVictoryRunIds: string[];
}



export const IRENA_SUPER_FALLEN_SHOT_COOLDOWN = 5;

export function getIrenaSuperFallenShotMultiplier(skillLevel = 1): number {
  return (2.8 + (Math.max(1, skillLevel) - 1) * 0.1) * 2;
}

export type RecruitmentRarity = 'R' | 'SR' | 'SSR' | 'UR';

export interface RecruitmentProgress {
  tickets: number;
  totalPulls: number;
  collectedIds: string[];
  lastResults: string[];
}
