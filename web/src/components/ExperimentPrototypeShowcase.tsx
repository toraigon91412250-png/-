import React, { useMemo, useState } from 'react';
import {
  Activity, ArrowLeft, ChevronRight, Compass, Crown, Eye, FlaskConical,
  Heart, Layers, RotateCcw, Shield, ShieldCheck, Sparkles, Swords, Target,
  Trophy, Zap, Crosshair, Footprints, Hammer, CheckCircle2,
} from 'lucide-react';
import { ABILITY_DEFINITIONS } from '../data/abilities';
import { RESONANCE_DEFINITIONS } from '../data/resonanceAbilities';
import {
  ASCENT_RELICS,
  createAscentCombatState,
  createBossForgeState,
  getBossForgeIntent,
  resolveBossForgeTurn,
  type BossForgeAction,
  type BossForgePattern,
  type BossForgeState,
  createObservatoryState,
  createResonanceTrialState,
  getAscentRelicChoices,
  getAscentRouteChoices,
  getObservatoryIntent,
  getResonanceIntent,
  getResonancePrototypeAnalysis,
  resolveAscentTurn,
  resolveObservatoryTurn,
  resolveResonanceTrialTurn,
  type AscentCombatState,
  type AscentNodeType,
  type AscentRelic,
  type ObservatoryAction,
  type ObservatoryState,
  type ResonanceDoctrine,
  type ResonancePrototypeAnalysis,
  type ResonanceTrialAction,
  type ResonanceTrialState,
} from '../utils/experimentPrototypes';
import './ExperimentPrototypeShowcase.css';

type PrototypeId = 'ASCENT' | 'OBSERVATORY' | 'COMPILER' | 'BOSSFORGE';
interface Props { onViewChange: (isPlayingPrototype: boolean) => void; }

const PROTOTYPE_CARDS: readonly {
  id: PrototypeId;
  number: string;
  title: string;
  tagline: string;
  description: string;
  loop: string;
  question: string;
  accent: string;
}[] = [
  {
    id: 'ASCENT',
    number: '01',
    title: '虚空踏破',
    tagline: 'ROGUELITE / 5 FLOORS',
    description: '分岐ルートを選び、連戦でHPを管理しながら遺物を集める。安全な祭壇か、危険だが高得点の精鋭か。最後は虚空皇帝が待つ。',
    loop: 'ルート選択 → 戦闘 / イベント → 遺物ドラフト → 次の階層',
    question: '毎回違うビルドが生まれる「本編外の周回モード」は面白いか？',
    accent: 'violet',
  },
  {
    id: 'OBSERVATORY',
    number: '02',
    title: '行動観測室',
    tagline: 'TELEGRAPH TACTICS / CORE DEFENSE',
    description: '敵の攻撃範囲を先に見て、3レーンを移動。自分のHPだけでなく拠点コアも守りながら皇帝を倒す、読み合い重視の戦術パズル。',
    loop: '予告を読む → 移動 / 防御 / 迎撃 → 攻撃機会を作る',
    question: '攻撃予測を「通常戦闘には出さず、専用モードの戦術」として採用できるか？',
    accent: 'cyan',
  },
  {
    id: 'COMPILER',
    number: '03',
    title: '共鳴コンパイラ',
    tagline: 'BUILDCRAFT / VIRTUAL POWERS',
    description: '元権能と共鳴権能から2つ選び、戦闘思想を決めて仮想戦闘へ。未所持の権能も実験限定で組めるため、実装前のアイデア検証にも使える。',
    loop: '権能を2つ選ぶ → 戦術方針を選ぶ → 仮想戦闘で試す → 評価',
    question: '新しい権能・共鳴の相性を本編に入れる前に触って決められるか？',
    accent: 'gold',
  },
  {
    id: 'BOSSFORGE',
    number: '04',
    title: '皇帝行動工房',
    tagline: 'BOSS DESIGN / TUNE & PLAY',
    description: '皇帝の最大HP・攻撃圧力・3手の行動列を自分で設計。その場で戦って、強すぎる/弱すぎるボスがどんな手触りになるか確かめられる。',
    loop: 'ボスを設計 → 行動列を編む → 試験戦闘 → 条件を調整して再戦',
    question: '本編に入れる前にボスの圧力と読み合いを自分で調整できるか？',
    accent: 'rose',
  },
];

function PrototypeHeader({ number, eyebrow, title, onBack }: { number: string; eyebrow: string; title: string; onBack: () => void }) {
  return (
    <header className="epx-play-header">
      <button type="button" className="epx-back" onClick={onBack}><ArrowLeft size={16} /> 試作品一覧へ</button>
      <div className="epx-play-name"><span>LAB / {number}</span><small>{eyebrow}</small><h2>{title}</h2></div>
      <span className="epx-isolated"><ShieldCheck size={14} /> LOCAL SANDBOX</span>
    </header>
  );
}

function Meter({ label, value, max, tone = 'cyan' }: { label: string; value: number; max: number; tone?: 'cyan' | 'red' | 'violet' | 'gold' }) {
  const safeMax = Math.max(1, max);
  const percent = Math.max(0, Math.min(100, Math.round(value / safeMax * 100)));
  return <div className="epx-meter"><div className="epx-meter-label"><span>{label}</span><strong>{Math.max(0, Math.round(value)).toLocaleString('ja-JP')}<small> / {Math.round(max).toLocaleString('ja-JP')}</small></strong></div><div className="epx-meter-track"><span className={'epx-meter-fill epx-tone-' + tone} style={{ width: percent + '%' }} /></div></div>;
}

