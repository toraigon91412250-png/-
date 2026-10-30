import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {freshMain20,startMainBattle,actMainBattle,settleMainBattle} from '../../web/src/utils/main20.js';
import {clone,train,upgradePower,equip,buyMark} from '../../web/src/utils/progression.js';
import {available,playerStats} from '../../web/src/utils/gameCore.js';
import {MARKS} from '../../web/src/data/config.js';
export const PROFILES={wingAbyss:['wing','abyss'],wingKing:['wing','king'],wingFallen:['wing','fallen'],wingJudge:['wing','judge'],judgeAbyss:['judge','abyss'],abyssKing:['abyss','king']};
export const POLICIES=['slash','feather','featherUltimate','mixed','defensive','defensiveNoUltimate'];
export const CHECKPOINTS=[6,8,11,12,16,18,20];
export const ROUND_LIMIT=200;
export const sha=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
export function visibleActions(b){return b.statuses.stun?['wait']:['slash',...(b.marks.includes('split')?['volley','pierce']:['feather']),'power','ultimate','guard'];}
export function pick(b,policy){
 if(!POLICIES.includes(policy))throw Error('unknown policy');
 if(b.statuses.stun)return 'wait';
 const ready=ids=>ids.find(id=>!available(b,id)),feathers=b.marks.includes('split')?['volley','pierce']:['feather'];
 if(policy==='slash')return 'slash';
 if(policy==='feather')return ready([...feathers,'slash']);
 if(policy==='featherUltimate')return ready(['ultimate',...feathers,'slash']);
 const defensive=policy.startsWith('defensive'),focus=b.buffs.some(x=>x.id==='campaignFocus');
 if(defensive){
  if((b.hp/b.base.hp<=.5||b.statuses.pressure)&&!focus)return 'guard';
  if(focus)return ready(['power','slash']);
 }
 if(policy!=='defensiveNoUltimate'&&!available(b,'ultimate'))return 'ultimate';
 const regenerationSeen=b.log.some(x=>/^再生：/.test(x));
 if((b.enemy.statuses.campaignArmor||regenerationSeen&&!b.enemy.statuses.campaignSever)&&!available(b,'power'))return 'power';
 return ready([...feathers,'slash']);
}
export function legal(s){
 assert.ok(s.p>=0&&Number.isFinite(s.p));assert.ok(s.equipped.length<=2&&new Set(s.equipped).size===s.equipped.length&&s.equipped.every(x=>s.powers[x]||s.resonance[x]));
 assert.ok(s.markEquip.length<=3&&new Set(s.markEquip).size===s.markEquip.length&&s.markEquip.every(x=>s.marks.includes(x)));
 for(const lv of Object.values(s.powers))assert.ok(Number.isInteger(lv)&&lv>=1&&lv<=5);
 for(const lv of Object.values(s.skills))assert.ok(Number.isInteger(lv)&&lv>=1&&lv<=10);
 assert.ok(s.talent>=1&&s.talent<=20);for(const n of Object.values(s.fragments))assert.ok(n>=0);
}
export function prepare(s,profile,marks,ledger){
 if(marks==='split'&&!s.marks.includes('split')){const cost=MARKS.find(x=>x.id==='split').cost;if(s.p>=cost){buyMark(s,'split');ledger.markP+=cost;}}
 for(const id of [...s.markEquip])if((marks==='none'||id!=='split'))equip(s,id,'mark');
 if(marks==='split'&&s.marks.includes('split')&&!s.markEquip.includes('split'))equip(s,'split','mark');
 const pair=PROFILES[profile];if(pair.every(x=>s.powers[x])&&JSON.stringify(pair)!==JSON.stringify(s.equipped)){for(const id of [...s.equipped])equip(s,id,'power');for(const id of pair)equip(s,id,'power');}
 for(const id of Object.keys(s.powers))while(s.powers[id]<5&&s.fragments[id]>=s.powers[id]*8){ledger.fragmentP[id]=(ledger.fragmentP[id]||0)+s.powers[id]*8;upgradePower(s,id);}
 for(const id of ['talent','feather','destruction','ultimate']){const lv=id==='talent'?s.talent:s.skills[id],cost=lv*(id==='talent'?30:35);if(lv<(id==='talent'?20:10)&&s.p>cost+100){train(s,id);ledger.trainingP+=cost;}}
 legal(s);assert.equal(s.p,ledger.earnedP-ledger.trainingP-ledger.markP);
 return {level:s.level,talent:s.talent,skills:{...s.skills},powers:{...s.powers},equipped:[...s.equipped],marks:[...s.markEquip],p:s.p,trainingP:ledger.trainingP,markP:ledger.markP};
}
export function seedBattle(b,seed){if(seed!=null)b.campaign.random=(seed+b.floor*997)>>>0;return b;}
export function measure(b,policy,{first=null,onState=null}={}){
 const uses={},damageByAction={};let steps=0,received=0,guardHeal=0,focusUses=0,armorBreaks=0,severApplications=0,gaugeReached=0,minHP=1,forcedSlash=0,voluntarySlash=0;
 const startHP=b.hp,startEnemyHP=b.enemy.hp,startGauge=b.gauge;
 while(!b.result&&steps<ROUND_LIMIT){
  onState?.(b,policy);const id=steps===0&&first?first:pick(b,policy);
  assert.ok(visibleActions(b).includes(id),'UI-hidden action '+id);assert.equal(available(b,id),null,'unavailable action '+id);
  if(id==='slash'){const alternatives=visibleActions(b).filter(x=>!['slash','guard','wait'].includes(x)&&!available(b,x));if(alternatives.length)voluntarySlash++;else forcedSlash++;}
  if(id==='guard')assert.ok(!b.statuses.stun);
  const wasFocus=b.buffs.some(x=>x.id==='campaignFocus')&&['slash','power'].includes(id),wasArmor=!!b.enemy.statuses.campaignArmor,oldGauge=b.gauge,wasSever=b.enemy.statuses.campaignSever||0;
  uses[id]=(uses[id]||0)+1;actMainBattle(b,id);steps++;received+=b.enemyDamage;damageByAction[id]=(damageByAction[id]||0)+b.lastDamage;
  if(wasFocus&&b.lastDamage>0)focusUses++;if(wasArmor&&!b.enemy.statuses.campaignArmor)armorBreaks++;if(!wasSever&&b.enemy.statuses.campaignSever)severApplications++;
  if(oldGauge<100&&b.gauge===100)gaugeReached++;
  if(id==='guard'&&!b.result){const match=b.log.at(-1)?.match(/防御：重圧解除・HP([\d,]+)回復/);assert.ok(match,'guard recovery event');guardHeal+=Number(match[1].replaceAll(',',''));}
  minHP=Math.min(minHP,b.hp/b.base.hp);for(const v of [b.hp,b.enemy.hp,b.gauge,b.lastDamage,b.enemyDamage])assert.ok(Number.isFinite(v),'nonfinite combat value');
 }
 const ratio=playerStats(b).ratio;
 return {result:b.result||'timeout',steps,turnDisplay:b.turn,win:b.result==='win',uses,damageByAction,received,guardHeal,focusUses,armorBreaks,severApplications,gaugeReached,gaugeUnused:b.gauge,minHP,finalHPRatio:ratio,startHP,finalInternalHP:b.hp,startEnemyHP,remainingEnemyHP:b.enemy.hp,startGauge,livesLeft:b.lives,markLivesLeft:b.markLife,forcedSlash,voluntarySlash,tail:b.result==='win'?undefined:b.log.slice(-6)};
}
export function route({profile,marks,policy,mode='actual',seed=null,repeat=0},{snapshots=false,onState=null}={}){
 const s=freshMain20();s.started=true;const ledger={earnedP:180,trainingP:0,markP:0,fragmentP:{}},fights=[],states=[];
 for(let floor=1;floor<=20;floor++){
  const build=prepare(s,profile,marks,ledger);assert.equal(s.floor,floor);if(snapshots&&CHECKPOINTS.includes(floor))states.push({floor,state:clone(s)});
  const b=seedBattle(startMainBattle(s),seed),m=measure(b,policy,{onState});const reward=settleMainBattle(s,b);ledger.earnedP+=reward.p;assert.equal(s.p,ledger.earnedP-ledger.trainingP-ledger.markP);legal(s);
  fights.push({floor,...m,build,rewardP:reward.p});if(!m.win)break;
 }
 return {profile,marks,policy,mode,seed,repeat,clears:s.cleared.length,complete:s.cleared.length===20,steps:fights.reduce((n,x)=>n+x.steps,0),outcome:fights.at(-1).result,failedFloor:s.cleared.length<20?fights.at(-1).floor:null,trainingP:ledger.trainingP,markP:ledger.markP,earnedP:ledger.earnedP,unspentP:s.p,fights,states,finalState:s};
}
export function walkFiles(root){return fs.readdirSync(root,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walkFiles(path.join(root,x.name)):[path.join(root,x.name)]);}
export function protect(){const files=[...walkFiles('web'),...walkFiles('assets'),'tools/build.mjs','package.json','index.html'];return Object.fromEntries(files.map(f=>[f,sha(fs.readFileSync(f))]));}
export function summary(routes){
 const out=[];for(const mode of [...new Set(routes.map(x=>x.mode))])for(const profile of Object.keys(PROFILES))for(const marks of ['none','split'])for(const policy of POLICIES){
  const rows=routes.filter(x=>x.mode===mode&&x.profile===profile&&x.marks===marks&&x.policy===policy&&(mode!=='actual'||x.repeat===0));if(!rows.length)continue;
  const won=rows.filter(x=>x.complete),battles=rows.flatMap(x=>x.fights),avg=(xs,f)=>xs.length?xs.reduce((n,x)=>n+f(x),0)/xs.length:null;
  out.push({mode,profile,marks,policy,samples:rows.length,completions:won.length,meanClears:avg(rows,x=>x.clears),meanStepsAll:avg(rows,x=>x.steps),meanStepsComplete:avg(won,x=>x.steps),meanTrainingP:avg(rows,x=>x.trainingP),markP:rows[0].markP,meanFinalHPRatio:avg(battles,x=>x.finalHPRatio),losses:battles.filter(x=>x.result==='lose').length,timeouts:battles.filter(x=>x.result==='timeout').length,uses:battles.reduce((o,x)=>{for(const [k,v]of Object.entries(x.uses))o[k]=(o[k]||0)+v;return o;},{})});
 }return out;
}
export function csv(rows){if(!rows.length)return '';const keys=Object.keys(rows[0]);const cell=x=>JSON.stringify(x!=null&&typeof x==='object'?JSON.stringify(x):String(x??''));return keys.map(cell).join(',')+'\n'+rows.map(r=>keys.map(k=>cell(r[k])).join(',')).join('\n')+'\n';}
export async function runStudy(){
 const dir='reports/balance-audit6';fs.mkdirSync(dir,{recursive:true});const before=protect();fs.writeFileSync(dir+'/protected.json',JSON.stringify(before,null,2));
 const routes=[],statePool=new Map(),branchPool=[],branchCounts={},started=Date.now();let measured=0;
 const collect=(b,policy,scenario)=>{
  if(policy!=='defensive'||!PROFILES[scenario.profile].every(id=>b.powers.includes(id)))return;
  const keys=[...(b.enemy.statuses.campaignArmor?['armor']:[]),...(b.statuses.pressure?['pressure']:[]),...(b.hp/b.base.hp<=.5?['lowHP']:[]),...(b.gauge===100?['ultimateReady']:[])];
  for(const category of keys){const key=category+'|'+scenario.profile+'|'+scenario.marks;if(branchCounts[key])continue;branchCounts[key]=1;branchPool.push({category,profile:scenario.profile,marks:scenario.marks,policy,state:clone(b)});}
 };
 for(const profile of Object.keys(PROFILES))for(const marks of ['none','split'])for(const policy of POLICIES){
  const a=route({profile,marks,policy,repeat:0},{snapshots:true,onState:(b,p)=>collect(b,p,{profile,marks})}),b=route({profile,marks,policy,repeat:1});
  assert.equal(sha(a.fights),sha(b.fights),'actual repeat is deterministic');routes.push(a,b);measured+=a.fights.length+b.fights.length;
  const key=profile+'|'+marks,prev=statePool.get(key),rank={defensive:0,mixed:1,feather:2};if(rank[policy]!=null&&(!prev||rank[policy]<rank[prev.policy]))statePool.set(key,a);
 }
 fs.writeFileSync(dir+'/progress.json',JSON.stringify({stage:'actual complete',routes:routes.length,battles:measured}));console.log('actual routes',routes.length,'battles',measured);
 for(let i=0;i<16;i++){
  for(const profile of Object.keys(PROFILES))for(const marks of ['none','split'])for(const policy of POLICIES){const r=route({profile,marks,policy,mode:'sensitivity',seed:21001+i});routes.push(r);measured+=r.fights.length;}
  if(i%4===3)console.log('sensitivity seeds',i+1,'battles',measured);
 }
 const initialSummary=summary(routes),candidates=[];
 for(const profile of Object.keys(PROFILES))for(const marks of ['none','split']){
  const rows=initialSummary.filter(x=>x.mode==='sensitivity'&&x.profile===profile&&x.marks===marks),baseline=rows.find(x=>x.policy==='feather'),best=[...rows].filter(x=>x.policy!=='feather').sort((a,b)=>b.completions-a.completions||b.meanClears-a.meanClears||(a.meanStepsComplete??Infinity)-(b.meanStepsComplete??Infinity)||POLICIES.indexOf(a.policy)-POLICIES.indexOf(b.policy))[0];
  candidates.push({profile,marks,policies:['feather',best.policy],completionDelta:best.completions-baseline.completions,clearDelta:best.meanClears-baseline.meanClears,stepDelta:baseline.meanStepsComplete!=null&&best.meanStepsComplete!=null?baseline.meanStepsComplete-best.meanStepsComplete:0});
 }
 const comparison=(profile,marks,policy)=>{const rows=initialSummary.filter(x=>x.mode==='sensitivity'&&x.profile===profile&&x.marks===marks),base=rows.find(x=>x.policy==='feather'),other=rows.find(x=>x.policy===policy);return {profile,marks,policies:['feather',policy],completionDelta:other.completions-base.completions,stepDelta:base.meanStepsComplete!=null&&other.meanStepsComplete!=null?base.meanStepsComplete-other.meanStepsComplete:null};};
 const largest=(xs,score)=>xs.filter(x=>x.stepDelta!=null).sort((a,b)=>score(b)-score(a)||a.profile.localeCompare(b.profile))[0];
 const wingProfiles=Object.keys(PROFILES).filter(p=>PROFILES[p].includes('wing')),nonWingProfiles=Object.keys(PROFILES).filter(p=>!PROFILES[p].includes('wing'));
 const selected=[largest(wingProfiles.map(p=>comparison(p,'split','defensive')),x=>-x.stepDelta),largest(wingProfiles.map(p=>comparison(p,'none','mixed')),x=>x.stepDelta),largest(nonWingProfiles.map(p=>comparison(p,'none','defensive')),x=>x.stepDelta)];
 for(let i=0;i<32;i++)for(const row of selected)for(const policy of row.policies){const r=route({profile:row.profile,marks:row.marks,policy,mode:'holdout',seed:41001+i});routes.push(r);measured+=r.fights.length;}
 console.log('holdout complete',selected);
 const paired=[];
 for(const [key,run]of statePool)for(const snap of run.states)for(const policy of POLICIES){
  const m=measure(startMainBattle(clone(snap.state)),policy);paired.push({profile:run.profile,marks:run.marks,sourcePolicy:run.policy,floor:snap.floor,policy,...m});measured++;
 }
 const branches=[];
 const selectedBranches=[],configurationUses={};for(const category of ['armor','pressure','lowHP','ultimateReady']){const rows=branchPool.filter(x=>x.category===category);for(let i=0;i<3&&rows.length;i++){rows.sort((a,b)=>(configurationUses[a.profile+'|'+a.marks]||0)-(configurationUses[b.profile+'|'+b.marks]||0)||a.state.floor-b.state.floor||a.profile.localeCompare(b.profile));const row=rows.shift();configurationUses[row.profile+'|'+row.marks]=(configurationUses[row.profile+'|'+row.marks]||0)+1;selectedBranches.push(row);}}
 for(const row of selectedBranches){const actions=visibleActions(row.state).filter(x=>!available(row.state,x)),results=[];for(const first of actions){const m=measure(clone(row.state),row.policy,{first});results.push({first,...m});measured++;}branches.push({category:row.category,profile:row.profile,marks:row.marks,floor:row.state.floor,policy:row.policy,starting:row.state,results});}
 const replay=[],replayBuilds=[];
 for(const [key,run]of statePool){if(!run.complete)continue;const s=clone(run.finalState);prepare(s,run.profile,run.marks,{earnedP:run.earnedP,trainingP:run.trainingP,markP:run.markP,fragmentP:{}});replayBuilds.push({profile:run.profile,marks:run.marks,state:clone(s)});for(const floor of [5,10,15,20])for(const policy of POLICIES)for(let i=0;i<2;i++){const m=measure(startMainBattle(s,{floor}),policy);replay.push({profile:run.profile,marks:run.marks,floor,policy,repeat:i,...m});measured++;}}
 const summaryRows=summary(routes);assert.deepEqual(protect(),before,'runtime/asset/config files were not modified');
 const flattened=routes.flatMap(({fights,states,finalState,...meta})=>fights.map(x=>({...meta,...x})));fs.writeFileSync(dir+'/battles.jsonl',flattened.map(x=>JSON.stringify(x)).join('\n')+'\n');
 const routeRows=routes.map(({fights,states,finalState,...x})=>x);fs.writeFileSync(dir+'/routes.csv',csv(routeRows));fs.writeFileSync(dir+'/summary.csv',csv(summaryRows));fs.writeFileSync(dir+'/summary.json',JSON.stringify(summaryRows,null,2));
 fs.writeFileSync(dir+'/paired.csv',csv(paired));fs.writeFileSync(dir+'/paired.json',JSON.stringify(paired,null,2));fs.writeFileSync(dir+'/branches.json',JSON.stringify(branches,null,2));fs.writeFileSync(dir+'/replay.json',JSON.stringify(replay,null,2));
 fs.writeFileSync(dir+'/replay-builds.json',JSON.stringify(replayBuilds,null,2));
 fs.writeFileSync(dir+'/snapshots.json',JSON.stringify([...statePool.values()].map(r=>({profile:r.profile,marks:r.marks,policy:r.policy,states:r.states})),null,2));
 const result={runtimeUnchanged:true,actualRepeatsIdentical:true,routeCount:routes.length,battles:measured,primaryBattles:flattened.length,pairedBattles:paired.length,branchBattles:branches.reduce((n,x)=>n+x.results.length,0),replayBattles:replay.length,selectedHoldout:selected,roundLimit:ROUND_LIMIT,elapsedSeconds:(Date.now()-started)/1000,engine:'main20 audit5, no runtime edits',summary:summaryRows};fs.writeFileSync(dir+'/results.json',JSON.stringify(result,null,2));fs.writeFileSync(dir+'/progress.json',JSON.stringify({stage:'complete',routes:routes.length,battles:measured}));console.log(JSON.stringify({...result,summary:undefined}));return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))await runStudy();
