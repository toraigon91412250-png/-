import test from 'node:test';import assert from 'node:assert/strict';
import {RESONANCES,RESONANCE_BY_ID,RESONANCE_THRESHOLDS,learnResonance,resonanceMaxLevel,upgradeResonance} from '../web/src/data/resonanceV3.js';
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
test('all approved level-5 ceilings and pair-specific special conditions are retained',()=>{
 const value=Object.fromEntries(RESONANCES.map(r=>[r.id,r.levels[4]]));
 assert.deepEqual([value.wingjudge.hits,value.wingjudge.mult,value.wingjudge.ignore,value.wingjudge.extraMaxHp],[12,96,.7,.06]);
 assert.deepEqual([value.fallenabyss.mult,value.fallenabyss.erosion],[45,.20]);
 assert.deepEqual([value.wingfallen.hits[3],value.wingfallen.mult[3]],[45,180]);
 assert.deepEqual([value.wingking.shield,value.wingking.reduction,value.wingking.enemyActions,value.wingking.counters],[.50,.80,3,3]);
 assert.deepEqual([value.wingabyss.hits,value.wingabyss.bonusHits,value.wingabyss.erosion],[10,10,.03]);
 assert.deepEqual([value.fallenjudge.mult,value.fallenjudge.ignore,...value.fallenjudge.currentHp],[25,.90,.20,.35]);
 assert.deepEqual([value.kingjudge.shield,value.kingjudge.counterMult,value.kingjudge.ignore,value.kingjudge.extraMaxHp],[.30,30,1,.10]);
 assert.deepEqual([value.kingabyss.turns,value.kingabyss.reduction,value.kingabyss.heal,value.kingabyss.erosion,value.kingabyss.storedMult],[5,.95,.50,.20,10]);
 assert.deepEqual([value.kingfallen.enemyActions,value.kingfallen.lowCounterMult,value.kingfallen.heal],[3,100,.20]);
 assert.deepEqual([value.abyssjudge.debuff,value.abyssjudge.sealTurns,value.abyssjudge.ignore,value.abyssjudge.proofMult],[.30,3,1,25]);
});
test('every resonance level boundary uses the lower cooperation rate of its two authorities',()=>{
 for(const row of RESONANCES)for(let i=0;i<5;i++){
  for(const [rate,expected] of [[RESONANCE_THRESHOLDS[i]-.01,i],[RESONANCE_THRESHOLDS[i],i+1],[RESONANCE_THRESHOLDS[i]+.01,i+1]]){
   const s=build();for(const id of row.parts)s.divinity.cooperation[id]=rate;
   assert.equal(resonanceMaxLevel(s,row.id),expected,row.id+' at '+rate+'%');
  }
 }
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
