import test from 'node:test';
import assert from 'node:assert/strict';
import {freshDivinity,loadDivinity,validateDivinitySave} from '../web/src/utils/divinitySave.js';
import {exportSave,SAVE_KEY} from '../web/src/utils/storage.js';
import {activateCooperation,canZeroRelease,COOP_START,COOP_CAP_0,COOP_CAP_1,cooperationTrialReason,grantCooperationTrial,cooperationEnabled} from '../web/src/utils/divinityCooperation.js';
import {DIV_IDS} from '../web/src/data/divinity.js';
import {startBattle,act,available,playerStats} from '../web/src/utils/gameCore.js';
import {startMainBattle,actMainBattle,settleMainBattle} from '../web/src/utils/main20.js';
import {startDivinityTrial,actDivinityTrial,settleDivinityTrial} from '../web/src/utils/divinityTrials.js';
import {markBattleCheckpoint,restoreMarkBattle} from '../web/src/utils/battleCheckpoint.js';
import {clone} from '../web/src/utils/progression.js';

const fresh=()=>activateCooperation(freshDivinity());
const deterministic={rng:()=>.5,enemyAction:()=>{}};
function eligible(){
 const s=fresh();s.cleared=Array.from({length:15},(_,i)=>i+1);s.floor=16;
 s.stats.hp=10000;s.stats.atk=100000;s.stats.def=10000;
 for(const id of DIV_IDS)s.divinity.cooperation[id]=COOP_CAP_0[id];
 return s;
}

test('five distinct personalities are present from the start; legacy levels and equipment are retained',()=>{
 const s=fresh();assert.deepEqual(s.divinity.cooperation,COOP_START);
 assert.deepEqual(s.equipped,['wing','king']);assert.deepEqual(DIV_IDS.filter(id=>s.powers[id]===1),DIV_IDS);
 assert.equal(s.divinity.reclaimed.length,5);assert.equal(activateCooperation(s),s);
 const old=freshDivinity();old.powers.judge=5;old.resonance.god=3;old.equipped=['judge','god'];old.divinity.reclaimed=['judge'];
 activateCooperation(old);
 assert.equal(old.powers.judge,5);assert.equal(old.resonance.god,3);
 assert.deepEqual(old.equipped,['judge','god']);assert.equal(old.divinity.cooperation.judge,55);
 assert.equal(old.divinity.cooperationTrials.judge,1);
});

test('save migration backs up raw data, validates rates and round-trips without truncation',()=>{
 const s=freshDivinity();s.started=true;const raw=JSON.stringify(s);
 const map=new Map([[SAVE_KEY,raw]]),storage={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v)};
 const loaded=loadDivinity(storage);assert.equal(cooperationEnabled(loaded.state),true);
 assert.equal(map.get(SAVE_KEY),raw);assert.equal(map.get('irena-before-cooperation-v1'),raw);
 const saved=validateDivinitySave(JSON.parse(exportSave(loaded.state)));
 assert.deepEqual(saved.divinity.cooperation,COOP_START);
 saved.divinity.cooperation.judge=20;saved.divinity.cooperationTrials.judge=1;
 assert.deepEqual(validateDivinitySave(saved).divinity.cooperation,saved.divinity.cooperation);
 const corrupt=clone(saved);corrupt.divinity.cooperation.judge=Infinity;
 assert.throws(()=>validateDivinitySave(corrupt),/保存形式/);
 const forged=clone(saved);forged.divinity.cooperationTrials.judge=9;
 assert.throws(()=>validateDivinitySave(forged),/保存形式/);
});

