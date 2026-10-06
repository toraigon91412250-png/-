import assert from 'assert';
import { register } from 'node:module';
import { BATTLE_CHALLENGE_LEVELS, getEffectiveSpeed, getEffectiveAttack, getEffectiveDefense, STATUS_AILMENTS } from './src/types/game.ts';
import {
  applyDynamicAbilityModifiers,
  applyStaticAbilityModifiers,
  createKaiserForLevel,
  getJudgmentDamageMultiplier,
  getJudgmentDefenseIgnore,
  getJudgmentThreshold,
} from './src/utils/abilitySystem.ts';
import { createInitialFighter } from './src/hooks/useBattleGame.ts';
import { calculateNormalAttackDamage, calculateSpecialDamage } from './src/utils/battleMath.ts';

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

const { IRENA, KAISER, getIrenaWithSkillProgress } = await import('./src/data/characters.ts');
const { CpuAi } = await import('./src/utils/ai.ts');

const { getIrenaSuperFallenShotMultiplier } = await import('./src/types/game.ts');

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

 // Regression coverage for the four base stats flowing through status, speed, order, and damage calculations.
const statFlowIrena = createInitialFighter({ ...IRENA, attack: 200, speed: 100 }, true);
const statFlowTarget = createInitialFighter({ ...KAISER, id: 'stat-flow-target', defense: 100, speed: 110 }, false);

const baseNormalStatFlowDamage = calculateNormalAttackDamage({
  attacker: statFlowIrena,
  target: statFlowTarget,
  config: { kaiserLevel: 10, abilities: [] },
  turn: 1,
  isActingFirst: false,
});
assert.strictEqual(baseNormalStatFlowDamage, 100);

const bleedingTarget = {
  ...statFlowTarget,
  activeAilments: [{ type: 'BLEED', remainingTurns: 3, dotDamage: 30 }],
};
assert.strictEqual(getEffectiveDefense(bleedingTarget), 80);
assert.strictEqual(
  calculateNormalAttackDamage({
    attacker: statFlowIrena,
    target: bleedingTarget,
    config: { kaiserLevel: 10, abilities: [] },
    turn: 1,
    isActingFirst: false,
  }),
  120,
);

const pressuredAttacker = {
  ...statFlowIrena,
  activeAilments: [{ type: 'PRESSURE', remainingTurns: 2 }],
};
assert.strictEqual(getEffectiveAttack(pressuredAttacker), 175);
assert.strictEqual(
  calculateNormalAttackDamage({
    attacker: pressuredAttacker,
    target: statFlowTarget,
    config: { kaiserLevel: 10, abilities: [] },
    turn: 1,
    isActingFirst: false,
  }),
  75,
);

const orderPlayer = createInitialFighter({ ...IRENA, speed: 100 }, true);
const orderEnemy = createInitialFighter({ ...KAISER, speed: 110 }, false);
const pressuredOrderEnemy = {
  ...orderEnemy,
  activeAilments: [{ type: 'PRESSURE', remainingTurns: 2 }],
};
assert.strictEqual(getEffectiveSpeed(orderEnemy), 110);
assert.strictEqual(getEffectiveSpeed(pressuredOrderEnemy), 85);
assert.ok(
  getEffectiveSpeed(orderPlayer) >= getEffectiveSpeed(pressuredOrderEnemy),
  'A speed debuff must propagate to effective turn-order speed calculations.'
);

assert.strictEqual(
  calculateSpecialDamage({
    attacker: createInitialFighter({ ...IRENA, specialSkillDamage: 300 }, true),
    target: bleedingTarget,
    config: { kaiserLevel: 10, abilities: [] },
    turn: 1,
    isActingFirst: true,
  }),
  220,
);
console.log('✓ Base HP/ATK/DEF/SPD changes propagate through status and damage calculations.');

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
assert.strictEqual(lv50Kaiser.defense, 171);
assert.strictEqual(maxSkillIrena.character.specialSkillDamage, 525);
assert.strictEqual(lv50FeatherDamage, 354);

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
assert.strictEqual(lv4AbyssKaiser.character.attack, 152);
assert.strictEqual(lv4AbyssKaiser.character.specialSkillDamage, KAISER.specialSkillDamage);
assert.strictEqual(lv5AbyssKaiser.character.attack, 150);
assert.strictEqual(lv5AbyssKaiser.character.specialSkillDamage, 353);
assert.strictEqual(lv5AbyssKaiser.character.ultimateSkillDamage, 470);

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
  const kaiser = createKaiserForLevel(KAISER, level);
  const player = createInitialFighter(IRENA, true);
  const enemy = createInitialFighter(kaiser, false);
  const playerDamage = calculateNormalAttackDamage({
    attacker: player,
    target: enemy,
    config: { kaiserLevel: level, abilities: [] },
    turn: 1,
    isActingFirst: true,
  });
  const cpuDamage = calculateNormalAttackDamage({
    attacker: enemy,
    target: player,
    config: { kaiserLevel: level, abilities: [] },
    turn: 1,
    isActingFirst: false,
  });
  return { level, maxHp: kaiser.maxHp, attack: kaiser.attack, defense: kaiser.defense, playerDamage, cpuDamage };
});

for (let i = 1; i < levelStats.length; i += 1) {
  assert.ok(levelStats[i].maxHp > levelStats[i - 1].maxHp, 'Kaiser HP must rise with level.');
  assert.ok(levelStats[i].attack > levelStats[i - 1].attack, 'Kaiser attack must rise with level.');
  assert.ok(levelStats[i].defense > levelStats[i - 1].defense, 'Kaiser defense must rise with level.');
  assert.ok(levelStats[i].playerDamage <= levelStats[i - 1].playerDamage, 'Higher defense must not increase Irena normal damage.');
}

function simulateNormalAttackBattle(level) {
  const kaiser = createKaiserForLevel(KAISER, level);
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
assert.strictEqual(lv10.maxHp, KAISER.maxHp);
assert.strictEqual(lv10.attack, KAISER.attack);
assert.strictEqual(lv10.defense, KAISER.defense);
assert.strictEqual(lv100.maxHp, KAISER.maxHp * 2);
assert.strictEqual(lv100.attack, KAISER.attack * 2);
assert.strictEqual(lv100.defense, Math.round(KAISER.defense * 1.5));
assert.ok(lv100.playerDamage >= 120, 'Lv100 must remain damaging enough for Irena normal attacks.');
assert.ok(lv100.cpuDamage > 0, 'Lv100 Kaiser normal attack must remain threatening.');

console.log('✓ Kaiser Lv10-Lv100 progression stays bounded and monotonic.');
console.log(
  'Level curve:',
  battleCurve.map(row => `Lv${row.level} HP${row.maxHp} ATK${row.attack} DEF${row.defense} IrenaDMG${row.playerDamage} KaiserDMG${row.cpuDamage} rounds${row.rounds}`).join(' | ')
);
console.log('--- ALL TEST ASSERTIONS PASSED! ---');
