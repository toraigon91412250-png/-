import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const view=fs.readFileSync('web/src/components/divinityView.js','utf8');
const css=fs.readFileSync('web/src/components/game.css','utf8');

test('battle screen drops redundant rows and gives the freed height to character art',()=>{
 assert.doesNotMatch(view,/権能共通CT/);
 assert.doesNotMatch(view,/<div class="div-loadout">/);
 assert.doesNotMatch(view,/<div class="div-v2-caption">/);
 assert.match(css,/\.div-combat-v2 \.div-command-tabs\.single-page\{display:none\}/);
 assert.match(css,/\.divinity-live \.div-arena\.battle-stage\{flex:1;height:auto/);
});

test('status cards keep accessible names and status details while hiding only their visible headings',()=>{
 assert.match(view,/aria-label="\$\{title\}：/);
 assert.match(view,/divIcon\(side==='player'\?'guard':'counter'\)\}<em>/);
 assert.doesNotMatch(view,/divIcon\(side==='player'\?'guard':'counter'\)\}\$\{title\}/);
 assert.match(view,/障壁 '\+divNum\(d\.shield\)/);
 assert.match(view,/侵食 '\+Math\.round\(b\.erosion\*100\)\+'%'/);
});

test('HP artwork panels are more translucent while the separate HP bars stay visible',()=>{
 assert.match(css,/rgba\(16,30,46,\.58\),rgba\(17,22,36,\.48\)/);
 assert.match(css,/rgba\(53,19,33,\.62\),rgba\(23,19,33,\.50\)/);
 assert.match(css,/\.div-hp-track i\{display:block;height:100%;background:linear-gradient/);
});

test('equipment and temporary shared-release rows are fully removed',()=>{
 assert.doesNotMatch(view,/div-unified-badge|解放 · \$\{d\.unified\}行動/);
 assert.doesNotMatch(css,/\.div-unified-badge\{/);
});
