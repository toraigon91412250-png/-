import assert from 'assert';
import { register } from 'node:module';
import { BATTLE_CHALLENGE_LEVELS, getEffectiveSpeed, getEffectiveAttack, getEffectiveDefense, STATUS_AILMENTS } from './src/types/game.ts';
import {
  applyDynamicAbilityModifiers,
  applyStaticAbilityModifiers,
  createBattleCharacters,
  createKaiserForLevel,
  getJudgmentDamageMultiplier,
  getJudgmentDefenseIgnore,
  getJudgmentThreshold,
} from './src/utils/abilitySystem.ts';
import { createInitialFighter } from './src/hooks/useBattleGame.ts';
import { calculateNormalAttackDamage, calculateSpecialDamage, calculateUltimateDamage } from './src/utils/battleMath.ts';
import { applyStatAllocation, createStatPreset, getAbilityBuildMatchPercent, getRemainingStatPoints } from './src/utils/statBuild.ts';

register(
  'data:text/javascript,' + encodeURIComponent(`
    export async function load(url, context, nextLoad) {
      if (url.endsWith('.jpg')) {
        return { format: 'module', source: 'export default "";', shortCircuit: true };
      }
      return nextLoad(url, context);
    }
  `),
  { parentURL: import.meta.url }
);

const { IRENA, KAISER, CPU_CHARACTERS, getIrenaWithSkillProgress } = await import('./src/data/characters.ts');
const { CpuAi } = await import('./src/utils/ai.ts');

const { getIrenaSuperFallenShotMultiplier } = await import('./src/types/game.ts');
const {
  initializeKaiserChallengeFighter,
  resolveKaiserHit,
  advanceKaiserChallengeRound,
} = await import('./src/utils/kaiserChallenge.ts');
const { getRecruitmentRewardForPull } = await import('./src/data/recruitment.ts');
const { loadStatPoints, addStatPoints, loadRaidRewardProgress, claimRaidVictoryReward, redeemRaidCoreFragment, performRecruitment, IMPRINT_PROGRESS_STORAGE_KEY, loadImprintProgress, unlockImprint, equipImprint, unequipImprint, drawImprintGacha, setImprintTicketsForDeveloper, addImprintTicketsForDeveloper, unlockAllImprintsForDeveloper } = await import('./src/utils/storage.ts');
const { MAX_EQUIPPED_IMPRINTS, IMPRINT_DEFINITIONS } = await import('./src/data/imprints.ts');
const { normalizeEquippedImprints, shouldTriggerForesight, shouldSuppressCpuBuffAction, resolveYinYangDefense, getTurnExecutionPlan, YIN_YANG_DAMAGE_REDUCTION, getOpposingBloodImprint, getBloodTearBurstDamage, resolveWindGuardDamage, getWindGuardCounterDamage, WIND_GUARD_MAX_REDUCTION, COSTLY_SHOT_HP_COST } = await import('./src/utils/imprintSystem.ts');
const { canUseRaidAction, createInitialRaidState, RAID_RULES, resolveRaidAction } = await import('./src/raid/engine.ts');

assert.strictEqual(getIrenaSuperFallenShotMultiplier(1), 5.6);
assert.strictEqual(Math.round(getIrenaSuperFallenShotMultiplier(10) * 10) / 10, 7.4);
console.log('✓ Super Fallen Shot power is doubled.');

console.log('--- Testing Web Version Game Logic & Rules ---');

assert.strictEqual(IRENA.maxHp, 4000);
assert.strictEqual(IRENA.attack, 360);
assert.strictEqual(IRENA.defense, 200);
assert.strictEqual(IRENA.speed, 240);
assert.strictEqual(IRENA.evasionRate, 0.25);
assert.strictEqual(IRENA.specialSkillDamage, 300);
assert.strictEqual(IRENA.specialSkillCooldown, 2);
assert.strictEqual(IRENA.ultimateSkillDamage, 500);

assert.strictEqual(KAISER.maxHp, 2750);
assert.strictEqual(KAISER.attack, 187);
assert.strictEqual(KAISER.defense, 180);
assert.strictEqual(KAISER.speed, 180);
assert.strictEqual(KAISER.evasionRate, 0.10);
assert.strictEqual(KAISER.specialSkillDamage, 500);
assert.strictEqual(KAISER.specialSkillCooldown, 1);
assert.strictEqual(KAISER.ultimateSkillDamage, 700);
const cpuKaiserBase = CPU_CHARACTERS.find(character => character.id === KAISER.id);
assert.ok(cpuKaiserBase, 'The runtime CPU roster must contain Kaiser.');
assert.strictEqual(cpuKaiserBase.maxHp, KAISER.maxHp * 2);
assert.strictEqual(cpuKaiserBase.attack, KAISER.attack * 1.5);
console.log('✓ Current character stats and the runtime CPU roster are verified.');

const runtimeKaiserLv10 = createKaiserForLevel(cpuKaiserBase, 10);
const runtimeKaiserLv50 = createKaiserForLevel(cpuKaiserBase, 50);
const runtimeKaiserLv100 = createKaiserForLevel(cpuKaiserBase, 100);
assert.strictEqual(runtimeKaiserLv10.maxHp, 5500);
assert.strictEqual(runtimeKaiserLv10.attack, 281);
assert.strictEqual(runtimeKaiserLv10.defense, 180);
assert.strictEqual(runtimeKaiserLv10.speed, 180);
assert.strictEqual(runtimeKaiserLv10.specialSkillDamage, 500);
assert.strictEqual(runtimeKaiserLv10.ultimateSkillDamage, 700);
assert.deepStrictEqual(
  [runtimeKaiserLv50.maxHp, runtimeKaiserLv50.attack, runtimeKaiserLv50.defense, runtimeKaiserLv50.speed, runtimeKaiserLv50.specialSkillDamage, runtimeKaiserLv50.ultimateSkillDamage],
  [6722, 336, 198, 260, 599, 838],
  'Lv50 stats must follow the existing curve after the new base values.',
);
assert.deepStrictEqual(
  [runtimeKaiserLv100.maxHp, runtimeKaiserLv100.attack, runtimeKaiserLv100.defense, runtimeKaiserLv100.speed, runtimeKaiserLv100.specialSkillDamage, runtimeKaiserLv100.ultimateSkillDamage],
  [8250, 561, 270, 360, 1000, 1400],
  'Lv100 stats must remain close to the requested baseline curve.',
);

const kaiserLv10Fighter = createInitialFighter(runtimeKaiserLv10, false, 10);
const kaiserLv50Fighter = createInitialFighter(runtimeKaiserLv50, false, 50);
const kaiserLv100Fighter = createInitialFighter(runtimeKaiserLv100, false, 100);
assert.strictEqual(kaiserLv10Fighter.kaiserArmorMax, 0, 'Lv10 must not deploy armor.');
assert.strictEqual(kaiserLv50Fighter.kaiserArmorMax, Math.round(runtimeKaiserLv50.maxHp * 0.2));
assert.strictEqual(kaiserLv50Fighter.kaiserArmorCurrent, kaiserLv50Fighter.kaiserArmorMax);
assert.strictEqual(kaiserLv100Fighter.kaiserArmorCurrent, Math.round(runtimeKaiserLv100.maxHp * 0.2));

const lowLevelHit = resolveKaiserHit(kaiserLv10Fighter, 100, 10, 1, true, '通常攻撃');
assert.strictEqual(lowLevelHit.damage, 100, 'Lv10 damage must not be mitigated by armor.');
const armoredHit = resolveKaiserHit(kaiserLv50Fighter, 1000, 50, 1, true, '通常攻撃');
assert.strictEqual(armoredHit.damage, 750, 'Armor must reduce HP damage by 25%.');
assert.strictEqual(
  armoredHit.fighter.kaiserArmorCurrent,
  kaiserLv50Fighter.kaiserArmorMax - 1000,
  'Armor durability must use pre-mitigation damage.',
);
assert.strictEqual(armoredHit.fighter.currentHp, kaiserLv50Fighter.currentHp - 750);

const armorBreakTest = resolveKaiserHit(
  { ...kaiserLv50Fighter, kaiserArmorCurrent: 50 },
  100,
  50,
  2,
  true,
  '通常攻撃',
);
assert.strictEqual(armorBreakTest.damage, 75);
assert.strictEqual(armorBreakTest.fighter.kaiserArmorCurrent, 0);
assert.strictEqual(armorBreakTest.fighter.kaiserArmorBrokenTurns, 2);
assert.strictEqual(armorBreakTest.armorBroke, true);
const breakTurnEnd = advanceKaiserChallengeRound(armorBreakTest.fighter, 2);
assert.strictEqual(breakTurnEnd.kaiserArmorBrokenTurns, 2, 'The break turn itself must not consume a vulnerable turn.');
const brokenHit = resolveKaiserHit(breakTurnEnd, 100, 50, 3, true, '通常攻撃');
assert.strictEqual(brokenHit.damage, 130, 'A broken Kaiser must receive 1.3x damage.');
assert.strictEqual(advanceKaiserChallengeRound(brokenHit.fighter, 3).kaiserArmorBrokenTurns, 1);
assert.strictEqual(advanceKaiserChallengeRound(
  advanceKaiserChallengeRound(brokenHit.fighter, 3),
  4,
).kaiserArmorBrokenTurns, 0);

