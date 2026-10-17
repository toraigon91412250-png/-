import {
  BattleFighter,
  BattleSetupConfig,
  IrenaSpecialSkillId,
  getEffectiveAttack,
  getEffectiveDefense,
  getIrenaSuperFallenShotMultiplier,
} from '../types/game';
import { GAME_BALANCE } from '../data/gameBalance';
import { resolveKaiserHit } from './kaiserChallenge';
import { getFeatherSplitModeForSkill, resolveFeatherSplitDamage } from './imprintSystem';
import {
  applyDynamicAbilityModifiers,
  applyJudgmentDefense,
  getAbilityLevel,
  getJudgmentDamageMultiplier,
  getJudgmentDefenseIgnore,
  getAchievementBadgeDamageMultiplier,
  hasAbility,
  getEquippedResonanceAbility,
} from './abilitySystem';
import { getResonanceExecutionStats, getResonanceFeatherMultiplier } from './resonanceSystem';

export interface DamagePreviewResolution {
  /** Damage the target will actually lose from current HP. */
  hpDamage: number;
  /** Amount removed from Kaiser armor durability by the same hit. */
  armorDamage: number;
  armorWasActive: boolean;
  armorWasBroken: boolean;
  armorWillBreak: boolean;
  phaseChanged: boolean;
}

/** Resolve an already-calculated hit through the same mitigation/phase rules as live combat. */
export function calculateHitDamagePreview(
  rawDamage: number,
  target: BattleFighter,
  level: BattleSetupConfig['kaiserLevel'],
  turn: number,
  source = '',
): DamagePreviewResolution {
  const safeDamage = Math.max(0, Math.floor(Number.isFinite(rawDamage) ? rawDamage : 0));
  if (target.character.id !== 'kaiser' || target.isPlayer) {
    return {
      hpDamage: Math.min(Math.max(0, target.currentHp), safeDamage),
      armorDamage: 0,
      armorWasActive: false,
      armorWasBroken: false,
      armorWillBreak: false,
      phaseChanged: false,
    };
  }

  const hit = resolveKaiserHit(target, safeDamage, level, turn, true, source);
  return {
    hpDamage: hit.damage,
    armorDamage: hit.armorWasActive ? Math.min(hit.armorBefore, safeDamage) : 0,
    armorWasActive: hit.armorWasActive,
    armorWasBroken: hit.armorWasBroken,
    armorWillBreak: hit.armorBroke,
    phaseChanged: hit.phaseChanged,
  };
}

export interface DamageContext {
  attacker: BattleFighter;
  target: BattleFighter;
  config: BattleSetupConfig;
  turn: number;
  isActingFirst: boolean;
  judgmentReady?: boolean;
  resonanceJudgmentMarks?: number;
  specialSkillId?: IrenaSpecialSkillId;
  ultimateVariant?: 'ALL_GODS' | 'RUIN' | 'OMNIPOTENCE';
  alreadyPrepared?: boolean;
  /** Max HP before turn-dependent ability modifiers are applied. */
  baseAttackerMaxHp?: number;
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
  const resonance = getEquippedResonanceAbility(config);
  const resonanceFallen = resonance && ['FALLEN_WING', 'FALLEN_JUDGMENT', 'ABYSS_FALLEN'].includes(resonance.id);
  if (
    attacker.isPlayer &&
    (hasAbility(config, 'FALLEN') || resonanceFallen) &&
    target.currentHp > 0 &&
    attacker.currentHp > 1 &&
    attacker.currentHp <= baseAttackerMaxHp * 0.05
  ) {
    return target.currentHp;
  }
  return damage;
}

function applyResonanceDefenseIgnore(target: BattleFighter, ignore: number): BattleFighter {
  return {
    ...target,
    character: {
      ...target.character,
      defense: Math.max(0, Math.round(target.character.defense * (1 - Math.min(.95, Math.max(0, ignore))))),
    },
  };
}

function getResonanceExecution(context: DamageContext, allowFeatherOnly = false) {
  if (!context.attacker.isPlayer || !context.judgmentReady) return null;
  const resonance = getEquippedResonanceAbility(context.config);
  if (!resonance) return null;
  if (resonance.id === 'JUDGMENT_WING') {
    return allowFeatherOnly && context.attacker.character.id === 'irena'
      ? getResonanceExecutionStats(resonance.id, resonance.level)
      : null;
  }
  return getResonanceExecutionStats(resonance.id, resonance.level);
}

