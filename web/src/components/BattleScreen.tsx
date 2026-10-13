import React, { useEffect, useState } from 'react';
import { BattleUiState, IrenaSkillId, IrenaSkillProgress, FeatherSkillPath, RuinSkillPath, IrenaSpecialSkillId, PlayerBattleAction } from '../types/game';
import { FighterCard } from './FighterCard';
import { ActionDock } from './ActionDock';
import { VisualEffectOverlay } from './VisualEffectOverlay';
import { BattleResultModal } from './BattleResultModal';
import battleBackground from '../assets/戦闘中背景.png';
import { ArrowLeft, Volume2, VolumeX, FastForward } from 'lucide-react';

interface BattleScreenProps {
  state: BattleUiState;
  onAction: (
    action: PlayerBattleAction,
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
  // Short landscape viewports are phones, not the desktop two-column layout.
  const [isWide, setIsWide] = useState(window.innerWidth >= 680 && window.innerHeight >= 600);
  const [screenShake, setScreenShake] = useState(false);
  const [isUltimateCinematicActive, setIsUltimateCinematicActive] = useState(false);
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
    const handleResize = () => setIsWide(window.innerWidth >= 680 && window.innerHeight >= 600);
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
      const isEnabled = state.phase === 'SELECT_ACTION' && !isUltimateCinematicActive;
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
          if (state.player.character.id !== 'irena') {
            onAction('ULTIMATE');
          } else if (irenaUltimateUses.allGods === 0) {
            handleIrenaUltimateAction('ALL_GODS');
          } else if (irenaUltimateUses.ruin === 0) {
            handleIrenaUltimateAction('RUIN');
          } else {
            onAction('ULTIMATE', 'OMNIPOTENCE');
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
    isUltimateCinematicActive,
    state.player.specialCooldownRemaining,
    state.player.ultimateGauge,
    state.player.character.id,
    irenaUltimateUses,
    selectedSpecialSkill,
    onAction,
  ]);

  const isActionEnabled = state.phase === 'SELECT_ACTION' && !state.player.isSuperFallenShotCharging;

  // Keep the latest dispatcher without restarting the charge-release timer on callback identity changes.
  const onActionRef = React.useRef(onAction);
  onActionRef.current = onAction;

  useEffect(() => {
    if (state.phase !== 'SELECT_ACTION' || !state.player.isSuperFallenShotCharging) return;

    const timer = window.setTimeout(() => {
      onActionRef.current('SPECIAL', undefined, 'SUPER_FALLEN_SHOT');
    }, 480);

    return () => window.clearTimeout(timer);
  }, [state.phase, state.player.isSuperFallenShotCharging, state.turnNumber]);

  return (
    <div
      className="battle-screen-root"
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
          <span style={{ fontSize: '11px', color: '#B39DDB', fontWeight: 850, whiteSpace: 'nowrap' }}>
            Lv.{state.battleConfig.kaiserLevel}
          </span>
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
        className="battle-arena-container"
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
            className="battle-mobile-layout"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              maxWidth: '520px',
              width: '100%',
              margin: '0 auto',
              overflow: 'hidden',
              minHeight: 0,
            }}
          >
            <div className="battle-mobile-scroll">
            {/* 1. Enemy Card */}
            <FighterCard
              fighter={state.enemy}
              isTargetOfEffect={state.visualEffect?.targetIsPlayer === false}
              visualEffect={state.visualEffect}
            />

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

            </div>

            {/* 5. Action Command Dock */}
            <div className="battle-mobile-action-area">
            <ActionDock
              player={state.player}
              battleConfig={state.battleConfig}
              turnNumber={state.turnNumber}
              isEnabled={isActionEnabled && !isUltimateCinematicActive}
              onCinematicActiveChange={setIsUltimateCinematicActive}
              selectedSpecialSkill={selectedSpecialSkill}
              onSelectedSpecialSkillChange={setSelectedSpecialSkill}
              onAction={onAction}
              irenaUltimateUses={irenaUltimateUses}
              onIrenaUltimateAction={handleIrenaUltimateAction}
            />
            </div>
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
                  プレイヤー
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
                対戦相手
              </div>
              <FighterCard
                fighter={state.enemy}
                isTargetOfEffect={state.visualEffect?.targetIsPlayer === false}
                visualEffect={state.visualEffect}
              />

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
              battleConfig={state.battleConfig}
              turnNumber={state.turnNumber}
              isEnabled={isActionEnabled && !isUltimateCinematicActive}
              onCinematicActiveChange={setIsUltimateCinematicActive}
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