const lv100OneShot = resolveKaiserHit(
  kaiserLv100Fighter,
  kaiserLv100Fighter.character.maxHp * 2,
  100,
  1,
  true,
  '堕天・終局',
);
assert.strictEqual(lv100OneShot.phaseChanged, true);
assert.strictEqual(lv100OneShot.fighter.currentHp, Math.ceil(runtimeKaiserLv100.maxHp * 0.5));
assert.strictEqual(lv100OneShot.fighter.kaiserPhase, 2);
assert.strictEqual(lv100OneShot.fighter.character.attack, Math.round(runtimeKaiserLv100.attack * 1.25));
assert.strictEqual(lv100OneShot.fighter.character.speed, Math.round(runtimeKaiserLv100.speed * 1.15));
assert.strictEqual(lv100OneShot.fighter.character.specialSkillDamage, Math.round(runtimeKaiserLv100.specialSkillDamage * 1.25));
assert.strictEqual(lv100OneShot.fighter.character.ultimateSkillDamage, Math.round(runtimeKaiserLv100.ultimateSkillDamage * 1.25));
assert.strictEqual(lv100OneShot.fighter.kaiserArmorCurrent, Math.round(lv100OneShot.fighter.kaiserArmorMax * 0.5));
assert.strictEqual(lv100OneShot.fighter.kaiserArmorBrokenTurns, 0);
const lv100HitAfterTransition = resolveKaiserHit(lv100OneShot.fighter, 100, 100, 2, true, '通常攻撃');
assert.strictEqual(lv100HitAfterTransition.phaseChanged, false, 'Phase 2 must not trigger repeatedly.');
assert.strictEqual(lv100HitAfterTransition.fighter.character.attack, lv100OneShot.fighter.character.attack, 'Phase buffs must not stack.');
const executionAfterPhase = resolveKaiserHit(lv100OneShot.fighter, lv100OneShot.fighter.currentHp, 100, 2, true, '堕天・終局');
assert.strictEqual(executionAfterPhase.fighter.currentHp, 0, 'Conditional execution must remain lethal after the phase transition.');
const bleedPhaseHit = resolveKaiserHit({
  ...kaiserLv100Fighter,
  currentHp: Math.ceil(runtimeKaiserLv100.maxHp * 0.5) + 50,
}, 100, 100, 3, false, '出血ダメージ');
assert.strictEqual(bleedPhaseHit.phaseChanged, true, 'Bleed crossing 50% must also start phase 2.');
console.log('✓ Kaiser armor, two-turn break window, Lv100 phase boundary, single-use scaling, and bleed threshold behavior verified.');

assert.strictEqual(STATUS_AILMENTS.BLEED.defaultDuration, 3);
assert.strictEqual(STATUS_AILMENTS.BLEED.dotDamage, 30);
assert.strictEqual(STATUS_AILMENTS.BLEED.speedMod, -20);
assert.strictEqual(STATUS_AILMENTS.BLEED.defenseMod, -20);
assert.strictEqual(STATUS_AILMENTS.BLEED.attackMod, 0);

assert.strictEqual(STATUS_AILMENTS.PRESSURE.defaultDuration, 2);
assert.strictEqual(STATUS_AILMENTS.PRESSURE.dotDamage, 0);
assert.strictEqual(STATUS_AILMENTS.PRESSURE.speedMod, -25);
assert.strictEqual(STATUS_AILMENTS.PRESSURE.defenseMod, 0);
assert.strictEqual(STATUS_AILMENTS.PRESSURE.attackMod, -25);
console.log('✓ Status ailment parameters verified.');

const fallenSpeedTestIrena = createInitialFighter({ ...IRENA, speed: 40 }, true);
fallenSpeedTestIrena.currentHp = 2000;
const fallenSpeedAdjusted = applyDynamicAbilityModifiers(
  fallenSpeedTestIrena,
  { kaiserLevel: 10, abilities: [{ id: 'FALLEN', level: 1 }] },
  1,
);
assert.strictEqual(fallenSpeedAdjusted.character.speed, 80);
assert.strictEqual(getEffectiveSpeed({
  ...fallenSpeedAdjusted,
  activeAilments: [{ type: 'BLEED', remainingTurns: 3 }],
}), 60);

const abyssSpeedAdjusted = applyDynamicAbilityModifiers(
  createInitialFighter(KAISER, false),
  { kaiserLevel: 10, abilities: [{ id: 'ABYSS', level: 4 }] },
  2,
);
assert.strictEqual(abyssSpeedAdjusted.character.speed, 76);
console.log('✓ Dynamic speed modifiers remain visible to effective-speed calculations.');

const fighterIrena = createInitialFighter(IRENA, true);
assert.strictEqual(getEffectiveSpeed(fighterIrena), 240);
fighterIrena.activeAilments.push({ type: 'BLEED', remainingTurns: 3 });
assert.strictEqual(getEffectiveSpeed(fighterIrena), 220);
assert.strictEqual(getEffectiveDefense(fighterIrena), 180);

const fighterKaiser = createInitialFighter(KAISER, false);
fighterKaiser.activeAilments.push({ type: 'PRESSURE', remainingTurns: 2 });
assert.strictEqual(getEffectiveSpeed(fighterKaiser), 55);
assert.strictEqual(getEffectiveAttack(fighterKaiser), 135);

const aiSpecialDamageReference = Math.max(0, KAISER.specialSkillDamage - IRENA.defense);
assert.strictEqual(aiSpecialDamageReference, 175);


const config = { kaiserLevel: 10, abilities: [] };
const attackBase = createInitialFighter(IRENA, true);
const attackTarget = createInitialFighter(KAISER, false);
const normalDamage = calculateNormalAttackDamage({
  attacker: attackBase,
  target: attackTarget,
  config,
  turn: 1,
  isActingFirst: true,
});
const criticalDamage = calculateNormalAttackDamage({
  attacker: attackBase,
  target: attackTarget,
  config,
  turn: 1,
  isActingFirst: true,
}, true);

assert.strictEqual(normalDamage, 220);
assert.strictEqual(criticalDamage, 340);

assert.strictEqual(calculateUltimateDamage({
  attacker: attackBase,
  target: attackTarget,
  config,
  turn: 1,
  isActingFirst: true,
  ultimateVariant: 'OMNIPOTENCE',
}), 1500);

const fallenConfig = { kaiserLevel: 10, abilities: [{ id: 'FALLEN', level: 1 }] };
const fallenAtTwelvePointFivePercent = createInitialFighter(IRENA, true);
fallenAtTwelvePointFivePercent.currentHp = 500;
const preparedFallenAtTwelvePointFivePercent = applyDynamicAbilityModifiers(
  fallenAtTwelvePointFivePercent,
  fallenConfig,
  1,
);
assert.strictEqual(preparedFallenAtTwelvePointFivePercent.character.maxHp, 10000);
const fallenTarget = createInitialFighter(KAISER, false);
const fallenDamageAboveFivePercent = calculateNormalAttackDamage({
  attacker: preparedFallenAtTwelvePointFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
});
assert.ok(
  fallenDamageAboveFivePercent < fallenTarget.currentHp,
  'Fallen must not execute an enemy when current HP is above 5% of the unmodified max HP.',
);

const fallenSpecialDamageAboveFivePercent = calculateSpecialDamage({
  attacker: preparedFallenAtTwelvePointFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
});
assert.ok(
  fallenSpecialDamageAboveFivePercent < fallenTarget.currentHp,
  'Fallen must not execute through Feather at 12.5% HP.',
);

const fallenSuperShotDamageAboveFivePercent = calculateSpecialDamage({
  attacker: preparedFallenAtTwelvePointFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  specialSkillId: 'SUPER_FALLEN_SHOT',
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
});
assert.ok(
  fallenSuperShotDamageAboveFivePercent > fallenTarget.currentHp,
  'Super Fallen Shot must keep its calculated damage when HP is above the execution threshold.',
);

const fallenUltimateDamageAboveFivePercent = calculateUltimateDamage({
  attacker: preparedFallenAtTwelvePointFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
});
assert.ok(
  fallenUltimateDamageAboveFivePercent < fallenTarget.currentHp,
  'Fallen must not execute through an ultimate at 12.5% HP.',
);

const fallenAtFivePercent = createInitialFighter(IRENA, true);
fallenAtFivePercent.currentHp = 200;
const preparedFallenAtFivePercent = applyDynamicAbilityModifiers(fallenAtFivePercent, fallenConfig, 1);
assert.strictEqual(calculateNormalAttackDamage({
  attacker: preparedFallenAtFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
}), fallenTarget.currentHp, 'Fallen execution must trigger at exactly 5% HP.');

