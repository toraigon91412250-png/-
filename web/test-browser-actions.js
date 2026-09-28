import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';

async function testActionSequence(playerActions, testName) {
  console.log(`\n========================================`);
  console.log(`TEST: ${testName} -> [${playerActions.join(', ')}]`);
  console.log(`========================================`);

  const html = `<!DOCTYPE html><html><body><div id="root"></div></body></html>`;

  let hadError = null;
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('error', (...args) => {
    console.error('[BROWSER ERROR]:', ...args);
    hadError = args.join(' ');
  });

  const dom = new JSDOM(html, {
    url: 'http://localhost:3000/',
    runScripts: 'dangerously',
    virtualConsole,
    pretendToBeVisual: true,
  });

  const { window } = dom;

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

  // Find JS bundle
  const files = fs.readdirSync('/app/applet/web/dist/assets');
  const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));
  await import(`/app/applet/web/dist/assets/${jsFile}?t=${Date.now()}`);
  await sleep(200);

  // Click Start Battle
  const startBtn = Array.from(window.document.querySelectorAll('button')).find(b => b.textContent.includes('バトル開始'));
  if (!startBtn) throw new Error('Start button not found');
  startBtn.click();
  await sleep(200);

  // Execute turns
  for (let t = 0; t < playerActions.length; t++) {
    const act = playerActions[t];
    const turnNum = t + 1;
    console.log(`--- Turn ${turnNum}: Selecting action "${act}" ---`);

    const buttons = Array.from(window.document.querySelectorAll('button'));
    let targetBtn = null;
    if (act === 'ATTACK') targetBtn = buttons.find(b => b.textContent.includes('攻撃'));
    else if (act === 'EVADE') targetBtn = buttons.find(b => b.textContent.includes('回避'));
    else if (act === 'BUFF') targetBtn = buttons.find(b => b.textContent.includes('強化'));
    else if (act === 'SPECIAL') targetBtn = buttons.find(b => b.textContent.includes('特殊'));
    else if (act === 'ULTIMATE') targetBtn = buttons.find(b => b.textContent.includes('必殺技'));

    if (!targetBtn) {
      throw new Error(`Button for action "${act}" not found on turn ${turnNum}!`);
    }

    if (targetBtn.disabled) {
      console.log(`Action "${act}" is disabled on turn ${turnNum}, skipping or selecting fallback...`);
      continue;
    }

    targetBtn.click();
    console.log(`Clicked "${act}". Waiting for turn ${turnNum} execution...`);

    // Monitor for black screen / errors during execution
    for (let check = 0; check < 6; check++) {
      await sleep(500);
      const rootHtml = window.document.getElementById('root').innerHTML;
      if (rootHtml.length < 500) {
        console.error(`🚨 DETECTED EMPTY/BLACK SCREEN on Turn ${turnNum} at ${check * 500}ms! HTML length: ${rootHtml.length}`);
        console.error('HTML content:', rootHtml);
        throw new Error(`Screen went black on Turn ${turnNum}!`);
      }
      if (hadError) {
        throw new Error(`Console error caught on Turn ${turnNum}: ${hadError}`);
      }
    }

    // Wait until command buttons re-enabled
    let isReady = false;
    for (let w = 0; w < 10; w++) {
      const bList = Array.from(window.document.querySelectorAll('button'));
      const atk = bList.find(b => b.textContent.includes('攻撃'));
      if (atk && !atk.disabled) {
        isReady = true;
        break;
      }
      await sleep(300);
    }
    console.log(`Turn ${turnNum} settled. Buttons ready: ${isReady}`);
  }

  console.log(`✓ Test "${testName}" PASSED!`);
}

async function runAll() {
  await testActionSequence(['BUFF', 'ATTACK', 'ATTACK'], 'Buff -> Attack -> Attack');
  await testActionSequence(['EVADE', 'ATTACK', 'ATTACK'], 'Evade -> Attack -> Attack');
  await testActionSequence(['SPECIAL', 'ATTACK', 'ATTACK'], 'Special -> Attack -> Attack');
  await testActionSequence(['SPECIAL', 'BUFF', 'ATTACK'], 'Special -> Buff -> Attack');
  await testActionSequence(['SPECIAL', 'EVADE', 'ATTACK'], 'Special -> Evade -> Attack');
  await testActionSequence(['ATTACK', 'SPECIAL', 'BUFF'], 'Attack -> Special -> Buff');
  console.log('\n========================================');
  console.log('ALL ACTION COMBINATION TESTS PASSED!');
  console.log('========================================');
  process.exit(0);
}

runAll().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
