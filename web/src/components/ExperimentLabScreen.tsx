import React,{useMemo,useState} from 'react';
import {Activity,ArrowLeft,ChevronRight,FlaskConical,Gauge,Gem,RotateCcw,ShieldCheck,Sparkles,Swords,Target,Trophy,Zap} from 'lucide-react';
import type {AbilityProgress,BattleChallengeLevel,BattleSetupConfig,BattleUiState,CpuDifficulty,ResonanceProgress} from '../types/game';
import {ABILITY_DEFINITIONS} from '../data/abilities';
import {RESONANCE_DEFINITIONS} from '../data/resonanceAbilities';
import {BATTLE_CHALLENGE_LEVELS} from '../types/game';
import {EXPERIMENT_TRIALS,getExperimentGrade,type ExperimentTrial} from '../utils/experimentLab';
import {ExperimentalArcade} from './ExperimentalArcade';
import './ExperimentLabScreen.css';
interface Props{abilityProgress:AbilityProgress;resonanceProgress:ResonanceProgress;currentConfig:BattleSetupConfig;lastRun:BattleUiState|null;onBack:()=>void;onStartTrial:(level:BattleChallengeLevel,difficulty:CpuDifficulty)=>void;}
const fmt=(v:number)=>Math.max(0,Math.round(v)).toLocaleString('ja-JP');
function gradeRun(s:BattleUiState){return getExperimentGrade(s.winnerIsPlayer===true,s.player.currentHp/Math.max(1,s.player.character.maxHp),s.enemy.currentHp/Math.max(1,s.enemy.character.maxHp));}
const TrialCard:React.FC<{trial:ExperimentTrial;onStart:()=>void}>=({trial,onStart})=><article className={'experiment-lab__trial experiment-lab__trial--'+trial.id.toLowerCase().replace(/_/g,'-')}>
 <div className="experiment-lab__trial-top"><span>{trial.eyebrow}</span><strong>{trial.kaiserLevel}</strong></div><h2>{trial.title}</h2><p className="experiment-lab__objective">{trial.objective}</p><p className="experiment-lab__description">{trial.description}</p>
 <div className="experiment-lab__tags"><span><Swords size={13}/> カイザー Lv.{trial.kaiserLevel}</span><span><Gauge size={13}/> {trial.difficulty}</span></div>
 <footer><small>推奨：{trial.recommendedFor}</small><button onClick={onStart} type="button">試験条件を組む <ChevronRight size={16}/></button></footer></article>;