assert.strictEqual(calculateSpecialDamage({
  attacker: preparedFallenAtFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
}), fallenTarget.currentHp, 'Feather must use the same 5% execution threshold.');

assert.strictEqual(calculateSpecialDamage({
  attacker: preparedFallenAtFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  specialSkillId: 'SUPER_FALLEN_SHOT',
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
}), fallenTarget.currentHp, 'Super Fallen Shot must use the same 5% execution threshold.');

assert.strictEqual(calculateUltimateDamage({
  attacker: preparedFallenAtFivePercent,
  target: fallenTarget,
  config: fallenConfig,
  turn: 1,
  isActingFirst: false,
  alreadyPrepared: true,
  baseAttackerMaxHp: IRENA.maxHp,
}), fallenTarget.currentHp, 'Ultimates must use the same 5% execution threshold.');

const buffed = { ...attackBase, isBuffed: true, buffDamageBonus: 125 };
assert.strictEqual(calculateNormalAttackDamage({
  attacker: buffed,
  target: attackTarget,
  config,
  turn: 1,
  isActingFirst: true,
}), 305);

const lv50Kaiser = createKaiserForLevel(KAISER, 50);
const maxSkillIrena = createInitialFighter(
  getIrenaWithSkillProgress({
    shards: 0,
    featherLevel: 10,
    ruinLevel: 1,
    featherPath: null,
    ruinPath: null,
  }),
  true,
);
const lv50FeatherDamage = calculateSpecialDamage({
  attacker: maxSkillIrena,
  target: createInitialFighter(lv50Kaiser, false),
  config: { kaiserLevel: 50, abilities: [] },
  turn: 1,
  isActingFirst: true,
});
assert.strictEqual(lv50Kaiser.maxHp, 3361);
assert.strictEqual(lv50Kaiser.attack, 224);
assert.strictEqual(lv50Kaiser.defense, 198);
assert.strictEqual(lv50Kaiser.speed, 260);
assert.strictEqual(lv50Kaiser.specialSkillDamage, 599);
assert.strictEqual(lv50Kaiser.ultimateSkillDamage, 838);
assert.strictEqual(maxSkillIrena.character.specialSkillDamage, 525);
assert.strictEqual(lv50FeatherDamage, 327);

assert.strictEqual(getJudgmentThreshold(1), 4);
assert.strictEqual(getJudgmentThreshold(2), 4);
assert.strictEqual(getJudgmentThreshold(3), 3);
assert.strictEqual(getJudgmentThreshold(4), 3);
assert.strictEqual(getJudgmentThreshold(5), 2);

assert.strictEqual(getJudgmentDamageMultiplier(1), 1.4);
assert.strictEqual(Math.round(getJudgmentDamageMultiplier(4) * 100) / 100, 1.85);
assert.strictEqual(getJudgmentDamageMultiplier(5), 3.0);
assert.strictEqual(getJudgmentDefenseIgnore(1), 0.20);
assert.strictEqual(Math.round(getJudgmentDefenseIgnore(4) * 100) / 100, 0.35);
assert.strictEqual(getJudgmentDefenseIgnore(5), 0.60);

const lv4BlackWing = applyStaticAbilityModifiers(IRENA, {
  kaiserLevel: 10,
  abilities: [{ id: 'BLACK_WING', level: 4 }],
});
const lv5BlackWing = applyStaticAbilityModifiers(IRENA, {
  kaiserLevel: 10,
  abilities: [{ id: 'BLACK_WING', level: 5 }],
});
assert.strictEqual(lv4BlackWing.specialSkillDamage, 540);
assert.strictEqual(lv5BlackWing.maxHp, 4400);
assert.strictEqual(lv5BlackWing.specialSkillDamage, 300);

const lv4AbyssKaiser = applyDynamicAbilityModifiers(
  createInitialFighter(KAISER, false),
  { kaiserLevel: 10, abilities: [{ id: 'ABYSS', level: 4 }] },
  2,
);
const lv5AbyssKaiser = applyDynamicAbilityModifiers(
  createInitialFighter(KAISER, false),
  { kaiserLevel: 10, abilities: [{ id: 'ABYSS', level: 5 }] },
  2,
);
assert.strictEqual(lv4AbyssKaiser.character.attack, 178);
assert.strictEqual(lv4AbyssKaiser.character.specialSkillDamage, KAISER.specialSkillDamage);
assert.strictEqual(lv5AbyssKaiser.character.attack, 176);
assert.strictEqual(lv5AbyssKaiser.character.specialSkillDamage, 470);
assert.strictEqual(lv5AbyssKaiser.character.ultimateSkillDamage, 658);

const judgmentTarget = createInitialFighter(KAISER, false);
const judgmentDamage = calculateNormalAttackDamage({
  attacker: attackBase,
  target: judgmentTarget,
  config: {
    kaiserLevel: 10,
    abilities: [{ id: 'JUDGMENT', level: 5 }],
  },
  turn: 1,
  isActingFirst: true,
  judgmentReady: true,
});
assert.strictEqual(judgmentDamage, 1432);

const buildAllocation = { maxHp: 3, attack: 4, defense: 2, speed: 3 };
const allocatedIrena = applyStatAllocation(IRENA, buildAllocation);
assert.strictEqual(allocatedIrena.maxHp, 4600);
assert.strictEqual(allocatedIrena.attack, 408);
assert.strictEqual(allocatedIrena.defense, 212);
assert.strictEqual(allocatedIrena.speed, 258);

const allocatedBattleCharacters = createBattleCharacters(IRENA, KAISER, {
  kaiserLevel: 10,
  abilities: [],
  statAllocation: buildAllocation,
});
assert.strictEqual(allocatedBattleCharacters.player.maxHp, 4600);
assert.strictEqual(allocatedBattleCharacters.player.attack, 408);
assert.strictEqual(allocatedBattleCharacters.player.defense, 212);
assert.strictEqual(allocatedBattleCharacters.player.speed, 258);

assert.strictEqual(getAbilityBuildMatchPercent('JUDGMENT', { maxHp: 0, attack: 6, defense: 0, speed: 6 }), 100);
assert.strictEqual(getAbilityBuildMatchPercent('FALLEN_KING', { maxHp: 6, attack: 0, defense: 6, speed: 0 }), 100);
assert.strictEqual(getAbilityBuildMatchPercent('ABYSS', { maxHp: 0, attack: 0, defense: 0, speed: 12 }), 100);
assert.strictEqual(getAbilityBuildMatchPercent('FALLEN_KING', { maxHp: 12, attack: 0, defense: 0, speed: 0 }), 100);

const extendedAllocation = { maxHp: 8, attack: 8, defense: 7, speed: 7 };
assert.strictEqual(getRemainingStatPoints(extendedAllocation, 30), 0);
const offensePreset = createStatPreset('OFFENSE', 20);
assert.strictEqual(getRemainingStatPoints(offensePreset, 20), 0);
assert.ok(offensePreset.attack >= offensePreset.speed);
const speedPreset = createStatPreset('SPEED', 20);
assert.strictEqual(getRemainingStatPoints(speedPreset, 20), 0);
assert.ok(speedPreset.speed > speedPreset.defense);

for (let i = 0; i < 20; i += 1) {
  assert.strictEqual(getRecruitmentRewardForPull(-1, true).kind, 'ABILITY_CORE');
}
console.log('✓ Stat presets and summon guarantee helper remain consistent.');

const storageValues = new Map();
globalThis.localStorage = {
  getItem: key => storageValues.has(key) ? storageValues.get(key) : null,
  setItem: (key, value) => storageValues.set(key, String(value)),
  removeItem: key => storageValues.delete(key),
  clear: () => storageValues.clear(),
};

assert.strictEqual(loadStatPoints(), 12, 'A missing stat-points key must use the initial 12 points.');
assert.strictEqual(addStatPoints(2), 14, 'A first win from a fresh save must add 2 points to the initial 12.');
assert.strictEqual(loadStatPoints(), 14);

// Raid-exclusive reward persistence, idempotent victory claims, and permanent stat-point redemption.
const pointsBeforeRaidRewardTest = storageValues.get('duel_arena_stat_points');
const rewardBeforeRaidRewardTest = storageValues.get('duel_arena_raid_reward_progress');
assert.strictEqual(loadRaidRewardProgress().coreFragments, 0);
const firstRaidClaim = claimRaidVictoryReward('unit-test-raid-victory-001');
assert.strictEqual(firstRaidClaim.claimed, true, 'A new raid victory should grant one core fragment.');
assert.strictEqual(firstRaidClaim.progress.coreFragments, 1);
assert.strictEqual(firstRaidClaim.progress.imprintTickets, 1, 'Each unique raid victory also grants one imprint ticket.');
const repeatedRaidClaim = claimRaidVictoryReward('unit-test-raid-victory-001');
assert.strictEqual(repeatedRaidClaim.claimed, false, 'The same raid run must never pay out twice.');
assert.strictEqual(loadRaidRewardProgress().coreFragments, 1, 'A duplicate claim must not duplicate the item.');
assert.strictEqual(loadRaidRewardProgress().imprintTickets, 1, 'A duplicate claim must not duplicate the imprint ticket.');

