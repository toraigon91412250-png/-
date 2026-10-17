import type { BattleChallengeLevel, CpuDifficulty } from '../types/game';

export type BattleReturnDestination = 'SELECT'|'GROWTH_HUB'|'DEV_TOOLS'|'EXPERIMENT_LAB';
export interface ExperimentTrial { id:'CALIBRATION'|'RESONANCE_STRESS'|'LIMIT_BREAK'; eyebrow:string; title:string; kaiserLevel:BattleChallengeLevel; difficulty:CpuDifficulty; objective:string; description:string; recommendedFor:string; }
export const EXPERIMENT_TRIALS:readonly ExperimentTrial[]=[
 {id:'CALIBRATION',eyebrow:'CALIBRATION / 01',title:'基礎校正',kaiserLevel:10,difficulty:'NORMAL',objective:'火力と操作感の基準を取る',description:'権能の動き、連携、操作テンポを落ち着いて確認する。',recommendedFor:'新しい編成を試すとき'},
 {id:'RESONANCE_STRESS',eyebrow:'RESONANCE / 02',title:'共鳴ストレス試験',kaiserLevel:50,difficulty:'EXPERT',objective:'高火力と対策を検証する',description:'強敵相手に共鳴権能の噛み合い、耐久力、切り返しを試す。',recommendedFor:'共鳴権能・高難度編成'},
 {id:'LIMIT_BREAK',eyebrow:'LIMIT BREAK / 03',title:'限界突破試験',kaiserLevel:100,difficulty:'EXPERT',objective:'火力と生存力の限界を測る',description:'最終レベルの圧力下で必殺のタイミングと耐久の限界を探る。',recommendedFor:'仕上げた編成の最終確認'}
];
export type ExperimentGrade='S'|'A'|'B'|'C'|'D';
function clampRatio(v:number):number{return Number.isFinite(v)?Math.max(0,Math.min(1,v)):0;}
export function getExperimentGrade(won:boolean,playerHpRatio:number,enemyHpRatio:number):ExperimentGrade{
 const p=clampRatio(playerHpRatio),e=clampRatio(enemyHpRatio);
 if(won){if(p>=.65)return'S';if(p>=.35)return'A';return'B';}
 if(e<=.2)return'B';if(e<=.5)return'C';return'D';
}
export function shouldPersistBattleResult(suppressProgressionRewards:boolean):boolean{return !suppressProgressionRewards;}
export function shouldRecordBattleProgress(destination:BattleReturnDestination):boolean{return destination!=='EXPERIMENT_LAB';}

