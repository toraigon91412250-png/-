import {observeCombat} from '../../web/src/utils/combatObservation.js';
import fs from 'node:fs';import assert from 'node:assert/strict';
import * as main from '../../web/src/utils/main20.js';import * as core from '../../web/src/utils/gameCore.js';import * as progress from '../../web/src/utils/progression.js';import * as config from '../../web/src/data/config.js';
const e={...main,...core,...progress,...config};
export const profiles={wingAbyss:['wing','abyss'],wingKing:['wing','king'],wingFallen:['wing','fallen'],wingJudge:['wing','judge'],judgeAbyss:['judge','abyss'],abyssKing:['abyss','king']};
export const policies=['feather','featherUltimate','mixed','defensive','reactive'];
export const actions=b=>b.statuses.stun?['wait']:['slash',...(b.marks.includes('split')?['volley','pierce']:['feather']),'power','ultimate','guard'];
export function pick(e,b,policy){const ready=xs=>xs.find(x=>!e.available(b,x));if(b.statuses.stun)return 'wait';const f=b.marks.includes('split')?['volley','pierce']:['feather'];if(policy==='feather')return ready([...f,'slash']);if(policy==='featherUltimate')return ready(['ultimate',...f,'slash']);
 const focus=b.buffs.some(x=>x.id==='campaignFocus');
 if(policy==='defensive'){if((b.hp/b.base.hp<=.5||b.statuses.pressure)&&!focus)return 'guard';if(focus)return ready(['power','slash']);}
 if(policy==='reactive'){
  // Only already-occurring visible states; no hidden RNG or future enemy-action information.
  if(b.enemy.statuses.campaignArmor&&!e.available(b,'power'))return 'power';
  if(focus)return ready(['power','slash']);
  if((b.hp/b.base.hp<=.35||b.statuses.pressure)&&!focus)return 'guard';
 }
 if(!e.available(b,'ultimate'))return 'ultimate';
 const regen=b.log.some(x=>/^再生：/.test(x));if((b.enemy.statuses.campaignArmor||regen&&!b.enemy.statuses.campaignSever)&&!e.available(b,'power'))return 'power';return ready([...f,'slash']);
}
export function legal(s){assert.ok(s.p>=0);assert.ok(s.equipped.length<=2&&s.equipped.every(x=>s.powers[x]||s.resonance[x]));assert.equal(new Set(s.equipped).size,s.equipped.length);assert.ok(s.markEquip.length<=3&&s.markEquip.every(x=>s.marks.includes(x)));assert.equal(new Set(s.markEquip).size,s.markEquip.length);}
export function grow(e,s,profile,marks,ledger,{investment='balanced'}={}){
 const target=marks==='none'?[]:marks==='triple'?['split','iron','starfall']:['split'];
 for(const id of target){if(!s.marks.includes(id)){const cost=e.MARKS.find(x=>x.id===id).cost;if(s.p>=cost){e.buyMark(s,id);ledger.markP+=cost;}}}
 for(const id of [...s.markEquip])if(!target.includes(id))e.equip(s,id,'mark');for(const id of target)if(s.marks.includes(id)&&!s.markEquip.includes(id))e.equip(s,id,'mark');
 const pair=profiles[profile];if(pair.every(x=>s.powers[x])&&JSON.stringify(s.equipped)!==JSON.stringify(pair)){for(const id of [...s.equipped])e.equip(s,id,'power');for(const id of pair)e.equip(s,id,'power');}
 if(investment!=='none')for(const id of Object.keys(s.powers))while(s.powers[id]<5&&s.fragments[id]>=s.powers[id]*8){ledger.fragments+=s.powers[id]*8;e.upgradePower(s,id);}
 const types=investment==='none'?[]:investment==='noFeather'?['talent','destruction','ultimate']:['talent','feather','destruction','ultimate'];
 for(const id of types){const lv=id==='talent'?s.talent:s.skills[id],cost=lv*(id==='talent'?30:35);if(lv<(id==='talent'?20:10)&&s.p>cost+100){e.train(s,id);ledger.trainingP+=cost;}}
 legal(s);assert.equal(s.p,ledger.earnedP-ledger.markP-ledger.trainingP);
}
export function fight(e,b,policy,{trace=false,first=null}={}){let steps=0,received=0,dealt=0,effective=0,erosion=0,regen=0,guards=0,breaks=0,combo=0,judges=0,focus=0;const uses={},history=[],initialHP=b.enemy.hp;
 while(!b.result&&steps<200){const id=steps===0&&first?first:pick(e,b,policy);assert.ok(actions(b).includes(id));assert.equal(e.available(b,id),null);const prev={enemyHP:b.enemy.hp,hp:b.hp,turn:b.turn,armor:!!b.enemy.statuses.campaignArmor,pressure:!!b.statuses.pressure,focus:b.buffs.some(x=>x.id==='campaignFocus'),gauge:b.gauge,cd:{...b.cd},stacks:{...b.stacks},erosion:b.erosion};
  const oldLog=[...b.log];let actual=0,lastEnemyHP=b.enemy.hp;observeCombat(b,event=>{if(event.kind==='hit')actual+=Math.max(0,lastEnemyHP-event.frame.enemy.hp);lastEnemyHP=event.frame.enemy.hp;},()=>e.actMainBattle(b,id));let overlap=Math.min(oldLog.length,b.log.length);while(overlap>0&&JSON.stringify(oldLog.slice(-overlap))!==JSON.stringify(b.log.slice(0,overlap)))overlap--;const newlogs=b.log.slice(overlap);steps++;uses[id]=(uses[id]||0)+1;received+=b.enemyDamage;dealt+=b.lastDamage;
  effective+=actual;
  const r=newlogs.reduce((n,x)=>n+(x.match(/^再生：敵HPが(\d+)回復/)?.[1]*1||0),0);regen+=r;erosion+=Math.max(0,prev.enemyHP-b.enemy.hp-actual+r);
  combo+=newlogs.filter(x=>x.includes('交互連携')).length;judges+=newlogs.filter(x=>x.startsWith('断罪発動')).length;if(id==='guard')guards++;if(prev.armor&&!b.enemy.statuses.campaignArmor)breaks++;if(prev.focus&&['power','slash'].includes(id)&&b.lastDamage>0)focus++;
  if(trace)history.push({input:steps,turn:prev.turn,action:id,enemyBefore:prev.enemyHP,enemyAfter:b.enemy.hp,hpBefore:prev.hp,hpAfter:b.hp,rawDamage:b.lastDamage,effectiveDamage:actual,received:b.enemyDamage,armorBefore:prev.armor,armorAfter:!!b.enemy.statuses.campaignArmor,pressureBefore:prev.pressure,pressureAfter:!!b.statuses.pressure,gaugeBefore:prev.gauge,gaugeAfter:b.gauge,cdBefore:prev.cd,cdAfter:{...b.cd},stacksBefore:prev.stacks,stacksAfter:{...b.stacks},logs:newlogs});
  for(const n of [b.hp,b.enemy.hp,b.lastDamage,b.enemyDamage])assert.ok(Number.isFinite(n));
 }
 return {result:b.result||'timeout',win:b.result==='win',steps,rounds:steps,turnDisplay:b.turn,uses,received,rawDamage:dealt,effectiveDamage:effective,nonAttackHPReduction:erosion,enemyRegen:regen,initialEnemyHP:initialHP,endingEnemyHP:b.enemy.hp,finalHP:b.hp/b.base.hp,breaks,combo,judges,focus,over50:steps>50,history};
}

