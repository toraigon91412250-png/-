// Existing IDs are retained so inventories, slots and achievement history migrate in place.
export const TACTICAL_MARK_RULES={fallen:[.12,.18,.25],kingHeal:.12,kingReduction:.2,judge:.2,judgeInterval:3,abyssTurn:3,abyss:.18,wing:.12,counter:.35,ending:[.2,.35]};
function markLog(b,text){b.log.push(text);if(b.log.length>100)b.log.splice(0,b.log.length-100);}
export function markState(b){return b.markState ||= {kingUsed:false,kingShield:false,counterReady:false,judgeReadyTurn:0};}
export function hasMark(b,id,power){return b.character==='irena'&&b.marks.includes(id)&&(!power||b.powers.includes(power));}
export function recordMark(b,id){if(!b.used.marks.includes(id))b.used.marks.push(id);}
export function markGuard(b){if(hasMark(b,'iron')){markState(b).counterReady=true;markLog(b,'反攻の刻印：次の攻撃＋35%');}}
export function beginMarkAttack(b,action){
 const rules=TACTICAL_MARK_RULES,special=['feather','pierce','volley','power'].includes(action),feather=['feather','pierce','volley'].includes(action);let multiplier=1;
 const add=(id,value)=>{multiplier*=1+value;recordMark(b,id);};
 const ratio=b.hp/b.base.hp;
 if(special&&hasMark(b,'fire','fallen')&&ratio<=.5)add('fire',rules.fallen[ratio<=.1?2:ratio<=.25?1:0]);
 if(hasMark(b,'abyssmark','abyss')&&b.enemy.markTurns>=rules.abyssTurn)add('abyssmark',rules.abyss);
 if(feather&&hasMark(b,'wind','wing'))add('wind',rules.wing);
 if(hasMark(b,'iron')&&markState(b).counterReady){markState(b).counterReady=false;add('iron',rules.counter);}
 // The whole attack uses the HP ratio at execution; volley cannot gain a new tier on shot two.
 const enemyRatio=b.enemy.hp/b.enemy.base.hp;
 if(hasMark(b,'life')&&enemyRatio<=.25)add('life',rules.ending[enemyRatio<=.1?1:0]);
 return multiplier;
}
export function judgeMarkMultiplier(b,triggered){
 if(!triggered||!hasMark(b,'moon','judge')||b.turn<markState(b).judgeReadyTurn)return 1;
 markState(b).judgeReadyTurn=b.turn+TACTICAL_MARK_RULES.judgeInterval;recordMark(b,'moon');markLog(b,'断罪の刻印：強化攻撃＋20%');return 1+TACTICAL_MARK_RULES.judge;
}
export function reduceKingMarkHit(b,amount){
 if(amount>0&&hasMark(b,'crown','king')&&markState(b).kingShield){markState(b).kingShield=false;recordMark(b,'crown');markLog(b,'堕天王の刻印：被ダメージ20%軽減');return amount*(1-TACTICAL_MARK_RULES.kingReduction);}return amount;
}
export function triggerKingMark(b,kingEndured){
 if(!kingEndured||!hasMark(b,'crown','king')||markState(b).kingUsed)return;
 const m=markState(b);m.kingUsed=true;m.kingShield=true;
 // HP uses the existing normalized-vitality representation (also used by heal()).
 b.hp=Math.min(b.base.hp,b.hp+b.base.hp*TACTICAL_MARK_RULES.kingHeal);recordMark(b,'crown');markLog(b,'堕天王の刻印：最大HP12%回復・次の被ダメージ20%軽減');
}
