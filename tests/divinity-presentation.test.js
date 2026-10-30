import test from 'node:test';
import assert from 'node:assert/strict';
import {DIV_SKILLS} from '../web/src/data/divinity.js';
import {divinityVisualProfile} from '../web/src/components/divinityPresentation.js';
import {divinityDeveloper} from '../web/src/utils/divinitySave.js';
import {actDivinityTrial,startDivinityTrial} from '../web/src/utils/divinityTrials.js';
import {observeCombat} from '../web/src/utils/combatObservation.js';

test('each reclaimed power skill selects its existing combat animation and matching authority art',()=>{
 const battle={powers:['judge','wing']};
 for(const [command,skill] of Object.entries(DIV_SKILLS)){
  const visual=divinityVisualProfile(command,battle);
  assert.equal(visual.action,skill.base||(skill.guard?'guard':command),command);
  assert.equal(visual.authority,skill.power||null,command);
  assert.equal(visual.skillName,skill.name,command);
  assert.equal(visual.authoritySkill,!!skill.power,command);
 }
});

test('ordinary combat commands keep their original effect family and authority slot',()=>{
 const battle={powers:['abyss','wing']};
 for(const action of ['slash','guard','feather','pierce','volley','ultimate','wait']){
  assert.equal(divinityVisualProfile(action,battle).action,action);
 }
 assert.equal(divinityVisualProfile('power',battle).authority,'abyss');
 assert.equal(divinityVisualProfile('apotheosis',battle).awakening,true);
 assert.equal(divinityVisualProfile('convergence',battle).action,'ultimate');
});

test('feeding divinity combat facts to the presentation observer does not change trial resolution',()=>{
 const save=divinityDeveloper({},0),observed=startDivinityTrial(save,'wing'),plain=startDivinityTrial(save,'wing'),events=[];
 observeCombat(observed,event=>events.push(event),()=>actDivinityTrial(observed,'guard'));
 actDivinityTrial(plain,'guard');
 assert.deepEqual(observed,plain);
 assert.ok(events.some(event=>event.kind==='playerAction'));
});
