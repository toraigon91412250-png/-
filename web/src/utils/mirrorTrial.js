import {DIV_SKILLS} from '../data/divinity.js';
import {startBattle,act,available,playerStats,enemyStats,damage,dealPlayer,heal,log,buff} from './gameCore.js';
import {RECIPES} from '../data/config.js';
import {badgeRank,clone,clamp} from './progression.js';
import {combatNotice} from './combatObservation.js';

// Experimental boss rules only. Never imported by the main combat engine or save schema.
export const MIRROR_RULES={hp:20,wingHealth:1,defense:.35,attack:.15,speed:.95,cap:.45,awakeningHP:.9,awakeningAttack:1.4,openingDef:.5,awakenedOpeningDef:.25,shatterHeal:.16,phaseErosionCarryCap:.35,
 moves:{slash:1,feather:1.2,pierce:1.4,volley:1.3,power:1.5,ultimate:2.2}};
export const MIRROR_MOVE_NAMES={slash:'鏡刃',feather:'反照・羽弾',pierce:'反照・穿羽',volley:'反照・連羽',power:'鏡像の権能',ultimate:'終鏡・堕天撃'};
export const MIRROR_TRAITS={fallen:'背反の堕天',king:'不滅の残像',judge:'鏡面断罪',abyss:'深淵の反照',wing:'黒翼の残響',neutral:'無垢の鏡'};
const mirrorAttacks=new Set(Object.keys(MIRROR_RULES.moves));
const doomForecast=m=>m.ritual===3?'終焉予兆：次の敵行動':'終焉予兆：敵行動2回後';
export function mirrorLineage(id){const base=RECIPES.find(x=>x.id===id)?.parts[0]||id;return Object.hasOwn(MIRROR_TRAITS,base)?base:'neutral';}
export function startMirrorTrial(source,{phase=1,relic='none',developerGauntlet=false,combatV2=false}={}){
 if(![1,2,3].includes(phase)||!['none','echo','nameless'].includes(relic))throw Error('鏡界の開始条件が不正です');
 const b=startBattle(source,{mode:'normal',floor:1,test:true,combatV2}),p=playerStats(b);
 const featherFactor=b.powers.some(x=>['fallenwing','kingwing','judgewing','abysswing'].includes(x))?1.65:b.powers.includes('wing')?1:0;
 const playerLevel=Number(b.build?.level)||1;
 const levelPressure=Math.max(0,Math.min(1,(10-playerLevel)/10));
 const training=1.55+levelPressure*.55; // Mirror-only pressure: low-investment builds should prepare before entering.
 const hp=Math.round(p.atk*training*MIRROR_RULES.hp*(1+featherFactor*MIRROR_RULES.wingHealth)*(b.powers.includes('star')?2:1));
 const pressure=1+levelPressure*.55;
 b.enemy={name:'鏡像いれーな',base:{hp,atk:Math.round((p.def+p.hp*MIRROR_RULES.attack)*pressure),def:Math.round(p.atk*MIRROR_RULES.defense*pressure),spd:Math.max(1,Math.round(p.spd*MIRROR_RULES.speed))},hp,phase:1,buffs:[],statuses:{}};
 b.trial={kind:'mirror',trait:mirrorLineage(b.powers[0]),echo:'slash',roundEcho:'slash',awake:false,kingUsed:false,judgeHits:0,opening:false,openingSerial:0,actions:0,shatters:0,guards:0,damage:0,taken:0,history:[],startedPhase:phase,relic,developerGauntlet,guardChain:0,attackFamily:null,repeat:0,learning:'',ritual:0,domains:0,seals:0,breach:0,normalCleared:false,unsealed:false,families:[]};
 b.experiment={kind:'mirror'};
 b.tacticalB={shellFeather:.35,exposed:1.6,duration:3};
 if(featherFactor)b.enemy.statuses.campaignArmor=9999;
 b.log=['黒鏡の聖堂 — 鏡像いれーな','「その力の使い方、誰よりも知っている。」',MIRROR_TRAITS[b.trial.trait]+'が映し出された。'];
 if(phase>=2){b.trial.awake=true;b.enemy.phase=2;b.enemy.hp=b.enemy.base.hp*MIRROR_RULES.awakeningHP;}if(phase===3)mirrorEnterBeyond(b,false);return b;
}
export function mirrorStateText(b){
 const m=b.trial;if(m?.kind!=='mirror')return '';
 if(b.enemy.phase===3&&m.actions>0)return ['封印 '+m.seals+'/3・破砕 '+Math.round((m.sealCharge||0)*100)+'%',m.counterReady?'次：反撃で破砕':m.wingWindow?'次：羽系連携':m.sealCharge>=1?'次：別系統で破砕':'準備：防御／必殺／破鏡',m.ritual>=2?doomForecast(m)+'（防御／必殺）':'詠唱 '+m.ritual+'/3',m.opening?'鏡裂あり':null,m.repeat>=2?'適応：'+({feather:'羽系',slash:'斬撃',power:'権能',ultimate:'必殺'}[m.attackFamily]||'防御'):null].filter(Boolean).join(' ／ ');
 if(b.enemy.phase===3)return [m.seals?'封印 '+m.seals+'/3・破砕 '+Math.round((m.sealCharge||0)*100)+'%（必殺／破鏡／防御後反撃／蓄積後に攻撃切替）':'封印崩壊・猛攻／反撃の好機',m.ritual>=2?doomForecast(m)+'：防御で軽減・必殺で断絶':'鏡界詠唱 '+m.ritual+'/3',m.domains>2?'神域圧 '+Math.round(Math.min(.9,(m.domains-2)*.06)*100)+'%':null,m.learning||null].filter(Boolean).join(' ／ ');
 return [MIRROR_TRAITS[m.trait],m.awake?'鏡界再誕':null,m.learning||null,b.enemy.statuses.campaignArmor?'反照羽衣':b.enemy.statuses.researchExposed?'羽衣崩壊':null,m.opening?'鏡裂・防御低下':null,m.trait==='judge'?'断罪 '+m.judgeHits+'/2':null].filter(Boolean).join(' ／ ');
}
// Detailed facts stay behind a disclosure so the combat HUD remains readable
// on small screens. Permanent effects use a condition instead of a fake timer.
export function mirrorStateDetails(b){
 const m=b.trial;
 if(m?.kind!=='mirror')return [];
 const rows=[];
 if(b.enemy.phase===3){
  rows.push(m.seals?`封印：${m.seals}枚（第三形態開始時HPの${[0,10,40,70][m.seals]}%が下限）`:'封印：解除済み');
  rows.push(`破砕蓄積：${Math.round((m.sealCharge||0)*100)}%`);
  if(m.counterReady)rows.push('次の一手：防御反撃で破砕');
  else if(m.wingWindow)rows.push('次の一手：別系統の後に羽系攻撃で破砕');
  else if(m.ritual>=2)rows.push('次の一手：必殺で終焉を断絶・封印破砕');
  else if(m.sealCharge>=1)rows.push('次の一手：別系統へ切替えて破砕');
  else if(m.opening)rows.push('次の一手：斬撃・権能・必殺で鏡裂を砕く');
  else rows.push('破砕準備：攻撃で蓄積／防御後に反撃');
  if(m.opening)rows.push(`鏡裂：敵防御${m.awake?'0.25':'0.5'}倍（次の攻撃行動で消費・命中不要）`);
  if(m.ritual>=2)rows.push(`${doomForecast(m)}（防御で軽減／対応必殺で術式断絶）`);
  else rows.push(`神域詠唱：${m.ritual}/3（次の敵行動で更新）`);
  if(m.domains>2)rows.push(`神域侵食：敵の強化 +${Math.round(Math.min(.9,(m.domains-2)*.06)*100)}%`);
 }else{
  if(b.enemy.statuses.campaignArmor)rows.push('反照羽衣：羽系ダメージ 0.35倍（破壊まで）');
  if(b.enemy.statuses.researchExposed)rows.push(`羽衣崩壊：最終ダメージ×1.6（残り${b.enemy.statuses.researchExposed}行動）`);
  if(m.opening)rows.push(`鏡裂：敵防御${m.awake?'0.25':'0.5'}倍（次の攻撃行動で消費・命中不要）`);
 }
 if(b.buffs?.some(x=>x.id==='mirrorFullRelease'))rows.push('鏡界・完全解放：攻撃1.5倍／防御1.25倍／速度1.2倍（戦闘中）');
 return rows;
}
function mirrorAwaken(b){
 const m=b.trial;if(b.enemy.hp>0||b.hp<=0)return;
 if(m.awake){
  if(b.enemy.phase===2)m.normalCleared=true;
  if(b.enemy.phase===2&&(m.developerGauntlet||m.shatters>=2&&m.guards>=2&&(b.combatV2?b.used.special>=1:b.used.ultimate>=1)&&m.families.length>=3))mirrorEnterBeyond(b);
  return;
 }
 const erosionBefore=b.erosion;b.erosion=Math.min(b.erosion,MIRROR_RULES.phaseErosionCarryCap);
 if(b.erosion<erosionBefore){log(b,'鏡界再誕：侵食は'+Math.round(b.erosion*100)+'%まで持ち越された');combatNotice(b,'mirrorErosionCarry',{before:erosionBefore,after:b.erosion});}
 m.awake=true;b.enemy.phase=2;b.result=null;b.turn++;
 b.log=b.log.filter(x=>x!=='VICTORY — 再誕への一歩');
 b.enemy.hp=Math.max(1,Math.min(enemyStats(b).hp,b.enemy.base.hp*MIRROR_RULES.awakeningHP));
 if(m.opening){const x=b.enemy.buffs.find(x=>x.id==='mirrorOpening');if(x)x.mul.def=MIRROR_RULES.awakenedOpeningDef;}
 log(b,'鏡界再誕 — 「鏡を壊しても、私は消えない。」');combatNotice(b,'mirrorAwaken',{text:'鏡界再誕'});
}

