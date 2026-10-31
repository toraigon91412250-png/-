import test from 'node:test';
import assert from 'node:assert/strict';
import {summon,addSummonWinReward} from '../web/src/utils/resonanceSummon.js';
const make=()=>({summonPoints:900,resShards:0,fragments:{wing:0,king:0,abyss:0,fallen:0,judge:0}});
test('single summon debits only summon currency',()=>{
 const s=make(),p=summon(s,1,()=>.5);
 assert.equal(s.summonPoints,800);assert.equal(s.resShards,12);
 assert.equal(p.prizes[0].rarity,'R');
});
test('SSR and SR amounts are exact',()=>{
 const s=make();summon(s,1,()=>.01);assert.equal(s.resShards,160);
 summon(s,1,()=>.1);assert.equal(s.resShards,205);
});
test('10-pull guarantees at least one SR',()=>{
 const s=make(),out=summon(s,10,()=>.5);
 assert.equal(out.prizes[9].rarity,'SR');assert.equal(s.summonPoints,0);
 assert.equal(s.resShards,12*9+45);
});
test('no charge on shortage or invalid draw',()=>{
 const s=make();assert.throws(()=>summon(s,10,()=>NaN));
 assert.equal(s.summonPoints,900);assert.equal(s.resShards,0);
 s.summonPoints=50;assert.throws(()=>summon(s,1));assert.equal(s.summonPoints,50);
});
test('R authority fragment award is bounded',()=>{
 const s=make(),rolls=[.9,.9,.999];let i=0;
 const out=summon(s,1,()=>rolls[i++]);
 assert.equal(out.prizes[0].authority,'judge');assert.equal(s.fragments.judge,8);
});
test('seeded summon sample stays within statistical tolerance of 3/17/80 rarity rates',()=>{
 const s=make();s.summonPoints=3_000_000;let seed=209;const rng=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/0x1_0000_0000;};
 const counts={SSR:0,SR:0,R:0};
 for(let i=0;i<30_000;i++)counts[summon(s,1,rng).prizes[0].rarity]++;
 assert.ok(Math.abs(counts.SSR/30_000-.03)<.005,JSON.stringify(counts));
 assert.ok(Math.abs(counts.SR/30_000-.17)<.01,JSON.stringify(counts));
 assert.ok(Math.abs(counts.R/30_000-.80)<.01,JSON.stringify(counts));
});
test('winner receives 250, trial and test receive zero',()=>{
 const s=make();s.summonPoints=0;
 assert.equal(addSummonWinReward(s,{result:'win',mode:'normal'}),250);
 assert.equal(addSummonWinReward(s,{result:'win',mode:'normal',test:true}),0);
 assert.equal(addSummonWinReward(s,{result:'win',mode:'normal',trial:{}}),0);
 assert.equal(addSummonWinReward(s,{result:'lose',mode:'normal'}),0);
 assert.equal(s.summonPoints,250);
});
