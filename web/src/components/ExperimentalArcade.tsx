import React,{useMemo,useState} from 'react';
import {Activity,ArrowLeft,Atom,ChevronRight,FlaskConical,Layers3,RefreshCw,Shield,ShieldCheck,Sparkles,Swords,Target,TrendingUp,Zap} from 'lucide-react';
import {ABILITY_DEFINITIONS} from '../data/abilities';
import {RESONANCE_DEFINITIONS} from '../data/resonanceAbilities';
import {ABYSS_RELICS,analyzePrototypeBuild,chooseAbyssReward,createAbyssRun,createPrototypeDuel,getAbyssGrade,getPrototypeDuelGrade,getPrototypeModuleTags,normalizePrototypeBossConfig,resolveAbyssAction,resolvePrototypeDuelAction,type AbyssAction,type AbyssRelicId,type AbyssRunState,type PrototypeAction,type PrototypeBossConfig,type PrototypeDuelState,type PrototypePattern} from '../utils/experimentArcade';
import './ExperimentalArcade.css';

type PrototypeId='ABYSS_DESCENT'|'SYNERGY_FORGE'|'KAISER_DESIGNER';
type ModuleItem={id:string;name:string;symbol:string;description:string;origin:'BASE'|'RESONANCE'};
const MODULES:ModuleItem[]=[
 ...ABILITY_DEFINITIONS.map(x=>({id:x.id,name:x.name,symbol:x.symbol,description:x.shortDescription,origin:'BASE' as const})),
 ...RESONANCE_DEFINITIONS.map(x=>({id:x.id,name:x.name,symbol:x.symbol,description:x.shortDescription,origin:'RESONANCE' as const}))
];
const MODULE_LIMIT=3;
const PROTOTYPES:{id:PrototypeId;code:string;title:string;tagline:string;description:string;loop:string;rating:string;icon:React.ReactNode;accent:string}[]=[
 {id:'ABYSS_DESCENT',code:'PROTO-01 / ROGUELITE',title:'深淵踏破',tagline:'選択がビルドを変える5層サバイバル',description:'敵の予告を読み、チャージか防御か大技かを選ぶ。各層の突破後に遺物を1つ選び、火力型・防御型・必殺型のビルドを組み上げる。',loop:'戦闘 → 遺物ドラフト → 次の層 → 最終層',rating:'リプレイ性・判断・成長',icon:<Layers3 size={24}/>,accent:'descent'},
 {id:'SYNERGY_FORGE',code:'PROTO-02 / BUILDCRAFT',title:'権能シナジー工房',tagline:'16種から3つを選び、相性を実戦で検証',description:'元権能と共鳴権能を自由に組み合わせ、発生する連携・構築スコアを確認。組んだビルドで訓練ボスと戦い、理論値ではなく実測結果を見る。',loop:'3つ選ぶ → シナジー解析 → 6ターン戦 → 評価',rating:'構築の自由度・発見・数値検証',icon:<Atom size={24}/>,accent:'forge'},
 {id:'KAISER_DESIGNER',code:'PROTO-03 / BOSS WORKSHOP',title:'カイザー設計ラボ',tagline:'自分でボスを設計し、その場でテスト',description:'HP・攻撃力・防御・行動パターンを調整してオリジナルの試験対象を生成。異なるビルドで倒せるか試し、難易度調整の感触をつかむ。設定は保存されない。',loop:'ボス調整 → 試験ビルド → 実戦 → 設定を変えて再戦',rating:'自由度・バランス検証・遊びの幅',icon:<Target size={24}/>,accent:'designer'}
];
const PATTERNS:{id:PrototypePattern;name:string;description:string}[]=[
 {id:'BALANCED',name:'均衡型',description:'通常攻撃を軸に3ターン目に重撃'},
 {id:'BERSERKER',name:'狂戦士型',description:'毎偶数ターンに重撃。攻撃力で押す'},
 {id:'FORTRESS',name:'要塞型',description:'2ターン目は防御、3ターン目に重撃'},
 {id:'DRAIN',name:'吸収型',description:'3ターン目に回復。長期戦を狙う'}
];
const PATTERN_NAMES:Record<PrototypePattern,string>={BALANCED:'均衡型',BERSERKER:'狂戦士型',FORTRESS:'要塞型',DRAIN:'吸収型'};
const ACTIONS:{id:PrototypeAction;title:string;short:string;icon:React.ReactNode}[]=[
 {id:'STRIKE',title:'通常攻撃',short:'安定ダメージ + 1チャージ',icon:<Swords size={18}/>},
 {id:'MULTI',title:'連撃',short:'連撃タグで大きく強化',icon:<Layers3 size={18}/>},
 {id:'ERODE',title:'侵食',short:'防御を削り、後続攻撃を強化',icon:<TrendingUp size={18}/>},
 {id:'GUARD',title:'防御',short:'被ダメージを抑え、1チャージ',icon:<Shield size={18}/>},
 {id:'CHARGE',title:'チャージ',short:'エネルギー+2、断罪も蓄積',icon:<Zap size={18}/>},
 {id:'EXECUTE',title:'執行',short:'エネルギー2以上で大ダメージ',icon:<Target size={18}/>}
];
const RELIC_DESC:Record<AbyssRelicId,string>=Object.fromEntries(ABYSS_RELICS.map(x=>[x.id,x.description]));
const RELIC_META:Record<AbyssRelicId,{name:string;symbol:string}>=Object.fromEntries(ABYSS_RELICS.map(x=>[x.id,{name:x.name,symbol:x.symbol}])) as Record<AbyssRelicId,{name:string;symbol:string}>;
function hpWidth(current:number,max:number){return Math.max(0,Math.min(100,Math.round(current/Math.max(1,max)*100)));}
function intentText(intent:string){return intent==='HEAVY'?'重撃予告':intent==='RECOVER'?'回復予告':intent==='GUARD'?'防御予告':'通常攻撃予告';}
function intentDetail(intent:string){return intent==='HEAVY'?'大ダメージ。ガードが有効。':intent==='RECOVER'?'敵が回復する前に倒したい。':intent==='GUARD'?'このターンは敵へのダメージが減る。':'基本攻撃。防御するか火力を優先するか選ぶ。';}

