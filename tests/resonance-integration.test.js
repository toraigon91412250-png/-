import test from 'node:test';
import assert from 'node:assert/strict';
import {freshDivinity,validateDivinitySave} from '../web/src/utils/divinitySave.js';
import {activateCooperation} from '../web/src/utils/divinityCooperation.js';
import {exportSave} from '../web/src/utils/storage.js';
import {startResonanceTrial,actResonanceTrial,settleResonanceTrial} from '../web/src/utils/resonanceTrial20.js';
import {RESONANCES,resonanceState} from '../web/src/data/resonanceV3.js';
import {available,startBattle,act,playerStats} from '../web/src/utils/gameCore.js';
import {resonanceReason} from '../web/src/utils/resonanceCombat.js';
import {startMainBattle,actMainBattle} from '../web/src/utils/main20.js';
import {markBattleCheckpoint,restoreMarkBattle} from '../web/src/utils/battleCheckpoint.js';
import {learnResonance} from '../web/src/data/resonanceV3.js';
function eligible(){
 const s=activateCooperation(freshDivinity());
 s.started=true;s.floor=20;s.cleared=Array.from({length:20},(_,i)=>i+1);
 s.divinity.infiniteWins=1;s.stats.hp=10000;s.stats.atk=10000;s.stats.def=10000;
 return s;
}
test('first story battle reaches cooperative breakthrough without having the skill yet',()=>{
 const s=eligible();
 const b=startResonanceTrial(s);
 assert.equal(b.trial.floor,1);
 assert.deepEqual(b.powers,['wing','judge']);
 actResonanceTrial(b,'feather',{rng:()=>.5});
 assert.equal(b.trial.proven,false);
 actResonanceTrial(b,'slash',{rng:()=>.5});
 assert.equal(b.trial.proven,true);
 assert.equal(b.gauge,100);
 actResonanceTrial(b,'res_wingjudge',{rng:()=>.5});
 assert.equal(b.trial.tempUsed,true);
 assert.equal(b.result,'win');
 const reward=settleResonanceTrial(s,b);
 assert.equal(reward.summonPoints,0);
 assert.equal(reward.unlocks[0],'黒き翼の裁き');
 assert.equal(s.divinity.cooperation.judge,20);
 assert.equal(resonanceState(s).floor,2);
 assert.equal(settleResonanceTrial(s,b),null);
 assert.equal(s.summonPoints,0);
});
test('new resonance and summons survive export/validation',()=>{
 const s=eligible();
 const r=resonanceState(s);
 r.levels.wingjudge=3;r.floor=7;r.cleared=[1,2,3,4,5,6];
 s.summonPoints=730;
 const saved=validateDivinitySave(JSON.parse(exportSave(s)));
 assert.equal(saved.divinity.resonanceV3.floor,7);
 assert.equal(saved.divinity.resonanceV3.levels.wingjudge,3);
 assert.equal(saved.summonPoints,730);
});
test('no final victory without all five authority seals',()=>{
 const s=eligible();resonanceState(s).floor=20;
 const b=startResonanceTrial(s);b.result='win';
 assert.throws(()=>settleResonanceTrial(s,b),/五重封印/);
});


