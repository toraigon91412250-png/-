import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
// @ts-expect-error jsdom is used only by this Node test harness.
import { JSDOM } from 'jsdom';
import { IRENA, KAISER } from './src/data/characters';
import { useBattleGame } from './src/hooks/useBattleGame';
import { BattleScreen } from './src/components/BattleScreen';
import { IrenaSkillProgress } from './src/types/game';

declare const process: { exit(code?: number): never };

const nodeGlobal = globalThis as any;

const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
});

nodeGlobal.window = dom.window as any;
nodeGlobal.document = dom.window.document as any;
const startTime = Date.now();
nodeGlobal.performance = { now: () => Date.now() - startTime } as any;
nodeGlobal.requestAnimationFrame = ((cb: FrameRequestCallback) => setTimeout(() => cb(nodeGlobal.performance.now()), 16)) as any;
nodeGlobal.cancelAnimationFrame = ((id: ReturnType<typeof setTimeout>) => clearTimeout(id)) as any;

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

(nodeGlobal.window as any).AudioContext = class {
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

const capturedErrors: unknown[] = [];
dom.window.addEventListener('error', (e: ErrorEvent) => {
  console.error('DOM WINDOW ERROR CAUGHT:', e.error || e.message);
  capturedErrors.push(e.error || e.message);
});

console.log('--- Starting React Full Battle Test Harness ---');

const testSkillProgress: IrenaSkillProgress = {
  shards: 0,
  featherLevel: 1,
  ruinLevel: 1,
  featherPath: null,
  ruinPath: null,
  superFallenShotUnlocked: false,
};

function Harness() {
  const {
    state,
    onActionSelected,
    restartBattle,
    toggleSound,
    toggleSpeed,
  } = useBattleGame(IRENA, KAISER, 'NORMAL');

  const [renderState, setRenderState] = useState(state);
  React.useEffect(() => setRenderState(state), [state]);

  return (
    <BattleScreen
      state={renderState}
      onAction={onActionSelected}
      onBackToSelect={() => {}}
      onRestart={() => restartBattle()}
      skillProgress={testSkillProgress}
      onUpgradeSkill={() => {}}
      onChooseSkillPath={() => {}}
      onToggleSound={toggleSound}
      onToggleSpeed={toggleSpeed}
    />
  );
}

const root = createRoot(document.getElementById('root')!);
root.render(<Harness />);

await new Promise(resolve => setTimeout(resolve, 100));

async function runTest(): Promise<void> {
  try {
    const battle = (globalThis as any).__battle;
    void battle;
    console.log('Initial battle rendered.');
    console.log('Harness mounted successfully.');

    if (capturedErrors.length > 0) {
      throw new Error(`Captured errors: ${String(capturedErrors.join(', '))}`);
    }

    console.log('SUCCESS: React battle test harness mounted without errors.');
    process.exit(0);
  } catch (err) {
    console.error('TEST EXCEPTION:', err);
    process.exit(1);
  }
}

runTest();
