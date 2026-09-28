import React from 'react';
import { BattleFighter, getEffectiveSpeed, VisualEffect, STATUS_AILMENTS } from '../types/game';
import { HpBar } from './HpBar';
import { Zap, Sparkles, Activity, Flame, Hourglass } from 'lucide-react';

interface FighterCardProps {
  fighter: BattleFighter;
  isTargetOfEffect: boolean;
  visualEffect: VisualEffect | null;
}

export const FighterCard: React.FC<FighterCardProps> = ({
  fighter,
  isTargetOfEffect,
  visualEffect,
}) => {
  const isHit = isTargetOfEffect && visualEffect !== null && visualEffect.damage > 0;
  const effectiveSpeed = getEffectiveSpeed(fighter);

  let borderStyle = `1px solid ${fighter.character.primaryColor}CC`;
  if (fighter.isBuffed) {
    borderStyle = '2px solid #FFB300';
  } else if (fighter.isEvading) {
    borderStyle = '2px solid #00E5FF';
  }

  return (
    <div
      style={{
        backgroundColor: '#131724',
        borderRadius: '14px',
        border: borderStyle,
        padding: '10px',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        animation: isHit ? 'cardHitShake 0.3s ease-in-out' : undefined,
        transition: 'border 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Avatar with Status Overlay */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '12px',
            border: `2px solid ${fighter.character.primaryColor}`,
            overflow: 'hidden',
            position: 'relative',
            flexShrink: 0,
            backgroundColor: '#0a0d16',
          }}
        >
          <img
            src={fighter.character.imageSrc}
            alt={fighter.character.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />

          {/* Buff Aura Badge */}
          {fighter.isBuffed && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(255, 179, 0, 0.35)',
                display: 'flex',
                justifyContent: 'flex-end',
                padding: '3px',
              }}
            >
              <div
                style={{
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  backgroundColor: '#FF8F00',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 6px #FFD54F',
                }}
              >
                <Sparkles size={11} color="#FFFFFF" />
              </div>
            </div>
          )}

          {/* Evading Stance Badge */}
          {fighter.isEvading && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 176, 255, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Activity size={32} color="#E0F7FA" style={{ filter: 'drop-shadow(0 0 4px #00E5FF)' }} />
            </div>
          )}
        </div>

        {/* Stats & HP Bar */}
        <div style={{ marginLeft: '10px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
                {fighter.character.name}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  backgroundColor: fighter.isPlayer ? '#1E3A8A' : '#881337',
                  padding: '2px 5px',
                  borderRadius: '4px',
                  letterSpacing: '0.5px',
                }}
              >
                {fighter.isPlayer ? 'PLAYER' : 'CPU'}
              </span>
            </div>

            {/* Speed & Evade Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: '#1E2836',
                  border: '1px solid #334568',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: effectiveSpeed < fighter.character.speed ? '#FF8A80' : '#E0F7FA',
                }}
              >
                <Zap size={12} color="#4FC3F7" />
                <span>{effectiveSpeed}</span>
              </div>

              <div
                style={{
                  backgroundColor: '#103630',
                  border: '1px solid #00BFA5',
                  borderRadius: '6px',
                  padding: '2px 6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#64FFDA',
                }}
              >
                回避{Math.round(fighter.character.evasionRate * 100)}%
              </div>
            </div>
          </div>

          <div style={{ marginTop: '5px' }}>
            <HpBar currentHp={fighter.currentHp} maxHp={fighter.character.maxHp} />
          </div>
        </div>
      </div>

      {/* Middle status row: Buff and Ailments */}
      {(fighter.isBuffed || fighter.activeAilments.length > 0) && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
          {fighter.isBuffed && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'rgba(230, 81, 0, 0.4)',
                border: '1px solid #FFB300',
                borderRadius: '5px',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: 700,
                color: '#FFE082',
              }}
            >
              <Sparkles size={11} color="#FFD54F" />
              <span>強化中(+50)</span>
            </div>
          )}

          {fighter.activeAilments.map(ailment => {
            const def = STATUS_AILMENTS[ailment.type];
            const isBleed = ailment.type === 'BLEED';
            return (
              <div
                key={ailment.type}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: isBleed ? 'rgba(183, 28, 28, 0.4)' : 'rgba(74, 20, 140, 0.4)',
                  border: `1px solid ${isBleed ? '#EF5350' : '#AB47BC'}`,
                  borderRadius: '5px',
                  padding: '2px 6px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: isBleed ? '#FFCDD2' : '#F3E5F5',
                }}
              >
                <span>{def.displayName}({ailment.remainingTurns}T)</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom info row: Passive + Skill CD + Ultimate Gauge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '6px',
          gap: '4px',
        }}
      >
        {/* Passive badge */}
        <div
          style={{
            backgroundColor: '#261D33',
            border: '1px solid rgba(126, 87, 194, 0.6)',
            borderRadius: '5px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 600,
            color: '#D1C4E9',
            whiteSpace: 'nowrap',
          }}
          title={fighter.character.passiveDescription}
        >
          固有: {fighter.character.passiveName}
        </div>

        {/* Special Cooldown */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            backgroundColor: fighter.specialCooldownRemaining <= 0 ? 'rgba(171, 71, 188, 0.3)' : '#232936',
            border: `1px solid ${fighter.specialCooldownRemaining <= 0 ? '#AB47BC' : '#475569'}`,
            borderRadius: '5px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 700,
            color: fighter.specialCooldownRemaining <= 0 ? '#EA80FC' : '#CBD5E1',
            whiteSpace: 'nowrap',
          }}
        >
          {fighter.specialCooldownRemaining <= 0 ? <Zap size={11} color="#E040FB" /> : <Hourglass size={11} color="#94A3B8" />}
          <span>{fighter.specialCooldownRemaining <= 0 ? '技:READY' : `技:CD${fighter.specialCooldownRemaining}T`}</span>
        </div>

        {/* Ultimate Gauge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '3px',
            backgroundColor: fighter.ultimateGauge >= 3 ? 'rgba(255, 111, 0, 0.4)' : '#1E2433',
            border: `1px solid ${fighter.ultimateGauge >= 3 ? '#FFD54F' : '#475569'}`,
            borderRadius: '5px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 800,
            color: fighter.ultimateGauge >= 3 ? '#FFE082' : '#CBD5E1',
            whiteSpace: 'nowrap',
          }}
        >
          <Flame size={12} color={fighter.ultimateGauge >= 3 ? '#FFD54F' : '#94A3B8'} />
          <span>{fighter.ultimateGauge >= 3 ? '必殺:3/3 MAX!' : `必殺:${fighter.ultimateGauge}/3`}</span>
        </div>
      </div>
    </div>
  );
};
