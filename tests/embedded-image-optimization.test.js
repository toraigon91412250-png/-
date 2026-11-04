import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {optimizeEmbeddedImage} from '../tools/optimize-embedded-images.mjs';

test('PNG optimization preserves displayed RGB, every alpha value and dimensions', async () => {
  const raw = Buffer.alloc(128 * 128 * 4);
  for (let i = 0; i < raw.length; i += 4) {
    raw[i] = (i / 4) % 256; raw[i + 1] = 90; raw[i + 2] = 180;
    raw[i + 3] = (i / 4) % 4 === 0 ? 0 : (i / 4) % 4 === 1 ? 80 : 255;
  }
  const input = await sharp(raw, {raw: {width: 128, height: 128, channels: 4}}).png({compressionLevel: 0}).toBuffer();
  const snapshot = Buffer.from(input), result = await optimizeEmbeddedImage(input, 'image/png');
  assert.ok(result.optimized);
  assert.ok(result.bytes.length < input.length);
  assert.equal(result.type, 'image/png', 'alpha image retains its decoder format');
  assert.deepEqual(input, snapshot, 'source bytes stay intact');
  const decoded = await sharp(result.bytes).ensureAlpha().raw().toBuffer({resolveWithObject: true});
  assert.equal(decoded.info.width, 128); assert.equal(decoded.info.height, 128);
  for (let i = 0; i < raw.length; i += 4) {
    assert.equal(decoded.data[i + 3], raw[i + 3]);
    if (raw[i + 3]) assert.deepEqual(decoded.data.subarray(i, i + 3), raw.subarray(i, i + 3));
  }
});

test('opaque PNG can use smaller lossless WebP without changing decoded pixels', async () => {
  const input = await sharp({create: {width: 128, height: 128, channels: 3, background: '#a08060'}}).png({compressionLevel: 0}).toBuffer();
  const result = await optimizeEmbeddedImage(input, 'image/png');
  assert.equal(result.optimized, true); assert.equal(result.type, 'image/webp');
  assert.deepEqual(await sharp(input).raw().toBuffer(), await sharp(result.bytes).raw().toBuffer());
});

test('already encoded JPEG, WebP and SVG pass through byte-for-byte', async () => {
  for (const type of ['image/jpeg', 'image/webp', 'image/svg+xml']) {
    const input = Buffer.from('opaque input preserved without decoding');
    const result = await optimizeEmbeddedImage(input, type);
    assert.equal(result.bytes, input); assert.equal(result.type, type); assert.equal(result.optimized, false);
  }
});

test('an animated PNG remains untouched instead of dropping animation frames', async () => {
  // A real APNG animation control chunk precedes image data. CRC is irrelevant to this early guard.
  const input = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.from('000000086163544c000000020000000000000000', 'hex')]);
  const result = await optimizeEmbeddedImage(input, 'image/png');
  assert.equal(result.bytes, input); assert.equal(result.optimized, false);
  assert.equal(result.reason, 'animation-preserved');
});