test('all twenty floors can be cleared in a real turn sequence without deadlocks',()=>{
 const s=eligible();s.level=100;s.stats.hp=10000;s.stats.atk=100000;s.stats.def=10000;
 const actLegal=(b,action)=>{
  const reason=available(b,action);
  if(reason)throw Error('Floor '+b.trial.floor+' blocked '+action+': '+reason+' (HP '+(b.hp/b.base.hp).toFixed(3)+', log '+b.log.slice(-5).join(' | ')+')');
  actResonanceTrial(b,action,{rng:()=>.5});
 };
 for(let floor=1;floor<=20;floor++){
  const summonPointsBefore=s.summonPoints;
  s.stats.def=floor===17?0:10000; // test a low-defense build only at the survival trial
  const b=startResonanceTrial(s);
  assert.equal(b.trial.floor,floor);
  if(floor===20){
   actLegal(b,'feather');actLegal(b,'guard');
   actLegal(b,'attune_fallen');actLegal(b,'attune_wing');actLegal(b,'fallenOath');
   actLegal(b,'attune_abyss');actLegal(b,'abyssTide');
   actLegal(b,'attune_judge');
   actLegal(b,'slash');actLegal(b,'power');
   assert.equal(b.trial.seals.length,5,'Final boss must witness all 5 authorities: '+b.trial.seals.join(',')+'; HP '+(b.hp/b.base.hp).toFixed(3)+'; '+b.log.slice(-10).join(' | '));
  }else if(floor%2===1){
   const defensive=[7,13,15].includes(floor);
   actLegal(b,floor===1?'feather':'slash');
   actLegal(b,defensive?'guard':floor===1?'slash':'power');
   assert.equal(b.trial.proven,true,'Floor '+floor+' must create cooperation');
   if([11,17].includes(floor)){
    actLegal(b,'fallenOath');
    for(let i=0;floor===17&&b.hp/b.base.hp>.5&&i<20;i++)actLegal(b,i%2===0?'slash':'guard');
   }
   actLegal(b,'res_'+b.trial.tempId);
   assert.equal(b.trial.tempUsed,true,'Floor '+floor+' must cast its learned skill');
  }
  for(let turn=0;!b.result&&turn<100;turn++){
   const action=available(b,'power')===null?'power':'slash';
   actLegal(b,action);
  }
  assert.equal(b.result,'win','Unclearable floor '+floor+', enemy '+b.enemy.hp+'/'+b.enemy.base.hp);
  const reward=settleResonanceTrial(s,b);
  assert.ok(reward);
  assert.equal(reward.summonPoints,0);
  assert.equal(s.summonPoints,summonPointsBefore,'trial win must not grant normal battle summon points');
  assert.equal(resonanceState(s).floor,Math.min(20,floor+1));
 }
 assert.equal(RESONANCES.every(r=>resonanceState(s).levels[r.id]===1),true);
 assert.equal(resonanceState(s).finished,true);
});
test('normal combat checkpoint round-trips cooperative action with deterministic replay',()=>{
 const s=eligible();
 s.level=1;s.stats.hp=500;s.stats.atk=0;s.stats.def=500;s.equipped=['wing','judge'];s.flags.stella=true;
 learnResonance(s,'wingjudge');
 const b=startMainBattle(s,{mode:'ex',floor:100});
 for(let n=0;n<4;n++)actMainBattle(b,'slash',{rng:()=>.5});
 assert.equal(b.gauge,100);
 assert.equal(b.result,null);
 actMainBattle(b,'res_wingjudge',{rng:()=>.5});
 assert.equal(b.result,null);
 const checkpoint=markBattleCheckpoint(b);
 assert.ok(checkpoint);
 assert.ok(checkpoint.turns.some(row=>row.action==='res_wingjudge'));
 const restored=restoreMarkBattle(checkpoint,validateDivinitySave);
 assert.equal(restored.enemy.hp,b.enemy.hp);
 assert.equal(restored.gauge,b.gauge);
 assert.equal(restored.cd.resonanceShared,b.cd.resonanceShared);
});

test('resonance trial checkpoint resumes the same floor and deterministic battle state',()=>{
 const s=eligible();s.level=1;s.stats={hp:0,atk:0,def:0,spd:0};
 const b=startResonanceTrial(s);
 actResonanceTrial(b,'feather',{rng:()=>.5});
 actResonanceTrial(b,'slash',{rng:()=>.5});
 assert.equal(b.trial.proven,true);
 const checkpoint=markBattleCheckpoint(b);
 assert.equal(checkpoint.schema,4);assert.equal(checkpoint.mode,'resonance20');
 assert.equal(checkpoint.authorityStrike,'A1');
 s.markBattle=checkpoint;
 const saved=validateDivinitySave(JSON.parse(exportSave(s)));
 const restored=restoreMarkBattle(saved.markBattle,validateDivinitySave);
 assert.equal(restored.trial.kind,'resonance20');
 assert.equal(restored.trial.floor,b.trial.floor);
 assert.deepEqual(restored.trial.seals,b.trial.seals);
 assert.equal(restored.trial.proven,b.trial.proven);
 assert.equal(restored.enemy.hp,b.enemy.hp);
 assert.equal(restored.hp,b.hp);
 assert.equal(restored.gauge,b.gauge);
 assert.equal(restored.replay.length,b.replay.length);
 actResonanceTrial(restored,'res_wingjudge',{rng:()=>.5});
 actResonanceTrial(b,'res_wingjudge',{rng:()=>.5});
 assert.equal(restored.enemy.hp,b.enemy.hp);
 assert.equal(restored.hp,b.hp);
 assert.equal(restored.cd.resonanceShared,b.cd.resonanceShared);
});

