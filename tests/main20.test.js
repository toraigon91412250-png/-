import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
import {fresh,warp,fuse,midgameUnlocked,clone,developerState} from '../web/src/utils/progression.js';
import {freshMain20,migrateMain20,validateMain20,loadMain20,startMainBattle,actMainBattle,settleMainBattle} from '../web/src/utils/main20.js';
import {startBattle,canStart} from '../web/src/utils/gameCore.js';
import {exportSave,validateSave,SAVE_KEY} from '../web/src/utils/storage.js';
import {markBattleCheckpoint,restoreMarkBattle} from '../web/src/utils/battleCheckpoint.js';
import {campaignGrowth} from '../reports/overnight-lab/growth.mjs';import {choose} from '../reports/overnight-lab/measure-main.mjs';
test('legacy conversion is one-time, keeps possessions and flags, maps 51→11 and never grants P/SP',()=>{
 for(const floor of [1,2,5,6,50,51,99,100]){const old=fresh();old.started=true;old.floor=floor;old.cleared=Array.from({length:floor-1},(_,i)=>i+1);old.p=456;old.sp=17;old.level=83;old.powers.king=5;old.achieved=['A0'];old.claimed=['A0'];const before=clone(old);const s=validateMain20(old);assert.equal(s.floor,Math.ceil(floor/5));assert.equal(s.cleared.length,Math.floor((floor-1)/5));for(const k of ['p','sp','level','powers','claimed','flags'])assert.deepEqual(s[k],old[k],k);assert.deepEqual(old,before);assert.deepEqual(validateMain20(JSON.parse(exportSave(s))),s);}
 const old=developerState(fresh());old.flags.finalClear=true;old.sp=73;const s=validateMain20(old);assert.equal(s.floor,20);assert.equal(s.cleared.length,20);assert.equal(s.sp,73);assert.deepEqual(s.flags,old.flags);assert.equal(s.p,old.p);assert.ok(midgameUnlocked(s));
});
test('legacy unlocked content cannot relock; missing reward marker does not regrant legacy50 SP',()=>{
 for(const flag of ['lv100','warp','stella','ex','stellaClear','final','finalClear']){const old=fresh();old.sp=7;old.flags[flag]=true;const s=validateMain20(old);assert.equal(s.sp,7);assert.equal(s.flags[flag],true);assert.equal(s.flags.reward100,true);assert.equal(s.cleared.length,20);if(flag!=='lv100')assert.ok(canStart(s,'ex',100));if(['stellaClear','final','finalClear'].includes(flag))assert.ok(canStart(s,'final',100));if(flag==='ex'){assert.ok(s.flags.exReward);const b=startMainBattle(s,{mode:'ex',floor:100});b.result='win';assert.equal(settleMainBattle(s,b).bonusP,0);}}
 const old=fresh();old.floor=51;old.cleared=Array.from({length:50},(_,i)=>i+1);const s=validateMain20(old);assert.ok(midgameUnlocked(s));assert.ok(canStart(s,'raid',100));s.powers.fallen=s.powers.king=5;fuse(s,'god');assert.equal(s.resonance.god,1);
});
test('load backs up exact old JSON once; JSON import/export does not remigrate or duplicate rewards',()=>{
 const old=developerState(fresh()),raw=JSON.stringify(old),mem=new Map([[SAVE_KEY,raw]]),storage={getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,v)};const a=loadMain20(storage);assert.equal(a.error,null);assert.equal(mem.get('irena-reborn-before-main20'),raw);mem.set(SAVE_KEY,exportSave(a.state));const b=loadMain20(storage);assert.deepEqual(b.state,a.state);assert.equal(mem.get('irena-reborn-before-main20'),raw);assert.throws(()=>validateMain20({...fresh(),route20:2}));assert.throws(()=>validateMain20({hello:1}));
});
test('new route uses save version5 so audit4 cannot silently overwrite it with 100-floor data',()=>{
 const s=freshMain20();assert.equal(s.version,5);assert.equal(JSON.parse(exportSave(s)).version,5);
 const old=JSON.parse(fs.readFileSync('reports/main20-audit5/authorized-changes.json'))['web/src/utils/storage.js'].before;
 const fn=vm.runInNewContext(old.slice(old.indexOf('export function validateSave'),old.indexOf('export function save(')).replace('export function','function')+';validateSave');
 assert.throws(()=>fn(JSON.parse(exportSave(s))),/新しいバージョン/);assert.throws(()=>validateMain20({...fresh(),version:99}),/新しいバージョン/);
});
test('all20 main floors are playable with adopted training pace; unlock warp once and keep full EX/Stella/final',()=>{
 const s=freshMain20();s.started=true;for(let floor=1;floor<=20;floor++){
  campaignGrowth({build:s});const b=startMainBattle(s);assert.equal(b.floor,floor);assert.equal(b.test,false);while(!b.result&&b.turn<201)actMainBattle(b,choose(b,'guard'));assert.equal(b.result,'win',`floor${floor}: ${b.log.join(';')}`);
  const before=s.p,r=settleMainBattle(s,b);assert.equal(r.p,90+floor*12);assert.equal(s.p,before+r.p);assert.equal(settleMainBattle(s,b),null);assert.equal(s.level>=1+floor*3,true);assert.equal(s.flags.stella,false);
  if(floor===5)assert.ok(s.powers.fallen);if(floor===10){assert.ok(s.powers.king);assert.ok(midgameUnlocked(s));}if(floor===15)assert.ok(s.powers.judge);assert.equal(s.flags.lv100,floor===20);
 }
 assert.equal(s.floor,20);assert.equal(s.sp,50);assert.equal(s.counts.wins,20);assert.ok(s.achieved.includes('A11'));assert.throws(()=>startMainBattle(s,{floor:21}));assert.equal(canStart(s,'ex',100),false);warp(s);assert.ok(canStart(s,'ex',100));assert.ok(canStart(s,'stella',100));assert.equal(canStart(s,'final',100),false);
 const ex=startMainBattle(s,{mode:'ex',floor:100});assert.deepEqual(ex.enemy.base,startBattle(fresh(),{mode:'ex',test:true}).enemy.base);const stella=startMainBattle(s,{mode:'stella',floor:100});assert.equal(stella.enemy.base.hp,30000);stella.result='win';settleMainBattle(s,stella);assert.ok(s.flags.final);assert.equal(startMainBattle(s,{mode:'final',floor:100}).enemy.base.hp,85000);
 const repeat=startMainBattle(s,{floor:20});repeat.result='win';const p=s.sp;settleMainBattle(s,repeat);assert.equal(s.sp,p);
});
test('EXPERT main20 raises enemy HP/attack/speed without changing player stats or B1 armor',()=>{
 const s=freshMain20();s.started=true;s.floor=20;s.level=61;const before=JSON.stringify(s),normal=startMainBattle(s,{floor:20,difficulty:'NORMAL'}),expert=startMainBattle(s,{floor:20,difficulty:'EXPERT'});
 assert.equal(expert.difficulty,'EXPERT');assert.equal(expert.enemy.base.hp,normal.enemy.base.hp*1.3);assert.equal(expert.enemy.base.atk,normal.enemy.base.atk*1.2);assert.equal(expert.enemy.base.spd,normal.enemy.base.spd*1.1);assert.equal(expert.enemy.base.def,normal.enemy.base.def);assert.equal(expert.enemy.hp,expert.enemy.base.hp);assert.equal(expert.enemy.buffs.find(x=>x.id==='campaignArmor')?.mul.def,4);assert.deepEqual(expert.base,normal.base);assert.equal(JSON.stringify(s),before);assert.throws(()=>startMainBattle(s,{floor:20,difficulty:'HELL'}));
});
test('main20 checkpoint preserves armor/focus/RNG and prevents mark charge reset across save/reload',()=>{
 const s=freshMain20();s.floor=6;s.level=10;s.marks=['life'];s.markEquip=['life'];const b=startMainBattle(s);actMainBattle(b,'guard');assert.ok(b.buffs.some(x=>x.id==='campaignFocus'));assert.ok(b.enemy.statuses.campaignArmor);s.markBattle=markBattleCheckpoint(b);const loaded=validateMain20(JSON.parse(exportSave(s)));const restored=restoreMarkBattle(loaded.markBattle,validateSave);assert.ok(restored.main20);assert.deepEqual(restored,b);actMainBattle(b,'guard');actMainBattle(restored,'guard');assert.deepEqual(restored,b);
});
test('legacy automatic authority reward is not granted again; purchased powers keep their level',()=>{
 const old=fresh();old.floor=21;old.cleared=Array.from({length:20},(_,i)=>i+1);old.powers.fallen=5;old.powers.king=4;old.powers.judge=3;const s=validateMain20(old),b=startMainBattle(s);b.result='win';const f=s.fragments.fallen;settleMainBattle(s,b);assert.equal(s.powers.fallen,5);assert.equal(s.fragments.fallen-f,10);
 const n=freshMain20();n.floor=5;n.powers.fallen=4;const c=startMainBattle(n);c.result='win';settleMainBattle(n,c);assert.equal(n.powers.fallen,4);assert.equal(n.fragments.fallen,18);
});
test('loss, retreat and developer tests cannot advance route or grant first rewards; lab duplicate entry removed',()=>{
 const s=freshMain20(),b=startMainBattle(s);b.result='lose';const before={p:s.p,sp:s.sp,floor:s.floor,cleared:[...s.cleared]};settleMainBattle(s,b);for(const [k,v]of Object.entries(before))assert.deepEqual(s[k],v);
 const d=startMainBattle(s,{test:true});d.result='win';const snap=JSON.stringify(s);settleMainBattle(s,d);assert.equal(JSON.stringify(s),snap);const app=fs.readFileSync('web/src/components/App.js','utf8');const lab=app.slice(app.indexOf('function lab('),app.indexOf('function dev('));assert.doesNotMatch(lab,/campaignEntry|campaignOpen/);assert.match(app,/b.main20\?settleMainBattle/);
});
