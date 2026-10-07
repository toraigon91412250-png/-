import React, { useEffect, useState } from 'react';
import { BattleAction, BattleUiState, IrenaSkillId, IrenaSkillProgress, FeatherSkillPath, RuinSkillPath, IrenaSpecialSkillId, getEffectiveSpeed } from '../types/game';
import { FighterCard } from './FighterCard';
import { ActionDock } from './ActionDock';
import { VisualEffectOverlay } from './VisualEffectOverlay';
import { BattleResultModal } from './BattleResultModal';
import { applyDynamicAbilityModifiers } from '../utils/abilitySystem';
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
  hint: string;
  accent: string;
}> = {
  ATTACK: {
    label: '通常攻撃',
    hint: '攻撃を仕掛けている',
    accent: '#64B5F6',
  },
  EVADE: {
    label: '回避',
    hint: '攻撃系は回避判定を受ける',
    accent: '#4DD0E1',
  },
  BUFF: {
    label: '強化',
    hint: '次の攻撃が強化される',
    accent: '#FFD54F',
  },
  SPECIAL: {
    label: '特殊技',
    hint: '命中すると状態異常が付く',
    accent: '#CE93D8',
  },
  ULTIMATE: {
    label: '必殺技',
    hint: '大ダメージ。回避で対処可能',
    accent: '#FF8A65',
  },
};

const TacticalForecast: React.FC<{ state: BattleUiState; compact?: boolean }> = ({ state, compact = false }) => {
  if (state.phase !== 'SELECT_ACTION') return null;

  const forecastPlayer = applyDynamicAbilityModifiers(state.player, state.battleConfig, state.turnNumber);
  const forecastEnemy = applyDynamicAbilityModifiers(state.enemy, state.battleConfig, state.turnNumber);
  const playerGoesFirst = getEffectiveSpeed(forecastPlayer) >= getEffectiveSpeed(forecastEnemy);
  const intentMeta = CPU_INTENT_META[state.cpuIntent];

  const evasionInfo =
    state.cpuIntent === 'EVADE'
      ? '相手回避 ' + Math.round(state.enemy.character.evasionRate * 100) + '%'
      : state.cpuIntent === 'BUFF'
        ? null
        : '自分回避 ' + Math.round(state.player.character.evasionRate * 100) + '%';

  const cellPadding = compact ? '5px 7px' : '6px 9px';
  const labelSize = compact ? '7px' : '8px';
  const valueSize = compact ? '12px' : '14px';

  return (
    <div
      aria-label="戦況予測"
      aria-live="polite"
      style={{
        marginTop: compact ? '4px' : '6px',
        padding: compact ? '6px 8px' : '7px 10px',
        borderRadius: '9px',
        border: '1px solid ' + intentMeta.accent + '55',
        background: 'linear-gradient(180deg, rgba(10, 16, 28, 0.92), rgba(8, 12, 20, 0.82))',
        boxShadow: 'inset 0 0 18px ' + intentMeta.accent + '0A',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: labelSize, fontWeight: 900, letterSpacing: '0.12em', color: '#9FB0C8' }}>
            戦況予測
          </span>
          <span style={{ fontSize: valueSize, fontWeight: 950, color: intentMeta.accent }}>
            {intentMeta.label}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: labelSize, fontWeight: 800, color: '#7F8EA6', whiteSpace: 'nowrap' }}>
            行動順
          </span>

          {[playerGoesFirst, !playerGoesFirst].map((playerFirst, index) => (
            <React.Fragment key={playerFirst ? 'player' : 'enemy'}>
              {index > 0 && (
                <span aria-hidden="true" style={{ fontSize: labelSize, fontWeight: 900, color: '#6F7E95' }}>
                  →
                </span>
              )}
              <div
                style={{
                  padding: cellPadding,
                  borderRadius: '7px',
                  background: playerFirst ? 'rgba(144, 202, 249, 0.13)' : 'rgba(255,255,255,0.045)',
                  border: playerFirst ? '1px solid rgba(144, 202, 249, 0.38)' : '1px solid rgba(255,255,255,0.08)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: labelSize, fontWeight: 950, color: playerFirst ? '#B3E5FC' : '#D5DEEB' }}>
                  {index + 1} {playerFirst ? 'いれーな' : 'カイザー'}
                </span>
              </div>
            </React.Fragment>
          ))}

          {evasionInfo && (
            <div
              style={{
                padding: cellPadding,
                borderRadius: '7px',
                background: 'rgba(255,255,255,0.045)',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: labelSize, fontWeight: 800, color: '#7F8EA6' }}>回避 </span>
              <span style={{ fontSize: labelSize, fontWeight: 950, color: '#D5DEEB' }}>
                {evasionInfo}
              </span>
            </div>
          )}
        </div>
      </div>

      <div style={{ marginTop: '4px', fontSize: labelSize, lineHeight: 1.35, fontWeight: 750, color: '#AEB9CB' }}>
        {intentMeta.hint}
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
  const [selectedSpecialSkill, setSelectedSpecialSkill] = useState<IrenaSpecialSkillId>('FEATHER');
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
        if (isEnabled && state.player.specialCooldownRemaining <= 0) {
          onAction('SPECIAL', undefined, selectedSpecialSkill);
        }
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
    selectedSpecialSkill,
    onAction,
  ]);

  const isActionEnabled = state.phase === 'SELECT_ACTION' && !state.player.isSuperFallenShotCharging;

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
              overflowY: 'auto',
              minHeight: 0,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {/* 1. Enemy Card */}
            <FighterCard
              fighter={state.enemy}
              battleConfig={state.battleConfig}
              turnNumber={state.turnNumber}
              isTargetOfEffect={state.visualEffect?.targetIsPlayer === false}
              visualEffect={state.visualEffect}
            />

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
                battleConfig={state.battleConfig}
                turnNumber={state.turnNumber}
                isTargetOfEffect={state.visualEffect?.targetIsPlayer === true}
                visualEffect={state.visualEffect}
              />
            </div>

            {/* 5. Action Command Dock */}
            <ActionDock
              player={state.player}
              enemy={state.enemy}
              battleConfig={state.battleConfig}
              turnNumber={state.turnNumber}
              judgmentReady={state.judgmentReady}
              isEnabled={isActionEnabled}
              selectedSpecialSkill={selectedSpecialSkill}
              onSelectedSpecialSkillChange={setSelectedSpecialSkill}
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
                battleConfig={state.battleConfig}
                turnNumber={state.turnNumber}
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
              battleConfig={state.battleConfig}
              turnNumber={state.turnNumber}
                isTargetOfEffect={state.visualEffect?.targetIsPlayer === false}
                visualEffect={state.visualEffect}
              />

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
              battleConfig={state.battleConfig}
              turnNumber={state.turnNumber}
              judgmentReady={state.judgmentReady}
              isEnabled={isActionEnabled}
              selectedSpecialSkill={selectedSpecialSkill}
              onSelectedSpecialSkillChange={setSelectedSpecialSkill}
              onAction={onAction}
              irenaUltimateUses={irenaUltimateUses}
              onIrenaUltimateAction={handleIrenaUltimateAction}
            />
          </div>
          </>
        )}

        {/* Visual FX Overlay */}
        <VisualEffectOverlay effects={state.visualEffects} speedMultiplier={state.battleSpeedMultiplier} />
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