const firstRedemption = redeemRaidCoreFragment();
assert.strictEqual(firstRedemption.used, true, 'A held core fragment should be redeemable.');
assert.strictEqual(firstRedemption.progress.coreFragments, 0, 'Redemption should consume exactly one fragment.');
assert.strictEqual(firstRedemption.progress.bonusStatPoints, 2, 'One fragment should permanently add two stat points.');
assert.strictEqual(loadStatPoints(), 16, 'Raid bonus points must be included in the main battle allocation pool.');
assert.strictEqual(redeemRaidCoreFragment().used, false, 'Redemption must fail cleanly with no fragment remaining.');

assert.strictEqual(addStatPoints(2), 18, 'Normal battle rewards must add to base points without double-counting raid bonuses.');
assert.strictEqual(loadStatPoints(), 18);
const secondRaidClaim = claimRaidVictoryReward('unit-test-raid-victory-002');
assert.strictEqual(secondRaidClaim.claimed, true, 'A different cleared raid run should grant its own reward.');
assert.strictEqual(redeemRaidCoreFragment().used, true);
assert.strictEqual(loadStatPoints(), 20, 'A second redeemed fragment should add another permanent two points.');
assert.strictEqual(claimRaidVictoryReward('').claimed, false, 'An empty run ID must never grant a reward.');

if (pointsBeforeRaidRewardTest === undefined) storageValues.delete('duel_arena_stat_points');
else storageValues.set('duel_arena_stat_points', pointsBeforeRaidRewardTest);
if (rewardBeforeRaidRewardTest === undefined) storageValues.delete('duel_arena_raid_reward_progress');
else storageValues.set('duel_arena_raid_reward_progress', rewardBeforeRaidRewardTest);
assert.strictEqual(loadStatPoints(), 14, 'Raid reward unit tests must restore the pre-test main progression.');
console.log('✓ Raid-exclusive item claims are idempotent and redeem into persistent main-game stat points.');

const imprintSaveBeforeTest = storageValues.get(IMPRINT_PROGRESS_STORAGE_KEY);
storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, JSON.stringify({ unlockedIds: [], equippedIds: [] }));
assert.deepStrictEqual(loadImprintProgress(), { unlockedIds: [], equippedIds: [] });
const unlockedForesight = unlockImprint('FORESIGHT');
assert.deepStrictEqual(unlockedForesight?.unlockedIds, ['FORESIGHT'], 'A known imprint can be unlocked.');
assert.deepStrictEqual(loadImprintProgress().unlockedIds, ['FORESIGHT'], 'Unlock state must persist.');
const equippedForesight = equipImprint('FORESIGHT');
assert.deepStrictEqual(equippedForesight?.equippedIds, ['FORESIGHT'], 'An unlocked imprint can be equipped.');
assert.deepStrictEqual(loadImprintProgress().equippedIds, ['FORESIGHT'], 'Equipment must persist.');
assert.strictEqual(equipImprint('FORESIGHT')?.equippedIds.length, 1, 'Duplicate equipment must not duplicate a slot.');
assert.deepStrictEqual(unequipImprint('FORESIGHT')?.equippedIds, [], 'An equipped imprint can be removed and saved.');
assert.strictEqual(equipImprint('FORESIGHT')?.equippedIds.includes('FORESIGHT'), true, 'Re-equipping after removal must work.');
assert.strictEqual(unlockImprint('FORESIGHT')?.unlockedIds.length, 1, 'Duplicate acquisition must not duplicate ownership.');
assert.strictEqual(MAX_EQUIPPED_IMPRINTS, 3, 'The imprint loadout has three slots.');
assert.deepStrictEqual(normalizeEquippedImprints(['FORESIGHT', 'FORESIGHT', 'UNKNOWN', null]), ['FORESIGHT']);
assert.deepStrictEqual(normalizeEquippedImprints(['BLOOD_TEAR', 'BLOOD_MEDIA']), ['BLOOD_TEAR'],
  'Legacy saves containing both blood imprints must normalize to one effect.');
assert.deepStrictEqual(normalizeEquippedImprints(['BLOOD_MEDIA', 'BLOOD_TEAR']), ['BLOOD_MEDIA'],
  'Blood-imprint exclusivity must be deterministic and preserve the first valid choice.');
assert.strictEqual(getOpposingBloodImprint('BLOOD_TEAR'), 'BLOOD_MEDIA');
assert.strictEqual(getOpposingBloodImprint('BLOOD_MEDIA'), 'BLOOD_TEAR');
assert.strictEqual(getOpposingBloodImprint('WIND_GUARD'), null);
assert.strictEqual(getBloodTearBurstDamage(30, 3), 135);
assert.strictEqual(getBloodTearBurstDamage(40, 4), 240);
assert.strictEqual(getBloodTearBurstDamage(-30, 3), 0);
assert.strictEqual(getBloodTearBurstDamage(30, -1), 0);
assert.strictEqual(WIND_GUARD_MAX_REDUCTION, 0.4);
assert.strictEqual(getWindGuardCounterDamage(300), 75);
assert.strictEqual(getWindGuardCounterDamage(-10), 0);
assert.deepStrictEqual(resolveWindGuardDamage(1, 500, true), {
  damage: 1, reducedBy: 0, counterDamage: 125, applied: true,
}, 'Rounding must not reduce a one-point hit by more than the 40% cap.');
assert.deepStrictEqual(resolveWindGuardDamage(200, 300, true), {
  damage: 140, reducedBy: 60, counterDamage: 75, applied: true,
});
assert.deepStrictEqual(resolveWindGuardDamage(200, 500, true), {
  damage: 120, reducedBy: 80, counterDamage: 125, applied: true,
}, 'Wind Guard mitigation must cap at 40% while counter damage scales from stored feather power.');
assert.deepStrictEqual(resolveWindGuardDamage(200, 300, false), {
  damage: 200, reducedBy: 0, counterDamage: 0, applied: false,
});
assert.strictEqual(COSTLY_SHOT_HP_COST, 200);

const eligibleForesight = {
  equippedImprints: ['FORESIGHT'],
  usedImprints: [],
  attackerIsPlayer: false,
  targetIsPlayer: true,
  targetIsEvading: true,
  incomingAction: 'SPECIAL',
  predictedAction: 'SPECIAL',
};
assert.strictEqual(shouldTriggerForesight(eligibleForesight), true, 'Foresight triggers against a forecast special.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, incomingAction: 'ULTIMATE', predictedAction: 'ULTIMATE' }), true, 'Foresight triggers against a forecast ultimate.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, targetIsEvading: false }), false, 'Foresight requires choosing evade.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, usedImprints: ['FORESIGHT'] }), false, 'Foresight is once per battle.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, equippedImprints: [] }), false, 'An unequipped imprint cannot trigger.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, attackerIsPlayer: true }), false, 'Foresight only counters the CPU.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, targetIsPlayer: false }), false, 'Foresight cannot trigger against a CPU target.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, incomingAction: 'ATTACK', predictedAction: 'ATTACK' }), false, 'Normal attacks are outside the effect.');
assert.strictEqual(shouldTriggerForesight({ ...eligibleForesight, incomingAction: 'SPECIAL', predictedAction: 'ULTIMATE' }), false, 'The move must match the announced prediction.');

assert.strictEqual(shouldSuppressCpuBuffAction('BUFF', false, ['CHANT_HUNT']), true,
  'Chant Hunt must suppress the CPU buff action.');
assert.strictEqual(shouldSuppressCpuBuffAction('BUFF', true, ['CHANT_HUNT']), false,
  'Chant Hunt must never suppress a player action.');
assert.strictEqual(shouldSuppressCpuBuffAction('ATTACK', false, ['CHANT_HUNT']), false,
  'Chant Hunt must not alter the CPU attack action.');
assert.strictEqual(shouldSuppressCpuBuffAction('BUFF', false, ['FORESIGHT']), false,
  'Chant Hunt must be equipped to suppress CPU buffs.');

assert.strictEqual(YIN_YANG_DAMAGE_REDUCTION, 0.5);
const fastYinYangPlan = getTurnExecutionPlan('YIN_YANG', 'BUFF', 240, 80);
assert.strictEqual(fastYinYangPlan.playerGoesFirst, true);
assert.strictEqual(fastYinYangPlan.firstAction, 'YIN_YANG');
assert.strictEqual(fastYinYangPlan.secondAction, 'BUFF');
assert.strictEqual(fastYinYangPlan.yinYangDefenseActive, true,
  'Yin-Yang defense must be primed when the player acts first.');
const slowYinYangPlan = getTurnExecutionPlan('YIN_YANG', 'BUFF', 60, 80);
assert.strictEqual(slowYinYangPlan.playerGoesFirst, false);
assert.strictEqual(slowYinYangPlan.firstAction, 'BUFF');
assert.strictEqual(slowYinYangPlan.secondAction, 'YIN_YANG');
assert.strictEqual(slowYinYangPlan.yinYangDefenseActive, true,
  'Yin-Yang defense must be primed before the CPU acts even when the player is slower.');

