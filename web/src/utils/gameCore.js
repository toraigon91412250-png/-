import {grantCooperationBattle} from './divinityCooperation.js';
import {divinityAvailable,divinityIsGuard,divinityIncoming,divinityBefore,divinityStrikeProfile,performDivinityAction,divinityAfter,spendDivinityLife,divinityErosionCap} from './divinityCombat.js';
import {recordSpecialBattleAction} from './battleHistory.js';
import {authorityStrikeEffect} from './authorityStrike.js';
import {combatNotice} from './combatObservation.js';
import {markState,markGuard,beginMarkAttack,judgeMarkMultiplier,reduceKingMarkHit,triggerKingMark} from './tacticalMarks.js';
import {BALANCE,RECIPES,MARKS,GODS,FINAL_SKILLS} from '../data/config.js';
import {clamp,clone,achievements,badgeRank,powerGrowth,midgameUnlocked} from './progression.js';
export function baseStats(s,character='irena'){
 const l=s.level,b=BALANCE.base,t=1+(s.talent-1)*.035,a=1+s.awakening*.18;
 const out={hp:(b.hp+l*b.hpLevel+s.stats.hp*35)*a,atk:(b.atk+l*b.atkLevel+s.stats.atk*12)*t*a,def:(b.def+l*b.defLevel+s.stats.def*9)*a,spd:(b.spd+l*b.spdLevel+s.stats.spd*3)*a};
 if(character==='stella')return {hp:9000+s.level*15,atk:1800+s.level*8,def:360+s.level*2,spd:50};
 if(character==='final'){const f=s.finalBuild;return {hp:out.hp*3+f.hp*80,atk:out.atk*2.5+f.atk*35,def:out.def*2+f.def*22,spd:out.spd*2+f.spd*6};}
 const p=s.equipped,m=s.markEquip;
 const mul=(k,n)=>out[k]*=n;
 if(p.includes('wing'))for(const k in out)mul(k,1.1);
 if(p.includes('king')){mul('hp',1.2);mul('def',1.2);}
 if(p.includes('star'))for(const k in out)mul(k,3);
 if(p.includes('kingwing')||p.includes('kingjudge')){mul('hp',1.5);mul('def',1.5);}
 for(const id of p){if(s.powers[id]&&id!=='star')for(const k in out)mul(k,powerGrowth(s.powers[id]));if(s.resonance[id])for(const k in out)mul(k,1.2+(s.resonance[id]-1)*.12);}
 if(m.includes('endure'))mul('hp',1.18);
 if(s.badge==='C'){const r=badgeRank(s,'C');if(r===1)mul('hp',1.05);if(r===2){mul('hp',1.07);mul('def',1.07);}if(r===3)for(const k in out)mul(k,1.12);}
 return Object.fromEntries(Object.entries(out).map(([k,v])=>[k,Math.round(v)]));
}
export function normalEnemy(level){return {hp:Math.round(320+level*80+level*level*9),atk:30+level*12,def:8+level*3,spd:18+level*1.8};}
export function enemyConfig(mode,floor,index=0){let base=normalEnemy(floor),name=`カイザー Lv.${floor}`;
 if(mode==='ex'){base=Object.fromEntries(Object.entries(normalEnemy(100)).map(([k,v])=>[k,v*2]));name='EX カイザー';}
 if(mode==='raid'){base=normalEnemy(Math.max(50,floor));base.hp*=1.4;base.atk*=1.25;name='深淵の守護者';}
 if(mode==='stella'){base={hp:30000,atk:440,def:180,spd:65};name='終焉のカイザー';}
 if(mode==='final'){base={hp:85000,atk:2200,def:1200,spd:320};name='創世を喰らうカイザー';}
 if(mode==='god'){base={hp:45000+index*13000,atk:1600+index*250,def:600+index*120,spd:230+index*30};name=GODS[index];}
 return {name,base};
}
export function canStart(s,mode,floor){if(mode==='normal')return Number.isInteger(floor)&&floor>=1&&floor<=Math.min(100,s.floor);if(mode==='raid')return false; /* Lab-only guard-break trial still uses a test battle template. */if(mode==='ex'||mode==='stella')return s.flags.stella;if(mode==='final')return s.flags.final;if(mode==='god')return s.flags.ex&&!!s.gauntlet;return false;}
export function startBattle(s,{mode='normal',floor=s.floor,difficulty='NORMAL',test=false}={}){
 const validDifficulty=['NORMAL','EXPERT'].includes(difficulty)||difficulty==='NIGHTMARE'&&['ex','stella','final','raid','god'].includes(mode);
 if(!['normal','ex','raid','stella','final','god'].includes(mode)||!Number.isInteger(floor)||floor<1||floor>100||!validDifficulty)throw Error('戦闘設定が不正です');
 if(!test&&!canStart(s,mode,floor))throw Error('解放条件を満たしていません');
 const character=mode==='stella'?'stella':mode==='final'?'final':'irena',base=baseStats(s,character),enemy=enemyConfig(mode,floor,s.gauntlet?.index||0);
 if(difficulty==='EXPERT'){enemy.base.hp*=1.3;enemy.base.atk*=1.2;enemy.base.spd*=1.1;}
 if(difficulty==='NIGHTMARE'){enemy.base.hp*=1.6;enemy.base.atk*=1.4;enemy.base.spd*=1.2;}
 const powers=character==='irena'?[...s.equipped]:[],marks=character==='irena'?[...s.markEquip]:[];
 let lives=powers.includes('king')?5:0;for(const [id,n]of [['god',4],['kingwing',7],['kingjudge',6],['abyssking',6]])if(powers.includes(id))lives+=n;
 return {mode,floor,difficulty,test,character,build:clone({...s,markBattle:undefined}),replay:[],base,hp:base.hp,enemy:{...enemy,hp:enemy.base.hp,phase:1,buffs:[],statuses:{}},turn:1,gauge:0,balance:0,cd:{},buffs:[],statuses:{},erosion:0,stacks:{},lives,markLife:marks.includes('endure')?1:0,godThresholds:[],rebirths:0,meteor:false,phaseTurns:0,powers,marks,used:{special:0,ultimate:0,marks:[],endure:false,low:false},result:null,settled:false,lastFeather:null,log:['境界に立つ者よ、失われた力を取り戻せ。'],lastDamage:0,enemyDamage:0,enemyStop:0,events:[],noBuff:0,noPressure:0,ignoreDefense:0};
}
export function log(b,text){b.log.push(text);if(b.log.length>100)b.log.shift();}
export function fallenMultiplier(r){return r<=.1?3.8:r<=.25?3.1:r<=.5?2.4:1;}
export function playerStats(b){const v={...b.base},ratio=b.hp/b.base.hp,p=b.powers;
 let all=1;if(p.includes('fallen')||p.includes('fallenjudge')||p.includes('abyssfallen'))all=Math.max(all,fallenMultiplier(ratio));
 if(p.includes('fallenwing'))all=Math.max(all,ratio<=.1?7.6:ratio<=.25?6.2:ratio<=.5?4.8:1);
 if(p.includes('god'))all=Math.max(all,...b.buffs.filter(x=>x.id.startsWith('godlow')).map(x=>x.multiplier||1));
 for(const k in v)v[k]*=all;
 if(p.includes('abyssking')){v.atk*=1+b.erosion*.7;v.def*=1.3+Math.min(.75,b.erosion);}
 if(p.includes('abyssfallen'))v.atk*=1+b.erosion;
 for(const x of b.buffs)for(const [k,n] of Object.entries(x.mul||{}))v[k]*=n;
 if(b.statuses.pressure)v.atk*=.85;
 if(b.statuses.slow)v.spd*=.25;if(b.statuses.fragile)v.def*=.5;
 for(const k in v)v[k]=clamp(v[k],1,1e15);
 return {...v,current:clamp(b.hp/b.base.hp*v.hp,0,v.hp),ratio};
}
export function enemyStats(b){const factor=Math.max(.05,1-b.erosion),v=Object.fromEntries(Object.entries(b.enemy.base).map(([k,n])=>[k,Math.max(1,n*factor)]));for(const x of b.enemy.buffs)for(const [k,n]of Object.entries(x.mul))v[k]*=n;if(b.ignoreDefense)v.def=0;return v;}
export function damage(atk,def,{mult=1,ignore=0,final=1,extra=0,minimum=1}={}){const safe=(v,max=1e15)=>Number.isNaN(v)?0:Math.max(0,Math.min(max,v));const base=Math.max(1,safe(atk)*safe(mult,1e12)-safe(def)*(1-clamp(ignore,0,1)));return Math.floor(Math.min(1e15,Math.max(safe(minimum),base*safe(final,1e12)+safe(extra))));}
export function buff(b,id,duration,mul={},extra={}){b.buffs=b.buffs.filter(x=>x.id!==id);b.buffs.push({id,remaining:duration,mul,...extra});}
export function dealPlayer(b,amount){amount=divinityIncoming(b,amount);const p=playerStats(b);if(b.statuses.invulnerable){log(b,'不滅：ダメージを完全に無効化');combatNotice(b,'incomingHit',{damage:0});return 0;}amount=reduceKingMarkHit(b,amount);let actual=amount,kingEndured=false;const lethal=p.current<=amount;if(lethal){if(b.powers.includes('god')){const ratio=p.ratio;const threshold=[.5,.25,.05].find(x=>ratio<=x&&!b.godThresholds.includes(x));if(threshold!==undefined){b.godThresholds.push(threshold);actual=p.current-1;log(b,'堕天の神：段階耐性');}else if(b.lives>0){b.lives--;spendDivinityLife(b);kingEndured=b.powers.includes('king');actual=p.current-1;log(b,`致死耐性 残り${b.lives}回`);}else if(b.markLife){b.markLife--;actual=p.current-1;b.used.endure=true;markUsed(b,'endure');}else{b.hp=0;combatNotice(b,'incomingHit',{damage:Math.floor(amount)});return amount;}}else if(b.lives>0){b.lives--;spendDivinityLife(b);kingEndured=b.powers.includes('king');actual=p.current-1;log(b,`堕天王：HP1で耐えた / 残り${b.lives}回`);}else if(b.markLife){b.markLife--;actual=p.current-1;b.used.endure=true;markUsed(b,'endure');log(b,'不屈の印：HP1で耐えた');}else{b.hp=0;combatNotice(b,'incomingHit',{damage:Math.floor(amount)});return amount;}}
 b.hp=Math.max(0,b.hp-actual*b.base.hp/p.hp);if(lethal){b.hp=1e-9;const newMax=playerStats(b).hp;b.hp=b.base.hp/newMax;}b.used.low ||= b.hp/b.base.hp<=.1;combatNotice(b,'incomingHit',{damage:Math.floor(actual)});const beforeMarkHeal=b.hp;triggerKingMark(b,kingEndured);if(b.hp!==beforeMarkHeal)combatNotice(b,'heal',{target:'player'});return actual;
}
export function heal(b,fraction){b.hp=Math.min(b.base.hp,b.hp+b.base.hp*fraction);combatNotice(b,'heal',{target:'player'});}
function markUsed(b,id){if(b.marks.includes(id)&&!b.used.marks.includes(id))b.used.marks.push(id);}
function tickMap(map){for(const k in map){map[k]--;if(map[k]<=0)delete map[k];}}
function erosion(b,amount){const before=b.erosion,maxBefore=enemyStats(b).hp;b.erosion=clamp(b.erosion+amount,0,divinityErosionCap(b));b.enemy.hp=Math.min(b.enemy.hp,enemyStats(b).hp);combatNotice(b,'erosion',{before,after:b.erosion,maxBefore,maxAfter:enemyStats(b).hp});}
function passiveStart(b){if(b.character!=='irena')return;const p=b.powers;if(p.some(x=>['abyss','abyssfallen','abyssking','abysswing','abyssjudge'].includes(x)))erosion(b,p.includes('abyss')?.06:.09);
 if(p.includes('god')){const r=b.hp/b.base.hp,m=r<=.05?4:r<=.25?3:r<=.5?2:1;if(m>1)buff(b,'godlow',2,{}, {multiplier:m});}
 if(p.includes('star'))heal(b,.05);
 if(b.marks.includes('endure'))markUsed(b,'endure');
}
export function stage(gauge){return Math.abs(gauge)>=100?3:Math.abs(gauge)>=60?2:Math.abs(gauge)>=30?1:0;}
export function available(b,action,route){if(b.result)return '戦闘終了';if(b.cd[action]>0)return `CT ${b.cd[action]}`;
 if(b.statuses.stun&&action!=='wait')return '行動不能：待機してください';
 if(['slash','guard','wait'].includes(action))return null;
 if(b.statuses.seal&&!(action==='purify'&&b.build.divinity?.schema===1))return '封印中：通常攻撃か防御を選択';
 const divReason=divinityAvailable(b,action);if(divReason!==undefined)return divReason;
 if(b.character==='irena'){if(action==='feather'||action==='power')return action==='power'&&!b.powers.length?'権能未装備':null;if(['pierce','volley'].includes(action))return b.marks.includes('split')?null:'羽撃ち分けを装備してください';if(action==='ultimate')return b.gauge>=100?null:'必殺ゲージ100%必要';return '使用できない技';}
 if(b.character==='stella'){if(action==='immortal')return null;if(action==='rebirth')return b.rebirths<3?null:'再誕を使い切りました';if(action==='meteor')return !b.meteor?null:'天象支配は1戦闘1回';return '使用できない技';}
 if(b.character==='final'){
 if(action==='divine'||action==='fallen')return null;
 if(action==='genesis'||action==='ending'){if(b.buffs.some(x=>x.id==='transcend'))return '絶界昇華中は権能を使用できません';if(b.balance!==(action==='genesis'?100:-100))return '対応ゲージ100が必要';if(route&&!['A','B','C'].includes(route))return 'ルートが不正です';return null;}
 const skill=FINAL_SKILLS[action];if(!skill)return '使用できない技';if(b.buffs.some(x=>x.id==='transcend'))return '絶界昇華中は権能を使用できません';
 if(skill.side&&(Math.sign(b.balance)!==skill.side||stage(b.balance)<(skill.stage||0)))return '対応する側の段階が不足';return null;
 }return '使用できません';}