function applyResonanceExecutionDamage(
  damage: number,
  target: BattleFighter,
  attacker: BattleFighter,
  context: DamageContext,
): number {
  const resonance = getEquippedResonanceAbility(context.config);
  if (!resonance) return damage;
  const stats = getResonanceExecution(context, true);
  if (!stats) return damage;
  let multiplier = stats.multiplier;
  if (resonance.id === 'ABYSS_JUDGMENT') {
    const overflow = Math.max(0, (context.resonanceJudgmentMarks ?? 0) - stats.threshold);
    multiplier += Math.min(stats.overflowMultiplierCap ?? 0, overflow * (stats.overflowMultiplierPerMark ?? 0));
  }
  if (stats.lowHpBonuses) {
    const baseMaxHp = Math.max(1, context.baseAttackerMaxHp ?? attacker.resonanceBaseStats?.maxHp ?? attacker.character.maxHp);
    const hpRatio = attacker.currentHp / baseMaxHp;
    const lowHpBonus = hpRatio <= .10 ? stats.lowHpBonuses[2]
      : hpRatio <= .25 ? stats.lowHpBonuses[1]
        : hpRatio <= .50 ? stats.lowHpBonuses[0] : 0;
    multiplier *= 1 + lowHpBonus;
  }
  return Math.round(damage * multiplier) + Math.round(target.currentHp * stats.currentHpBonus);
}
export function calculateNormalAttackDamage(context: DamageContext, critical = false): number {
  const baseAttackerMaxHp = context.baseAttackerMaxHp ?? context.attacker.character.maxHp;
  let { attacker, target } = prepareFighters(context);
  const judgmentLevel = context.attacker.isPlayer ? getAbilityLevel(context.config, 'JUDGMENT') : 0;
  const judgmentActive = Boolean(context.judgmentReady && judgmentLevel > 0);
  const resonanceExecution = getResonanceExecution(context);
  const damageTarget = resonanceExecution
    ? applyResonanceDefenseIgnore(target, getEquippedResonanceAbility(context.config) ? resonanceExecution.defenseIgnore : 0)
    : judgmentActive ? applyJudgmentDefense(target, judgmentLevel) : target;

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
  } else if (resonanceExecution) {
    damage = applyResonanceExecutionDamage(damage, target, attacker, {
      ...context,
      resonanceJudgmentMarks: context.resonanceJudgmentMarks,
    });
  }

  if (
    target.character.id === 'kaiser' &&
    (target.kaiserArmorCurrent ?? 0) <= 0
  ) {
    // While Ironclad Armor is up its 25% mitigation replaces this flat passive
    // reduction, avoiding accidental double mitigation. Heavy Armor returns
    // once the separate armor gauge is gone.
    damage = Math.max(0, damage - GAME_BALANCE.KAISER_HEAVY_ARMOR_REDUCTION);
  }

  damage = Math.round(damage * (context.attacker.isPlayer ? getAchievementBadgeDamageMultiplier(context.config, 'NORMAL') : 1));
  return Math.max(0, applyFallenExecution(
    damage,
    attacker,
    target,
    context.config,
    baseAttackerMaxHp,
  ));
}