assert.deepStrictEqual(resolveYinYangDefense(200, {
  attackerIsPlayer: false, targetIsPlayer: true, defenseActive: fastYinYangPlan.yinYangDefenseActive,
}), { damage: 100, reducedBy: 100, applied: true });
assert.deepStrictEqual(resolveYinYangDefense(201, {
  attackerIsPlayer: false, targetIsPlayer: true, defenseActive: slowYinYangPlan.yinYangDefenseActive,
}), { damage: 100, reducedBy: 101, applied: true },
  'Yin-Yang mitigation must work before the player action resolves.');
assert.deepStrictEqual(resolveYinYangDefense(200, {
  attackerIsPlayer: true, targetIsPlayer: false, defenseActive: true,
}), { damage: 200, reducedBy: 0, applied: false },
  'Yin-Yang must not reduce the player hitting the CPU.');
assert.deepStrictEqual(resolveYinYangDefense(200, {
  attackerIsPlayer: false, targetIsPlayer: true, defenseActive: false,
}), { damage: 200, reducedBy: 0, applied: false },
  'Yin-Yang defense expires outside the chosen turn.');

assert.deepStrictEqual(unlockImprint('CHANT_HUNT')?.unlockedIds, ['FORESIGHT', 'CHANT_HUNT']);
assert.deepStrictEqual(unlockImprint('YIN_YANG')?.unlockedIds, ['FORESIGHT', 'CHANT_HUNT', 'YIN_YANG']);
assert.deepStrictEqual(normalizeEquippedImprints(['FORESIGHT', 'CHANT_HUNT', 'YIN_YANG', 'YIN_YANG']),
  ['FORESIGHT', 'CHANT_HUNT', 'YIN_YANG']);

for (const equippedId of loadImprintProgress().equippedIds) unequipImprint(equippedId);
unlockImprint('BLOOD_TEAR');
unlockImprint('BLOOD_MEDIA');
assert.ok(equipImprint('BLOOD_TEAR')?.equippedIds.includes('BLOOD_TEAR'));
const switchedToBloodMedia = equipImprint('BLOOD_MEDIA');
assert.ok(switchedToBloodMedia?.equippedIds.includes('BLOOD_MEDIA'));
assert.strictEqual(switchedToBloodMedia?.equippedIds.includes('BLOOD_TEAR'), false,
  'Equipping Blood Media automatically removes mutually exclusive Blood Tear.');
assert.ok(switchedToBloodMedia?.equippedIds.length <= MAX_EQUIPPED_IMPRINTS);

if (imprintSaveBeforeTest === undefined) storageValues.delete(IMPRINT_PROGRESS_STORAGE_KEY);
else storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, imprintSaveBeforeTest);
console.log('✓ Imprint persistence and Foresight trigger gates are consistent.');

// Imprint gacha spends one dedicated ticket, excludes owned imprints, and stops when complete.
const gachaRaidSaveBeforeTest = storageValues.get('duel_arena_raid_reward_progress');
const gachaImprintSaveBeforeTest = storageValues.get(IMPRINT_PROGRESS_STORAGE_KEY);
storageValues.set('duel_arena_raid_reward_progress', JSON.stringify({
  coreFragments: 0, imprintTickets: 2, bonusStatPoints: 0, claimedVictoryRunIds: [],
}));
storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, JSON.stringify({ unlockedIds: ['FORESIGHT'], equippedIds: [] }));
const firstImprintDraw = drawImprintGacha(() => 0);
assert.strictEqual(firstImprintDraw.status, 'DRAWN');
assert.strictEqual(firstImprintDraw.imprint.id, 'CHANT_HUNT', 'Owned imprints must be excluded from the draw pool.');
assert.strictEqual(firstImprintDraw.raidRewardProgress.imprintTickets, 1, 'One draw consumes one ticket.');
assert.deepStrictEqual(firstImprintDraw.imprintProgress.unlockedIds, ['FORESIGHT', 'CHANT_HUNT']);
const secondImprintDraw = drawImprintGacha(() => 0);
assert.strictEqual(secondImprintDraw.status, 'DRAWN');
assert.strictEqual(secondImprintDraw.imprint.id, 'YIN_YANG', 'The next draw must choose the only unowned imprint.');
assert.strictEqual(secondImprintDraw.raidRewardProgress.imprintTickets, 0);
for (const imprint of IMPRINT_DEFINITIONS) unlockImprint(imprint.id);
storageValues.set('duel_arena_raid_reward_progress', JSON.stringify({
  coreFragments: 0, imprintTickets: 1, bonusStatPoints: 0, claimedVictoryRunIds: [],
}));
const allCollectedDraw = drawImprintGacha(() => 0);
assert.strictEqual(allCollectedDraw.status, 'ALL_COLLECTED', 'The draw must end once every registered imprint is owned.');
assert.strictEqual(allCollectedDraw.raidRewardProgress.imprintTickets, 1, 'A completed collection must not consume the remaining ticket.');
storageValues.set('duel_arena_raid_reward_progress', JSON.stringify({
  coreFragments: 0, imprintTickets: 0, bonusStatPoints: 0, claimedVictoryRunIds: [],
}));
storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, JSON.stringify({ unlockedIds: ['FORESIGHT'], equippedIds: [] }));
const noTicketDraw = drawImprintGacha(() => 0);
assert.strictEqual(noTicketDraw.status, 'NO_TICKETS');
assert.deepStrictEqual(noTicketDraw.imprintProgress.unlockedIds, ['FORESIGHT'], 'A draw without tickets must not unlock an imprint.');
if (gachaRaidSaveBeforeTest === undefined) storageValues.delete('duel_arena_raid_reward_progress');
else storageValues.set('duel_arena_raid_reward_progress', gachaRaidSaveBeforeTest);
if (gachaImprintSaveBeforeTest === undefined) storageValues.delete(IMPRINT_PROGRESS_STORAGE_KEY);
else storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, gachaImprintSaveBeforeTest);

// Developer controls must update the dedicated ticket inventory and unlock every registered imprint.
const developerRaidSaveBeforeTest = storageValues.get('duel_arena_raid_reward_progress');
const developerImprintSaveBeforeTest = storageValues.get(IMPRINT_PROGRESS_STORAGE_KEY);
storageValues.set('duel_arena_raid_reward_progress', JSON.stringify({
  coreFragments: 0, imprintTickets: 3, bonusStatPoints: 0, claimedVictoryRunIds: [],
}));
storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, JSON.stringify({
  unlockedIds: ['FORESIGHT'], equippedIds: ['FORESIGHT'],
}));
assert.strictEqual(addImprintTicketsForDeveloper(7).imprintTickets, 10,
  'Developer ticket addition must modify the dedicated imprint ticket balance.');
assert.strictEqual(setImprintTicketsForDeveloper(99).imprintTickets, 99,
  'Developer ticket setting must set the dedicated imprint ticket balance.');
const allDeveloperImprints = unlockAllImprintsForDeveloper();
assert.deepStrictEqual(allDeveloperImprints?.unlockedIds, IMPRINT_DEFINITIONS.map(imprint => imprint.id),
  'Developer unlock-all must unlock every registered imprint.');
assert.deepStrictEqual(allDeveloperImprints?.equippedIds, ['FORESIGHT'],
  'Unlock-all must preserve the existing loadout rather than equip everything.');
if (developerRaidSaveBeforeTest === undefined) storageValues.delete('duel_arena_raid_reward_progress');
else storageValues.set('duel_arena_raid_reward_progress', developerRaidSaveBeforeTest);
if (developerImprintSaveBeforeTest === undefined) storageValues.delete(IMPRINT_PROGRESS_STORAGE_KEY);
else storageValues.set(IMPRINT_PROGRESS_STORAGE_KEY, developerImprintSaveBeforeTest);
console.log('✓ Developer imprint ticket and unlock-all controls follow current registration.');



for (let i = 0; i < 8; i += 1) {
  storageValues.set('duel_arena_recruitment_progress', JSON.stringify({ tickets: 10, totalPulls: i * 10, collectedIds: [], lastResults: [] }));
  const drawResult = performRecruitment(10);
  assert.ok(drawResult, '10-pull should be available with 10 tickets.');
  assert.ok(drawResult.results.some(draw => draw.reward.kind === 'ABILITY_CORE'), `10-pull ${i + 1} must contain an ability core.`);
}
console.log('✓ Actual 10-pull execution preserves the ability-core guarantee.');

assert.ok(getEffectiveSpeed(attackBase) >= getEffectiveSpeed(attackTarget), 'Equal-speed rule must allow player first.');

