import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';

test('lossy q95 conversion is limited to the two approved images', () => {
  const builder = fs.readFileSync('tools/build.mjs', 'utf8');
  const match = builder.match(/const highQualityWebpAssets=new Set\((\[[^;]+\])\)/);
  assert.ok(match, 'build defines an explicit high-quality WebP allowlist');
  const approvedPaths = [...match[1].matchAll(/'([^']+)'/g)].map(([, file]) => file);
  assert.deepEqual(approvedPaths, [
    'assets/overnight-lab/kaiser-ex.png',
    'assets/home-ui/chibina-room-banner.png',
  ]);
  for (const file of ['assets/overnight-lab/kaiser-ex.png', 'assets/home-ui/chibina-room-banner.png']) {
    assert.ok(fs.existsSync(file), `original is retained: ${file}`);
  }
});

test('both q95 images reach their hosted and standalone build targets', async () => {
  const hosted = fs.readFileSync('dist/index.html', 'utf8');
  const standalone = fs.readFileSync('irena-play.html', 'utf8');
  const kaiser = await sharp('assets/overnight-lab/kaiser-ex.png').keepMetadata()
    .webp({quality: 95, effort: 2, alphaQuality: 100}).toBuffer();
  const embeddedKaiser = `data:image/webp;base64,${kaiser.toString('base64')}`;
  assert.ok(hosted.includes(embeddedKaiser), 'hosted HTML embeds the optimized Kaiser EX image');
  assert.ok(standalone.includes(embeddedKaiser), 'standalone HTML embeds the optimized Kaiser EX image');
  assert.ok(hosted.includes('assets/home-ui/chibina-room-banner.webp'), 'hosted HTML points to the optimized room banner');
  assert.ok(fs.existsSync('dist/assets/home-ui/chibina-room-banner.webp'), 'hosted room banner WebP exists');
  assert.ok(!fs.existsSync('dist/assets/home-ui/chibina-room-banner.png'), 'stale hosted room banner PNG is absent');
});