export const ExperimentalArcade:React.FC=()=>{
 const [active,setActive]=useState<PrototypeId|null>(null);
 if(active==='ABYSS_DESCENT')return <AbyssDescent onBack={()=>setActive(null)}/>;
 if(active==='SYNERGY_FORGE')return <SynergyForge onBack={()=>setActive(null)}/>;
 if(active==='KAISER_DESIGNER')return <KaiserDesigner onBack={()=>setActive(null)}/>;
 return <PrototypeGallery onOpen={setActive}/>;
};

const PrototypeGallery:React.FC<{onOpen:(id:PrototypeId)=>void}>=({onOpen})=><section className="prototype-arcade">
 <header className="prototype-arcade__heading"><div><span><FlaskConical size={16}/> EXPERIMENT ARCADE / BUILD 01</span><h2>遊べる試作品</h2><p>まだ本編には採用していない独立モード。遊んで、壊して、良いものだけを本編候補に。</p></div><b><ShieldCheck size={14}/> LOCAL ONLY</b></header>
 <div className="prototype-arcade__grid">{PROTOTYPES.map((p,i)=><article key={p.id} className={'prototype-card prototype-card--'+p.accent}>
  <div className="prototype-card__top"><span>{p.code}</span><b>EXPERIMENT {String(i+1).padStart(2,'0')}</b></div><div className="prototype-card__icon">{p.icon}</div><h3>{p.title}</h3><strong>{p.tagline}</strong><p>{p.description}</p>
  <div className="prototype-card__loop"><small>PLAY LOOP</small><span>{p.loop}</span></div><div className="prototype-card__footer"><span><Activity size={13}/>{p.rating}</span><button type="button" onClick={()=>onOpen(p.id)}>試作品をプレイ <ChevronRight size={16}/></button></div>
 </article>)}</div>
 <div className="prototype-arcade__principles"><div><ShieldCheck size={18}/><p><b>セーブを汚さない</b><span>通貨・権能・実績・解放条件は一切変更しない。試作品の状態はリロードで消える。</span></p></div><div><Sparkles size={18}/><p><b>採用判断はプレイヤー</b><span>ここでの評価は仮スコア。ユーザーが採用を決めるまで本編機能として扱わない。</span></p></div><div><Layers3 size={18}/><p><b>仕様書ではなくプレイできる形</b><span>試合・選択・リトライまで触れる試作品を置く。</span></p></div></div>
 </section>;

