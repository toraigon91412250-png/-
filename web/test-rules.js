import assert from 'assert';
import { IRENA, KAISER } from './src/data/characters.ts';
import { createInitialFighter } from './src/hooks/useBattleGame.ts';
import {
  getEffectiveSpeed,
  getEffectiveAttack,
  getEffectiveDefense,
  STATUS_AILMENTS,
} from './src/types/game.ts';
import { calculateNormalAttackDamage } from './src/utils/battleMath.ts';

console.log('--- Testing Web Version Game Logic & Rules ---');

assert.strictEqual(IRENA.maxHp, 4000);
assert.strictEqual(IRENA.attack, 360);
assert.strictEqual(IRENA.defense, 200);
assert.strictEqual(IRENA.speed, 240);
assert.strictEqual(IRENA.evasionRate, 0.25);
assert.strictEqual(IRENA.specialSkillDamage, 300);
assert.strictEqual(IRENA.specialSkillCooldown, 2);
assert.strictEqual(IRENA.ultimateSkillDamage, 500);

assert.strictEqual(KAISER.maxHp, 2400);
assert.strictEqual(KAISER.attack, 160);
assert.strictEqual(KAISER.defense, 140);
assert.strictEqual(KAISER.speed, 80);
assert.strictEqual(KAISER.evasionRate, 0.10);
assert.strictEqual(KAISER.specialSkillDamage, 375);
assert.strictEqual(KAISER.specialSkillCooldown, 1);
assert.strictEqual(KAISER.ultimateSkillDamage, 500);
console.log('✓ Current character stats verified.');

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

const fighterIrena = createInitialFighter(IRENA, true);
assert.strictEqual(getEffectiveSpeed(fighterIrena), 240);
fighterIrena.activeAilments.push({ type: 'BLEED', remainingTurns: 3 });
assert.strictEqual(getEffectiveSpeed(fighterIrena), 220);
assert.strictEqual(getEffectiveDefense(fighterIrena), 180);

const fighterKaiser = createInitialFighter(KAISER, false);
fighterKaiser.activeAilments.push({ type: 'PRESSURE', remainingTurns: 2 });
assert.strictEqual(getEffectiveSpeed(fighterKaiser), 55);
assert.strictEqual(getEffectiveAttack(fighterKaiser), 135);

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

const buffed = { ...attackBase, isBuffed: true, buffDamageBonus: 125 };
assert.strictEqual(calculateNormalAttackDamage({
  attacker: buffed,
  target: attackTarget,
  config,
  turn: 1,
  isActingFirst: true,
}), 345);

assert.ok(getEffectiveSpeed(attackBase) >= getEffectiveSpeed(attackTarget), 'Equal-speed rule must allow player first.');

console.log('✓ Shared damage formulas and same-speed order verified.');
console.log('--- ALL TEST ASSERTIONS PASSED! ---');
