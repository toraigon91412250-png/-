import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {AUTHORITY_STRIKE_ART,authorityStrikeVisual,authorityStrikeCommand} from '../web/src/components/authorityStrikeVisuals.js';
import {COMBAT_TIMING,planCombatPresentation} from '../web/src/components/combatPresentation.js';
import {RECIPES} from '../web/src/data/config.js';
test('five supplied authority PNGs map to their exact IDs and preserve original bytes',()=>{
 const manifest=JSON.parse(fs.readFileSync('reports/authority-strike-audit19/supplied-art.json'));
 assert.deepEqual(Object.keys(AUTHORITY_STRIKE_ART).sort(),['abyss','fallen','judge','king','wing']);
 for(const [id,name]of Object.entries({wing:'黒翼',judge:'断罪',abyss:'深淵',fallen:'堕天',king:'堕天王'})){
  const v=authorityStrikeVisual(id);assert.equal(v.id,id);assert.equal(v.name,name);assert.equal(v.art,AUTHORITY_STRIKE_ART[id]);assert.equal(v.art,manifest[id].path);
  const bytes=fs.readFileSync(v.art);assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest[id].sha256);assert.equal(bytes.readUInt32BE(16),1672);assert.equal(bytes.readUInt32BE(20),941);
 }
 assert.equal(new Set(Object.keys(AUTHORITY_STRIKE_ART).map(x=>authorityStrikeVisual(x).motif)).size,5);
});
test('commands and artwork select first slot exclusively, including reversed order',()=>{
 for(const first of Object.keys(AUTHORITY_STRIKE_ART))for(const second of Object.keys(AUTHORITY_STRIKE_ART))if(first!==second){const b={powers:[first,second]},before=JSON.stringify(b);assert.match(authorityStrikeCommand(b),new RegExp(authorityStrikeVisual(first).name+'（1枠目）'));assert.equal(JSON.stringify(b),before);}
});
test('resonance, star, empty and invalid first slot never borrow the second authority',()=>{
 for(const recipe of RECIPES){const v=authorityStrikeVisual(recipe.id);assert.equal(v.name,recipe.name);assert.equal(v.art,null);assert.equal(v.motif,'resonance');assert.ok(!authorityStrikeCommand({powers:[recipe.id,'wing']}).startsWith('黒翼（'));}
 assert.equal(authorityStrikeVisual('star').name,'天星覇権');assert.equal(authorityStrikeVisual('unknown').id,'none');assert.equal(authorityStrikeVisual(undefined).art,null);assert.match(authorityStrikeCommand({powers:[]}),/未装備/);
});
test('power hit follows 920ms artwork reveal and shell break, without changing fact order',()=>{
 const events=[{kind:'playerAction'},{kind:'armorBreak'},{kind:'hit',damage:1234,landed:true},{kind:'enemyAction'},{kind:'incomingHit',damage:50},{kind:'turnEnd'}];
 const p=planCombatPresentation(events,'power');assert.equal(COMBAT_TIMING.power.duration,1320);assert.equal(p.frames[1].at,1020);assert.equal(p.frames[2].at,1080);assert.ok(p.frames[2].at>920);assert.ok(p.frames[3].at>p.frames[2].at);assert.deepEqual(p.frames.map(x=>x.event),events);
 const r=planCombatPresentation(events,'power',{reduced:true});assert.equal(r.frames[2].at,320);assert.ok(r.duration<p.duration);
});
test('enemy-first, miss, death, recovery and reduced motion retain ordered factual frames',()=>{
 for(const reduced of [false,true]){const events=[{kind:'enemyAction'},{kind:'incomingHit',damage:10},{kind:'playerAction'},{kind:'hit',damage:0,landed:false},{kind:'heal',target:'player'},{kind:'turnEnd'}];const p=planCombatPresentation(events,'power',{reduced});assert.deepEqual(p.frames.map(x=>x.event),events);assert.ok(p.frames[1].at<p.frames[2].at);assert.equal(p.frames.filter(x=>x.event.kind==='hit').length,1);assert.equal(p.frames[3].event.damage,0);for(let i=1;i<p.frames.length;i++)assert.ok(p.frames[i].at>=p.frames[i-1].at);}
});
