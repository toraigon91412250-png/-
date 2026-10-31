import test from 'node:test';
import assert from 'node:assert/strict';
import {freshDivinity,validateDivinitySave} from '../web/src/utils/divinitySave.js';
import {activateCooperation} from '../web/src/utils/divinityCooperation.js';
import {exportSave} from '../web/src/utils/storage.js';
import {startResonanceTrial,actResonanceTrial,settleResonanceTrial} from '../web/src/utils/resonanceTrial20.js';
import {RESONANCES,resonanceState} from '../web/src/data/resonanceV3.js';
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
