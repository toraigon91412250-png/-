// Five authority personalities and cooperation. Kept separate from the original
// authority levels and ordinary saves so legacy progression remains reversible.
import {DIV_IDS,DIV_NAMES} from '../data/divinity.js';

export const COOP_START={wing:70,king:60,abyss:25,fallen:15,judge:5};
export const COOP_CAP_0={wing:80,king:70,abyss:40,fallen:30,judge:20};
export const COOP_CAP_1={wing:90,king:85,abyss:65,fallen:60,judge:55};
export const COOP_STYLES={
 wing:'羽弾系の攻撃を命中させる',king:'予告重撃を防ぐ',fallen:'HP50%以下で攻撃する',
 judge:'証を蓄積した強化攻撃を命中させる',abyss:'侵食を与えて敵を弱体化させる'
};
const valid=id=>DIV_IDS.includes(id);
export function cooperationEnabled(s){return !!s?.divinity?.cooperation;}
export function cooperationCap(s,id){
 const tier=s?.divinity?.cooperationTrials?.[id]||0;
 return tier>=2?100:tier===1?COOP_CAP_1[id]:COOP_CAP_0[id];
}
export function cooperationTier(s,id){return s?.divinity?.cooperationTrials?.[id]||0;}
export function cooperationTrialReason(s,id){
 if(!cooperationEnabled(s)||!valid(id))return '協力システムが必要です';
 const tier=cooperationTier(s,id),rate=s.divinity.cooperation[id];
 if(tier>=2)return 'すべての協力試練を突破済み';
 if(tier===0){
  if(!s.cleared.includes(5))return '本編第5階層を突破';
  if(rate<COOP_CAP_0[id])return `${DIV_NAMES[id]}の協力率を${COOP_CAP_0[id]}%まで育てる（現在${rate.toFixed(1)}%）`;
 }else{
  if(!s.cleared.includes(15))return '本編第15階層を突破';
  if(rate<COOP_CAP_1[id])return `${DIV_NAMES[id]}の協力率を${COOP_CAP_1[id]}%まで育てる（現在${rate.toFixed(1)}%）`;
 }
 return null;
}
export function activateCooperation(s){
 if(!s?.divinity)throw Error('神格データがありません');
 if(cooperationEnabled(s))return s;
 s.divinity.cooperation={...COOP_START};s.divinity.cooperationTrials={};
 // Previously earned development is never confiscated. This also avoids
 // lowering a veteran's effective authority level after migration.
 for(const id of DIV_IDS){
  const level=s.powers[id]||0;
  if(level>1||s.divinity.reclaimed.includes(id)){
   s.divinity.cooperation[id]=Math.max(COOP_START[id],level>=5?COOP_CAP_1[id]:level>=3?COOP_CAP_0[id]:COOP_START[id]);
   if(level>=5)s.divinity.cooperationTrials[id]=1;
  }
  s.powers[id]=Math.max(1,level);
  if(!s.powerHistory.includes(id))s.powerHistory.push(id);
  if(!s.divinity.reclaimed.includes(id))s.divinity.reclaimed.push(id);
 }
 if(!s.equipped.length)s.equipped=['wing','king'];
 s.divinity.notice='五つの権能は最初から共にいる。協力率と試練によって、貸してくれる力が変化します。旧育成・装備・素材は保持しました。';
 return s;
}
export function normalizeCooperation(s){
 if(!cooperationEnabled(s))return;
 for(const id of DIV_IDS){
  const tier=s.divinity.cooperationTrials?.[id];
  if(tier!==undefined&&(!Number.isInteger(tier)||tier<0||tier>2))throw Error('協力試練の保存形式が不正です');
  const rate=s.divinity.cooperation[id];
  if(typeof rate!=='number'||!Number.isFinite(rate)||rate<COOP_START[id]||rate>100)throw Error('協力率の保存形式が不正です');
  s.divinity.cooperation[id]=Math.min(rate,cooperationCap(s,id));
 }
}
export function grantCooperationTrial(s,id,tier){
 if(!valid(id)||!cooperationEnabled(s)||cooperationTrialReason(s,id)!==null||tier!==cooperationTier(s,id)+1)throw Error('試練の進行が一致しません');
 s.divinity.cooperationTrials[id]=tier;
 s.divinity.cooperation[id]=Math.min(cooperationCap(s,id),Math.round((s.divinity.cooperation[id]+10)*10)/10);
 return s.divinity.cooperation[id];
}
export function registerCooperationAction(b,action){
 if(!cooperationEnabled(b.build)||b.character!=='irena')return;
 const d=b.divine; if(!d)return;
 const skills={feather:'wing',pierce:'wing',volley:'wing',plume:'wing',thousandWings:'wing',mantle:'wing',
 abyssTide:'abyss',abyssEnd:'abyss',fallenOath:'fallen',fallenEnd:'fallen',
 verdict:'judge',judgment:'judge',royalGuard:'king',royalReturn:'king'};
 const id=skills[action]||(action==='power'?b.powers[0]:null);
 const progress=d.cooperation ||= {actions:{},special:{}};
 if(id&&b.powers.includes(id)){
  progress.actions[id]=(progress.actions[id]||0)+1;
  const good=id==='wing'?b.lastDamage>0:id==='king'?d.guardAction&&b.enemyDamage>0:
   id==='fallen'?b.hp/b.base.hp<=.5&&b.lastDamage>0:id==='judge'?b.lastDamage>0&&['verdict','judgment'].includes(action):
   id==='abyss'?b.erosion>0&&b.lastDamage>0:false;
  if(good)progress.special[id]=true;
 }
}
export function grantCooperationBattle(s,b){
 if(!cooperationEnabled(s)||b.result!=='win'||b.test||b.trial||b.character!=='irena')return [];
 const track=b.divine?.cooperation;if(!track)return [];
 const boss=b.floor%5===0||b.mode==='ex';const results=[];
 for(const id of Object.keys(track.actions)){
  if(!valid(id)||!track.actions[id])continue;
  const before=s.divinity.cooperation[id],cap=cooperationCap(s,id);
  const gain=(boss?1.5:.5)+(track.special[id]?.5:0);
  const next=Math.min(cap,Math.round((before+gain)*10)/10);
  if(next>before){s.divinity.cooperation[id]=next;results.push(`${DIV_NAMES[id]} +${(next-before).toFixed(1)}%`);}
 }
 return results;
}
export function canZeroRelease(s){return cooperationEnabled(s)&&DIV_IDS.every(id=>s.divinity.cooperation[id]>50);}
export function cooperationStrikeMultiplier(s,id){
 const rate=s?.divinity?.cooperation?.[id];return rate==null?1:rate>=76?1.15:rate>50?1.08:rate>25?1.03:1;
}
// Deterministic, non-blocking character exchanges. Authority names remain the
// canonical labels until the user chooses individual character names.
const BANTER_PAIRS={
 'wing:abyss':[
  [['黒翼','深淵！ 次の攻撃、見ててね！'],['深淵','……さっきから見てる。たぶん。']],
  [['黒翼','私の羽、何枚あると思う？'],['深淵','……途中で数えるのをやめた。']],
  [['深淵','……羽が落ちた。'],['黒翼','落ちたんじゃなくて、飛ばしたの！']]
 ],
 'wing:fallen':[
  [['黒翼','堕天も一緒に戦おうよ！'],['堕天','馴れ合うな。勝手に動く。']],
  [['黒翼','今の、ちょっと格好よかったよ！'],['堕天','……評価など求めていない。']],
  [['堕天','お前は少し騒がしすぎる。'],['黒翼','そう？ もっと元気にするね！']]
 ],
 'wing:judge':[
  [['黒翼','断罪！ 今の羽、見てた？'],['断罪','……当然だ。完璧な一撃だった。']],
  [['黒翼','断罪もすごかったよ！'],['断罪','……そ、そうか。いや、当然だ。']],
  [['断罪','黒翼の攻撃判断には一点の曇りもない。'],['黒翼','ありがと！ 一緒に頑張ろ！']]
 ],
 'wing:king':[
  [['黒翼','堕天王！ 次は全力でいくよ！'],['堕天王','構わん。だが敵の予告は見ろ。']],
  [['黒翼','守ってくれてありがと！'],['堕天王','守るのが私の役目だ。行け。']],
  [['堕天王','黒翼、少し落ち着け。'],['黒翼','落ち着いてるよ！ いつもより！']]
 ],
 'abyss:fallen':[
  [['堕天','深淵！ 今の一撃を見たか！'],['深淵','……見てなかった。']],
  [['堕天','今度こそ私の強さを認めるだろう！'],['深淵','……敵のHPが減った。']],
  [['深淵','……堕天。'],['堕天','な、何だ！？'],['深淵','……そこ、邪魔。']],
  [['堕天','私の戦い方をどう思う？'],['深淵','……音が大きい。']]
 ],
 'abyss:judge':[
  [['深淵','……断罪、黒翼を見すぎ。'],['断罪','戦況を確認していただけだ。']],
  [['断罪','貴様は何を観測している？'],['深淵','……断罪のひいき。']],
  [['深淵','……黒翼の話になると声が違う。'],['断罪','違わん。黙れ。']]
 ],
 'abyss:king':[
  [['堕天王','深淵、次の敵の動きは？'],['深淵','……まだ動いてない。']],
  [['深淵','……静かにして。'],['堕天王','……私まで騒がしい扱いか。']],
  [['堕天王','観測結果を報告してくれ。'],['深淵','……蝶はいなかった。']]
 ],
 'fallen:judge':[
  [['堕天','何だ、その偉そうな顔は。'],['断罪','貴様にだけは言われたくない。']],
  [['断罪','黒翼ならもっと鮮やかに仕留める。'],['堕天','比較対象が毎回黒翼なのはなぜだ！？']],
  [['堕天','いれーなの命令など聞く気はない。'],['断罪','同感だ。だが負けるのも癪だ。']]
 ],
 'fallen:king':[
  [['堕天王','無茶な攻撃で命を削るな。'],['堕天','この程度で止めるな。']],
  [['堕天','守ってばかりでは勝てんぞ！'],['堕天王','生きていなければ勝てん。']],
  [['堕天王','堕天、深淵の方ばかり見るな。'],['堕天','見ていない！ 敵を見ている！']]
 ],
 'judge:king':[
  [['堕天王','断罪、力を貸してくれるか。'],['断罪','戦局のためだ。誤解するな。']],
  [['断罪','黒翼に傷を負わせるな。'],['堕天王','まず、いれーなを守る。']],
  [['堕天王','私情で判断を曲げるな。'],['断罪','……貴様は何を言っている？']]
 ]
};
const BANTER_FALLBACK={
 wing:[['黒翼','いれーな！ 次も思いっきりいこう！'],['堕天王','……敵にも注意しろ。']],
 king:[['堕天王','敵の動きをよく見ろ。'],['黒翼','はーい！']],
 fallen:[['堕天','まだ倒れるな。私の力が無駄になる。'],['深淵','……心配してる？'],['堕天','違う！']],
 judge:[['断罪','実力を示せ。そうすれば力は貸す。'],['黒翼','断罪って真面目だね！']],
 abyss:[['深淵','……次の行動を観測中。'],['黒翼','私のことも見ててね！']]
};
const BANTER_SPECIAL={
 low:[['堕天','いいぞ……ここからが本番だ！'],['堕天王','まず生き残れ。順番を間違えるな。']],
 boss:[['堕天王','大技が来る。備えろ。'],['黒翼','よーし！ 守ってから反撃だね！']],
 swap:[['黒翼','交代！ あとは任せたよ！'],['堕天王','相手の攻撃にも注意しろ。']],
 fallen:[['堕天','深淵！ 今のは見ていただろう！'],['深淵','……大きな音がした。']],
 judge:[['断罪','裁定を下す。邪魔はするな。'],['黒翼','断罪、かっこいい！'],['断罪','……当然だ。']],
 wing:[['黒翼','羽がいい感じ！ もう一回いくよ！'],['断罪','……見事だ。文句のつけようがない。']],
 abyss:[['深淵','……侵食、順調。'],['堕天','ならば次は私が仕留める！']],
 king:[['堕天王','盾は私が引き受ける。'],['黒翼','じゃあ攻撃は任せて！']],
 release:[
  ['黒翼','みんなで一緒に戦えるね！'],
  ['堕天王','全権能、統率完了。いれーな、指揮を執れ。'],
  ['堕天','……深淵がやるなら、私も付き合う。'],
  ['深淵','……面白そう。'],
  ['断罪','黒翼が望むなら、異論はない。']
 ]
};
const deckIndex=(turn,length)=>Math.floor(turn/3)%length;
function dialogue(lines,kind,turn){
 return {speaker:lines[0][0],text:lines[0][1],lines:lines.map(([speaker,text])=>({speaker,text})),kind,turn};
}
export function cooperationDialogue(b){
 if(!cooperationEnabled(b.build)||b.result)return null;
 const action=b.lastAction||'',turn=b.turn,ids=DIV_IDS.filter(id=>b.powers.includes(id));
 if(!ids.length)return null;
 // Rare event dialogues can precede the ordinary three-turn cadence.
 if(action==='apotheosis'&&b.divine?.unified)return dialogue(BANTER_SPECIAL.release,'release',turn);
 if(b.hp>0&&b.hp/b.base.hp<=.25&&!b.divine?.banterLowSeen){
  b.divine.banterLowSeen=true;
  return dialogue(BANTER_SPECIAL.low,'low',turn);
 }
 if(turn%3!==0)return null;
 if(action.startsWith('attune_'))return dialogue(BANTER_SPECIAL.swap,'swap',turn);
 if(b.mode==='ex'&&turn%6===0)return dialogue(BANTER_SPECIAL.boss,'boss',turn);
 const event={fallenEnd:'fallen',judgment:'judge',plume:'wing',thousandWings:'wing',abyssEnd:'abyss',royalGuard:'king',royalReturn:'king'}[action];
 if(event)return dialogue(BANTER_SPECIAL[event],event,turn);
 const key=ids.join(':'),deck=BANTER_PAIRS[key];
 if(deck)return dialogue(deck[deckIndex(turn,deck.length)],'normal',turn);
 const fallback=BANTER_FALLBACK[ids[deckIndex(turn,ids.length)]];
 return dialogue(fallback,'normal',turn);
}
