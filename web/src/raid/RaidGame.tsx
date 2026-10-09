import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Crosshair,
  Feather,
  Gauge,
  Heart,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Zap,
} from 'lucide-react';
import raidBossArt from '../assets/raid_boss_art.svg';
import raidIrenaCutIn from '../assets/raid_irena_cutin.svg';
import { canUseRaidAction, createInitialRaidState, resolveRaidAction } from './engine';
import type { RaidAction, RaidPattern, RaidState } from './types';
import './raid.css';

interface RaidGameProps {
  onBack: () => void;
}

const BEST_SCORE_KEY = 'raidPrototypeV1BestScore';

const PATTERN_INFO: Record<RaidPattern, { name: string; danger: string; detail: string; recommendation: string }> = {
  SWEEP: {
    name: '黒爪薙ぎ',
    danger: 'WARNING',
    detail: '広い薙ぎ払いの予告。攻撃は通るが被弾する。防御で被害を抑えられる。',
    recommendation: '推奨: 通常攻撃で隙を突く。HPが不安なら防御。',
  },
  CHARGE: {
    name: '滅界砲',
    danger: 'HIGH THREAT',
    detail: '核を圧縮する大技。迎撃が成功すれば攻撃そのものを止められる。',
    recommendation: '推奨: 迎撃で攻撃を止める。迎撃できない場合は防御。',
  },
  VOID: {
    name: '虚無落雷',
    danger: 'MP DRAIN',
    detail: '空間を侵食する詠唱。羽弾を合わせると中断できる。',
    recommendation: '推奨: 羽弾で詠唱を中断。MP不足なら防御。',
  },
  RAGE: {
    name: '終焉衝動',
    danger: 'CRITICAL',
    detail: '深淵解放後の必殺級攻撃。迎撃か防御を選び、同じ行動に固執するな。',
    recommendation: '推奨: 迎撃で止める。資源不足なら防御。',
  },
};

const ACTIONS: Array<{
  id: RaidAction;
  label: string;
  english: string;
  detail: string;
  cost: string;
}> = [
  { id: 'ATTACK', label: '通常攻撃', english: 'STRIKE', detail: '安定したダメージ。薙ぎ払いの隙を突く。', cost: 'COST 0' },
  { id: 'FEATHER', label: '羽弾', english: 'FEATHER', detail: '高火力。虚無落雷を中断できる。', cost: 'MP 18' },
  { id: 'GUARD', label: '防御', english: 'GUARD', detail: '被害を抑えてHPを少し回復。大技への迎撃とは役割が違う。', cost: 'MP 10' },
  { id: 'COUNTER', label: '迎撃', english: 'COUNTER', detail: '滅界砲・終焉衝動に合わせれば反撃。', cost: 'MP 12' },
  { id: 'FOCUS', label: '集中', english: 'FOCUS', detail: '次の攻撃を大きく強化。必殺ゲージも回収。', cost: 'MP 8' },
  { id: 'ULTIMATE', label: '終天羽星穿ち', english: 'ULTIMATE', detail: '蓄積したゲージを解放する大ダメージ。', cost: 'TP 100' },
];

function formatNumber(value: number): string {
  return Math.max(0, Math.round(value)).toLocaleString('ja-JP');
}

function loadBestScore(): number {
  try {
    const value = Number(window.localStorage.getItem(BEST_SCORE_KEY) ?? 0);
    return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
  } catch {
    return 0;
  }
}

function ActionIcon({ action }: { action: RaidAction }) {
  if (action === 'ATTACK') return <Swords size={19} />;
  if (action === 'FEATHER') return <Feather size={19} />;
  if (action === 'GUARD') return <Shield size={19} />;
  if (action === 'COUNTER') return <Crosshair size={19} />;
  if (action === 'FOCUS') return <Gauge size={19} />;
  return <Zap size={19} />;
}

function HpBar({ value, max, kind }: { value: number; max: number; kind: 'boss' | 'player' }) {
  const percentage = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className={`raid-v1-bar raid-v1-bar--${kind}`}
      role="progressbar"
      aria-label={kind === 'boss' ? 'ボスHP' : 'いれーなHP'}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <span style={{ width: `${percentage}%` }} />
    </div>
  );
}

