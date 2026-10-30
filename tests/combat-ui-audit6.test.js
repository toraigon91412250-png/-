import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {combatUiBaselineRead,integrationBaselineRead} from './audit-baseline.js';
const app=fs.readFileSync('web/src/components/App.js','utf8');
const css=fs.readFileSync('web/src/components/game.css','utf8');
const approved=JSON.parse(fs.readFileSync('reports/combat-ui-audit6/authorized-changes.json','utf8'));
const sha=data=>createHash('sha256').update(data).digest('hex');
test('combat UI source changes are approved and the audit5 source remains recoverable',()=>{
 for(const [file,record] of Object.entries(approved)){
  assert.equal(sha(integrationBaselineRead(file)),record.afterSHA256,file+' audit6 source');
  assert.equal(sha(combatUiBaselineRead(file)),record.beforeSHA256,file+' original audit5 content');
  assert.equal(sha(record.before),record.beforeSHA256,file+' exact audit5 snapshot');
 }
});
test('main20 gameplay, saves, configured skills and all assets are untouched',()=>{
 const modified=Object.keys(approved);
 assert.deepEqual(modified.sort(),['web/src/components/App.js','web/src/components/game.css']);
 assert.match(app,/const b=battle,p=playerStats\(b\),e=enemyStats\(b\)/);
 assert.match(app,/const reason=available\(b,id\)/);
 assert.match(app,/data-action="combat" data-id="\$\{id\}"/);
 assert.match(app,/\$\{reason\?'disabled':''\}/);
});
test('live combat hides only the global navigation and retains the battle-only exit',()=>{
 assert.match(app,/classList\.toggle\('combat-live',page==='battle'&&!!battle&&!battle\.result\)/);
 assert.match(css,/#app\.combat-live>\.sidebar,#app\.combat-live>\.mobile-nav\{display:none\}/);
 assert.match(app,/button\('撤退する','askRetreat','','ghost combat-retreat'\)/);
 assert.match(app,/case 'focusCommands'/);
 assert.match(app,/case 'focusStage'/);
});
test('normal Irena controls keep real availability and put ultimate in a full-width final row',()=>{
 assert.match(app,/irena-action-grid/);
 assert.match(app,/combat-glyph/);
 assert.match(app,/combat-action-'\+id/);
 assert.match(css,/\.irena-action-grid \.combat-action-ultimate\{grid-column:1\/-1/);
 assert.match(css,/\.irena-action-grid \.combat-action-guard\{border-color:/);
 assert.match(app,/\['ultimate','超堕天撃'/);
 assert.match(app,/\['guard','防御'/);
});
test('Irena-only portrait cards separate enemy and player gauges with transparent supplied art',()=>{
 assert.match(app,/battle-portrait-cards/);
 assert.match(css,/\.battle-portrait-cards \.fighter-enemy\{order:0/);
 assert.match(css,/\.battle-portrait-cards \.fighter-player\{order:1/);
 assert.match(css,/\.battle-portrait-cards \.fighter-player \.info\{left:auto;right:/);
 assert.match(css,/\.battle-portrait-cards \.fighter-enemy \.portrait-frame:before/);
 assert.match(app,/CAMPAIGN_ART\[b\.mode\]/);
});