function LogPanel({ logs }: { logs: readonly string[] }) {
  return <div className="epx-log" aria-live="polite"><div className="epx-log-title"><Activity size={14} /> COMBAT FEED</div>{logs.slice(-5).map((line, index) => <p key={logs.length - Math.min(5, logs.length) + index}>{line}</p>)}</div>;
}

export const ExperimentPrototypeShowcase: React.FC<Props> = ({ onViewChange }) => {
  const [active, setActive] = useState<PrototypeId | null>(null);
  const enter = (id: PrototypeId) => { setActive(id); onViewChange(true); };
  const backToCatalog = () => { setActive(null); onViewChange(false); };

  if (active === 'ASCENT') return <AscentPrototype onBack={backToCatalog} />;
  if (active === 'OBSERVATORY') return <ObservatoryPrototype onBack={backToCatalog} />;
  if (active === 'COMPILER') return <ResonanceCompilerPrototype onBack={backToCatalog} />;
  if (active === 'BOSSFORGE') return <BossForgePrototype onBack={backToCatalog} />;

  return (
    <section className="epx-catalog" aria-labelledby="epx-catalog-title">
      <div className="epx-catalog-heading">
        <div><p>PLAYABLE CONCEPTS / BUILD 0.1</p><h2 id="epx-catalog-title">試作品ショーケース</h2><span>各ボタンから実際に遊べる。全て仮実装で、本編のセーブ・通貨・解放条件には触れない。</span></div>
        <span className="epx-count"><FlaskConical size={16} /> 4 PROTOTYPES</span>
      </div>
      <div className="epx-prototype-grid">
        {PROTOTYPE_CARDS.map(card => (
          <article className={'epx-prototype-card epx-card-' + card.accent} key={card.id}>
            <div className="epx-card-top"><span>PROTOTYPE {card.number}</span><span className="epx-live-tag"><span /> PLAYABLE</span></div>
            <div className="epx-card-emblem" aria-hidden="true">
              {card.id === 'ASCENT' ? <Compass size={36} strokeWidth={1.5} /> : card.id === 'OBSERVATORY' ? <Crosshair size={36} strokeWidth={1.5} /> : card.id === 'BOSSFORGE' ? <Hammer size={36} strokeWidth={1.5} /> : <Layers size={36} strokeWidth={1.5} />}
              <b>{card.number}</b>
            </div>
            <p className="epx-card-tagline">{card.tagline}</p>
            <h3>{card.title}</h3>
            <p className="epx-card-description">{card.description}</p>
            <div className="epx-card-loop"><span>CORE LOOP</span><p>{card.loop}</p></div>
            <div className="epx-card-question"><Eye size={15} /><p>{card.question}</p></div>
            <button type="button" className="epx-launch" onClick={() => enter(card.id)}>この試作品をプレイ <ChevronRight size={18} /></button>
          </article>
        ))}
      </div>
      <div className="epx-research-note">
        <div><BookIcon /></div>
        <p><strong>設計メモ：</strong>ルート選択と遺物による周回の変化、予告された敵行動への対処、ビルド相性の可視化を独立して試す。元ネタの再現ではなく、このゲームに合うかを判断するための小さな実験。</p>
      </div>
    </section>
  );
};

function BookIcon() {
  return <Layers size={18} />;
}

type AscentStep = 'CLASS' | 'ROUTE' | 'COMBAT' | 'REWARD' | 'RESULT';
interface AscentRun {
  step: AscentStep;
  seed: number;
  floor: number;
  hp: number;
  maxHp: number;
  energy: number;
  score: number;
  relicIds: string[];
  startStyle: string;
  combat: AscentCombatState | null;
  nodeType: AscentNodeType | null;
  cleared: boolean;
  log: string;
}

const EMPTY_ASCENT: AscentRun = {
  step: 'CLASS', seed: 0, floor: 1, hp: 100, maxHp: 100, energy: 0, score: 0,
  relicIds: [], startStyle: '', combat: null, nodeType: null, cleared: false, log: '初期プロトコルを選び、5階層の踏破を開始する。',
};

