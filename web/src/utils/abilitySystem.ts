import { AbilityId, BattleChallengeLevel, BattleFighter, BattleSetupConfig, CharacterDef, EquippedAbility } from '../types/game';
import { MAX_ABILITY_LEVEL } from '../data/abilities';
import { applyStatAllocation } from './statBuild';

export function getAbilityLevel(config: BattleSetupConfig, id: AbilityId): number {
  return Math.min(
    MAX_ABILITY_LEVEL,
    Math.max(0, config.abilities.find(ability => ability.id === id)?.level ?? 0),
  );
}

export function hasAbility(config: BattleSetupConfig, id: AbilityId): boolean {
  return getAbilityLevel(config, id) > 0;
}

export function getKaiserLevelMultiplier(level: BattleChallengeLevel): number {
  // Lv10 is the baseline. Growth is intentionally capped at 2x by Lv100
  // so higher difficulty comes from a manageable stat increase rather than runaway values.
  const progress = (level - 10) / 90;
  return 1 + Math.min(1, Math.max(0, progress));
}

export function createKaiserForLevel(base: CharacterDef, level: BattleChallengeLevel): CharacterDef {
  const multiplier = getKaiserLevelMultiplier(level);
  const progress = multiplier - 1;
  const scale = (value: number) => Math.max(1, Math.round(value * multiplier));

  // Defense grows more slowly than HP/offense so higher levels stay threatening
  // without turning normal attacks into an excessive damage wall.
  const defenseMultiplier = 1 + progress * 0.5;
  const scaleDefense = (value: number) => Math.max(0, Math.round(value * defenseMultiplier));

  return {
    ...base,
    maxHp: scale(base.maxHp),
    attack: scale(base.attack),
    defense: scaleDefense(base.defense),
    speed: scale(base.speed),
    specialSkillDamage: scale(base.specialSkillDamage),
    ultimateSkillDamage: scale(base.ultimateSkillDamage),
  };
}

export function applyStaticAbilityModifiers(character: CharacterDef, config: BattleSetupConfig): CharacterDef {
  const blackWingLevel = getAbilityLevel(config, 'BLACK_WING');
  const fallenKingLevel = getAbilityLevel(config, 'FALLEN_KING');
  let next: CharacterDef = { ...character };

  if (blackWingLevel > 0 && character.id === 'irena') {
    const statMultiplier = 1 + blackWingLevel * 0.02;
    // Lv5's x5 effect is applied to the final Feather Shot damage in battleMath.
    // Do not multiply the base special-skill value here as well.
    const featherMultiplier = blackWingLevel >= 5 ? 1 : 1 + blackWingLevel * 0.2;
    next = {
      ...next,
      maxHp: Math.max(1, Math.round(next.maxHp * statMultiplier)),
      attack: Math.max(1, Math.round(next.attack * statMultiplier)),
      defense: Math.max(0, Math.round(next.defense * statMultiplier)),
      speed: Math.max(1, Math.round(next.speed * statMultiplier)),
      specialSkillDamage: Math.max(1, Math.round(next.specialSkillDamage * featherMultiplier)),
    };
  }

  if (fallenKingLevel > 0 && character.id === 'irena') {
    const durabilityMultiplier = 1 + fallenKingLevel * 0.04;
    next = {
      ...next,
      maxHp: Math.max(1, Math.round(next.maxHp * durabilityMultiplier)),
      defense: Math.max(0, Math.round(next.defense * durabilityMultiplier)),
    };
  }

  return next;
}

export function applyDynamicAbilityModifiers(
  fighter: BattleFighter,
  config: BattleSetupConfig,
  turn: number,
): BattleFighter {
  const abyssLevel = getAbilityLevel(config, 'ABYSS');
  const fallenLevel = getAbilityLevel(config, 'FALLEN');
  let character: CharacterDef = { ...fighter.character };

  if (character.id === 'kaiser' && abyssLevel > 0) {
    const penaltyPerTurn = abyssLevel * 0.012;
    const penalty = Math.min(0.99, Math.max(0, turn - 1) * penaltyPerTurn);
    const multiplier = 1 - penalty;

    character = {
      ...character,
      attack: Math.max(1, Math.round(character.attack * multiplier)),
      defense: Math.max(0, Math.round(character.defense * multiplier)),
      speed: Math.max(1, Math.round(character.speed * multiplier)),
      ...(abyssLevel >= 5
        ? {
            specialSkillDamage: Math.max(1, Math.round(character.specialSkillDamage * multiplier)),
            ultimateSkillDamage: Math.max(1, Math.round(character.ultimateSkillDamage * multiplier)),
          }
        : {}),
    };
  }

  if (character.id === 'irena' && fallenLevel > 0) {
    const hpRatio = fighter.currentHp / Math.max(1, character.maxHp);
    let multiplier = 1;

    if (hpRatio <= 0.10) {
      multiplier = 3.0 + Math.max(0, fallenLevel - 1) * 0.20;
    } else if (hpRatio <= 0.25) {
      multiplier = 2.5 + Math.max(0, fallenLevel - 1) * 0.15;
    } else if (hpRatio <= 0.50) {
      multiplier = 2.0 + Math.max(0, fallenLevel - 1) * 0.10;
    }

    if (multiplier > 1) {
      character = {
        ...character,
        maxHp: Math.max(1, Math.round(character.maxHp * multiplier)),
        attack: Math.max(1, Math.round(character.attack * multiplier)),
        defense: Math.max(0, Math.round(character.defense * multiplier)),
        speed: Math.max(1, Math.round(character.speed * multiplier)),
      };
    }
  }

  return { ...fighter, character };
}

export function getJudgmentThreshold(level: number): number {
  if (level >= 5) return 2;
  if (level >= 3) return 3;
  return 4;
}

export function getJudgmentDamageMultiplier(level: number): number {
  if (level >= 5) return 3.0;
  return 1.4 + Math.min(3, Math.max(0, level - 1)) * 0.15;
}

export function getJudgmentDefenseIgnore(level: number): number {
  if (level >= 5) return 0.60;
  return 0.20 + Math.min(3, Math.max(0, level - 1)) * 0.05;
}

export function applyJudgmentDefense(target: BattleFighter, level: number): BattleFighter {
  const ignore = getJudgmentDefenseIgnore(level);
  return {
    ...target,
    character: {
      ...target.character,
      defense: Math.max(0, Math.round(target.character.defense * (1 - ignore))),
    },
  };
}

export function createBattleCharacters(
  player: CharacterDef,
  kaiser: CharacterDef,
  config: BattleSetupConfig,
): { player: CharacterDef; enemy: CharacterDef } {
  const levelKaiser = createKaiserForLevel(kaiser, config.kaiserLevel);
  return {
    player: applyStaticAbilityModifiers(applyStatAllocation(player, config.statAllocation), config),
    enemy: levelKaiser,
  };
}

export function normalizeEquippedAbilities(
  abilities: EquippedAbility[],
): EquippedAbility[] {
  return abilities
    .filter(ability => Number.isFinite(ability.level) && ability.level > 0)
    .slice(0, 2)
    .map(ability => ({
      id: ability.id,
      level: Math.min(MAX_ABILITY_LEVEL, Math.max(1, Math.floor(ability.level))),
    }));
}
