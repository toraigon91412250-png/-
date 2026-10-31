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
test('winner receives 250, trial and test receive zero',()=>{
 const s=make();s.summonPoints=0;
 assert.equal(addSummonWinReward(s,{result:'win',mode:'normal'}),250);
 assert.equal(addSummonWinReward(s,{result:'win',mode:'normal',test:true}),0);
 assert.equal(addSummonWinReward(s,{result:'win',mode:'normal',trial:{}}),0);
 assert.equal(addSummonWinReward(s,{result:'lose',mode:'normal'}),0);
 assert.equal(s.summonPoints,250);
});