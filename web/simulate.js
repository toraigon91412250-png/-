import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

const dom = await JSDOM.fromURL('http://localhost:3000/', {
  runScripts: 'dangerously',
  resources: 'usable',
  pretendToBeVisual: true,
});

dom.window.addEventListener('error', (event) => {
  console.error('WINDOW ERROR:', event.error || event.message);
});

// Polyfill requestAnimationFrame, performance, AudioContext
dom.window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
dom.window.cancelAnimationFrame = (id) => clearTimeout(id);
dom.window.AudioContext = class {
  constructor() {
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {};
  }
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

// Polyfill canvas getContext
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
});

// Wait for bundle to load and run
setTimeout(async () => {
  const document = dom.window.document;
  console.log('Document loaded. HTML length:', document.body.innerHTML.length);

  // Click start battle
  const startBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('出撃') || b.textContent?.includes('バトル開始'));
  if (startBtn) {
    console.log('Clicking start battle button...');
    startBtn.click();
  } else {
    console.log('Start button not found! Buttons:', Array.from(document.querySelectorAll('button')).map(b => b.textContent));
    return;
  }

  // Wait for battle screen to mount
  await new Promise(r => setTimeout(r, 200));

  // Find 攻撃 button
  let buttons = Array.from(document.querySelectorAll('button'));
  console.log('Battle buttons:', buttons.map(b => b.textContent?.trim()));

  const attackBtn1 = buttons.find(b => b.textContent?.includes('攻撃'));
  if (attackBtn1) {
    console.log('Turn 1: Clicking 攻撃...');
    attackBtn1.click();
  }

  // Wait for Turn 1 to complete (animation + sleeps)
  console.log('Waiting for Turn 1 to complete...');
  await new Promise(r => setTimeout(r, 2500));

  buttons = Array.from(document.querySelectorAll('button'));
  console.log('After Turn 1, buttons:', buttons.map(b => b.textContent?.trim()));
  const turnIndicator = document.body.textContent?.match(/第\s*\d+\s*ターン/);
  console.log('Current turn indicator:', turnIndicator ? turnIndicator[0] : 'None');

  const attackBtn2 = buttons.find(b => b.textContent?.includes('攻撃'));
  if (attackBtn2) {
    console.log('Turn 2: Clicking 攻撃...');
    attackBtn2.click();
  } else {
    console.log('Turn 2: 攻撃 button not found or disabled!');
  }

  // Wait 500ms after clicking Turn 2 action
  await new Promise(r => setTimeout(r, 500));
  console.log('Turn 2, 500ms in. Body length:', document.body.innerHTML.length);
  console.log('Any overlays present?', document.querySelectorAll('canvas').length, 'canvas elements');

  // Wait for Turn 2 to finish
  await new Promise(r => setTimeout(r, 2500));
  console.log('After Turn 2. Buttons:', Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim()));
  const turnIndicator2 = document.body.textContent?.match(/第\s*\d+\s*ターン/);
  console.log('Current turn indicator:', turnIndicator2 ? turnIndicator2[0] : 'None');

  process.exit(0);
}, 1000);