const cpuForAi = createInitialFighter(KAISER, false);
const chargingIrena = {
  ...createInitialFighter(IRENA, true),
  isSuperFallenShotCharging: true,
  ultimateGauge: 0,
  featherChargeBonus: 0,
};
assert.strictEqual(
  CpuAi.decideAction(cpuForAi, chargingIrena, 'EXPERT'),
  'EVADE',
  'Expert CPU should respect an explicitly charging Super Fallen Shot by choosing evade.'
);

const pressuredCpu = {
  ...cpuForAi,
  activeAilments: [{ type: 'PRESSURE', remainingTurns: 2 }],
};
assert.strictEqual(
  CpuAi.decideAction(pressuredCpu, attackBase, 'NORMAL'),
  'SPECIAL',
  'A pressured Kaiser should prefer its fixed-damage special over a weakened normal attack.'
);

const levelStats = BATTLE_CHALLENGE_LEVELS.map(level => {
  const kaiser = createKaiserForLevel(cpuKaiserBase, level);
  const player = createInitialFighter(IRENA, true);
  const enemy = createInitialFighter(kaiser, false, level);
  const calculatedPlayerDamage = calculateNormalAttackDamage({
    attacker: player,
    target: enemy,
    config: { kaiserLevel: level, abilities: [] },
    turn: 1,
    isActingFirst: true,
  });
  const playerDamage = (enemy.kaiserArmorCurrent ?? 0) > 0
    ? Math.floor(calculatedPlayerDamage * 0.75)
    : calculatedPlayerDamage;
  const cpuDamage = calculateNormalAttackDamage({
    attacker: enemy,
    target: player,
    config: { kaiserLevel: level, abilities: [] },
    turn: 1,
    isActingFirst: false,
  });
  return {
    level,
    maxHp: kaiser.maxHp,
    attack: kaiser.attack,
    defense: kaiser.defense,
    speed: kaiser.speed,
    specialSkillDamage: kaiser.specialSkillDamage,
    ultimateSkillDamage: kaiser.ultimateSkillDamage,
    playerDamage,
    cpuDamage,
  };
});

for (let i = 1; i < levelStats.length; i += 1) {
  assert.ok(levelStats[i].maxHp > levelStats[i - 1].maxHp, 'Kaiser HP must rise with level.');
  assert.ok(levelStats[i].attack > levelStats[i - 1].attack, 'Kaiser attack must rise with level.');
  assert.ok(levelStats[i].defense > levelStats[i - 1].defense, 'Kaiser defense must rise with level.');
  assert.ok(levelStats[i].playerDamage <= levelStats[i - 1].playerDamage, 'Higher defense must not increase Irena normal damage.');
}

function simulateNormalAttackBattle(level) {
  const kaiser = createKaiserForLevel(cpuKaiserBase, level);
  let player = createInitialFighter(IRENA, true);
  let enemy = createInitialFighter(kaiser, false);
  let round = 0;

  while (player.currentHp > 0 && enemy.currentHp > 0 && round < 100) {
    round += 1;
    const playerFirst = getEffectiveSpeed(player) >= getEffectiveSpeed(enemy);

    const attacker = playerFirst ? player : enemy;
    const target = playerFirst ? enemy : player;
    const firstDamage = calculateNormalAttackDamage({
      attacker,
      target,
      config: { kaiserLevel: level, abilities: [] },
      turn: round,
      isActingFirst: playerFirst,
    });
    target.currentHp = Math.max(0, target.currentHp - firstDamage);

    if (target.currentHp <= 0) break;

    const secondAttacker = playerFirst ? enemy : player;
    const secondTarget = playerFirst ? player : enemy;
    const secondDamage = calculateNormalAttackDamage({
      attacker: secondAttacker,
      target: secondTarget,
      config: { kaiserLevel: level, abilities: [] },
      turn: round,
      isActingFirst: false,
    });
    secondTarget.currentHp = Math.max(0, secondTarget.currentHp - secondDamage);
  }

  return {
    rounds: round,
    playerHpRemaining: player.currentHp,
    enemyHpRemaining: enemy.currentHp,
  };
}

const battleCurve = levelStats.map(row => ({
  ...row,
  ...simulateNormalAttackBattle(row.level),
}));

for (const row of battleCurve) {
  assert.ok(row.rounds > 0 && row.rounds < 100, `Lv${row.level} normal-attack battle must finish within 100 rounds.`);
}
assert.ok(
  battleCurve[battleCurve.length - 1].rounds <= battleCurve[0].rounds * 3,
  'Lv100 should not require more than three times the Lv10 base-combat rounds.'
);

const lv10 = levelStats[0];
const lv100 = levelStats[levelStats.length - 1];
assert.strictEqual(lv10.maxHp, cpuKaiserBase.maxHp);
assert.strictEqual(lv10.attack, Math.round(cpuKaiserBase.attack));
assert.strictEqual(lv10.defense, cpuKaiserBase.defense);
assert.strictEqual(lv100.maxHp, Math.round(cpuKaiserBase.maxHp * 1.5));
assert.strictEqual(lv100.attack, cpuKaiserBase.attack * 2);
assert.strictEqual(lv100.defense, Math.round(cpuKaiserBase.defense * 1.5));
assert.strictEqual(lv100.speed, cpuKaiserBase.speed * 2);
assert.strictEqual(lv100.specialSkillDamage, cpuKaiserBase.specialSkillDamage * 2);
assert.strictEqual(lv100.ultimateSkillDamage, cpuKaiserBase.ultimateSkillDamage * 2);
assert.ok(lv100.playerDamage >= 80, 'Armor should mitigate but not nullify a Lv100 Irena normal attack.');
assert.ok(lv100.cpuDamage > 0, 'Lv100 Kaiser normal attack must remain threatening.');

console.log('✓ Kaiser Lv10-Lv100 progression stays bounded and monotonic.');
console.log(
  'Level curve:',
  battleCurve.map(row => `Lv${row.level} HP${row.maxHp} ATK${row.attack} DEF${row.defense} IrenaDMG${row.playerDamage} KaiserDMG${row.cpuDamage} rounds${row.rounds}`).join(' | ')
);

console.log('--- Testing isolated Raid Project 01 rules ---');

const raidInitial = createInitialRaidState();
assert.strictEqual(raidInitial.playerHp, RAID_RULES.PLAYER_MAX_HP);
assert.strictEqual(raidInitial.bossHp, RAID_RULES.PHASE_ONE_BOSS_HP);
assert.strictEqual(raidInitial.phase, 1);
assert.strictEqual(canUseRaidAction(raidInitial, 'ATTACK'), true);
assert.strictEqual(canUseRaidAction(raidInitial, 'ULTIMATE'), false);
assert.strictEqual(resolveRaidAction(raidInitial, 'ULTIMATE', () => 0.5), raidInitial, 'An ultimate without full TP must not mutate the run.');

const raidAttack = resolveRaidAction(raidInitial, 'ATTACK', () => 0.5);
assert.strictEqual(raidAttack.turn, 2);
assert.ok(raidAttack.bossHp < raidInitial.bossHp, 'A normal strike must damage the boss.');
assert.ok(raidAttack.tp > 0, 'A normal strike must build ultimate TP.');
assert.strictEqual(raidAttack.lastDamage, raidAttack.totalDamage, 'The impact readout should expose the latest strike damage.');
assert.ok(raidAttack.lastIncomingDamage > 0, 'The impact readout should expose the boss hit after an unguarded action.');
assert.ok(raidAttack.playerHp < raidInitial.playerHp, 'An unguarded attack must take the telegraphed sweep hit.');

const raidCounterState = { ...raidInitial, bossPattern: 'CHARGE' };
const raidCounter = resolveRaidAction(raidCounterState, 'COUNTER', () => 0.5);
assert.strictEqual(raidCounter.playerHp, raidCounterState.playerHp, 'A perfect counter must stop a heavy boss attack.');
assert.ok(raidCounter.perfectReads === 1);
assert.ok(raidCounter.bossPattern !== 'CHARGE', 'A successful counter must reveal a new telegraph.');

const raidInterruptState = { ...raidInitial, bossPattern: 'VOID' };
const raidInterrupt = resolveRaidAction(raidInterruptState, 'FEATHER', () => 0.5);
assert.strictEqual(raidInterrupt.playerHp, raidInterruptState.playerHp, 'Feather must interrupt VOID before its hit resolves.');
assert.strictEqual(raidInterrupt.perfectReads, 1);
assert.ok(raidInterrupt.mp < raidInterruptState.mp);

const raidGuardState = { ...raidInitial, bossPattern: 'SWEEP' };
const raidGuard = resolveRaidAction(raidGuardState, 'GUARD', () => 0.5);
assert.ok(raidGuard.playerHp > raidAttack.playerHp, 'Guard must be safer than an unguarded strike against a sweep.');

const raidBreakState = { ...raidInitial, breakGauge: 90 };
const raidBreak = resolveRaidAction(raidBreakState, 'ATTACK', () => 0.5);
assert.strictEqual(raidBreak.breakCount, 1);
assert.strictEqual(raidBreak.breakGauge, 0);
assert.strictEqual(raidBreak.brokenTurns, 1, 'Full BREAK gauge should open a burst turn.');

