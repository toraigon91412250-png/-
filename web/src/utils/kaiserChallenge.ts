import { BattleChallengeLevel, BattleFighter } from '../types/game';

export const KAISER_ARMOR_UNLOCK_LEVEL = 40;
export const KAISER_ARMOR_HP_FRACTION = 0.20;
export const KAISER_ARMOR_DAMAGE_MULTIPLIER = 0.75;
export const KAISER_ARMOR_BROKEN_DAMAGE_MULTIPLIER = 1.30;
export const KAISER_ARMOR_BROKEN_TURNS = 2;
export const KAISER_PHASE_TWO_HP_FRACTION = 0.50;
export const KAISER_PHASE_TWO_DAMAGE_MULTIPLIER = 1.25;
export const KAISER_PHASE_TWO_SPEED_MULTIPLIER = 1.15;
export const KAISER_PHASE_TWO_ARMOR_FRACTION = 0.50;

export interface KaiserHitResolution {
  fighter: BattleFighter;
  /** Actual HP lost after mitigation and final-phase boundary handling. */
  damage: number;
  phaseChanged: boolean;
  armorWasActive: boolean;
  armorWasBroken: boolean;
  armorBroke: boolean;
  armorBefore: number;
  armorAfter: number;
}

export function initializeKaiserChallengeFighter(
  fighter: BattleFighter,
  level: BattleChallengeLevel,
): BattleFighter {
  if (fighter.isPlayer || fighter.character.id !== 'kaiser') return fighter;
  const armorMax = level >= KAISER_ARMOR_UNLOCK_LEVEL
    ? Math.max(1, Math.round(fighter.character.maxHp * KAISER_ARMOR_HP_FRACTION))
    : 0;
  return {
    ...fighter,
    kaiserArmorCurrent: armorMax,
    kaiserArmorMax: armorMax,
    kaiserArmorBrokenTurns: 0,
    kaiserArmorBrokenAtTurn: undefined,
    kaiserPhase: 1,
  };
}

