import {
  BattleFighter,
  BattleSetupConfig,
  IrenaSpecialSkillId,
  getEffectiveAttack,
  getEffectiveDefense,
  getIrenaSuperFallenShotMultiplier,
} from '../types/game';
import { GAME_BALANCE } from '../data/gameBalance';
import {
  applyDynamicAbilityModifiers,
  applyJudgmentDefense,
  getAbilityLevel,
  getJudgmentDamageMultiplier,
  getJudgmentDefenseIgnore,
  hasAbility,
} from './abilitySystem';

export interface DamageContext {
  attacker: BattleFighter;
  target: BattleFighter;
  config: BattleSetupConfig;
  turn: number;
  isActingFirst: boolean;
  judgmentReady?: boolean;
  specialSkillId?: IrenaSpecialSkillId;
  ultimateVariant?: 'ALL_GODS' | 'RUIN' | 'OMNIPOTENCE';
  alreadyPrepared?: boolean;
}

function prepareFighters(context: DamageContext): { attacker: BattleFighter; target: BattleFighter } {
  if (context.alreadyPrepared) {
    return { attacker: context.attacker, target: context.target };
  }

  return {
    attacker: applyDynamicAbilityModifiers(context.attacker, context.config, context.turn),
    target: applyDynamicAbilityModifiers(context.target, context.config, context.turn),
  };
}

function applyFallenExecution(
  damage: number,
  attacker: BattleFighter,
  target: BattleFighter,
  config: BattleSetupConfig,
  baseAttackerMaxHp: number,
): number {
  if (
    attacker.isPlayer &&
    hasAbility(config, 'FALLEN') &&
    target.currentHp > 0 &&
    attacker.currentHp > 1 &&
    attacker.currentHp <= baseAttackerMaxHp * 0.05
  ) {
    return target.currentHp;
  }
  return damage;
}

export function calculateNormalAttackDamage(context: DamageContext, critical = false): number {
  const baseAttackerMaxHp = context.attacker.character.maxHp;
  let { attacker, target } = prepareFighters(context);
  const judgmentLevel = context.attacker.isPlayer ? getAbilityLevel(context.config, 'JUDGMENT') : 0;
  const judgmentActive = Boolean(context.judgmentReady && judgmentLevel > 0);
  const damageTarget = judgmentActive ? applyJudgmentDefense(target, judgmentLevel) : target;

  let damage = Math.max(
    GAME_BALANCE.MIN_NORMAL_DAMAGE,
    getEffectiveAttack(attacker) - getEffectiveDefense(damageTarget),
  );

  if (attacker.character.id === 'irena' && context.isActingFirst) {
    damage += GAME_BALANCE.IRENA_PRECOGNITION_BONUS;
  }

  if (attacker.isBuffed) {
    damage += attacker.buffDamageBonus || GAME_BALANCE.BUFF_DAMAGE_BONUS;
  }

  if (critical) {
    damage = Math.round(damage * GAME_BALANCE.CRITICAL_MULTIPLIER);
  }

  if (judgmentActive) {
    damage = Math.round(damage * getJudgmentDamageMultiplier(judgmentLevel))
      + Math.round(target.currentHp * GAME_BALANCE.JUDGMENT_MAX_HP_BONUS);
  }

  if (target.character.id === 'kaiser') {
    damage = Math.max(0, damage - GAME_BALANCE.KAISER_HEAVY_ARMOR_REDUCTION);
  }

  return Math.max(0, applyFallenExecution(
    damage,
    attacker,
    target,
    context.config,
    baseAttackerMaxHp,
  ));
}