function mirrorEnterBeyond(b,transition=true){
 const m=b.trial;m.unsealed=true;m.awake=true;b.enemy.phase=3;b.result=null;
 if(transition){b.turn++;b.log=b.log.filter(x=>x!=='VICTORY — 再誕への一歩');}
 b.erosion=0;b.enemy.hp=b.enemy.base.hp*.75; // New domain sheds erosion once; abyss resumes normally next turn.
 m.seals=3;m.breach=0;m.ritual=0;m.sealCharge=0;m.counterReady=false;m.domains=0;m.echo='slash';m.learning='';m.guardChain=0;m.opening=false;
 m.wingWindow=false;m.robeBlocked=false;m.starInterrupted=false;m.interruptPending=false;
 m.attackFamily=null;m.repeat=0;
 b.enemy.buffs=b.enemy.buffs.filter(x=>!['mirrorOpening','mirrorDomain'].includes(x.id));
 delete b.enemy.statuses.campaignArmor;delete b.enemy.statuses.researchExposed;
 b.hp=b.base.hp;b.gauge=100;b.statuses={};b.cd={};
 buff(b,'mirrorFullRelease',9999,{atk:1.5,def:1.25,spd:1.2});
 log(b,'鏡の向こうに、まだ空があった。');combatNotice(b,'mirrorBeyond',{text:'終わらない鏡界'});
 combatNotice(b,'mirrorRelease',{text:'完全解放'});
}
function mirrorSeverRitual(b){
 const m=b.trial;if(b.enemy.phase!==3||m.severed||b.lastAction!=='ultimate'||b.lastDamage<=0)return;
 m.severed=true;
 const prepared=m.counterReady||m.interruptPending||(m.sealCharge>=1&&mirrorAttacks.has(m.attackFamily));
 if(prepared)mirrorBreakSeal(b,'必殺');
 m.ritual=0;b.enemy.buffs=b.enemy.buffs.filter(x=>x.id!=='mirrorDomain');
 if(prepared)mirrorOpen(b);
 log(b,'天翼が術式を断ち切った');combatNotice(b,'mirrorShatter',{text:'術式断絶',target:'enemy'});
}

