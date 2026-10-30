// Divinity reconstruction: explicit rules, independent from legacy v4/v5 combat.
export const DIV_IDS=['wing','abyss','fallen','judge','king'];
export const DIV_NAMES={wing:'黒翼',abyss:'深淵',fallen:'堕天',judge:'断罪',king:'堕天王'};
export const DIV_ART=['assets/divinity/stage-1.webp','assets/divinity/stage-1.webp','assets/divinity/stage-2.webp','assets/divinity/stage-3.webp','assets/divinity/stage-4.webp','assets/divinity/stage-5.webp'];
export const DIV_STAGES=[
 {name:'封じられた神格',effect:'斬撃と防御から、記憶を辿る。',memory:'失ったのではない。閉じたのだ。けれど、何を守ろうとしたのかは思い出せない。'},
 {name:'神性の微光',effect:'防御後の次の攻撃が1.35倍。攻撃するまで保持。',memory:'この翼は、誰かに折られたのではない。封印の結び目には、私自身の名前があった。'},
 {name:'神翼の胎動',effect:'異なる権能の専用技を続けると連携1.35倍。戦闘中に2枠目の権能を呼び戻せる。',memory:'深淵にも、玉座にも、同じ言葉を残していた。「私に、選び直す時間を」。'},
 {name:'神威の顕現',effect:'浄化：状態異常解除・HP25%回復。CT5。',memory:'力があれば全て救えると信じた。けれど、私が決めた幸福に、皆の声はなかった。'},
 {name:'神域の再臨',effect:'一戦一度、致死ダメージからHP40%で再起。',memory:'神々は私の力を奪わなかった。自ら封じる私を見届け、帰還の試練を預かったのだ。'},
 {name:'真・神格解放',effect:'全権能統合・全能力3倍を4行動。終極の専用技を解放。',memory:'未来をひとつに固定する力を、私は自ら封じた。今度は誰かの選択を守るために。この力を、私の意思で取り戻す。'}
];
export const DIV_BRANCHES={
 wing:[['assault','烈翼','羽弾系・翼嵐の威力1.3倍'],['shelter','羽衣','防御・羽衣でHP12%回復、羽を追加で1蓄積']],
 abyss:[['dominate','深度','侵食の追加量＋6%'],['drain','還流','深淵技でHP15%回復']],
 fallen:[['risk','背水','HP25%以下の堕天技1.6倍'],['resolve','不退','堕天技後に最大HP12%の障壁を得る']],
 judge:[['sentence','執行','断罪技の威力1.35倍'],['insight','看破','断罪技で敵強化を解除・次の被ダメージ半減']],
 king:[['bastion','不落','防御・王盾で最大HP15%の障壁を得る'],['revenge','反攻','反撃蓄積の威力が2倍']]
};
export const DIV_SKILLS={
 plume:{name:'黒翼・翼嵐',power:'wing',level:1,ct:2,base:'feather',text:'羽を全消費。1枚につき威力＋25% / CT2'},
 thousandWings:{name:'黒翼・千翼',power:'wing',level:5,ct:4,base:'volley',text:'羽を全消費する二連撃。蓄積1枚につき＋40% / CT4'},
 mantle:{name:'黒翼・羽衣',power:'wing',level:3,ct:3,guard:true,text:'防御＋障壁25%・羽を2枚蓄積 / CT3'},
 abyssTide:{name:'深淵・還蝕',power:'abyss',level:1,ct:3,base:'power',text:'侵食＋12%・敵弱体化。予告された侵食を逆用 / CT3'},
 abyssEnd:{name:'深淵・無底',power:'abyss',level:5,ct:4,base:'power',text:'侵食を保ったまま、その深さで威力上昇 / CT4'},
 fallenOath:{name:'堕天・誓約',power:'fallen',level:1,ct:3,base:'power',text:'HPを最大値の45%まで捧げて攻撃 / CT3'},
 fallenEnd:{name:'堕天・逆天',power:'fallen',level:5,ct:4,base:'ultimate',text:'HP25%以下で使用。ゲージ不要の逆転奥義 / CT4'},
 verdict:{name:'断罪・刻印',power:'judge',level:1,ct:2,base:'power',text:'異なる攻撃2回で証を蓄積、決定打で消費 / CT2'},
 judgment:{name:'断罪・終審',power:'judge',level:5,ct:4,base:'ultimate',text:'証2つを消費、防御貫通の終審 / CT4'},
 royalGuard:{name:'王権・受け流し',power:'king',level:1,ct:2,guard:true,text:'防御＋障壁25%。予告重撃に反撃準備 / CT2'},
 royalReturn:{name:'王権・反照',power:'king',level:5,ct:3,base:'power',text:'防御の反撃蓄積を解き放ちHP20%回復 / CT3'},
 purify:{name:'神威・浄化',stage:3,ct:5,text:'異常解除・HP25%回復 / CT5'},
 apotheosis:{name:'真・神格解放',stage:5,ct:8,text:'全権能統合・全能力3倍・4行動 / CT8'},
 convergence:{name:'万象・帰還',stage:5,ct:2,base:'ultimate',text:'解放中専用。五権能の記憶を重ねる一撃 / CT2'}
};
for(const id of DIV_IDS)DIV_SKILLS['attune_'+id]={name:DIV_NAMES[id]+'を呼び戻す',stage:2,attune:id,ct:2,text:'1行動で2枠目を変更。敵の応答あり / CT2'};
export const DIV_TRIALS={
 wing:{name:'黒翼 — 帰還の羽',enemy:'翼を閉ざす守護者',condition:'防御で羽を2枚集める。その後、翼嵐を使う。',memory:'守るために閉ざした翼なら、守るために開ける。'},
 abyss:{name:'深淵 — 静かな逆流',enemy:'侵食を映す祭司',condition:'「侵食波」を防御し、次の行動で斬撃か羽弾。覚醒後に還蝕を使う。',memory:'闇は敵ではない。私が見ないふりをしていた痛みだ。'},
 fallen:{name:'堕天 — 折れない誓い',enemy:'絶望を告げる影',condition:'予告された「試しの一撃」を受け、HP50%以下で攻撃。覚醒後に誓約を使う。',memory:'傷つくことを恐れて、誰の手も取れなくなっていた。'},
 judge:{name:'断罪 — 選び直す刃',enemy:'裁きの天秤',condition:'異なる攻撃を続けて証を2つ作り、防御する。覚醒後に刻印を使う。',memory:'正しさを押しつけるためではない。その一撃の責任を、私が引き受ける。'},
 king:{name:'堕天王 — 玉座なき王',enemy:'空位の王冠',condition:'予告「王の重撃」を防御し、次に攻撃。覚醒後に受け流し、攻撃する。',memory:'玉座に座るためではない。誰かが立ち上がる場所を守るために。'},
 truth:{name:'封印の真相',enemy:'かつての私の選択',condition:'予告重撃を防ぎ、異なる権能の専用技を3系統使う。',memory:DIV_STAGES[5].memory},
 infinite:{name:'無窮の神座',enemy:'選択を喰らう神座',condition:'重撃への防御と異系統の専用技で3枚の封印を解く。真・神格解放で決着へ。',memory:'選ぶたびに、世界はひとつではなくなる。'}
};