function ActionButton({
  action,
  state,
  onAction,
}: {
  action: (typeof ACTIONS)[number];
  state: RaidState;
  onAction: (id: RaidAction) => void;
}) {
  const enabled = canUseRaidAction(state, action.id);
  let disabledReason = '';
  if (action.id === 'FEATHER' && state.featherCooldown > 0) disabledReason = `再使用まで ${state.featherCooldown} 手`;
  else if (action.id === 'ULTIMATE' && state.tp < 100) disabledReason = 'ゲージ不足';
  else if (action.cost.startsWith('MP') && state.mp < Number(action.cost.replace('MP ', ''))) disabledReason = 'MP不足';

  return (
    <button
      className={`raid-v1-action raid-v1-action--${action.id.toLowerCase()}`}
      type="button"
      onClick={() => onAction(action.id)}
      disabled={!enabled}
      aria-label={action.label}
    >
      <span className="raid-v1-action-icon"><ActionIcon action={action.id} /></span>
      <span className="raid-v1-action-main">
        <span className="raid-v1-action-label">{action.label}</span>
        <span className="raid-v1-action-english">{action.english}</span>
      </span>
      <span className="raid-v1-action-cost">{enabled ? action.cost : disabledReason || action.cost}</span>
      <span className="raid-v1-action-detail">{action.detail}</span>
    </button>
  );
}

