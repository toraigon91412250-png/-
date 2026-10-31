import test from 'node:test';import assert from 'node:assert/strict';
import {RESONANCES,RESONANCE_BY_ID,learnResonance,resonanceMaxLevel,upgradeResonance} from '../web/src/data/resonanceV3.js';
const build=()=>({resShards:400,divinity:{cooperation:{wing:70,king:60,fallen:15,abyss:25,judge:5}}});
test('10 unique combinations and 50 tiers',()=>{
 assert.equal(RESONANCES.length,10);
 assert.equal(new Set(RESONANCES.map(r=>r.parts.slice().sort().join(':'))).size,10);
 assert.ok(RESONANCES.every(r=>r.levels.length===5));
 assert.equal(RESONANCE_BY_ID.wingjudge.levels[4].mult,96);
 assert.equal(RESONANCE_BY_ID.fallenabyss.levels[4].mult,45);
 assert.equal(RESONANCE_BY_ID.wingfallen.levels[4].hits[3],45);
 assert.equal(RESONANCE_BY_ID.kingabyss.levels[4].reduction,.95);
});
test('floor one breakthrough raises judge to cap 20 and learns Lv.1',()=>{
 const s=build();assert.equal(learnResonance(s,'wingjudge'),true);
 assert.equal(s.divinity.cooperation.judge,20);
 assert.equal(s.divinity.resonanceV3.levels.wingjudge,1);
 assert.equal(learnResonance(s,'wingjudge'),false);
 assert.equal(resonanceMaxLevel(s,'wingjudge'),1);
});
test('level up requires both partners reaching thresholds and consumes 40/80/120/160',()=>{
 const s=build();learnResonance(s,'wingjudge');
 assert.throws(()=>upgradeResonance(s,'wingjudge'),/協力率/);
 s.divinity.cooperation.judge=100;s.divinity.cooperation.wing=100;
 for(const price of [40,80,120,160]){const before=s.resShards;upgradeResonance(s,'wingjudge');assert.equal(s.resShards,before-price);}
 assert.equal(s.divinity.resonanceV3.levels.wingjudge,5);
 assert.throws(()=>upgradeResonance(s,'wingjudge'));
});
