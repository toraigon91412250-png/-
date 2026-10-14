import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, HeartPulse, Shield, Sparkles, Swords, TimerReset, Zap } from 'lucide-react';
import kaiserImage from '../assets/img_kaiser.jpg';
import battleBackground from '../assets/戦闘中背景.png';
import { STELLA_FINAL_BATTLE_TUNING, type StellaFinalBattleFighterId } from '../data/stellaFinalBattleConfig';
import type { StellaFinalBattleRewardResult, StellaModeProgress } from '../utils/storage';
import { preloadStellaFinalBattleImages } from '../utils/imagePreload';
import {
  EMPTY_SHORT_IRENA_ALLOCATION,
  SHORT_IRENA_ASCENSION_MULTIPLIER,
  SHORT_IRENA_ASCENSION_TURNS,
  SHORT_IRENA_END_KAI_DAMAGE,
  SHORT_IRENA_OUTSIDE_CONTROL_TURNS,
  SHORT_IRENA_STAT_POINT_TOTAL,
  getDatenAlignment,
  getShortIrenaCombatStats,
  getShortIrenaCounterDamage,
  getShortIrenaNormalAttackGaugeDelta,
  loadShortIrenaAllocation,
  saveShortIrenaAllocation,
  shiftDatenGauge,
  type ShortIrenaAlignment,
} from '../utils/shortIrenaFinalBattle';
import { STELLA_FINAL_BATTLE_IMAGES } from '../data/stellaFinalBattleConfig';
import type { StatAllocation } from '../types/game';
import './StellaFinalBattleScreen.css';

const { bossMaxHp: EX_KAISER_TOTAL_HP, meteorDamage: METEOR_DAMAGE_PROTOTYPE } = STELLA_FINAL_BATTLE_TUNING;

type BattleStatus = 'READY' | 'FIGHTING' | 'VICTORY' | 'DEFEAT';
type FinalAction = 'ATTACK' | 'IMMORTAL' | 'REBIRTH' | 'METEOR';
type BattlePhase = 1 | 2 | 3;

interface StellaFinalBattleState {
  status: BattleStatus;
  turn: number;
  phase: BattlePhase;
  fighterId: StellaFinalBattleFighterId;
  playerHp: number;
  kaiserHp: number;
  rebirthUses: number;
  meteorUsed: boolean;
  immortalReadyTurn: number;
  finalTurnLimit: number | null;
  finalTurnsLeft: number | null;
  meteorFlash: boolean;
  shortIrenaAllocation: StatAllocation;
  datenGauge: number;
  alignment: ShortIrenaAlignment | null;
  ascensionUsed: boolean;
  terminusUsed: boolean;
  outsideControlUsed: boolean;
  authorityBoostTurns: number;
  outsideControlTurns: number;
  normalAttackCutIn: boolean;
  finisherPending: ShortIrenaAlignment | null;
  logs: string[];
}

function createInitialBattle(
  status: BattleStatus = 'READY',
  fighterId: StellaFinalBattleFighterId = 'stella',
  shortIrenaAllocation: StatAllocation = EMPTY_SHORT_IRENA_ALLOCATION,
): StellaFinalBattleState {
  const fighter = STELLA_FINAL_BATTLE_TUNING.fighters[fighterId];
  const normalizedAllocation = getShortIrenaCombatStats(shortIrenaAllocation).allocation;
  const shortIrenaMaxHp = getShortIrenaCombatStats(normalizedAllocation).maxHp;
  return {
    status,
    turn: 1,
    phase: 1,
    fighterId,
    playerHp: fighterId === 'short-irena' ? shortIrenaMaxHp : fighter.maxHp,
    kaiserHp: EX_KAISER_TOTAL_HP,
    rebirthUses: 0,
    meteorUsed: false,
    immortalReadyTurn: 1,
    finalTurnLimit: null,
    finalTurnsLeft: null,
    meteorFlash: false,
    shortIrenaAllocation: normalizedAllocation,
    datenGauge: 0,
    alignment: null,
    ascensionUsed: false,
    terminusUsed: false,
    outsideControlUsed: false,
    authorityBoostTurns: 0,
    outsideControlTurns: 0,
    normalAttackCutIn: false,
    finisherPending: null,
    logs: [fighterId === 'short-irena'
      ? '短期決戦モード。堕天ゲージを神側か悪魔側へ振り切り、最終必殺技で決着をつけろ。'
      : '最終決戦の行動を使い分け、EXカイザーを撃破せよ。'],
  };
}

function phaseForHp(hp: number): BattlePhase {
  if (hp > EX_KAISER_TOTAL_HP * (2 / 3)) return 1;
  if (hp > EX_KAISER_TOTAL_HP / 3) return 2;
  return 3;
}

const PHASE_NAMES: Record<BattlePhase, string> = {
  1: '第一形態・鉄壁',
  2: '第二形態・解放',
  3: '第三形態・終局',
};

const REBIRTH_RATIOS = [1, 0.5, 0.25] as const;

