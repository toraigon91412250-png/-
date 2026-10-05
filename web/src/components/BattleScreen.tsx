import React, { useEffect, useState } from 'react';
import { BattleAction, BattleUiState, IrenaSkillId, IrenaSkillProgress, FeatherSkillPath, RuinSkillPath, IrenaSpecialSkillId, getEffectiveAttack, getEffectiveDefense, getEffectiveSpeed } from '../types/game';
import { FighterCard } from './FighterCard';
import { ActionDock } from './ActionDock';
import { VisualEffectOverlay } from './VisualEffectOverlay';
import { BattleResultModal } from './BattleResultModal';
import battleBackground from '../assets/戦闘中背景.png';
import { ArrowLeft, Volume2, VolumeX, FastForward } from 'lucide-react';

interface BattleScreenProps {
  state: BattleUiState;
  onAction: (
    action: BattleAction,
    ultimateVariant?: 'ALL_GODS' | 'RUIN' | 'OMNIPOTENCE',
    specialSkillId?: IrenaSpecialSkillId,
  ) => void;
  onBackToSelect: () => void;
  onRestart: () => void;
  skillProgress: IrenaSkillProgress;
  onUpgradeSkill: (skillId: IrenaSkillId) => void;
  onChooseSkillPath: (skillId: IrenaSkillId, path: FeatherSkillPath | RuinSkillPath) => void;
  onToggleSound: () => void;
  onToggleSpeed: () => void;
}

const CPU_INTENT_META: Record<BattleAction, {
  label: string;
  description: string;
  counterplay: string;
  alert: string;
  accent: string;
}> = {
  ATTACK: {
    label: '通常攻撃',
    description: '直接攻撃を狙っている',
    counterplay: '回避で受け流す／攻撃で応戦',
    alert: '警戒：中',
    accent: '#64B5F6',
  },
  EVADE: {
    label: '回避',
    description: '攻撃を避ける構え',
    counterplay: '攻撃系は回避判定に注意',
    alert: '警戒：低',
    accent: '#4DD0E1',
  },
  BUFF: {
    label: '強化',
    description: '次の攻撃に向けて力を溜める',
    counterplay: '今ターンの攻めが通りやすい',
    alert: '警戒：中',
    accent: '#FFD54F',
  },
  SPECIAL: {
    label: '重撃',
    description: '特殊技を放つ',
    counterplay: '回避で対処可能／命中時は状態異常',
    alert: '警戒：高',
    accent: '#CE93D8',
  },
  ULTIMATE: {
    label: '超重撃',
    description: '必殺技を解放する',
    counterplay: '大ダメージに注意／回避も選択肢',
    alert: '警戒：最高',
    accent: '#FF8A65',
  },
};

