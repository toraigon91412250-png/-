import {hasDivinity,divinityMilestones} from './divinityProgress.js';
import {fresh,clone,achievements} from './progression.js';
import {startBattle,act,settle} from './gameCore.js';
import {createCampaign,startCampaignBattle,actCampaign,CAMPAIGN_RULES} from './campaign20.js';
import {validateSave,SAVE_KEY} from './storage.js';
export const MAIN20_B_RULES={shellFloors:[5,9,14,17,20],shellDefense:4,shellFeather:.35,exposed:1.6,duration:3};
export const MAIN20_DIFFICULTY_SCALE={EXPERT:{hp:1.3,atk:1.2,spd:1.1},NIGHTMARE:{hp:10,atk:4.6,spd:4.5}};
export const main20NightmareUnlocked=s=>s?.route20===1&&Array.isArray(s.cleared)&&Array.from({length:20},(_,i)=>s.cleared.includes(i+1)).every(Boolean);
export const main20Limit=s=>s.route20===1?20:100;
export const main20Milestones=s=>hasDivinity(s)?divinityMilestones(s):s.route20===1?[[5,'権能「堕天」'],[10,'権能「堕天王」・共鳴・深淵レイド'],[15,'権能「断罪」'],[20,'境界への扉']]:[[5,'権能「堕天」'],[10,'権能「堕天王」'],[20,'権能「断罪」'],[50,'共鳴・深淵レイド'],[100,'境界への扉']];
export function freshMain20(){return {...fresh(),version:5,route20:1,legacyCleared:[]};}
export function migrateMain20(input){
 const output=clone(input),s=Object.hasOwn(output,'state')?output.state:output;
 if(!s||typeof s!=='object'||Array.isArray(s))return output;
 if(output.version>5||s.version>5)return output;
 if(s.route20!=null){if(s.route20!==1)throw Error('未対応の攻略ルートです');return output;}
 if(!('floor'in s)&&!('level'in s))return output;
 const old=Array.isArray(s.cleared)?s.cleared.filter(x=>Number.isInteger(x)&&x>=1&&x<=100):[];
 const flags=s.flags||{},complete=old.includes(100)||s.kaiserDefeated===100||['lv100','warp','stella','ex','stellaClear','final','finalClear'].some(k=>flags[k]===true);
 s.legacyCleared=[...new Set(old)];s.route20=1;s.version=5;
 s.floor=complete?20:Math.min(20,Math.max(1,Math.floor(((Number.isFinite(s.floor)?s.floor:1)-1)/5)+1));
 s.cleared=Array.from({length:20},(_,i)=>i+1).filter(f=>complete||Array.from({length:5},(_,i)=>(f-1)*5+i+1).every(x=>old.includes(x)));
 if(complete){
  s.flags={...flags,lv100:true,reward100:true};
  if(['warp','stella','ex','stellaClear','final','finalClear'].some(k=>flags[k]===true)){s.flags.warp=true;s.flags.stella=true;}
  if(flags.ex===true)s.flags.exReward=true;
  if(['stellaClear','final','finalClear'].some(k=>flags[k]===true)){s.flags.stellaClear=true;s.flags.final=true;}
 }
 // A legacy battle belongs to the old enemy/rules. Preserve its raw backup, resume at the new lobby.
 delete s.markBattle;delete s.kaiserDefeated;
 return output;
}
export const validateMain20=input=>validateSave(migrateMain20(input));
export function loadMain20(storage=globalThis.localStorage){
 for(const key of [SAVE_KEY,'irena-reborn-v2','irena-reborn-v1']){const raw=storage.getItem(key);if(!raw)continue;
  try{const input=JSON.parse(raw),state=validateMain20(input),old=Object.hasOwn(input,'state')?input.state:input;
   if(old.route20!==1&&!storage.getItem('irena-reborn-before-main20'))storage.setItem('irena-reborn-before-main20',raw);
   return {state,key,error:null};
  }catch(e){return {state:null,key,error:e.message};}
 }return {state:freshMain20(),key:null,error:null};
}
export function startMainBattle(s,options={}){
 const mode=options.mode||'normal',floor=options.floor??s.floor;
 if(s.route20!==1||mode!=='normal')return startBattle(s,options);
 if(!Number.isInteger(floor)||floor<1||floor>Math.min(20,s.floor))throw Error('解放条件を満たしていません');
 const run=createCampaign();run.build=s;run.floor=floor;
 const b=startCampaignBattle(run);if(hasDivinity(s)&&floor>1){b.enemy.base.hp*=floor<=5?4:2.5;b.enemy.base.atk*=1.55;b.enemy.hp=b.enemy.base.hp;}b.test=!!options.test;b.main20=true;b.difficulty=options.difficulty||'NORMAL';
 if(!['NORMAL',...Object.keys(MAIN20_DIFFICULTY_SCALE)].includes(b.difficulty))throw Error('戦闘設定が不正です');
 if(b.difficulty==='NIGHTMARE'&&!main20NightmareUnlocked(s))throw Error('全20階層クリア後に解放されます');
 const scale=MAIN20_DIFFICULTY_SCALE[b.difficulty];if(scale){b.enemy.base.hp*=scale.hp;b.enemy.base.atk*=scale.atk;b.enemy.base.spd*=scale.spd;b.enemy.hp=b.enemy.base.hp;}
 const rules=options.rules??'B1';if(!['B1','classic'].includes(rules))throw Error('未対応の戦闘ルールです');b.main20Rules=rules;
 if(rules==='B1'){b.tacticalB={...MAIN20_B_RULES};if(MAIN20_B_RULES.shellFloors.includes(floor)){b.enemy.buffs.push({id:'campaignArmor',mul:{def:MAIN20_B_RULES.shellDefense},remaining:9999});b.enemy.statuses.campaignArmor=9999;}}
 b.log=['再誕の物語 — 第'+floor+'階層'];return b;
}
export const actMainBattle=(b,action,options={})=>b.main20?actCampaign(b,action,options):act(b,action,options);
export function settleMainBattle(s,b){
 if(!b.main20||b.test)return settle(s,b);
 if(!b.result||b.settled)return null;
 if(s.route20!==1||b.mode!=='normal'||b.floor<1||b.floor>20||b.floor>s.floor)throw Error('攻略の進行と戦闘が一致しません');
 const before={p:s.p,sp:s.sp,level:s.level,shards:s.resShards,achieved:[...s.achieved]},first=!s.cleared.includes(b.floor),fragments=8+Math.floor(b.floor/5)*2;
 // Reuse core records/achievements, without its legacy 100-floor progression or unlocks.
 b.mode='main20';let r;try{r=settle(s,b);}finally{b.mode='normal';}
 if(b.result!=='win')return r;
 s.p+=CAMPAIGN_RULES.rewardBase+b.floor*CAMPAIGN_RULES.rewardStep-(35+b.floor*5);
 for(const id of Object.keys(s.fragments))s.fragments[id]+=fragments-(4+Math.floor(b.floor/10));
 const unlocks=[];
 if(first){s.cleared.push(b.floor);s.floor=Math.min(20,Math.max(s.floor,b.floor+1));s.level=Math.max(s.level,1+b.floor*3);
  for(const [at,id,oldAt]of [[5,'fallen',5],[10,'king',10],[15,'judge',20]])if(!hasDivinity(s)&&b.floor===at&&!s.legacyCleared?.includes(oldAt)){if(!s.powers[id]){s.powers[id]=1;unlocks.push(id);}else s.fragments[id]+=8;if(!s.powerHistory.includes(id))s.powerHistory.push(id);}
  for(const [at,id]of [[8,'split'],[12,'starfall'],[16,'endure']])if(b.floor===at&&!s.marks.includes(id)){s.marks.push(id);unlocks.push(id);}
  if(b.floor===10)unlocks.push('resonance','raid');
  if(b.floor===20){if(!s.flags.lv100)unlocks.push('mystery');s.flags.lv100=true;if(!s.flags.reward100){s.sp+=50;s.flags.reward100=true;}}
 }
 achievements(s);
 return {...r,p:s.p-before.p,sp:s.sp-before.sp,levels:s.level-before.level,resShards:s.resShards-before.shards,fragments,bonusP:0,unlocks,achievements:s.achieved.filter(id=>!before.achieved.includes(id))};
}