function AscentPrototype({ onBack }: { onBack: () => void }) {
  const [run, setRun] = useState<AscentRun>({ ...EMPTY_ASCENT, relicIds: [] });
  const start = (style: string, relicId: string) => {
    const relic = ASCENT_RELICS.find(item => item.id === relicId);
    const maxHp = 100 + (relic?.maxHpBonus ?? 0);
    setRun({ ...EMPTY_ASCENT, step: 'ROUTE', seed: Math.floor(Math.random() * 3), hp: maxHp, maxHp, energy: relicId === 'LAST_SPARK' ? 1 : 0, relicIds: [relicId], startStyle: style, log: style + 'プロトコル起動。今回のルートが生成された。' });
  };
  const chooseNode = (nodeType: AscentNodeType) => {
    if (nodeType === 'SHRINE') {
      setRun(prev => ({ ...prev, hp: Math.min(prev.maxHp, prev.hp + 26), score: prev.score + 8, floor: prev.floor + 1, log: '祭壇でHPを回復。次の階層へ。' }));
      return;
    }
    if (nodeType === 'FORGE') {
      setRun(prev => ({ ...prev, step: 'REWARD', nodeType, combat: null, log: '鍛造所を発見。遺物をひとつ選ぶ。' }));
      return;
    }
    setRun(prev => ({
      ...prev,
      step: 'COMBAT',
      nodeType,
      combat: createAscentCombatState({
        floor: prev.floor, nodeType,
        playerHp: prev.hp, playerMaxHp: prev.maxHp, energy: prev.energy,
        score: prev.score, relicIds: prev.relicIds,
      }),
      log: nodeType === 'BOSS' ? '虚空皇帝が現れた。予告を読み、ゲージを管理しろ。' : '敵の予告を確認。蓄力と防御を使い分けろ。',
    }));
  };
  const act = (action: 'STRIKE' | 'GUARD' | 'CHARGE' | 'BURST') => {
    if (!run.combat) return;
    const combat = resolveAscentTurn(run.combat, action);
    setRun(prev => ({
      ...prev,
      combat,
      hp: combat.playerHp,
      maxHp: combat.playerMaxHp,
      energy: combat.energy,
      score: combat.score,
      step: combat.status === 'DEFEAT' ? 'RESULT' : combat.status === 'VICTORY' ? (combat.isBoss ? 'RESULT' : 'REWARD') : 'COMBAT',
      cleared: combat.status === 'VICTORY' && combat.isBoss,
      log: combat.logs[combat.logs.length - 1] ?? prev.log,
    }));
  };
  const chooseRelic = (relic: AscentRelic) => {
    setRun(prev => {
      const maxHp = prev.maxHp + relic.maxHpBonus;
      const hp = Math.min(maxHp, prev.hp + relic.healOnAcquire);
      const floor = prev.nodeType === 'BOSS' ? 5 : prev.floor + (prev.nodeType === 'FORGE' || prev.combat?.status === 'VICTORY' ? 1 : 0);
      const nextFloor = prev.nodeType === 'FORGE' ? prev.floor + 1 : floor;
      return {
        ...prev, step: nextFloor > 5 ? 'RESULT' : 'ROUTE', floor: nextFloor,
        hp, maxHp, relicIds: [...prev.relicIds, relic.id], nodeType: null, combat: null,
        cleared: false, log: relic.name + 'を獲得。現在の構成に組み込んだ。',
      };
    });
  };
  const reset = () => setRun({ ...EMPTY_ASCENT, relicIds: [] });
  const combat = run.combat;
  const ascentIntentText: Record<string, string> = {
    HEAVY: '重撃 / 大ダメージ', SWEEP: '薙ぎ払い / 標準ダメージ', RECOVER: '再構成 / 敵が回復',
  };
  const relicChoices = useMemo(() => getAscentRelicChoices(run.relicIds, run.floor, run.seed), [run.relicIds, run.floor, run.seed]);

  return (
    <section className="epx-game">
      <PrototypeHeader number="01" eyebrow="ROGUELITE / 5 FLOORS" title="虚空踏破" onBack={onBack} />
      {run.step === 'CLASS' && <>
        <div className="epx-game-hero epx-hero-violet"><span>RUN SEED / EXPERIMENT ONLY</span><h3>5階層を踏破せよ。</h3><p>HPと遺物は次の戦闘へ引き継ぐ。道を選ぶ判断が、最後のボス戦の難度を変える。</p></div>
        <div className="epx-choice-grid">
          <button type="button" onClick={() => start('斬影型', 'IRON_FEATHER')}><Swords size={22} /><strong>斬影型</strong><span>通常攻撃 +4</span><small>手数で押し切る</small></button>
          <button type="button" onClick={() => start('守護型', 'VOID_HEART')}><Heart size={22} /><strong>守護型</strong><span>最大HP +15</span><small>ルート選択に余裕</small></button>
          <button type="button" onClick={() => start('解放型', 'ECHO_BATTERY')}><Zap size={22} /><strong>解放型</strong><span>共鳴解放 +12</span><small>蓄力の価値を上げる</small></button>
        </div>
      </>}
      {run.step !== 'CLASS' && <div className="epx-run-summary">
        <div><small>FLOOR</small><strong>{Math.min(run.floor, 5)} <i>/ 5</i></strong></div>
        <div><small>HP</small><strong>{run.hp}<i> / {run.maxHp}</i></strong><div className="epx-mini-track"><span className="epx-tone-cyan" style={{ width: Math.max(0, Math.min(100, run.hp / Math.max(1, run.maxHp) * 100)) + '%' }} /></div></div>
        <div><small>ENERGY</small><strong>{'◆'.repeat(run.energy)}{'◇'.repeat(Math.max(0, 3 - run.energy))}</strong></div>
        <div><small>RELICS</small><strong>{run.relicIds.length}<i> / 6</i></strong></div>
      </div>}
      {run.step === 'ROUTE' && <>
        <div className="epx-step-heading"><small>CHOOSE YOUR PATH / FLOOR {run.floor}</small><h3>{run.floor === 5 ? '最後の扉が開いた' : '次の一歩を選べ'}</h3><p>{run.floor === 5 ? '回復や買い物はここまで。虚空皇帝との最終戦へ。' : '安全な道はHPを守る。危険な道は強い遺物を得る。'}</p></div>
        <div className="epx-route-grid">{getAscentRouteChoices(run.floor, run.seed).map(node => (
          <button className={'epx-route epx-route-' + node.type.toLowerCase()} type="button" key={node.id} onClick={() => chooseNode(node.type)}>
            <span>{node.type === 'SHRINE' ? <Heart size={20} /> : node.type === 'FORGE' ? <Hammer size={20} /> : node.type === 'BOSS' ? <Crown size={20} /> : node.type === 'ELITE' ? <Target size={20} /> : <Swords size={20} />}</span>
            <small>{node.type === 'BOSS' ? 'FINAL BOSS' : node.type === 'ELITE' ? 'HIGH RISK' : node.type}</small><strong>{node.title}</strong><p>{node.reward}</p><em>{node.risk}</em>
          </button>
        ))}</div>
      </>}
      {run.step === 'COMBAT' && combat && <>
        <div className="epx-combat-arena">
          <div className="epx-enemy-top"><div><small>{combat.isBoss ? 'FINAL ENCOUNTER' : combat.isElite ? 'ELITE ENCOUNTER' : 'ENCOUNTER'} / FLOOR {combat.floor}</small><h3>{combat.enemyName}</h3></div><span className={'epx-intent epx-intent-' + combat.intent.toLowerCase()}><Eye size={15} /> {ascentIntentText[combat.intent]}</span></div>
          <Meter label="ENEMY HP" value={combat.enemyHp} max={combat.enemyMaxHp} tone="red" />
          <div className="epx-duel-stat"><span><Heart size={16} /> いれーな HP</span><strong>{combat.playerHp} / {combat.playerMaxHp}</strong><span><Zap size={16} /> エネルギー</span><strong>{'◆'.repeat(combat.energy)}{'◇'.repeat(Math.max(0, 3 - combat.energy))}</strong></div>
          <p className="epx-turn-tip">{combat.intent === 'RECOVER' ? '敵が再構成中。今は強い攻撃を当てるチャンス。' : combat.intent === 'HEAVY' ? '重撃が来る。防御でダメージを抑えるか、撃破を狙え。' : '薙ぎ払いが来る。エネルギーとHPの交換を考えよう。'}</p>
          <div className="epx-action-grid">
            <button type="button" onClick={() => act('STRIKE')}><Swords size={18} /><strong>斬撃</strong><span>14 + 連撃補正</span></button>
            <button type="button" onClick={() => act('GUARD')}><Shield size={18} /><strong>防御</strong><span>被ダメ軽減・+1ゲージ</span></button>
            <button type="button" onClick={() => act('CHARGE')}><Zap size={18} /><strong>蓄力</strong><span>+2ゲージ</span></button>
            <button type="button" disabled={combat.energy < 3} onClick={() => act('BURST')}><Sparkles size={18} /><strong>共鳴解放</strong><span>3ゲージ・大ダメージ</span></button>
          </div>
          <LogPanel logs={combat.logs} />
        </div>
      </>}
      {run.step === 'REWARD' && <>
        <div className="epx-result-banner epx-banner-good"><Trophy size={24} /><div><small>{run.nodeType === 'FORGE' ? 'FORGE REWARD' : 'ENCOUNTER CLEARED'}</small><h3>{run.nodeType === 'FORGE' ? '鍛造する遺物を選べ' : '勝利。次の一手を強くする'}</h3><p>選んだ遺物は今回のランの間だけ効果を持つ。</p></div></div>
        <div className="epx-relic-grid">{relicChoices.map(relic => <RelicCard key={relic.id} relic={relic} onChoose={() => chooseRelic(relic)} />)}</div>
        {relicChoices.length === 0 && <button className="epx-primary" onClick={() => setRun(prev => ({ ...prev, step: 'ROUTE', floor: prev.floor + 1, combat: null, nodeType: null }))} type="button">次の階層へ <ChevronRight size={17} /></button>}
      </>}
      {run.step === 'RESULT' && <div className={'epx-finish ' + (run.cleared ? 'epx-finish-win' : 'epx-finish-loss')}>
        <div className="epx-finish-mark">{run.cleared ? <Trophy size={36} /> : <RotateCcw size={36} />}</div><small>{run.cleared ? 'VOID ASCENT / CLEARED' : 'VOID ASCENT / RUN ENDED'}</small>
        <h3>{run.cleared ? '虚空踏破、達成。' : '今回の踏破はここまで。'}</h3><p>{run.cleared ? '5階層を越えた。遺物の選び方とHP管理が勝ち筋を作った。' : '敗北も今回限り。初期型やルートを変えて、もう一度試そう。'}</p>
        <div className="epx-score-line"><span>LOCAL SCORE</span><strong>{run.score.toLocaleString('ja-JP')}</strong><span>階層 {Math.min(5, run.floor)} / 5 · 遺物 {run.relicIds.length}個</span></div>
        <div className="epx-end-actions"><button className="epx-primary" onClick={reset} type="button"><RotateCcw size={17} /> 別の構成で再挑戦</button><button className="epx-secondary" onClick={onBack} type="button">試作品一覧へ</button></div>
      </div>}
      {run.step !== 'CLASS' && <div className="epx-relic-strip"><span>現在の遺物</span>{run.relicIds.map(id => { const relic = ASCENT_RELICS.find(item => item.id === id); return relic ? <span title={relic.description} key={id}>{relic.symbol} {relic.name}</span> : null; })}</div>}
      <div className="epx-no-save"><ShieldCheck size={15} /> このランのHP・遺物・スコアは画面を閉じると消える。本編データには保存されない。</div>
    </section>
  );
}

