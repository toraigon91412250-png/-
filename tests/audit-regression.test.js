import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,developerState,clone,powerGrowth,powerUpgradeInfo,upgradePower,summon,fuse,buyPower} from '../web/src/utils/progression.js';
import {startBattle,act,available,playerStats,settle,dealPlayer,canStart,baseStats} from '../web/src/utils/gameCore.js';
import {startThreePhase,actThreePhase} from '../web/src/utils/threePhase.js';
import {validateSave,exportSave,save,load,SAVE_KEY} from '../web/src/utils/storage.js';
import fs from 'node:fs';import vm from 'node:vm';
import {POWERS,ACHIEVEMENTS} from '../web/src/data/config.js';
const rng=()=>.99;
const withoutLog=b=>{const c=clone(b);delete c.log;return c;};
for(const [n,effect]of [[0,'trialCrystal'],[.5,'pressure'],[.99,'renewal']])test(`three-phase ${effect}: full log preserves enemy behavior`,()=>{
 const a=startThreePhase(fresh());a.base.spd=1;a.enemy.phase=2;a.trial.phase=2;a.enemy.hp=a.enemy.base.hp*.6;
 const full=clone(a);full.log=Array(100).fill('old');
 // The first random value is used for the incoming attack, the second for its effect.
 for(const b of [a,full]){let i=0;actThreePhase(b,'slash',{rng:()=>++i===1?.99:n});}
 assert.deepEqual(withoutLog(full),withoutLog(a));assert.equal(full.log.length,100);
 if(effect==='renewal')assert.ok(full.log.some(x=>x.startsWith('生命還流：')));else if(effect==='trialCrystal')assert.ok(full.enemy.statuses.trialCrystal);else assert.ok(full.statuses.pressure);
});
for(const kind of ['evasion','stun','stop'])test(`three-phase stale attack log cannot trigger effect during ${kind}`,()=>{
 const b=startThreePhase(fresh());b.enemy.phase=2;b.trial.phase=2;b.log=Array(100).fill('敵の反撃 → 100');
 if(kind==='evasion')b.base.spd=1e9;if(kind==='stun')b.enemy.statuses.stun=2;if(kind==='stop')b.enemyStop=1;
 actThreePhase(b,'guard',{rng:()=>0});assert.ok(!b.enemy.statuses.trialCrystal);
});
test('future envelope and malformed nested states fail explicitly without changing input',()=>{
 for(const input of [{version:999,state:fresh()},{state:null},{state:1},{state:'bad'},{state:[]}]){const copy=JSON.stringify(input);assert.throws(()=>validateSave(input));assert.equal(JSON.stringify(input),copy);}
 assert.throws(()=>validateSave({...fresh(),version:999}),/新しいバージョン/);
});
test('legacy raw saves and current exported saves retain progression and allocations',()=>{
 const a=developerState(fresh());a.finalBuild={points:90,hp:10,atk:20,def:10,spd:20};a.markEquip=['split','endure'];a.powers.wing=3;
 for(const input of [a,JSON.parse(exportSave(a)),{version:3,state:a}]){const b=validateSave(input);assert.deepEqual(b.finalBuild,a.finalBuild);assert.equal(b.powers.wing,3);assert.deepEqual(b.markEquip,a.markEquip);assert.equal(b.flags.stella,true);}
 const mem=new Map();const storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)};save(a,storage);assert.equal(load(storage).state.p,a.p);assert.ok(mem.get(SAVE_KEY));
 for(const key of ['irena-reborn-v1','irena-reborn-v2']){mem.clear();mem.set(key,JSON.stringify(a));assert.equal(load(storage).state.powers.wing,3);}
 mem.set(SAVE_KEY,'broken');assert.equal(load(storage).state,null);assert.ok(load(storage).error);
});
test('invalid battle settings fail before constructing nonfinite combat state',()=>{
 const a={...fresh(),floor:5};for(const floor of [NaN,Infinity,0,-1,1.5,101]){assert.equal(canStart(a,'normal',floor),false);assert.throws(()=>startBattle(a,{floor,test:true}));}
 assert.throws(()=>startBattle(a,{mode:'unknown',test:true}));assert.throws(()=>startBattle(a,{difficulty:'unknown',test:true}));
});
for(const power of ['king','fallen','god'])test(`HP1 ${power} endurance remains finite and finishes after lives expire`,()=>{
 const a=developerState(fresh());a.equipped=[power];a.markEquip=['endure'];const b=startBattle(a,{mode:'ex',test:true});
 b.hp=1e-7;b.base.spd=1;b.enemy.base.atk=1e12;b.enemy.base.spd=1e8;
 for(let i=0;i<20&&!b.result;i++){act(b,'guard',{rng});for(const v of Object.values(playerStats(b)))assert.ok(Number.isFinite(v));}
 assert.equal(b.result,'lose');assert.equal(b.hp,0);assert.ok(b.turn<=20);
});
for(const mode of ['ex','final'])for(const stop of [false,true])test(`${mode} ninth phase-three round ends at HP1 even with enemy-stop=${stop}`,()=>{
 const a=developerState(fresh()),b=startBattle(a,{mode,test:true});b.enemy.phase=3;b.enemy.hp=b.enemy.base.hp*.3;b.hp=1;b.base.def=1e15;b.enemyStop=stop?99:0;b.statuses.invulnerable=20;b.phaseTurns=8;
 act(b,'guard',{rng});assert.equal(b.result,'lose');assert.equal(b.hp,0);assert.ok(b.log.some(x=>x.includes('終末判定：')));
 assert.equal(settle(a,b).p,0);assert.equal(settle(a,b),null);assert.throws(()=>act(b,'guard'),/戦闘終了/);
});
test('a lethal player hit on deadline round wins without receiving terminal damage',()=>{
 const b=startBattle(developerState(fresh()),{mode:'ex',test:true});b.enemy.hp=1;b.enemy.phase=3;b.phaseTurns=8;b.base.spd=1e10;
 act(b,'slash',{rng});assert.equal(b.result,'win');assert.ok(b.hp>0);
});
test('upgrade presentation uses exact engine growth, cost and inventory without mutation',()=>{
 for(let lv=1;lv<=5;lv++){const a=fresh();a.powers.wing=lv;a.fragments.wing=100;const before=JSON.stringify(a),v=powerUpgradeInfo(a,'wing');assert.equal(JSON.stringify(a),before);assert.equal(v.cost,lv<5?lv*8:0);assert.equal(v.canUpgrade,lv<5);assert.equal(baseStats(a).atk,Math.round((47+13)*1.1*powerGrowth(lv)));if(lv<5){upgradePower(a,'wing');assert.equal(a.fragments.wing,100-lv*8);}}
 const a=fresh();a.resonance.god=2;a.resShards=80;assert.equal(powerUpgradeInfo(a,'god').cost,80);upgradePower(a,'god');assert.equal(a.resonance.god,3);assert.equal(a.resShards,0);
});
test('authority dialogs distinguish current, next, needed, owned and all UI states',()=>{
 const source=fs.readFileSync('web/src/components/App.js','utf8'),functions=source.slice(source.indexOf('function powerStatus('),source.indexOf('function marksView('));
 const api=vm.runInNewContext(functions+';({powerDetails,powersView,powerStatus})',{powerUpgradeInfo,powerGrowth,POWERS,ACHIEVEMENTS,UPGRADE_ART:{},esc:String,n:String,uiIcon:()=>'',button:(t,a,id,cls,disabled)=>`<button ${disabled?'disabled':''}>${t}</button>`,powerSort:'default'});
 const a=fresh();a.fragments.abyss=8;
 assert.equal(api.powerStatus(a,POWERS[0]).state,'ready');assert.ok(api.powerStatus(a,POWERS[0]).selected);
 let html=api.powerDetails(a,POWERS[0]);for(const label of ['現在の効果','次レベルの効果','所持欠片','強化に必要な欠片','＋0%','＋4%'])assert.ok(html.includes(label),label);
 assert.equal(api.powerStatus(a,POWERS.find(p=>p.id==='wing')).state,'insufficient');
 assert.equal(api.powerStatus(a,POWERS.find(p=>p.id==='fallen')).state,'unowned');
 assert.equal(api.powerStatus(a,POWERS.find(p=>p.id==='star')).state,'locked');
 a.powers.abyss=5;html=api.powerDetails(a,POWERS[0]);assert.ok(html.includes('最大レベル'));assert.ok(!html.includes('Lv.6'));assert.ok(api.powersView(a).includes('state-max'));
});
test('fusing, rebuilding and summon rewards preserve their exact costs and main save boundaries',()=>{
 const a=developerState(fresh());a.resonance={};a.recipes=[];a.equipped=['fallen','king'];a.fragments.fallen=17;a.fragments.king=9;const shards=a.resShards;
 fuse(a,'god');assert.equal(a.resShards,shards+26);assert.deepEqual(a.equipped,[]);assert.equal(a.resonance.god,1);assert.throws(()=>fuse(a,'god'));const before=a.p;buyPower(a,'fallen');assert.equal(a.p,before-120);
 a.collection=['黒翼の欠片','深淵結晶','断罪の印章','堕天の羽根','王権の残光','星のかけら'];const p=a.p,r=a.resShards,f=a.fragments.wing;summon(a,10,()=>0);assert.equal(a.p,p-250);assert.equal(a.resShards,r+50);assert.equal(a.fragments.wing,f+80);
});
test('every normal power and recipe survives deterministic legal-action stress without nonfinite state or frozen rounds',()=>{
 const ids=[...POWERS.map(x=>x.id),'god','fallenwing','fallenjudge','abyssfallen','kingwing','kingjudge','abyssking','judgewing','abysswing','abyssjudge'];
 let battles=0;
 for(const id of ids)for(const mode of ['normal','ex','raid','stella','final','god'])for(let seed=1;seed<=8;seed++){
  const s=developerState(fresh());s.equipped=[id];s.powers.star=5;s.markEquip=['split','endure','moon'];s.gauntlet={index:seed%5,materials:0,unique:[0,0,0,0,0]};
  const b=startBattle(s,{mode,test:true});let r=seed>>>0;const rng=()=>{r=(Math.imul(r,1664525)+1013904223)>>>0;return r/4294967296;};
  for(let step=0;step<300&&!b.result;step++){
   const actions=b.character==='irena'?['ultimate','volley','pierce','power','slash','guard']:b.character==='stella'?['meteor','immortal','rebirth','slash']:['annihilate','grasp','erosion','dominion','genesis','ending','fallen','slash'];
   const action=b.statuses.stun?'wait':actions.find(a=>!available(b,a))||'guard';const turn=b.turn;act(b,action,{rng});
   assert.ok(b.result||b.turn===turn+1,id+mode+' advances exactly one round');assert.ok(Number.isFinite(b.hp)&&b.hp>=0);assert.ok(Number.isFinite(b.enemy.hp)&&b.enemy.hp>=0);assert.ok(b.log.length<=100);for(const v of Object.values(playerStats(b)))assert.ok(Number.isFinite(v));
  }
  assert.ok(b.result,id+mode+' reaches a terminal state');battles++;
 }
 assert.equal(battles,768);
});
test('all malformed save shapes report a controlled error; future exports cannot erase valid data',()=>{
 for(const input of [null,[],1,'hello',{state:false},{version:99,state:{level:1}},{state:{version:99,floor:1}}])assert.throws(()=>validateSave(input));
 const store=new Map([[SAVE_KEY,JSON.stringify({version:99,state:fresh()})]]),storage={getItem:k=>store.get(k)||null};const before=store.get(SAVE_KEY);assert.ok(load(storage).error);assert.equal(store.get(SAVE_KEY),before);
});
