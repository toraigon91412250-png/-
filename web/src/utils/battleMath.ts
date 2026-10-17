import {
  BattleFighter,
  BattleSetupConfig,
  IrenaSpecialSkillId,
  ResonanceAbilityId,
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
} from './abilitySystem';
import { getEquippedResonanceAbilities, getKingWingStackValues, getResonanceExecutionStats } from './resonanceSystem';
import { isResonanceAbilityId } from '../data/resonanceAbilities';

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
  resonanceJudgmentMarks?: Partial<Record<ResonanceAbilityId, number>>;
  resonanceJudgmentReadyIds?: ResonanceAbilityId[];
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

function isResonanceAbilityIdForGod(config: BattleSetupConfig): boolean {
  return config.abilities.some(ability => isResonanceAbilityId(ability.id) && ability.id === 'FALLEN_GOD' && ability.level > 0);
}

function applyFallenExecution(
  damage: number,
  attacker: BattleFighter,
  target: BattleFighter,
  config: BattleSetupConfig,
  baseAttackerMaxHp: number,
): number {
  const resonance = getEquippedResonanceAbilities(config).find(ability => ability.id === 'FALLEN_WING' || ability.id === 'FALLEN_JUDGMENT' || ability.id === 'ABYSS_FALLEN' || ability.id === 'FALLEN_GOD');
  const resonanceFallen = resonance && ['FALLEN_WING', 'FALLEN_JUDGMENT', 'ABYSS_FALLEN'].includes(resonance.id);
  if (
    attacker.isPlayer &&
    (hasAbility(config, 'FALLEN') || resonanceFallen || getEquippedResonanceAbilities(config).some(ability => ability.id === 'FALLEN_GOD')) &&
    target.currentHp > 0 &&
    attacker.currentHp > 1 &&
    attacker.currentHp <= baseAttackerMaxHp * 0.05
  ) {
    return target.currentHp;
  }
  return damage;
}

