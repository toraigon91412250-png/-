import {authorityStrikeCurrent} from '../utils/authorityStrike.js';
import {RECIPES} from '../data/config.js';
// Artwork and stage effects are selected exclusively from the battle's first slot.
export const AUTHORITY_STRIKE_ART={wing:'assets/combat-vfx/authority-v1/wing.png',judge:'assets/combat-vfx/authority-v1/judge.png',abyss:'assets/combat-vfx/authority-v1/abyss.png',fallen:'assets/combat-vfx/authority-v1/fallen.png',king:'assets/combat-vfx/authority-v1/king.png'};
export const AUTHORITY_STRIKE_STYLE={
 wing:{name:'黒翼',motif:'feathers',color:'#ee5872',subtitle:'黒き翼、解き放て。'},
 judge:{name:'断罪',motif:'judgment',color:'#ffd290',subtitle:'罪を断つ、光の刃。'},
 abyss:{name:'深淵',motif:'vortex',color:'#b78bff',subtitle:'深き闇へ、沈め。'},
 fallen:{name:'堕天',motif:'rupture',color:'#ff6d73',subtitle:'失われた力を、ここに。'},
 king:{name:'堕天王',motif:'crown',color:'#efbd84',subtitle:'この玉座は、揺るがない。'}
};
export function authorityStrikeVisual(first){
 const style=AUTHORITY_STRIKE_STYLE[first];
 if(style)return {id:first,...style,art:AUTHORITY_STRIKE_ART[first]};
 const recipe=RECIPES.find(x=>x.id===first);
 return {id:recipe?first:first==='star'?'star':'none',name:recipe?.name||(first==='star'?'天星覇権':'権能'),motif:'resonance',color:'#c9a9f4',subtitle:recipe?'響き合う力を、一撃に。':'失われた力の解放',art:null};
}
export function authorityStrikeCommand(b){const hint=authorityStrikeCurrent(b)?({wing:'命中ゲージ＋20',king:'命中HP12%回復',judge:'防御60%無視',abyss:'命中侵食＋6%',fallen:'低HPで＋15〜35%'})[b.powers?.[0]]:'旧戦闘';return b.powers?.[0]?authorityStrikeVisual(b.powers[0]).name+'（1枠目） / CT3'+(hint?' / '+hint:''):'権能未装備 / CT3';}
