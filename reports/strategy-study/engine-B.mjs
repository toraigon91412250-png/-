import {fresh,clone,train,upgradePower,equip,buyMark} from '../../web/src/utils/progression.js';
import {startBattle,act,available,enemyTurn,buff,heal,log} from '../../web/src/utils/gameCore.js';

// PROTOTYPE ONLY: independent, in-memory route. Never serialized into a main save.
export const CAMPAIGN_VARIANTS={swift:{hp:.72,attack:.85},tactical:{hp:1,attack:1},endurance:{hp:1.45,attack:1.15},tempo:{hp:1,attack:1}};
export const CAMPAIGN_FLOORS=[
 [1,'境界の入口','plain',520,38,10,18],[2,'翼の記憶','plain',1000,54,16,22],
 [3,'神殿の回廊','plain',1450,70,22,26],[4,'崩れた玉座','plain',2000,86,30,30],
 [5,'最初の守護者','armor',3400,110,42,35],[6,'黒晶の門','armor',4600,140,55,40],
 [7,'深淵の風','pressure',5800,175,65,48],[8,'回帰する影','renewal',7000,210,75,55],
 [9,'折れた王冠','armor',8500,245,90,62],[10,'王権の残響','pressure',11000,290,110,70],
 [11,'黒晶の聖堂','armor',14500,340,135,80],[12,'再生の庭','renewal',17000,390,155,90],
 [13,'無音の崩落','pressure',19500,445,180,100],[14,'王の防壁','armor',22500,500,205,110],
 [15,'断罪の記憶','renewal',26500,560,235,120],[16,'深淵の狭間','pressure',30000,620,260,135],
 [17,'砕ける神域','armor',34000,685,290,150],[18,'再誕の残火','renewal',38000,750,320,165],
 [19,'最後の回廊','pressure',42500,820,350,180],[20,'カイザー・境界の王','armor',50000,900,390,200]
].map(([floor,name,kind,hp,atk,def,spd])=>({floor,name,kind,hp,atk,def,spd}));
export const CAMPAIGN_RULES={armor:4,guardHeal:.12,focus:3,renewal:.025,startingP:180,rewardBase:90,rewardStep:12};
export function createCampaign({variant='tempo',seed=20261021}={}){
 if(!CAMPAIGN_VARIANTS[variant])throw Error('不明な試作設定です');
 const build=fresh();build.started=true;build.p=CAMPAIGN_RULES.startingP;
 return {kind:'campaign20',variant,seed:seed>>>0,build,floor:1,cleared:[],stella:false,ex:false,history:[],attempt:0};
}
export function campaignNext(run){return run.cleared.length<20?'normal':!run.stella?'stella':!run.ex?'ex':'complete';}
export function campaignRng(b){b.campaign.random=(Math.imul(b.campaign.random,1664525)+1013904223)>>>0;return b.campaign.random/4294967296;}
export function startCampaignBattle(run,{replay=false}={}){
 const next=campaignNext(run);if(next==='complete')throw Error('試作ルートは完了しています');
 const mode=replay?'normal':next,floor=mode==='normal'?run.floor:20;
 const b=startBattle(run.build,{mode,floor,test:true});const variant=run.variant==='tempo'?CAMPAIGN_VARIANTS[floor<=5?'swift':floor<=10?'tactical':'endurance']:CAMPAIGN_VARIANTS[run.variant];
 if(mode==='normal'){const row=CAMPAIGN_FLOORS[floor-1];b.enemy.name=row.name;b.enemy.base={hp:row.hp*variant.hp,atk:row.atk*variant.attack,def:row.def,spd:row.spd};}
 if(mode==='ex'){b.enemy.base.hp*=.5;b.enemy.base.atk*=.4;b.enemy.name='EXカイザー・短縮ルート【試作】';}
 b.enemy.hp=b.enemy.base.hp;
 b.campaign={kind:'campaign20',floor,mode,variant:run.variant,random:(run.seed+floor*997+(mode==='stella'?30000:mode==='ex'?60000:0))>>>0,applied:false,settled:false};
 run.attempt++;
 log(b,'20階層キャンペーン【試作・本編非反映】');return b;
}
function removeCampaignArmor(b){const had=b.enemy.buffs.some(x=>x.id==='campaignArmor');b.enemy.buffs=b.enemy.buffs.filter(x=>x.id!=='campaignArmor');delete b.enemy.statuses.campaignArmor;if(had)log(b,'黒晶殻を破壊した：敵防御が元に戻った');}
function campaignLanded(b){
 if(b.campaign.applied||b.lastDamage<=0)return;b.campaign.applied=true;
 if(['power','ultimate'].includes(b.lastAction)){removeCampaignArmor(b);b.enemy.statuses.campaignSever=3;log(b,'権能の傷痕：敵の再生を一時的に封じた');}
}
function campaignEnemy(b,guard,rng){
 campaignLanded(b);const couldAttack=b.hp>0&&b.enemy.hp>0&&!b.enemyStop&&!b.enemy.statuses.stun;enemyTurn(b,guard,rng);
 if(b.campaign.mode!=='normal'||b.result||b.hp<=0||b.enemy.hp<=0||(!couldAttack||b.log.at(-1)?.startsWith('速度優位：')||!b.log.slice(-3).some(x=>/^敵の(重撃|反撃)/.test(x))))return;
 const kind=CAMPAIGN_FLOORS[b.floor-1].kind;
 if(kind==='armor'&&!b.enemy.statuses.campaignSever){b.enemy.buffs=b.enemy.buffs.filter(x=>x.id!=='campaignArmor');b.enemy.buffs.push({id:'campaignArmor',mul:{def:CAMPAIGN_RULES.armor},remaining:9999});b.enemy.statuses.campaignArmor=9999;log(b,'黒晶殻が形成された：敵の防御力が上昇');}
 if(kind==='pressure'){b.statuses.pressure=3;log(b,'圧壊の残響：重圧を受けた');}
 if(kind==='renewal'&&!b.enemy.statuses.campaignSever){const before=b.enemy.hp;b.enemy.hp=Math.min(b.enemy.base.hp*(1-b.erosion),b.enemy.hp+b.enemy.base.hp*CAMPAIGN_RULES.renewal);log(b,`再生：敵HPが${Math.max(0,Math.floor(b.enemy.hp-before))}回復`);}
}
export function actCampaign(b,action,options={}){
 if(!b.test||b.campaign?.kind!=='campaign20')throw Error('20階層試作専用です');
 const reason=available(b,action,options.route);if(reason)throw Error(reason);
 b.campaign.applied=false;
 const focus=b.buffs.some(x=>x.id==='campaignFocus')&&['slash','power'].includes(action);
 if(focus)buff(b,'campaignFocusAttack',1,{atk:CAMPAIGN_RULES.focus});
 act(b,action,{...options,rng:options.rng||(()=>campaignRng(b)),enemyAction:campaignEnemy});campaignLanded(b);
 if(focus&&b.lastDamage>0){b.buffs=b.buffs.filter(x=>x.id!=='campaignFocus');log(b,'蓄勢を解放した');}
 if(action==='guard'&&!b.result&&b.character==='irena'){const before=b.hp;heal(b,CAMPAIGN_RULES.guardHeal);delete b.statuses.pressure;buff(b,'campaignFocus',3,{});log(b,`防御：重圧解除・HP${Math.round(b.hp-before)}回復・斬撃／権能の蓄勢`);}
 return b;
}
export function settleCampaign(run,b){
 if(!b.test||b.campaign?.kind!=='campaign20')throw Error('20階層試作専用です');
 if(!b.result||b.campaign.settled)return null;
 // Reject stale/out-of-order battles before granting anything.
 const expected=campaignNext(run);
 if(b.campaign.variant!==run.variant||b.campaign.mode!==expected||(expected==='normal'&&b.floor!==run.floor))throw Error('試作の進行と戦闘が一致しません');
 b.campaign.settled=true;b.settled=true;
 let p=0,unlocked=[];if(b.result==='win'){
  if(b.mode==='normal'){
   p=CAMPAIGN_RULES.rewardBase+b.floor*CAMPAIGN_RULES.rewardStep;run.cleared.push(b.floor);run.floor=Math.min(20,b.floor+1);run.build.floor=run.floor;run.build.level=Math.max(run.build.level,1+b.floor*3);
   for(const id of Object.keys(run.build.fragments))run.build.fragments[id]+=8+Math.floor(b.floor/5)*2;
   for(const [at,id]of [[5,'fallen'],[10,'king'],[15,'judge']])if(b.floor===at){run.build.powers[id]=1;unlocked.push(id);}
   if(b.floor===8){if(!run.build.marks.includes('split')){run.build.marks.push('split');unlocked.push('split');}}
   if(b.floor===12){if(!run.build.marks.includes('starfall')){run.build.marks.push('starfall');unlocked.push('starfall');}}
   if(b.floor===16){if(!run.build.marks.includes('endure')){run.build.marks.push('endure');unlocked.push('endure');}}
  }else if(b.mode==='stella'){run.stella=true;p=300;unlocked.push('ex');}else{run.ex=true;p=500;}
  run.build.p+=p;
 }
 run.history.push({floor:b.floor,mode:b.mode,result:b.result,turns:b.turn,p,unlocked});run.history=run.history.slice(-100);
 return {p,unlocked,test:true};
}
export function campaignTrain(run,id){if(!['talent','feather','destruction','ultimate'].includes(id))throw Error('不明な試作育成です');train(run.build,id);}
export function campaignEquip(run,id,kind){equip(run.build,id,kind);}
export function campaignUpgrade(run,id){upgradePower(run.build,id);}
export function campaignBuyMark(run,id){buyMark(run.build,id);}