const PrototypeHeader:React.FC<{code:string;title:string;subtitle:string;onBack:()=>void}>=({code,title,subtitle,onBack})=><header className="prototype-screen__header">
 <button className="prototype-back" type="button" onClick={onBack}><ArrowLeft size={16}/> 試作品一覧</button><div><small>{code}</small><h2>{title}</h2><p>{subtitle}</p></div><span className="prototype-local"><ShieldCheck size={13}/> 保存なし</span>
 </header>;
const PrototypeActions:React.FC<{disabled?:boolean;onClick:()=>void;children:React.ReactNode}>=({disabled,onClick,children})=><button className="prototype-action" type="button" disabled={disabled} onClick={onClick}>{children}</button>;

const AbyssDescent:React.FC<{onBack:()=>void}>=({onBack})=>{
 const [run,setRun]=useState<AbyssRunState>(()=>createAbyssRun());
 const [showRules,setShowRules]=useState(false);
 const relics=Object.entries(run.relics).filter(([,n])=>(n??0)>0) as [AbyssRelicId,number][];
 const restart=()=>setRun(createAbyssRun());
 return <section className="prototype-screen prototype-screen--descent">
  <PrototypeHeader code="PROTO-01 / ROGUELITE" title="深淵踏破" subtitle="5層の試練を突破し、遺物を組み合わせてビルドを完成させる。" onBack={onBack}/>
  {run.status==='REWARD'?<section className="descent-reward"><span className="prototype-eyebrow">FLOOR {run.floor} CLEARED / PICK ONE RELIC</span><h3>次の層へ何を持ち込む？</h3><p>選択した遺物は今回のラン中だけ効果を発揮。既に持っている遺物は最大3段階まで重ねられる。</p><div className="descent-reward__grid">{run.rewardChoices.map(id=>{const relic=RELIC_META[id];return <button key={id} type="button" onClick={()=>setRun(s=>chooseAbyssReward(s,id))}><b>{relic.symbol}</b><strong>{relic.name}</strong><span>{RELIC_DESC[id]}</span><small>現在の所持：{run.relics[id]??0}</small><em>この遺物を選ぶ <ChevronRight size={14}/></em></button>})}</div></section>:
  run.status==='CLEARED'||run.status==='DEFEATED'?<section className="prototype-result"><div className={'prototype-result__seal '+(run.status==='CLEARED'?'win':'loss')}>{run.status==='CLEARED'?'CLEAR':'END'}</div><span className="prototype-eyebrow">RUN REPORT / NOT SAVED</span><h3>{run.status==='CLEARED'?'深淵踏破、達成。':'深淵に飲まれた。'}</h3><p>{run.status==='CLEARED'?'5層を突破した。これは仮の試験結果で、報酬は本編に反映されない。':'挑戦はここまで。遺物の選択やチャージの使い方を変えて再挑戦しよう。'}</p><div className="prototype-result__stats"><div><small>評価</small><b>{getAbyssGrade(run)}</b></div><div><small>到達層</small><b>{run.floor}/5</b></div><div><small>総ダメージ</small><b>{run.totalDamage.toLocaleString('ja-JP')}</b></div><div><small>総ターン</small><b>{run.totalTurns}</b></div><div><small>残りHP</small><b>{run.hp}/{run.maxHp}</b></div></div><div className="prototype-result__actions"><PrototypeActions onClick={restart}><RefreshCw size={16}/> 新しいラン</PrototypeActions><PrototypeActions onClick={onBack}>試作品一覧へ</PrototypeActions></div></section>:
  <><div className="descent-status"><div className="descent-status__player"><span>PLAYER / IRENA</span><strong>{run.hp}<small> / {run.maxHp} HP</small></strong><div className="prototype-bar"><i style={{width:hpWidth(run.hp,run.maxHp)+'%'}}/></div><div className="descent-charge"><span>VOID CHARGE</span>{[1,2,3].map(n=><i key={n} className={run.charge>=n?'lit':''}/>)}</div></div><div className="descent-status__enemy"><span>FLOOR {run.floor} / VOID ENEMY</span><strong>{run.enemyHp}<small> / {run.enemyMaxHp} HP</small></strong><div className="prototype-bar prototype-bar--enemy"><i style={{width:hpWidth(run.enemyHp,run.enemyMaxHp)+'%'}}/></div><b className={run.intent==='HEAVY'?'intent-heavy':'intent-normal'}>{intentText(run.intent)}</b><small>{run.intent==='HEAVY'?'大ダメージ '+(13+run.floor*4)+'。防御が有効。':'攻撃 '+(7+run.floor*3)+'。火力を優先するか判断。'}</small></div></div>
  <div className="descent-play"><div className="descent-play__heading"><div><span className="prototype-eyebrow">TURN {run.turn} / FLOOR {run.floor}</span><h3>行動を選択</h3></div><button type="button" className="prototype-help" onClick={()=>setShowRules(x=>!x)}>{showRules?'ルールを閉じる':'ルールを確認'}</button></div>
  {showRules&&<p className="prototype-rules">通常攻撃は15ダメージとチャージ1。防御は被ダメージを軽減しチャージ1。チャージはエネルギー2。3つ貯めるとBURSTを撃てる。敵を倒すと遺物を選び、HPとビルドを引き継いで次層へ。</p>}
  <div className="descent-actions">{([{id:'STRIKE',title:'通常攻撃',value:'15 + 連鎖刻印',desc:'攻撃しつつチャージ',symbol:'⚔'},{id:'GUARD',title:'防御',value:'14 + 反響装甲',desc:'被ダメ軽減と反撃',symbol:'⬡'},{id:'CHARGE',title:'チャージ',value:'+2 エネルギー',desc:'大技の準備をする',symbol:'ϟ'},{id:'BURST',title:'虚空BURST',value:'42 + 層補正',desc:'3チャージ消費の決め技',symbol:'✦'}] as {id:AbyssAction;title:string;value:string;desc:string;symbol:string}[]).map(a=><button key={a.id} type="button" disabled={a.id==='BURST'&&run.charge<3} className={'descent-action descent-action--'+a.id.toLowerCase()} onClick={()=>setRun(s=>resolveAbyssAction(s,a.id))}><b>{a.symbol}</b><span><strong>{a.title}</strong><small>{a.value}</small><em>{a.desc}</em></span><ChevronRight size={16}/></button>)}</div></div>
  <section className="descent-relics"><header><h4>今回の遺物</h4><span>{relics.reduce((n,[,count])=>n+count,0)} スタック</span></header>{relics.length?relics.map(([id,count])=><span key={id}>{RELIC_META[id].symbol} {RELIC_META[id].name} <b>×{count}</b></span>):<p>まだ遺物なし。最初の戦闘後に選べる。</p>}</section></>}
  <div className="prototype-combat-log"><span>COMBAT LOG</span>{run.logs.map((line,i)=><p key={i}>{line}</p>)}</div>
  <footer className="prototype-footnote"><ShieldCheck size={14}/> 本編のアイテム・報酬・セーブは変化しない。状態はこの画面を離れると消える。</footer>
 </section>;
};

