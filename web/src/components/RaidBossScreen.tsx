import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Crosshair, RotateCcw, Shield, Skull, Sparkles, Swords, Zap } from 'lucide-react';
import irenaImg from '../assets/img_irena.jpg';
import battleBackground from '../assets/戦闘中背景.png';
import irenaCutInImg from '../assets/img_irena_cutin.jpg';

type Phase = 1 | 2;
type BossPattern = 'SWEEP' | 'CHARGE' | 'VOID' | 'RAGE';

type PlayerState = {
  hp: number;
  mp: number;
  tp: number;
  shield: number;
  potions: number;
  guardNext: boolean;
  focus: boolean;
  featherCooldown: number;
};

const BOSS_MAX_HP: Record<Phase, number> = {
  1: 45000,
  2: 55000,
};

const PLAYER_MAX_HP = 8000;
const PLAYER_MAX_MP = 100;
const PLAYER_MAX_TP = 100;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const formatNumber = (value: number) => Math.max(0, Math.round(value)).toLocaleString('ja-JP');
const randomBetween = (min: number, max: number) => Math.round(min + Math.random() * (max - min));

type ActionFx = 'NORMAL' | 'FEATHER' | 'FOCUS' | 'GUARD' | 'POTION' | 'ULTIMATE' | 'BOSS';

const PATTERN_INFO: Record<BossPattern, { name: string; detail: string; minDamage: number; maxDamage: number; danger: 'NORMAL' | 'HIGH' | 'EXTREME' }> = {
  SWEEP: {
    name: '黒爪薙ぎ',
    detail: '広範囲を薙ぎ払う中威力攻撃',
    minDamage: 820,
    maxDamage: 1050,
    danger: 'NORMAL',
  },
  CHARGE: {
    name: '滅界砲',
    detail: '力を溜めてから放つ大技。防御で大幅軽減',
    minDamage: 1750,
    maxDamage: 2200,
    danger: 'EXTREME',
  },
  VOID: {
    name: '虚無落雷',
    detail: '黒雷が連続して落ちる。盾を多く削る',
    minDamage: 1100,
    maxDamage: 1450,
    danger: 'HIGH',
  },
  RAGE: {
    name: '終焉衝動',
    detail: '覚醒直後の強制怒涛攻撃',
    minDamage: 2000,
    maxDamage: 2450,
    danger: 'EXTREME',
  },
};

const raidCss = [
  '@keyframes raidBossFloat { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-8px) scale(1.02); } }',
  '@keyframes raidBossPulse { 0%,100% { opacity: .55; transform: scale(.94); } 50% { opacity: 1; transform: scale(1.05); } }',
  '@keyframes raidBossRing { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }',
  '@keyframes raidDanger { 0%,100% { opacity: .6; } 50% { opacity: 1; } }',
  '@keyframes raidDamagePop { 0% { transform: translate(-50%, 10px) scale(.72); opacity: 0; } 18% { transform: translate(-50%, 0) scale(1.12); opacity: 1; } 100% { transform: translate(-50%, -30px) scale(1); opacity: 0; } }',
  '@keyframes raidSlash { 0% { transform: translateX(-120%) rotate(-18deg); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateX(120%) rotate(-18deg); opacity: 0; } }',
  '@keyframes raidStagger { 0%,100% { transform: translateX(0) rotate(0); } 25% { transform: translateX(-8px) rotate(-1deg); } 75% { transform: translateX(8px) rotate(1deg); } }',
  '@keyframes raidPhaseFlash { 0%,100% { opacity: 0; } 20% { opacity: .95; } 45% { opacity: .25; } 70% { opacity: .8; } }',
  '@keyframes raidLoading { from { transform: scaleX(0); } to { transform: scaleX(1); } }',
  '@keyframes raidIrenaGlow { 0%,100% { box-shadow: 0 0 0 rgba(118,255,210,0); } 50% { box-shadow: 0 0 34px rgba(118,255,210,.28); } }',
  '@keyframes raidActionFlash { 0% { opacity: 0; transform: scale(.86); } 16% { opacity: 1; } 100% { opacity: 0; transform: scale(1.08); } }',
  '@keyframes raidSlashFx { 0% { transform: translate(-80%, 30%) rotate(-18deg); opacity: 0; } 20% { opacity: 1; } 100% { transform: translate(80%, -10%) rotate(-18deg); opacity: 0; } }',
  '@keyframes raidFeatherCutIn { 0% { transform: translateX(-110%); opacity: 0; } 18% { transform: translateX(0); opacity: 1; } 70% { transform: translateX(0); opacity: 1; } 100% { transform: translateX(110%); opacity: 0; } }',
  '@keyframes raidFeatherRain { 0% { transform: translateY(-60%) rotate(-8deg); opacity: 0; } 18% { opacity: 1; } 100% { transform: translateY(40%) rotate(12deg); opacity: 0; } }',
  '@keyframes raidGuardFx { 0% { transform: scale(.55); opacity: 0; } 30% { transform: scale(1); opacity: 1; } 100% { transform: scale(1.18); opacity: 0; } }',
  '@keyframes raidUltimateFx { 0% { transform: scale(.2); opacity: 0; } 18% { opacity: 1; } 100% { transform: scale(1.6); opacity: 0; } }',
  '@keyframes raidBossStrikeFx { 0% { transform: scale(.65); opacity: 0; } 25% { opacity: 1; } 100% { transform: scale(1.15); opacity: 0; } }',
  '@media (max-width: 680px) { .raid-actions { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } .raid-stage { min-height: 250px !important; } }',
].join('\n');

const getNextPattern = (currentPhase: Phase, currentTurn: number): BossPattern => {
  if (currentPhase === 2) {
    const sequence: BossPattern[] = ['VOID', 'CHARGE', 'SWEEP', 'RAGE'];
    return sequence[(currentTurn - 1) % sequence.length];
  }
  const sequence: BossPattern[] = ['SWEEP', 'CHARGE', 'VOID'];
  return sequence[(currentTurn - 1) % sequence.length];
};

const createInitialPlayer = (): PlayerState => ({
  hp: PLAYER_MAX_HP,
  mp: PLAYER_MAX_MP,
  tp: 0,
  shield: 0,
  potions: 2,
  guardNext: false,
  focus: false,
  featherCooldown: 0,
});