test('shared resonance cooldown ticks through an authority switch without resetting',()=>{
 const s=eligible();s.level=1;s.stats={hp:5000,atk:0,def:5000,spd:0};s.flags.stella=true;s.equipped=['wing','judge'];
 learnResonance(s,'wingjudge');learnResonance(s,'fallenjudge');
 const b=startMainBattle(s,{mode:'ex',floor:100});
 for(let i=0;i<4;i++)actMainBattle(b,'slash',{rng:()=>.5});
 assert.equal(b.gauge,100);assert.equal(b.result,null);
 actMainBattle(b,'res_wingjudge',{rng:()=>.5});
 assert.equal(b.cd.resonanceShared,2);
 assert.match(available(b,'res_wingjudge'),/共通CT 2/);
 actMainBattle(b,'attune_fallen',{rng:()=>.5});
 assert.deepEqual(b.powers,['judge','fallen']);
 assert.equal(b.cd.resonanceShared,1);
 assert.match(available(b,'res_fallenjudge'),/共通CT 1/);
 actMainBattle(b,'guard',{rng:()=>.5});assert.equal(b.cd.resonanceShared||0,0);
 b.hp=b.base.hp*.5;b.gauge=100;assert.equal(available(b,'res_fallenjudge'),null);
 actMainBattle(b,'res_fallenjudge',{rng:()=>.5});assert.equal(b.cd.resonanceShared,2);
});

test('King Judgment extra max-HP hit checks the heavy before player defense and guard mitigation',()=>{
 const s=activateCooperation(freshDivinity());s.started=true;s.equipped=['king','judge'];
 s.divinity.cooperation.king=100;s.divinity.cooperation.judge=100;
 s.divinity.resonanceV3={levels:{kingjudge:5},cleared:[],floor:1};
 const b=startBattle(s,{mode:'normal',floor:1});b.gauge=100;b.enemy.base.hp=1_000_000_000;b.enemy.hp=b.enemy.base.hp;
 b.enemy.base.atk=Math.floor(playerStats(b).hp*.15);b.enemy.base.spd=1;
 act(b,'res_kingjudge',{rng:()=>.99});
 assert.equal(b.divine.resonance.royalJudgment.armed,true);
 while(b.turn<=4&&b.hp>0)act(b,'guard',{rng:()=>.99});
 const hits=b.events.filter(x=>x.type==='hit');
 assert.equal(b.turn,5);assert.equal(hits.length,2);
 assert.equal(hits[1].damage,Math.floor(b.enemy.base.hp*.10));
});

test('first cooperative trial grants its temporary resonance without bypassing later gauge costs',()=>{
 const s=activateCooperation(freshDivinity());s.started=true;s.floor=20;s.divinity.infiniteWins=1;s.stats={hp:0,atk:0,def:10000,spd:0};
 const b=startResonanceTrial(s);b.enemy.base.hp=1_000_000_000;b.enemy.hp=b.enemy.base.hp;b.enemy.base.atk=1;b.enemy.base.spd=1;
 actResonanceTrial(b,'feather',{rng:()=>.5});actResonanceTrial(b,'slash',{rng:()=>.5});
 assert.equal(b.trial.proven,true);assert.equal(b.gauge,100);
 actResonanceTrial(b,'res_wingjudge',{rng:()=>.5});assert.equal(b.gauge,0);
 actResonanceTrial(b,'guard',{rng:()=>.5});actResonanceTrial(b,'guard',{rng:()=>.5});
 assert.equal(b.cd.resonanceShared||0,0);assert.equal(b.gauge,36);
 assert.equal(resonanceReason(b,'res_wingjudge'),'必殺ゲージ100%必要');
 for(let i=0;i<3;i++)actResonanceTrial(b,'slash',{rng:()=>.5});
 assert.equal(b.gauge,100);assert.equal(resonanceReason(b,'res_wingjudge'),null);
 actResonanceTrial(b,'res_wingjudge',{rng:()=>.5});assert.equal(b.gauge,0);
});