function getResonanceExecutions(context: DamageContext, allowFeatherOnly = false) {
  if (!context.attacker.isPlayer || !context.resonanceJudgmentReadyIds?.length) return [];
  const ready = new Set(context.resonanceJudgmentReadyIds);
  return getEquippedResonanceAbilities(context.config)
    .filter(resonance => ready.has(resonance.id))
    .filter(resonance => resonance.id !== 'JUDGMENT_WING'
      || (allowFeatherOnly && context.attacker.character.id === 'irena'
        && ['FEATHER', 'FEATHER_PIERCE', 'FEATHER_RAPID', 'SUPER_FALLEN_SHOT'].includes(context.specialSkillId ?? '')))
    .map(resonance => {
      const stats = getResonanceExecutionStats(resonance.id, resonance.level);
      return stats ? { id: resonance.id, level: resonance.level, stats } : null;
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}

function applyResonanceDefenseIgnore(target: BattleFighter, ignores: readonly number[]): BattleFighter {
  const remainingDefense = ignores.reduce((remaining, ignore) => remaining * (1 - Math.min(.95, Math.max(0, ignore))), 1);
  return {
    ...target,
    character: {
      ...target.character,
      defense: Math.max(0, Math.round(target.character.defense * remainingDefense)),
    },
  };
}

function applyResonanceExecutionDamage(
  damage: number,
  target: BattleFighter,
  attacker: BattleFighter,
  context: DamageContext,
  allowFeatherOnly = false,
): number {
  const executions = getResonanceExecutions(context, allowFeatherOnly);
  if (!executions.length) return damage;
  let multiplier = 1;
  let currentHpBonus = 0;
  const baseMaxHp = Math.max(1, context.baseAttackerMaxHp ?? attacker.resonanceBaseStats?.maxHp ?? attacker.character.maxHp);
  const hpRatio = attacker.currentHp / baseMaxHp;

  for (const execution of executions) {
    const stats = execution.stats;
    let currentMultiplier = stats.multiplier;
    if (execution.id === 'ABYSS_JUDGMENT') {
      const marks = context.resonanceJudgmentMarks?.[execution.id] ?? 0;
      const overflow = Math.max(0, marks - stats.threshold);
      currentMultiplier += Math.min(stats.overflowMultiplierCap ?? 0, overflow * (stats.overflowMultiplierPerMark ?? 0));
    }
    if (execution.id === 'FALLEN_JUDGMENT' && stats.lowHpBonuses) {
      const lowHpBonus = hpRatio <= .10 ? stats.lowHpBonuses[2]
        : hpRatio <= .25 ? stats.lowHpBonuses[1]
          : hpRatio <= .50 ? stats.lowHpBonuses[0] : 0;
      currentMultiplier *= 1 + lowHpBonus;
    }
    multiplier *= currentMultiplier;
    currentHpBonus += stats.currentHpBonus;
  }

  return Math.round(damage * multiplier) + Math.round(target.currentHp * currentHpBonus);
}

function getResonanceFeatherDamageFactor(config: BattleSetupConfig, attacker: BattleFighter, turn: number): number {
  const resonances = getEquippedResonanceAbilities(config);
  if (!resonances.length) return 1;
  const activeKingWingStacks = (attacker.resonanceKingWingStackExpiresAtTurns ?? []).filter(expiresAt => expiresAt >= turn).length;
  const baseMultipliers = resonances.map(resonance => {
    const levelIndex = Math.min(5, Math.max(1, Math.floor(resonance.level))) - 1;
    if (resonance.id === 'FALLEN_WING') return [6, 7, 8, 9, 10][levelIndex];
    if (resonance.id === 'JUDGMENT_WING') return [6, 8, 10, 12, 15][levelIndex];
    if (resonance.id === 'ABYSS_WING') return [6, 7, 8, 9, 10][levelIndex];
    if (resonance.id === 'KING_WING') return 5;
    return 1;
  });
  const bestBaseMultiplier = Math.max(1, ...baseMultipliers);
  const kingWing = resonances.find(resonance => resonance.id === 'KING_WING');
  if (!kingWing || activeKingWingStacks <= 0) return bestBaseMultiplier;
  const stackValues = getKingWingStackValues(kingWing.level);
  return bestBaseMultiplier * (1 + Math.min(stackValues.maxStacks, activeKingWingStacks) * stackValues.damagePerStack);
}

export function calculateNormalAttackDamage(context: DamageContext, critical = false): number {
  const baseAttackerMaxHp = context.baseAttackerMaxHp ?? context.attacker.character.maxHp;
  let { attacker, target } = prepareFighters(context);
  const judgmentLevel = context.attacker.isPlayer ? getAbilityLevel(context.config, 'JUDGMENT') : 0;
  const judgmentActive = Boolean(context.judgmentReady && judgmentLevel > 0);
  const resonanceExecutions = getResonanceExecutions(context);
  const defenseIgnores = resonanceExecutions.map(execution => execution.stats.defenseIgnore);
  if (judgmentActive) defenseIgnores.push(getJudgmentDefenseIgnore(judgmentLevel));
  const damageTarget = defenseIgnores.length
    ? applyResonanceDefenseIgnore(target, defenseIgnores)
    : target;

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
  if (critical) damage = Math.round(damage * GAME_BALANCE.CRITICAL_MULTIPLIER);

  if (judgmentActive) {
    damage = Math.round(damage * getJudgmentDamageMultiplier(judgmentLevel))
      + Math.round(target.currentHp * GAME_BALANCE.JUDGMENT_MAX_HP_BONUS);
  }

  if (
    target.character.id === 'kaiser' &&
    (target.kaiserArmorCurrent ?? 0) <= 0
  ) {
    // Preserve the existing Heavy Armor flat reduction once its separate
    // armor gauge is empty. The armor/phase resolver still handles each hit.
    damage = Math.max(0, damage - GAME_BALANCE.KAISER_HEAVY_ARMOR_REDUCTION);
  }

  damage = Math.round(damage * (context.attacker.isPlayer ? getAchievementBadgeDamageMultiplier(context.config, 'NORMAL') : 1));
  damage = applyResonanceExecutionDamage(damage, target, attacker, context);
  return Math.max(0, applyFallenExecution(damage, attacker, target, context.config, baseAttackerMaxHp));
}
export function calculateSpecialDamage(context: DamageContext): number {
  const baseAttackerMaxHp = context.baseAttackerMaxHp ?? context.attacker.character.maxHp;
  const { attacker, target } = prepareFighters(context);
  const isSuperFallenShot = context.specialSkillId === 'SUPER_FALLEN_SHOT';
  const isIrenaSpecial = attacker.character.id === 'irena';
  const judgmentLevel = attacker.isPlayer ? getAbilityLevel(context.config, 'JUDGMENT') : 0;
  const judgmentActive = Boolean(context.judgmentReady && judgmentLevel > 0);
  const resonanceExecutions = isIrenaSpecial ? getResonanceExecutions(context, true) : [];
  const defenseIgnores = resonanceExecutions.map(execution => execution.stats.defenseIgnore);
  if (judgmentActive) defenseIgnores.push(getJudgmentDefenseIgnore(judgmentLevel));
  const damageTarget = defenseIgnores.length
    ? applyResonanceDefenseIgnore(target, defenseIgnores)
    : target;

  if (isSuperFallenShot) {
    let damage = Math.max(
      0,
      Math.round(getEffectiveAttack(attacker) * getIrenaSuperFallenShotMultiplier(attacker.character.featherSkillLevel || 1)
        - getEffectiveDefense(damageTarget)),
    );
    if (attacker.isBuffed) damage += attacker.buffDamageBonus || GAME_BALANCE.BUFF_DAMAGE_BONUS;
    if (judgmentActive) {
      damage = Math.round(damage * getJudgmentDamageMultiplier(judgmentLevel))
        + Math.round(target.currentHp * GAME_BALANCE.JUDGMENT_MAX_HP_BONUS);
    }
    const featherFactor = attacker.isPlayer ? getResonanceFeatherDamageFactor(context.config, attacker, context.turn) : 1;
    if (featherFactor > 1) damage = Math.round(damage * featherFactor);
    damage = applyResonanceExecutionDamage(damage, target, attacker, context, true);
    damage = Math.round(damage * (context.attacker.isPlayer ? getAchievementBadgeDamageMultiplier(context.config, 'SPECIAL') : 1));
    return Math.max(0, applyFallenExecution(damage, attacker, target, context.config, baseAttackerMaxHp));
  }

  const skillLevel = attacker.character.featherSkillLevel || 1;
  const skillPath = attacker.character.featherSkillPath || null;
  const featherChargeBonus = isIrenaSpecial ? attacker.featherChargeBonus : 0;
  const baseSpecialSkillDamage = isIrenaSpecial
    ? attacker.character.talentBaseSpecialSkillDamage ?? attacker.character.specialSkillDamage
    : attacker.character.specialSkillDamage;
  let damage = Math.max(0, baseSpecialSkillDamage + featherChargeBonus - getEffectiveDefense(damageTarget));

  if (attacker.isBuffed) damage += attacker.buffDamageBonus || GAME_BALANCE.BUFF_DAMAGE_BONUS;

  if (judgmentActive) {
    damage = Math.round(damage * getJudgmentDamageMultiplier(judgmentLevel))
      + Math.round(target.currentHp * GAME_BALANCE.JUDGMENT_MAX_HP_BONUS);
  }

  if (isIrenaSpecial && getAbilityLevel(context.config, 'BLACK_WING') >= 5) {
    damage = Math.round(damage * 5);
  }
  if (isIrenaSpecial && skillLevel >= 4 && skillPath === 'ABYSS' && featherChargeBonus >= 150) {
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

  const featherSplitMode = getFeatherSplitModeForSkill(context.specialSkillId);
  if (attacker.isPlayer && isIrenaSpecial && featherSplitMode && context.config.imprints?.includes('FEATHER_SPLIT')) {
    damage = resolveFeatherSplitDamage(damage, featherSplitMode, attacker.lastFeatherSplitMode).damage;
  }

  if (attacker.isPlayer && isIrenaSpecial) {
    damage = Math.round(damage * (attacker.character.talentSpecialDamageMultiplier ?? 1));
    const featherFactor = getResonanceFeatherDamageFactor(context.config, attacker, context.turn);
    if (featherFactor > 1) damage = Math.round(damage * featherFactor);
  }

  damage = applyResonanceExecutionDamage(damage, target, attacker, context, true);
  damage = Math.round(damage * (context.attacker.isPlayer ? getAchievementBadgeDamageMultiplier(context.config, 'SPECIAL') : 1));
  return Math.max(0, applyFallenExecution(damage, attacker, target, context.config, baseAttackerMaxHp));
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
  const resonanceExecutions = getResonanceExecutions(context);
  const defenseIgnores = resonanceExecutions.map(execution => execution.stats.defenseIgnore);
  if (judgmentActive) defenseIgnores.push(getJudgmentDefenseIgnore(judgmentLevel));
  if (defenseIgnores.length) {
    const damageTarget = applyResonanceDefenseIgnore(target, defenseIgnores);
    damage += Math.max(0, getEffectiveDefense(target) - getEffectiveDefense(damageTarget));
  }
  if (judgmentActive) damage = Math.round(damage * getJudgmentDamageMultiplier(judgmentLevel));
  damage = applyResonanceExecutionDamage(damage, target, attacker, context);

  damage = Math.round(damage * (context.attacker.isPlayer ? getAchievementBadgeDamageMultiplier(context.config, 'ULTIMATE') : 1));
  return Math.max(0, applyFallenExecution(
    damage,
    attacker,
    target,
    context.config,
    baseAttackerMaxHp,
  ));
}