export function attack(b,action,rng=Math.random,damageGate=null){let p=playerStats(b),e=enemyStats(b);const special=['feather','pierce','volley','power'].includes(action),feather=['feather','pierce','volley'].includes(action),ultimate=action==='ultimate';let mult=1,final=1,ignore=0,extra=0;const divineStrike=divinityStrikeProfile(b,action);final*=divineStrike.mult;ignore=Math.max(ignore,divineStrike.ignore);const tacticalRules=b.tacticalB||(b.lab20?.variant==='B'?b.lab20.rules:null);const markMultiplier=beginMarkAttack(b,action),strike=authorityStrikeEffect(b,action);final*=strike.final;ignore=Math.max(ignore,strike.ignore);
 if(feather){mult=1.95*(1+(b.build.skills.feather-1)*.07);if(action==='pierce')mult*=1.3;if(action==='volley')mult*=.7;if(b.powers.includes('wing'))final*=5;if(b.powers.some(x=>['fallenwing','kingwing','judgewing','abysswing'].includes(x)))final*=10;
 if(b.lastFeather&&b.lastFeather!==action&&['pierce','volley'].includes(action)){final*=1.15;log(b,'羽撃ち分け：交互連携＋15%');}b.lastFeather=action;if(action!=='feather')markUsed(b,'split');}
 if(action==='power')mult=2.4*(1+(b.build.skills.destruction-1)*.1);
 if(ultimate){mult=5.4*(1+(b.build.skills.ultimate-1)*.08);if(b.marks.includes('starfall')){final*=1.12;markUsed(b,'starfall');}}
 if(tacticalRules&&b.enemy.statuses.campaignArmor&&feather)final*=tacticalRules.shellFeather;if(tacticalRules&&b.enemy.statuses.researchExposed)final*=tacticalRules.exposed;if(b.powers.includes('star'))final*=2;
 const rank=badgeRank(b.build,b.build.badge);if(b.build.badge==='A')final*=[1,1.05,1.09,1.12][rank];if(b.build.badge==='B'){if(special)final*=[1,1.08,1.12,1.15][rank];if(ultimate)final*=[1,1,1.08,1.12][rank];}
 // Each equipped execution authority has its own hit-only counter; wing version only feathers.
 const judges=b.powers.filter(x=>['judge','fallenjudge','kingjudge','judgewing','abyssjudge'].includes(x)&& (x!=='judgewing'||feather));
 let total=0,hit=false;const hits=action==='volley'?2:1,parts=[];
 for(let shot=0;shot<hits&&b.enemy.hp>0;shot++){
  const landed=rng()>=clamp((e.spd-p.spd)/Math.max(1,e.spd)*.12,0,.12);hit ||= landed;let shotMult=mult,shotIgnore=ignore,shotExtra=extra,judgeTriggered=false;
  if(landed){if(tacticalRules&&b.enemy.statuses.campaignArmor&&['power','ultimate'].includes(action)){b.enemy.buffs=b.enemy.buffs.filter(x=>x.id!=='campaignArmor');delete b.enemy.statuses.campaignArmor;b.enemy.statuses.campaignSever=tacticalRules.duration;b.enemy.statuses.researchExposed=tacticalRules.duration;e=enemyStats(b);final*=tacticalRules.exposed;combatNotice(b,'armorBreak');}for(const id of judges){if((b.stacks[id]||0)>=2){if(id==='judge')judgeTriggered=true;shotMult*=id==='fallenjudge'?4:3;shotIgnore=Math.max(shotIgnore,id==='fallenjudge'?.9:.6);shotExtra+=b.enemy.hp*.2;if(id==='abyssjudge')shotMult*=1+b.erosion+Object.keys(b.enemy.statuses).length*.1;b.stacks[id]=0;log(b,'断罪発動：敵の攻撃前現在HP20%を加算');}else b.stacks[id]=(b.stacks[id]||0)+1;}}
  const judgeMark=judgeMarkMultiplier(b,judgeTriggered);const minimum=Math.max(1,...b.buffs.map(x=>x.minimum||1));const d=landed?damage(p.atk,e.def,{mult:shotMult,ignore:Math.max(shotIgnore,b.ignoreDefense?1:0),final:final*markMultiplier*judgeMark,extra:shotExtra*markMultiplier,minimum}):0;
  const applied=damageGate?damageGate(b,d,{action,shot,landed}):d;
  const actual=b.trial?.kind==='divinity'?Math.min(b.enemy.hp,applied):d;
  b.enemy.hp=Math.max(0,b.enemy.hp-applied);total+=actual;parts.push(actual);b.events.push({type:'hit',damage:actual,...(b.trial?.kind==='divinity'?{landed}:{})});combatNotice(b,'hit',{damage:actual,hitIndex:shot,landed});
 }
 b.lastDamage=total;log(b,`${action==='slash'?'斬撃':action==='ultimate'?'超堕天撃':action==='power'?'破壊の権能':action==='pierce'?'穿羽':action==='volley'?'連羽 ×2':'黒翼・羽弾'} → ${hit?parts.map(x=>x.toLocaleString()).join(' ＋ ')+' ダメージ':'回避された'}`);
 if(hit&&feather&&b.powers.includes('abysswing'))erosion(b,.09);
 if(hit&&strike.heal){heal(b,strike.heal);log(b,'堕天王の権能：最大HP12%回復');}
 if(hit&&strike.erosion){const before=b.erosion;erosion(b,strike.erosion);combatNotice(b,'authorityEffect',{authority:'abyss',text:'追加侵食＋'+Math.round((b.erosion-before)*100)+'%'});log(b,'深淵の権能：追加侵食 '+Math.round((b.erosion-before)*100)+'%');}
 if(hit&&strike.final>1)combatNotice(b,'authorityEffect',{authority:'fallen',text:'堕天＋'+Math.round((strike.final-1)*100)+'%'});
 if(hit&&strike.ignore)combatNotice(b,'authorityEffect',{authority:'judge',text:'防御60%無視'});
 const gaugeBefore=b.gauge;let actualBonus=0;
 if(special)b.used.special++;if(ultimate){b.used.ultimate++;b.gauge=0;}else{const gain=feather?39:26,normalGauge=Math.min(100,b.gauge+Math.round(gain));b.gauge=Math.min(100,b.gauge+Math.round(gain)+(hit?strike.gauge:0));actualBonus=b.gauge-normalGauge;}
 if(hit&&strike.gauge){combatNotice(b,'authorityEffect',{authority:'wing',text:'必殺＋'+(b.gauge-gaugeBefore)+'（追加＋'+actualBonus+(actualBonus<strike.gauge?'/20・上限':'')+'）',actualBonus,gaugeGain:b.gauge-gaugeBefore});log(b,'黒翼の権能：必殺ゲージ追加＋20（上限100%）');}
 if(special)b.cd[action]=action==='pierce'?3:action==='volley'?2:action==='power'?3:2;
}
export function finalAction(b,action,route){if(action==='divine'||action==='fallen'){b.balance=clamp(b.balance+(action==='divine'?15:-15),-100,100);log(b,`${action==='divine'?'神化':'堕天'}：${b.balance>0?'+':''}${b.balance} / 段階${stage(b.balance)}`);return;}
 const skill=FINAL_SKILLS[action];if(skill?.side&&skill.mul){buff(b,action,skill.duration,skill.mul,{minimum:skill.minimum||0});b.cd[action]=skill.ct;if(action==='dominion')b.statuses={};if(action==='release')b.hp=Math.max(1,b.hp-b.base.hp*.12);log(b,skill.name+' 発動');return;}
 if(action==='transcend'){buff(b,action,3,skill.mul);b.cd[action]=4;log(b,'絶界昇華：三大権能を封鎖');return;}
 if(action==='grasp'){b.hp=b.base.hp;delete b.statuses.pressure;buff(b,'grasp',Infinity,{spd:1000,atk:b.turn<=3?.6:Math.min(5,1+b.turn*.16)});b.enemyStop=Math.max(b.enemyStop,1);b.cd.annihilate=0;b.cd.grasp=FINAL_SKILLS.grasp.ct;log(b,'理外掌握：全回復・敵停止・発動時攻撃倍率固定');return;}
 let min=action==='annihilate'?5000:2000,p=playerStats(b),e=enemyStats(b);const d=damage(p.atk,e.def,{mult:action==='annihilate'?5:3,ignore:action==='annihilate'||b.ignoreDefense?1:0,minimum:Math.max(min,...b.buffs.map(x=>x.minimum||1))});b.enemy.hp=Math.max(0,b.enemy.hp-d);b.lastDamage=d;combatNotice(b,'hit',{damage:d,hitIndex:0,landed:true});log(b,`${action==='annihilate'?'終極殲滅':action==='genesis'?'創世':'終焉'} ${d.toLocaleString()} ダメージ`);
 if(action==='annihilate'){b.cd.annihilate=5;b.pendingStun=1;b.statuses.slow=3;return;}
 b.cd[action]=5;
 if(action==='genesis'){if(route==='A')buff(b,'divineMight',2,{atk:3,def:3,spd:3});if(route==='B')b.enemyStop=Math.max(b.enemyStop,1);if(route==='C')b.cd={};}
 else{if(route==='A')b.ignoreDefense=3;if(route==='B'){b.enemy.buffs=[];b.noBuff=10;}if(route==='C'){delete b.statuses.pressure;b.noPressure=5;}}
 log(b,`ルート ${route} 解決（追加攻撃なし）`);
}
function phase(b){if(!['ex','stella','final','god'].includes(b.mode))return;const ratio=b.enemy.hp/b.enemy.base.hp,newPhase=ratio<=.33?3:ratio<=.67?2:1;if(newPhase>b.enemy.phase){b.enemy.phase=newPhase;if(newPhase===3)b.phaseTurns=0;log(b,`第${newPhase}形態へ移行。HPは継続`);if(newPhase>=2&&!b.noBuff)b.enemy.buffs=[{mul:{atk:1.2},remaining:9999}];combatNotice(b,'phaseChange');}}
export function enemyTurn(b,guard,rng){if(b.enemy.hp<=0||b.hp<=0)return;
 combatNotice(b,'enemyAction');
 if(b.enemyStop>0){b.enemyStop--;combatNotice(b,'enemyStopped');log(b,'敵の通常行動を停止');return;}
 if(b.enemy.statuses.stun){combatNotice(b,'enemyStopped');log(b,'敵はスタンしている');return;}
 const p=playerStats(b),e=enemyStats(b),evasion=clamp((p.spd/e.spd-1)*.06,0,.65);
 if(rng()<evasion){combatNotice(b,'enemyMiss');log(b,'速度優位：敵の攻撃を回避');return;}
 const stellaEnemyScale=b.mode==='stella'?(b.difficulty==='EXPERT'?1.2:b.difficulty==='NIGHTMARE'?1.4:1):1;
 let raw=b.mode==='stella'?[440,640,880][b.enemy.phase-1]*stellaEnemyScale:e.atk*(b.enemy.phase===2?1.12:b.enemy.phase===3?1.35:1);
 let d=b.mode==='stella'?raw:damage(raw,p.def,{mult:b.turn%4===0?1.35:1});if(guard)d=Math.max(1,Math.round(d*.3));if(b.build.badge==='C'&&badgeRank(b.build,'C')===3)d*=.92;
 b.enemyDamage=Math.floor(dealPlayer(b,d));log(b,`敵の${b.turn%4===0?'重撃':'反撃'} → ${Math.floor(d).toLocaleString()}`);
 if(b.powers.includes('kingjudge'))b.stacks.kingjudge=Math.min(2,(b.stacks.kingjudge||0)+1);
 if(b.hp>0&&!b.noPressure&&b.enemy.phase>=2&&b.turn%4===0){b.statuses.pressure=3;log(b,'重圧：攻撃力低下');}
 if(b.hp>0&&b.mode==='ex'&&b.enemy.phase===2&&b.turn%5===0){b.statuses.seal=2;log(b,'第二形態：権能封印');}
}
export function act(b,action,{route='A',rng=Math.random,enemyAction=enemyTurn,damageGate=null}={}){
 const reason=available(b,action,route);if(reason)throw Error(reason);const rolls=[],originalRng=rng;rng=()=>{const value=originalRng();rolls.push(value);return value;};b.events=[];b.lastDamage=0;b.enemyDamage=0;b.lastAction=action;
 if(b.character==='irena'){markState(b);b.enemy.markTurns=(b.enemy.markTurns||0)+1;}passiveStart(b);combatNotice(b,'passive');b.used.low ||= b.hp/b.base.hp<=.1;
 divinityBefore(b,action);const guarding=action==='guard'||divinityIsGuard(b,action);
 const early=enemyStats(b).spd>playerStats(b).spd;
 // Enemy-first turns allow immortality/guard to resolve defensively before incoming damage.
 if(action==='immortal')b.statuses.invulnerable=1;
 if(early)enemyAction(b,guarding,rng);
 if(b.hp>0){combatNotice(b,'playerAction',{action});if(action==='wait'){log(b,'反動で行動できない');}
 else if(action==='guard'){markGuard(b);b.gauge=Math.min(100,b.gauge+18);log(b,'防御：被ダメージ70%軽減');}
 else if(performDivinityAction(b,action,rng,damageGate)){}
 else if(b.character==='final'&&!['slash'].includes(action))finalAction(b,action,route);
 else if(b.character==='stella'){
 if(action==='immortal'){b.cd.immortal=4;log(b,'不滅：このターン完全無敵');}
 else if(action==='rebirth'){const fractions=[1,.5,.25];heal(b,fractions[b.rebirths]);log(b,`再誕 ${Math.round(fractions[b.rebirths]*100)}%回復`);b.rebirths++;}
 else if(action==='meteor'){b.enemy.hp=Math.max(0,b.enemy.hp-5000);b.lastDamage=5000;b.meteor=true;b.used.special++;combatNotice(b,'hit',{damage:5000,hitIndex:0,landed:true});log(b,'天象支配：隕石 5,000 ダメージ');}
 else attack(b,'slash',rng);
 }else attack(b,action,rng,damageGate);}
 phase(b);
 if(!early&&b.hp>0&&b.enemy.hp>0)enemyAction(b,guarding,rng);
 // Phase deadlines are measured in full rounds, irrespective of speed and normal-action stops.
 if(['ex','final'].includes(b.mode)&&b.enemy.phase===3&&b.enemy.hp>0){b.phaseTurns++;if(b.phaseTurns>=BALANCE.exLimit){b.hp=0;combatNotice(b,'deadline');log(b,'終末判定：通常停止・無敵・耐性を貫通');}}
 if(b.enemy.hp<=0&&b.hp>0)b.result='win';else if(b.hp<=0)b.result='lose';
 tickMap(b.cd);tickMap(b.statuses);tickMap(b.enemy.statuses);if(b.noBuff)b.noBuff--;if(b.noPressure)b.noPressure--;if(b.ignoreDefense)b.ignoreDefense--;
 const ended=[];b.buffs=b.buffs.filter(x=>{x.remaining--;if(x.remaining<=0){ended.push(x.id);return false;}return true;});
 if(ended.includes('transcend')){b.pendingStun=1;b.statuses.fragile=3;log(b,'絶界昇華の反動：次ターン停止・防御半減');}if(ended.includes('sovereignty'))b.pendingStun=1;
 if(b.pendingStun){b.statuses.stun=b.pendingStun;delete b.pendingStun;}
 divinityAfter(b,action);
 if(b.result)log(b,b.result==='win'?'VICTORY — 再誕への一歩':'DEFEAT — 力を整え、再び');else b.turn++;
 combatNotice(b,'turnEnd');
 if(!b.test&&b.character==='irena')b.replay.push({action,rolls});
 if(!b.test&&b.character!=='irena')recordSpecialBattleAction(b,{action,rolls,...(b.character==='final'?{route}:{})});
 return b;
}
export function settle(s,b){if(!b.result||b.settled)return null;b.settled=true;
 const empty={p:0,fragments:0,bonusP:0,sp:0,levels:0,resShards:0,achievements:[],unlocks:[]};if(b.test)return {test:true,...empty};
 // Report actual changes without adding any fields to the persistent save format.
 const before={p:s.p,sp:s.sp,level:s.level,resShards:s.resShards,achieved:new Set(s.achieved),powers:{...s.powers},lv50:s.cleared.includes(50),lv100:s.flags.lv100,ex:s.flags.ex,final:s.flags.final};
 const summary=(fragments=0,bonusP=0)=>{const unlocks=[];
  for(const id of ['fallen','king','judge','star'])if(!before.powers[id]&&s.powers[id])unlocks.push(id);
  if(!before.lv50&&s.cleared.includes(50))unlocks.push('resonance');
  if(!before.lv100&&s.flags.lv100)unlocks.push('mystery');if(!before.ex&&s.flags.ex)unlocks.push('god');if(!before.final&&s.flags.final)unlocks.push('final');
  return {p:s.p-before.p,fragments,bonusP,sp:s.sp-before.sp,levels:s.level-before.level,resShards:s.resShards-before.resShards,achievements:s.achieved.filter(id=>!before.achieved.has(id)),unlocks};};
 s.counts.special+=b.used.special;s.counts.ultimate+=b.used.ultimate;for(const m of b.used.marks)if(!s.markUsed.includes(m))s.markUsed.push(m);if(b.result==='lose'){s.counts.streak=0;achievements(s);if(b.mode==='god')s.gauntlet=null;return summary();}
 const reward=35+b.floor*5+(b.mode==='ex'?500:b.mode==='stella'?800:b.mode==='final'?1200:0);s.p+=reward;s.counts.wins++;s.counts.streak++;
 for(const m of b.used.marks)if(!s.markUsed.includes(m))s.markUsed.push(m);
 s.records.fast ||= b.turn<=5;s.records.low ||= b.used.low;s.records.expert ||= ['EXPERT','NIGHTMARE'].includes(b.difficulty);s.records.basic ||= b.character==='irena'&&b.used.special===0&&b.used.ultimate===0;s.records.endure ||= b.used.endure;s.records.nomark ||= b.marks.length===0;s.records.nopower ||= b.powers.length===0&&b.character==='irena';s.records.starfinish ||= b.used.marks.includes('starfall')&&b.lastAction==='ultimate'&&b.lastDamage>0;
 // Award fragments to ALL five types so consumed authorities can always be rebuilt.
 for(const id of Object.keys(s.fragments))s.fragments[id]+=4+Math.floor(b.floor/10);s.resShards+=3;
 if(b.mode==='normal'){
 const first=!s.cleared.includes(b.floor);if(first){s.cleared.push(b.floor);s.level=Math.max(s.level,b.floor+1);s.floor=Math.min(100,Math.max(s.floor,b.floor+1));}
 for(const [level,id]of [[5,'fallen'],[10,'king'],[20,'judge']])if(b.floor>=level&&!s.powerHistory.includes(id)){s.powers[id]=1;s.powerHistory.push(id);}
 if(b.floor===100){s.flags.lv100=true;if(!s.flags.reward100){s.sp+=50;s.flags.reward100=true;}}
 }
 if(b.mode==='ex'){s.flags.ex=true;if(!s.flags.exReward){s.p+=100;s.flags.exReward=true;}}
 if(b.mode==='stella'){s.flags.stellaClear=true;s.flags.final=true;}
 if(b.mode==='final')s.flags.finalClear=true;
 if(b.mode==='god'&&s.gauntlet){const g=s.gauntlet;g.materials+=5;g.unique[g.index]++;if(g.index===4){s.godMaterials+=g.materials+5;g.unique.forEach((n,i)=>s.godUnique[i]+=n);s.medals++;s.gauntlet=null;}else g.index++;}
 const coopGains=grantCooperationBattle(s,b);
 achievements(s);return {...summary(4+Math.floor(b.floor/10),s.p-before.p-reward),...(coopGains.length?{cooperation:coopGains}:{})};
}
