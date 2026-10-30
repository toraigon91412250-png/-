import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';import {combatUiBaselineRead,integrationBaselineRead} from './audit-baseline.js';
const sha=x=>createHash('sha256').update(x).digest('hex');
test('guard stays in right command column for both four- and five-command pre-ultimate grids',()=>{
 const css=fs.readFileSync('web/src/components/game.css','utf8');assert.match(css,/\.standard-combat \.irena-action-grid \.combat-action-guard\{[^}]*order:1;grid-column:2\}/);assert.match(css,/\.combat-action-ultimate\{grid-column:1\/-1/);
 const supplied=JSON.parse(fs.readFileSync('reports/combat-ui-audit6/authorized-changes.json'))['web/src/components/game.css'];assert.equal(sha(integrationBaselineRead('web/src/components/game.css')),supplied.afterSHA256);
});
test('every measured gameplay/save/config/asset byte is preserved after reversing only exact display edits',()=>{
 const protectedFiles=JSON.parse(fs.readFileSync('reports/balance-audit6/protected.json'));for(const [file,hash]of Object.entries(protectedFiles))assert.equal(sha(combatUiBaselineRead(file)),hash,file);
});