const TacticalForecast: React.FC<{ state: BattleUiState; compact?: boolean }> = ({ state, compact = false }) => {
  if (state.phase !== 'SELECT_ACTION') return null;

  const playerSpeed = getEffectiveSpeed(state.player);
  const enemySpeed = getEffectiveSpeed(state.enemy);
  const playerGoesFirst = playerSpeed >= enemySpeed;
  const orderText = playerGoesFirst
    ? `先攻 いれーな ${playerSpeed} → カイザー ${enemySpeed}`
    : `先攻 カイザー ${enemySpeed} → いれーな ${playerSpeed}`;

  const cpuBuffBonus = state.enemy.isBuffed ? (state.enemy.buffDamageBonus || 125) : 0;
  const cpuNormalBase = Math.max(15, getEffectiveAttack(state.enemy) - getEffectiveDefense(state.player)) + cpuBuffBonus;
  const cpuNormalCrit = Math.round(cpuNormalBase * 1.5);
  const evadeRate = Math.round(state.player.character.evasionRate * 100);
  const cpuEvadeRate = Math.round(state.enemy.character.evasionRate * 100);

  let impact = '';
  let risk = '';
  let survival = '';
  let detail = '';

  switch (state.cpuIntent) {
    case 'ATTACK':
      impact = `約${cpuNormalBase}〜${cpuNormalCrit} DMG`;
      risk = `回避選択：${evadeRate}%`;
      survival = `被弾後HP：約${Math.max(0, state.player.currentHp - cpuNormalCrit)}〜${Math.max(0, state.player.currentHp - cpuNormalBase)}`;
      detail = '通常攻撃。会心20%で上限側のダメージになり、回避時は成功判定があります。';
      break;
    case 'SPECIAL':
      impact = `${state.enemy.character.specialSkillDamage + cpuBuffBonus} DMG`;
      risk = `回避選択：${evadeRate}%`;
      survival = `被弾後HP：${Math.max(0, state.player.currentHp - (state.enemy.character.specialSkillDamage + cpuBuffBonus))}${state.player.currentHp <= state.enemy.character.specialSkillDamage + cpuBuffBonus ? '（戦闘不能）' : ''}`;
      detail = `特殊技。命中すると${state.enemy.character.id === 'kaiser' ? '重圧' : '出血'}が付与されます。`;
      break;
    case 'ULTIMATE':
      impact = `${state.enemy.character.ultimateSkillDamage + cpuBuffBonus} DMG`;
      risk = `回避選択：${evadeRate}%`;
      survival = `被弾後HP：${Math.max(0, state.player.currentHp - (state.enemy.character.ultimateSkillDamage + cpuBuffBonus))}${state.player.currentHp <= state.enemy.character.ultimateSkillDamage + cpuBuffBonus ? '（戦闘不能）' : ''}`;
      detail = '必殺技。大きな固定ダメージを受ける可能性があります。';
      break;
    case 'BUFF':
      impact = 'このターン 0 DMG';
      risk = '次回攻撃 +125';
      survival = `現在HP：${state.player.currentHp}`;
      detail = '強化行動。今ターンに攻めるか、次ターンの大きな反撃を警戒する場面です。';
      break;
    case 'EVADE':
      impact = '直接ダメージ 0';
      risk = `攻撃命中率：${100 - cpuEvadeRate}%`;
      survival = `現在HP：${state.player.currentHp}`;
      detail = '回避構え。攻撃系は回避判定を受けますが、行動そのものは失われません。';
      break;
  }

  const cellPadding = compact ? '4px 6px' : '5px 8px';
  const labelSize = compact ? '7px' : '8px';
  const valueSize = compact ? '9px' : '10px';

  return (
    <div
      aria-label="戦況予測"
      style={{
        marginTop: compact ? '4px' : '6px',
        padding: compact ? '6px 8px' : '7px 9px',
        borderRadius: '9px',
        border: '1px solid rgba(144, 202, 249, 0.25)',
        background: 'linear-gradient(180deg, rgba(10, 16, 28, 0.92), rgba(8, 12, 20, 0.82))',
        boxShadow: 'inset 0 0 18px rgba(100, 181, 246, 0.06)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
        <span style={{ fontSize: labelSize, fontWeight: 950, letterSpacing: '0.14em', color: '#90CAF9' }}>
          戦況予測
        </span>
        <span style={{ fontSize: labelSize, fontWeight: 850, color: '#B7C2D3', whiteSpace: 'nowrap' }}>
          予兆はこのターンに実行
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '4px' }}>
        <div style={{ padding: cellPadding, borderRadius: '7px', background: 'rgba(255,255,255,0.035)' }}>
          <div style={{ fontSize: labelSize, fontWeight: 800, color: '#7F8EA6' }}>行動順</div>
          <div style={{ marginTop: '2px', fontSize: valueSize, fontWeight: 950, color: playerGoesFirst ? '#B3E5FC' : '#FFCC80', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {orderText}
          </div>
        </div>
        <div style={{ padding: cellPadding, borderRadius: '7px', background: 'rgba(255,255,255,0.035)' }}>
          <div style={{ fontSize: labelSize, fontWeight: 800, color: '#7F8EA6' }}>相手の影響</div>
          <div style={{ marginTop: '2px', fontSize: valueSize, fontWeight: 950, color: CPU_INTENT_META[state.cpuIntent].accent, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {impact}
          </div>
        </div>
        <div style={{ padding: cellPadding, borderRadius: '7px', background: 'rgba(255,255,255,0.035)' }}>
          <div style={{ fontSize: labelSize, fontWeight: 800, color: '#7F8EA6' }}>回避・耐久</div>
          <div style={{ marginTop: '2px', fontSize: valueSize, fontWeight: 950, color: '#D5DEEB', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {risk}
          </div>
          <div style={{ marginTop: '2px', fontSize: labelSize, fontWeight: 800, color: '#98A6BC', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {survival}
          </div>
        </div>
      </div>

      <div style={{ marginTop: '4px', fontSize: labelSize, lineHeight: 1.45, fontWeight: 750, color: '#AEB9CB' }}>
        {detail}
      </div>
    </div>
  );
};

export const BattleScreen: React.FC<BattleScreenProps> = ({
  state,
  onAction,
  onBackToSelect,
  onRestart,
  skillProgress,
  onUpgradeSkill,
  onChooseSkillPath,
  onToggleSound,
  onToggleSpeed,
}) => {
  const [isWide, setIsWide] = useState(window.innerWidth >= 680);
  const [screenShake, setScreenShake] = useState(false);
  const [irenaUltimateUses, setIrenaUltimateUses] = useState({
    allGods: 0,
    ruin: 0,
  });

  const handleIrenaUltimateAction = (variant: 'ALL_GODS' | 'RUIN') => {
    if (
      !isActionEnabled ||
      state.player.ultimateGauge < 3
    ) {
      return;
    }

    setIrenaUltimateUses(prev => {
      if (variant === 'ALL_GODS') {
        if (prev.allGods >= 1) return prev;
        return { ...prev, allGods: 1 };
      }

      if (prev.ruin >= 1) return prev;
      return { ...prev, ruin: 1 };
    });

    onAction('ULTIMATE', variant);
  };

  const handleRestart = () => {
    setIrenaUltimateUses({ allGods: 0, ruin: 0 });
    onRestart();
  };

  useEffect(() => {
    const handleResize = () => setIsWide(window.innerWidth >= 680);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Screen shake on impactful damage
  useEffect(() => {
    if (state.visualEffect && state.visualEffect.damage > 0) {
      setScreenShake(true);
      const timer = setTimeout(() => setScreenShake(false), state.visualEffect.isUltimate ? 400 : 250);
      return () => clearTimeout(timer);
    }
  }, [state.visualEffect?.effectId]);

  // Keyboard shortcut listener for PC players
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isEnabled = state.phase === 'SELECT_ACTION';
      if (e.key === '1') {
        if (isEnabled) onAction('ATTACK');
      } else if (e.key === '2') {
        if (isEnabled) onAction('EVADE');
      } else if (e.key === '4') {
        if (isEnabled && state.player.specialCooldownRemaining <= 0) onAction('SPECIAL');
      } else if (e.key === '5') {
        if (isEnabled && state.player.ultimateGauge >= 3) {
          {
            if (irenaUltimateUses.allGods === 0) {
              handleIrenaUltimateAction('ALL_GODS');
            } else if (irenaUltimateUses.ruin === 0) {
              handleIrenaUltimateAction('RUIN');
            } else {
              onAction('ULTIMATE', 'OMNIPOTENCE');
            }
          }
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (state.phase === 'BATTLE_FINISHED') {
          handleRestart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    state.phase,
    state.player.specialCooldownRemaining,
    state.player.ultimateGauge,
    state.player.character.id,
    irenaUltimateUses,
    onAction,
  ]);

  const isActionEnabled = state.phase === 'SELECT_ACTION' && !state.player.isSuperFallenShotCharging;
  const cpuIntentMeta = CPU_INTENT_META[state.cpuIntent];

  useEffect(() => {
    if (state.phase !== 'SELECT_ACTION' || !state.player.isSuperFallenShotCharging) return;

    const timer = window.setTimeout(() => {
      onAction('SPECIAL', undefined, 'SUPER_FALLEN_SHOT');
    }, 480);

    return () => window.clearTimeout(timer);
  }, [state.phase, state.player.isSuperFallenShotCharging, onAction]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0A0D16',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Background Image & Vignette */}
      <img
        src={battleBackground}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(10, 13, 22, 0.58) 0%, rgba(13, 16, 28, 0.38) 50%, rgba(10, 13, 22, 0.62) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          zIndex: 5,
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(10, 13, 22, 0.65)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <button
            onClick={onBackToSelect}
            title="戻る"
            style={{
              background: 'none',
              border: 'none',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <div
            style={{
              backgroundColor: '#1E283D',
              border: '1px solid #334568',
              borderRadius: '8px',
              padding: '4px 10px',
              fontSize: '13px',
              fontWeight: 800,
              color: '#FFD54F',
            }}
          >
            第 {state.turnNumber} ターン
          </div>
          <div style={{
            display:'flex',
            flexDirection:'column',
            gap:'2px',
            minWidth:0,
          }}>
            <div style={{ fontSize:'9px', color:'#FFCC80', fontWeight:900, letterSpacing:'.08em' }}>
              KAISER Lv.{state.battleConfig.kaiserLevel}
            </div>
            <div style={{
              maxWidth:'42vw',
              overflow:'hidden',
              textOverflow:'ellipsis',
              whiteSpace:'nowrap',
              fontSize:'8px',
              color:'#B39DDB',
              fontWeight:800,
            }}>
              {state.battleConfig.abilities.length > 0
                ? state.battleConfig.abilities.map(ability => ability.id === 'ABYSS' ? '深淵' : ability.id === 'FALLEN' ? '堕天' : ability.id === 'BLACK_WING' ? '黒翼' : ability.id === 'FALLEN_KING' ? '堕天王' : '断罪').join(' + ')
                : '権能なし'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            style={{
              backgroundColor: state.isSoundEnabled ? '#162E4A' : '#212530',
              border: `1px solid ${state.isSoundEnabled ? '#42A5F5' : '#455A64'}`,
              borderRadius: '8px',
              padding: '4px 8px',
              color: state.isSoundEnabled ? '#FFFFFF' : '#9E9E9E',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {state.isSoundEnabled ? <Volume2 size={14} color="#90CAF9" /> : <VolumeX size={14} color="#78909C" />}
            <span>{state.isSoundEnabled ? '音ON' : '音OFF'}</span>
          </button>

          {/* Speed Multiplier Toggle */}
          <button
            onClick={onToggleSpeed}
            style={{
              backgroundColor: state.battleSpeedMultiplier > 1 ? '#311B92' : '#1F2937',
              border: `1px solid ${state.battleSpeedMultiplier > 1 ? '#7C4DFF' : '#374151'}`,
              borderRadius: '8px',
              padding: '4px 8px',
              color: state.battleSpeedMultiplier > 1 ? '#FFFFFF' : '#D1D5DB',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            <FastForward size={14} color={state.battleSpeedMultiplier > 1 ? '#B388FF' : '#9CA3AF'} />
            <span>{state.battleSpeedMultiplier > 1 ? '2x' : '1x'}</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes normalHitFlash {
          0% { opacity: 0; transform: scale(0.92); }
          35% { opacity: 0.78; transform: scale(1.02); }
          100% { opacity: 0; transform: scale(1.08); }
        }
      `}</style>

      {/* Main Arena Container with Screen Shake */}
      {state.visualEffect?.effectType === 'NORMAL_HIT' && state.visualEffect.damage > 0 && (
        <div
          key={state.visualEffect.effectId}
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 6,
            pointerEvents: 'none',
            background: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.22) 28%, rgba(255,255,255,0) 68%)',
            mixBlendMode: 'screen',
            animation: 'normalHitFlash 180ms ease-out forwards',
          }}
        />
      )}

      <div
        style={{
          flex: 1,
          position: 'relative',
          padding: '8px 12px 10px 12px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          zIndex: 5,
          transform: screenShake ? 'translateX(-4px)' : 'none',
          transition: 'transform 0.05s ease',
        }}
      >
        {!isWide ? (
          /* Mobile Layout (Vertical stack) */
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              maxWidth: '520px',
              width: '100%',
              margin: '0 auto',
              overflow: 'hidden',
            }}
          >
            {/* 1. Enemy Card */}
            <FighterCard
              fighter={state.enemy}
              isTargetOfEffect={state.visualEffect?.targetIsPlayer === false}
              visualEffect={state.visualEffect}
            />

            {isActionEnabled && (
              <div
                aria-live="polite"
                style={{
                  marginTop: '5px',
                  padding: '7px 10px',
                  borderRadius: '9px',
                  border: `1px solid ${CPU_INTENT_META[state.cpuIntent].accent}55`,
                  background: 'rgba(8, 12, 20, 0.78)',
                  boxShadow: `inset 0 0 16px ${CPU_INTENT_META[state.cpuIntent].accent}12`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                }}
              >
                <div style={{ minWidth: 0, flex: '0 0 auto' }}>
                  <div style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.14em', color: '#9FB0C8' }}>
                    CPU 予兆
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '13px', fontWeight: 950, color: '#FFFFFF' }}>
                      {cpuIntentMeta.label}
                    </span>
                    <span style={{
                      fontSize: '8px',
                      fontWeight: 900,
                      color: cpuIntentMeta.accent,
                      border: `1px solid ${CPU_INTENT_META[state.cpuIntent].accent}55`,
                      borderRadius: '999px',
                      padding: '2px 5px',
                    }}>
                      {cpuIntentMeta.alert}
                    </span>
                  </div>
                </div>
                <div style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: '9px',
                  fontWeight: 700,
                  color: '#B7C2D3',
                  textAlign: 'right',
                  lineHeight: 1.45,
                }}>
                  <div>{cpuIntentMeta.description}</div>
                  <div style={{ marginTop: '2px', color: '#D5DEEB', fontWeight: 800 }}>
                    {cpuIntentMeta.counterplay}
                  </div>
                </div>
              </div>
            )}

            <TacticalForecast state={state} compact />

            {/* 2. Clash Area / Banner */}
            <div
              style={{
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '4px 0',
              }}
            >
              {state.visualEffect && (
                <div
                  style={{
                    backgroundColor: state.visualEffect.isUltimate
                      ? '#FF3D00'
                      : state.visualEffect.isCritical
                      ? '#FF6F00'
                      : state.visualEffect.isEvade
                      ? '#00B0FF'
                      : state.visualEffect.isBuff
                      ? '#FF8F00'
                      : '#1E293B',
                    border: '1.5px solid #FFD54F',
                    borderRadius: '12px',
                    padding: '4px 14px',
                    fontSize: '12px',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                  }}
                >
                  {state.visualEffect.bannerText}
                </div>
              )}
            </div>

            {/* 4. Player Card */}
            <div style={{ marginBottom: '8px' }}>
              <FighterCard
                fighter={state.player}
                isTargetOfEffect={state.visualEffect?.targetIsPlayer === true}
                visualEffect={state.visualEffect}
              />
            </div>

            {/* 5. Action Command Dock */}
            <ActionDock
              player={state.player}
              enemy={state.enemy}
              isEnabled={isActionEnabled}
              onAction={onAction}
              irenaUltimateUses={irenaUltimateUses}
              onIrenaUltimateAction={handleIrenaUltimateAction}
            />
          </div>
        ) : (
          <>
          {/* Desktop / Wide Dual Pane Layout */}
          <div
            style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              maxWidth: '960px',
              width: '100%',
              margin: '0 auto',
              overflow: 'hidden',
            }}
          >
            {/* Left Pane: Player Card + Action Dock */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 800, color: '#90CAF9', marginBottom: '6px' }}>
                  👤 プレイヤー陣営
                </div>
                <FighterCard
                  fighter={state.player}
                  isTargetOfEffect={state.visualEffect?.targetIsPlayer === true}
                  visualEffect={state.visualEffect}
                />

              </div>

            </div>

            {/* Right Pane: Enemy Card + Clash Banner + Battle Background */}
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#FFCC80', marginBottom: '6px' }}>
                🤖 CPU 対戦相手 ({state.cpuDifficulty === 'EXPERT' ? 'エキスパート' : 'ノーマル'})
              </div>
              <FighterCard
                fighter={state.enemy}
                isTargetOfEffect={state.visualEffect?.targetIsPlayer === false}
                visualEffect={state.visualEffect}
              />

              {isActionEnabled && (
                <div
                  aria-live="polite"
                  style={{
                    marginTop: '6px',
                    padding: '8px 10px',
                    borderRadius: '10px',
                    border: `1px solid ${CPU_INTENT_META[state.cpuIntent].accent}55`,
                    background: 'rgba(8, 12, 20, 0.78)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.14em', color: '#9FB0C8' }}>
                      CPU 予兆
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '2px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 950, color: cpuIntentMeta.accent }}>
                        {cpuIntentMeta.label}
                      </span>
                      <span style={{
                        fontSize: '8px',
                        fontWeight: 900,
                        color: cpuIntentMeta.accent,
                        border: `1px solid ${CPU_INTENT_META[state.cpuIntent].accent}55`,
                        borderRadius: '999px',
                        padding: '2px 6px',
                      }}>
                        {cpuIntentMeta.alert}
                      </span>
                    </div>
                  </div>
                  <div style={{
                    maxWidth: '52%',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#B7C2D3',
                    textAlign: 'right',
                    lineHeight: 1.5,
                  }}>
                    <div>{cpuIntentMeta.description}</div>
                    <div style={{ marginTop: '2px', color: '#D5DEEB', fontWeight: 800 }}>
                      {cpuIntentMeta.counterplay}
                    </div>
                  </div>
                </div>
              )}

              <TacticalForecast state={state} />

              <div
                style={{
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '8px 0',
                }}
              >
                {state.visualEffect && (
                  <div
                    style={{
                      backgroundColor: state.visualEffect.isUltimate
                        ? '#FF3D00'
                        : state.visualEffect.isCritical
                        ? '#FF6F00'
                        : state.visualEffect.isEvade
                        ? '#00B0FF'
                        : state.visualEffect.isBuff
                        ? '#FF8F00'
                        : '#1E293B',
                      border: '1.5px solid #FFD54F',
                      borderRadius: '12px',
                      padding: '4px 14px',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: '#FFFFFF',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    }}
                  >
                    {state.visualEffect.bannerText}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Full-width Command Dock */}
          <div
            style={{
              width: '100%',
              marginTop: '10px',
            }}
          >
            <ActionDock
              player={state.player}
              enemy={state.enemy}
              isEnabled={isActionEnabled}
              onAction={onAction}
              irenaUltimateUses={irenaUltimateUses}
              onIrenaUltimateAction={handleIrenaUltimateAction}
            />
          </div>
          </>
        )}

        {/* Visual FX Overlay */}
        <VisualEffectOverlay effect={state.visualEffect} speedMultiplier={state.battleSpeedMultiplier} />
      </div>

      {/* Battle Finished Result Dialog */}
      {state.phase === 'BATTLE_FINISHED' && state.winnerIsPlayer !== null && (
        <BattleResultModal
          state={state}
          onRematch={handleRestart}
          onBackToSelect={onBackToSelect}
          skillProgress={skillProgress}
          onUpgradeSkill={onUpgradeSkill}
          onChooseSkillPath={onChooseSkillPath}
        />
      )}
    </div>
  );
};