export function calculateSpecialDamage(context: DamageContext): number {
  const baseAttackerMaxHp = context.baseAttackerMaxHp ?? context.attacker.character.maxHp;
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
    const resonance = getEquippedResonanceAbility(context.config);
    const featherMultiplier = attacker.isPlayer && resonance
      ? getResonanceFeatherMultiplier(
          resonance.id,
          resonance.level,
          (attacker.resonanceKingWingStackExpiresAtTurns ?? []).filter(expiresAt => expiresAt >= context.turn).length,
        )
      : null;
    if (featherMultiplier !== null) damage = Math.round(damage * featherMultiplier);
    const execution = getResonanceExecution(context, true);
    if (execution) damage = applyResonanceExecutionDamage(damage, target, attacker, context);
    damage = Math.round(damage * (context.attacker.isPlayer ? getAchievementBadgeDamageMultiplier(context.config, 'SPECIAL') : 1));
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
  const baseSpecialSkillDamage = isIrenaSpecial
    ? attacker.character.talentBaseSpecialSkillDamage ?? attacker.character.specialSkillDamage
    : attacker.character.specialSkillDamage;
  let damage = Math.max(0, baseSpecialSkillDamage + featherChargeBonus - getEffectiveDefense(target));

  if (attacker.isBuffed) {
    damage += attacker.buffDamageBonus || GAME_BALANCE.BUFF_DAMAGE_BONUS;
  }

  const judgmentLevel = attacker.isPlayer ? getAbilityLevel(context.config, 'JUDGMENT') : 0;
  const judgmentActive = Boolean(context.judgmentReady && judgmentLevel > 0);
  const resonance = getEquippedResonanceAbility(context.config);
  const resonanceExecution = isIrenaSpecial ? getResonanceExecution(context, true) : null;
  if (judgmentActive) {
    damage += Math.round(target.character.defense * getJudgmentDefenseIgnore(judgmentLevel));
  } else if (resonanceExecution && resonance) {
    const defenseReducedTarget = applyResonanceDefenseIgnore(target, resonanceExecution.defenseIgnore);
    damage = Math.max(0, damage + getEffectiveDefense(target) - getEffectiveDefense(defenseReducedTarget));
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

  const featherSplitMode = getFeatherSplitModeForSkill(context.specialSkillId);
  if (
    attacker.isPlayer &&
    isIrenaSpecial &&
    featherSplitMode &&
    context.config.imprints?.includes('FEATHER_SPLIT')
  ) {
    damage = resolveFeatherSplitDamage(damage, featherSplitMode, attacker.lastFeatherSplitMode).damage;
  }

  // Resonance feather values replace (rather than stack with) the ingredient's
  // x5 multiplier, and are applied to final feather damage after the other shot effects.
  if (attacker.isPlayer && isIrenaSpecial) {
    damage = Math.round(damage * (attacker.character.talentSpecialDamageMultiplier ?? 1));
    const featherMultiplier = resonance
      ? getResonanceFeatherMultiplier(
          resonance.id,
          resonance.level,
          (attacker.resonanceKingWingStackExpiresAtTurns ?? []).filter(expiresAt => expiresAt >= context.turn).length,
        )
      : null;
    if (featherMultiplier !== null) damage = Math.round(damage * featherMultiplier);
  }

  if (resonanceExecution) {
    damage = applyResonanceExecutionDamage(damage, target, attacker, context);
  }

  damage = Math.round(damage * (context.attacker.isPlayer ? getAchievementBadgeDamageMultiplier(context.config, 'SPECIAL') : 1));
  return Math.max(0, applyFallenExecution(
    damage,
    attacker,
    target,
    context.config,
    baseAttackerMaxHp,
  ));
}

export function calculateUltimateDamage(context: DamageContext): number {
  const baseAttackerMaxHp = context.baseAttackerMaxHp ?? context.attacker.character.maxHp;
  const { attacker, target } = prepareFighters(context);
  const isIrena = attacker.character.id === 'irena';
  // Talent-modified displayed stats are kept for the UI, while this base value
  // lets every ultimate variant (including fixed-power variants and RUIN's
  // minimum damage) receive the same talent multiplier exactly once.
  const baseUltimateSkillDamage = isIrena
    ? attacker.character.talentBaseUltimateSkillDamage ?? attacker.character.ultimateSkillDamage
    : attacker.character.ultimateSkillDamage;
  const talentUltimateDamageMultiplier = isIrena
    ? attacker.character.talentUltimateDamageMultiplier ?? 1
    : 1;
  let damage =
    context.ultimateVariant === 'ALL_GODS'
      ? 0
      : context.ultimateVariant === 'RUIN'
        ? Math.max(900, baseUltimateSkillDamage)
        : context.ultimateVariant === 'OMNIPOTENCE'
          ? GAME_BALANCE.OMNIPOTENCE_DAMAGE
          : baseUltimateSkillDamage;

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

  // Apply the talent to the complete ultimate base, including RUIN's bonus
  // and OMNIPOTENCE's fixed base damage, before independent buff/judgment effects.
  damage = Math.round(damage * talentUltimateDamageMultiplier);

  if (attacker.isBuffed) {
    damage += attacker.buffDamageBonus || (
      context.ultimateVariant === 'OMNIPOTENCE'
        ? GAME_BALANCE.OMNIPOTENCE_BUFF_DAMAGE
        : GAME_BALANCE.BUFF_DAMAGE_BONUS
    );
  }

  const judgmentLevel = attacker.isPlayer ? getAbilityLevel(context.config, 'JUDGMENT') : 0;
  const judgmentActive = Boolean(context.judgmentReady && judgmentLevel > 0);
  const resonanceExecution = getResonanceExecution(context);
  if (judgmentActive) {
    const damageTarget = applyJudgmentDefense(target, judgmentLevel);
    damage += Math.max(0, getEffectiveDefense(target) - getEffectiveDefense(damageTarget));
    damage = Math.round(damage * getJudgmentDamageMultiplier(judgmentLevel));
  } else if (resonanceExecution) {
    const defenseReducedTarget = applyResonanceDefenseIgnore(target, resonanceExecution.defenseIgnore);
    damage += Math.max(0, getEffectiveDefense(target) - getEffectiveDefense(defenseReducedTarget));
    damage = applyResonanceExecutionDamage(damage, target, attacker, context);
  }

  damage = Math.round(damage * (context.attacker.isPlayer ? getAchievementBadgeDamageMultiplier(context.config, 'ULTIMATE') : 1));
  return Math.max(0, applyFallenExecution(
    damage,
    attacker,
    target,
    context.config,
    baseAttackerMaxHp,
  ));
}
