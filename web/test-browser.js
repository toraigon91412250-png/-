import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';

const html = `<!DOCTYPE html><html><body><div id="root"></div></body></html>`;

const virtualConsole = new VirtualConsole();
virtualConsole.on('error', (...args) => console.error('[BROWSER ERROR]:', ...args));
virtualConsole.on('warn', (...args) => console.warn('[BROWSER WARN]:', ...args));
virtualConsole.on('log', (...args) => console.log('[BROWSER LOG]:', ...args));

const dom = new JSDOM(html, {
  url: 'http://localhost:3000/',
  runScripts: 'dangerously',
  virtualConsole,
  pretendToBeVisual: true,
});

const { window } = dom;

// Polyfills
global.window = window;
global.document = window.document;
try {
  Object.defineProperty(global, 'navigator', { value: window.navigator, configurable: true });
} catch {}
global.HTMLElement = window.HTMLElement;
global.MutationObserver = window.MutationObserver;
global.Node = window.Node;
global.localStorage = window.localStorage;
global.performance = { now: () => Date.now() };
global.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
global.cancelAnimationFrame = (id) => clearTimeout(id);

window.AudioContext = class {
  constructor() { this.currentTime = 0; this.state = 'running'; }
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
  get destination() { return {}; }
  resume() {}
};

window.HTMLCanvasElement.prototype.getContext = () => ({
  clearRect() {},
  save() {},
  restore() {},
  beginPath() {},
  arc() {},
  fill() {},
  stroke() {},
  moveTo() {},
  lineTo() {},
  createRadialGradient() {
    return { addColorStop() {} };
  },
});

const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function run() {
  console.log('Loading app bundle...');
  // Find JS bundle in dist/assets/
  const files = fs.readdirSync('/app/applet/web/dist/assets');
  const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
  console.log('Found bundle:', jsFile);

  await import(`/app/applet/web/dist/assets/${jsFile}`);
  await sleep(300);

  console.log('Root HTML after mount:', window.document.getElementById('root').innerHTML.slice(0, 150));

  const buttons = Array.from(window.document.querySelectorAll('button'));
  console.log('Found buttons:', buttons.map(b => b.textContent.trim()));

  const startBtn = buttons.find(b => b.textContent.includes('バトル開始'));
  if (!startBtn) {
    console.error('Could not find start button!');
    return;
  }

  console.log('Clicking start battle...');
  startBtn.click();
  await sleep(300);

  let battleButtons = Array.from(window.document.querySelectorAll('button'));
  console.log('Battle buttons:', battleButtons.map(b => b.textContent.trim()));

  const attackBtn = battleButtons.find(b => b.textContent.includes('攻撃'));
  console.log('--- ACTION 1: Clicking 攻撃 ---');
  attackBtn.click();

  // Wait for Turn 1 to complete
  await sleep(3000);
  console.log('Turn 1 completed.');

  battleButtons = Array.from(window.document.querySelectorAll('button'));
  console.log('Battle buttons after Turn 1:', battleButtons.map(b => `${b.textContent.trim()}(disabled=${b.disabled})`));

  const attackBtn2 = battleButtons.find(b => b.textContent.includes('攻撃'));
  console.log('--- ACTION 2: Clicking 攻撃 ---');
  attackBtn2.click();

  // Check state right after click
  console.log('Checking state immediately after clicking Action 2...');
  console.log('Root content length:', window.document.getElementById('root').innerHTML.length);
  console.log('Root content sample:', window.document.getElementById('root').innerHTML.slice(0, 200));

  await sleep(300);
  console.log('300ms after Action 2: length=', window.document.getElementById('root').innerHTML.length);

  await sleep(1000);
  console.log('1300ms after Action 2: length=', window.document.getElementById('root').innerHTML.length);

  await sleep(2000);
  console.log('3300ms after Action 2 (Turn 2 complete): length=', window.document.getElementById('root').innerHTML.length);

  battleButtons = Array.from(window.document.querySelectorAll('button'));
  console.log('Battle buttons after Turn 2:', battleButtons.map(b => `${b.textContent.trim()}(disabled=${b.disabled})`));

  console.log('--- ACTION 3: Clicking 攻撃 (Turn 3) ---');
  const attackBtn3 = battleButtons.find(b => b.textContent.includes('攻撃'));
  if (attackBtn3) {
    attackBtn3.click();
    await sleep(3300);
    console.log('Turn 3 complete: length=', window.document.getElementById('root').innerHTML.length);
  }

  console.log('ALL ACTIONS EXECUTED SUCCESSFULLY!');
  process.exit(0);
}

run().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