const raidPhaseState = { ...raidInitial, bossHp: 100, bossMaxHp: 100 };
const raidPhase = resolveRaidAction(raidPhaseState, 'ATTACK', () => 0.5);
assert.strictEqual(raidPhase.phase, 2, 'Defeating phase one should trigger phase two.');
assert.strictEqual(raidPhase.bossHp, RAID_RULES.PHASE_TWO_BOSS_HP);
assert.strictEqual(raidPhase.bossPattern, 'RAGE');

const raidVictoryState = {
  ...raidInitial,
  phase: 2,
  bossHp: 100,
  bossMaxHp: RAID_RULES.PHASE_TWO_BOSS_HP,
  bossPattern: 'RAGE',
};
const raidVictory = resolveRaidAction(raidVictoryState, 'COUNTER', () => 0.5);
assert.strictEqual(raidVictory.result, 'VICTORY', 'Defeating phase two with a perfect counter should win the run.');
assert.ok(raidVictory.score > 0);

const raidDefeatState = { ...raidInitial, playerHp: 1, bossPattern: 'CHARGE' };
const raidDefeat = resolveRaidAction(raidDefeatState, 'ATTACK', () => 0.99);
assert.strictEqual(raidDefeat.result, 'DEFEAT', 'An unguarded hit at 1 HP must end the run.');
assert.strictEqual(raidDefeat.playerHp, 0);

const raidAdaptState = {
  ...raidInitial,
  phase: 2,
  bossHp: RAID_RULES.PHASE_TWO_BOSS_HP,
  bossMaxHp: RAID_RULES.PHASE_TWO_BOSS_HP,
  bossPattern: 'SWEEP',
  lastAction: 'ATTACK',
  repeatCount: 1,
  combo: 1,
};
const raidAdapt = resolveRaidAction(raidAdaptState, 'ATTACK', () => 0.5);
assert.strictEqual(raidAdapt.adaptation, 1, 'Repeated actions in phase two should increase boss adaptation.');

const raidRegenState = {
  ...raidInitial,
  bossPattern: 'CORE_REGEN',
  bossHp: 3200,
  bossMaxHp: RAID_RULES.PHASE_ONE_BOSS_HP,
};
const raidRegen = resolveRaidAction(raidRegenState, 'ATTACK', () => 0.5);
assert.strictEqual(raidRegen.lastIncomingDamage, 0, 'Core regeneration is a recovery action, not a direct attack.');
assert.strictEqual(
  raidRegen.bossHp,
  Math.min(raidRegenState.bossMaxHp, raidRegenState.bossHp - raidRegen.lastDamage + RAID_RULES.CORE_REGEN_HEAL),
  'Ignoring Core Regeneration should restore boss HP after the player action.',
);
assert.strictEqual(raidRegen.bossPattern === 'CORE_REGEN', false, 'Core regeneration must resolve into a new telegraph.');

const raidRegenInterrupt = resolveRaidAction(raidRegenState, 'FEATHER', () => 0.5);
assert.strictEqual(
  raidRegenInterrupt.bossHp,
  raidRegenState.bossHp - raidRegenInterrupt.lastDamage,
  'Feather must stop the recovery before it restores boss HP.',
);
assert.strictEqual(raidRegenInterrupt.healingPrevented, RAID_RULES.CORE_REGEN_HEAL);
assert.strictEqual(raidRegenInterrupt.interrupts, 1);
assert.strictEqual(raidRegenInterrupt.lastIncomingDamage, 0);
assert.ok(raidRegenInterrupt.history.at(-1).includes('回復阻止'), 'The battle history should record the interrupted healing.');

const raidCollapsePrepState = {
  ...raidInitial,
  phase: 2,
  bossHp: RAID_RULES.PHASE_TWO_BOSS_HP,
  bossMaxHp: RAID_RULES.PHASE_TWO_BOSS_HP,
  bossPattern: 'COLLAPSE',
  bossWindup: 0,
};
const raidCollapseGuardPrep = resolveRaidAction(raidCollapsePrepState, 'GUARD', () => 0.5);
assert.strictEqual(raidCollapseGuardPrep.bossWindup, 1);
assert.strictEqual(raidCollapseGuardPrep.perfectReads, 0, 'Guard must not count as a perfect guard while Collapse Chain is still winding up.');
assert.notStrictEqual(raidCollapseGuardPrep.outcome.title, 'PERFECT GUARD');

const raidCollapsePrepared = resolveRaidAction(raidCollapsePrepState, 'ATTACK', () => 0.5);
assert.strictEqual(raidCollapsePrepared.bossPattern, 'COLLAPSE', 'Collapse Chain must remain telegraphed during its wind-up.');
assert.strictEqual(raidCollapsePrepared.bossWindup, 1, 'The first Collapse Chain turn must arm the next-turn strike.');
assert.strictEqual(raidCollapsePrepared.lastIncomingDamage, 0, 'Collapse Chain must not hit before its release turn.');

const raidCollapseReleaseState = { ...raidCollapsePrepared, bossWindup: 1, bossPattern: 'COLLAPSE' };
const raidCollapseCounter = resolveRaidAction(raidCollapseReleaseState, 'COUNTER', () => 0.5);
assert.strictEqual(raidCollapseCounter.lastIncomingDamage, 0, 'A correctly timed counter must cancel Collapse Chain.');
assert.strictEqual(raidCollapseCounter.interrupts, raidCollapseReleaseState.interrupts + 1);
assert.strictEqual(raidCollapseCounter.bossWindup, 0);
assert.notStrictEqual(raidCollapseCounter.bossPattern, 'COLLAPSE', 'A stopped Collapse Chain must be replaced by a new telegraph.');

const raidCollapseHit = resolveRaidAction(raidCollapseReleaseState, 'ATTACK', () => 0.5);
const raidCollapseGuard = resolveRaidAction(raidCollapseReleaseState, 'GUARD', () => 0.5);
assert.ok(raidCollapseHit.lastIncomingDamage > 1000, 'Ignoring Collapse Chain should carry a substantial damage risk.');
assert.ok(raidCollapseGuard.lastIncomingDamage < raidCollapseHit.lastIncomingDamage,
  'Guard must reduce the Collapse Chain hit if countering is not possible.');
assert.strictEqual(raidCollapseHit.bossWindup, 0, 'The pending multi-turn action must clear after release.');

console.log('✓ Raid telegraphs, counters, channel interruptions, multi-turn wind-up, healing prevention, BREAK, phase transition, victory, defeat, and adaptation verified.');

assert.strictEqual(raidGuardState.mp - raidGuard.mp, 5, 'Guard should have an intentional MP cost after turn regeneration.');
const raidHeavyGuardState = { ...raidInitial, bossPattern: 'CHARGE' };
const raidHeavyGuard = resolveRaidAction(raidHeavyGuardState, 'GUARD', () => 0.5);
const raidHeavyCounter = resolveRaidAction(raidHeavyGuardState, 'COUNTER', () => 0.5);
assert.ok(raidHeavyGuard.lastIncomingDamage > 0, 'Guard should reduce but not nullify a heavy hit.');
assert.strictEqual(raidHeavyCounter.lastIncomingDamage, 0, 'A successful counter should stop a heavy hit.');
assert.ok(raidHeavyCounter.lastDamage > raidHeavyGuard.lastDamage, 'A correct counter should reward the read with more damage than guard.');

const raidFocusState = { ...raidInitial, bossPattern: 'SWEEP', focusCharge: true };
const raidFocusedAttack = resolveRaidAction(raidFocusState, 'ATTACK', () => 0.5);
const raidUnfocusedAttack = resolveRaidAction({ ...raidFocusState, focusCharge: false }, 'ATTACK', () => 0.5);
assert.ok(
  Math.abs(raidFocusedAttack.lastDamage - Math.round(raidUnfocusedAttack.lastDamage * RAID_RULES.FOCUS_DAMAGE_MULTIPLIER)) <= 1,
  'Focus should apply its documented multiplier to the next damaging action, allowing for integer rounding.',
);


const raidFocusTurn = resolveRaidAction({ ...raidInitial, bossPattern: 'SWEEP' }, 'FOCUS', () => 0.5);
const raidUnfocusedTurn = resolveRaidAction({ ...raidInitial, bossPattern: 'SWEEP' }, 'ATTACK', () => 0.5);
const raidHeavyFocus = resolveRaidAction({ ...raidInitial, bossPattern: 'CHARGE' }, 'FOCUS', () => 0.5);
const raidHeavyGuardForFocus = resolveRaidAction({ ...raidInitial, bossPattern: 'CHARGE' }, 'GUARD', () => 0.5);
assert.ok(raidFocusTurn.lastIncomingDamage > 0, 'Focus should not completely negate incoming hits.');
assert.ok(raidFocusTurn.lastIncomingDamage < raidUnfocusedTurn.lastIncomingDamage,
  'Focus should reduce incoming damage while preparing the next hit.');