function RelicCard({ relic, onChoose }: { relic: AscentRelic; onChoose: () => void }) {
  return <button type="button" className="epx-relic-card" onClick={onChoose}><span>{relic.symbol}</span><strong>{relic.name}</strong><p>{relic.description}</p><em>この遺物を選ぶ <ChevronRight size={15} /></em></button>;
}

function ObservatoryPrototype({ onBack }: { onBack: () => void }) {
  const [state, setState] = useState<ObservatoryState>(() => createObservatoryState());
  const [targetLane, setTargetLane] = useState(1);
  const intent = getObservatoryIntent(state.turn, state.bossHp, state.bossMaxHp);
  const act = (action: ObservatoryAction) => {
    setState(prev => resolveObservatoryTurn(prev, action, targetLane));
    setTargetLane(action === 'DODGE' ? targetLane : state.playerLane);
  };
  const selectLane = (lane: number) => setTargetLane(lane);
  const reset = () => { setState(createObservatoryState()); setTargetLane(1); };
  const finished = state.status !== 'ACTIVE';
  const laneName = ['左', '中央', '右'];

  return (
    <section className="epx-game">
      <PrototypeHeader number="02" eyebrow="TELEGRAPH TACTICS / CORE DEFENSE" title="行動観測室" onBack={onBack} />
      <div className="epx-observatory-intro"><div><small>THREAT FORECAST / TURN {state.turn}</small><h3>{intent.title}</h3><p>{intent.description}</p></div><div className="epx-intent-big"><Crosshair size={24} /><strong>{intent.kind === 'CORE' ? 'CORE' : intent.kind === 'NOVA' ? 'ALL' : intent.dangerLanes.map(lane => laneName[lane]).join(' + ')}</strong></div></div>
      <div className="epx-observatory-arena">
        <div className="epx-arena-top"><span><Crown size={16} /> 虚空皇帝</span><span>PHASE {state.bossHp / state.bossMaxHp <= 0.35 ? 'III' : state.bossHp / state.bossMaxHp <= 0.6 ? 'II' : 'I'}</span></div>
        <Meter label="KAISER HP" value={state.bossHp} max={state.bossMaxHp} tone="red" />
        <div className="epx-lanes" role="group" aria-label="移動先レーンを選択">
          {[0, 1, 2].map(lane => {
            const danger = intent.dangerLanes.includes(lane);
            return <button type="button" key={lane} onClick={() => selectLane(lane)} className={'epx-lane' + (state.playerLane === lane ? ' epx-lane-selected' : '') + (targetLane === lane ? ' epx-lane-target' : '') + (danger ? ' epx-lane-danger' : '')} aria-pressed={targetLane === lane}>
              <small>{laneName[lane]}レーン</small>{danger ? <Crosshair size={21} /> : <span className="epx-lane-safe-mark">SAFE</span>}
              <strong>{state.playerLane === lane ? '現在地' : targetLane === lane ? '移動先候補' : '移動可能'}</strong>{danger && <em>攻撃予告</em>}
            </button>;
          })}
        </div>
        {intent.kind === 'CORE' && <div className="epx-core-threat"><Target size={17} /><span>拠点コアがロックオン中。レーン移動だけでは攻撃を防げない。</span></div>}
        <div className="epx-observatory-stats">
          <div><Heart size={16} /><span>いれーな</span><strong>{state.playerHp} / 100</strong><div className="epx-mini-track"><span className="epx-tone-cyan" style={{ width: state.playerHp + '%' }} /></div></div>
          <div><Shield size={16} /><span>拠点コア</span><strong>{state.coreHp} / 100</strong><div className="epx-mini-track"><span className="epx-tone-gold" style={{ width: state.coreHp + '%' }} /></div></div>
          <div><Zap size={16} /><span>迎撃ゲージ</span><strong>{'◆'.repeat(state.energy)}{'◇'.repeat(Math.max(0, 3 - state.energy))}</strong></div>
        </div>
        {!finished ? <div className="epx-action-grid epx-observatory-actions">
          <button type="button" onClick={() => act('STRIKE')}><Swords size={18} /><strong>攻撃</strong><span>現在地から攻撃・+1ゲージ</span></button>
          <button type="button" onClick={() => act('GUARD')}><Shield size={18} /><strong>防御</strong><span>プレイヤー攻撃と核砲撃を軽減</span></button>
          <button type="button" onClick={() => act('DODGE')}><Footprints size={18} /><strong>移動・回避</strong><span>移動先候補へ移動。1ターン消費</span></button>
          <button type="button" disabled={state.energy < 1} onClick={() => act('INTERCEPT')}><Crosshair size={18} /><strong>迎撃</strong><span>1ゲージ消費・核砲撃を止める</span></button>
        </div> : <div className={'epx-outcome ' + (state.status === 'VICTORY' ? 'epx-outcome-win' : 'epx-outcome-loss')}><Trophy size={25} /><div><small>SIMULATION COMPLETE</small><h3>{state.status === 'VICTORY' ? '拠点防衛成功' : '防衛ライン崩壊'}</h3><p>スコア {state.score} · {state.turn - 1}ターン経過</p></div><button type="button" className="epx-primary" onClick={reset}><RotateCcw size={16} /> 再試験</button></div>}
        <LogPanel logs={state.logs} />
      </div>
      <div className="epx-prototype-principle"><Eye size={16} /><p><strong>操作の要点：</strong>レーンを選ぶだけでは移動しない。攻撃や防御は現在地で行動し、移動・回避を選んだ時だけ1ターン使って移動する。敵の予告を読んで、攻めるか避けるかを決めよう。</p></div>
    </section>
  );
}

