import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {COMBAT_TIMING,COMBAT_VFX,planCombatPresentation} from '../web/src/components/combatPresentation.js';
test('approved flow beats retain ordered real hits and distinct skill timings',()=>{
 assert.equal(COMBAT_TIMING.feather.duration,860);assert.deepEqual(COMBAT_TIMING.feather.hits,[650]);assert.deepEqual(COMBAT_TIMING.volley.hits,[900,1240]);assert.deepEqual(COMBAT_TIMING.ultimate.hits,[2420]);
 for(const action of ['feather','pierce','volley','ultimate']){const e=[{kind:'enemyAction'},{kind:'incomingHit',damage:43},{kind:'playerAction'},{kind:'hit',damage:96,hitIndex:0},{kind:'turnEnd'}];const p=planCombatPresentation(e,action);assert.ok(p.frames[1].at<p.frames[3].at);assert.equal(p.frames.filter(x=>x.event.kind==='hit').length,1);assert.equal(p.frames[3].event.damage,96);assert.ok(p.duration>=p.frames.at(-1).at);}
});
test('new art is local and raw generated originals remain available',()=>{for(const path of [COMBAT_VFX.feather,COMBAT_VFX.cutin]){assert.ok(fs.statSync(path).size>1000);assert.ok(fs.existsSync(path.replace('.webp','.png')));}});