export const ExperimentLabScreen:React.FC<Props>=({abilityProgress,resonanceProgress,currentConfig,lastRun,onBack,onStartTrial})=>{
 const [level,setLevel]=useState<BattleChallengeLevel>(50),[difficulty,setDifficulty]=useState<CpuDifficulty>('EXPERT');
 const base=useMemo(()=>ABILITY_DEFINITIONS.filter(x=>(abilityProgress.levels[x.id]??0)>0),[abilityProgress]);
 const fused=useMemo(()=>RESONANCE_DEFINITIONS.filter(x=>(resonanceProgress.levels[x.id]??0)>0),[resonanceProgress]);
 const equipped=currentConfig.abilities.map(x=>{const d=ABILITY_DEFINITIONS.find(y=>y.id===x.id)??RESONANCE_DEFINITIONS.find(y=>y.id===x.id);return d?d.name+' Lv.'+x.level:x.id+' Lv.'+x.level;});
 const latestGrade=lastRun?.phase==='BATTLE_FINISHED'?gradeRun(lastRun):null;
 return <main className="experiment-lab"><div className="experiment-lab__inner">
 <header className="experiment-lab__header"><button className="lab-back" onClick={onBack} type="button"><ArrowLeft size={16}/> ホームへ戻る</button><div className="lab-brand"><span><FlaskConical size={23}/></span><div><small>TACTICAL LABORATORY / 00</small><h1>実験場</h1></div></div><b className="lab-safe"><ShieldCheck size={14}/> NO REWARDS · NO RISK</b></header>
 <section className="lab-hero"><div className="lab-orbit"/><div><p><Activity size={14}/> COMBAT SIMULATION / REAL ENGINE</p><h2>負けてもいい。<br/><em>ここで全部、試せ。</em></h2><p className="lab-hero-summary">本編と同じ戦闘エンジンで権能・ステータス・刻印の編成を検証。勝敗は戦績、実績、解放条件、通貨へ反映されない。</p><div className="lab-stats"><span><Swords size={14}/> 敵Lv.10〜100</span><span><Gauge size={14}/> CPU 2段階</span><span><Gem size={14}/> 所持データのみ</span></div></div><div className="lab-emblem"><div/><div/><FlaskConical size={58}/><small>FIELD TEST</small></div></section>
 {lastRun?.phase==='BATTLE_FINISHED'&&latestGrade&&<section className="lab-last"><Trophy size={21}/><div><small>LAST TEST / 直近の実験</small><b>{lastRun.winnerIsPlayer?'試験成功':'試験終了'} · カイザー Lv.{lastRun.battleConfig.kaiserLevel}</b><span>{lastRun.cpuDifficulty} CPU · {lastRun.turnNumber}ターン</span></div><strong>{latestGrade}</strong><small>本編記録なし</small></section>}
 <ExperimentalArcade/>
 <section className="lab-section"><header><div><small>READY-MADE TESTS</small><h2>試験プロトコル</h2></div><span>目的に合わせて選ぶ</span></header><div className="lab-trials">{EXPERIMENT_TRIALS.map(t=><TrialCard key={t.id} trial={t} onStart={()=>onStartTrial(t.kaiserLevel,t.difficulty)}/>)}</div></section>
 <section className="lab-custom"><header><span><Target size={20}/></span><div><small>CUSTOM SCENARIO</small><h2>自由試験</h2><p>本編で未解放のレベルも選択可能。進行状況は変わらない。</p></div></header>
 <div className="lab-levels" role="group" aria-label="実験用カイザーレベル">{BATTLE_CHALLENGE_LEVELS.map(n=><button key={n} className={level===n?'selected':''} aria-pressed={level===n} onClick={()=>setLevel(n)} type="button">Lv.{n}</button>)}</div>
 <div className="lab-custom-bottom"><div className="lab-difficulty" role="group" aria-label="CPU難易度"><button className={difficulty==='NORMAL'?'selected':''} onClick={()=>setDifficulty('NORMAL')} aria-pressed={difficulty==='NORMAL'} type="button">NORMAL <small>行動確認</small></button><button className={difficulty==='EXPERT'?'selected':''} onClick={()=>setDifficulty('EXPERT')} aria-pressed={difficulty==='EXPERT'} type="button">EXPERT <small>実戦圧力</small></button></div><button className="lab-launch" type="button" onClick={()=>onStartTrial(level,difficulty)}><Swords size={17}/> この条件で編成へ</button></div></section>
 <section className="lab-inventory"><header><div><small>LOADOUT INTELLIGENCE</small><h2>今回使える権能</h2></div><span>装備は編成画面で選択</span></header><div className="lab-counts"><div>元権能 <b>{base.length}<small> / {ABILITY_DEFINITIONS.length}</small></b></div><div>共鳴権能 <b>{fused.length}<small> / {RESONANCE_DEFINITIONS.length}</small></b></div><div>現在の編成 <b>{equipped.length}<small> / 2</small></b></div></div><div className="lab-powers">
 {base.map(x=><span key={x.id}>{x.symbol} {x.name} <b>Lv.{abilityProgress.levels[x.id]}</b></span>)}{fused.map(x=><span className="fused" key={x.id}>{x.symbol} {x.name} <b>Lv.{resonanceProgress.levels[x.id]}</b></span>)}
 {!base.length&&!fused.length&&<p>権能を獲得すると、所持能力がここに表示されます。</p>}</div>
 <aside><ShieldCheck size={17}/><p><b>セーブ保護：</b>戦闘結果、報酬、Lv.50共鳴解放、Lv.100報酬、実績進行、素材消費を無効化。評価はその場限り。</p></aside></section>
 <footer className="lab-footer"><span><Sparkles size={14}/> TEST BOLDLY. KEEP YOUR SAVE SAFE.</span><span>戦績にも通貨にも影響しない、自由な戦術検証室。</span></footer>
 </div></main>;
};
interface ReportProps{state:BattleUiState;onBackToLab:()=>void;onRetry:()=>void;onAdjust:()=>void;}
export const ExperimentReportScreen:React.FC<ReportProps>=({state,onBackToLab,onRetry,onAdjust})=>{
 const pmax=Math.max(1,state.player.character.maxHp),emax=Math.max(1,state.enemy.character.maxHp),php=Math.max(0,state.player.currentHp),ehp=Math.max(0,state.enemy.currentHp);
 const pp=Math.max(0,Math.min(100,Math.round(php/pmax*100))),ep=Math.max(0,Math.min(100,Math.round(ehp/emax*100)));
 const grade=getExperimentGrade(state.winnerIsPlayer===true,pp/100,ep/100);
 const abilities=state.battleConfig.abilities.map(x=>{const d=ABILITY_DEFINITIONS.find(y=>y.id===x.id)??RESONANCE_DEFINITIONS.find(y=>y.id===x.id);return d?d.name+' Lv.'+x.level:x.id+' Lv.'+x.level;});
 return <main className="experiment-report"><div className="experiment-report__inner"><header><button className="lab-back" onClick={onBackToLab} type="button"><ArrowLeft size={16}/> 実験場へ戻る</button><span><Activity size={14}/> TEST REPORT / NOT SAVED</span></header>
 <section className={'report-result '+(state.winnerIsPlayer?'win':'loss')}><div><small>{state.winnerIsPlayer?'TEST CLEARED':'TEST FAILED'}</small><h1>{state.winnerIsPlayer?'試験成功':'試験終了'}</h1><p>カイザー Lv.{state.battleConfig.kaiserLevel} · {state.cpuDifficulty} CPU</p></div><aside><small>参考評価</small><b>{grade}</b></aside></section>
 <section className="report-metrics"><article><small>終了ターン</small><b>{state.turnNumber}</b><label>TURN COUNT</label></article><article><small>いれーな残存HP</small><b>{fmt(php)} <i>/ {fmt(pmax)}</i></b><div><span style={{width:pp+'%'}}/></div><label>{pp}%</label></article><article><small>カイザー残存HP</small><b>{fmt(ehp)} <i>/ {fmt(emax)}</i></b><div className="enemy"><span style={{width:ep+'%'}}/></div><label>{ep}%</label></article></section>
 <section className="report-build"><header><span><Zap size={18}/></span><div><small>BUILD SNAPSHOT</small><h2>試験時の編成</h2></div></header><div><p><small>操作キャラ</small><b>{state.player.character.name}</b></p><p><small>装備権能</small><b>{abilities.length?abilities.join(' / '):'なし'}</b></p><p><small>刻印</small><b>{state.battleConfig.imprints?.length?state.battleConfig.imprints.join(' / '):'なし'}</b></p><p><small>難易度</small><b>{state.cpuDifficulty}</b></p></div><p className="report-note">この評価は実験場独自の参考指標。勝敗・ターン・HPは本編の戦績、実績、解放、報酬へ反映されません。</p></section>
 <section className="report-actions"><button onClick={onRetry} type="button"><RotateCcw size={16}/> 同じ条件で再試験</button><button onClick={onAdjust} type="button"><Target size={16}/> 条件を変える</button><button onClick={onBackToLab} type="button">実験場へ戻る <ChevronRight size={16}/></button></section>
 </div></main>;
};