test('one cooperative action earns bounded progress only on a genuine victory',()=>{
 const s=fresh();const b=startMainBattle(s,{floor:1});b.enemy.base={hp:10,atk:1,def:0,spd:1};b.enemy.hp=10;
 actMainBattle(b,'plume',deterministic);assert.equal(b.result,'win');
 const result=settleMainBattle(s,b);assert.deepEqual(result.cooperation,['黒翼 +1.0%']);
 assert.equal(s.divinity.cooperation.wing,71);
 assert.equal(s.divinity.cooperation.king,60);
 assert.equal(settleMainBattle(s,b),null);assert.equal(s.divinity.cooperation.wing,71);
 const noCredit=startMainBattle(s,{floor:1});noCredit.enemy.base={hp:1,atk:1,def:0,spd:1};noCredit.enemy.hp=1;
 actMainBattle(noCredit,'slash',deterministic);settleMainBattle(s,noCredit);
 assert.equal(s.divinity.cooperation.wing,71);
 const defeat=startMainBattle(s,{floor:1});defeat.result='lose';settleMainBattle(s,defeat);
 assert.equal(s.divinity.cooperation.wing,71);
});

test('rate gains are capped; boss victories have a larger award',()=>{
 const s=eligible();s.divinity.cooperation.wing=79.5;
 const b=startMainBattle(s,{floor:5});b.enemy.base={hp:10,atk:1,def:0,spd:1};b.enemy.hp=10;
 actMainBattle(b,'plume',deterministic);const result=settleMainBattle(s,b);
 assert.equal(s.divinity.cooperation.wing,80);
 assert.deepEqual(result.cooperation,['黒翼 +0.5%']);
});

test('first and second cooperation trials require both combat experience and chapter milestones',()=>{
 const s=fresh();assert.match(cooperationTrialReason(s,'wing'),/第5階層/);
 s.cleared=Array.from({length:5},(_,i)=>i+1);s.floor=6;
 assert.match(cooperationTrialReason(s,'wing'),/80%/);
 s.divinity.cooperation.wing=80;assert.equal(cooperationTrialReason(s,'wing'),null);
 assert.throws(()=>grantCooperationTrial(s,'wing',2),/一致/);
 assert.equal(grantCooperationTrial(s,'wing',1),90);
 assert.equal(s.divinity.cooperationTrials.wing,1);
 assert.match(cooperationTrialReason(s,'wing'),/第15階層/);
 s.cleared=Array.from({length:15},(_,i)=>i+1);s.floor=16;
 assert.equal(cooperationTrialReason(s,'wing'),null);
 assert.equal(grantCooperationTrial(s,'wing',2),100);
 assert.match(cooperationTrialReason(s,'wing'),/突破済み/);
 assert.throws(()=>grantCooperationTrial(s,'wing',2),/一致/);
});

test('five distinct first-tier trials require their combat-specific evidence',()=>{
 const attempts={
  wing:['guard','feather'],king:['royalGuard','slash'],
  fallen:['fallenOath','slash'],judge:['slash','feather','verdict'],
  abyss:['guard','abyssTide']
 };
 for(const id of DIV_IDS){
  const s=eligible();const b=startDivinityTrial(s,id);
  assert.equal(b.trial.cooperation,true);assert.equal(b.trial.tier,1);assert.equal(b.trial.proven,false);
  for(const action of attempts[id]){
   if(b.result)break;
   actDivinityTrial(b,action);
  }
  assert.equal(b.trial.proven,true,`${id} failed to prove`);
  assert.equal(s.divinity.cooperationTrials[id],undefined,'battle must not directly change persistent state');
  if(!b.result){b.enemy.hp=1;actDivinityTrial(b,'slash');}
  assert.equal(b.result,'win',`${id} failed to win`);
  const old=s.divinity.cooperation[id];const reward=settleDivinityTrial(s,b);
  assert.equal(s.divinity.cooperationTrials[id],1);assert.equal(s.divinity.cooperation[id],Math.min(COOP_CAP_1[id],old+10));
  assert.equal(reward.p,120);assert.equal(settleDivinityTrial(s,b),null);
 }
});