export const RaidGame: React.FC<RaidGameProps> = ({ onBack }) => {
  const [state, setState] = useState<RaidState>(() => createInitialRaidState());
  const [bestScore, setBestScore] = useState<number>(() => loadBestScore());

  useEffect(() => {
    if (state.result === 'ACTIVE') return;
    setBestScore(current => {
      const next = Math.max(current, state.score);
      try {
        window.localStorage.setItem(BEST_SCORE_KEY, String(next));
      } catch {
        // Score persistence is optional; the run must remain playable if storage is blocked.
      }
      return next;
    });
  }, [state.result, state.score]);

  const handleAction = (action: RaidAction) => {
    setState(current => resolveRaidAction(current, action));
  };

  const restart = () => setState(createInitialRaidState());
  const pattern = PATTERN_INFO[state.bossPattern];
  const tpPercent = Math.max(0, Math.min(100, state.tp));
  const breakPercent = Math.max(0, Math.min(100, state.breakGauge));

  return (
    <main className="raid-v1-shell">
      <header className="raid-v1-header">
        <button type="button" className="raid-v1-back" onClick={onBack} title="戻る">
          <ArrowLeft size={17} />
          <span>本編に戻る</span>
        </button>
        <div className="raid-v1-project">
          <span className="raid-v1-project-dot" />
          RAID PROJECT <strong>01</strong>
        </div>
        <span className="raid-v1-status">PLAYABLE PROTOTYPE</span>
      </header>

      <section className="raid-v1-hero" aria-labelledby="raid-v1-title">
        <div className="raid-v1-hero-copy">
          <p className="raid-v1-kicker">SOLO RAID / ABYSS DIVISION</p>
          <h1 id="raid-v1-title">アビスコア</h1>
          <p className="raid-v1-hero-subtitle">深淵喰らい · 封印核を破壊せよ</p>
          <p className="raid-v1-hero-description">
            予告を読み、正しい回答で反撃の主導権を奪う。
            深淵解放後は、同じ行動を続けるほどボスの適応が鋭くなる。
          </p>
          <div className="raid-v1-tags">
            <span>2 PHASES</span>
            <span>READ & COUNTER</span>
            <span>LOCAL SCORE</span>
          </div>
        </div>
        <div className="raid-v1-hero-art" aria-hidden="true">
          <div className="raid-v1-art-orbit" />
          <img src={raidBossArt} alt="" />
          <span className="raid-v1-art-label">CORE 0{state.phase}</span>
        </div>
      </section>

      <div className="raid-v1-runline">
        <div><span>PHASE</span><strong>{state.phase === 1 ? 'I · 封印核' : 'II · 深淵解放'}</strong></div>
        <div><span>TURN</span><strong>{String(state.turn).padStart(2, '0')}</strong></div>
        <div><span>RUN SCORE</span><strong>{formatNumber(state.score)}</strong></div>
        <div><span>BEST</span><strong>{formatNumber(Math.max(bestScore, state.score))}</strong></div>
      </div>

      <section className="raid-v1-battle-layout" aria-label="レイド戦闘">
        <div className="raid-v1-boss-card">
          <div className="raid-v1-boss-heading">
            <div>
              <p className="raid-v1-section-label">TARGET / 001</p>
              <h2>深淵喰らい・アビスコア</h2>
            </div>
            <span className={`raid-v1-phase-chip ${state.phase === 2 ? 'is-phase-two' : ''}`}>
              PHASE 0{state.phase}
            </span>
          </div>

          <div className="raid-v1-boss-stage">
            <div className="raid-v1-stage-grid" />
            <div className="raid-v1-stage-glow" />
            <img className="raid-v1-boss-image" src={raidBossArt} alt="アビスコアの姿" />
            {state.lastAction === 'FEATHER' && state.turn > 1 && state.result === 'ACTIVE' && (
              <img key={state.turn} className="raid-v1-cutin" src={raidIrenaCutIn} alt="" />
            )}
            {state.outcome.tone === 'phase' && (
              <div key={state.turn} className="raid-v1-phase-flash" aria-hidden="true">
                <span>PHASE II</span>
                <strong>深淵解放</strong>
              </div>
            )}
            <div className="raid-v1-boss-stage-caption">
              <span>ABYSS CORE</span>
              <span>{state.phase === 2 ? 'ADAPTATION ACTIVE' : 'SEALING CORE'}</span>
            </div>
          </div>

          <div className="raid-v1-boss-hp">
            <div className="raid-v1-bar-caption">
              <span>CORE INTEGRITY</span>
              <strong>{formatNumber(state.bossHp)} <small>/ {formatNumber(state.bossMaxHp)}</small></strong>
            </div>
            <HpBar value={state.bossHp} max={state.bossMaxHp} kind="boss" />
          </div>

          <div className="raid-v1-break-block">
            <div className="raid-v1-bar-caption">
              <span><Target size={13} /> BREAK GAUGE</span>
              <strong>{state.brokenTurns > 0 ? 'BURST WINDOW' : `${Math.round(breakPercent)}%`}</strong>
            </div>
            <div className={`raid-v1-break-bar ${state.brokenTurns > 0 ? 'is-broken' : ''}`}>
              <span style={{ width: state.brokenTurns > 0 ? '100%' : `${breakPercent}%` }} />
            </div>
            <p>{state.brokenTurns > 0 ? '次の攻撃ダメージ ×1.5。必殺を叩き込め。' : '迎撃・羽弾・攻撃でゲージを蓄積。満タンでボスが崩れる。'}</p>
          </div>

          <div className="raid-v1-intent">
            <div className="raid-v1-intent-top">
              <span>{state.brokenTurns > 0 ? 'OPENING DETECTED' : 'BOSS TELEGRAPH'}</span>
              <span className={`raid-v1-danger raid-v1-danger--${state.brokenTurns > 0 ? 'break' : state.bossPattern.toLowerCase()}`}>
                {state.brokenTurns > 0 ? 'BREAK' : pattern.danger}
              </span>
            </div>
            <h3>{state.brokenTurns > 0 ? 'バーストチャンス' : pattern.name}</h3>
            <p>{state.brokenTurns > 0 ? 'ボスは体勢を崩している。高火力行動でダメージを稼ぐ。' : pattern.detail}</p>
            <p className="raid-v1-intent-advice">{state.brokenTurns > 0 ? '推奨: 高火力行動。必殺ゲージが100なら必殺技。' : pattern.recommendation}</p>
          </div>
        </div>

        <aside className="raid-v1-player-column">
          <section className="raid-v1-player-card">
            <div className="raid-v1-player-title">
              <div className="raid-v1-avatar">IR</div>
              <div><p className="raid-v1-section-label">PLAYER / 001</p><h2>いれーな</h2></div>
              <span className="raid-v1-player-state">{state.playerHp > 0 ? 'ACTIVE' : 'DOWN'}</span>
            </div>
            <div className="raid-v1-player-stat">
              <div className="raid-v1-bar-caption"><span><Heart size={13} /> HP</span><strong>{formatNumber(state.playerHp)} <small>/ {formatNumber(state.playerMaxHp)}</small></strong></div>
              <HpBar value={state.playerHp} max={state.playerMaxHp} kind="player" />
            </div>
            <div className="raid-v1-resource-row">
              <div className="raid-v1-resource">
                <div className="raid-v1-resource-head"><span>MP</span><strong>{state.mp}/{state.maxMp}</strong></div>
                <div className="raid-v1-resource-track"><span className="is-mp" style={{ width: `${(state.mp / state.maxMp) * 100}%` }} /></div>
              </div>
              <div className="raid-v1-resource">
                <div className="raid-v1-resource-head"><span>ULTIMATE TP</span><strong>{state.tp}/100</strong></div>
                <div className="raid-v1-resource-track"><span className="is-tp" style={{ width: `${tpPercent}%` }} /></div>
              </div>
            </div>
            {state.focusCharge && (
              <div className="raid-v1-focus-ready" role="status">
                <Zap size={14} /> FOCUS READY · 次の攻撃ダメージ ×1.65
              </div>
            )}
            {state.phase === 2 && (
              <div className="raid-v1-adaptation">
                <span>ボスの適応</span>
                <strong>{state.adaptation}/3</strong>
                <div>{[0, 1, 2].map(level => <i key={level} className={level < state.adaptation ? 'is-filled' : ''} />)}</div>
              </div>
            )}
          </section>

          <div className="raid-v1-impact-row" aria-live="polite">
            <span><small>LAST HIT</small><strong>{formatNumber(state.lastDamage)}</strong></span>
            <span><small>LAST RECEIVED</small><strong>{formatNumber(state.lastIncomingDamage)}</strong></span>
          </div>

          <section className={`raid-v1-outcome raid-v1-outcome--${state.outcome.tone}`} aria-live="polite">
            <div className="raid-v1-outcome-mark">
              {state.outcome.tone === 'perfect' ? <Crosshair size={18} /> : state.outcome.tone === 'phase' ? <Zap size={18} /> : state.outcome.tone === 'danger' ? <Skull size={18} /> : <Sparkles size={18} />}
            </div>
            <div><strong>{state.outcome.title}</strong><p>{state.outcome.detail}</p></div>
          </section>

          <section className="raid-v1-action-section">
            <div className="raid-v1-action-heading">
              <div><p className="raid-v1-section-label">COMMAND SELECT</p><h2>行動を選択</h2></div>
              <span>TURN {String(state.turn).padStart(2, '0')}</span>
            </div>
            <div className="raid-v1-action-grid">
              {ACTIONS.map(action => (
                <ActionButton key={action.id} action={action} state={state} onAction={handleAction} />
              ))}
            </div>
            <div className="raid-v1-combat-log" aria-live="polite">
              <span>COMBAT LOG · 直近の戦闘</span>
              <p>{state.log}</p>
              <ol className="raid-v1-history" aria-label="直近5手の戦闘履歴">
                {state.history.slice(-4).reverse().map((entry, index) => (
                  <li key={String(state.turn) + '-' + String(index)}>{entry}</li>
                ))}
              </ol>
            </div>
            <p className="raid-v1-hint"><Sparkles size={14} /> 予告への正答は攻撃を止め、BREAKを加速させる。</p>
          </section>
        </aside>
      </section>

      {state.result !== 'ACTIVE' && (
        <section className={`raid-v1-result raid-v1-result--${state.result.toLowerCase()}`} aria-live="polite">
          <div className="raid-v1-result-icon">{state.result === 'VICTORY' ? <Trophy size={26} /> : <Skull size={26} />}</div>
          <div className="raid-v1-result-copy">
            <p className="raid-v1-section-label">RUN COMPLETE</p>
            <h2>{state.result === 'VICTORY' ? 'RAID CLEAR' : 'RAID FAILED'}</h2>
            <p>{state.result === 'VICTORY' ? '読み勝ちで深淵の核を撃破した。次はもっと短いターンでの討伐を狙おう。' : '予告に合わせた防御と迎撃を使い分け、もう一度挑もう。'}</p>
          </div>
          <div className="raid-v1-result-score"><span>FINAL SCORE</span><strong>{formatNumber(state.score)}</strong><small>BEST {formatNumber(Math.max(bestScore, state.score))}</small></div>
          <div className="raid-v1-result-stats">
            <span><small>総与ダメージ</small><strong>{formatNumber(state.totalDamage)}</strong></span>
            <span><small>最高ダメージ</small><strong>{formatNumber(state.bestHit)}</strong></span>
            <span><small>PERFECT READ</small><strong>{state.perfectReads}</strong></span>
            <span><small>BREAK</small><strong>{state.breakCount}</strong></span>
          </div>
          <section className="raid-v1-command-mix" aria-label="今回の行動回数">
            <span className="raid-v1-command-mix-title">COMMAND MIX · 行動回数</span>
            <div className="raid-v1-command-counts">
              {ACTIONS.map(action => (
                <span key={action.id}><small>{action.label}</small><strong>{state.actionCounts[action.id]}</strong></span>
              ))}
            </div>
          </section>
          <button type="button" className="raid-v1-retry" onClick={restart}><RotateCcw size={17} /> もう一度挑戦</button>
          <button type="button" className="raid-v1-return" onClick={onBack}>本編に戻る</button>
        </section>
      )}

      <footer className="raid-v1-footer">
        <span>RAID PROJECT 01 / ITERATION 2</span>
        <span>独立戦闘エンジン · 本編の成長データには接続しません</span>
      </footer>
    </main>
  );
};

export default RaidGame;
