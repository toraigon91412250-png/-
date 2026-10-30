import fs from 'node:fs';
import assert from 'node:assert/strict';
import {runPath,simulateTrial,trialChoice} from './divinity-simulation.mjs';
import {startMainBattle,actMainBattle,settleMainBattle} from '../web/src/utils/main20.js';
import {available,startBattle,act,settle,playerStats} from '../web/src/utils/gameCore.js';
import {startMirrorTrial,actMirrorTrial} from '../web/src/utils/mirrorTrial.js';
import {startDivinityTrial,actDivinityTrial,settleDivinityTrial} from '../web/src/utils/divinityTrials.js';
import {upgradePower,awaken,warp,clone,startGauntlet} from '../web/src/utils/progression.js';
import {divinityAwakenReason,chooseDivinityBranch} from '../web/src/utils/divinityProgress.js';
const results=[];
for(const order of [['abyss','fallen','judge','king'],['king','judge','fallen','abyss'],['fallen','abyss','king','judge']]){
 const {s,trials}=runPath(order);s.equipped=['wing','judge'];const floors=[];
 for(let f=2;f<=20;f++){
  for(const id in s.powers)while(s.powers[id]<5&&s.fragments[id]>=s.powers[id]*8)upgradePower(s,id);
  for(const [id,branch]of Object.entries({wing:'assault',abyss:'drain',fallen:'resolve',judge:'sentence',king:'bastion'}))if(s.powers[id]>=3)chooseDivinityBranch(s,id,branch);
  while(!divinityAwakenReason(s))awaken(s);
  const b=startMainBattle(s,{floor:f});for(let i=0;i<100&&!b.result;i++){const a=b.turn%4===0?'guard':['judgment','thousandWings','plume','verdict','power','feather','ultimate','slash'].find(x=>!available(b,x));actMainBattle(b,a,{rng:()=>.5});}
  floors.push({floor:f,result:b.result,turns:b.turn,hp:b.hp});assert.equal(b.result,'win',`floor ${f}`);settleMainBattle(s,b);
 }
 while(!divinityAwakenReason(s))awaken(s);
 for(const id in s.powers)while(s.powers[id]<5&&s.fragments[id]>=s.powers[id]*8)upgradePower(s,id);
 const truth=simulateTrial(s,'truth');assert.equal(truth.result,'win');awaken(s);
 const infinite=startDivinityTrial(s,'infinite');for(let i=0;i<36&&!infinite.result;i++){let a=trialChoice(infinite);if(infinite.turn%3!==1&&infinite.divine?.unified&&!available(infinite,'convergence')&&!infinite.trial.seals)a='convergence';actDivinityTrial(infinite,a);}assert.equal(infinite.result,'win');settleDivinityTrial(s,infinite);
 warp(s);const bosses=[];
 for(const mode of ['ex','raid','stella','final','god']){
  const build=clone(s);if(mode==='final')build.flags.final=true;if(mode==='god'){build.flags.ex=true;startGauntlet(build);}
  const b=startBattle(build,{mode,floor:20});
  for(let i=0;i<150&&!b.result;i++){
   let actions=b.character==='stella'?['meteor','immortal','rebirth','slash']:b.character==='final'?['grasp','annihilate','slash']:['apotheosis','convergence','judgment','thousandWings','plume','verdict','power','feather','ultimate','slash'];
   if(b.character==='final'&&b.balance>=0)actions=['fallen'];
   if(b.character==='irena'&&b.turn%4===0)actions=['royalGuard','guard'];
   const a=b.statuses.stun?'wait':actions.find(x=>!available(b,x));act(b,a,{rng:()=>.5});assert.ok(Number.isFinite(b.hp)&&Number.isFinite(b.enemy.hp));
  }
  assert.ok(b.result);bosses.push({mode,result:b.result,turns:b.turn});
 }
 const mirror=startMirrorTrial(s,{phase:3});
 for(let i=0;i<90&&!mirror.result;i++){
  let opts=mirror.trial.ritual>=2?['convergence','ultimate','royalGuard','guard']:mirror.trial.counterReady?['verdict','power','slash']:['apotheosis','convergence','judgment','plume','power','feather','slash'];
  const a=opts.find(x=>!available(mirror,x));actMirrorTrial(mirror,a,{rng:()=>.5});assert.ok(Number.isFinite(mirror.hp)&&Number.isFinite(mirror.enemy.hp));if(mirror.result==='win')assert.equal(mirror.trial.seals,0);
 }
 assert.ok(mirror.result);results.push({order,trials,floors,truth:{result:truth.result,turns:truth.turn},infinite:{result:infinite.result,turns:infinite.turn},bosses,mirror:{result:mirror.result,turns:mirror.turn,seals:mirror.trial.seals},finalStage:s.awakening});
}
fs.writeFileSync('reports/divinity-rebuild/adventure-results.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results.map(r=>({order:r.order,floorTurns:r.floors.map(x=>x.turns),truth:r.truth,infinite:r.infinite,bosses:r.bosses,mirror:r.mirror})),null,2));
