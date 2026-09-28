import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { App } from './src/App';
import { CHARACTERS, IRENA, KAISER } from './src/data/characters';
import { useBattleGame } from './src/hooks/useBattleGame';
import { BattleScreen } from './src/components/BattleScreen';

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
});

global.window = dom.window as any;
global.document = dom.window.document as any;
const startTime = Date.now();
global.performance = { now: () => Date.now() - startTime } as any;
global.requestAnimationFrame = (cb) => setTimeout(() => cb(global.performance.now()), 16) as any;
global.cancelAnimationFrame = (id) => clearTimeout(id) as any;

// Mock canvas
dom.window.HTMLCanvasElement.prototype.getContext = () => ({
  clearRect() {},
  createRadialGradient() { return { addColorStop() {} }; },
  save() {},
  restore() {},
  beginPath() {},
  arc() {},
  fill() {},
  stroke() {},
  moveTo() {},
  lineTo() {},
}) as any;

// Mock AudioContext
(global.window as any).AudioContext = class {
  currentTime = 0;
  state = 'running';
  destination = {};
  createOscillator() {
    return {
      type: '',
      frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
      start() {},
      stop() {},
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
      connect() {},
    };
  }
  resume() { return Promise.resolve(); }
};

let capturedErrors: any[] = [];
dom.window.addEventListener('error', (e: any) => {
  console.error('DOM WINDOW ERROR CAUGHT:', e.error || e.message);
  capturedErrors.push(e.error || e.message);
});

console.log('--- Starting React Full Battle Test Harness ---');

function Harness() {
  const {
    state,
    onActionSelected,
    restartBattle,
    toggleSound,
    toggleSpeed,
  } = useBattleGame(IRENA, KAISER, 'NORMAL');

  (global as any).__battle = {
    state,
    onActionSelected,
  };

  return (
    <BattleScreen
      state={state}
      onAction={onActionSelected}
      onBackToSelect={() => {}}
      onRestart={() => restartBattle()}
      onToggleSound={toggleSound}
      onToggleSpeed={toggleSpeed}
    />
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Harness />);

// Wait for initial render
await new Promise(r => setTimeout(r, 100));

async function runTest() {
  try {
    console.log('Initial battle rendered.');
    let battle = (global as any).__battle;
    console.log('Turn 1 state:', battle.state.turnNumber, 'phase:', battle.state.phase);

    console.log('Executing Turn 1: SPECIAL...');
    battle.onActionSelected('SPECIAL');

    // Wait for Turn 1 to complete (at speed 1.0, ~2.5s)
    let waited = 0;
    while (waited < 4000) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      battle = (global as any).__battle;
      if (battle.state.phase === 'SELECT_ACTION' && battle.state.turnNumber === 2) {
        break;
      }
    }

    console.log(`Turn 1 finished after ${waited}ms.`);
    console.log('Turn 2 state:', battle.state.turnNumber, 'phase:', battle.state.phase);
    console.log('Visual effect:', battle.state.visualEffect);

    console.log('Executing Turn 2: ATTACK...');
    battle.onActionSelected('ATTACK');

    // Check state immediately after selecting Turn 2 action
    await new Promise(r => setTimeout(r, 50));
    battle = (global as any).__battle;
    console.log('Immediately after Turn 2 selected - phase:', battle.state.phase, 'visualEffect:', battle.state.visualEffect);

    // Wait 500ms
    await new Promise(r => setTimeout(r, 500));
    battle = (global as any).__battle;
    console.log('500ms into Turn 2 - phase:', battle.state.phase, 'visualEffect:', battle.state.visualEffect?.effectType);

    // Wait for Turn 2 to finish
    waited = 0;
    while (waited < 4000) {
      await new Promise(r => setTimeout(r, 100));
      waited += 100;
      battle = (global as any).__battle;
      if (battle.state.phase === 'SELECT_ACTION' && battle.state.turnNumber === 3) {
        break;
      }
      if (battle.state.phase === 'BATTLE_FINISHED') {
        console.log('Battle finished during Turn 2!');
        break;
      }
    }

    console.log(`Turn 2 finished after ${waited}ms.`);
    console.log('Turn 3 state:', battle.state.turnNumber, 'phase:', battle.state.phase);
    console.log('Visual effect at turn 3:', battle.state.visualEffect);

    if (capturedErrors.length > 0) {
      console.error('FAIL: Captured errors:', capturedErrors);
      process.exit(1);
    } else {
      console.log('SUCCESS: No errors in Turn 1 and Turn 2!');
      process.exit(0);
    }
  } catch (err) {
    console.error('TEST EXCEPTION:', err);
    process.exit(1);
  }
}

runTest();