/* Prototype state is memory-only: these helpers never read or write player saves. */
export type AbyssAction='STRIKE'|'GUARD'|'CHARGE'|'BURST';
export type AbyssIntent='STRIKE'|'HEAVY';
export type AbyssStatus='FIGHTING'|'REWARD'|'CLEARED'|'DEFEATED';
export type AbyssRelicId='CHAIN_SIGIL'|'ECHO_ARMOR'|'VOID_CORE'|'ABYSS_HEART'|'EXECUTION_MARK';
export interface AbyssRunState {
 status:AbyssStatus; floor:number; turn:number; hp:number; maxHp:number; charge:number; shield:number;
 enemyHp:number; enemyMaxHp:number; intent:AbyssIntent; relics:Partial<Record<AbyssRelicId,number>>;
 totalDamage:number; totalTurns:number; rewardChoices:AbyssRelicId[]; logs:string[];
}
export const ABYSS_RELICS:readonly {id:AbyssRelicId;name:string;symbol:string;description:string}[]=[
 {id:'CHAIN_SIGIL',name:'連鎖刻印',symbol:'⛓',description:'通常攻撃の威力+5。積み重なるほど安定した火力になる。'},
 {id:'ECHO_ARMOR',name:'反響装甲',symbol:'◈',description:'防御+4。ガード時に敵へ追加ダメージを返す。'},
 {id:'VOID_CORE',name:'虚空炉心',symbol:'✦',description:'BURSTの威力+12。チャージを大技へ変換する。'},
 {id:'ABYSS_HEART',name:'深淵心臓',symbol:'♥',description:'層を突破するたびHPを追加回復する。'},
 {id:'EXECUTION_MARK',name:'断罪刻印',symbol:'⚖',description:'高層ほどBURSTの威力が上がる。'}
];
function relicCount(state:AbyssRunState,id:AbyssRelicId):number{return state.relics[id]??0;}
function abyssEnemyHp(floor:number):number{return floor===5?126:34+floor*10;}
function abyssIntent(floor:number,turn:number):AbyssIntent{return floor===5?turn%2===0?'HEAVY':'STRIKE':turn%3===0?'HEAVY':'STRIKE';}
function trimLogs(logs:string[]):string[]{return logs.slice(-5);}
function withAbyssEnd(state:AbyssRunState):AbyssRunState{
 if(state.enemyHp<=0){
  if(state.floor>=5)return {...state,status:'CLEARED',shield:0,rewardChoices:[],logs:trimLogs([...state.logs,'最終層突破。深淵踏破に成功した。'])};
  return {...state,status:'REWARD',shield:0,rewardChoices:getAbyssRewardChoices(state.floor),logs:trimLogs([...state.logs,'層を突破。遺物を1つ選び、次の敵に備えよう。'])};
 }
 return state;
}
export function getAbyssRewardChoices(floor:number):AbyssRelicId[]{
 const choices:Record<number,AbyssRelicId[]>={1:['CHAIN_SIGIL','ECHO_ARMOR','VOID_CORE'],2:['ABYSS_HEART','EXECUTION_MARK','CHAIN_SIGIL'],3:['VOID_CORE','ABYSS_HEART','ECHO_ARMOR'],4:['EXECUTION_MARK','CHAIN_SIGIL','ABYSS_HEART']};
 return [...(choices[floor]??[])];
}
export function createAbyssRun():AbyssRunState{
 const maxHp=100,enemyMaxHp=abyssEnemyHp(1);
 return {status:'FIGHTING',floor:1,turn:1,hp:maxHp,maxHp,charge:0,shield:0,enemyHp:enemyMaxHp,enemyMaxHp,intent:abyssIntent(1,1),relics:{},totalDamage:0,totalTurns:0,rewardChoices:[],logs:['試験開始。敵の構えを見て、攻撃・防御・チャージを選ぼう。']};
}
export function resolveAbyssAction(state:AbyssRunState,action:AbyssAction):AbyssRunState{
 if(state.status!=='FIGHTING'||(action==='BURST'&&state.charge<3))return state;
 const next:AbyssRunState={...state,relics:{...state.relics},logs:[...state.logs],rewardChoices:[],totalTurns:state.totalTurns+1,shield:0};
 let damage=0;
 if(action==='STRIKE'){
  damage=15+5*relicCount(next,'CHAIN_SIGIL');next.charge=Math.min(3,next.charge+1);
  next.logs.push('通常攻撃：'+damage+'ダメージ。チャージ+1。');
 }else if(action==='GUARD'){
  next.shield=14+4*relicCount(next,'ECHO_ARMOR');next.charge=Math.min(3,next.charge+1);
  next.logs.push('防御構え：次の攻撃を'+next.shield+'まで軽減。チャージ+1。');
 }else if(action==='CHARGE'){
  next.charge=Math.min(3,next.charge+2);next.logs.push('虚空チャージ：エネルギーを'+next.charge+'/3まで蓄積。');
 }else{
  damage=42+next.floor*4+12*relicCount(next,'VOID_CORE')+next.floor*4*relicCount(next,'EXECUTION_MARK');
  next.charge=0;next.logs.push('BURST発動：'+damage+'ダメージ。エネルギーを使い切った。');
 }
 next.enemyHp=Math.max(0,next.enemyHp-damage);next.totalDamage+=damage;
 if(next.enemyHp<=0)return withAbyssEnd(next);
 const incoming=next.intent==='HEAVY'?13+next.floor*4:7+next.floor*3;
 const taken=Math.max(0,incoming-next.shield);next.hp=Math.max(0,next.hp-taken);
 next.logs.push((next.intent==='HEAVY'?'重撃':'通常攻撃')+'を受けた：'+taken+'ダメージ。');
 if(action==='GUARD'&&relicCount(next,'ECHO_ARMOR')>0){
  const reflected=3*relicCount(next,'ECHO_ARMOR');next.enemyHp=Math.max(0,next.enemyHp-reflected);next.totalDamage+=reflected;
  next.logs.push('反響装甲が'+reflected+'ダメージを返した。');
 }
 next.shield=0;
 if(next.hp<=0)return {...next,status:'DEFEATED',logs:trimLogs([...next.logs,'HPが尽きた。実験終了。'])};
 if(next.enemyHp<=0)return withAbyssEnd(next);
 next.turn+=1;next.intent=abyssIntent(next.floor,next.turn);next.logs=trimLogs(next.logs);return next;
}
export function chooseAbyssReward(state:AbyssRunState,id:AbyssRelicId):AbyssRunState{
 if(state.status!=='REWARD'||!state.rewardChoices.includes(id))return state;
 const relics={...state.relics,[id]:Math.min(3,relicCount(state,id)+1)};
 const healed=Math.min(state.maxHp,state.hp+5*(relics.ABYSS_HEART??0));
 const floor=state.floor+1,enemyMaxHp=abyssEnemyHp(floor);
 return {...state,status:'FIGHTING',floor,turn:1,hp:healed,charge:0,shield:0,enemyHp:enemyMaxHp,enemyMaxHp,
  intent:abyssIntent(floor,1),relics,totalDamage:state.totalDamage,totalTurns:state.totalTurns,rewardChoices:[],
  logs:trimLogs([...state.logs,ABYSS_RELICS.find(x=>x.id===id)!.name+'を取得。次の層へ進む。'])};
}
export function getAbyssGrade(state:AbyssRunState):ExperimentGrade{
 if(state.status==='CLEARED')return state.hp>=55&&state.totalTurns<=20?'S':'A';
 if(state.floor>=4)return'B';if(state.floor>=2)return'C';return'D';
}