const ModuleDraft:React.FC<{selected:string[];onChange:(ids:string[])=>void}>=({selected,onChange})=><div className="module-draft">
 <header><div><span className="prototype-eyebrow">BUILD DRAFT / MAX 3</span><h3>試験する権能を選ぶ</h3></div><b>{selected.length}/3</b></header>
 <div className="module-draft__grid">{MODULES.map(m=>{const isSelected=selected.includes(m.id),tags=getPrototypeModuleTags(m.id);return <button type="button" key={m.id} disabled={!isSelected&&selected.length>=MODULE_LIMIT} className={'module-chip '+(isSelected?'selected':'')} onClick={()=>onChange(isSelected?selected.filter(id=>id!==m.id):[...selected,m.id])}><span className="module-chip__symbol">{m.symbol}</span><span className="module-chip__copy"><strong>{m.name}</strong><small>{m.origin==='BASE'?'元権能':'共鳴権能'} · {tags.map(t=>({risk:'瀕死',erosion:'侵食',volley:'連撃',endurance:'不屈',execution:'断罪',transcendence:'超越'} as Record<string,string>)[t]).join(' / ')||'特殊'}</small><em>{m.description}</em></span><span className="module-chip__check">{isSelected?'✓':'+'}</span></button>})}</div>
</div>;