type AbilityOption = { id: string; name: string; symbol: string; description: string; kind: 'BASE' | 'RESONANCE' };
function ResonanceCompilerPrototype({ onBack }: { onBack: () => void }) {
  const options: AbilityOption[] = useMemo(() => [
    ...ABILITY_DEFINITIONS.map(item => ({ id: item.id, name: item.name, symbol: item.symbol, description: item.shortDescription, kind: 'BASE' as const })),
    ...RESONANCE_DEFINITIONS.map(item => ({ id: item.id, name: item.name, symbol: item.symbol, description: item.shortDescription, kind: 'RESONANCE' as const })),
  ], []);
  const [selectedIds, setSelectedIds] = useState<string[]>(['FALLEN', 'FALLEN_KING']);
  const [doctrine, setDoctrine] = useState<ResonanceDoctrine>('BURST');
  const [compiled, setCompiled] = useState<{ ids: string[]; doctrine: ResonanceDoctrine; analysis: ResonancePrototypeAnalysis } | null>(null);
  const [state, setState] = useState<ResonanceTrialState | null>(null);
  const selectedOptions = selectedIds.map(id => options.find(option => option.id === id)).filter((option): option is AbilityOption => Boolean(option));
  const analysis = getResonancePrototypeAnalysis(selectedIds[0] ?? 'FALLEN', selectedIds[1] ?? selectedIds[0] ?? 'FALLEN_KING');
  const togglePower = (id: string) => {
    setSelectedIds(previous => {
      if (previous.includes(id)) return previous.filter(existing => existing !== id);
      if (previous.length < 2) return [...previous, id];
      return [previous[1], id];
    });
  };
  const startTrial = () => {
    if (selectedIds.length !== 2 || selectedIds[0] === selectedIds[1]) return;
    setCompiled({ ids: [...selectedIds], doctrine, analysis });
    setState(createResonanceTrialState());
  };
  const act = (action: ResonanceTrialAction) => {
    if (!state || !compiled) return;
    setState(prev => prev ? resolveResonanceTrialTurn(prev, action, compiled.analysis, compiled.doctrine) : prev);
  };
  const resetBuild = () => { setState(null); setCompiled(null); };

  if (state && compiled) {
    const isDone = state.status !== 'ACTIVE';
    const usedOptions = compiled.ids.map(id => options.find(option => option.id === id)).filter((option): option is AbilityOption => Boolean(option));
    const grade = state.status === 'VICTORY' ? (state.playerHp >= 65 ? 'S' : state.playerHp >= 35 ? 'A' : 'B') : state.enemyHp <= 50 ? 'B' : state.enemyHp <= 115 ? 'C' : 'D';
    return (
      <section className="epx-game">
        <PrototypeHeader number="03" eyebrow="BUILDCRAFT / VIRTUAL POWERS" title="共鳴コンパイラ" onBack={onBack} />
        <div className="epx-compiled-build"><div><small>COMPILED LOADOUT</small><h3>{usedOptions.map(option => option.name).join(' × ')}</h3><span>{compiled.analysis.title} / {compiled.analysis.style} / 方針 {compiled.doctrine === 'BURST' ? '一撃突破' : compiled.doctrine === 'SURVIVE' ? '不落' : '侵食戦'}</span></div><strong>{compiled.analysis.score}<small> SYNERGY</small></strong></div>
        <div className="epx-combat-arena">
          <div className="epx-enemy-top"><div><small>VIRTUAL TARGET / TURN {state.turn}</small><h3>模擬カイザー</h3></div><span className="epx-intent"><Eye size={15} /> {getResonanceIntent(state.turn) === 'PUNISH' ? '制裁攻撃' : getResonanceIntent(state.turn) === 'FEINT' ? '牽制攻撃' : '大きな隙'}</span></div>
          <Meter label="TARGET HP" value={state.enemyHp} max={230} tone="red" />
          <div className="epx-duel-stat"><span><Heart size={16} /> 試験HP</span><strong>{state.playerHp} / 100</strong><span><Zap size={16} /> エネルギー</span><strong>{'◆'.repeat(state.energy)}{'◇'.repeat(Math.max(0, 3 - state.energy))}</strong></div>
          {!isDone ? <div className="epx-action-grid">
            <button type="button" onClick={() => act('STRIKE')}><Swords size={18} /><strong>通常攻撃</strong><span>ゲージ+1・連撃補正</span></button>
            <button type="button" onClick={() => act('GUARD')}><Shield size={18} /><strong>防御</strong><span>被害軽減・ゲージ+1</span></button>
            <button type="button" onClick={() => act('CHARGE')}><Zap size={18} /><strong>蓄力</strong><span>ゲージ+2</span></button>
            <button type="button" disabled={state.energy < 3} onClick={() => act('BURST')}><Sparkles size={18} /><strong>共鳴解放</strong><span>ゲージ3・構成補正大</span></button>
          </div> : <div className={'epx-finish-mini ' + (state.status === 'VICTORY' ? 'epx-finish-win' : 'epx-finish-loss')}><small>TEST RESULT / NOT SAVED</small><h3>{state.status === 'VICTORY' ? '構成試験クリア' : '試験終了'}</h3><div className="epx-grade">{grade}</div><p>スコア {state.score} · 残HP {state.playerHp} · 敵残HP {state.enemyHp}</p><div className="epx-end-actions"><button type="button" className="epx-primary" onClick={() => setState(createResonanceTrialState())}><RotateCcw size={16} /> 同じ構成で再試験</button><button type="button" className="epx-secondary" onClick={resetBuild}>構成を変更</button></div></div>}
          <LogPanel logs={state.logs} />
        </div>
        <div className="epx-no-save"><ShieldCheck size={15} /> この構成は仮想試験限定。元権能の消費、共鳴合成、通貨、解放状態は一切変わらない。</div>
      </section>
    );
  }

  return (
    <section className="epx-game">
      <PrototypeHeader number="03" eyebrow="BUILDCRAFT / VIRTUAL POWERS" title="共鳴コンパイラ" onBack={onBack} />
      <div className="epx-game-hero epx-hero-gold"><span>POWER MATRIX / UNLOCKS BYPASS ONLY HERE</span><h3>未所持の権能も、ここなら試せる。</h3><p>これは仮想ロードアウト。実際の所持権能を消費せず、未解放の共鳴も組み合わせ候補にできる。相性スコアは仮説であり、本編のダメージ値ではない。</p></div>
      <div className="epx-build-selection">
        <div className="epx-step-heading"><small>STEP 01 / CHOOSE TWO POWERS</small><h3>権能を2つ選択</h3><p>元権能6種と共鳴権能10種。既存の権能定義から選び、本編の進行状況は参照しない。</p></div>
        <div className="epx-power-grid">{options.map(option => {
          const selected = selectedIds.includes(option.id);
          return <button type="button" key={option.id} className={'epx-power-option' + (selected ? ' epx-power-selected' : '') + (option.kind === 'RESONANCE' ? ' epx-power-resonance' : '')} onClick={() => togglePower(option.id)} aria-pressed={selected}>
            <span>{option.symbol}</span><div><small>{option.kind === 'RESONANCE' ? 'RESONANCE' : 'BASE AUTHORITY'}</small><strong>{option.name}</strong><p>{option.description}</p></div>{selected && <CheckCircle2 size={18} />}
          </button>;
        })}</div>
        <div className="epx-step-heading epx-step-heading-spaced"><small>STEP 02 / COMBAT DOCTRINE</small><h3>戦術方針</h3><p>同じ2権能でも、方針が違えば動かし方と評価が変わる。</p></div>
        <div className="epx-doctrine-grid">
          <button type="button" className={doctrine === 'BURST' ? 'epx-doctrine-selected' : ''} onClick={() => setDoctrine('BURST')}><Zap size={19} /><strong>一撃突破</strong><span>通常攻撃と解放の火力を重視。敵の隙に最大打点を叩き込む。</span></button>
          <button type="button" className={doctrine === 'SURVIVE' ? 'epx-doctrine-selected' : ''} onClick={() => setDoctrine('SURVIVE')}><Shield size={19} /><strong>不落</strong><span>受けるダメージを抑え、長い戦闘での安定性を優先。</span></button>
          <button type="button" className={doctrine === 'EROSION' ? 'epx-doctrine-selected' : ''} onClick={() => setDoctrine('EROSION')}><Activity size={19} /><strong>侵食戦</strong><span>毎ターン小さな追加ダメージ。長期戦で差を積み上げる。</span></button>
        </div>
        <div className="epx-analysis"><div className="epx-analysis-gauge"><strong>{analysis.score}</strong><span>/ 100</span></div><div><small>SYNERGY HYPOTHESIS</small><h3>{selectedOptions.length === 2 ? analysis.title : '2つ選んで相性を解析'}</h3><b>{selectedOptions.length === 2 ? analysis.style : 'LOADOUT INCOMPLETE'}</b><p>{selectedOptions.length === 2 ? analysis.description : '権能カードを2つ選ぶと、構成の仮説評価が表示される。'}</p></div></div>
        <button className="epx-primary epx-build-launch" disabled={selectedIds.length !== 2 || selectedIds[0] === selectedIds[1]} onClick={startTrial} type="button"><FlaskConical size={18} /> この構成で仮想戦闘 <ChevronRight size={18} /></button>
      </div>
    </section>
  );
}