assert.ok(raidHeavyFocus.lastIncomingDamage > raidHeavyGuardForFocus.lastIncomingDamage,
  'Focus should stay less protective against heavy attacks than dedicated guard.');
const raidActionNames = ['ATTACK', 'FEATHER', 'GUARD', 'COUNTER', 'FOCUS', 'ULTIMATE'];
const raidTelegraphs = [
  { pattern: 'SWEEP', phase: 1 },
  { pattern: 'CHARGE', phase: 1 },
  { pattern: 'VOID', phase: 1 },
  { pattern: 'CORE_REGEN', phase: 1 },
  { pattern: 'RAGE', phase: 2 },
  { pattern: 'COLLAPSE', phase: 2 },
];
let raidMatrixCases = 0;
for (const entry of raidTelegraphs) {
  for (const action of raidActionNames) {
    const scenario = {
      ...raidInitial,
      phase: entry.phase,
      bossHp: entry.phase === 1 ? RAID_RULES.PHASE_ONE_BOSS_HP : RAID_RULES.PHASE_TWO_BOSS_HP,
      bossMaxHp: entry.phase === 1 ? RAID_RULES.PHASE_ONE_BOSS_HP : RAID_RULES.PHASE_TWO_BOSS_HP,
      bossPattern: entry.pattern,
      playerHp: RAID_RULES.PLAYER_MAX_HP,
      mp: RAID_RULES.PLAYER_MAX_MP,
      tp: RAID_RULES.PLAYER_MAX_TP,
      breakGauge: 0,
      brokenTurns: 0,
      featherCooldown: 0,
      focusCharge: false,
      combo: 0,
      repeatCount: 0,
      lastAction: null,
      actionCounts: { ...raidInitial.actionCounts },
      history: [...raidInitial.history],
    };
    assert.strictEqual(canUseRaidAction(scenario, action), true,
      action + ' should be available in the ' + entry.pattern + ' matrix case.');
    const next = resolveRaidAction(scenario, action, () => 0.5);
    assert.strictEqual(next.turn, scenario.turn + 1);
    assert.strictEqual(next.actionCounts[action], 1, action + ' should be recorded once.');
    assert.ok(next.playerHp >= 0 && next.playerHp <= next.playerMaxHp, action + '/' + entry.pattern + ' player HP must be bounded.');
    assert.ok(next.bossHp >= 0 && next.bossHp <= next.bossMaxHp, action + '/' + entry.pattern + ' boss HP must be bounded.');
    assert.ok(next.mp >= 0 && next.mp <= next.maxMp, action + '/' + entry.pattern + ' MP must be bounded.');
    assert.ok(next.tp >= 0 && next.tp <= RAID_RULES.PLAYER_MAX_TP, action + '/' + entry.pattern + ' TP must be bounded.');
    assert.ok(next.history.length <= 5);
    raidMatrixCases += 1;
  }
}
assert.strictEqual(raidMatrixCases, 36, 'Test all six actions against all six available telegraphs.');

const raidDryState = { ...raidInitial, mp: 0, tp: 0 };
for (const action of ['FEATHER', 'GUARD', 'COUNTER', 'FOCUS', 'ULTIMATE']) {
  assert.strictEqual(canUseRaidAction(raidDryState, action), false, action + ' should be disabled without its resource.');
  assert.strictEqual(resolveRaidAction(raidDryState, action, () => 0.5), raidDryState, action + ' must not mutate state when unavailable.');
}
assert.strictEqual(canUseRaidAction(raidDryState, 'ATTACK'), true, 'A free basic action must remain available at zero resources.');
const raidVoidDry = resolveRaidAction({ ...raidDryState, bossPattern: 'VOID' }, 'ATTACK', () => 0.5);
assert.ok(raidVoidDry.mp >= 0 && raidVoidDry.mp <= raidVoidDry.maxMp, 'Void drain and regeneration must keep MP in range.');

function createSeededRaidRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function pickBalancedRaidAction(state) {
  if (state.bossPattern === 'COLLAPSE' && state.bossWindup > 0) {
    if (canUseRaidAction(state, 'COUNTER')) return 'COUNTER';
    if (canUseRaidAction(state, 'GUARD')) return 'GUARD';
    return 'ATTACK';
  }
  if (state.bossPattern === 'CORE_REGEN' && canUseRaidAction(state, 'FEATHER')) return 'FEATHER';
  if (state.tp >= 100 && (state.brokenTurns > 0 || state.bossHp <= 2200)) return 'ULTIMATE';
  if (state.brokenTurns > 0) {
    if (canUseRaidAction(state, 'FEATHER')) return 'FEATHER';
    return 'ATTACK';
  }
  if (state.bossPattern === 'CHARGE' || state.bossPattern === 'RAGE') {
    if (canUseRaidAction(state, 'COUNTER')) return 'COUNTER';
    if (canUseRaidAction(state, 'GUARD')) return 'GUARD';
    return 'ATTACK';
  }
  if (state.bossPattern === 'VOID') {
    if (canUseRaidAction(state, 'FEATHER')) return 'FEATHER';
    if (canUseRaidAction(state, 'GUARD')) return 'GUARD';
    return 'ATTACK';
  }
  if (state.focusCharge) return 'ATTACK';
  if (state.tp < 65 && state.mp >= RAID_RULES.FOCUS_COST && state.playerHp > 2400 && state.bossHp > 2500) return 'FOCUS';
  return 'ATTACK';
}

function pickRecklessRaidAction(state) {
  if (state.tp >= 100 && (state.brokenTurns > 0 || state.bossHp <= 2200)) return 'ULTIMATE';
  return 'ATTACK';
}

function pickGuardRaidAction(state) {
  if (canUseRaidAction(state, 'GUARD')) return 'GUARD';
  return 'ATTACK';
}

function simulateRaidPolicy(policy, seed) {
  let state = createInitialRaidState();
  const random = createSeededRaidRandom(seed);
  let remainingActions = 60;
  while (state.result === 'ACTIVE' && remainingActions > 0) {
    state = resolveRaidAction(state, policy(state), random);
    remainingActions -= 1;
  }
  return { state, turns: state.turn - 1 };
}

const policyResults = { balanced: [], reckless: [], guardSpam: [] };
for (let seed = 101; seed < 131; seed += 1) {
  policyResults.balanced.push(simulateRaidPolicy(pickBalancedRaidAction, seed));
  policyResults.reckless.push(simulateRaidPolicy(pickRecklessRaidAction, seed));
  policyResults.guardSpam.push(simulateRaidPolicy(pickGuardRaidAction, seed));
}
function summarizeRaidPolicy(runs) {
  return {
    wins: runs.filter(run => run.state.result === 'VICTORY').length,
    defeats: runs.filter(run => run.state.result === 'DEFEAT').length,
    avgTurns: Math.round(runs.reduce((sum, run) => sum + run.turns, 0) / runs.length * 10) / 10,
    avgDamageTaken: Math.round(runs.reduce((sum, run) => sum + run.state.damageTaken, 0) / runs.length),
    avgBreaks: Math.round(runs.reduce((sum, run) => sum + run.state.breakCount, 0) / runs.length * 10) / 10,
    avgPerfectReads: Math.round(runs.reduce((sum, run) => sum + run.state.perfectReads, 0) / runs.length * 10) / 10,
    avgActions: Object.fromEntries(raidActionNames.map(action => [
      action,
      Math.round(runs.reduce((sum, run) => sum + run.state.actionCounts[action], 0) / runs.length * 10) / 10,
    ])),
  };
}
const raidPolicySummary = {
  balanced: summarizeRaidPolicy(policyResults.balanced),
  reckless: summarizeRaidPolicy(policyResults.reckless),
  guardSpam: summarizeRaidPolicy(policyResults.guardSpam),
};
console.log('Raid policy simulation (30 fixed seeds each):', JSON.stringify(raidPolicySummary));
assert.ok(raidPolicySummary.balanced.wins > raidPolicySummary.reckless.wins,
  'A telegraph-aware strategy should beat repeated normal attacks in these fixed-seed runs.');

const raidNearFullGuard = resolveRaidAction({
  ...raidInitial,
  playerHp: RAID_RULES.PLAYER_MAX_HP - 10,
  bossPattern: 'SWEEP',
}, 'GUARD', () => 0.5);
assert.ok(raidNearFullGuard.playerHp <= raidNearFullGuard.playerMaxHp, 'Guard healing must clamp at maximum HP.');

const raidTerminalState = {
  ...raidInitial,
  result: 'VICTORY',
  playerHp: 0,
  bossHp: 0,
};
assert.strictEqual(canUseRaidAction(raidTerminalState, 'ATTACK'), false, 'Terminal states must reject further commands.');
assert.strictEqual(resolveRaidAction(raidTerminalState, 'ATTACK', () => 0.5), raidTerminalState,
  'A late input must not mutate a terminal run.');

console.log('✓ Raid 36-case action/telegraph matrix, resource floor, focus value, guard cost, and seeded policy comparison verified.');

console.log('--- ALL TEST ASSERTIONS PASSED! ---');