export type PrototypePattern='BALANCED'|'BERSERKER'|'FORTRESS'|'DRAIN';
export type PrototypeAction='STRIKE'|'MULTI'|'GUARD'|'CHARGE'|'ERODE'|'EXECUTE';
export type PrototypeDuelStatus='PLAYING'|'VICTORY'|'DEFEAT'|'TIMEOUT';
export type PrototypeIntent='STRIKE'|'HEAVY'|'GUARD'|'RECOVER';
export interface PrototypeBossConfig{hp:number;attack:number;armor:number;pattern:PrototypePattern;moduleIds:string[];name?:string;}
export interface PrototypeDuelState{
 status:PrototypeDuelStatus;turn:number;maxTurns:number;playerHp:number;maxPlayerHp:number;enemyHp:number;maxEnemyHp:number;
 charge:number;judgment:number;shield:number;erosionStacks:number;totalDamage:number;totalTurns:number;intent:PrototypeIntent;logs:string[];
}
export interface PrototypeBuildAnalysis{score:number;tags:string[];synergies:string[];damageBonus:number;guardBonus:number;}
const TAG_LABELS:Record<string,string>={risk:'瀕死強化',erosion:'侵食',volley:'連撃',endurance:'不屈',execution:'断罪',transcendence:'超越'};
export function getPrototypeModuleTags(id:string):string[]{
 const tags:string[]=[];
 if(id.includes('FALLEN'))tags.push('risk');
 if(id.includes('ABYSS'))tags.push('erosion');
 if(id.includes('WING')||id==='BLACK_WING')tags.push('volley');
 if(id.includes('KING')||id.includes('GOD'))tags.push('endurance');
 if(id.includes('JUDGMENT'))tags.push('execution');
 if(id.includes('ASTRAL'))tags.push('transcendence');
 return tags;
}
export function analyzePrototypeBuild(ids:readonly string[]):PrototypeBuildAnalysis{
 const unique=[...new Set(ids)].slice(0,3),tagSet=new Set(unique.flatMap(getPrototypeModuleTags)),tags=[...tagSet];
 const synergies:string[]=[];
 if(tagSet.has('risk')&&tagSet.has('endurance'))synergies.push('不屈の暴走');
 if(tagSet.has('erosion')&&tagSet.has('execution'))synergies.push('侵食断罪');
 if(tagSet.has('volley')&&tagSet.has('execution'))synergies.push('連弾執行');
 if(tagSet.has('transcendence')&&tags.length>=3)synergies.push('超越共鳴');
 if(tags.length>=4)synergies.push('多重連携');
 const bonus=synergies.reduce((n,s)=>n+(s==='多重連携'?8:16),0);
 const score=Math.max(0,Math.min(100,unique.length*10+tags.length*9+bonus));
 return {score,tags:tags.map(t=>TAG_LABELS[t]??t),synergies,damageBonus:Math.min(20,Math.floor(tags.length*2)+synergies.length*3),guardBonus:tagSet.has('endurance')?6:0};
}
export function normalizePrototypeBossConfig(config:PrototypeBossConfig):PrototypeBossConfig{
 const patterns:PrototypePattern[]=['BALANCED','BERSERKER','FORTRESS','DRAIN'];
 const finiteInt=(v:number,def:number,min:number,max:number)=>Number.isFinite(v)?Math.max(min,Math.min(max,Math.round(v))):def;
 return {hp:finiteInt(config.hp,220,100,500),attack:finiteInt(config.attack,15,5,40),armor:finiteInt(config.armor,5,0,30),
  pattern:patterns.includes(config.pattern)?config.pattern:'BALANCED',moduleIds:[...new Set(config.moduleIds)].slice(0,3),name:config.name?.trim().slice(0,36)||'試作カイザー'};
}
function prototypeIntent(pattern:PrototypePattern,turn:number):PrototypeIntent{
 if(pattern==='BERSERKER')return turn%2===0?'HEAVY':'STRIKE';
 if(pattern==='FORTRESS')return turn%3===2?'GUARD':turn%3===0?'HEAVY':'STRIKE';
 if(pattern==='DRAIN')return turn%3===0?'RECOVER':turn%2===0?'HEAVY':'STRIKE';
 return turn%3===0?'HEAVY':'STRIKE';
}
function trimPrototypeLogs(logs:string[]):string[]{return logs.slice(-6);}
export function createPrototypeDuel(input:PrototypeBossConfig):PrototypeDuelState{
 const config=normalizePrototypeBossConfig(input);
 return {status:'PLAYING',turn:1,maxTurns:6,playerHp:100,maxPlayerHp:100,enemyHp:config.hp,maxEnemyHp:config.hp,charge:0,judgment:0,shield:0,erosionStacks:0,totalDamage:0,totalTurns:0,intent:prototypeIntent(config.pattern,1),logs:['戦闘開始。次の構えを確認し、6ターン以内の撃破を目指そう。']};
}
export function resolvePrototypeDuelAction(state:PrototypeDuelState,action:PrototypeAction,input:PrototypeBossConfig):PrototypeDuelState{
 if(state.status!=='PLAYING'||(action==='EXECUTE'&&state.charge<2))return state;
 const config=normalizePrototypeBossConfig(input),analysis=analyzePrototypeBuild(config.moduleIds),tags=new Set(config.moduleIds.flatMap(getPrototypeModuleTags));
 const next:PrototypeDuelState={...state,logs:[...state.logs],shield:0,totalTurns:state.totalTurns+1};
 let raw=0;
 if(action==='STRIKE'){
  raw=17+analysis.damageBonus+(tags.has('risk')&&state.playerHp<=35?9:0);next.charge=Math.min(3,state.charge+1);
  if(tags.has('execution'))next.judgment=Math.min(4,state.judgment+1);
 }else if(action==='MULTI'){
  raw=18+(tags.has('volley')?12:0)+Math.floor(analysis.damageBonus/2);next.charge=Math.min(3,state.charge+1);
  if(tags.has('execution'))next.judgment=Math.min(4,state.judgment+1);
 }else if(action==='GUARD'){
  next.shield=15+analysis.guardBonus;next.charge=Math.min(3,state.charge+1);
 }else if(action==='CHARGE'){
  next.charge=Math.min(3,state.charge+2);if(tags.has('execution'))next.judgment=Math.min(4,state.judgment+1);
  if(tags.has('transcendence'))next.playerHp=Math.min(next.maxPlayerHp,next.playerHp+3);
 }else if(action==='ERODE'){
  next.erosionStacks=Math.min(3,state.erosionStacks+1);
  raw=7+(tags.has('erosion')?next.erosionStacks*4:next.erosionStacks*2)+analysis.damageBonus;next.charge=Math.min(3,state.charge+1);
 }else{
  raw=28+state.charge*7+state.judgment*8+(tags.has('execution')?14:0)+analysis.damageBonus*2+(tags.has('transcendence')?10:0);
  next.charge=Math.max(0,state.charge-2);next.judgment=0;
 }
 const bossGuard=state.intent==='GUARD'?.55:1;
 const effectiveArmor=Math.max(0,config.armor-next.erosionStacks*(tags.has('erosion')?4:2));
 const damage=Math.max(1,Math.floor(raw*bossGuard-effectiveArmor*.25));
 next.enemyHp=Math.max(0,next.enemyHp-damage);next.totalDamage+=damage;
 next.logs.push(action+'：'+damage+'ダメージ。'+(bossGuard<1?'敵の防御で威力低下。':''));
 if(next.enemyHp<=0)return {...next,status:'VICTORY',shield:0,logs:trimPrototypeLogs([...next.logs,'試作ボスを撃破。'])};
 if(state.intent==='RECOVER'){
  const heal=Math.min(config.hp-next.enemyHp,12);next.enemyHp+=heal;next.logs.push(config.name+'が'+heal+'回復。');
 }else if(state.intent==='GUARD'){
  next.logs.push('敵は防御に集中。こちらの攻撃を軽減した。');
 }else{
  const rawEnemy=state.intent==='HEAVY'?Math.round(config.attack*1.7):config.attack;
  const taken=Math.max(0,rawEnemy-next.shield);next.playerHp=Math.max(0,next.playerHp-taken);
  next.logs.push((state.intent==='HEAVY'?'重撃':'攻撃')+'を受けた：'+taken+'ダメージ。');
  if(action==='GUARD'&&tags.has('endurance')){const reflect=Math.min(next.enemyHp,4);next.enemyHp-=reflect;next.totalDamage+=reflect;next.logs.push('不屈の反響：'+reflect+'ダメージ。');}
 }
 next.shield=0;
 if(next.playerHp<=0)return {...next,status:'DEFEAT',logs:trimPrototypeLogs([...next.logs,'プレイヤーのHPが尽きた。'])};
 if(next.enemyHp<=0)return {...next,status:'VICTORY',logs:trimPrototypeLogs([...next.logs,'試作ボスを撃破。'])};
 if(state.turn>=state.maxTurns)return {...next,status:'TIMEOUT',logs:trimPrototypeLogs([...next.logs,'6ターン経過。制限時間終了。'])};
 next.turn=state.turn+1;next.intent=prototypeIntent(config.pattern,next.turn);next.logs=trimPrototypeLogs(next.logs);return next;
}
export function getPrototypeDuelGrade(state:PrototypeDuelState):ExperimentGrade{
 if(state.status==='VICTORY')return state.playerHp>=70&&state.totalTurns<=3?'S':'A';
 if(state.status==='TIMEOUT')return state.enemyHp<=state.maxEnemyHp*.15?'B':state.enemyHp<=state.maxEnemyHp*.45?'C':'D';
 if(state.status==='DEFEAT')return state.enemyHp<=state.maxEnemyHp*.25?'B':'D';
 return'D';
}
