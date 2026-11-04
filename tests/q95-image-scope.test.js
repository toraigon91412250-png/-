import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

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
