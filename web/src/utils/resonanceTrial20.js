import {RESONANCES,RESONANCE_BY_ID,resonanceState,learnResonance} from '../data/resonanceV3.js';
import {startBattle,act,baseStats,enemyTurn,dealPlayer,log,playerStats} from './gameCore.js';
import {syncDivinityLives} from './divinityCombat.js';
import {SUMMON_WIN_REWARD,summonBalance} from './resonanceSummon.js';

const BOSS_NAMES={
 1:'黒翼を狩る白騎士',3:'傷を映す堕天使',5:'名を記す審問官',
 7:'二つの仮面を持つ騎士',9:'逆流の祭司',11:'天秤の断罪者',
 13:'空位の王冠',15:'封印を守る五つの残響',
 17:'自ら封印した、もう一人のいれーな',19:'静寂の門',20:'選択を喰らう神座'
};
const STORY={
 1:{
  intro:['黒翼「この騎士、羽を全部読んでる！？」','断罪「……黒翼に触れるな！」','断罪が一人で飛び込むが、その攻撃も読まれてしまう。','黒翼「今度は私が助ける！ 一緒に戦おう！」'],
  moment:['黒翼と断罪が互いの隙を埋め、羽根と裁きがひとつになる。']
 },
 3:{
  intro:['堕天が傷つくほど、敵もその強さを模倣していく。','深淵は敵の模倣そのものを侵食しようとする。'],
  moment:['堕天「深淵！ 今こそ私たちの力を合わせる時だ！」','深淵「……うん。手伝う。」','堕天「なっ……そんなにあっさり！？」','深淵「……嫌だった？」','堕天「そんなわけがあるか！！」','深淵「……声、大きい。」']
 },
 5:{intro:['審問官は使われた技を記録し、同じ技には即座に対応する。'],moment:['黒翼「同じ攻撃がダメなら、毎回変えちゃえばいいんだよ！」','堕天「……ならば私の力で、その羽を限界まで加速させてやろう！」']},
 7:{intro:['二つの仮面を持つ騎士。攻撃と防御を入れ替えてくる。'],moment:['堕天王「守ることも攻撃につながる。私が機会を作る。」','黒翼「そっか！ じゃあ任せて！」']},
 9:{intro:['祭司は侵食するほど強くなる。予告の逆流を見極めろ。'],moment:['黒翼「一気にたくさん送ったら？」','深淵「……壊れるかも。」','黒翼「じゃあ決まり！」']},
 11:{intro:['天秤は同じ行動を罪として記録する。異なる行動で証を積め。'],moment:['堕天「命令するな！」','断罪「勝ちたくないのか？」','堕天「……今回だけだぞ！」']},
 13:{intro:['空位の王冠。予告の大技を防ぐだけでも、攻めるだけでも勝てない。'],moment:['堕天王「私が防ぐ。お前は機会を待て。」','断罪「……待つ必要はない。守った瞬間こそ、裁きの時だ。」']},
 15:{intro:['五つの残響が順に姿を変え、一つの敵の中で五権能を模倣する。'],moment:['堕天王「私が耐える。お前は無理をするな。」','深淵「……わかった。じゃあ、全部弱くする。」','堕天王「全部……？」','深淵「……全部。」']},
 17:{intro:['もう一人のいれーなは、繰り返す行動から戦い方を学んでいく。'],moment:['堕天王「敵の最大攻撃を一度受け止める。」','堕天「ハッ！ 面白い！」']},
 19:{intro:['何度壊しても再生する門。侵食と裁きの同時成立が必要だ。'],moment:['断罪「……そこか。」','深淵「……うん。」','断罪「では、始める。」','深淵「……もう始めてる。」']},
 20:{intro:['神座「選べ。ひとつの力を。それ以外は捨てよ。」','黒翼「なんで？ みんなで戦えばいいじゃん！」','五重封印を破るには五権能すべての力が必要だ。'],
  moment:['堕天王「誰一人として欠ける必要はない。」','深淵「……全部使えばいいのに。」','五権能が揃い、神座が崩れ始める。']}
};
export const RESONANCE_TRIAL_BOSSES=BOSS_NAMES;
export function resonanceTrialReason(s){
 if(!s?.divinity?.cooperation)return '五権能が必要です';
 return s.divinity.infiniteWins>=1?null:'既存の「無窮の神座」を突破すると解放';
}
export function currentResonanceFloor(s){return resonanceState(s).floor;}
export function startResonanceTrial(s){
 const reason=resonanceTrialReason(s);if(reason)throw Error(reason);
 const progress=resonanceState(s),floor=progress.floor;
 if(floor<1||floor>20)throw Error('試練の進行が不正です');
 const boss=RESONANCES.find(r=>r.floor===floor),name=BOSS_NAMES[floor]||'神座の試練者';
 // This trial is independent of the main story. Battle origin is a valid normal battle,
 // then a distinct trial marker switches rewards/progression to the trial handler.
 const b=startBattle(s,{mode:'normal',floor:20,test:false});
 b.floor=floor;
 b.powers=boss?[...boss.parts]:[...s.equipped];
 b.base=baseStats({...s,equipped:b.powers});
 b.hp=b.base.hp;
 syncDivinityLives(b);
 const attack=playerStats(b).atk;
 const maxHp=Math.max(3500,Math.floor(attack*(11+floor*3)));
 const enemy={hp:maxHp,atk:Math.max(15,Math.floor(b.base.hp*(.045+floor*.002))),def:Math.max(40,Math.floor(attack*.65)),spd:Math.max(5,Math.floor(b.base.spd*.7))};
 b.enemy={name,base:enemy,hp:enemy.hp,phase:1,buffs:[],statuses:{}};
 b.trial={kind:'resonance20',floor,tempId:boss?.id||null,proven:false,tempUsed:false,
  actions:[],seals:[],previous:null,sequence:0,focus:0,announced:false};
 b.log=['神座への試練・第'+floor+'階：'+name,...(STORY[floor]?.intro||[])];
 return b;
}
function trialEnemyTurn(b,guard,rng){
 const t=b.trial,floor=t.floor;
 if(floor===1&&t.previous&&['feather','pierce','volley'].includes(t.previous)){
  b.enemy.buffs=[{mul:{def:1.3},remaining:1}];
  log(b,'白騎士は羽の軌道を読み、盾を構えた');
 }
 if([5,11,17].includes(floor)&&t.previous&&t.actions.filter(a=>a===t.previous).length>=2){
  log(b,'繰り返した行動への対策が始まる');
  b.enemy.base.atk=Math.min(b.base.hp*.3,b.enemy.base.atk*1.08);
 }
 if(floor===3&&b.hp/b.base.hp<=.5){
  b.enemy.base.atk=Math.min(b.base.hp*.25,b.enemy.base.atk*1.04);
  log(b,'堕天使は逆境の力を模倣した');
 }
 if(floor===7){b.enemy.base.def=Math.max(1,b.enemy.base.def*(b.turn%2===0?1.25:.8));}
 if(floor===9&&(b.erosion||b.enemy.resonanceCorrosion||0)>.25&&!guard){
  b.enemy.base.atk=Math.min(b.base.hp*.3,b.enemy.base.atk*1.05);
  log(b,'逆流の祭司は侵食を吸収した');
 }
 if(floor===15)log(b,'残響は'+['黒翼','堕天王','深淵','堕天','断罪'][Math.floor((b.turn-1)/2)%5]+'の姿を映した');
 enemyTurn(b,guard,rng);
 if(floor===19&&b.enemy.hp>0&&!b.enemy.resonanceCorrosion){
  b.enemy.hp=Math.min(b.enemy.base.hp,b.enemy.hp+b.enemy.base.hp*.08);
  log(b,'静寂の門が再生した');
 }
}
function trialGate(b,raw,{action}={}){
 const t=b.trial;
 if(t.floor===20&&t.seals.length<5)return Math.min(raw,Math.max(0,b.enemy.hp-b.enemy.base.hp*.15));
 if(t.tempId&&!t.tempUsed&&!(action==='res_'+t.tempId&&t.proven))
  return Math.min(raw,Math.max(0,b.enemy.hp-b.enemy.base.hp*.18));
 return raw;
}
function roleSeal(b,action,record){
 const t=b.trial,add=id=>{if(!t.seals.includes(id))t.seals.push(id);};
 if(action.startsWith('res_')&&b.events.some(x=>x.type==='resonance')){
  const row=RESONANCE_BY_ID[action.slice(4)];
  // Defensive cooperative effects count only when their effect is actually created.
  if(row&&((b.lastDamage>0)||['guard','royalJudgment','abyssBarrier','survival','silence'].includes(row.kind)))
   row.parts.forEach(add);
 }
 if(['feather','pierce','volley'].includes(action)&&b.lastDamage>0)add('wing');
 if(action==='guard'&&b.enemyDamage>0)add('king');
 if((b.erosion||0)>0||(b.enemy.resonanceCorrosion||0)>0)add('abyss');
 if(b.hp/b.base.hp<=.5&&b.lastDamage>0)add('fallen');
 if((b.divine?.proof||0)>0&&b.lastDamage>0)add('judge');
 if(t.seals.length===5&&!t.announced){t.announced=true;for(const line of STORY[20].moment)log(b,line);}
}
export function actResonanceTrial(b,action,options={}){
 if(b.trial?.kind!=='resonance20')throw Error('共鳴試練ではありません');
 const t=b.trial,prevTurn=b.turn;
 const beforeUsed=b.events.length;
 act(b,action,{...options,enemyAction:trialEnemyTurn,damageGate:trialGate});
 if(b.result==='lose')return b;
 // The final altar cannot be defeated by an indirect counter before all five seals break.
 if(t.floor===20&&t.seals.length<5&&b.enemy.hp<b.enemy.base.hp*.15){b.enemy.hp=b.enemy.base.hp*.15;b.result=null;}
 t.actions.push(action);if(t.actions.length>12)t.actions.shift();
 if(t.floor===20)roleSeal(b,action);
 else if(t.tempId){
  if(action==='res_'+t.tempId&&b.events.some(x=>x.type==='resonance'))t.tempUsed=true;
  if(!t.proven){
   const different=new Set(t.actions.filter(x=>!x.startsWith('res_')&&x!=='wait'));
   const attacks=t.actions.filter(x=>x==='slash'||x==='feather'||x==='power'||x==='pierce'||x==='volley');
   const defended=t.actions.includes('guard');
   if(different.size>=2&&(t.floor===1?attacks.includes('feather')&&attacks.includes('slash'):
     [7,13,15].includes(t.floor)?defended&&attacks.length>=1:attacks.length>=2)){
    t.proven=true;
    b.gauge=100;
    for(const line of STORY[t.floor]?.moment||[])log(b,line);
    log(b,'共鳴の兆し。必殺ゲージ100%となり、初めての共鳴技を使える。');
   }
  }
 }
 t.previous=action;
 if(t.floor===20&&t.seals.length<5&&b.enemy.hp<b.enemy.base.hp*.15){b.enemy.hp=b.enemy.base.hp*.15;b.result=null;}
 if(b.enemy.hp<=0&&b.hp>0)b.result='win';
 return b;
}
export function settleResonanceTrial(s,b){
 const t=b?.trial;if(t?.kind!=='resonance20'||!b.result||b.settled)return null;
 const reward={p:0,sp:0,fragments:0,levels:0,bonusP:0,achievements:[],unlocks:[],resShards:0,summonPoints:0};
 if(b.test||b.result!=='win'){b.settled=true;return reward;}
 const d=resonanceState(s),floor=t.floor;
 if(floor!==d.floor)throw Error('共鳴試練の進行が一致しません');
 if(floor===20&&t.seals.length!==5)throw Error('五重封印を解除していません');
 if(t.tempId&&(!t.proven||!t.tempUsed))throw Error('共鳴が成立していません');
 b.settled=true;
 if(!d.cleared.includes(floor))d.cleared.push(floor);
 if(t.tempId&&learnResonance(s,t.tempId))reward.unlocks.push(RESONANCE_BY_ID[t.tempId].name);
 reward.resShards=10+floor*2;s.resShards+=reward.resShards;
 reward.summonPoints=SUMMON_WIN_REWARD;s.summonPoints=summonBalance(s)+SUMMON_WIN_REWARD;
 d.floor=Math.min(20,floor+1);
 if(floor===20){d.finished=true;reward.unlocks.push('神座への試練 制覇');}
 return reward;
}
