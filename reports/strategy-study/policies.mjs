import fs from 'node:fs';import assert from 'node:assert/strict';
import {available,playerStats} from '../../web/src/utils/gameCore.js';
import {clone} from '../../web/src/utils/progression.js';
export const studyConfig=JSON.parse(fs.readFileSync(new URL('./study-config.json',import.meta.url)));
export function visibleActions(b){return b.character==='stella'?['slash','immortal','rebirth','meteor','guard']:['slash',...(b.marks.includes('split')?['pierce','volley']:['feather']),'power','ultimate','guard'];}
export function pick(b,strategy){
 if(b.statuses.stun)return 'wait';
 const ready=ids=>ids.find(id=>!available(b,id));
 if(b.character==='stella')return ready([...(b.hp/b.base.hp<.5?['rebirth']:[]),'meteor','immortal','slash','guard']);
 if(strategy==='slash')return 'slash';
 const feathers=b.marks.includes('split')?['volley','pierce']:['feather'];
 if(strategy==='feather')return ready([...feathers,'slash','guard']);
 if(strategy==='guard'&&b.hp/b.base.hp<.8&&b.turn%3===0)return 'guard';
 if(strategy==='adaptive'){
  if(b.buffs.some(x=>x.id==='campaignFocus'))return ready(['power','slash','guard']);
  if(b.hp/b.base.hp<.45||b.statuses.pressure&&b.hp/b.base.hp<.8)return 'guard';
  if(!available(b,'ultimate'))return 'ultimate';
  if(b.enemy.statuses.campaignArmor&&!available(b,'power'))return 'power';
  return ready([...feathers,'power','slash','guard']);
 }
 return ready(['ultimate',...(b.enemy.statuses.campaignArmor||b.turn%3===0?['power']:[]),...feathers,'slash','guard']);
}
export function prepare(run,scenario,E,ledger){
 const b=run.build,f=run.floor,mode=E.campaignNext(run),at=mode==='normal'?f:mode;
 const record=(kind,id,cost=0)=>ledger.events.push({at,kind,id,cost});
 if(scenario.mark!=='none'&&!b.marks.includes(scenario.mark)){
  const prices={split:160,starfall:220,endure:200,moon:200},cost=prices[scenario.mark];
  if(b.p>=cost){E.campaignBuyMark(run,scenario.mark);ledger.markP+=cost;record('purchase',scenario.mark,cost);}
 }
 if(scenario.mark!=='none'&&b.marks.includes(scenario.mark)&&!b.markEquip.includes(scenario.mark)){E.campaignEquip(run,scenario.mark,'mark');record('equip-mark',scenario.mark);}
 const pair=studyConfig.profiles[scenario.profile];
 if(pair.every(id=>b.powers[id])&&JSON.stringify(b.equipped)!==JSON.stringify(pair)){
  for(const id of [...b.equipped])E.campaignEquip(run,id,'power');for(const id of pair)E.campaignEquip(run,id,'power');record('equip-pair',pair.join('+'));
 }
 for(const id of Object.keys(b.powers))while(b.powers[id]<(scenario.tier==='low'?2:5)&&b.fragments[id]>=b.powers[id]*8){const cost=b.powers[id]*8;E.campaignUpgrade(run,id);ledger.fragments[id]=(ledger.fragments[id]||0)+cost;record('upgrade-power',id,cost);}
 const maxLoops=scenario.tier==='high'?60:1;
 for(let pass=0;pass<maxLoops;pass++){
  let changed=false;
  for(const id of ['talent','feather','destruction','ultimate']){
   const lv=id==='talent'?b.talent:b.skills[id],cap=id==='talent'?20:10,cost=lv*(id==='talent'?30:35);
   const allowed=lv<cap&&(scenario.tier==='standard'?b.p>cost+100:b.p>=cost)&&(scenario.tier!=='low'||ledger.trainingP+cost<=ledger.earnedP*.2);
   if(allowed){E.campaignTrain(run,id);ledger.trainingP+=cost;record('train',id,cost);changed=true;}
  }
  if(!changed)break;
 }
 assert.ok(b.p>=0);assert.ok(b.equipped.length<=2&&new Set(b.equipped).size===b.equipped.length);assert.ok(b.equipped.every(id=>b.powers[id]));assert.ok(b.markEquip.length<=3&&new Set(b.markEquip).size===b.markEquip.length);assert.ok(b.markEquip.every(id=>b.marks.includes(id)));assert.equal(b.p,ledger.earnedP-ledger.trainingP-ledger.markP);
 return {mode,at,p:b.p,equipped:[...b.equipped],marks:[...b.markEquip],level:b.level,talent:b.talent,skills:{...b.skills},powers:{...b.powers},fragments:{...b.fragments}};
}
export function measureBattle(b,strategy,E,{focusCounterfactual=false}={}){
 E.measurementReset?.();
 const uses={},initial=playerStats(b),initialBase=b.hp;let steps=0,received=0,maxHit=0,guardHeal=0,focusHits=0,focusDamageDelta=0,maxLog=0;const tail=[];
 while(!b.result&&steps<studyConfig.roundLimit){
  const id=pick(b,strategy);assert.ok(id==='wait'||visibleActions(b).includes(id),'never use hidden feather');assert.equal(available(b,id),null,'selected action must be available');
  uses[id]=(uses[id]||0)+1;
  const focused=b.buffs.some(x=>x.id==='campaignFocus')&&['slash','power'].includes(id);
  const shadow=focusCounterfactual&&focused?clone(b):null;
  E.actCampaign(b,id);steps++;received+=b.enemyDamage;maxHit=Math.max(maxHit,b.enemyDamage);maxLog=Math.max(maxLog,b.log.length);
  if(id==='guard'&&!b.result&&b.character==='irena'){const row=b.log.findLast(x=>/^防御：重圧解除・HP/.test(x));if(row)guardHeal+=Number(row.match(/HP([\d,]+)/)?.[1].replaceAll(',','')||0);}
  if(focused&&b.lastDamage>0){focusHits++;if(shadow){shadow.buffs=shadow.buffs.filter(x=>!['campaignFocus','campaignFocusAttack'].includes(x.id));E.actCampaign(shadow,id);focusDamageDelta+=b.lastDamage-shadow.lastDamage;}}
  tail.push({action:id,dealt:b.lastDamage,received:b.enemyDamage,ratio:b.hp/b.base.hp,phase:b.enemy.phase});if(tail.length>6)tail.shift();
 }
 return {guardProbe:E.measurementSummary?.()||null,result:b.result||'timeout',win:b.result==='win',steps,uses,received,maxHit,guardHeal,focusHits,focusDamageDelta:focusCounterfactual?focusDamageDelta:null,initialHP:initial.current,finalHP:playerStats(b).current,initialBase,finalBase:b.hp,hpLossFraction:1-b.hp/b.base.hp,livesLeft:b.lives,phase:b.enemy.phase,phaseRounds:b.phaseTurns,enemyHP:b.enemy.hp,endingLog:!b.result||b.result==='lose'?b.log.slice(-8):undefined,maxLog,tail:!b.result||b.result==='lose'?tail:undefined};
}
export function runRoute(scenario,E,{snapshots=null,snapshotObserver=null,focusCounterfactual=false}={}){
 const run=E.createCampaign({seed:scenario.seed,variant:'tempo'}),ledger={earnedP:180,trainingP:0,markP:0,fragments:{},events:[]},fights=[];
 for(let i=0;i<22;i++){
  const state=prepare(run,scenario,E,ledger);
  if(snapshots&&['normal','ex'].includes(state.mode)&&([6,8,11,12,16,18,20].includes(run.floor)||state.mode==='ex'))snapshots.push({scenario:{...scenario},state:clone(run),mode:state.mode,at:state.at});
  if(snapshotObserver&&([6,8,11,12,16,18,20].includes(run.floor)||state.mode==='ex')&&['normal','ex'].includes(state.mode))snapshotObserver({scenario,run,mode:state.mode,at:state.at});
  const b=E.startCampaignBattle(run),m=measureBattle(b,scenario.strategy,E,{focusCounterfactual});
  const reward=m.result==='timeout'?null:E.settleCampaign(run,b);ledger.earnedP+=reward?.p||0;fights.push({mode:b.mode,floor:b.floor,...m,state});
  if(!m.win)break;
 }
 return {scenario,clears:run.cleared.length,reached20:fights.some(x=>x.mode==='normal'&&x.floor===20),reachedStella:fights.some(x=>x.mode==='stella'),reachedEX:fights.some(x=>x.mode==='ex'),stella:run.stella,ex:run.ex,fights,ledger,unusedP:run.build.p,unusedFragments:run.build.fragments,duplicateOwnedMarks:run.build.marks.length-new Set(run.build.marks).size};
}
export const median=a=>{const s=[...a].sort((x,y)=>x-y),i=Math.floor(s.length/2);return s.length%2?s[i]:(s[i-1]+s[i])/2;};
export function summarize(routes){
 const fights=routes.flatMap(r=>r.fights),normal=fights.filter(x=>x.mode==='normal'),complete=routes.filter(x=>x.clears===20),uses={};
 for(const f of normal)for(const [id,n]of Object.entries(f.uses))uses[id]=(uses[id]||0)+n;
 const totalActions=Object.values(uses).reduce((a,x)=>a+x,0),totals=complete.map(r=>r.fights.filter(x=>x.mode==='normal').reduce((a,x)=>a+x.steps,0));
 return {n:routes.length,normalWins:normal.filter(x=>x.win).length,normalAttempts:normal.length,wins:fights.filter(x=>x.win).length,battles:fights.length,defeats:fights.filter(x=>x.result==='lose').length,timeouts:fights.filter(x=>x.result==='timeout').length,reached20:routes.filter(x=>x.reached20).length,clear20:complete.length,reachedStella:routes.filter(x=>x.reachedStella).length,stella:routes.filter(x=>x.stella).length,reachedEX:routes.filter(x=>x.reachedEX).length,ex:routes.filter(x=>x.ex).length,normalMean:normal.reduce((a,x)=>a+x.steps,0)/normal.length,normalMedian:median(normal.map(x=>x.steps)),normalMax:Math.max(...normal.map(x=>x.steps)),completedNormalMeanTotal:totals.length?totals.reduce((a,x)=>a+x,0)/totals.length:null,completedNormalMedianTotal:totals.length?median(totals):null,allAttemptNormalMeanTotal:normal.reduce((a,x)=>a+x.steps,0)/routes.length,meanReceived:normal.reduce((a,x)=>a+x.received,0)/normal.length,maxReceived:Math.max(...normal.map(x=>x.received)),maxHit:Math.max(...normal.map(x=>x.maxHit)),meanHPLossFraction:normal.reduce((a,x)=>a+x.hpLossFraction,0)/normal.length,uses,rates:Object.fromEntries(Object.entries(uses).map(([id,n])=>[id,n/totalActions])),guardPrevention:normal.every(x=>x.guardProbe)?normal.reduce((a,x)=>a+x.guardProbe.prevented,0):null,guardOffered:normal.every(x=>x.guardProbe)?normal.reduce((a,x)=>a+x.guardProbe.offeredWithout,0):null,guardHeal:normal.reduce((a,x)=>a+x.guardHeal,0),focusHits:normal.reduce((a,x)=>a+x.focusHits,0),meanInvestment:routes.reduce((a,x)=>a+x.ledger.trainingP+x.ledger.markP,0)/routes.length,meanTrainingP:routes.reduce((a,x)=>a+x.ledger.trainingP,0)/routes.length,meanMarkP:routes.reduce((a,x)=>a+x.ledger.markP,0)/routes.length,meanUnusedP:routes.reduce((a,x)=>a+x.unusedP,0)/routes.length,duplicateOwnedMarks:routes.reduce((a,x)=>a+x.duplicateOwnedMarks,0),failures:routes.filter(x=>!x.ex).map(x=>({seed:x.scenario.seed,clears:x.clears,last:x.fights.at(-1).mode,floor:x.fights.at(-1).floor,result:x.fights.at(-1).result}))};
}