export const RaidBossScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [mode, setMode] = useState<'LOADING' | 'PRE_BATTLE' | 'BATTLE' | 'RESULT'>('LOADING');
  const [phase, setPhase] = useState<Phase>(1);
  const [bossHp, setBossHp] = useState(BOSS_MAX_HP[1]);
  const [bossBreak, setBossBreak] = useState(0);
  const [bossBroken, setBossBroken] = useState(false);
  const [bossPattern, setBossPattern] = useState<BossPattern>('SWEEP');
  const [player, setPlayer] = useState<PlayerState>(createInitialPlayer);
  const [turn, setTurn] = useState(1);
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [message, setMessage] = useState('戦闘準備中…');
  const [isResolving, setIsResolving] = useState(false);
  const [phaseFlash, setPhaseFlash] = useState(false);
  const [victory, setVictory] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestHit, setBestHit] = useState(0);
  const [totalDamage, setTotalDamage] = useState(0);
  const [breakCount, setBreakCount] = useState(0);
  const [actionFx, setActionFx] = useState<ActionFx | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setMode('PRE_BATTLE'), 900);
    return () => window.clearTimeout(timer);
  }, []);

  const bossMaxHp = BOSS_MAX_HP[phase];
  const bossHpPercent = clamp((bossHp / bossMaxHp) * 100, 0, 100);
  const playerHpPercent = clamp((player.hp / PLAYER_MAX_HP) * 100, 0, 100);
  const canUltimate = player.tp >= PLAYER_MAX_TP;
  const nextIntent = PATTERN_INFO[bossPattern];
  const dangerText = nextIntent.danger === 'EXTREME'
    ? '危険'
    : nextIntent.danger === 'HIGH'
      ? '警戒'
      : '通常';

  const resetBattle = () => {
    setPhase(1);
    setBossHp(BOSS_MAX_HP[1]);
    setBossBreak(0);
    setBossBroken(false);
    setBossPattern('SWEEP');
    setPlayer(createInitialPlayer());
    setTurn(1);
    setLastDamage(null);
    setMessage('戦闘開始！');
    setIsResolving(false);
    setPhaseFlash(false);
    setVictory(false);
    setCombo(0);
    setBestHit(0);
    setTotalDamage(0);
    setBreakCount(0);
    setActionFx(null);
    setMode('BATTLE');
  };

  const finishDefeat = (reason: string) => {
    setPlayer(prev => ({ ...prev, hp: 0 }));
    setMessage(reason);
    setVictory(false);
    setIsResolving(false);
    setMode('RESULT');
  };

  const finishVictory = () => {
    setMessage('レイドボス討伐成功！');
    setVictory(true);
    setIsResolving(false);
    setMode('RESULT');
  };

  const bossAttack = (currentPhase: Phase, currentPattern: BossPattern, currentPlayer: PlayerState, currentTurn: number) => {
    setActionFx('BOSS');
    window.setTimeout(() => setActionFx(null), 700);
    const info = PATTERN_INFO[currentPattern];
    let rawDamage = randomBetween(info.minDamage, info.maxDamage);

    if (currentPattern === 'RAGE') rawDamage = Math.round(rawDamage * (currentPhase === 2 ? 1.05 : 1));
    if (currentPattern === 'VOID') rawDamage = Math.round(rawDamage * 1.05);

    const mitigation = currentPlayer.guardNext
      ? currentPattern === 'CHARGE' || currentPattern === 'RAGE' ? 0.35 : 0.55
      : 1;

    const incoming = Math.round(rawDamage * mitigation);
    const shieldDamage = Math.min(currentPlayer.shield, incoming);
    const hpDamage = Math.max(0, incoming - shieldDamage);
    const nextHp = Math.max(0, currentPlayer.hp - hpDamage);

    const nextPlayer = {
      ...currentPlayer,
      hp: nextHp,
      shield: Math.max(0, currentPlayer.shield - shieldDamage),
      guardNext: false,
      featherCooldown: Math.max(0, currentPlayer.featherCooldown - 1),
    };

    setPlayer(nextPlayer);
    setLastDamage(null);

    if (nextHp <= 0) {
      finishDefeat('いれーなは力尽きた…');
      return;
    }

    const shieldText = shieldDamage > 0 ? ' 盾が受け止めた。' : '';
    setMessage(
      currentPattern === 'CHARGE' || currentPattern === 'RAGE'
        ? `${info.name}が直撃！ -${formatNumber(hpDamage)}${shieldText}`
        : `${info.name}！ -${formatNumber(hpDamage)}${shieldText}`,
    );

    setBossPattern(getNextPattern(currentPhase, currentTurn + 1));
    setTurn(prev => prev + 1);
    setIsResolving(false);
  };

  const performAction = (type: 'NORMAL' | 'FEATHER' | 'FOCUS' | 'GUARD' | 'POTION' | 'ULTIMATE') => {
    if (mode !== 'BATTLE' || isResolving) return;
    setIsResolving(true);

    if (type === 'ULTIMATE' && !canUltimate) {
      setIsResolving(false);
      setMessage('必殺ゲージが100%必要です。');
      return;
    }

    if (type === 'FEATHER' && player.featherCooldown > 0) {
      setIsResolving(false);
      setMessage(`羽弾はあと${player.featherCooldown}ターン。`);
      return;
    }

    if ((type === 'FEATHER' || type === 'FOCUS') && player.mp < (type === 'FEATHER' ? 18 : 12)) {
      setIsResolving(false);
      setMessage('MPが足りない！');
      return;
    }

    if (type === 'GUARD' && player.mp < 10) {
      setIsResolving(false);
      setMessage('防御に必要なMPが足りない！');
      return;
    }

    if (type === 'POTION' && player.potions <= 0) {
      setIsResolving(false);
      setMessage('ポーションは残っていない！');
      return;
    }

    setActionFx(type);
    window.setTimeout(() => setActionFx(null), type === 'FEATHER' ? 1050 : type === 'ULTIMATE' ? 850 : 650);

    const baseDamage =
      type === 'NORMAL' ? randomBetween(4700, 5600) :
      type === 'FEATHER' ? randomBetween(8200, 9500) :
      type === 'ULTIMATE' ? randomBetween(26000, 30000) :
      0;

    const actionTp =
      type === 'NORMAL' ? 20 :
      type === 'FEATHER' ? 24 :
      type === 'FOCUS' ? 15 :
      type === 'GUARD' ? 15 :
      type === 'POTION' ? 8 :
      0;

    const mpCost =
      type === 'FEATHER' ? 18 :
      type === 'FOCUS' ? 12 :
      type === 'GUARD' ? 10 :
      0;

    if (type === 'GUARD') {
      const shieldAmount = 2200;
      const healedHp = Math.min(PLAYER_MAX_HP, player.hp + 350);
      const nextPlayer = {
        ...player,
        hp: healedHp,
        mp: clamp(player.mp - mpCost, 0, PLAYER_MAX_MP),
        tp: clamp(player.tp + actionTp, 0, PLAYER_MAX_TP),
        shield: shieldAmount,
        guardNext: true,
        focus: false,
        featherCooldown: Math.max(0, player.featherCooldown - 1),
      };
      setPlayer(nextPlayer);
      setLastDamage(null);
      setCombo(0);
      setMessage(`防御構え。次の${nextIntent.name}を大幅軽減！`);
      window.setTimeout(() => bossAttack(phase, bossPattern, nextPlayer, turn), 600);
      return;
    }

    if (type === 'POTION') {
      const nextPlayer = {
        ...player,
        hp: Math.min(PLAYER_MAX_HP, player.hp + 2300),
        mp: Math.min(PLAYER_MAX_MP, player.mp + 35),
        tp: clamp(player.tp + actionTp, 0, PLAYER_MAX_TP),
        potions: player.potions - 1,
        guardNext: false,
        focus: false,
        featherCooldown: Math.max(0, player.featherCooldown - 1),
      };
      setPlayer(nextPlayer);
      setLastDamage(null);
      setCombo(0);
      setMessage('ポーションで体勢を立て直した。');
      window.setTimeout(() => bossAttack(phase, bossPattern, nextPlayer, turn), 600);
      return;
    }

    if (type === 'FOCUS') {
      const nextPlayer = {
        ...player,
        mp: clamp(player.mp - mpCost, 0, PLAYER_MAX_MP),
        tp: clamp(player.tp + actionTp, 0, PLAYER_MAX_TP),
        guardNext: false,
        focus: true,
        featherCooldown: Math.max(0, player.featherCooldown - 1),
      };
      setPlayer(nextPlayer);
      setLastDamage(null);
      setMessage('風詠集中。次の攻撃が35%強化される！');
      window.setTimeout(() => bossAttack(phase, bossPattern, nextPlayer, turn), 600);
      return;
    }

    const comboBonus = combo >= 2 ? 1.08 : 1;
    const focusBonus = player.focus ? 1.30 : 1;
    const breakBonus = bossBroken ? 1.35 : 1;
    const finalDamage = Math.round(baseDamage * comboBonus * focusBonus * breakBonus);
    const actualDamage = Math.min(bossHp, finalDamage);
    const nextBossHp = Math.max(0, bossHp - actualDamage);

    const breakGain =
      type === 'NORMAL' ? 14 :
      type === 'FEATHER' ? 22 :
      type === 'ULTIMATE' ? 30 :
      0;

    const nextBreak = bossBroken ? 0 : clamp(bossBreak + breakGain, 0, 100);
    const triggersBreak = !bossBroken && nextBreak >= 100;

    const nextPlayer = {
      ...player,
      mp: clamp(player.mp - mpCost, 0, PLAYER_MAX_MP),
      tp: type === 'ULTIMATE' ? 0 : clamp(player.tp + actionTp, 0, PLAYER_MAX_TP),
      focus: false,
      featherCooldown: type === 'FEATHER'
        ? 2
        : Math.max(0, player.featherCooldown - 1),
      guardNext: false,
    };

    setPlayer(nextPlayer);
    setBossHp(nextBossHp);
    setLastDamage(actualDamage);
    setBestHit(prev => Math.max(prev, actualDamage));
    setTotalDamage(prev => prev + actualDamage);
    setCombo(prev => prev + 1);
    setBossBreak(nextBreak);

    if (type === 'ULTIMATE') {
      setMessage('いれーな「終天・羽星穿ち」！');
    } else if (type === 'FEATHER') {
      setMessage('いれーな「羽弾」！');
    } else {
      setMessage(player.focus ? '集中を乗せた一射！' : '通常射撃！');
    }

    if (nextBossHp <= 0) {
      window.setTimeout(finishVictory, 700);
      return;
    }

    if (triggersBreak) {
      setBossBroken(true);
      setBossBreak(0);
      setBreakCount(prev => prev + 1);
      setMessage('BREAK！ 深淵の核が露出した。次の攻撃が強化！');
      window.setTimeout(() => {
        setIsResolving(false);
      }, 700);
      return;
    }

    if (bossBroken) {
      setBossBroken(false);
      setBossBreak(0);
    }

    if (phase === 1 && nextBossHp <= BOSS_MAX_HP[1] * 0.5) {
      setPhase(2);
      setBossHp(BOSS_MAX_HP[2]);
      setBossBreak(0);
      setBossBroken(false);
      setBossPattern('RAGE');
      setPhaseFlash(true);
      setMessage('第2形態「深淵解放」――終焉衝動が来る！');
      window.setTimeout(() => {
        setPhaseFlash(false);
        bossAttack(2, 'RAGE', nextPlayer, turn);
      }, 1100);
      return;
    }

    window.setTimeout(() => bossAttack(phase, bossPattern, nextPlayer, turn), 650);
  };

  const startBattle = () => resetBattle();

  const stageTitle = useMemo(
    () => phase === 1 ? 'PHASE I · 封印核' : 'PHASE II · 深淵解放',
    [phase],
  );

  if (mode === 'LOADING') {
    return (
      <div style={styles.fullScreen}>
        <style>{raidCss}</style>
        <Swords size={42} color="#7CF7D4" />
        <div style={styles.loadingKicker}>RAID BATTLE</div>
        <div style={styles.loadingTitle}>深淵反応を検知</div>
        <div style={styles.loadingSub}>戦闘領域を展開しています</div>
        <div style={styles.loadingTrack}><div style={styles.loadingBar} /></div>
      </div>
    );
  }

  if (mode === 'PRE_BATTLE') {
    return (
      <div style={styles.fullScreen}>
        <style>{raidCss}</style>
        <div style={styles.preCard}>
          <div style={styles.preTop}>
            <div>
              <div style={styles.kicker}>RAID OPERATION 01</div>
              <h1 style={styles.title}>深淵喰らい・アビスコア</h1>
              <p style={styles.subtle}>いれーな単独で挑む二段階レイド。ボスの「次の行動」を読め。</p>
            </div>
            <div style={styles.preIcon}><Skull size={28} /></div>
          </div>

          <div style={styles.preStage}>
            <div style={styles.bossVisualWrap}>
              <div style={{ ...styles.bossHalo, ...(phase === 2 ? styles.bossHaloRage : {}) }} />
              <div style={styles.bossRingOuter} />
              <div style={styles.bossCore}>
                <div style={styles.bossEye} />
              </div>
              <div style={styles.bossLabel}>ABYSS CORE</div>
            </div>

            <div style={styles.vsBadge}>VS</div>

            <div style={styles.irenaCard}>
              <img src={irenaImg} alt="いれーな" style={styles.irenaPortrait} />
              <div>
                <div style={styles.kicker}>ALLY</div>
                <div style={styles.irenaName}>いれーな</div>
                <div style={styles.irenaMeta}>HP 8,000 · 羽弾 · 必殺技</div>
              </div>
            </div>
          </div>

          <div style={styles.ruleGrid}>
            <div style={styles.ruleCard}><Crosshair size={17} /><span><strong>予告</strong> 次の攻撃が常に見える</span></div>
            <div style={styles.ruleCard}><Zap size={17} /><span><strong>BREAK</strong> 核を崩すと次の一撃が強化</span></div>
            <div style={styles.ruleCard}><Shield size={17} /><span><strong>防御</strong> 大技は防御で大幅軽減</span></div>
          </div>

          <div style={styles.preStats}>
            <span>PHASE I <b>45,000 HP</b></span>
            <span>PHASE II <b>55,000 HP</b></span>
            <span>報酬判定 <b>討伐 / 敗北</b></span>
          </div>

          <button type="button" onClick={startBattle} style={styles.primaryButton}>
            <Swords size={19} /> レイド開始
          </button>
          <button type="button" onClick={onBack} style={styles.secondaryButton}>
            <ArrowLeft size={17} /> 本体へ戻る
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'RESULT') {
    return (
      <div style={styles.fullScreen}>
        <style>{raidCss}</style>
        <div style={styles.resultCard}>
          <div style={styles.kicker}>RAID RESULT</div>
          <div style={{ ...styles.resultIcon, ...(victory ? styles.resultIconWin : styles.resultIconLoss) }}>
            {victory ? <Sparkles size={44} /> : <Skull size={44} />}
          </div>
          <h1 style={styles.resultTitle}>{victory ? '討伐成功' : '戦闘終了'}</h1>
          <p style={styles.resultMessage}>{message}</p>

          <div style={styles.resultGrid}>
            <div><span>TURN</span><b>{turn}</b></div>
            <div><span>MAX HIT</span><b>{formatNumber(bestHit)}</b></div>
            <div><span>TOTAL DMG</span><b>{formatNumber(totalDamage)}</b></div>
            <div><span>BREAK</span><b>{breakCount}回</b></div>
          </div>

          <button type="button" onClick={resetBattle} style={styles.primaryButton}>
            <RotateCcw size={18} /> もう一度挑戦
          </button>
          <button type="button" onClick={onBack} style={styles.secondaryButton}>
            <ArrowLeft size={17} /> 本体へ戻る
          </button>
        </div>
      </div>
    );
  }

  const bossDangerStyle =
    nextIntent.danger === 'EXTREME' ? styles.dangerExtreme :
    nextIntent.danger === 'HIGH' ? styles.dangerHigh :
    styles.dangerNormal;

  return (
    <div style={styles.fullScreen}>
      <style>{raidCss}</style>
      {phaseFlash && <div style={styles.phaseFlash} aria-hidden="true" />}

      <div style={styles.battleShell}>
        <div style={styles.topBar}>
          <button type="button" onClick={onBack} style={styles.backButton}>
            <ArrowLeft size={15} /> 戻る
          </button>
          <div style={styles.topTitle}>
            <span>{stageTitle}</span>
            <em>TURN {turn}</em>
          </div>
          <div style={styles.targetBadge}>TARGET · ABYSS CORE</div>
        </div>

        <div style={styles.stage}>
          <div style={styles.stageAtmosphere} />
          {actionFx && (
            <div style={styles.fxLayer} aria-hidden="true">
              {actionFx === 'NORMAL' && <>
                <div style={styles.normalFlash} />
                <div style={styles.slashFxOne} />
                <div style={styles.slashFxTwo} />
              </>}
              {actionFx === 'FEATHER' && <>
                <div style={styles.featherBackdrop} />
                <img src={irenaCutInImg} alt="" style={styles.featherCutIn} />
                <div style={styles.featherRain}>羽弾</div>
              </>}
              {actionFx === 'FOCUS' && <div style={styles.focusFx}><div style={styles.focusCore} /><span>集中</span></div>}
              {actionFx === 'GUARD' && <div style={styles.guardFx}><Shield size={92} /><span style={styles.guardFxLabel}>GUARD</span></div>}
              {actionFx === 'POTION' && <div style={styles.potionFx}><Sparkles size={64} /><span style={styles.potionFxLabel}>RECOVER</span></div>}
              {actionFx === 'ULTIMATE' && <div style={styles.ultimateFx}><div style={styles.ultimateRing} /><div style={styles.ultimateCore}>必殺</div></div>}
              {actionFx === 'BOSS' && <div style={styles.bossStrikeFx}><AlertTriangle size={78} /><span style={styles.bossStrikeLabel}>BOSS STRIKE</span></div>}
            </div>
          )}
          <div style={styles.bossVisualWrapLarge}>
            <div style={{ ...styles.bossHalo, ...(phase === 2 ? styles.bossHaloRage : {}) }} />
            <div style={{ ...styles.bossRingOuter, ...(bossBroken ? styles.bossRingBroken : {}) }} />
            <div style={{ ...styles.bossCore, ...(bossBroken ? styles.bossCoreBroken : {}), ...(phase === 2 ? styles.bossCoreRage : {}) }}>
              <div style={styles.bossEye} />
            </div>
            {bossBroken && <div style={styles.breakBurst}>BREAK</div>}
            {lastDamage !== null && (
              <div key={lastDamage + '-' + totalDamage} style={styles.floatingDamage}>
                -{formatNumber(lastDamage)}
              </div>
            )}
          </div>

          <div style={styles.bossHeader}>
            <div>
              <div style={styles.bossKicker}>RAID BOSS · PHASE {phase}</div>
              <div style={styles.bossTitle}>深淵喰らい・アビスコア</div>
            </div>
            <div style={styles.hpNumbers}>{formatNumber(bossHp)} / {formatNumber(bossMaxHp)}</div>
          </div>

          <div style={styles.hpOuterBoss}>
            <div style={{ ...styles.hpInnerBoss, width: `${bossHpPercent}%` }} />
          </div>

          <div style={styles.breakArea}>
            <div style={styles.breakLabel}>
              <span>BREAK CORE</span>
              <b>{bossBroken ? 'EXPOSED' : `${bossBreak}%`}</b>
            </div>
            <div style={styles.breakTrack}>
              <div style={{ ...styles.breakFill, width: `${bossBroken ? 100 : bossBreak}%` }} />
            </div>
          </div>

          <div style={{ ...styles.intentCard, ...bossDangerStyle }}>
            <div style={styles.intentTop}>
              <span><AlertTriangle size={15} /> NEXT ATTACK</span>
              <strong>{dangerText}</strong>
            </div>
            <div style={styles.intentName}>{nextIntent.name}</div>
            <div style={styles.intentDetail}>{nextIntent.detail}</div>
          </div>
        </div>

        <div style={styles.combatRow}>
          <div style={styles.playerCard}>
            <div style={styles.playerIdentity}>
              <div style={styles.playerPortraitWrap}>
                <img src={irenaImg} alt="いれーな" style={styles.playerPortrait} />
              </div>
              <div>
                <div style={styles.kicker}>ALLY</div>
                <div style={styles.playerName}>いれーな</div>
                <div style={styles.playerTitle}>風詠の射手</div>
              </div>
            </div>

            <div style={styles.playerHpText}>
              <span>HP</span><b>{formatNumber(player.hp)} / {formatNumber(PLAYER_MAX_HP)}</b>
            </div>
            <div style={styles.hpOuterPlayer}>
              <div style={{ ...styles.hpInnerPlayer, width: `${playerHpPercent}%` }} />
            </div>

            <div style={styles.resourceGrid}>
              <div><span>MP</span><b>{player.mp}</b></div>
              <div><span>TP</span><b>{player.tp}</b></div>
              <div><span>SHIELD</span><b>{formatNumber(player.shield)}</b></div>
              <div><span>POT</span><b>{player.potions}</b></div>
            </div>

            <div style={styles.statusRow}>
              {player.focus && <span>集中 +35%</span>}
              {player.guardNext && <span>次の攻撃を軽減</span>}
              {player.featherCooldown > 0 && <span>羽弾 CD {player.featherCooldown}</span>}
              {combo >= 2 && <span>CHAIN x{combo}</span>}
            </div>
          </div>

          <div style={styles.centerMessage}>
            <div style={styles.messageTag}>{bossBroken ? 'BREAK WINDOW' : 'BATTLE LOG'}</div>
            <div style={styles.messageText}>{message}</div>
            <div style={styles.chainText}>{combo > 1 ? `CHAIN ${combo}` : 'READY'}</div>
          </div>
        </div>

        <div className="raid-actions" style={styles.actions}>
          <button type="button" onClick={() => performAction('NORMAL')} disabled={isResolving} style={styles.actionButton}>
            <Crosshair size={18} />
            <span>通常射撃</span>
            <small>DMG 4,700–5,600 · TP +20</small>
          </button>

          <button type="button" onClick={() => performAction('FEATHER')} disabled={isResolving || player.featherCooldown > 0 || player.mp < 18} style={styles.actionButton}>
            <Sparkles size={18} />
            <span>羽弾 {player.featherCooldown > 0 ? `· CD ${player.featherCooldown}` : ''}</span>
            <small>DMG 8,200–9,500 · MP 18 · BREAK +22</small>
          </button>

          <button type="button" onClick={() => performAction('FOCUS')} disabled={isResolving || player.mp < 12} style={styles.actionButton}>
            <Zap size={18} />
            <span>風詠集中</span>
            <small>次の攻撃 ×1.30 · MP 12 · TP +15</small>
          </button>

          <button type="button" onClick={() => performAction('GUARD')} disabled={isResolving || player.mp < 10} style={styles.actionButton}>
            <Shield size={18} />
            <span>防御</span>
            <small>盾 2,200 · 大技の軽減量アップ</small>
          </button>

          <button type="button" onClick={() => performAction('POTION')} disabled={isResolving || player.potions <= 0} style={styles.actionButton}>
            <Sparkles size={18} />
            <span>ポーション</span>
            <small>HP +2,300 · MP +35 · 残り {player.potions}</small>
          </button>

          <button type="button" onClick={() => performAction('ULTIMATE')} disabled={isResolving || !canUltimate} style={{ ...styles.actionButton, ...styles.ultimateButton, ...(canUltimate ? styles.ultimateReady : {}) }}>
            <Swords size={19} />
            <span>必殺・終天羽星穿ち</span>
            <small>{canUltimate ? 'READY · DMG 26,000–30,000' : `TP ${player.tp}/100`}</small>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  fullScreen: {
    position: 'relative',
    width: '100%',
    height: '100%',
    minHeight: '100%',
    overflowY: 'auto',
    backgroundColor: '#05070d',
    color: '#F4F8FF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    boxSizing: 'border-box',
  },
  loadingKicker: { marginTop: '12px', color: '#7CF7D4', fontWeight: 900, letterSpacing: '0.28em', fontSize: '12px' },
  loadingTitle: { marginTop: '6px', fontSize: 'clamp(30px, 7vw, 56px)', fontWeight: 1000, letterSpacing: '0.04em' },
  loadingSub: { color: '#8C9AB6', marginTop: '6px', fontSize: '13px' },
  loadingTrack: { width: 'min(320px, 70vw)', height: '3px', marginTop: '24px', background: '#172035', overflow: 'hidden' },
  loadingBar: { width: '100%', height: '100%', background: 'linear-gradient(90deg, #54E7C0, #8B5CF6)', transformOrigin: 'left', animation: 'raidLoading 0.85s ease-out forwards' },

  preCard: { width: 'min(100%, 860px)', background: 'rgba(10, 15, 27, 0.94)', border: '1px solid #2D3C5B', borderRadius: '22px', padding: '22px', boxSizing: 'border-box', boxShadow: '0 24px 80px rgba(0,0,0,.45)', backdropFilter: 'blur(10px)' },
  preTop: { display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' },
  kicker: { color: '#73F2D0', fontSize: '11px', fontWeight: 900, letterSpacing: '0.2em' },
  title: { margin: '7px 0 4px', fontSize: 'clamp(24px, 5vw, 38px)', fontWeight: 1000, letterSpacing: '0.02em' },
  subtle: { margin: 0, color: '#8C9AB6', fontSize: '13px', lineHeight: 1.6 },
  preIcon: { width: '48px', height: '48px', display: 'grid', placeItems: 'center', borderRadius: '14px', color: '#FF5B6E', border: '1px solid #5A2D3A', background: '#1C0E16', flex: '0 0 auto' },
  preStage: { marginTop: '20px', minHeight: '240px', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '18px', padding: '18px', borderRadius: '18px', background: 'linear-gradient(135deg, rgba(17,24,39,.9), rgba(13,11,25,.88))', border: '1px solid #283652' },
  bossVisualWrap: { position: 'relative', width: '220px', height: '220px', margin: '0 auto', display: 'grid', placeItems: 'center' },
  bossVisualWrapPre: { position: 'relative', width: 'min(42vw, 300px)', height: 'min(42vw, 300px)', minWidth: '220px', minHeight: '220px', margin: '0 auto', display: 'grid', placeItems: 'center', zIndex: 2 },
  bossHalo: { position: 'absolute', width: '72%', height: '72%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(118, 69, 255, .26), rgba(7,9,16,0) 68%)', animation: 'raidBossPulse 2.4s ease-in-out infinite' },
  bossHaloRage: { background: 'radial-gradient(circle, rgba(255, 46, 83, .30), rgba(7,9,16,0) 68%)' },
  bossRingOuter: { position: 'absolute', width: '86%', height: '86%', borderRadius: '50%', border: '1px solid rgba(124,247,212,.26)', borderTopColor: '#7CF7D4', borderRightColor: '#9A7BFF', animation: 'raidBossRing 7s linear infinite' },
  bossRingBroken: { borderColor: '#FFF4A3', borderTopColor: '#FFFFFF', animation: 'raidBossRing 1.3s linear infinite' },
  bossCore: { position: 'relative', width: '48%', height: '48%', borderRadius: '42% 58% 55% 45%', background: 'radial-gradient(circle at 50% 40%, #2F214C 0%, #151022 42%, #05060A 74%)', border: '2px solid #806BD4', boxShadow: '0 0 40px rgba(126,86,255,.32)', animation: 'raidBossFloat 3.1s ease-in-out infinite', zIndex: 3 },
  bossCoreBroken: { borderColor: '#FFF4A3', boxShadow: '0 0 55px rgba(255,244,163,.42)', animation: 'raidStagger .75s ease-in-out infinite' },
  bossCoreRage: { borderColor: '#FF4763', boxShadow: '0 0 55px rgba(255,50,80,.4)' },
  bossEye: { position: 'absolute', left: '50%', top: '48%', width: '34%', height: '12%', transform: 'translate(-50%,-50%)', borderRadius: '999px', background: 'linear-gradient(90deg, #FF3255, #FF9A66, #FF3255)', boxShadow: '0 0 16px rgba(255,80,100,.9)' },
  bossLabel: { position: 'absolute', bottom: '2px', color: '#A8B8D6', fontSize: '11px', fontWeight: 900, letterSpacing: '0.24em' },
  vsBadge: { width: '42px', height: '42px', display: 'grid', placeItems: 'center', borderRadius: '50%', border: '1px solid #465777', color: '#FFFFFF', fontWeight: 1000, background: '#121A2A', zIndex: 2 },
  irenaCard: { display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center' },
  irenaPortrait: { width: '90px', height: '132px', objectFit: 'cover', objectPosition: 'center', borderRadius: '14px', border: '1px solid #3EE3BF', boxShadow: '0 0 24px rgba(62,227,191,.16)' },
  irenaName: { marginTop: '5px', fontSize: '24px', fontWeight: 1000 },
  irenaMeta: { marginTop: '5px', fontSize: '12px', color: '#9DAAC2' },

  ruleGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px', marginTop: '14px' },
  ruleCard: { display: 'flex', alignItems: 'center', gap: '8px', minHeight: '48px', padding: '9px 10px', boxSizing: 'border-box', borderRadius: '11px', background: '#0F1626', border: '1px solid #273854', color: '#AAB8D2', fontSize: '11px', lineHeight: 1.4 },
  preStats: { display: 'flex', flexWrap: 'wrap', gap: '14px 22px', marginTop: '12px', color: '#7E8DAA', fontSize: '11px' },

  primaryButton: { width: '100%', minHeight: '54px', marginTop: '18px', border: '1px solid #6BF6D8', borderRadius: '14px', background: 'linear-gradient(135deg, #0D6F60, #1D3D73)', color: '#FFFFFF', fontWeight: 1000, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' },
  secondaryButton: { width: '100%', minHeight: '48px', marginTop: '8px', border: '1px solid #33445F', borderRadius: '12px', background: '#0E1523', color: '#C0CCE0', fontWeight: 800, fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', cursor: 'pointer' },

  resultCard: { width: 'min(100%, 560px)', textAlign: 'center', background: 'rgba(11,16,28,.96)', border: '1px solid #334362', borderRadius: '22px', padding: '28px', boxSizing: 'border-box' },
  resultIcon: { width: '84px', height: '84px', margin: '14px auto 10px', display: 'grid', placeItems: 'center', borderRadius: '50%' },
  resultIconWin: { color: '#7CF7D4', background: 'rgba(71,230,189,.10)', border: '1px solid #3ED8B0' },
  resultIconLoss: { color: '#FF7B8C', background: 'rgba(255,72,97,.08)', border: '1px solid #7A3343' },
  resultTitle: { margin: '8px 0 4px', fontSize: '38px', fontWeight: 1000 },
  resultMessage: { margin: 0, color: '#9AA8C0', fontSize: '13px' },
  resultGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '8px', marginTop: '22px' },
  resultGridItem: { background: '#0F1626', border: '1px solid #273854', borderRadius: '10px', padding: '12px 6px' },

  battleShell: { width: 'min(100%, 980px)', display: 'flex', flexDirection: 'column', gap: '10px', position: 'relative', zIndex: 2 },
  topBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '8px 10px', borderRadius: '12px', border: '1px solid #283754', background: 'rgba(9,14,24,.92)', backdropFilter: 'blur(8px)' },
  backButton: { minHeight: '34px', padding: '0 10px', display: 'flex', alignItems: 'center', gap: '5px', border: '1px solid #34455F', borderRadius: '9px', color: '#D6E0F0', background: '#0E1523', cursor: 'pointer', fontWeight: 800 },
  topTitle: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12px', fontWeight: 900, letterSpacing: '0.08em' },
  targetBadge: { color: '#7CF7D4', fontSize: '10px', fontWeight: 900, letterSpacing: '0.12em' },

  stage: { position: 'relative', overflow: 'hidden', minHeight: '430px', borderRadius: '18px', border: '1px solid #263551', background: 'linear-gradient(180deg, rgba(7,10,19,.82), rgba(10,9,22,.94))', padding: '20px 18px 16px', boxSizing: 'border-box' },
  stageAtmosphere: { position: 'absolute', inset: 0, backgroundImage: `linear-gradient(rgba(5,7,13,.55), rgba(5,7,13,.88)), url(${battleBackground})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: .24, pointerEvents: 'none' },
  bossHeader: { position: 'relative', display: 'flex', alignItems: 'end', justifyContent: 'space-between', gap: '10px', zIndex: 4 },
  bossKicker: { color: '#8C9AB6', fontSize: '10px', fontWeight: 900, letterSpacing: '0.18em' },
  bossTitle: { marginTop: '4px', fontSize: 'clamp(18px, 3vw, 25px)', fontWeight: 1000 },
  hpNumbers: { color: '#FFCCD4', fontSize: '12px', fontWeight: 900 },

  hpOuterBoss: { position: 'relative', zIndex: 4, height: '13px', marginTop: '8px', borderRadius: '999px', background: '#24101A', border: '1px solid #5D3040', overflow: 'hidden' },
  hpInnerBoss: { height: '100%', background: 'linear-gradient(90deg, #7D1A4B, #F23F69, #FF884A)', transition: 'width .25s ease', boxShadow: '0 0 16px rgba(242,63,105,.35)' },
  breakArea: { position: 'relative', zIndex: 4, marginTop: '10px' },
  breakLabel: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#91A0BA', fontWeight: 900, letterSpacing: '0.12em' },
  breakTrack: { height: '7px', marginTop: '4px', borderRadius: '999px', overflow: 'hidden', background: '#201C13', border: '1px solid #514425' },
  breakFill: { height: '100%', background: 'linear-gradient(90deg, #8D7D26, #FFF1A4)', transition: 'width .25s ease' },

  intentCard: { position: 'relative', zIndex: 4, width: 'min(100%, 520px)', margin: '8px auto 0', padding: '9px 12px', borderRadius: '12px', border: '1px solid #34445F', background: 'rgba(8,13,23,.78)', boxSizing: 'border-box', animation: 'raidDanger 1.6s ease-in-out infinite' },
  dangerNormal: { borderColor: '#33445F' },
  dangerHigh: { borderColor: '#7C5A2E', boxShadow: '0 0 20px rgba(255,196,80,.07)' },
  dangerExtreme: { borderColor: '#8A3143', boxShadow: '0 0 24px rgba(255,75,95,.10)' },
  intentTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#9DAAC2', fontSize: '10px', fontWeight: 900, letterSpacing: '0.12em' },
  intentName: { marginTop: '4px', fontSize: '16px', fontWeight: 1000 },
  intentDetail: { marginTop: '2px', color: '#8E9CB6', fontSize: '11px' },

  bossVisualWrapLarge: { position: 'absolute', left: '50%', top: '74px', transform: 'translateX(-50%)', width: 'min(42vw, 330px)', height: 'min(42vw, 330px)', minWidth: '240px', minHeight: '240px', display: 'grid', placeItems: 'center', zIndex: 2 },
  floatingDamage: { position: 'absolute', left: '50%', top: '37%', zIndex: 8, color: '#FFFFFF', fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 1000, textShadow: '0 3px 0 #571A2B, 0 0 18px rgba(255,70,120,.75)', animation: 'raidDamagePop .72s ease-out forwards', pointerEvents: 'none' },
  breakBurst: { position: 'absolute', left: '50%', top: '51%', transform: 'translate(-50%,-50%)', zIndex: 9, color: '#FFF6A4', fontSize: 'clamp(24px, 6vw, 44px)', fontWeight: 1000, letterSpacing: '0.12em', textShadow: '0 0 22px rgba(255,242,140,.9)', pointerEvents: 'none' },

  combatRow: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, .9fr)', gap: '10px' },
  playerCard: { position: 'relative', padding: '14px', borderRadius: '15px', border: '1px solid #244B48', background: 'linear-gradient(135deg, #0E1B1D, #101828)', animation: 'raidIrenaGlow 3.2s ease-in-out infinite' },
  playerIdentity: { display: 'flex', alignItems: 'center', gap: '10px' },
  playerPortraitWrap: { width: '56px', height: '70px', borderRadius: '10px', overflow: 'hidden', border: '1px solid #53E7C6', flex: '0 0 auto' },
  playerPortrait: { width: '100%', height: '100%', objectFit: 'cover' },
  playerName: { marginTop: '3px', fontSize: '19px', fontWeight: 1000 },
  playerTitle: { marginTop: '1px', color: '#7E9E9A', fontSize: '10px' },
  playerHpText: { display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '10px', fontSize: '10px', color: '#90A1B9', fontWeight: 900 },
  hpOuterPlayer: { height: '10px', marginTop: '4px', overflow: 'hidden', borderRadius: '999px', background: '#11232A', border: '1px solid #265C59' },
  hpInnerPlayer: { height: '100%', background: 'linear-gradient(90deg, #25C7A7, #74F5D7)', transition: 'width .22s ease' },
  resourceGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '6px', marginTop: '9px' },
  resourceGridItem: { background: '#0B131D', border: '1px solid #203449', borderRadius: '8px', padding: '7px 4px', textAlign: 'center' },
  statusRow: { minHeight: '18px', display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px' },
  statusRowItem: { padding: '3px 6px', borderRadius: '999px', border: '1px solid #2C5670', background: '#102331', color: '#9AC6D9', fontSize: '9px', fontWeight: 800 },
  centerMessage: { minHeight: '132px', padding: '14px', boxSizing: 'border-box', borderRadius: '15px', border: '1px solid #303A53', background: '#0B111D', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' },
  messageTag: { color: '#7888A4', fontSize: '9px', fontWeight: 900, letterSpacing: '0.18em' },
  messageText: { marginTop: '7px', fontSize: '14px', fontWeight: 900, lineHeight: 1.45 },
  chainText: { marginTop: '9px', color: '#FFF0A2', fontSize: '11px', fontWeight: 1000, letterSpacing: '0.16em' },

  actions: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' },
  actionButton: { minHeight: '78px', borderRadius: '13px', border: '1px solid #31435F', background: '#111A2A', color: '#EFF5FF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '8px', boxSizing: 'border-box', cursor: 'pointer', fontWeight: 900, transition: 'transform .12s ease, border-color .12s ease, background .12s ease' },
  ultimateButton: { background: 'linear-gradient(135deg, #26154B, #40201D)', borderColor: '#7055C7' },
  ultimateReady: { borderColor: '#FFF0A2', boxShadow: '0 0 20px rgba(255,240,162,.16)' },
  actionButtonSmall: {},
  disabledButton: { opacity: 0.4, cursor: 'not-allowed' },
  phaseFlash: { position: 'fixed', inset: 0, zIndex: 50, pointerEvents: 'none', background: 'radial-gradient(circle, rgba(255,56,80,.72), rgba(0,0,0,.94) 72%)', animation: 'raidPhaseFlash 1.1s ease-out forwards' },

  fxLayer: { position: 'absolute', inset: 0, zIndex: 20, pointerEvents: 'none', overflow: 'hidden', display: 'grid', placeItems: 'center' },
  normalFlash: { position: 'absolute', width: '52%', height: '52%', borderRadius: '50%', border: '2px solid rgba(255,255,255,.85)', boxShadow: '0 0 38px rgba(160,220,255,.55)', animation: 'raidActionFlash .55s ease-out forwards' },
  slashFxOne: { position: 'absolute', width: '78%', height: '10px', borderRadius: '999px', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.95), transparent)', boxShadow: '0 0 18px rgba(180,230,255,.7)', animation: 'raidSlashFx .5s ease-out forwards' },
  slashFxTwo: { position: 'absolute', width: '58%', height: '6px', borderRadius: '999px', background: 'linear-gradient(90deg, transparent, rgba(120,255,220,.95), transparent)', animation: 'raidSlashFx .56s .04s ease-out forwards' },
  featherBackdrop: { position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 46%, rgba(176,112,255,.32), rgba(8,10,20,0) 60%)', animation: 'raidActionFlash 1.0s ease-out forwards' },
  featherCutIn: { position: 'absolute', left: 0, top: '12%', width: '48%', maxWidth: '420px', maxHeight: '76%', objectFit: 'cover', objectPosition: 'center', borderRadius: '0 16px 16px 0', border: '1px solid rgba(255,255,255,.35)', boxShadow: '0 0 32px rgba(171,71,188,.34)', animation: 'raidFeatherCutIn 1.05s ease-out forwards' },
  featherRain: { position: 'absolute', right: '10%', top: '18%', color: '#FFFFFF', fontSize: 'clamp(26px, 6vw, 52px)', fontWeight: 1000, letterSpacing: '.16em', textShadow: '0 0 20px rgba(210,180,255,.95)', animation: 'raidFeatherRain 1.05s ease-out forwards' },
  focusFx: { position: 'absolute', display: 'grid', placeItems: 'center', width: '140px', height: '140px', borderRadius: '50%', color: '#A9FFE9', fontWeight: 1000, textShadow: '0 0 16px rgba(118,255,210,.9)', animation: 'raidActionFlash .7s ease-out forwards' },
  focusCore: { position: 'absolute', width: '76px', height: '76px', borderRadius: '50%', border: '2px solid #7CF7D4', boxShadow: '0 0 28px rgba(124,247,212,.6)' },
  guardFx: { position: 'absolute', display: 'grid', placeItems: 'center', width: '150px', height: '150px', borderRadius: '50%', color: '#7CF7D4', border: '2px solid rgba(124,247,212,.8)', background: 'rgba(40,180,160,.08)', boxShadow: '0 0 46px rgba(70,240,200,.32)', animation: 'raidGuardFx .78s ease-out forwards' },
  guardFxLabel: { position: 'absolute', bottom: '18px', fontSize: '12px', letterSpacing: '.2em' },
  potionFx: { position: 'absolute', display: 'grid', placeItems: 'center', width: '130px', height: '130px', borderRadius: '50%', color: '#9DFF9B', textShadow: '0 0 16px rgba(120,255,120,.8)', animation: 'raidGuardFx .78s ease-out forwards' },
  potionFxLabel: { position: 'absolute', bottom: '8px', fontSize: '11px', letterSpacing: '.18em' },
  ultimateFx: { position: 'absolute', display: 'grid', placeItems: 'center', width: '180px', height: '180px', color: '#FFF2A8', textShadow: '0 0 20px rgba(255,242,168,.9)' },
  ultimateRing: { position: 'absolute', inset: 0, borderRadius: '50%', border: '3px solid rgba(230,190,255,.92)', boxShadow: '0 0 46px rgba(190,110,255,.65), inset 0 0 42px rgba(190,110,255,.38)', animation: 'raidUltimateFx .82s ease-out forwards' },
  ultimateCore: { fontSize: 'clamp(34px, 8vw, 66px)', fontWeight: 1000, letterSpacing: '.12em', animation: 'raidActionFlash .82s ease-out forwards' },
  bossStrikeFx: { position: 'absolute', display: 'grid', placeItems: 'center', width: '160px', height: '160px', borderRadius: '50%', color: '#FF7A8A', border: '2px solid rgba(255,90,110,.8)', background: 'rgba(120,10,30,.12)', boxShadow: '0 0 44px rgba(255,50,80,.35)', animation: 'raidBossStrikeFx .68s ease-out forwards' },
  bossStrikeLabel: { position: 'absolute', bottom: '16px', fontSize: '11px', fontWeight: 1000, letterSpacing: '.18em' },

};

export default RaidBossScreen;
