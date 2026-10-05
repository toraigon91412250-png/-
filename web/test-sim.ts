import { createInitialFighter } from './src/hooks/useBattleGame';
import { IRENA, KAISER } from './src/data/characters';
import { CpuAi } from './src/utils/ai';
import {
  BattleUiState,
  getEffectiveSpeed,
} from './src/types/game';

console.log('Testing turn simulation logic in node...');

let state: BattleUiState = {
  turnNumber: 1,
  player: createInitialFighter(IRENA, true),
  enemy: createInitialFighter(KAISER, false),
  logs: [],
  phase: 'SELECT_ACTION',
  visualEffect: null,
  visualEffects: [],
  judgmentReady: false,
  winnerIsPlayer: null,
  cpuDifficulty: 'NORMAL',
  cpuIntent: CpuAi.decideAction(createInitialFighter(KAISER, false), createInitialFighter(IRENA, true), 'NORMAL'),
  battleSpeedMultiplier: 1.0,
  isSoundEnabled: true,
  isAnimating: false,
  lastBattleReward: 0,
  lastBattleMasteryReward: 0,
  battleConfig: { kaiserLevel: 10, abilities: [] },
};

console.log('--- Turn 1 ---');
const cpuAction1 = CpuAi.decideAction(state.enemy, state.player, state.cpuDifficulty);
console.log('Turn 1 CPU action:', cpuAction1);

state = {
  ...state,
  turnNumber: 2,
  phase: 'SELECT_ACTION',
  player: {
    ...state.player,
    currentHp: 3850,
    isEvading: false,
    specialCooldownRemaining: 0,
  },
  enemy: {
    ...state.enemy,
    currentHp: 2180,
    isEvading: false,
    specialCooldownRemaining: 0,
  },
  visualEffect: null,
  visualEffects: [],
  isAnimating: false,
};

console.log('State at start of Turn 2:');
console.log('Phase:', state.phase);
console.log('Turn:', state.turnNumber);
console.log('Player HP:', state.player.currentHp, 'CD:', state.player.specialCooldownRemaining);
console.log('Enemy HP:', state.enemy.currentHp, 'CD:', state.enemy.specialCooldownRemaining);

console.log('--- Turn 2 Action Selected ---');
const cpuAction2 = CpuAi.decideAction(state.enemy, state.player, state.cpuDifficulty);
console.log('Turn 2 CPU action:', cpuAction2);

const playerSpeed = getEffectiveSpeed(state.player);
const cpuSpeed = getEffectiveSpeed(state.enemy);
console.log('Player speed:', playerSpeed, 'CPU speed:', cpuSpeed);
console.log('Player goes first on ties:', playerSpeed >= cpuSpeed);
console.log('Simulation complete without runtime error in pure logic.');
