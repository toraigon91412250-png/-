import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { register } from 'node:module';

register(
  'data:text/javascript,' + encodeURIComponent(`
    export async function load(url, context, nextLoad) {
      if (/\\.(?:jpe?g|png|svg)$/i.test(new URL(url).pathname)) {
        return { format: 'module', source: 'export default "";', shortCircuit: true };
      }
      return nextLoad(url, context);
    }
  `),
  { parentURL: import.meta.url }
);

const { getShortIrenaFinalTurnLimit } = await import('./src/utils/shortIrenaFinalBattle.ts');

const componentSource = await readFile(
  new URL('./src/components/StellaFinalBattleScreen.tsx', import.meta.url),
  'utf8',
);

// Preserve the existing 8–10-turn random range, independent of any speed stat
// or multiplier. Injecting the random source keeps this check deterministic.
assert.equal(getShortIrenaFinalTurnLimit(() => 0), 8);
assert.equal(getShortIrenaFinalTurnLimit(() => 0.34), 9);
assert.equal(getShortIrenaFinalTurnLimit(() => 0.67), 10);
assert.equal(getShortIrenaFinalTurnLimit(() => 0.999999), 10);

assert.equal(
  (componentSource.match(/finalTurnLimit = getShortIrenaFinalTurnLimit\(\);/g) ?? []).length,
  2,
  'Both Irena paths into phase three must share the speed-independent timer.',
);
assert.doesNotMatch(
  componentSource,
  /speedExtraTurns|finisherEffectiveSpeedSnapshot/,
  'The final timer must not derive extra turns from effective speed.',
);
assert.doesNotMatch(
  componentSource,
  /速度240超過分は最大\+5ターン|速度配分は終局の追加猶予に影響する/,
  'The briefing must not promise speed-based extra deadline turns.',
);
assert.match(
  componentSource,
  /第三形態に入ると8～10ターン（速度倍率による追加猶予なし）/,
  'The briefing must state that speed no longer extends the final deadline.',
);
assert.match(
  componentSource,
  /速度は行動順に関わり、追加行動・追加猶予ターンは発生しない/,
  'The Irena-specific briefing must state the intended speed role.',
);

console.log('✓ Final-phase turn limit remains 8–10 and is independent of speed.');
console.log('✓ Both Irena phase-entry paths and user-facing rules use the fixed timer behavior.');
