// Approved audit20 active effects. Ordinary authority passives are untouched.
// Old saved battle replays retain their original rules for the entire resumed fight.
const legacyAuthorityBattles=new WeakSet();
export function legacyAuthorityStrike(b){legacyAuthorityBattles.add(b);return b;}
export function authorityStrikeCurrent(b){return !legacyAuthorityBattles.has(b);}
export const AUTHORITY_STRIKE_RULES={fallen:{thresholds:[[.1,1.35],[.25,1.25],[.5,1.15]]},king:{heal:.12},judge:{ignore:.6},abyss:{erosion:.06},wing:{gauge:20}};
export function authorityStrikeEffect(b,action='power'){
 const none={id:null,final:1,ignore:0,heal:0,erosion:0,gauge:0};
 if(action!=='power'||b.character!=='irena'||!authorityStrikeCurrent(b))return none;
 const id=b.powers?.[0],rule=Object.hasOwn(AUTHORITY_STRIKE_RULES,id||'')?AUTHORITY_STRIKE_RULES[id]:null;
 if(!rule)return none;
 return {...none,id,final:rule.thresholds?.find(([ratio])=>b.hp/b.base.hp<=ratio)?.[1]||1,ignore:rule.ignore||0,heal:rule.heal||0,erosion:rule.erosion||0,gauge:rule.gauge||0};
}
export function authorityStrikeDescription(b){
 if(b.character!=='irena'||!b.powers?.length)return '';
 if(!authorityStrikeCurrent(b))return '再開した旧戦闘では追加効果なし。次の新しい戦闘から適用されます。';
 return ({fallen:'堕天：HP50%／25%／10%以下で、破壊の権能の最終ダメージ＋15%／25%／35%。最も強い段階のみ。',king:'堕天王：破壊の権能の命中後に最大HPの12%回復。致死耐性回数は増えません。',judge:'断罪：破壊の権能は防御60%無視。既存の防御無視とは加算せず強い方を適用。蓄積速度・追加HPダメージは維持。',abyss:'深淵：破壊の権能の命中後、敵の基礎全ステータスを追加で6%侵食。既存の累計95%上限を維持。',wing:'黒翼：破壊の権能の命中時に必殺ゲージを追加＋20（通常＋26と合わせて＋46、上限100%）。羽弾最終5倍とは別の効果。'})[b.powers[0]]||'共鳴・天星覇権は今回の追加効果の対象外です。既存のパッシブと破壊攻撃は維持します。';
}
