import { CHARACTERS, IRENA, KAISER } from './src/data/characters.ts';
import { createInitialFighter } from './src/hooks/useBattleGame.ts';
import { CpuAi } from './src/utils/ai.ts';
import { getEffectiveSpeed, getEffectiveAttack, getEffectiveDefense } from './src/types/game.ts';

console.log('--- Simulating Battle Turns ---');

let player = createInitialFighter(IRENA, true);
let enemy = createInitialFighter(KAISER, false);
let turnNumber = 1;
let phase = 'SELECT_ACTION';

console.log('Turn 1 Start: Player HP:', player.currentHp, 'Enemy HP:', enemy.currentHp);

// Simulate Turn 1: Player chooses ATTACK, CPU chooses action
let cpuAction1 = CpuAi.decideAction(enemy, player, 'NORMAL');
console.log('Turn 1 CPU action:', cpuAction1);

// Suppose Turn 1 finishes:
// Player attacked Kaiser:
let pSpeed = getEffectiveSpeed(player);
let eSpeed = getEffectiveSpeed(enemy);
console.log('P speed:', pSpeed, 'E speed:', eSpeed);

// Kaiser takes damage:
let rawDmg = getEffectiveAttack(player) - getEffectiveDefense(enemy);
let baseDmg = Math.max(15, rawDmg) + 20; // Precognition
let finalDmg = Math.max(0, baseDmg - 20); // Kaiser armor
enemy.currentHp -= finalDmg;
console.log('Enemy HP after player attack:', enemy.currentHp);

// Kaiser acts (say SPECIAL):
if (cpuAction1 === 'SPECIAL') {
  player.currentHp -= enemy.character.specialSkillDamage;
  player.activeAilments.push({ type: 'PRESSURE', remainingTurns: 2 });
  enemy.specialCooldownRemaining = enemy.character.specialSkillCooldown;
  console.log('Player HP after Kaiser special:', player.currentHp, 'Ailments:', player.activeAilments);
}

// End of Round 1:
turnNumber = 2;
player.specialCooldownRemaining = Math.max(0, player.specialCooldownRemaining - 1);
enemy.specialCooldownRemaining = Math.max(0, enemy.specialCooldownRemaining - 1);
console.log('Turn 2 Start: Player HP:', player.currentHp, 'Enemy HP:', enemy.currentHp);
console.log('Player effective speed in Turn 2:', getEffectiveSpeed(player));
console.log('Player effective attack in Turn 2:', getEffectiveAttack(player));
console.log('Player effective defense in Turn 2:', getEffectiveDefense(player));

// Now Turn 2: Player chooses ATTACK
let cpuAction2 = CpuAi.decideAction(enemy, player, 'NORMAL');
console.log('Turn 2 CPU action:', cpuAction2);

// Check ailments decrement:
for (const a of player.activeAilments) {
  a.remainingTurns -= 1;
}
player.activeAilments = player.activeAilments.filter(a => a.remainingTurns > 0);
console.log('Player active ailments after turn 2 decrement:', player.activeAilments);
console.log('Simulation complete without throw.');
