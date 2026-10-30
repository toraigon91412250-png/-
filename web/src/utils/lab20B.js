import {freshMain20,startMainBattle,settleMainBattle,MAIN20_B_RULES} from './main20.js';
import {clone,train,equip,buyMark,upgradePower} from './progression.js';
import {actCampaign} from './campaign20.js';
export const LAB20_RULES=MAIN20_B_RULES;
let lab20Sequence=0;
export function createLab20(variant='B'){
 if(!['B','current'].includes(variant))throw Error('不明な比較設定です');
 const build=freshMain20();build.started=true;
 return {id:'lab20-'+(++lab20Sequence),variant,build,history:[]};
}
export function startLab20(run){
 if(run.build.cleared.length===20)throw Error('20階層を突破しました。最初から比較できます');
 const b=startMainBattle(run.build,{rules:'classic'});delete b.main20;b.test=true;
 b.lab20={runId:run.id,variant:run.variant,rules:{...LAB20_RULES}};
 if(run.variant==='B'&&LAB20_RULES.shellFloors.includes(b.floor)){
  b.enemy.buffs.push({id:'campaignArmor',mul:{def:LAB20_RULES.shellDefense},remaining:9999});b.enemy.statuses.campaignArmor=9999;
 }
 b.log=[run.variant==='B'?'20階層・戦術改修B【比較用・本編採用済み】':'採用前20階層【比較用・本編非反映】'];return b;
}
export function actLab20(b,action,options={}){
 if(!b.test||!b.lab20||b.main20)throw Error('独立した20階層比較専用です');return actCampaign(b,action,options);
}
export function settleLab20(run,b){
 if(!b.test||!b.lab20||b.lab20.runId!==run.id||b.lab20.variant!==run.variant)throw Error('比較データと戦闘が一致しません');
 if(!b.result||b.settled)return null;
 if(b.floor!==run.build.floor)throw Error('比較の攻略階層が一致しません');
 // Apply exact main20 progression only to a private clone. Main save is never passed here.
 const next=clone(run.build),copy=clone(b);copy.test=false;copy.main20=true;
 const reward=settleMainBattle(next,copy);run.build=next;b.settled=true;b.campaign.settled=true;
 run.history.push({floor:b.floor,result:b.result,turns:b.turn,p:reward.p});return {...reward,test:true,localOnly:true};
}
export function editLab20(run,kind,id){
 if(kind==='train')train(run.build,id);else if(kind==='power')equip(run.build,id,'power');else if(kind==='mark')equip(run.build,id,'mark');else if(kind==='buy')buyMark(run.build,id);else if(kind==='upgrade')upgradePower(run.build,id);else throw Error('不明な試作操作です');
}