function mirrorBreakSeal(b,route='破鏡'){
 const m=b.trial;if(b.enemy.phase!==3||m.seals<=0||m.brokenThisAction)return;
 m.seals--;m.brokenThisAction=true;m.sealCharge=0;
 log(b,'封印解除経路：'+route);
 log(b,m.seals?'鏡律の封印が砕けた — 残り'+m.seals:'三重封印崩壊 — 猛攻と反撃の好機');
 combatNotice(b,'mirrorSealBreak',{route,seals:m.seals});
 combatNotice(b,'mirrorShatter',{target:'enemy',text:m.seals?'封印破砕':'三重封印崩壊'});
}
function mirrorDamageGate(b,d){
 const m=b.trial;if(b.enemy.phase!==3||!m.seals)return d;
 const floor=Math.ceil(b.enemy.base.hp*.75*([0,.1,.4,.7][m.seals]));
 const applied=Math.min(d,Math.max(0,b.enemy.hp-floor)),absorbed=d-applied;
 m.sealCharge=Math.min(1,(m.sealCharge||0)+d/Math.max(1,b.enemy.base.hp*.75*.2));
 if(absorbed>0){log(b,'鏡律：HPへ '+Math.round(applied).toLocaleString()+' ／ 封印吸収 '+Math.round(absorbed).toLocaleString());combatNotice(b,'mirrorState',{text:'封印吸収・破砕蓄積'});}
 return applied;
}
function mirrorOpen(b){
 const m=b.trial;m.opening=true;m.openingSerial++;
 b.enemy.buffs=b.enemy.buffs.filter(x=>x.id!=='mirrorOpening');
 b.enemy.buffs.push({id:'mirrorOpening',mul:{def:m.awake?MIRROR_RULES.awakenedOpeningDef:MIRROR_RULES.openingDef},remaining:9999});
 log(b,'大技の反動で鏡面に亀裂が走った');combatNotice(b,'mirrorOpen',{text:'鏡裂'});
}
function mirrorResponse(b,guard,rng){
 if(b.enemy.hp<=0||b.hp<=0)return;
 const m=b.trial;m.responseEarly=!b.events.some(e=>e.type==='hit');
 if(b.enemyStop>0){b.enemyStop--;combatNotice(b,'enemyStopped');return;}
 if(b.enemy.statuses.stun){combatNotice(b,'enemyStopped');return;}
 mirrorSeverRitual(b);
 if(b.enemy.phase===3&&m.interruptPending){m.interruptPending=false;m.ritual=0;b.enemy.buffs=b.enemy.buffs.filter(x=>x.id!=='mirrorDomain');m.sealCharge=Math.min(1,(m.sealCharge||0)+.5);mirrorOpen(b);log(b,'終焉対処成功：術式断絶');combatNotice(b,'mirrorShatter',{target:'enemy',text:'終焉・術式断絶'});combatNotice(b,'mirrorDoomResponse',{response:'interrupt',success:true});return;}
 if(b.enemy.phase===3){m.ritual=(m.ritual+1)%4;m.domains++;b.enemy.buffs=b.enemy.buffs.filter(x=>x.id!=='mirrorDomain');const mul=m.ritual===1?{def:1.5}:m.ritual===2?{atk:1.2}:m.ritual===3?{spd:1.2}:{};b.enemy.buffs.push({id:'mirrorDomain',mul,remaining:9999});}
 const p=playerStats(b),e=enemyStats(b),move=b.enemy.phase===3&&m.ritual===0?'ultimate':m.roundEcho;
 if(b.enemy.phase===3&&m.ritual===0){combatNotice(b,'mirrorDoom',{text:'終焉の一撃'});log(b,'神域崩落 — 終焉の一撃');}
 combatNotice(b,'enemyAction',{mirror:true,move,awake:m.awake,label:b.enemy.phase===3&&m.ritual===0?'終焉の一撃':MIRROR_MOVE_NAMES[move]});
 const ratio=b.enemy.hp/b.enemy.base.hp,feather=['feather','pierce','volley'].includes(move);
 let mult=MIRROR_RULES.moves[move]*(m.awake?MIRROR_RULES.awakeningAttack:1)*(m.learning==='静寂の学習'?1.2:1)*(b.enemy.phase===3?(m.seals?1.5:1.7)*(1+Math.min(.9,Math.max(0,m.domains-2)*.06)):1),ignore=0;
 if(b.enemy.phase===3&&m.ritual===0)mult*=1.6;
 if(m.trait==='fallen')mult*=ratio<=.25?1.35:ratio<=.5?1.2:1;
 if(m.trait==='wing'&&feather)mult*=1.2;
 const judgment=m.trait==='judge'&&m.judgeHits>=2;
 if(judgment){mult*=1.3;ignore=.3;}
 if(b.marks.includes('starfall')&&move==='ultimate')mult*=1.12;
 if(m.trait==='king'&&!m.kingUsed&&ratio<=.5){m.kingUsed=true;const before=b.enemy.hp;b.enemy.hp=Math.min(e.hp,b.enemy.hp+b.enemy.base.hp*.08);log(b,'不滅の残像：HPを回復した');combatNotice(b,'heal',{target:'enemy',damage:b.enemy.hp-before});}
 if(rng()<clamp((p.spd/e.spd-1)*.06,0,.65)){combatNotice(b,'enemyMiss');log(b,MIRROR_MOVE_NAMES[move]+'を回避');}
 else{
  let amount=Math.min(damage(e.atk,p.def,{mult,ignore}),p.hp*MIRROR_RULES.cap);
  if(guard)amount=Math.max(1,Math.round(amount*.3));
  if(b.build.badge==='C'&&badgeRank(b.build,'C')===3)amount*=.92;
  const hits=move==='volley'?2:1,total=Math.floor(amount);let taken=0;
  for(let i=0;i<hits&&b.hp>0;i++)taken+=dealPlayer(b,i===0?Math.ceil(total/hits):Math.floor(total/hits));
  b.enemyDamage=Math.floor(taken);m.taken+=b.enemyDamage;
  log(b,MIRROR_MOVE_NAMES[move]+' → '+Math.floor(taken).toLocaleString()+' ダメージ');
  if(m.trait==='judge'){m.judgeHits=judgment?0:m.judgeHits+1;if(judgment)log(b,'鏡面断罪が発動した');}
  if(b.powers.includes('kingjudge'))b.stacks.kingjudge=Math.min(2,(b.stacks.kingjudge||0)+1);
  if(m.trait==='abyss'&&!guard&&b.hp>0){b.statuses.pressure=3;log(b,'深淵の反照：重圧');}
 }
 if(feather&&b.hp>0&&!b.enemy.statuses.campaignArmor&&!b.enemy.statuses.researchExposed){b.enemy.statuses.campaignArmor=9999;log(b,'反照羽衣：羽弾への耐性が形成された');combatNotice(b,'armorForm');}
 if((['power','ultimate'].includes(move)||b.enemy.phase===3&&!m.seals)&&b.hp>0)mirrorOpen(b);
 if(b.enemy.phase===3&&m.ritual===0){if(guard&&b.hp>0){m.sealCharge=1;mirrorOpen(b);log(b,'終焉対処成功：防御から反撃へ');combatNotice(b,'mirrorShatter',{target:'player',text:'終焉防御成功・反撃好機'});}combatNotice(b,'mirrorDoomResponse',{response:guard?'guard':'exposed',success:guard&&b.hp>0});}
}
export function actMirrorTrial(b,action,{rng=Math.random,...options}={}){
 if(!b.test||b.trial?.kind!=='mirror'||b.mode!=='normal')throw Error('鏡像試練専用の処理です');
 const reason=available(b,action,options.route);if(reason)throw Error(reason);
 const originalAction=action;const skill=b.build.divinity?.schema===1?DIV_SKILLS[action]:null;if(skill)action=skill.guard?'guard':skill.base||action;
 const m=b.trial;m.roundEcho=m.echo;m.severed=false;m.brokenThisAction=false;
 const third=b.enemy.phase===3,priorFamily=m.attackFamily,priorErosion=b.erosion,priorLives=b.lives,priorArmor=!!b.enemy.statuses.campaignArmor;
 const warned=third&&m.ritual>=2;
 if(warned&&((action==='ultimate')||(action==='guard'&&(b.combatV2||b.powers.includes('star')&&!m.starInterrupted)))){m.interruptPending=true;if(action==='guard'&&!b.combatV2)m.starInterrupted=true;}
 if(b.enemy.phase===3&&m.repeat>=2&&m.attackFamily===(['feather','pierce','volley'].includes(action)?'feather':action)&&mirrorAttacks.has(action)){m.roundEcho='power';log(b,'鏡写し適応：連撃を読み、権能へ移行。別系統で崩せる');}
 const familyNow=['feather','pierce','volley'].includes(action)?'feather':action;
 // Enemy resistance expressed through the existing defense stat; defense-ignore retains its value.
 b.enemy.buffs=b.enemy.buffs.filter(x=>x.id!=='mirrorWard');
 const learned=mirrorAttacks.has(action)&&m.attackFamily===familyNow;
 if(learned||b.enemy.phase===3&&m.seals)b.enemy.buffs.push({id:'mirrorWard',mul:{def:(learned?4:1)*(b.enemy.phase===3&&m.seals?3:1)},remaining:9999});
 if(learned){log(b,'鏡律適応：同じ攻撃系統への防御を強化');combatNotice(b,'mirrorState',{text:'鏡律適応'});}
 const hadOpening=m.opening,serial=m.openingSerial;m.responseEarly=false;
 if(action==='guard'){delete b.statuses.pressure;m.guards++;if(b.enemy.phase===3)m.counterReady=true;}
 act(b,originalAction,{...options,rng,enemyAction:mirrorResponse,damageGate:mirrorDamageGate});
 if(third&&b.hp>0){
  if(m.interruptPending&&action==='ultimate'&&b.lastDamage>0){m.interruptPending=false;m.ritual=0;mirrorOpen(b);combatNotice(b,'mirrorDoomResponse',{response:'interrupt',success:true});log(b,'終焉対処成功：術式断絶');}
  const wing=b.powers.some(x=>['wing','fallenwing','kingwing','judgewing','abysswing'].includes(x));
  if(priorArmor&&!b.enemy.statuses.campaignArmor&&wing)m.wingWindow=true;
  if(b.lives<priorLives){m.counterReady=true;mirrorOpen(b);log(b,'致死耐性から鏡裂への反撃機会');}
  if(b.powers.includes('kingwing')&&!m.robeBlocked&&m.actions>=4&&!priorArmor&&b.enemy.statuses.campaignArmor){delete b.enemy.statuses.campaignArmor;m.robeBlocked=true;m.wingWindow=true;log(b,'王の翼：羽衣再形成を一度阻止');combatNotice(b,'mirrorRobeBlocked',{remaining:0});}
  if(b.lastDamage>0){
   if(m.wingWindow&&familyNow==='feather'&&priorFamily!=='feather'){mirrorBreakSeal(b,'羽衣連携');m.wingWindow=false;}
   if(b.erosion-priorErosion>=.06&&familyNow!==priorFamily&&b.erosion>=.18)mirrorBreakSeal(b,'侵食');
   if(b.hp/b.base.hp<=.5&&b.powers.some(x=>['fallen','fallenwing','fallenjudge','abyssfallen','god'].includes(x))&&mirrorAttacks.has(priorFamily)&&familyNow!==priorFamily)mirrorBreakSeal(b,'低HP切替');
  }
 }
 // Consume only the opening actually available when the player's attack ran.
 // A new opening from a later enemy response belongs to the NEXT attack.
 const usedOpening=mirrorAttacks.has(action)&&b.hp>0&&(hadOpening||(m.responseEarly&&m.openingSerial>serial));
 if(usedOpening){
  if(b.lastDamage>0&&['slash','power','ultimate'].includes(action)){
   m.shatters++;mirrorBreakSeal(b);if(!b.result)heal(b,MIRROR_RULES.shatterHeal+(m.relic==='echo'?.04:0));if(m.relic==='nameless')b.gauge=Math.min(100,b.gauge+18);
   log(b,'破鏡：亀裂を砕き、生命を取り戻した');combatNotice(b,'mirrorShatter',{text:'破鏡・生命回帰'});
  }
  if(m.responseEarly||m.openingSerial===serial){m.opening=false;b.enemy.buffs=b.enemy.buffs.filter(x=>x.id!=='mirrorOpening');}
 }
 if(b.enemy.phase===3&&b.lastDamage>0&&mirrorAttacks.has(action)){
  if(m.counterReady)mirrorBreakSeal(b,'防御反撃');else if(m.sealCharge>=1&&mirrorAttacks.has(m.attackFamily)&&familyNow!==m.attackFamily)mirrorBreakSeal(b,'系統切替');
  m.counterReady=false;
 }
 m.actions++;m.damage+=b.lastDamage;
 const family=['feather','pierce','volley'].includes(action)?'feather':action;
 if(mirrorAttacks.has(action)&&!m.families.includes(family))m.families.push(family);
 m.guardChain=action==='guard'?m.guardChain+1:0;m.repeat=family===m.attackFamily?m.repeat+1:1;m.attackFamily=family;
 m.learning=m.guardChain>=2?'静寂の学習':family==='feather'&&m.repeat>=2?'羽撃の学習':'';
 m.echo=m.guardChain>=2?'power':mirrorAttacks.has(action)?action:'slash';
 mirrorSeverRitual(b);
 m.interruptPending=false;
 m.history.push({turn:b.turn-(b.result?0:1),action,echo:m.roundEcho,damage:b.lastDamage,taken:b.enemyDamage,phase:b.enemy.phase});
 if(m.history.length>200)m.history.shift();
 mirrorAwaken(b);
 combatNotice(b,'mirrorState',{text:mirrorStateText(b)});
 return b;
}
export function retryMirrorTrial(b){return startMirrorTrial(clone(b.build),{phase:b.trial.startedPhase,relic:b.trial.relic,developerGauntlet:b.trial.developerGauntlet,combatV2:!!b.combatV2});}