const rows=[],floors=[];
for(const profile of ['wingAbyss','wingKing','wingJudge','abyssKing'])for(const marks of ['none','split'])for(const policy of ['feather','mixed','reactive'])for(const seed of [701,702,703]){
 const s=e.freshMain20();s.started=true;const ledger={earnedP:180,trainingP:0,markP:0,fragments:0};let inputs=0,dealt=0,received=0,timeouts=0,maxInputs=0;const uses={};
 for(let floor=1;floor<=20;floor++){grow(e,s,profile,marks,ledger);const b=e.startMainBattle(s);b.campaign.random=(seed+floor*997)>>>0;const r=fight(e,b,policy);const reward=e.settleMainBattle(s,b);ledger.earnedP+=reward.p;legal(s);assert.equal(s.p,ledger.earnedP-ledger.trainingP-ledger.markP);inputs+=r.steps;dealt+=r.effectiveDamage;received+=r.received;timeouts+=r.result==='timeout';maxInputs=Math.max(maxInputs,r.steps);for(const [a,n]of Object.entries(r.uses))uses[a]=(uses[a]||0)+n;floors.push({profile,marks,policy,seed,floor,result:r.result,inputs:r.steps,damage:r.effectiveDamage,received:r.received,uses:r.uses,powers:b.powers,markEquip:b.marks});if(!r.win)break;}
 rows.push({profile,marks,policy,seed,cleared:s.cleared.length,win:s.cleared.length===20,inputs,dealt,received,timeouts,maxInputs,uses,...ledger});}
const csv=rs=>{const k=Object.keys(rs[0]);const q=v=>'"'+String(typeof v==='object'?JSON.stringify(v):v).replaceAll('"','""')+'"';return k.map(q).join(',')+'\n'+rs.map(r=>k.map(x=>q(r[x])).join(',')).join('\n')+'\n';};
const summary=[];for(const profile of ['wingAbyss','wingKing','wingJudge','abyssKing'])for(const marks of ['none','split'])for(const policy of ['feather','mixed','reactive']){const rs=rows.filter(r=>r.profile===profile&&r.marks===marks&&r.policy===policy);const avg=k=>rs.reduce((n,r)=>n+r[k],0)/rs.length;summary.push({profile,marks,policy,routes:rs.length,wins:rs.filter(r=>r.win).length,meanInputs:avg('inputs'),meanDamage:avg('dealt'),meanReceived:avg('received'),meanTrainingP:avg('trainingP'),timeouts:rs.reduce((n,r)=>n+r.timeouts,0),uses:Object.fromEntries(['slash','feather','pierce','volley','power','ultimate','guard'].map(a=>[a,rs.reduce((n,r)=>n+(r.uses[a]||0),0)/rs.length]))});}
fs.writeFileSync('reports/sanctuary-audit17/balance-routes.csv',csv(rows));fs.writeFileSync('reports/sanctuary-audit17/balance-floors.csv',csv(floors));fs.writeFileSync('reports/sanctuary-audit17/balance-summary.json',JSON.stringify(summary,null,2));console.log(JSON.stringify({routes:rows.length,clears:rows.filter(r=>r.win).length,timeouts:rows.reduce((n,r)=>n+r.timeouts,0),fights:floors.length}));