const SynergyForge:React.FC<{onBack:()=>void}>=({onBack})=>{
 const [selected,setSelected]=useState<string[]>(['FALLEN','ABYSS','JUDGMENT']);
 const [duel,setDuel]=useState<PrototypeDuelState|null>(null);
 const config=useMemo(()=>normalizePrototypeBossConfig({hp:250,attack:11,armor:6,pattern:'BALANCED',moduleIds:selected,name:'工房トレーニング標的'}),[selected]);
 const analysis=useMemo(()=>analyzePrototypeBuild(selected),[selected]);
 const start=()=>{if(selected.length>0)setDuel(createPrototypeDuel(config));};
 if(duel)return <DuelView title="権能シナジー工房" subtitle="組み上げた3枠ビルドを訓練標的にぶつける。" code="PROTO-02 / LIVE TEST" config={config} state={duel} onAction={a=>setDuel(s=>s?resolvePrototypeDuelAction(s,a,config):s)} onRestart={start} onBackToSettings={()=>setDuel(null)} onBack={onBack}/>;
 return <section className="prototype-screen prototype-screen--forge"><PrototypeHeader code="PROTO-02 / BUILDCRAFT" title="権能シナジー工房" subtitle="所有状況に関係なく、試作品として全権能の組み合わせを試せる。" onBack={onBack}/>
 <div className="forge-layout"><ModuleDraft selected={selected} onChange={setSelected}/>
 <aside className="forge-analysis"><span className="prototype-eyebrow">SYNERGY ANALYSIS</span><div className="forge-analysis__score"><strong>{analysis.score}</strong><small>BUILD SCORE / 100</small></div><div className="forge-analysis__meter"><i style={{width:analysis.score+'%'}}/></div><h3>検出した系統</h3><div className="forge-analysis__tags">{analysis.tags.length?analysis.tags.map(t=><span key={t}>{t}</span>):<small>権能を選ぶと分析開始</small>}</div><h3>シナジー</h3><div className="forge-analysis__synergy">{analysis.synergies.length?analysis.synergies.map(s=><span key={s}><Sparkles size={14}/>{s}</span>):<p>異なる系統を組み合わせて連携を作ろう。重複しない3枠を試すと発見が増える。</p>}</div><div className="forge-analysis__numbers"><div><span>威力補正</span><b>+{analysis.damageBonus}</b></div><div><span>防御補正</span><b>+{analysis.guardBonus}</b></div></div><PrototypeActions disabled={!selected.length} onClick={start}><Swords size={17}/> このビルドで実戦試験</PrototypeActions><small className="forge-analysis__disclaimer">ここでの補正値は実験用ルール。本編の権能性能は変更されない。</small></aside></div>
 <footer className="prototype-footnote"><ShieldCheck size={14}/> 選べる権能は実験用の仮データ。本編の所持状況や消費状態は変更されない。</footer>
 </section>;
};

