import {freshDivinity} from '../web/src/utils/divinitySave.js';
import {startMainBattle,actMainBattle,settleMainBattle} from '../web/src/utils/main20.js';
import {startDivinityTrial,actDivinityTrial,settleDivinityTrial} from '../web/src/utils/divinityTrials.js';
import {available} from '../web/src/utils/gameCore.js';
import {awaken,upgradePower,train} from '../web/src/utils/progression.js';
import {divinityAwakenReason} from '../web/src/utils/divinityProgress.js';
import {DIV_IDS,DIV_SKILLS} from '../web/src/data/divinity.js';
export function trialChoice(b){
 const t=b.trial,can=x=>!available(b,x);
 if(!t.awakened){if(t.id==='wing')return 'guard';if(t.id==='abyss'||t.id==='king')return t.returnReady?'slash':'guard';if(t.id==='fallen')return 'slash';if(t.id==='judge')return t.proof>=2?'guard':t.lastAttack==='slash'&&can('feather')?'feather':'slash';}
 if(['truth','infinite'].includes(t.id)){
  if(b.turn%3===1)return can('royalGuard')?'royalGuard':'guard';
  if(t.id==='infinite'&&!b.divine?.unified&&can('apotheosis'))return 'apotheosis';
  const options=['verdict','abyssTide','plume','fallenOath','royalReturn','convergence','judgment','feather','power','slash'];
  if(t.id==='truth'){
   const unseen=options.find(x=>DIV_SKILLS[x]?.power&&!t.seen.includes(DIV_SKILLS[x].power)&&can(x));if(unseen)return unseen;
   const missing=['abyss','judge','fallen','king','wing'].find(x=>!t.seen.includes(x)&&!b.powers.includes(x));if(t.seen.length<3&&missing&&can('attune_'+missing))return 'attune_'+missing;
  }
  if(b.hp/b.base.hp<.7&&can('purify'))return 'purify';
  return options.find(x=>can(x)&&(!t.seals||DIV_SKILLS[x]?.power!==t.previousPower))||'guard';
 }
 const sig={wing:'plume',abyss:'abyssTide',fallen:'fallenOath',judge:'verdict',king:'royalGuard'}[t.id];
 if(!t.used&&can(sig))return sig;
 if(b.hp/b.base.hp<.3&&b.turn%3===1)return 'guard';
 return ['plume','feather',sig,'power','ultimate','slash'].find(x=>can(x))||'guard';
}
export function simulateTrial(s,id){const b=startDivinityTrial(s,id);for(let n=0;n<100&&!b.result;n++)actDivinityTrial(b,trialChoice(b));if(b.result==='win')settleDivinityTrial(s,b);return b;}
export function runPath(order){
 const s=freshDivinity();s.started=true;
 let b=startMainBattle(s);for(let n=0;n<100&&!b.result;n++)actMainBattle(b,n%3===0?'guard':'slash',{rng:()=>.5});if(b.result!=='win')throw Error('floor1');settleMainBattle(s,b);
 const trials=[];b=simulateTrial(s,'wing');trials.push({id:'wing',result:b.result,turn:b.turn,hp:b.hp});if(b.result!=='win')return {s,trials};awaken(s);
 for(const id of order){s.equipped=['wing',...(s.powers[id]?[id]:[])];b=simulateTrial(s,id);trials.push({id,result:b.result,turn:b.turn,hp:b.hp});if(b.result!=='win')return {s,trials};}
 return {s,trials};
}
if(process.argv[1]?.endsWith('divinity-simulation.mjs')){
 const perms=a=>a.length?a.flatMap((x,i)=>perms(a.filter((_,j)=>i!==j)).map(p=>[x,...p])):[[]];
 const paths=perms(['abyss','fallen','judge','king']).map(order=>{const {trials}=runPath(order);return {order,trials};});
 console.log(JSON.stringify(paths,null,2));if(paths.some(x=>x.trials.length!==5||x.trials.some(y=>y.result!=='win')))process.exitCode=1;
}
