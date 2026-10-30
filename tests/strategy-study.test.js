import {auditRead} from './audit-baseline.js';
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {createHash} from 'node:crypto';
import {clone,fresh} from '../web/src/utils/progression.js';
import {act,buff,settle,available} from '../web/src/utils/gameCore.js';
import * as E from '../web/src/utils/campaign20.js';
import * as M from '../reports/strategy-study/engine-metrics.mjs';
import {prepare,measureBattle,pick,visibleActions,runRoute} from '../reports/strategy-study/policies.mjs';
const fixture=floor=>{const r=E.createCampaign();r.floor=floor;const b=E.startCampaignBattle(r);b.base.hp=1e7;b.hp=b.base.hp;return {r,b};};
const withoutLog=b=>{const c=clone(b);delete c.log;return c;};
for(const [floor,state]of [[6,'campaignArmor'],[7,'pressure'],[8,'renewal']])test(`enemy ${state} effect is identical with short or full100-entry combat log`,()=>{
 const {b}=fixture(floor),full=clone(b);full.log=Array.from({length:100},(_,i)=>'old-'+i);E.actCampaign(b,'slash',{rng:()=>.99});E.actCampaign(full,'slash',{rng:()=>.99});assert.deepEqual(withoutLog(full),withoutLog(b));assert.equal(full.log.length,100);if(state==='campaignArmor')assert.ok(full.enemy.statuses.campaignArmor);if(state==='pressure')assert.ok(full.statuses.pressure);if(state==='renewal')assert.match(full.log.join(' '),/再生：敵HP/);
});
test('past attack messages cannot create new enemy effects after actual evasion, stun or stop',()=>{
 for(const kind of ['evasion','stun','stop']){const {b}=fixture(6);b.log=Array(100).fill('敵の反撃 → 100');if(kind==='evasion')b.base.spd=1e8;if(kind==='stun')b.enemy.statuses.stun=2;if(kind==='stop')b.enemyStop=2;E.actCampaign(b,'guard',{rng:()=>kind==='evasion'?0:.99});assert.ok(!b.enemy.statuses.campaignArmor,kind);}
});
for(const [floor,id]of [[8,'split'],[12,'starfall'],[16,'endure']])test(`already-owned ${id} never receives a duplicate milestone grant`,()=>{
 const {r,b}=fixture(floor);r.build.marks.push(id);r.build.markEquip=[id];b.result='win';const reward=E.settleCampaign(r,b);assert.equal(r.build.marks.filter(x=>x===id).length,1);assert.ok(!reward.unlocked.includes(id));assert.equal(E.settleCampaign(r,b),null);assert.deepEqual(r.build.markEquip,[id]);
 const other=fixture(floor);other.b.result='win';assert.ok(E.settleCampaign(other.r,other.b).unlocked.includes(id));assert.equal(other.r.build.marks.filter(x=>x===id).length,1);
});
test('chosen experimental focus uses3x attack for power and consumes once on hit',()=>{
 assert.equal(E.CAMPAIGN_RULES.focus,3);const {b}=fixture(20);b.base.spd=10000;b.buffs.push({id:'campaignFocus',remaining:3,mul:{}});const model=clone(b);buff(model,'campaignFocusAttack',1,{atk:3});act(model,'power',{rng:()=>.99});E.actCampaign(b,'power',{rng:()=>.99});assert.equal(b.lastDamage,model.lastDamage);assert.ok(!b.buffs.some(x=>x.id==='campaignFocus'));assert.equal(b.cd.power,2);
});
test('focus does not multiply feather and remains unconsumed on a missed power',()=>{
 const {b}=fixture(20);b.base.spd=1;b.enemy.base.spd=10000;b.buffs.push({id:'campaignFocus',remaining:3,mul:{}});E.actCampaign(b,'power',{rng:()=>0});assert.equal(b.lastDamage,0);assert.ok(b.buffs.some(x=>x.id==='campaignFocus'));const other=clone(b);other.buffs=other.buffs.filter(x=>x.id!=='campaignFocus');E.actCampaign(b,'feather',{rng:()=>.99});E.actCampaign(other,'feather',{rng:()=>.99});assert.equal(b.lastDamage,other.lastDamage);assert.equal(b.gauge,65);
});
test('HP1 guard can heal when enemy is stopped but never resurrects a lethal defeat',()=>{
 const a=fixture(6);a.b.hp=1;a.b.enemyStop=1;E.actCampaign(a.b,'guard',{rng:()=>.99});assert.ok(a.b.hp>1);assert.equal(a.b.gauge,18);
 const z=fixture(6);z.b.hp=1;z.b.enemy.base.spd=1e8;z.b.enemy.base.atk=1e9;E.actCampaign(z.b,'guard',{rng:()=>.99});assert.equal(z.b.result,'lose');assert.equal(z.b.hp,0);assert.ok(!z.b.buffs.some(x=>x.id==='campaignFocus'));
});
test('measurement-only guard probes leave runtime state and RNG unchanged',()=>{
 const {b}=fixture(13),m=clone(b);M.measurementReset();E.actCampaign(b,'guard');M.actCampaign(m,'guard');assert.deepEqual(m,b);const probe=M.measurementSummary();assert.equal(probe.attacks,1);assert.ok(probe.offeredWithout>probe.offeredWith);assert.equal(probe.prevented,probe.offeredWithout-probe.offeredWith);
});
test('study never equips unavailable target powers and never spends nonexistent P',()=>{
 const r=E.createCampaign(),l={earnedP:180,trainingP:0,markP:0,fragments:{},events:[]};prepare(r,{profile:'judge-abyss',mark:'split',tier:'high'},E,l);assert.deepEqual(r.build.equipped,['wing','abyss']);assert.deepEqual(r.build.markEquip,['split']);assert.equal(l.markP,160);assert.equal(l.trainingP,0);assert.equal(r.build.p,20);assert.ok(!r.build.powers.judge);assert.ok(!r.build.powers.king);
});
test('study split profile selects only the two visible variants and obeys CT and seal',()=>{
 const {b}=fixture(20);b.marks=['split'];assert.ok(!visibleActions(b).includes('feather'));for(const strategy of ['feather','mixed','guard','slash','adaptive']){const id=pick(b,strategy);assert.notEqual(id,'feather');assert.equal(available(b,id),null);}b.cd.volley=1;assert.equal(pick(b,'feather'),'pierce');b.statuses.seal=2;assert.equal(pick(b,'mixed'),'slash');
});
test('200-round study timeout is retained as failure and cannot grant progression',()=>{
 const {r,b}=fixture(1);b.powers=[];b.enemy.hp=1e12;b.enemy.base.hp=1e12;b.enemy.base.atk=1;b.base.def=1e9;b.base.atk=1;const x=measureBattle(b,'slash',E);assert.equal(x.steps,200);assert.equal(x.result,'timeout');assert.equal(x.win,false);assert.equal(E.settleCampaign(r,b),null);assert.deepEqual(r.cleared,[]);
});
test('complete real route uses only legal purchases and never awards main resources',()=>{
 const main=fresh(),before=JSON.stringify(main);const result=runRoute({profile:'judge-abyss',mark:'split',tier:'standard',strategy:'guard',seed:21001},E);assert.equal(result.clears,20);assert.ok(result.ex);assert.equal(result.duplicateOwnedMarks,0);assert.ok(result.ledger.events.some(x=>x.kind==='purchase'&&x.id==='split'&&x.at===1));assert.ok(result.ledger.events.some(x=>x.kind==='equip-pair'&&x.id==='judge+abyss'&&x.at===16));assert.equal(JSON.stringify(main),before);assert.ok(result.unusedP>=0);
});
test('protected sources remain byte-identical; authorized presentation and renewal edits match exact snapshots',()=>{
 const map={...JSON.parse(auditRead('reports/strategy-study/baseline-files.json')),...JSON.parse(auditRead('reports/polish/approved-ui-hashes.json'))};for(const [file,hash]of Object.entries(map)){if(['web/src/utils/campaign20.js','web/src/components/campaign20View.js','irena-play.html','web/src/components/game.css','web/src/components/App.js','tools/browser-e2e.mjs','tools/home-ui-browser.mjs','tools/quality-review.mjs','tools/quality-evolution.mjs','tools/iphone-qa.mjs','tests/campaign20.test.js','tests/home-ui.test.js'].includes(file))continue;assert.equal(createHash('sha256').update(auditRead(file)).digest('hex'),hash,file);}
 const allowedTests=JSON.parse(auditRead('reports/upgrade-ui/allowed-tests.json'));
 for(const [file,record] of Object.entries(allowedTests)){assert.equal(record.beforeSHA256,map[file],file+' previous test snapshot');let bytes=auditRead(file);if(file==='tests/home-ui.test.js'){const snapshot=JSON.parse(auditRead('reports/upgrade-ui/power-polish-test-snapshot.json'));assert.equal(createHash('sha256').update(snapshot.before).digest('hex'),record.afterSHA256,'previous verified integrity test');assert.equal(createHash('sha256').update(snapshot.after).digest('hex'),snapshot.afterSHA256,'new verified integrity test');assert.equal(bytes.toString(),snapshot.after,'only documented integrity test change');bytes=Buffer.from(snapshot.before);}assert.equal(createHash('sha256').update(bytes).digest('hex'),record.afterSHA256,file+' intentional regression test update');}
 const qaPatches=JSON.parse(auditRead('reports/upgrade-ui/qa-patches.json'));
 for(const [file,record] of Object.entries(qaPatches)){
  assert.equal(record.beforeSHA256,map[file],file+' previous QA snapshot');
  let current=auditRead(file,'utf8');
  assert.equal(createHash('sha256').update(current).digest('hex'),record.afterSHA256,file+' approved browser QA');
  for(const patch of record.patches.slice().reverse()){
   assert.equal(current.split(patch.new).length-1,1,file+' exact QA patch');
   current=current.replace(patch.new,patch.old);
  }
  assert.equal(createHash('sha256').update(current).digest('hex'),record.beforeSHA256,file+' unchanged except upgrade navigation');
 }
 const upgradeCSS=JSON.parse(auditRead('reports/upgrade-ui/css-baseline.json'));
 const currentCSS=auditRead('web/src/components/game.css');
 assert.equal(currentCSS.subarray(0,upgradeCSS.previousBytes).length,upgradeCSS.previousBytes);
 assert.equal(createHash('sha256').update(currentCSS.subarray(0,upgradeCSS.previousBytes)).digest('hex'),upgradeCSS.previousSHA256,'protected prior stylesheet');
 const powerPolish=JSON.parse(auditRead('reports/upgrade-ui/power-polish-css.json'));assert.equal(createHash('sha256').update(currentCSS.subarray(upgradeCSS.previousBytes,powerPolish.previousBytes)).digest('hex'),upgradeCSS.addedSHA256,'approved upgrade-only styles');assert.equal(createHash('sha256').update(currentCSS.subarray(0,powerPolish.previousBytes)).digest('hex'),powerPolish.previousSHA256,'all prior styles unchanged');assert.equal(createHash('sha256').update(currentCSS.subarray(powerPolish.previousBytes)).digest('hex'),powerPolish.addedSHA256,'exact new visual-only styles');
 const candidate=auditRead('reports/strategy-study/engine-B.mjs','utf8').replace("from '../../web/src/utils/progression.js'","from './progression.js'").replace("from '../../web/src/utils/gameCore.js'","from './gameCore.js'");assert.equal(auditRead('web/src/utils/campaign20.js','utf8'),candidate.replace('renewal:.025','renewal:.02'));
});
test('prototype instructions distinguish attack multiplier from final damage',async()=>{const {campaignLobby}=await import('../web/src/components/campaign20View.js');const html=campaignLobby(E.createCampaign(),()=>'<button></button>');assert.match(html,/次の斬撃／権能の攻撃力を3倍/);});
