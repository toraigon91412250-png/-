import React, { useEffect, useMemo, useState } from 'react';

type Phase = 1 | 2;

type PlayerState = {
  hp: number;
  mp: number;
  tp: number;
  shield: number;
  potions: number;
  guardNext: boolean;
};

const MAX_BOSS_HP: Record<Phase, number> = {
  1: 120000,
  2: 180000,
};

const BOSS_ATK: Record<Phase, number> = {
  1: 950,
  2: 1250,
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const formatNumber = (value: number) => Math.max(0, Math.round(value)).toLocaleString('ja-JP');

const getRandomMultiplier = () => 0.96 + Math.random() * 0.08;

export const RaidBossScreen: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [mode, setMode] = useState<'LOADING' | 'PRE_BATTLE' | 'BATTLE' | 'RESULT'>('LOADING');
  const [phase, setPhase] = useState<Phase>(1);
  const [bossHp, setBossHp] = useState(MAX_BOSS_HP[1]);
  const [player, setPlayer] = useState<PlayerState>({
    hp: 3800,
    mp: 100,
    tp: 0,
    shield: 0,
    potions: 3,
    guardNext: false,
  });
  const [turn, setTurn] = useState(1);
  const [lastDamage, setLastDamage] = useState<number | null>(null);
  const [message, setMessage] = useState('戦闘準備中…');
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMode('PRE_BATTLE');
    }, 1100);
    return () => window.clearTimeout(timer);
  }, []);

  const bossMaxHp = MAX_BOSS_HP[phase];
  const bossHpPercent = clamp((bossHp / bossMaxHp) * 100, 0, 100);
  const playerHpPercent = clamp((player.hp / 3800) * 100, 0, 100);
  const canUltimate = player.tp >= 100;

  const resetBattle = () => {
    setPhase(1);
    setBossHp(MAX_BOSS_HP[1]);
    setPlayer({ hp: 3800, mp: 100, tp: 0, shield: 0, potions: 3, guardNext: false });
    setTurn(1);
    setLastDamage(null);
    setMessage('戦闘開始！');
    setIsResolving(false);
    setMode('BATTLE');
  };

  const startBattle = () => resetBattle();

  const finishDefeat = (reason: string) => {
    setPlayer(prev => ({ ...prev, hp: 0 }));
    setMessage(reason);
    setIsResolving(false);
    setMode('RESULT');
  };

  const finishVictory = () => {
    setMessage('レイドボス討伐成功！');
    setIsResolving(false);
    setMode('RESULT');
  };

  const bossAttack = (currentPhase: Phase, currentPlayer: PlayerState) => {
    const base = BOSS_ATK[currentPhase] * getRandomMultiplier();
    const reduced = currentPlayer.guardNext ? base * 0.5 : base;
    const shieldDamage = Math.min(currentPlayer.shield, reduced);
    const hpDamage = Math.max(0, reduced - shieldDamage);
    const nextHp = currentPlayer.hp - hpDamage;

    setPlayer(prev => ({
      ...prev,
      hp: Math.max(0, Math.round(nextHp)),
      shield: Math.max(0, Math.round(prev.shield - shieldDamage)),
      guardNext: false,
    }));

    if (nextHp <= 0) {
      finishDefeat('力尽きてしまった…');
      return false;
    }

    setMessage(
      currentPhase === 2
        ? '第2形態の攻撃！'
        : 'ボスの反撃！'
    );
    setIsResolving(false);
    return true;
  };

  const performAction = (type: 'NORMAL' | 'ICE' | 'HOLY' | 'GUARD' | 'ULTIMATE' | 'POTION') => {
    if (mode !== 'BATTLE' || isResolving) return;
    setIsResolving(true);

    let damage = 0;
    let tpGain = 0;
    let mpCost = 0;
    let nextPlayer = player;

    if (type === 'NORMAL') {
      damage = Math.round(2600 * getRandomMultiplier());
      tpGain = 22;
      setMessage('通常攻撃！');
    } else if (type === 'ICE') {
      mpCost = 25;
      if (player.mp < mpCost) {
        setIsResolving(false);
        setMessage('MPが足りない！');
        return;
      }
      damage = Math.round(2600 * 2.2 * getRandomMultiplier());
      tpGain = 25;
      setMessage('極光氷竜波！');
    } else if (type === 'HOLY') {
      mpCost = 30;
      if (player.mp < mpCost) {
        setIsResolving(false);
        setMessage('MPが足りない！');
        return;
      }
      damage = Math.round(2600 * 2.4 * getRandomMultiplier());
      tpGain = 25;
      setMessage('聖光天破断！');
    } else if (type === 'GUARD') {
      if (player.mp < 15) {
        setIsResolving(false);
        setMessage('MPが足りない！');
        return;
      }
      nextPlayer = {
        ...player,
        mp: player.mp - 15,
        tp: clamp(player.tp + 18, 0, 100),
        shield: 1400,
        hp: Math.min(3800, player.hp + 600),
        guardNext: true,
      };
      setPlayer(nextPlayer);
      setLastDamage(null);
      setTurn(prev => prev + 1);
      window.setTimeout(() => bossAttack(phase, nextPlayer), 220);
      return;
    } else if (type === 'POTION') {
      if (player.potions <= 0) {
        setIsResolving(false);
        setMessage('ポーションがない！');
        return;
      }
      nextPlayer = {
        ...player,
        hp: Math.min(3800, player.hp + 1800),
        mp: Math.min(100, player.mp + 40),
        potions: player.potions - 1,
      };
      setPlayer(nextPlayer);
      setLastDamage(null);
      setMessage('ポーション使用！');
      setTurn(prev => prev + 1);
      window.setTimeout(() => bossAttack(phase, nextPlayer), 220);
      return;
    } else {
      if (!canUltimate) {
        setIsResolving(false);
        setMessage('必殺技ゲージが足りない！');
        return;
      }
      damage = Math.round((4200 * 6 + 12000) * getRandomMultiplier());
      setMessage('神技・崩天覇皇滅殺刃！');
      setPlayer(prev => ({ ...prev, tp: 0 }));
    }

    const nextMp = clamp(player.mp - mpCost, 0, 100);
    const nextTp = type === 'ULTIMATE' ? 0 : clamp(player.tp + tpGain, 0, 100);
    const actualDamage = Math.min(bossHp, Math.max(0, damage));
    const nextBossHp = Math.max(0, bossHp - actualDamage);

    setPlayer(prev => ({
      ...prev,
      mp: nextMp,
      tp: nextTp,
      hp: prev.hp,
    }));
    setBossHp(nextBossHp);
    setLastDamage(actualDamage);

    if (nextBossHp <= 0) {
      finishVictory();
      return;
    }

    if (phase === 1 && nextBossHp <= MAX_BOSS_HP[1] * 0.5) {
      setPhase(2);
      setBossHp(() => Math.min(MAX_BOSS_HP[2], Math.round(MAX_BOSS_HP[2] * 0.7)));
      setMessage('🔥 第2形態へ移行！ 真・暴走覚醒');
    }

    setTurn(prev => prev + 1);
    window.setTimeout(() => {
      bossAttack(phase === 1 && nextBossHp <= MAX_BOSS_HP[1] * 0.5 ? 2 : phase, player);
    }, 220);
  };

  const stageTitle = useMemo(
    () => phase === 1 ? '第1形態：封印重装甲' : '第2形態：真・暴走覚醒',
    [phase]
  );

  if (mode === 'LOADING') {
    return (
      <div style={styles.fullScreen}>
        <style>{`
          @keyframes raidLoadingBar {
            0% { transform: scaleX(0); opacity: 0.4; }
            20% { opacity: 1; }
            100% { transform: scaleX(1); opacity: 1; }
          }
        `}</style>
        <div style={styles.loadingLabel}>RAID BOSS DEPLOYING...</div>
        <div style={styles.loadingTitle}>戦闘地点へ移動中</div>
        <div style={styles.loadingTrack}>
          <div style={styles.loadingBar} />
        </div>
      </div>
    );
  }

  if (mode === 'PRE_BATTLE') {
    return (
      <div style={styles.fullScreen}>
        <div style={styles.panel}>
          <div style={styles.kicker}>RAID BOSS</div>
          <h1 style={styles.title}>レイドボス試作</h1>
          <div style={styles.bossPlaceholder}>RAID BOSS</div>
          <div style={styles.infoRow}><span>ボスHP</span><strong>120,000</strong></div>
          <div style={styles.infoRow}><span>第2形態</span><strong>残り50%で覚醒</strong></div>
          <button type="button" onClick={startBattle} style={styles.primaryButton}>挑戦する</button>
          <button type="button" onClick={onBack} style={styles.secondaryButton}>本体へ戻る</button>
        </div>
      </div>
    );
  }

  if (mode === 'RESULT') {
    return (
      <div style={styles.fullScreen}>
        <div style={styles.panel}>
          <div style={styles.kicker}>RAID RESULT</div>
          <h1 style={styles.title}>{message}</h1>
          <div style={styles.resultValue}>{player.hp > 0 ? '討伐成功' : '敗北'}</div>
          <div style={styles.infoRow}><span>ターン</span><strong>{turn}</strong></div>
          <button type="button" onClick={resetBattle} style={styles.primaryButton}>もう一度挑戦</button>
          <button type="button" onClick={onBack} style={styles.secondaryButton}>本体へ戻る</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.fullScreen}>
      <div style={styles.battleShell}>
        <div style={styles.topBar}>
          <button type="button" onClick={onBack} style={styles.iconButton}>← 戻る</button>
          <strong>{stageTitle}</strong>
          <span>TURN {turn}</span>
        </div>

        <div style={styles.bossArea}>
          <div style={styles.bossPlaceholderLarge}>{phase === 1 ? 'BOSS' : 'AWAKENED BOSS'}</div>
          <div style={styles.bossName}>RAID BOSS</div>
          <div style={styles.hpOuter}>
            <div style={{ ...styles.hpInnerBoss, width: `${bossHpPercent}%` }} />
          </div>
          <div style={styles.hpText}>{formatNumber(bossHp)} / {formatNumber(bossMaxHp)}</div>
          {lastDamage !== null && <div style={styles.damageText}>-{formatNumber(lastDamage)}</div>}
        </div>

        <div style={styles.playerPanel}>
          <div style={styles.infoRow}><span>プレイヤー HP</span><strong>{formatNumber(player.hp)} / 3,800</strong></div>
          <div style={styles.hpOuter}>
            <div style={{ ...styles.hpInnerPlayer, width: `${playerHpPercent}%` }} />
          </div>
          <div style={styles.resourceRow}>
            <span>MP {player.mp}/100</span>
            <span>TP {player.tp}/100</span>
            <span>盾 {player.shield}</span>
            <span>薬 {player.potions}</span>
          </div>
        </div>

        <div style={styles.message}>{message}</div>

        <div style={styles.actions}>
          <button type="button" disabled={isResolving} onClick={() => performAction('NORMAL')} style={{ ...styles.actionButton, ...(isResolving ? styles.disabledButton : {}) }}>通常攻撃</button>
          <button type="button" disabled={isResolving} onClick={() => performAction('ICE')} style={{ ...styles.actionButton, ...(isResolving ? styles.disabledButton : {}) }}>氷スキル</button>
          <button type="button" disabled={isResolving} onClick={() => performAction('HOLY')} style={{ ...styles.actionButton, ...(isResolving ? styles.disabledButton : {}) }}>聖スキル</button>
          <button type="button" disabled={isResolving} onClick={() => performAction('GUARD')} style={{ ...styles.actionButton, ...(isResolving ? styles.disabledButton : {}) }}>防御</button>
          <button type="button" disabled={isResolving} onClick={() => performAction('POTION')} style={{ ...styles.actionButton, ...(isResolving ? styles.disabledButton : {}) }}>ポーション</button>
          <button
            type="button"
            onClick={() => performAction('ULTIMATE')}
            disabled={!canUltimate || isResolving}
            style={{ ...styles.actionButton, ...(!canUltimate || isResolving ? styles.disabledButton : styles.ultimateButton) }}
          >
            必殺技 {player.tp >= 100 ? 'READY' : `TP ${player.tp}`}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  fullScreen: {
    width: '100%',
    height: '100%',
    minHeight: '100%',
    background: '#090B13',
    color: '#FFFFFF',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflowY: 'auto',
    padding: '20px',
    boxSizing: 'border-box',
  },
  loadingLabel: {
    color: '#90CAF9',
    fontSize: '12px',
    fontWeight: 800,
    letterSpacing: '0.25em',
    marginBottom: '10px',
  },
  loadingTitle: {
    fontSize: 'clamp(28px, 6vw, 52px)',
    fontWeight: 1000,
    letterSpacing: '0.08em',
    textShadow: '0 0 18px rgba(144, 202, 249, 0.45)',
  },
  loadingTrack: {
    width: 'clamp(160px, 32vw, 240px)',
    height: '3px',
    marginTop: '22px',
    background: '#1E283D',
    overflow: 'hidden',
  },
  loadingBar: {
    width: '100%',
    height: '100%',
    background: '#64B5F6',
    transformOrigin: 'left center',
    animation: 'raidLoadingBar 1.1s ease-out both',
  },
  panel: {
    width: 'min(100%, 680px)',
    background: '#121724',
    border: '1px solid #334568',
    borderRadius: '16px',
    padding: '24px',
    boxSizing: 'border-box',
  },
  kicker: { color: '#FFD54F', fontSize: '12px', fontWeight: 900, letterSpacing: '0.18em' },
  title: { margin: '8px 0 18px', fontSize: '28px', fontWeight: 900 },
  bossPlaceholder: {
    height: '160px',
    display: 'grid',
    placeItems: 'center',
    background: 'linear-gradient(135deg, #1D1730, #321A20)',
    borderRadius: '12px',
    color: '#FFB74D',
    fontSize: '28px',
    fontWeight: 1000,
    letterSpacing: '0.12em',
    marginBottom: '18px',
  },
  bossArea: {
    width: 'min(100%, 760px)',
    textAlign: 'center',
  },
  bossPlaceholderLarge: {
    height: '230px',
    display: 'grid',
    placeItems: 'center',
    background: 'radial-gradient(circle, #3A2332 0%, #171A29 52%, #0B0D15 100%)',
    borderRadius: '18px',
    color: '#FFFFFF',
    fontSize: '32px',
    fontWeight: 1000,
    letterSpacing: '0.12em',
    border: '1px solid #5B3949',
  },
  bossName: { marginTop: '10px', fontSize: '18px', fontWeight: 900, color: '#FFD54F' },
  hpOuter: {
    height: '14px',
    background: '#251423',
    borderRadius: '7px',
    overflow: 'hidden',
    border: '1px solid #5B3949',
    marginTop: '8px',
  },
  hpInnerBoss: { height: '100%', background: 'linear-gradient(90deg, #E65100, #FF1744)', transition: 'width 0.2s ease' },
  hpInnerPlayer: { height: '100%', background: 'linear-gradient(90deg, #1565C0, #64B5F6)', transition: 'width 0.2s ease' },
  hpText: { marginTop: '5px', color: '#FFCDD2', fontSize: '12px', fontWeight: 700 },
  damageText: { color: '#FF5252', fontSize: '26px', fontWeight: 1000, marginTop: '10px' },
  infoRow: { display: 'flex', justifyContent: 'space-between', gap: '16px', fontSize: '13px', color: '#B0BEC5', marginTop: '10px' },
  resourceRow: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: '8px', marginTop: '8px', color: '#B0BEC5', fontSize: '12px' },
  playerPanel: { width: 'min(100%, 760px)', background: '#111624', border: '1px solid #27324A', borderRadius: '12px', padding: '12px', boxSizing: 'border-box' },
  message: { width: 'min(100%, 760px)', minHeight: '24px', textAlign: 'center', color: '#90CAF9', fontWeight: 800, margin: '10px 0' },
  battleShell: { width: 'min(100%, 900px)', display: 'flex', flexDirection: 'column', gap: '10px' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', background: '#101522', border: '1px solid #29354F', borderRadius: '10px', padding: '8px 10px', fontSize: '12px' },
  iconButton: { background: 'transparent', border: '1px solid #3A475F', color: '#FFFFFF', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer' },
  actions: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px' },
  actionButton: { minHeight: '48px', borderRadius: '10px', border: '1px solid #42516D', background: '#182033', color: '#FFFFFF', fontWeight: 800, cursor: 'pointer' },
  ultimateButton: { background: '#5D2B00', borderColor: '#FFB74D' },
  disabledButton: { opacity: 0.45, cursor: 'not-allowed' },
  primaryButton: { width: '100%', marginTop: '18px', minHeight: '52px', border: '1px solid #FFB74D', borderRadius: '12px', background: '#E65100', color: '#FFFFFF', fontWeight: 900, fontSize: '17px', cursor: 'pointer' },
  secondaryButton: { width: '100%', marginTop: '8px', minHeight: '48px', border: '1px solid #39475F', borderRadius: '12px', background: '#171E2E', color: '#D9E2F2', fontWeight: 700, cursor: 'pointer' },
  resultValue: { marginTop: '16px', fontSize: '24px', fontWeight: 900, color: '#FFD54F' },
};

export default RaidBossScreen;