export const StellaFinalBattleScreen: React.FC<{
  onBackHome: () => void;
  progress: StellaModeProgress;
  onClaimVictoryReward: () => StellaFinalBattleRewardResult;
}> = ({ onBackHome, progress, onClaimVictoryReward }) => {
  const [selectedFighterId, setSelectedFighterId] = useState<StellaFinalBattleFighterId>('stella');
  const [shortIrenaAllocation, setShortIrenaAllocation] = useState<StatAllocation>(() => loadShortIrenaAllocation());
  const [allocationSaveError, setAllocationSaveError] = useState(false);
  const [preloadStatus, setPreloadStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [preloadError, setPreloadError] = useState<string | null>(null);
  const [preloadRetryKey, setPreloadRetryKey] = useState(0);
  const [battle, setBattle] = useState<StellaFinalBattleState>(() => createInitialBattle());
  const rewardAttemptedForVictoryRef = useRef(false);
  const [rewardResult, setRewardResult] = useState<StellaFinalBattleRewardResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPreloadStatus('loading');
    setPreloadError(null);
    void preloadStellaFinalBattleImages().then(() => {
      if (!cancelled) setPreloadStatus('ready');
    }).catch(error => {
      if (cancelled) return;
      setPreloadStatus('error');
      setPreloadError(error instanceof Error ? error.message : String(error));
    });
    return () => { cancelled = true; };
  }, [preloadRetryKey]);

  useEffect(() => {
    if (!battle.normalAttackCutIn || battle.fighterId !== 'short-irena') return;
    const duration = battle.alignment === 'DEMON' ? 700 : 260;
    const timer = window.setTimeout(() => {
      setBattle(current => current.normalAttackCutIn ? { ...current, normalAttackCutIn: false } : current);
    }, duration);
    return () => window.clearTimeout(timer);
  }, [battle.normalAttackCutIn, battle.fighterId, battle.alignment, battle.turn]);

  useEffect(() => {
    const alignment = battle.finisherPending;
    if (!alignment || battle.status !== 'FIGHTING') return;
    const timer = window.setTimeout(() => {
      setBattle(current => {
        if (current.finisherPending !== alignment || current.status !== 'FIGHTING') return current;
        const stats = getShortIrenaCombatStats(current.shortIrenaAllocation);
        const finisherPower = alignment === 'GOD'
          ? Math.max(EX_KAISER_TOTAL_HP, Math.round(stats.normalAttackDamage * 5))
          : Math.max(Math.round(EX_KAISER_TOTAL_HP * 1.5), Math.round(stats.normalAttackDamage * 8));
        const actualDamage = Math.min(current.kaiserHp, finisherPower);
        const remainingBossHp = Math.max(0, current.kaiserHp - actualDamage);
        const name = alignment === 'GOD' ? '神側の最終必殺技「天理終極」' : '悪魔側の最終必殺技「深淵終葬」';
        return {
          ...current,
          status: remainingBossHp <= 0 ? 'VICTORY' : 'DEFEAT',
          kaiserHp: remainingBossHp,
          finisherPending: null,
          normalAttackCutIn: false,
          logs: [...current.logs, name + 'の威力' + finisherPower.toLocaleString('ja-JP') + '。実ダメージ' + actualDamage.toLocaleString('ja-JP') + '。' + (remainingBossHp <= 0 ? '終局核を破壊し、戦闘に勝利した。' : '最終必殺技でもEXカイザーを倒しきれなかった。')].slice(-8),
        };
      });
    }, 1450);
    return () => window.clearTimeout(timer);
  }, [battle.finisherPending, battle.status]);

  const startBattle = () => {
    if (preloadStatus !== 'ready') return;
    rewardAttemptedForVictoryRef.current = false;
    setRewardResult(null);
    setBattle(createInitialBattle('FIGHTING', selectedFighterId, shortIrenaAllocation));
  };

  const changeShortIrenaAllocation = (key: keyof StatAllocation, amount: number) => {
    const next = { ...shortIrenaAllocation, [key]: shortIrenaAllocation[key] + amount };
    if (next[key] < 0) return;
    const normalized = getShortIrenaCombatStats(next);
    if (amount > 0 && normalized.remainingPoints < 0) return;
    const saved = saveShortIrenaAllocation(normalized.allocation);
    setShortIrenaAllocation(normalized.allocation);
    setAllocationSaveError(!saved);
  };

  useEffect(() => {
    if (battle.status !== 'VICTORY' || battle.fighterId !== 'stella' || rewardAttemptedForVictoryRef.current) return;
    rewardAttemptedForVictoryRef.current = true;
    setRewardResult(onClaimVictoryReward());
  }, [battle.status, battle.fighterId, onClaimVictoryReward]);

  type ShortIrenaAction = 'ATTACK' | 'TERMINUS' | 'ASCENSION' | 'CONTROL_GOD' | 'CONTROL_DEMON' | 'FINISH';

  const takeShortIrenaAction = (action: ShortIrenaAction) => {
    setBattle(current => {
      if (current.status !== 'FIGHTING' || current.finisherPending) return current;
      if (current.alignment && action !== 'FINISH') return current;
      if (current.finalTurnsLeft === 0 && action !== 'FINISH') return current;
      const turn = current.turn;
      const stats = getShortIrenaCombatStats(current.shortIrenaAllocation);
      const logs = [...current.logs];
      const log = (message: string) => logs.push('第' + turn + 'ターン：' + message);

      if (action === 'FINISH') {
        if (!current.alignment || current.finisherPending) return current;
        log((current.alignment === 'GOD' ? '神側' : '悪魔側') + 'の最終必殺技を発動。演出終了後にダメージを確定する。');
        return {
          ...current,
          turn: turn + 1,
          finisherPending: current.alignment,
          normalAttackCutIn: false,
          logs: logs.slice(-8),
        };
      }

      let kaiserHp = current.kaiserHp;
      let playerHp = current.playerHp;
      let phase = current.phase;
      let finalTurnLimit = current.finalTurnLimit;
      let finalTurnsLeft = current.finalTurnsLeft;
      let datenGauge = current.datenGauge;
      let alignment = current.alignment;
      let ascensionUsed = current.ascensionUsed;
      let terminusUsed = current.terminusUsed;
      let outsideControlUsed = current.outsideControlUsed;
      let authorityBoostTurns = current.authorityBoostTurns;
      let outsideControlTurns = current.outsideControlTurns;
      let normalAttackCutIn = false;
      const wasBoosted = authorityBoostTurns > 0;
      let damage = 0;
      let gaugeDelta = 0;

      if (action === 'ATTACK') {
        const reinforcingRoute = datenGauge > 0 ? 'GOD' : 'DEMON';
        gaugeDelta = getShortIrenaNormalAttackGaugeDelta(reinforcingRoute, stats.speed);
        damage = Math.round(stats.normalAttackDamage * (wasBoosted ? SHORT_IRENA_ASCENSION_MULTIPLIER : 1) * (current.outsideControlTurns > 0 ? 1.5 : 1));
        kaiserHp = Math.max(1, kaiserHp - Math.max(0, damage));
        normalAttackCutIn = true;
        log('通常攻撃。' + damage.toLocaleString('ja-JP') + 'ダメージ。堕天ゲージが' + (reinforcingRoute === 'GOD' ? '神側' : '悪魔側') + 'へ傾く。');
      } else if (action === 'TERMINUS') {
        if (terminusUsed) return current;
        terminusUsed = true;
        gaugeDelta = -60;
        damage = Math.max(SHORT_IRENA_END_KAI_DAMAGE, Math.round(stats.normalAttackDamage * (wasBoosted ? SHORT_IRENA_ASCENSION_MULTIPLIER : 1) * (current.outsideControlTurns > 0 ? 1.5 : 1) * 2));
        kaiserHp = Math.max(1, kaiserHp - damage);
        log('権能「終極穿滅」。終局核を穿つ' + damage.toLocaleString('ja-JP') + 'ダメージ。悪魔側へ大きく傾く。');
      } else if (action === 'ASCENSION') {
        if (ascensionUsed) return current;
        ascensionUsed = true;
        gaugeDelta = 60;
        authorityBoostTurns = SHORT_IRENA_ASCENSION_TURNS;
        log('権能「絶界昇華」。攻撃性能が' + SHORT_IRENA_ASCENSION_MULTIPLIER + '倍に上昇（次の攻撃行動から' + SHORT_IRENA_ASCENSION_TURNS + '回）。神側へ大きく傾く。');
      } else {
        if (outsideControlUsed) return current;
        outsideControlUsed = true;
        outsideControlTurns = SHORT_IRENA_OUTSIDE_CONTROL_TURNS + 1;
        gaugeDelta = action === 'CONTROL_GOD' ? 50 : -50;
        log('権能「理外掌握」。EXカイザーの防御・反撃機構を' + SHORT_IRENA_OUTSIDE_CONTROL_TURNS + 'ターン侵食する。' + (action === 'CONTROL_GOD' ? '神側' : '悪魔側') + 'へ干渉。');
      }

      datenGauge = shiftDatenGauge(datenGauge, gaugeDelta);
      const reachedAlignment = getDatenAlignment(datenGauge);
      if (!alignment && reachedAlignment) {
        alignment = reachedAlignment;
        log('堕天ゲージが' + (alignment === 'GOD' ? '神側' : '悪魔側') + 'に振り切れた。最終必殺技が解放され、専用立ち絵に切り替わる。');
      }

      const newPhase = phaseForHp(kaiserHp);
      if (newPhase > phase) {
        phase = newPhase;
        log(PHASE_NAMES[phase] + 'へ移行。これまでのダメージは引き継がれる。');
        if (phase === 3) {
          const speedExtraTurns = Math.min(5, Math.floor(Math.max(0, stats.speed - 240) / 180));
          finalTurnLimit = 8 + Math.floor(Math.random() * 3) + speedExtraTurns;
          finalTurnsLeft = finalTurnLimit;
          logs.push('最終形態の制限開始。残りターン数が' + finalTurnLimit + 'に決定した。速さ配分による猶予 +' + speedExtraTurns + 'ターン。');
        }
      }

      const baseCounter = STELLA_FINAL_BATTLE_TUNING.phaseCounterDamage[phase];
      const reducedCounter = outsideControlTurns > 0 ? Math.round(baseCounter * 0.35) : baseCounter;
      const enemyDamage = getShortIrenaCounterDamage(reducedCounter, stats.defense);
      playerHp = Math.max(0, playerHp - enemyDamage);
      log('EXカイザーの反撃。防御・干渉後に' + enemyDamage.toLocaleString('ja-JP') + 'ダメージを受けた。');

      if (wasBoosted && (action === 'ATTACK' || action === 'TERMINUS')) authorityBoostTurns = Math.max(0, authorityBoostTurns - 1);
      if (outsideControlTurns > 0) outsideControlTurns = Math.max(0, outsideControlTurns - 1);

      let status: BattleStatus = 'FIGHTING';
      if (playerHp <= 0) {
        status = 'DEFEAT';
        log('短期決戦モード・いれーなは戦闘不能になった。');
      } else if (current.phase === 3 && finalTurnsLeft !== null) {
        finalTurnsLeft = Math.max(0, finalTurnsLeft - 1);
        if (finalTurnsLeft === 0 && !alignment) {
          status = 'DEFEAT';
          playerHp = 0;
          logs.push('最終判定。堕天ゲージがどちらにも振り切れていないため敗北。');
        } else if (finalTurnsLeft === 0 && alignment) {
          logs.push('最終判定。' + (alignment === 'GOD' ? '神側' : '悪魔側') + 'への傾きは確定済み。最終必殺技を発動できる最後の機会。');
        }
      }
      return {
        ...current,
        status,
        turn: status === 'FIGHTING' ? turn + 1 : turn,
        phase,
        playerHp,
        kaiserHp,
        finalTurnLimit,
        finalTurnsLeft,
        datenGauge,
        alignment,
        ascensionUsed,
        terminusUsed,
        outsideControlUsed,
        authorityBoostTurns,
        outsideControlTurns,
        normalAttackCutIn,
        logs: logs.slice(-8),
      };
    });
  };

  const takeAction = (action: FinalAction) => {
    setBattle(current => {
      if (current.status !== 'FIGHTING') return current;

      const turn = current.turn;
      const fighterConfig = STELLA_FINAL_BATTLE_TUNING.fighters[current.fighterId];
      const maxHp = fighterConfig.maxHp;
      let playerHp = current.playerHp;
      let kaiserHp = current.kaiserHp;
      let phase = current.phase;
      let rebirthUses = current.rebirthUses;
      let meteorUsed = current.meteorUsed;
      let immortalReadyTurn = current.immortalReadyTurn;
      let finalTurnLimit = current.finalTurnLimit;
      let finalTurnsLeft = current.finalTurnsLeft;
      let meteorFlash = false;
      let status: BattleStatus = 'FIGHTING';
      const logs = [...current.logs];
      const log = (message: string) => logs.push('第' + turn + 'ターン：' + message);

      if (action === 'ATTACK') {
        const damage = fighterConfig.normalAttackDamage;
        kaiserHp = Math.max(0, kaiserHp - damage);
        log(fighterConfig.name + 'の通常攻撃。EXカイザーに ' + damage.toLocaleString('ja-JP') + ' ダメージ。');
      } else if (action === 'IMMORTAL') {
        if (turn < immortalReadyTurn) return current;
        immortalReadyTurn = turn + 3;
        log('権能「不滅」を発動。次の攻撃を完全無敵で無効化する。');
      } else if (action === 'REBIRTH') {
        if (rebirthUses >= REBIRTH_RATIOS.length || playerHp >= maxHp) return current;
        const healing = Math.round(maxHp * REBIRTH_RATIOS[rebirthUses]);
        const actualHealing = Math.min(maxHp - playerHp, healing);
        rebirthUses += 1;
        playerHp += actualHealing;
        log('権能「再誕」。HPを ' + actualHealing.toLocaleString('ja-JP') + ' 回復。' + rebirthUses + '回目の使用。');
      } else {
        if (meteorUsed) return current;
        meteorUsed = true;
        meteorFlash = true;
        kaiserHp = Math.max(0, kaiserHp - METEOR_DAMAGE_PROTOTYPE);
        log('権能「天象支配」。巨大な隕石が落下し、' + METEOR_DAMAGE_PROTOTYPE.toLocaleString('ja-JP') + ' ダメージ。');
      }

      if (kaiserHp <= 0) {
        status = 'VICTORY';
        log('EXカイザーを撃破した。' + fighterConfig.name + 'の勝利！');
      } else {
        const newPhase = phaseForHp(kaiserHp);
        if (newPhase > phase) {
          phase = newPhase;
          log(PHASE_NAMES[phase] + 'へ移行。これまでのダメージは引き継がれる。');
          if (phase === 3) {
            finalTurnLimit = 8 + Math.floor(Math.random() * 3);
            finalTurnsLeft = finalTurnLimit;
            logs.push('最終形態の制限開始。残りターン数が ' + finalTurnLimit + ' に決定した。');
          }
        }

        const negatesAttack = action === 'IMMORTAL';
        const enemyDamage = STELLA_FINAL_BATTLE_TUNING.phaseCounterDamage[phase];
        if (negatesAttack) {
          log('「不滅」がEXカイザーの反撃を完全無効化。ダメージは発生しない。');
        } else {
          playerHp = Math.max(0, playerHp - enemyDamage);
          log('EXカイザーの反撃。' + fighterConfig.name + 'は ' + enemyDamage.toLocaleString('ja-JP') + ' ダメージを受けた。');
        }

        if (playerHp <= 0) {
          status = 'DEFEAT';
          log(fighterConfig.name + 'は戦闘不能になった。');
        } else if (current.phase === 3 && finalTurnsLeft !== null) {
          finalTurnsLeft = Math.max(0, finalTurnsLeft - 1);
          if (finalTurnsLeft === 0) {
            playerHp = 0;
            status = 'DEFEAT';
            logs.push('制限ターン終了。EXカイザーが終局の必殺技を放ち、ステラは敗北した。');
          }
        }
      }

      return {
        ...current,
        status,
        turn: status === 'FIGHTING' ? turn + 1 : turn,
        phase,
        playerHp,
        kaiserHp,
        rebirthUses,
        meteorUsed,
        immortalReadyTurn,
        finalTurnLimit,
        finalTurnsLeft,
        meteorFlash,
        logs: logs.slice(-8),
      };
    });
  };

  const isFighting = battle.status === 'FIGHTING';
  const displayedFighterId = battle.status === 'READY' ? selectedFighterId : battle.fighterId;
  const fighter = STELLA_FINAL_BATTLE_TUNING.fighters[displayedFighterId];
  const activeAllocation = battle.status === 'READY' ? shortIrenaAllocation : battle.shortIrenaAllocation;
  const shortStats = getShortIrenaCombatStats(activeAllocation);
  const fighterMaxHp = displayedFighterId === 'short-irena' ? shortStats.maxHp : fighter.maxHp;
  const displayedPlayerHp = battle.status === 'READY' ? fighterMaxHp : battle.playerHp;
  const playerHpPercent = Math.max(0, (displayedPlayerHp / fighterMaxHp) * 100);
  const displayedFighterImage = displayedFighterId === 'short-irena'
    ? battle.status !== 'READY' && battle.alignment === 'GOD'
      ? STELLA_FINAL_BATTLE_IMAGES.irenaGodPortrait
      : battle.status !== 'READY' && battle.alignment === 'DEMON'
        ? STELLA_FINAL_BATTLE_IMAGES.irenaDemonPortrait
        : fighter.imageSrc
    : fighter.imageSrc;
  const normalAttackDamage = displayedFighterId === 'short-irena' ? shortStats.normalAttackDamage : fighter.normalAttackDamage;
  const kaiserHpPercent = Math.max(0, (battle.kaiserHp / EX_KAISER_TOTAL_HP) * 100);
  const resultTitle = battle.status === 'VICTORY' ? '最終決戦 勝利' : '最終決戦 敗北';

  return (
    <main className="stella-final" style={{ backgroundImage: 'linear-gradient(180deg, rgba(4, 6, 18, .52), rgba(4, 6, 18, .94)), url(' + JSON.stringify(battleBackground) + ')' }}>
      <div className="stella-final__ambient" aria-hidden="true" />
      <header className="stella-final__header">
        <button type="button" className="stella-final__back" onClick={onBackHome} aria-label="ホームに戻る">
          <ArrowLeft size={17} /> ホーム
        </button>
        <div className="stella-final__eyebrow">STELLA MODE / FINAL DUEL</div>
        <div className="stella-final__header-mark"><Sparkles size={17} /> 最終決戦専用モード</div>
      </header>

      <div className="stella-final__content">
        <div className="stella-final__title-block">
          <p>THE FINAL ENCOUNTER</p>
          <h1>EXカイザー 最終決戦</h1>
          <span>三形態・HP引き継ぎ・最終形態ターン制限</span>
        </div>

        <section className="stella-final__arena" aria-label="最終決戦の戦場">
          <div className="stella-final__fighter stella-final__fighter--stella">
            <div className="stella-final__portrait">
              <img src={displayedFighterImage} alt={fighter.name} data-testid="final-battle-player-portrait" />
              <span className="stella-final__portrait-label">PLAYER</span>
            </div>
            <div className="stella-final__fighter-name">{fighter.name}</div>
            <div className="stella-final__fighter-subtitle">{fighter.title}{displayedFighterId === 'short-irena' && battle.status !== 'READY' && battle.alignment ? '・' + (battle.alignment === 'GOD' ? '神側確定' : '悪魔側確定') : ''}</div>
            <div className="stella-final__hp-meta"><span>HP</span><strong>{displayedPlayerHp.toLocaleString('ja-JP')} / {fighterMaxHp.toLocaleString('ja-JP')}</strong></div>
            <div className="stella-final__hp-track" role="progressbar" aria-label={fighter.name + 'のHP'} aria-valuemin={0} aria-valuemax={fighterMaxHp} aria-valuenow={displayedPlayerHp}>
              <span className="stella-final__hp-fill stella-final__hp-fill--player" style={{ width: playerHpPercent + '%' }} />
            </div>
          </div>

          <div className="stella-final__arena-center" aria-live="polite">
            <span className="stella-final__versus">VS</span>
            <span className="stella-final__phase">PHASE 0{battle.phase}</span>
            <strong>{PHASE_NAMES[battle.phase]}</strong>
            {isFighting && <span className="stella-final__turn">第 {battle.turn} ターン</span>}
            {battle.phase === 3 && battle.finalTurnsLeft !== null && (
              <div className="stella-final__timer" role="status" aria-label={'最終形態 残り' + battle.finalTurnsLeft + 'ターン'}>
                <TimerReset size={16} />
                <span>残り <strong>{battle.finalTurnsLeft}</strong> / {battle.finalTurnLimit} ターン</span>
              </div>
            )}
          </div>

          <div className="stella-final__fighter stella-final__fighter--kaiser">
            <div className="stella-final__portrait">
              <img src={kaiserImage} alt="EXカイザー" />
              <span className="stella-final__portrait-label">FINAL BOSS</span>
            </div>
            <div className="stella-final__fighter-name">EXカイザー</div>
            <div className="stella-final__fighter-subtitle">{PHASE_NAMES[battle.phase]}</div>
            <div className="stella-final__hp-meta"><span>HP</span><strong>{battle.kaiserHp.toLocaleString('ja-JP')} / {EX_KAISER_TOTAL_HP.toLocaleString('ja-JP')}</strong></div>
            <div className="stella-final__hp-track" role="progressbar" aria-label="EXカイザーのHP" aria-valuemin={0} aria-valuemax={EX_KAISER_TOTAL_HP} aria-valuenow={battle.kaiserHp}>
              <span className="stella-final__hp-fill stella-final__hp-fill--boss" style={{ width: kaiserHpPercent + '%' }} />
            </div>
          </div>
        </section>

        {battle.status === 'READY' && (
          <section className="stella-final__character-select" aria-label="最終決戦の操作キャラクター">
            <div className="stella-final__character-select-heading">
              <strong>挑戦キャラクター</strong>
              <span>{progress.finalBattleRewardClaimed ? '最終決戦用キャラクターを選択可能' : '初回クリア後に追加キャラクターが解放'}</span>
            </div>
            <div className="stella-final__character-choice-grid">
              <button
                type="button"
                className="stella-final__character-choice"
                aria-label="最終決戦キャラクター：ステラ"
                aria-pressed={selectedFighterId === 'stella'}
                onClick={() => setSelectedFighterId('stella')}
              >
                <img src={STELLA_FINAL_BATTLE_TUNING.fighters.stella.imageSrc} alt="" />
                <span><strong>ステラ</strong><small>天星の翼</small></span>
                <span className="stella-final__choice-state">{selectedFighterId === 'stella' ? '選択中' : '選択'}</span>
              </button>
              {progress.finalBattleRewardClaimed ? (
                <button
                  type="button"
                  className="stella-final__character-choice"
                  aria-label="最終決戦キャラクター：短期決戦モード・いれーな"
                  aria-pressed={selectedFighterId === 'short-irena'}
                  onClick={() => setSelectedFighterId('short-irena')}
                >
                  <img src={STELLA_FINAL_BATTLE_TUNING.fighters['short-irena'].imageSrc} alt="" />
                  <span><strong>短期決戦モード・いれーな</strong><small>神魔分岐・150P専用育成</small></span>
                  <span className="stella-final__choice-state">{selectedFighterId === 'short-irena' ? '選択中' : '選択'}</span>
                </button>
              ) : (
                <p className="stella-final__locked-character">最終決戦にステラで初勝利すると、クリア報酬とともに短期決戦モード・いれーなが解放される。</p>
              )}
            </div>
            <p className="stella-final__prototype-note">短期決戦モードは最終決戦限定。通常版いれーなの基礎データ・育成データは変更しない。</p>
            {selectedFighterId === 'short-irena' && (
              <section className="stella-final__short-build" aria-label="短期決戦モード・いれーなの150P育成">
                <div className="stella-final__short-build-heading">
                  <strong>専用ステータス育成</strong>
                  <span>{shortStats.spentPoints} / {SHORT_IRENA_STAT_POINT_TOTAL}P 使用・残り {shortStats.remainingPoints}P</span>
                </div>
                <div className="stella-final__short-build-grid">
                  {([
                    ['maxHp', '最大HP', shortStats.maxHp],
                    ['attack', '攻撃', shortStats.attack],
                    ['defense', '防御', shortStats.defense],
                    ['speed', '速度', shortStats.speed],
                  ] as const).map(([key, label, value]) => (
                    <div className="stella-final__stat-stepper" key={key}>
                      <div><strong>{label}</strong><span>{value.toLocaleString('ja-JP')}</span></div>
                      <div className="stella-final__stat-stepper-actions">
                        <button type="button" aria-label={label + 'を1P減らす'} disabled={shortIrenaAllocation[key] <= 0} onClick={() => changeShortIrenaAllocation(key, -1)}>−</button>
                        <span>{shortIrenaAllocation[key]}P</span>
                        <button type="button" aria-label={label + 'を1P増やす'} disabled={shortStats.remainingPoints <= 0} onClick={() => changeShortIrenaAllocation(key, 1)}>＋</button>
                      </div>
                    </div>
                  ))}
                </div>
                <p>配分換算は通常戦闘と同じ。基本値 HP 4000 / ATK 360 / DEF 200 / SPD 240。通常攻撃は強化後攻撃値×8。</p>
                {allocationSaveError && <p className="stella-final__asset-error" role="alert">育成配分を保存できなかった。今回は変更を適用するが、再読み込みすると保存されていない可能性がある。</p>}
              </section>
            )}
          </section>
        )}

        {battle.meteorFlash && battle.fighterId === 'stella' && (
          <div className="stella-final__meteor-cut-in" aria-hidden="true">
            <img src={STELLA_FINAL_BATTLE_TUNING.meteorCutInImage} alt="" />
            <span>天象支配</span>
          </div>
        )}
        {battle.normalAttackCutIn && battle.fighterId === 'short-irena' && (
          (battle.alignment === 'DEMON' || battle.datenGauge < 0)
            ? <div key={battle.turn} className="stella-final__short-attack-cutin" data-testid="short-irena-normal-cutin" aria-hidden="true"><img src={STELLA_FINAL_BATTLE_IMAGES.irenaDemonAttackCutIn} alt="" /><span>終極穿撃</span></div>
            : <div key={battle.turn} className="stella-final__short-attack-flash" aria-hidden="true"><span>神速の一閃</span></div>
        )}
        {battle.finisherPending && (
          <div className={'stella-final__short-finisher stella-final__short-finisher--' + battle.finisherPending.toLowerCase()} data-testid="short-irena-finisher" role="status" aria-label={battle.finisherPending === 'GOD' ? '神側最終必殺技演出' : '悪魔側最終必殺技演出'}>
            <img
              src={battle.finisherPending === 'GOD' ? STELLA_FINAL_BATTLE_IMAGES.irenaGodFinalFinisher : STELLA_FINAL_BATTLE_IMAGES.irenaDemonFinalFinisher}
              alt=""
              data-testid="short-irena-finisher-image"
            />
            <strong>{battle.finisherPending === 'GOD' ? '天理終極' : '深淵終葬'}</strong>
            <span>{battle.finisherPending === 'GOD' ? '神側最終必殺技' : '悪魔側最終必殺技'}</span>
          </div>
        )}

        {battle.status === 'READY' ? (
          <section className="stella-final__briefing" aria-label="最終決戦ルール">
            <div className="stella-final__briefing-heading"><Shield size={18} /> 最終決戦のルール</div>
            <p>EXカイザーは三形態。形態が変わってもHPは回復せず、与えたダメージを引き継ぐ。</p>
            <p>第三形態に入ると、制限ターンが8～10ターンからランダムに決まり、期限を過ぎると終局の必殺技で敗北する。</p>
            {selectedFighterId === 'short-irena' && <p>短期決戦モードは150P育成・3権能・堕天ゲージを備える。神側／悪魔側を選び、ゲージを端まで傾けて専用の最終必殺技を使う。最終判定で未確定なら敗北。</p>}
            <p className="stella-final__prototype-note">試作バランス：EXカイザー最大HP {EX_KAISER_TOTAL_HP.toLocaleString('ja-JP')}、天象支配 {METEOR_DAMAGE_PROTOTYPE.toLocaleString('ja-JP')}ダメージ。数値は調整用の仮設定。</p>
            {preloadStatus === 'loading' && <p className="stella-final__asset-status" role="status">最終決戦の画像素材をプリロード中…</p>}
            {preloadStatus === 'ready' && <p className="stella-final__asset-status" role="status">最終決戦の画像素材 読み込み完了</p>}
            {preloadStatus === 'error' && <div className="stella-final__asset-error" role="alert" aria-label="最終決戦画像のプリロード失敗"><strong>画像を読み込めないため、戦闘を開始できない。</strong><p>{preloadError}</p><button type="button" onClick={() => setPreloadRetryKey(value => value + 1)}>画像を再読み込み</button></div>}
            <button type="button" className="stella-final__start" disabled={preloadStatus !== 'ready'} onClick={startBattle}>{preloadStatus === 'ready' ? '最終決戦を開始' : '画像読み込み後に開始'}</button>
          </section>
        ) : (
          <>
            <section className="stella-final__powers" aria-label={fighter.name + 'の最終決戦アクション'}>
              <div className="stella-final__powers-heading">
                <div><span>{battle.fighterId === 'stella' ? "STELLA'S AUTHORITIES" : 'FINAL DUEL COMMANDS'}</span><h2>最終決戦の行動</h2></div>
                {isFighting && <span className="stella-final__turn-chip">第 {battle.turn} ターン</span>}
              </div>

              {battle.fighterId === 'short-irena' ? (
                <>
                  <div className="stella-final__daten-gauge" aria-label="堕天ゲージ表示">
                    <div className="stella-final__daten-gauge-labels"><strong>悪魔側</strong><span>{battle.alignment ? (battle.alignment === 'GOD' ? '神側に確定' : '悪魔側に確定') : '堕天ゲージ'}</span><strong>神側</strong></div>
                    <div className={'stella-final__daten-gauge-track' + (battle.alignment ? ' is-locked is-' + battle.alignment.toLowerCase() : '')} role="progressbar" aria-label="堕天ゲージ" aria-valuemin={-100} aria-valuemax={100} aria-valuenow={battle.datenGauge}>
                      <span className="stella-final__daten-gauge-center" />
                      <span className="stella-final__daten-gauge-marker" style={{ left: ((battle.datenGauge + 100) / 2) + '%' }} />
                    </div>
                    <p>{battle.alignment ? 'ルート固定済み。立ち絵と最終必殺技が確定した。' : '通常攻撃は現在の傾きを強める。反対側の権能で戻すには大きな行動が必要。'}</p>
                  </div>
                  <div className="stella-final__power-grid stella-final__short-authorities">
                    <article className="stella-final__power-card stella-final__power-card--terminus">
                      <div className="stella-final__power-icon"><Zap size={21} /></div>
                      <div className="stella-final__power-copy"><h3>終極穿滅</h3><p>通常攻撃を凌駕する終局穿孔。悪魔側へ大きく傾ける。</p><small>{battle.terminusUsed ? '使用済み' : '威力：通常攻撃の2倍以上・1回'}</small></div>
                      <button type="button" aria-label="終極穿滅を発動" disabled={!isFighting || Boolean(battle.alignment) || battle.terminusUsed || Boolean(battle.finisherPending) || battle.finalTurnsLeft === 0} onClick={() => takeShortIrenaAction('TERMINUS')}>発動</button>
                    </article>
                    <article className="stella-final__power-card stella-final__power-card--ascension">
                      <div className="stella-final__power-icon"><Sparkles size={21} /></div>
                      <div className="stella-final__power-copy"><h3>絶界昇華</h3><p>攻撃性能を{SHORT_IRENA_ASCENSION_MULTIPLIER}倍に強化。神側へ大きく傾ける。</p><small>{battle.ascensionUsed ? '使用済み' : '次の攻撃行動から' + SHORT_IRENA_ASCENSION_TURNS + '回・1回'}</small></div>
                      <button type="button" aria-label="絶界昇華を発動" disabled={!isFighting || Boolean(battle.alignment) || battle.ascensionUsed || Boolean(battle.finisherPending) || battle.finalTurnsLeft === 0} onClick={() => takeShortIrenaAction('ASCENSION')}>発動</button>
                    </article>
                    <article className="stella-final__power-card stella-final__power-card--control">
                      <div className="stella-final__power-icon"><Shield size={21} /></div>
                      <div className="stella-final__power-copy"><h3>理外掌握</h3><p>EXカイザーの防御・反撃機構を無効化に近い水準まで干渉する。</p><small>{battle.outsideControlUsed ? '使用済み' : '反撃軽減・EXカイザー被ダメージ1.5倍・2ターン'}</small></div>
                      <div className="stella-final__control-buttons">
                        <button type="button" aria-label="理外掌握：神側へ" disabled={!isFighting || Boolean(battle.alignment) || battle.outsideControlUsed || Boolean(battle.finisherPending) || battle.finalTurnsLeft === 0} onClick={() => takeShortIrenaAction('CONTROL_GOD')}>神側へ</button>
                        <button type="button" aria-label="理外掌握：悪魔側へ" disabled={!isFighting || Boolean(battle.alignment) || battle.outsideControlUsed || Boolean(battle.finisherPending)} onClick={() => takeShortIrenaAction('CONTROL_DEMON')}>悪魔側へ</button>
                      </div>
                    </article>
                  </div>
                  <div className="stella-final__short-finish-row">
                    <div><strong>終局必殺技</strong><small>{battle.alignment ? (battle.alignment === 'GOD' ? '天理終極・最低16,000ダメージ。神域の浄化連鎖で決着' : '深淵終葬・最低24,000ダメージ。貫通力を極限まで集中') : 'ゲージが神側／悪魔側の端に到達すると解放'}</small></div>
                    <button type="button" aria-label={battle.alignment === 'GOD' ? '神側の最終必殺技' : battle.alignment === 'DEMON' ? '悪魔側の最終必殺技' : '最終必殺技（未解放）'} disabled={!isFighting || !battle.alignment || Boolean(battle.finisherPending)} onClick={() => takeShortIrenaAction('FINISH')}>{battle.alignment ? '最終必殺技を放つ' : '未解放'}</button>
                  </div>
                </>
              ) : (
                <div className="stella-final__power-grid">
                  <article className="stella-final__power-card stella-final__power-card--immortal">
                    <div className="stella-final__power-icon"><Shield size={21} /></div>
                    <div className="stella-final__power-copy"><h3>不滅</h3><p>次の反撃を1ターン完全無敵で無効化。</p><small>{battle.turn < battle.immortalReadyTurn ? '次回使用：第 ' + battle.immortalReadyTurn + ' ターン' : '使用可能・4ターン周期'}</small></div>
                    <button type="button" aria-label="不滅を発動" disabled={!isFighting || battle.turn < battle.immortalReadyTurn} onClick={() => takeAction('IMMORTAL')}>発動</button>
                  </article>
                  <article className="stella-final__power-card stella-final__power-card--rebirth">
                    <div className="stella-final__power-icon"><HeartPulse size={21} /></div>
                    <div className="stella-final__power-copy"><h3>再誕</h3><p>最大HPを基準に100% → 50% → 25%回復。</p><small>使用回数：{battle.rebirthUses} / 3</small></div>
                    <button type="button" aria-label="再誕を発動" disabled={!isFighting || battle.rebirthUses >= 3 || battle.playerHp >= fighterMaxHp} onClick={() => takeAction('REBIRTH')}>回復</button>
                  </article>
                  <article className="stella-final__power-card stella-final__power-card--meteor">
                    <div className="stella-final__power-icon"><Zap size={21} /></div>
                    <div className="stella-final__power-copy"><h3>天象支配</h3><p>巨大な隕石を落とす一度きりの大技。</p><small>{battle.meteorUsed ? '使用済み' : '試作値：' + METEOR_DAMAGE_PROTOTYPE.toLocaleString('ja-JP') + 'ダメージ・1回'}</small></div>
                    <button type="button" aria-label="天象支配を発動" disabled={!isFighting || battle.meteorUsed} onClick={() => takeAction('METEOR')}>発動</button>
                  </article>
                </div>
              )}
              <div className="stella-final__normal-attack">
                <span><Swords size={17} /> 通常攻撃 <small>{battle.fighterId === 'short-irena' ? '規格外の' + normalAttackDamage.toLocaleString('ja-JP') : '仮設定：' + normalAttackDamage.toLocaleString('ja-JP')}ダメージ</small></span>
                <button type="button" aria-label="通常攻撃" disabled={!isFighting || Boolean(battle.finisherPending) || Boolean(battle.alignment && battle.fighterId === 'short-irena') || Boolean(battle.fighterId === 'short-irena' && battle.finalTurnsLeft === 0)} onClick={() => battle.fighterId === 'short-irena' ? takeShortIrenaAction('ATTACK') : takeAction('ATTACK')}>攻撃する</button>
              </div>
              {battle.fighterId === 'short-irena' && battle.authorityBoostTurns > 0 && <p className="stella-final__short-effect-status" role="status">絶界昇華：強化攻撃の残り {battle.authorityBoostTurns} 回</p>}
              {battle.fighterId === 'short-irena' && battle.outsideControlTurns > 0 && <p className="stella-final__short-effect-status" role="status">理外掌握：干渉中・残り {battle.outsideControlTurns} ターン</p>}
              <p className="stella-final__no-forecast">敵の攻撃予測は表示されない。実際の行動を見て、権能を使い分けよう。</p>
            </section>

            <section className="stella-final__battle-log" aria-label="戦闘ログ">
              <div className="stella-final__log-heading">BATTLE LOG</div>
              <div className="stella-final__log-lines" aria-live="polite">
                {battle.logs.map((entry, index) => <p key={index}>{entry}</p>)}
              </div>
            </section>

            {(battle.status === 'VICTORY' || battle.status === 'DEFEAT') && (
              <section className={'stella-final__result stella-final__result--' + battle.status.toLowerCase()} role="status">
                <div className="stella-final__result-label">{battle.status === 'VICTORY' ? 'VICTORY' : 'DEFEAT'}</div>
                <h2>{resultTitle}</h2>
                <p>{battle.status === 'VICTORY' ? fighter.name + 'はEXカイザーを打ち破った。' : '権能を見直し、第三形態の制限ターン内に決着をつけよう。'}</p>
                {battle.status === 'VICTORY' && (
                  <>
                    {battle.fighterId === 'stella' && rewardResult && !rewardResult.persisted ? (
                      <div className="stella-final__reward-error" role="alert" aria-label="最終決戦報酬の保存エラー">
                        <strong>報酬を保存できなかった</strong>
                        <p>100Pとクリア記録は保存されていない。再戦せずに保存を再試行できる。</p>
                        <button type="button" onClick={() => setRewardResult(onClaimVictoryReward())}>報酬保存を再試行</button>
                      </div>
                    ) : (
                      <div className="stella-final__reward-notice" role="status" aria-label="最終決戦クリア報酬">
                        {battle.fighterId === 'stella' && rewardResult?.rewardGranted
                          ? '初回クリア報酬を獲得！ ステータスポイント +100P。短期決戦モード・いれーなが解放された。'
                          : progress.finalBattleRewardClaimed
                            ? '初回クリア報酬 +100P は獲得済み。短期決戦モード・いれーなは解放済み。再戦報酬の重複付与はない。'
                            : '初回クリア報酬はステラでの初勝利時に付与される。'}
                      </div>
                    )}
                  </>
                )}
                <div className="stella-final__result-actions">
                  <button type="button" className="stella-final__start" onClick={startBattle}>もう一度挑む</button>
                  <button type="button" className="stella-final__return" onClick={onBackHome}>ホームへ戻る</button>
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default StellaFinalBattleScreen;