export function calculateSpecialDamage(context: DamageContext): number {
  const baseAttackerMaxHp = context.attacker.character.maxHp;
  const { attacker, target } = prepareFighters(context);
  const isSuperFallenShot = context.specialSkillId === 'SUPER_FALLEN_SHOT';

  if (isSuperFallenShot) {
    let damage = Math.max(
      0,
      Math.round(getEffectiveAttack(attacker) * (
        getIrenaSuperFallenShotMultiplier(attacker.character.featherSkillLevel || 1)
      ) - getEffectiveDefense(target)),
    );

    if (attacker.isBuffed) {
      damage += attacker.buffDamageBonus || GAME_BALANCE.BUFF_DAMAGE_BONUS;
    }

    return Math.max(0, applyFallenExecution(
      damage,
      attacker,
      target,
      context.config,
      baseAttackerMaxHp,
    ));
  }

  const isIrenaSpecial = attacker.character.id === 'irena';
  const skillLevel = attacker.character.featherSkillLevel || 1;
  const skillPath = attacker.character.featherSkillPath || null;
  const featherChargeBonus = isIrenaSpecial ? attacker.featherChargeBonus : 0;
  let damage = attacker.character.specialSkillDamage + featherChargeBonus;

  if (attacker.isBuffed) {
    damage += attacker.buffDamageBonus || GAME_BALANCE.BUFF_DAMAGE_BONUS;
  }

  const judgmentLevel = attacker.isPlayer ? getAbilityLevel(context.config, 'JUDGMENT') : 0;
  const judgmentActive = Boolean(context.judgmentReady && judgmentLevel > 0);
  if (judgmentActive) {
    damage += Math.round(target.character.defense * getJudgmentDefenseIgnore(judgmentLevel));
  }

  if (isIrenaSpecial && getAbilityLevel(context.config, 'BLACK_WING') >= 5) {
    damage = Math.round(damage * 5);
  }

  if (
    isIrenaSpecial &&
    skillLevel >= 4 &&
    skillPath === 'ABYSS' &&
    featherChargeBonus >= 150
  ) {
    damage += 100 + Math.max(0, skillLevel - 4) * 25;
  }

  if (
    isIrenaSpecial &&
    skillLevel >= 4 &&
    skillPath === 'JUDGMENT' &&
    target.activeAilments.some(ailment => ailment.type === 'BLEED')
  ) {
    damage += 100 + Math.max(0, skillLevel - 4) * 25;
  }

  if (judgmentActive) {
    damage = Math.round(damage * getJudgmentDamageMultiplier(judgmentLevel))
      + Math.round(target.currentHp * GAME_BALANCE.JUDGMENT_MAX_HP_BONUS);
  }

  return Math.max(0, applyFallenExecution(
    damage,
    attacker,
    target,
    context.config,
    baseAttackerMaxHp,
  ));
}

export function calculateUltimateDamage(context: DamageContext): number {
  const baseAttackerMaxHp = context.attacker.character.maxHp;
  const { attacker, target } = prepareFighters(context);
  const isIrena = attacker.character.id === 'irena';
  let damage =
    context.ultimateVariant === 'ALL_GODS'
      ? 0
      : context.ultimateVariant === 'RUIN'
        ? Math.max(900, attacker.character.ultimateSkillDamage)
        : context.ultimateVariant === 'OMNIPOTENCE'
          ? GAME_BALANCE.OMNIPOTENCE_DAMAGE
          : attacker.character.ultimateSkillDamage;

  if (isIrena && context.ultimateVariant === 'RUIN') {
    const ruinLevel = attacker.character.ruinSkillLevel || 1;
    const ruinPath = attacker.character.ruinSkillPath || null;

    if (
      ruinLevel >= 4 &&
      ruinPath === 'EXECUTION' &&
      target.currentHp <= target.character.maxHp * (ruinLevel >= 10 ? 0.5 : ruinLevel >= 7 ? 0.45 : 0.4)
    ) {
      damage += 150 + Math.max(0, ruinLevel - 4) * 30;
    } else if (
      ruinLevel >= 4 &&
      ruinPath === 'ANNIHILATION' &&
      target.activeAilments.some(ailment => ailment.type === 'BLEED')
    ) {
      damage += 150 + Math.max(0, ruinLevel - 4) * 30;
    }
  }

  if (context.ultimateVariant === 'ALL_GODS') return 0;

  if (attacker.isBuffed) {
    damage += attacker.buffDamageBonus || (
      context.ultimateVariant === 'OMNIPOTENCE'
        ? GAME_BALANCE.OMNIPOTENCE_BUFF_DAMAGE
        : GAME_BALANCE.BUFF_DAMAGE_BONUS
    );
  }

  const judgmentLevel = attacker.isPlayer ? getAbilityLevel(context.config, 'JUDGMENT') : 0;
  const judgmentActive = Boolean(context.judgmentReady && judgmentLevel > 0);
  if (judgmentActive) {
    const damageTarget = applyJudgmentDefense(target, judgmentLevel);
    damage += Math.max(
      0,
      getEffectiveDefense(target) - getEffectiveDefense(damageTarget),
    );
    damage = Math.round(damage * getJudgmentDamageMultiplier(judgmentLevel));
  }

  return Math.max(0, applyFallenExecution(
    damage,
    attacker,
    target,
    context.config,
    baseAttackerMaxHp,
  ));
}
