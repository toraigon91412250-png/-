import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,developerState} from '../web/src/utils/progression.js';
import {startBattle,act,settle} from '../web/src/utils/gameCore.js';
import {validateSave,exportSave} from '../web/src/utils/storage.js';
import {ACHIEVEMENTS} from '../web/src/data/config.js';

function victory(s,options={}){const b=startBattle(s,options);b.enemy.hp=1;b.base.spd=1e8;act(b,'slash',{rng:()=>.99});assert.equal(b.result,'win');return {battle:b,reward:settle(s,b)};}
const empty={p:0,fragments:0,bonusP:0,sp:0,levels:0,resShards:0,achievements:[],unlocks:[]};

test('first EX result includes the actual 100P bonus exactly once and keeps settlement idempotent',()=>{
 const s=developerState(fresh());s.flags.ex=false;s.flags.exReward=false;const before=s.p;
 const first=victory(s,{mode:'ex'});
 assert.equal(first.reward.p,s.p-before);assert.equal(first.reward.p,1135);assert.equal(first.reward.bonusP,100);
 assert.equal(first.reward.fragments,14);assert.equal(first.reward.resShards,3);assert.equal(first.reward.sp,0);assert.equal(first.reward.levels,0);
 assert.deepEqual(first.reward.unlocks,['god']);assert.ok(first.reward.achievements.includes('C2'));
 const snapshot=JSON.stringify(s);assert.equal(settle(s,first.battle),null);assert.equal(JSON.stringify(s),snapshot);
 const prior=s.p,repeat=victory(s,{mode:'ex'}).reward;
 assert.equal(repeat.p,s.p-prior);assert.equal(repeat.p,1035);assert.equal(repeat.bonusP,0);assert.deepEqual(repeat.unlocks,[]);assert.deepEqual(repeat.achievements,[]);
});

test('ordinary first clear reports its real level increase and only newly earned achievements',()=>{
 const s=fresh(),before=s.p,keys=Object.keys(s).sort();
 const first=victory(s).reward;
 assert.equal(first.p,s.p-before);assert.equal(first.p,40);assert.equal(first.levels,1);assert.equal(first.fragments,4);assert.equal(first.resShards,3);
 assert.ok(first.achievements.includes('A0'));assert.ok(first.achievements.includes('A3'));assert.equal(first.sp,0);assert.equal(first.bonusP,0);
 assert.deepEqual(Object.keys(s).sort(),keys);assert.deepEqual(validateSave(JSON.parse(exportSave(s))),s);
 const repeat=victory(s,{floor:1}).reward;assert.equal(repeat.levels,0);assert.deepEqual(repeat.achievements,[]);
});

test('Lv50 and Lv100 result unlocks follow actual first victories and report 50 status points once',()=>{
 const s=fresh();s.floor=50;s.level=50;assert.equal(s.cleared.includes(50),false);
 const fifty=victory(s).reward;assert.deepEqual(fifty.unlocks,['fallen','king','judge','resonance']);assert.equal(fifty.levels,1);
 assert.deepEqual(victory(s,{floor:50}).reward.unlocks,[]);
 s.floor=100;s.level=100;const first=victory(s).reward;
 assert.equal(first.sp,50);assert.equal(s.sp,50);assert.equal(first.levels,1);assert.deepEqual(first.unlocks,['mystery']);assert.equal(s.flags.stella,false);
 const repeat=victory(s).reward;assert.equal(repeat.sp,0);assert.equal(s.sp,50);assert.equal(repeat.levels,0);assert.deepEqual(repeat.unlocks,[]);
});

test('Stella clear reports dedicated Irena only on its first unlock',()=>{
 const s=developerState(fresh());s.flags.final=false;s.flags.stellaClear=false;
 assert.deepEqual(victory(s,{mode:'stella'}).reward.unlocks,['final']);
 assert.deepEqual(victory(s,{mode:'stella'}).reward.unlocks,[]);
});

test('32nd achievement reports the star reward without claiming manual achievement points',()=>{
 const s=developerState(fresh());s.achieved=ACHIEVEMENTS.filter(x=>x.id!=='C11').map(x=>x.id);s.records.endure=false;
 const b=startBattle(s,{floor:1});b.used.endure=true;b.enemy.hp=1;b.base.spd=1e8;act(b,'slash',{rng:()=>.99});const before=s.p,reward=settle(s,b);
 assert.equal(s.achieved.length,32);assert.equal(s.powers.star,5);assert.deepEqual(reward.achievements,['C11']);assert.deepEqual(reward.unlocks,['star']);
 assert.equal(reward.p,s.p-before);assert.equal(reward.p,40);assert.deepEqual(s.claimed,[]);
});

test('test settlements report zero rewards and leave the entire main save untouched',()=>{
 const s=fresh(),before=JSON.stringify(s),b=startBattle(developerState(s),{mode:'ex',test:true});b.result='win';
 assert.deepEqual(settle(s,b),{test:true,...empty});assert.equal(JSON.stringify(s),before);assert.equal(settle(s,b),null);
});

test('defeat has no invented P, material, level, status-point or unlock rewards',()=>{
 const s=fresh(),b=startBattle(s);b.result='lose';
 assert.deepEqual(settle(s,b),empty);assert.equal(s.p,180);assert.equal(s.level,1);assert.equal(s.sp,0);assert.deepEqual(s.cleared,[]);
});

test('removed raid cannot be entered from the normal game and the shared rewards remain available elsewhere',()=>{const s=developerState(fresh());assert.throws(()=>startBattle(s,{mode:'raid'}),/解放条件/);assert.equal(victory(s,{mode:'normal',floor:1}).reward.resShards,3);});

