import { createInitialFighter } from './src/hooks/useBattleGame.ts';
import { CHARACTERS, IRENA, KAISER } from './src/data/characters.ts';
import { CpuAi } from './src/utils/ai.ts';
import {
  getEffectiveSpeed,
  getEffectiveAttack,
  getEffectiveDefense,
  STATUS_AILMENTS,
} from './src/types/game.ts';

console.log('Testing turn simulation logic in node...');

let state = {
  turnNumber: 1,
  player: createInitialFighter(IRENA, true),
  enemy: createInitialFighter(KAISER, false),
  logs: [],
  phase: 'SELECT_ACTION',
  visualEffect: null,
  winnerIsPlayer: null,
  cpuDifficulty: 'NORMAL',
  battleSpeedMultiplier: 1.0,
  isSoundEnabled: true,
  isAnimating: false,
};

function updateState(updater) {
  state = updater(state);
}

// Simulate Turn 1: Player ATTACK, CPU decides
console.log('--- Turn 1 ---');
let cpuAction1 = CpuAi.decideAction(state.enemy, state.player, state.cpuDifficulty);
console.log('Turn 1 CPU action:', cpuAction1);

// Suppose Turn 1 finishes:
state = {
  ...state,
  turnNumber: 2,
  phase: 'SELECT_ACTION',
  player: {
    ...state.player,
    currentHp: 850,
    isEvading: false,
    specialCooldownRemaining: 0,
  },
  enemy: {
    ...state.enemy,
    currentHp: 1100,
    isEvading: false,
    specialCooldownRemaining: 3,
  },
  visualEffect: null,
  isAnimating: false,
};

console.log('State at start of Turn 2:');
console.log('Phase:', state.phase);
console.log('Turn:', state.turnNumber);
console.log('Player HP:', state.player.currentHp, 'CD:', state.player.specialCooldownRemaining);
console.log('Enemy HP:', state.enemy.currentHp, 'CD:', state.enemy.specialCooldownRemaining);

// Now Turn 2: Player selects ATTACK
console.log('--- Turn 2 Action Selected ---');
let cpuAction2 = CpuAi.decideAction(state.enemy, state.player, state.cpuDifficulty);
console.log('Turn 2 CPU action:', cpuAction2);

let playerSpeed = getEffectiveSpeed(state.player);
let cpuSpeed = getEffectiveSpeed(state.enemy);
console.log('Player speed:', playerSpeed, 'CPU speed:', cpuSpeed);

console.log('Simulation complete without runtime error in pure logic.');
