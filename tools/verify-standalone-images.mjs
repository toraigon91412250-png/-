import fs from 'node:fs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const [baselinePath, targetPath = 'irena-play.html'] = process.argv.slice(2);
if (!baselinePath) throw Error('Usage: node tools/verify-standalone-images.mjs BEFORE.html [AFTER.html]');
const before = fs.readFileSync(baselinePath, 'utf8'), after = fs.readFileSync(targetPath, 'utf8');
const declaration = /const __IRENA_EMBEDDED_ASSETS__=(\[.*?\]);/;
const oldImages = JSON.parse(before.match(declaration)[1]), newImages = JSON.parse(after.match(declaration)[1]);
assert.equal(before.replace(declaration, '__IMAGE_ARRAY__'), after.replace(declaration, '__IMAGE_ARRAY__'), 'runtime and CSS unchanged');
assert.equal(newImages.length, oldImages.length);
const changed = newImages.flatMap((image, i) => image === oldImages[i] ? [] : [i]);
const errors = [], network = [], checks = [];
// The managed Chromium disallows file:// navigation. Serve just this document
// from memory while the context is offline; every sidecar request is rejected.
const documentURL = 'http://127.0.0.1:4173/irena-play.html';
async function serveOfflineDocument(context) {
  await context.route('**/*', async route => {
    if (route.request().isNavigationRequest() && route.request().url() === documentURL) {
      await route.fulfill({status: 200, contentType: 'text/html; charset=utf-8', body: after});
    } else {network.push(route.request().url()); await route.abort();}
  });
}
const browser = await chromium.launch({headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {})});
try {
  const context = await browser.newContext({offline: true, viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
  await serveOfflineDocument(context);
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  for (const i of changed) {
    const result = await page.evaluate(async ([left, right]) => {
      async function read(src) {
        const img = new Image(); img.src = src; await img.decode();
        const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d', {willReadFrequently: true}); ctx.drawImage(img, 0, 0);
        return {width: canvas.width, height: canvas.height, data: ctx.getImageData(0, 0, canvas.width, canvas.height).data};
      }
      const a = await read(left), b = await read(right); let different = 0;
      if (a.width !== b.width || a.height !== b.height) return {different: -1};
      for (let k = 0; k < a.data.length; k += 4) {
        if (a.data[k + 3] !== b.data[k + 3]) different++;
        if (a.data[k + 3]) for (let z = 0; z < 3; z++) if (a.data[k + z] !== b.data[k + z]) different++;
      }
      return {different, width: a.width, height: a.height};
    }, [oldImages[i], newImages[i]]);
    assert.equal(result.different, 0, `browser displayed pixels for asset ${i}`);
    checks.push({image: i, ...result});
  }
  const click = async (action, id) => {
    await page.waitForFunction(() => !document.querySelector('#cinema.active') && document.documentElement.dataset.combatBusy !== 'true');
    await page.locator(`[data-action="${action}"]${id ? `[data-id="${id}"]` : ''}`).filter({visible: true}).first().click();
  };
  await page.goto(documentURL);
  await click('begin'); await click('fight', 'normal'); await click('divCommand', 'slash');
  await page.waitForFunction(() => document.querySelector('.div-battle-head strong')?.textContent.includes('TURN 2'));
  await click('divCommand', 'guard');
  await page.waitForFunction(() => document.querySelector('.div-battle-head strong')?.textContent.includes('TURN 3'));
  const save = await page.evaluate(() => localStorage.getItem('irena-reborn-v3'));
  assert.ok(save, 'save created');
  await page.reload();
  assert.equal(await page.evaluate(() => localStorage.getItem('irena-reborn-v3')), save, 'save survives reload');
  // The second context checks room loading from a fresh, offline save.
  const roomContext = await browser.newContext({offline: true, viewport: {width: 390, height: 844}, reducedMotion: 'reduce'});
  await serveOfflineDocument(roomContext);
  const room = await roomContext.newPage();
  room.on('pageerror', e => errors.push(e.message));
  await room.goto(documentURL);
  await room.locator('[data-action="begin"]').click();
  await room.locator('[data-action="nav"][data-id="chibina"]').filter({visible: true}).first().click();
  await room.locator('[data-chibina-room]').waitFor();
  const roomImages = await room.locator('[data-chibina-room] img').evaluateAll(async images => {
    await Promise.all(images.map(img => img.decode())); return images.every(img => img.naturalWidth > 0);
  });
  assert.ok(roomImages, 'all room images decoded offline');
  assert.deepEqual(network, [], 'no sidecar or remote asset requests');
  assert.deepEqual(errors, [], 'no browser exceptions');
  const result = {engine: 'Chromium',standaloneOffline: true, documentServedFromMemory: true, fileProtocolTested: false, imageCount: newImages.length, browserPixelComparisons: checks, runtimeAndCssUnchanged: true, slashAndGuard: true, saveReload: true, roomImagesDecoded: true, network, errors, realIPhoneTested: false};
  fs.mkdirSync('artifacts', {recursive: true});
  fs.writeFileSync('artifacts/standalone-browser-verification.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result));
} finally {await browser.close();}