test('swapping a cooperating authority consumes an entire action and triggers an enemy turn',()=>{
 const s=fresh();const b=startBattle(s,{mode:'normal',floor:1,test:true});let enemyActions=0;
 assert.equal(available(b,'attune_abyss'),null);
 assert.match(available(b,'attune_wing'),/既に/);
 act(b,'attune_abyss',{rng:()=>.5,enemyAction:()=>{enemyActions++;}});
 assert.deepEqual(b.powers,['king','abyss']);assert.equal(b.turn,2);assert.equal(enemyActions,1);
 assert.equal(b.lastDamage,0);assert.equal(available(b,'abyssTide'),null);
 b.cd.attune_fallen=0;act(b,'attune_fallen',{rng:()=>.5,enemyAction:()=>{enemyActions++;}});
 assert.deepEqual(b.powers,['abyss','fallen'],'second switch rotates the oldest slot, rather than pinning the first');
 assert.equal(enemyActions,2);
});

test('zero release requires strictly over 50% for everyone and lasts two actions only',()=>{
 const s=fresh();assert.equal(canZeroRelease(s),false);
 for(const id of DIV_IDS)s.divinity.cooperation[id]=51;
 s.divinity.cooperation.judge=50;assert.equal(canZeroRelease(s),false);
 s.divinity.cooperation.judge=51;assert.equal(canZeroRelease(s),true);
 s.stats.hp=50000;
 const b=startBattle(s,{mode:'normal',floor:1,test:true});b.enemy.hp=1e9;b.enemy.base.hp=1e9;b.enemy.base.atk=1;
 const originalPowers=[...b.powers];let enemyActions=0;
 act(b,'apotheosis',{rng:()=>.5,enemyAction:()=>{enemyActions++;}});
 assert.equal(b.divine.unified,2);assert.equal(b.divine.unifiedUsed,true);
 assert.equal(b.powers.length,5);assert.ok(playerStats(b).atk>=b.base.atk*3);
 assert.equal(enemyActions,1);assert.equal(available(b,'convergence'),null);
 act(b,'guard',deterministic);assert.equal(b.divine.unified,1);
 act(b,'guard',deterministic);assert.equal(b.divine.unified,0);
 assert.deepEqual(b.powers,originalPowers);assert.match(available(b,'apotheosis'),/1戦闘1回/);
 assert.deepEqual(b.build.divinity.cooperation,s.divinity.cooperation);
});

test('cooperation improves additional damage, not baseline damage; banter is transient',()=>{
 const s=fresh();const weaker=startBattle(s,{mode:'normal',floor:1,test:true});
 weaker.enemy.base={hp:1e9,atk:1,def:1,spd:1};weaker.enemy.hp=1e9;
 const stronger=clone(weaker);stronger.build.divinity.cooperation.wing=90;
 act(weaker,'plume',deterministic);act(stronger,'plume',deterministic);
 assert.ok(weaker.lastDamage>0);assert.ok(stronger.lastDamage>weaker.lastDamage*1.05);
 const talk=startBattle(s,{mode:'normal',floor:1,test:true});talk.turn=3;
 act(talk,'guard',deterministic);assert.ok(talk.divine.line?.speaker);assert.ok(talk.divine.line?.text);
 act(talk,'guard',deterministic);assert.equal(talk.divine.line,null);
});

test('active cooperation and one-time release survive battle checkpoint replay',()=>{
 const s=eligible();for(const id of DIV_IDS){s.divinity.cooperationTrials[id]=1;s.divinity.cooperation[id]=Math.min(COOP_CAP_1[id],Math.max(COOP_START[id],55));}
 const b=startMainBattle(s,{floor:10});
 actMainBattle(b,'apotheosis');
 const record=markBattleCheckpoint(b);
 assert.ok(record);
 const replay=restoreMarkBattle(record,validateDivinitySave);
 assert.deepEqual(replay.build.divinity.cooperation,s.divinity.cooperation);
 assert.deepEqual(replay.divine,b.divine);assert.equal(replay.turn,b.turn);
 assert.deepEqual(replay.powers,b.powers);
});
