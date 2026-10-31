// Confirmed values are preserved. All new balancing is explicitly reconstruction data.
export const VERSION=4;
export const BALANCE={provenance:'仕様書に基づく新規復元。敵・経済・未回収数値は補完設計。',base:{hp:400,hpLevel:42,atk:47,atkLevel:13,def:18,defLevel:5,spd:22,spdLevel:2},gauge:{slash:26,feather:39,guard:18},skills:{feather:1.95,ultimate:5.4},resCosts:[40,80,120,160],abyssStep:.06,abyssCap:.95,exLimit:9,achievementReward:60};
export const POWERS=[
{id:'abyss',name:'深淵',icon:'◈',effect:'毎ターン敵のHP・攻撃・防御・速度を基礎値の6%侵食。上限95%。',source:'初期解放 / 120Pで再入手'},
{id:'fallen',name:'堕天',icon:'♜',effect:'HP50/25/10%以下で全ステータス2.4/3.1/3.8倍。段階は重複しない。',source:'Lv.5撃破 / 120P'},
{id:'wing',name:'黒翼',icon:'✦',effect:'全ステータス1.1倍。羽弾の最終ダメージ5倍。',source:'初期解放 / 120Pで再入手'},
{id:'king',name:'堕天王',icon:'♛',effect:'最大HP・防御1.2倍。致命傷をHP1で5回耐える。',source:'Lv.10撃破 / 120P'},
{id:'judge',name:'断罪',icon:'⚖',effect:'命中2回蓄積後の次の命中で3倍・防御60%無視・敵の攻撃前現在HP20%を加算。',source:'Lv.20撃破 / 120P'},
{id:'star',name:'天星覇権',icon:'✺',effect:'全ステータス3倍・与ダメージ2倍・毎ターン最大HP5%回復（補完性能）。',source:'全32実績の達成でLv.5'}];
export const RECIPES=[
{id:'god',name:'堕天の神',parts:['fallen','king'],live:true,effect:'低HP50/25/5%で全能力2/3/4倍を2ターン維持。段階ごとの致死耐性＋HP1耐性4回。'},
{id:'fallenwing',name:'堕天翼',parts:['fallen','wing'],live:true,effect:'HP50/25/10%で全能力4.8/6.2/7.6倍。羽弾最終10倍。'},
{id:'fallenjudge',name:'堕天審判',parts:['fallen','judge'],live:false,effect:'低HP全能力強化。断罪4倍・防御90%無視。'},
{id:'abyssfallen',name:'深淵堕天',parts:['abyss','fallen'],live:false,effect:'毎ターン9%侵食。低HPと侵食に応じて攻撃強化。'},
{id:'kingwing',name:'王の翼',parts:['king','wing'],live:false,effect:'HP・防御1.5倍。致死耐性7回。羽弾最終10倍。'},
{id:'kingjudge',name:'王権断罪',parts:['king','judge'],live:false,effect:'HP・防御1.5倍。致死耐性6回。命中・被弾で断罪蓄積。'},
{id:'abyssking',name:'深淵王',parts:['abyss','king'],live:true,effect:'毎ターン9%侵食。防御1.3〜2.05倍、攻撃も侵食に応じて増加。致死耐性6回。'},
{id:'judgewing',name:'断罪翼',parts:['judge','wing'],live:true,effect:'羽弾最終10倍。羽弾の命中だけで断罪を蓄積・発動。'},
{id:'abysswing',name:'深淵の翼',parts:['abyss','wing'],live:false,effect:'毎ターン9%侵食。羽弾命中で追加侵食、羽弾最終10倍。'},
{id:'abyssjudge',name:'深淵断罪',parts:['abyss','judge'],live:true,effect:'毎ターン9%侵食。断罪の火力が侵食と状態異常数で増加。'}];
export const MARKS=[
{id:'split',name:'羽撃ち分け',icon:'⋈',cost:160,effect:'穿羽1.30倍・CT3 / 連羽0.70倍×2・CT2。交互使用で15%強化。',confirmed:true},
{id:'starfall',name:'星墜の印',icon:'✧',cost:220,effect:'必殺ダメージ＋12%',confirmed:true},
{id:'endure',name:'不屈の印',icon:'◇',cost:200,effect:'HP＋18%。致命傷を1回耐える',confirmed:true},
{id:'abyssmark',name:'深淵の刻印',icon:'◈',cost:160,power:'abyss',effect:'深淵装備時、同じ敵との3ターン目以降は与ダメージ＋18%。',confirmed:true},
{id:'wind',name:'黒翼の刻印',icon:'≋',cost:160,power:'wing',effect:'黒翼装備時、羽弾・穿羽・連羽の最終ダメージ＋12%。',confirmed:true},
{id:'iron',name:'反攻の刻印',icon:'⬡',cost:180,effect:'防御で次の攻撃＋35%。攻撃するまで保持し、連続防御で重複しない。回避されても攻撃実行時に消費。',confirmed:true},
{id:'fire',name:'堕天の刻印',icon:'♨',cost:200,power:'fallen',effect:'堕天装備時、HP50/25/10%以下で特殊攻撃＋12/18/25%。最も強い段階のみ適用。',confirmed:true},
{id:'moon',name:'断罪の刻印',icon:'☾',cost:200,power:'judge',effect:'断罪装備時、蓄積後の強化攻撃部分＋20%（HP20%追加はそのまま）。再発動は3ターン後。',confirmed:true},
{id:'crown',name:'堕天王の刻印',icon:'♛',cost:260,power:'king',effect:'堕天王のHP1耐久時に最大HP12%回復、次の被ダメージ20%軽減。1戦1回。耐久回数は増えない。',confirmed:true},
{id:'life',name:'終幕の刻印',icon:'❀',cost:180,effect:'攻撃開始時の敵HPが25/10%以下で与ダメージ＋20/35%。最も強い段階のみ適用。',confirmed:true}];
export const GODS=['黎明の神アウロラ','境界の神リメス','深淵の神ノクス','断罪の神ユスティア','失われた神座'];
export const AWAKENINGS=['未覚醒','神性の微光','神翼の胎動','神威の顕現','神域の再臨（補完名）','再誕の神格（補完名）'];
export const ACHIEVEMENTS=[
...['初勝利','常勝への一歩','闘技場の常連','瞬撃','羽弾の熟練者','必殺の求道者','最初の壁','強敵撃破','折り返し地点','極限への挑戦','王座目前','百戦錬磨'].map((name,i)=>({id:'A'+i,cat:'A',name,detail:['初めて勝利','通算10勝','通算50勝','5ターン以内に勝利','特殊技25回','必殺技10回','通常Lv.10撃破','通常Lv.30撃破','通常Lv.50撃破','通常Lv.70撃破','通常Lv.90撃破','通常Lv.100撃破'][i]})),
...['連勝街道','己の腕一本','基本を極めし者','読み合いの極致','権能の収集者','五権能の使い手','極限強化','権能の完全掌握','堕天の極致','技術の到達点','星墜の一撃','刻印を使いこなす者'].map((name,i)=>({id:'B'+i,cat:'B',name,detail:['5連勝','権能未装備で勝利','特殊・必殺を使わず勝利','EXPERTで勝利','通常権能3種を解放','通常権能5種を解放','通常権能1種Lv.5','通常権能5種Lv.5','才能Lv.20','羽弾・破壊ともLv.10','星墜の必殺で勝利','刻印10種を実戦発動'][i]})),
...[[0,'あと一歩の奇跡','HP10%以下から勝利'],[1,'飾らぬ勝利','刻印未装備で勝利'],[2,'終局を越えて','EXカイザー撃破'],[3,'星を越えた決戦','ステラ最終決戦クリア'],[7,'刻印の蒐集者','刻印5種収集'],[8,'十刻印の覇者','刻印10種収集'],[9,'三重刻印','刻印3枠装備'],[11,'不屈の証','不屈発動後に勝利']].map(([i,name,detail])=>({id:'C'+i,cat:'C',name,detail}))];
export const FINAL_SKILLS={
 godspeed:{name:'神域の速度',side:1,stage:1,ct:5,duration:4,mul:{def:1.5,spd:999},text:'防御1.5倍・速度999倍 / 4T'},
 omnipotent:{name:'全能降臨',side:1,stage:2,ct:5,duration:4,mul:{atk:2,def:2,spd:2},text:'攻・防・速2倍 / 4T'},
 dominion:{name:'万象支配',side:1,stage:3,ct:5,duration:2,mul:{atk:4,def:2,spd:999},minimum:3000,text:'攻4・防2・速999倍 / 2T。最低3000・異常解除'},
 erosion:{name:'堕天侵食',side:-1,stage:1,ct:4,duration:3,mul:{atk:2.2,def:.85},text:'補完：攻2.2・防0.85倍 / 3T'},
 release:{name:'深淵解放',side:-1,stage:2,ct:4,duration:2,mul:{atk:3.2,spd:2},text:'補完：攻3.2・速2倍 / 2T。HP12%消費'},
 sovereignty:{name:'堕天王権',side:-1,stage:3,ct:5,duration:2,mul:{atk:4.5,def:.65},text:'補完：攻4.5・防0.65倍 / 2T。終了時1T停止'},
 annihilate:{name:'終極殲滅',ct:5,text:'防御無視・最低5000。次ターン停止・速度反動'},
 transcend:{name:'絶界昇華',ct:4,duration:3,mul:{atk:3,def:3,spd:3},text:'全能力3倍 / 3T。権能禁止、終了後停止・防御半減'},
 grasp:{name:'理外掌握',side:-1,ct:8,text:'堕天側専用。全回復・重圧解除・速度1000倍永続・敵1回停止。終極殲滅CTのみ解除。攻撃倍率を発動ターンで固定 / CT8（補完）'}
};
