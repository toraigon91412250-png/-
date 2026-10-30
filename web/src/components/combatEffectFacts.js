// Derive labels only from already-resolved frames. Never predict or mutate a battle.
const factNumber=n=>Math.floor(Math.max(0,n)).toLocaleString('ja-JP');
export function actualHealLabel(event,previous){
 const target=event.target||'player',now=event.frame?.[target],before=previous?.[target];
 if(!now||!before)return '回復';
 const ratioGain=now.hp/now.max-before.hp/before.max;
 if(now.max!==before.max&&ratioGain>0)return 'HP割合＋'+Math.round(ratioGain*100)+'pt（最大HP変動）';
 const amount=Math.max(0,Math.floor(now.hp)-Math.floor(before.hp));
 return amount>0?'回復＋'+factNumber(amount):now.hp>=now.max?'回復0（HP最大）':'回復0';
}
export function actualErosionLabel(event){const delta=Math.max(0,(event.after??0)-(event.before??0)),percent=Math.round(delta*100),total=Math.round((event.after??0)*100),lost=Math.max(0,Math.floor(event.maxBefore??0)-Math.floor(event.maxAfter??0));return '侵食＋'+percent+'%・累計'+total+'%'+(lost>0?' / 最大HP−'+factNumber(lost):'（上限）');}
