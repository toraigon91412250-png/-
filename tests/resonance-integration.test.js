import test from 'node:test';
import assert from 'node:assert/strict';
import {freshDivinity,validateDivinitySave} from '../web/src/utils/divinitySave.js';
import {activateCooperation} from '../web/src/utils/divinityCooperation.js';
import {exportSave} from '../web/src/utils/storage.js';
import {startResonanceTrial,actResonanceTrial,settleResonanceTrial} from '../web/src/utils/resonanceTrial20.js';
import {RESONANCES,resonanceState} from '../web/src/data/resonanceV3.js';
import {available} from '../web/src/utils/gameCore.js';
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
 assert.equal(reward.summonPoints,250);
 assert.equal(reward.unlocks[0],'黒き翼の裁き');
 assert.equal(s.divinity.cooperation.judge,20);
 assert.equal(resonanceState(s).floor,2);
 assert.equal(settleResonanceTrial(s,b),null);
 assert.equal(s.summonPoints,250);
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
  assert.equal(resonanceState(s).floor,Math.min(20,floor+1));
 }
 assert.equal(RESONANCES.every(r=>resonanceState(s).levels[r.id]===1),true);
 assert.equal(resonanceState(s).finished,true);
});