export function resolveKaiserHit(
  target: BattleFighter,
  rawDamage: number,
  level: BattleChallengeLevel,
  turn: number,
  isDirectHit = true,
  source = '',
): KaiserHitResolution {
  if (target.isPlayer || target.character.id !== 'kaiser') {
    return {
      fighter: target,
      damage: Math.max(0, Math.floor(rawDamage)),
      phaseChanged: false,
      armorWasActive: false,
      armorWasBroken: false,
      armorBroke: false,
      armorBefore: 0,
      armorAfter: 0,
    };
  }

  const incomingDamage = Math.max(0, Math.floor(rawDamage));
  const hpBefore = Math.max(0, target.currentHp);
  const armorBefore = Math.max(0, target.kaiserArmorCurrent ?? 0);
  const armorMax = Math.max(0, target.kaiserArmorMax ?? 0);
  const brokenTurns = Math.max(0, target.kaiserArmorBrokenTurns ?? 0);
  const armorWasActive = isDirectHit && level >= KAISER_ARMOR_UNLOCK_LEVEL && armorBefore > 0;
  const armorWasBroken = isDirectHit && !armorWasActive && brokenTurns > 0;
  const executionBypassesMitigation = source === '堕天・終局';

  let damage = incomingDamage;
  let armorAfter = armorBefore;
  let armorBroke = false;
  let nextBrokenTurns = brokenTurns;
  let nextBrokenAtTurn = target.kaiserArmorBrokenAtTurn;

  if (armorWasActive) {
    // Wear is based on the pre-mitigation hit, not the HP damage.
    armorAfter = Math.max(0, armorBefore - incomingDamage);
    if (armorAfter === 0) {
      armorBroke = true;
      nextBrokenTurns = KAISER_ARMOR_BROKEN_TURNS;
      nextBrokenAtTurn = turn;
    }
    // Preserve conditional execution. The armor still loses durability.
    if (!executionBypassesMitigation) {
      damage = Math.floor(incomingDamage * KAISER_ARMOR_DAMAGE_MULTIPLIER);
    }
  } else if (armorWasBroken && !executionBypassesMitigation) {
    damage = Math.round(incomingDamage * KAISER_ARMOR_BROKEN_DAMAGE_MULTIPLIER);
  }

  const phaseOne = (target.kaiserPhase ?? 1) === 1;
  const phaseThreshold = Math.ceil(target.character.maxHp * KAISER_PHASE_TWO_HP_FRACTION);
  const crossesPhaseBoundary = level === 100 &&
    phaseOne &&
    hpBefore > phaseThreshold &&
    hpBefore - damage <= phaseThreshold;

  if (crossesPhaseBoundary) {
    // Clamp the hit at 50% HP, discarding overkill so the final phase cannot be skipped.
    damage = hpBefore - phaseThreshold;
    const baseCharacter = target.character;
    const phaseTwoCharacter = {
      ...baseCharacter,
      attack: Math.max(1, Math.round(baseCharacter.attack * KAISER_PHASE_TWO_DAMAGE_MULTIPLIER)),
      specialSkillDamage: Math.max(1, Math.round(baseCharacter.specialSkillDamage * KAISER_PHASE_TWO_DAMAGE_MULTIPLIER)),
      ultimateSkillDamage: Math.max(1, Math.round(baseCharacter.ultimateSkillDamage * KAISER_PHASE_TWO_DAMAGE_MULTIPLIER)),
      speed: Math.max(1, Math.round(baseCharacter.speed * KAISER_PHASE_TWO_SPEED_MULTIPLIER)),
    };
    const redeployedArmor = armorMax > 0
      ? Math.max(0, Math.round(armorMax * KAISER_PHASE_TWO_ARMOR_FRACTION))
      : 0;
    const fighter: BattleFighter = {
      ...target,
      character: phaseTwoCharacter,
      currentHp: phaseThreshold,
      kaiserPhase: 2,
      kaiserArmorCurrent: redeployedArmor,
      kaiserArmorMax: armorMax,
      kaiserArmorBrokenTurns: 0,
      kaiserArmorBrokenAtTurn: undefined,
    };
    return {
      fighter,
      damage: Math.max(0, damage),
      phaseChanged: true,
      armorWasActive,
      armorWasBroken,
      armorBroke,
      armorBefore,
      armorAfter: redeployedArmor,
    };
  }

  const appliedDamage = Math.min(hpBefore, damage);
  const fighter: BattleFighter = {
    ...target,
    currentHp: Math.max(0, hpBefore - appliedDamage),
    kaiserArmorCurrent: armorAfter,
    kaiserArmorMax: armorMax,
    kaiserArmorBrokenTurns: nextBrokenTurns,
    kaiserArmorBrokenAtTurn: nextBrokenAtTurn,
    kaiserPhase: target.kaiserPhase ?? 1,
  };
  return {
    fighter,
    damage: appliedDamage,
    phaseChanged: false,
    armorWasActive,
    armorWasBroken,
    armorBroke,
    armorBefore,
    armorAfter,
  };
}

export function advanceKaiserChallengeRound(
  fighter: BattleFighter,
  completedTurn: number,
): BattleFighter {
  const brokenTurns = Math.max(0, fighter.kaiserArmorBrokenTurns ?? 0);
  const brokenAtTurn = fighter.kaiserArmorBrokenAtTurn;
  if (
    fighter.character.id !== 'kaiser' ||
    brokenTurns <= 0 ||
    brokenAtTurn == null ||
    brokenAtTurn >= completedTurn
  ) return fighter;

  const remainingTurns = Math.max(0, brokenTurns - 1);
  return {
    ...fighter,
    kaiserArmorBrokenTurns: remainingTurns,
    kaiserArmorBrokenAtTurn: remainingTurns > 0 ? brokenAtTurn : undefined,
  };
}