const BOSS_PATTERN_OPTIONS: readonly { id: BossForgePattern; name: string; short: string; explanation: string }[] = [
  { id: 'CRUSH', name: '重撃', short: 'CRUSH', explanation: '通常より大きなダメージ。防御か回避が必要。' },
  { id: 'FEINT', name: '牽制', short: 'FEINT', explanation: '低めのダメージ。攻撃を続ける小さな窓。' },
  { id: 'RECOVER', name: '再構成', short: 'RECOVER', explanation: '皇帝が回復。隙を突いて大きく削る。' },
  { id: 'NOVA', name: '全域崩壊', short: 'NOVA', explanation: '最大圧力の一撃。防御で軽減、回避で無傷。' },
  { id: 'GUARD', name: '防御衝撃', short: 'GUARD', explanation: '皇帝が攻撃を受け流す。大技のタイミングをずらす。' },
];

function BossForgePrototype({ onBack }: { onBack: () => void }) {
  const [bossHp, setBossHp] = useState(180);
  const [pressure, setPressure] = useState(20);
  const [pattern, setPattern] = useState<BossForgePattern[]>(['CRUSH', 'FEINT', 'RECOVER']);
  const [state, setState] = useState<BossForgeState | null>(null);
  const intent = state ? getBossForgeIntent(state) : null;
  const done = state !== null && state.status !== 'ACTIVE';
  const act = (action: BossForgeAction) => setState(previous => previous ? resolveBossForgeTurn(previous, action) : previous);
  const start = () => setState(createBossForgeState({ bossMaxHp: bossHp, attackPressure: pressure, pattern }));
  const cyclePattern = (slot: number, next: BossForgePattern) => setPattern(previous => previous.map((value, index) => index === slot ? next : value));
  const resetFight = () => setState(previous => previous ? createBossForgeState(previous.config) : null);
  const intentInfo = BOSS_PATTERN_OPTIONS.find(option => option.id === intent);
  const grade = state?.status === 'VICTORY' ? (state.playerHp >= 65 ? 'S' : state.playerHp >= 35 ? 'A' : 'B')
    : state?.status === 'DEFEAT' ? (state.bossHp / Math.max(1, state.bossMaxHp) <= .25 ? 'B' : state.bossHp / Math.max(1, state.bossMaxHp) <= .55 ? 'C' : 'D') : null;

  return (
    <section className="epx-game">
      <PrototypeHeader number="04" eyebrow="BOSS DESIGN / TUNE & PLAY" title="皇帝行動工房" onBack={onBack} />
      {!state ? <>
        <div className="epx-game-hero epx-hero-rose">
          <span>ENCOUNTER DESIGNER / LOCAL ONLY</span>
          <h3>強いボスを作るだけじゃない。面白いボスを作れ。</h3>
          <p>最大HP・攻撃圧力・3ターンの行動列を調整して、その場で実戦。数値だけ上げた理不尽ボスと、読み合いが成立する強敵の差を体験する。保存も本編反映もなし。</p>
        </div>
        <div className="epx-forge-config">
          <div className="epx-step-heading"><small>STEP 01 / DURABILITY</small><h3>皇帝の最大HP</h3><p>長期戦を狙うか、短い高圧戦を狙うか。</p></div>
          <div className="epx-forge-choice-row">
            {[120, 180, 260].map(value => <button key={value} type="button" className={bossHp === value ? 'is-selected' : ''} aria-pressed={bossHp === value} onClick={() => setBossHp(value)}><strong>{value}</strong><small>{value === 120 ? '短期決戦' : value === 180 ? '標準' : '長期戦'}</small></button>)}
          </div>
          <div className="epx-step-heading epx-step-heading-spaced"><small>STEP 02 / THREAT</small><h3>基本攻撃圧力</h3><p>各攻撃の基準値。行動パターンによって追加補正が入る。</p></div>
          <div className="epx-forge-choice-row epx-forge-pressure">
            {[12, 20, 28].map(value => <button key={value} type="button" className={pressure === value ? 'is-selected' : ''} aria-pressed={pressure === value} onClick={() => setPressure(value)}><strong>{value}</strong><small>{value === 12 ? '調査向け' : value === 20 ? '標準圧力' : '高圧試験'}</small></button>)}
          </div>
          <div className="epx-step-heading epx-step-heading-spaced"><small>STEP 03 / TELEGRAPH SEQUENCE</small><h3>3手の行動列を設計</h3><p>ボスの行動は選んだ順にループする。回復の隙をどう突くか、ノヴァをどこで迎えるかを試そう。</p></div>
          <div className="epx-forge-sequence">
            {pattern.map((selected, slot) => (
              <div className="epx-forge-slot" key={slot}>
                <div className="epx-forge-slot-heading"><span>TURN {slot + 1}</span><strong>{BOSS_PATTERN_OPTIONS.find(option => option.id === selected)?.name}</strong></div>
                <div className="epx-forge-option-grid">
                  {BOSS_PATTERN_OPTIONS.map(option => <button key={option.id} title={option.explanation} type="button" className={selected === option.id ? 'is-selected' : ''} aria-pressed={selected === option.id} onClick={() => cyclePattern(slot, option.id)}>{option.short}</button>)}
                </div>
                <p>{BOSS_PATTERN_OPTIONS.find(option => option.id === selected)?.explanation}</p>
              </div>
            ))}
          </div>
          <button className="epx-primary epx-forge-start" type="button" onClick={start}><Hammer size={18} /> この皇帝と戦う <ChevronRight size={18} /></button>
        </div>
        <div className="epx-prototype-principle"><ShieldCheck size={16} /><p><strong>設計の評価軸：</strong>HPと攻撃力だけでなく、回復・防御・重撃の順序に意味があるか。繰り返し遊んで「強いけど納得できる」行動列を探す。</p></div>
      </> : <>
        <div className="epx-compiled-build epx-forge-live"><div><small>DESIGNED ENCOUNTER / TURN {state.turn}</small><h3>虚空皇帝・可変設計型</h3><span>HP {state.bossMaxHp} · 圧力 {state.config.attackPressure} · 行動列 {state.config.pattern.map(type => BOSS_PATTERN_OPTIONS.find(option => option.id === type)?.name).join(' → ')}</span></div><strong>{state.score}<small> LOCAL SCORE</small></strong></div>
        <div className="epx-combat-arena">
          <div className="epx-enemy-top"><div><small>PLAYER HP / {state.playerHp} · ENERGY / {state.energy}</small><h3>虚空皇帝・可変設計型</h3></div><span className={'epx-intent ' + (intent === 'RECOVER' ? 'epx-intent-recover' : '')}><Eye size={15}/>{intentInfo?.name} / {intentInfo?.short}</span></div>
          <Meter label="BOSS HP" value={state.bossHp} max={state.bossMaxHp} tone="red" />
          <Meter label="YOUR HP" value={state.playerHp} max={state.playerMaxHp} tone="cyan" />
          {intentInfo && <div className="epx-turn-tip"><strong>{intentInfo.name}の予告：</strong>{intentInfo.explanation}</div>}
          {!done ? <div className="epx-action-grid">
            <button type="button" onClick={() => act('STRIKE')}><Swords size={18}/><strong>通常攻撃</strong><span>連撃補正・+1ゲージ</span></button>
            <button type="button" onClick={() => act('GUARD')}><Shield size={18}/><strong>防御</strong><span>次の被害を65%軽減</span></button>
            <button type="button" onClick={() => act('EVADE')}><Footprints size={18}/><strong>回避</strong><span>成功すれば+1ゲージ</span></button>
            <button type="button" onClick={() => act('CHARGE')}><Zap size={18}/><strong>蓄力</strong><span>+2ゲージ</span></button>
            <button type="button" disabled={state.energy < 3} onClick={() => act('BURST')}><Sparkles size={18}/><strong>共鳴解放</strong><span>3ゲージ・大ダメージ</span></button>
          </div> : <div className={'epx-finish-mini ' + (state.status === 'VICTORY' ? 'epx-finish-win' : 'epx-finish-loss')}><small>TEST REPORT / NOT SAVED</small><h3>{state.status === 'VICTORY' ? '皇帝の設計を突破' : '試験失敗・設計は有効だったか？'}</h3><div className="epx-grade">{grade}</div><p>スコア {state.score} · 残HP {state.playerHp} · 皇帝残HP {state.bossHp}</p><div className="epx-end-actions"><button type="button" className="epx-primary" onClick={resetFight}><RotateCcw size={16}/> 同じ設計で再試験</button><button type="button" className="epx-secondary" onClick={() => setState(null)}>設計を調整</button></div></div>}
          <LogPanel logs={state.logs}/>
        </div>
        <div className="epx-no-save"><ShieldCheck size={15}/>この戦闘は実験限定。設定・スコア・勝敗は本編へ保存されない。</div>
      </>}
    </section>
  );
}
