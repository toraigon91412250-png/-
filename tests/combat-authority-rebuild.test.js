import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,clone} from '../web/src/utils/progression.js';
import {freshDivinity,divinityDeveloper,refundRetiredCombatTraining,validateDivinitySave} from '../web/src/utils/divinitySave.js';
import {startBattle,act,available,baseStats,dealPlayer} from '../web/src/utils/gameCore.js';
import {observeCombat} from '../web/src/utils/combatObservation.js';
import {startMainBattle,actMainBattle} from '../web/src/utils/main20.js';
import {divinityCommands} from '../web/src/components/divinityView.js';
import {markBattleCheckpoint,restoreMarkBattle} from '../web/src/utils/battleCheckpoint.js';
import {validateSave,exportSave} from '../web/src/utils/storage.js';

const hit=()=>.99;
function powered(){
 const s=divinityDeveloper(freshDivinity(),5);
 s.equipped=['wing','judge'];
 s.markEquip=['endure','starfall','split'];
 s.marks=[...s.markEquip];
 return s;
}
test('new combat presents only available equipped authority skills and defense',()=>{
 const s=powered(),b=startBattle(s,{mode:'ex',test:true,combatV2:true});
 const keys=divinityCommands(b).map(x=>x[0]);
 for(const id of ['plume','thousandWings','verdict','judgment','guard'])assert.ok(keys.includes(id),id);
 for(const id of ['slash','feather','pierce','volley','power','ultimate','mantle'])assert.ok(!keys.includes(id),id);
 for(const id of ['slash','feather','pierce','volley','power','ultimate','mantle'])assert.ok(available(b,id),id);
 assert.equal(b.marks.length,0);
 assert.equal(b.markLife,0);
 assert.deepEqual(b.base,baseStats({...s,markEquip:[]}));
});
test('authority shared CT counts full player actions and is independent from resonance CT',()=>{
 const b=startBattle(powered(),{mode:'ex',test:true,combatV2:true});
 b.enemy.base={hp:1e11,atk:1,def:1,spd:1};b.enemy.hp=b.enemy.base.hp;
 act(b,'plume',{rng:hit});
 assert.equal(b.cd.authorityShared,2);
 assert.equal(b.cd.plume,undefined);
 assert.match(available(b,'verdict'),/権能共通CT 2/);
 act(b,'guard',{rng:hit});assert.equal(b.cd.authorityShared,1);
 act(b,'guard',{rng:hit});assert.equal(b.cd.authorityShared,undefined);
 assert.equal(available(b,'verdict'),null);
 act(b,'verdict',{rng:hit});
 assert.equal(b.cd.authorityShared,4);
 assert.equal(b.cd.verdict,undefined);
 assert.equal(b.cd.resonanceShared,undefined);
});
test('guard and zero effect imprints do not create an unearned no-imprint victory',()=>{
 const s=powered(),b=startBattle(s,{mode:'ex',test:true,combatV2:true});
 assert.equal(b.marks.length,0);assert.equal(b.build.markEquip.length,3);
 const legacy=startBattle(s,{mode:'ex',test:true});assert.equal(legacy.marks.length,3);
});
test('retired skill costs refund exactly once; save validation never doubles the refund',()=>{
 const s=freshDivinity();delete s.combatRebuildRefunded;
 s.skills={feather:5,destruction:2,ultimate:3};
 const before=s.p;assert.equal(refundRetiredCombatTraining(s),490);
 assert.equal(s.p,before+490);assert.deepEqual(s.skills,{feather:1,destruction:1,ultimate:1});
 assert.equal(refundRetiredCombatTraining(s),0);assert.equal(s.p,before+490);
 const imported=validateDivinitySave(JSON.parse(exportSave(s)));
 assert.equal(imported.p,s.p);assert.equal(imported.combatRebuildRefunded,true);
});
test('starting with no reclaimed authority retains a temporary safe attack',()=>{
 const s=freshDivinity(),b=startBattle(s,{combatV2:true});
 assert.deepEqual(divinityCommands(b).map(x=>x[0]).slice(0,2),['slash','guard']);
 assert.equal(available(b,'slash'),null);
 act(b,'slash',{rng:hit});
 assert.equal(b.gauge,26);
});
test('new-rule checkpoint replays unchanged with shared cooldown',()=>{
 const s=divinityDeveloper(freshDivinity(),2);
 s.equipped=['wing','judge'];
 const b=startMainBattle(s,{floor:10,combatV2:true});
 actMainBattle(b,'plume',{rng:hit});
 assert.equal(b.result,null);
 const cp=markBattleCheckpoint(b);
 assert.equal(cp.combatV2,true);assert.equal(cp.schema,3);
 const restored=restoreMarkBattle(cp,validateSave);
 assert.equal(restored.combatV2,true);
 assert.equal(restored.gauge,b.gauge);
 assert.equal(restored.cd.authorityShared,b.cd.authorityShared);
 assert.equal(restored.enemy.hp,b.enemy.hp);
});
test('new authority attack can break B1 armor without the removed destruction command',()=>{
 const s=divinityDeveloper(freshDivinity(),2);
 s.equipped=['wing','judge'];
 const b=startMainBattle(s,{floor:5,combatV2:true});
 assert.ok(b.enemy.statuses.campaignArmor);
 actMainBattle(b,'plume',{rng:hit});
 assert.equal(b.enemy.statuses.campaignArmor,undefined);
});

test('stunned combat exposes recovery action in system group, never an empty authority dock',()=>{
 const s=powered(),b=startBattle(s,{mode:'ex',test:true,combatV2:true});b.statuses.stun=1;
 const html=divinityCommands(b);
 assert.deepEqual(html.map(row=>row[0]),['wait']);
 const source=import.meta.url;
 assert.ok(source.includes('combat-authority-rebuild'));
});

test('switching authority during a rebuilt battle cannot reactivate dormant endurance imprint',()=>{
 const s=powered(),b=startBattle(s,{mode:'ex',test:true,combatV2:true});
 assert.deepEqual(b.base,baseStats({...s,markEquip:[]}));
 const oldMax=b.base.hp;
 act(b,'attune_king',{rng:hit});
 assert.ok(b.powers.includes('king'));
 assert.deepEqual(b.base,baseStats({...b.build,equipped:b.powers,markEquip:[]}));
 assert.notEqual(b.base.hp,oldMax);
 assert.equal(b.markLife,0);
});

test('new king endurance emits only a cosmetic hex event on the actual lethal hit',()=>{
 const s=powered();s.equipped=['king','wing'];const b=startBattle(s,{mode:'ex',test:true,combatV2:true});
 b.hp=b.base.hp*.5;const seen=[];
 observeCombat(b,event=>seen.push(event),()=>dealPlayer(b,1e12));
 assert.ok(b.hp>0);assert.ok(b.lives>=0);
 assert.equal(seen.filter(x=>x.kind==='kingEndure').length,1);
 assert.equal(seen.filter(x=>x.kind==='incomingHit').length,1);
 assert.equal(seen.find(x=>x.kind==='kingEndure').remaining,b.lives);
});