const KaiserDesigner:React.FC<{onBack:()=>void}>=({onBack})=>{
 const [hp,setHp]=useState(240),[attack,setAttack]=useState(15),[armor,setArmor]=useState(6);
 const [pattern,setPattern]=useState<PrototypePattern>('BALANCED'),[name,setName]=useState('試作カイザー');
 const [selected,setSelected]=useState<string[]>(['FALLEN_KING','BLACK_WING','JUDGMENT']);
 const [config,setConfig]=useState<PrototypeBossConfig|null>(null),[duel,setDuel]=useState<PrototypeDuelState|null>(null);
 const launch=(source:PrototypeBossConfig)=>{const normalized=normalizePrototypeBossConfig(source);setConfig(normalized);setDuel(createPrototypeDuel(normalized));};
 if(duel&&config)return <DuelView title="カイザー設計ラボ" subtitle="自分で調整した敵を、指定した試験ビルドで撃破できるか検証。" code="PROTO-03 / BOSS WORKSHOP" config={config} state={duel} onAction={a=>setDuel(s=>s?resolvePrototypeDuelAction(s,a,config):s)} onRestart={()=>setDuel(createPrototypeDuel(config))} onBackToSettings={()=>{setDuel(null);setConfig(null);}} onBack={onBack}/>;
 return <section className="prototype-screen prototype-screen--designer"><PrototypeHeader code="PROTO-03 / BOSS WORKSHOP" title="カイザー設計ラボ" subtitle="ボスの数値と行動を変え、その場で試す。作成した敵は本編には登場しない。" onBack={onBack}/>
 <div className="designer-layout"><div className="designer-config"><div className="designer-title"><span><Target size={21}/></span><div><span className="prototype-eyebrow">BOSS PARAMETERS</span><h3>敵パラメータ</h3></div></div>
  <label className="designer-name">ボス名（試験表示用）<input value={name} maxLength={36} onChange={e=>setName(e.target.value)} placeholder="試作カイザー"/></label>
  <RangeControl label="最大HP" value={hp} min={100} max={500} step={25} display={hp.toString()} onChange={setHp}/>
  <RangeControl label="攻撃力" value={attack} min={5} max={40} step={1} display={attack.toString()} onChange={setAttack}/>
  <RangeControl label="防御" value={armor} min={0} max={30} step={1} display={armor.toString()} onChange={setArmor}/>
  <div className="designer-pattern"><span className="prototype-eyebrow">AI BEHAVIOR</span><h3>行動パターン</h3>{PATTERNS.map(p=><button key={p.id} type="button" className={pattern===p.id?'selected':''} onClick={()=>setPattern(p.id)}><span><b>{p.name}</b><small>{p.description}</small></span><i>{pattern===p.id?'選択中':'選択'}</i></button>)}</div>
 </div><div className="designer-build"><ModuleDraft selected={selected} onChange={setSelected}/><div className="designer-preview"><span className="prototype-eyebrow">ENEMY PREVIEW</span><h3>{name.trim()||'試作カイザー'}</h3><div className="designer-preview__stats"><div><small>HP</small><b>{hp}</b></div><div><small>ATK</small><b>{attack}</b></div><div><small>DEF</small><b>{armor}</b></div></div><span className="designer-preview__pattern">AI：{PATTERN_NAMES[pattern]}</span><p>6ターン制限。通常・重撃・防御・回復の行動が設定に応じて発生する。</p><PrototypeActions disabled={selected.length===0} onClick={()=>launch({hp,attack,armor,pattern,moduleIds:selected,name})}><Swords size={17}/> このボスをテスト</PrototypeActions></div></div></div>
 <footer className="prototype-footnote"><ShieldCheck size={14}/> HP・攻撃力・防御・AIパターンは仮設定。保存されず、本編へ反映されない。</footer>
 </section>;
};

const RangeControl:React.FC<{label:string;value:number;min:number;max:number;step:number;display:string;onChange:(n:number)=>void}>=({label,value,min,max,step,display,onChange})=><label className="designer-range"><span>{label}<b>{display}</b></span><input type="range" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))}/><span className="designer-range__ends"><small>{min}</small><small>{max}</small></span></label>;

