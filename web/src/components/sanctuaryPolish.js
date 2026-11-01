import {ACHIEVEMENTS} from '../data/config.js';
// Read-only UI facts, except the explicit player-requested replacement transaction.
export const FINALE_ART='assets/finale/confrontation.webp';
export function featherAuthorityNote(b){const p=b?.powers||[];const notes=[];if(p.includes('wing'))notes.push('黒翼 最終×5');if(p.some(x=>['fallenwing','kingwing','judgewing','abysswing'].includes(x)))notes.push('共鳴 最終×10');return notes.join(' / ');}
export function battleReport(b){const rows=b.replay||[];const actions=rows.reduce((r,x)=>(r[x.action]=(r[x.action]||0)+1,r),{});return {inputs:rows.length,actions,special:b.used?.special||0,ultimate:b.used?.ultimate||0};}
export function replaceLoadoutSlot(s,kind,incoming,outgoing,equip){
 const list=kind==='mark'?s.markEquip:s.equipped,owned=kind==='mark'?s.marks.includes(incoming):!!(s.powers[incoming]||s.resonance[incoming]);
 if(!owned||!list.includes(outgoing)||list.includes(incoming)||!['power','mark'].includes(kind))throw Error('装備状態が変わりました。選び直してください');
 const before=[...list];try{equip(s,outgoing,kind);equip(s,incoming,kind);const current=kind==='mark'?s.markEquip:s.equipped;current.splice(0,current.length,...before.map(x=>x===outgoing?incoming:x));}catch(error){if(kind==='mark')s.markEquip=before;else s.equipped=before;throw error;}
}
export function finalChapterStatus(s,c){return s.flags[c.clear]?'CLEAR':s.flags[c.gate]?'UNLOCKED':'SEALED';}

export function swapAuthoritySlots(s,activeBattle=false){
 if(activeBattle)throw Error('戦闘終了または撤退後に権能の順番を変更できます');
 const list=s.equipped;if(!Array.isArray(list)||list.length!==2||list[0]===list[1]||!list.every(id=>s.powers[id]||s.resonance[id]))throw Error('所持している権能を2つ装備してください');
 list.reverse();return s;
}

// The home summary and mascot share this read-only destination resolver.
export function nextHomeGoal(a,battle=null){
 if(battle&&!battle.result)return {kind:'resume',action:'nav',id:'battle',label:'進行中の戦闘に戻る'};
 if(a.floor<=20&&!a.cleared.includes(a.floor))return {kind:'floor',action:'fight',id:'normal',floor:a.floor,label:`第${a.floor}階層へ進む`};
 if(a.flags.lv100&&!a.flags.warp)return {kind:'warp',action:'warp',id:'',label:'境界を越える'};
 if(!a.flags.ex||!a.flags.stellaClear||!a.flags.finalClear)return {kind:'finale',action:'nav',id:'finale',label:'最終決戦を確認する'};
 if(a.awakening<5)return {kind:'awakening',action:'nav',id:'awakening',label:'神格覚醒を確認する'};
 if(a.achieved.length<ACHIEVEMENTS.length)return {kind:'archive',action:'nav',id:'archive',label:'実績を確認する'};
 return null;
}