const DuelView:React.FC<{title:string;subtitle:string;code:string;config:PrototypeBossConfig;state:PrototypeDuelState;onAction:(a:PrototypeAction)=>void;onRestart:()=>void;onBackToSettings:()=>void;onBack:()=>void}>=({title,subtitle,code,config,state,onAction,onRestart,onBackToSettings,onBack})=>{
 const analysis=analyzePrototypeBuild(config.moduleIds),finished=state.status!=='PLAYING';
 return <section className="prototype-screen prototype-screen--duel"><PrototypeHeader code={code} title={title} subtitle={subtitle} onBack={onBackToSettings}/>
 <div className="duel-arena"><div className="duel-arena__top"><span><Activity size={14}/> TURN {state.turn}/{state.maxTurns}</span><b>{finished?'RESULT':intentText(state.intent)}</b><span>AI {PATTERN_NAMES[config.pattern]}</span></div>
 <div className="duel-combatants"><div className="duel-fighter"><span>PLAYER / BUILD</span><strong>{state.playerHp}<small> / {state.maxPlayerHp} HP</small></strong><div className="prototype-bar"><i style={{width:hpWidth(state.playerHp,state.maxPlayerHp)+'%'}}/></div><div className="duel-resources"><span>ENERGY <b>{state.charge}/3</b></span><span>JUDGMENT <b>{state.judgment}</b></span><span>EROSION <b>{state.erosionStacks}</b></span></div></div>
 <div className="duel-vs">VS</div><div className="duel-fighter duel-fighter--boss"><span>{config.name||'試作カイザー'}</span><strong>{state.enemyHp}<small> / {state.maxEnemyHp} HP</small></strong><div className="prototype-bar prototype-bar--enemy"><i style={{width:hpWidth(state.enemyHp,state.maxEnemyHp)+'%'}}/></div><div className="duel-boss-tags"><span>ATK {config.attack}</span><span>DEF {config.armor}</span><span>{intentText(state.intent)}</span></div></div></div>
 <div className="duel-build-strip"><span>TEST BUILD</span>{config.moduleIds.map(id=><b key={id}>{MODULES.find(m=>m.id===id)?.symbol} {MODULES.find(m=>m.id===id)?.name??id}</b>)}<small>構築スコア {analysis.score}</small></div></div>
 {finished?<section className="prototype-result"><div className={'prototype-result__seal '+(state.status==='VICTORY'?'win':'loss')}>{state.status==='VICTORY'?'CLEAR':state.status==='DEFEAT'?'FAILED':'TIME'}</div><span className="prototype-eyebrow">SIMULATION REPORT / NOT SAVED</span><h3>{state.status==='VICTORY'?'試験成功':state.status==='DEFEAT'?'試験失敗':'制限ターン終了'}</h3><p>{state.status==='VICTORY'?'敵を撃破した。ビルドと敵設定の組み合わせは有効そうだ。':'撃破できなかった。構築を変えるか、ボスのHP・防御・攻撃を見直そう。'}</p><div className="prototype-result__stats"><div><small>評価</small><b>{getPrototypeDuelGrade(state)}</b></div><div><small>総ダメージ</small><b>{state.totalDamage}</b></div><div><small>残りHP</small><b>{state.playerHp}/{state.maxPlayerHp}</b></div><div><small>敵残HP</small><b>{state.enemyHp}/{state.maxEnemyHp}</b></div><div><small>総ターン</small><b>{state.totalTurns}/{state.maxTurns}</b></div></div><div className="prototype-result__actions"><PrototypeActions onClick={onRestart}><RefreshCw size={16}/> 同じ条件で再試験</PrototypeActions><PrototypeActions onClick={onBackToSettings}>ビルド・ボス設定へ戻る</PrototypeActions><PrototypeActions onClick={onBack}>試作品一覧へ</PrototypeActions></div></section>:
 <><section className="duel-action-panel"><header><div><span className="prototype-eyebrow">COMBAT INPUT</span><h3>次の一手</h3></div><p>{intentDetail(state.intent)}</p></header><div className="duel-actions">{ACTIONS.map(a=><button key={a.id} type="button" disabled={a.id==='EXECUTE'&&state.charge<2} className={'duel-action duel-action--'+a.id.toLowerCase()} onClick={()=>onAction(a.id)}><b>{a.icon}</b><span><strong>{a.title}</strong><small>{a.short}</small></span><ChevronRight size={15}/></button>)}</div></section>
 <section className="prototype-combat-log"><span>BATTLE LOG / LOCAL ONLY</span>{state.logs.map((l,i)=><p key={i}>{l}</p>)}</section></>}
 <footer className="prototype-footnote"><ShieldCheck size={14}/> この戦闘の勝敗・HP・ビルドはメモリ上だけ。本編の記録・通貨・権能には触れない。</footer>
 </section>;
};
