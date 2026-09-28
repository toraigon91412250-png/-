import React from 'react';
import { BattleAction, BattleFighter, getEffectiveAttack, getEffectiveDefense } from '../types/game';
import { Flame } from 'lucide-react';

interface ActionDockProps {
  player: BattleFighter;
  enemy: BattleFighter;
  isEnabled: boolean;
  onAction: (action: BattleAction) => void;
}

export const ActionDock: React.FC<ActionDockProps> = ({
  player,
  enemy,
  isEnabled,
  onAction,
}) => {
  const estimatedAttackDamage = Math.max(15, getEffectiveAttack(player) - getEffectiveDefense(enemy)) + (player.isBuffed ? 50 : 0);
  const isSpecialReady = player.specialCooldownRemaining <= 0;
  const isUltimateReady = player.ultimateGauge >= 3;
  const specialDamagePreview = player.character.specialSkillDamage + (player.isBuffed ? 50 : 0);
  const ultimateDamagePreview = player.character.ultimateSkillDamage + (player.isBuffed ? 50 : 0);
  const evadeRateText = `${Math.round(player.character.evasionRate * 100)}%`;

  return (
    <div
      style={{
        backgroundColor: '#0F121C',
        borderTopLeftRadius: '16px',
        borderTopRightRadius: '16px',
        border: '1px solid #2C354D',
        padding: '8px',
        boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header: Command title + Buff indicator + Ultimate gauge preview */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
            🎯 コマンド選択
          </span>
          {player.isBuffed && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#FFD54F',
                backgroundColor: 'rgba(255, 143, 0, 0.3)',
                border: '1px solid #FFB300',
                padding: '1px 5px',
                borderRadius: '4px',
              }}
            >
              ⚡【強化中】攻撃+50
            </span>
          )}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '11px',
            backgroundColor: isUltimateReady ? 'rgba(255, 111, 0, 0.4)' : '#1E2332',
            border: `1px solid ${isUltimateReady ? '#FFD54F' : '#3E4C66'}`,
            borderRadius: '6px',
            padding: '2px 6px',
          }}
        >
          <span style={{ color: '#B0BEC5' }}>必殺技ゲージ:&nbsp;</span>
          <span style={{ fontWeight: 800, color: isUltimateReady ? '#FFD54F' : '#FFFFFF' }}>
            {player.ultimateGauge}/3
          </span>
          {isUltimateReady && (
            <span style={{ marginLeft: '4px', fontSize: '10px', fontWeight: 800, color: '#FFE082' }}>
              [発動可!]
            </span>
          )}
        </div>
      </div>

      {/* Row 1: The 4 Normal Commands (攻撃, 回避, 強化, 特殊) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '5px',
          marginBottom: '6px',
        }}
      >
        {/* 1. 攻撃 */}
        <button
          onClick={() => onAction('ATTACK')}
          disabled={!isEnabled}
          style={{
            height: '56px',
            backgroundColor: isEnabled ? '#1E3A5F' : '#1A222F',
            color: isEnabled ? '#FFFFFF' : '#5A6678',
            border: isEnabled ? '1px solid #3B6496' : '1px solid #263345',
            borderRadius: '10px',
            cursor: isEnabled ? 'pointer' : 'not-allowed',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 4px',
            transition: 'transform 0.1s ease, filter 0.15s ease',
          }}
          onMouseDown={e => isEnabled && (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={e => isEnabled && (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span style={{ fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap' }}>攻撃</span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: isEnabled ? '#90CAF9' : '#5A6678', whiteSpace: 'nowrap' }}>
            約{estimatedAttackDamage}ダメ
          </span>
        </button>

        {/* 2. 回避 */}
        <button
          onClick={() => onAction('EVADE')}
          disabled={!isEnabled}
          style={{
            height: '56px',
            backgroundColor: isEnabled ? '#0277BD' : '#12232E',
            color: isEnabled ? '#FFFFFF' : '#5A6678',
            border: isEnabled ? '1px solid #039BE5' : '1px solid #1C2E3B',
            borderRadius: '10px',
            cursor: isEnabled ? 'pointer' : 'not-allowed',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 4px',
            transition: 'transform 0.1s ease, filter 0.15s ease',
          }}
          onMouseDown={e => isEnabled && (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={e => isEnabled && (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span style={{ fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap' }}>回避</span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: isEnabled ? '#80D8FF' : '#5A6678', whiteSpace: 'nowrap' }}>
            率:{evadeRateText}
          </span>
        </button>

        {/* 3. 強化 */}
        <button
          onClick={() => onAction('BUFF')}
          disabled={!isEnabled}
          style={{
            height: '56px',
            backgroundColor: isEnabled ? '#C0392B' : '#261917',
            color: isEnabled ? '#FFFFFF' : '#6E5652',
            border: isEnabled ? (player.isBuffed ? '1px solid #FFB300' : '1px solid #E74C3C') : '1px solid #33201D',
            borderRadius: '10px',
            cursor: isEnabled ? 'pointer' : 'not-allowed',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 4px',
            transition: 'transform 0.1s ease, filter 0.15s ease',
          }}
          onMouseDown={e => isEnabled && (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={e => isEnabled && (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span style={{ fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap' }}>強化</span>
          <span style={{ fontSize: '10px', fontWeight: 700, color: isEnabled ? '#FFCC80' : '#6E5652', whiteSpace: 'nowrap' }}>
            {player.isBuffed ? '付与中' : '攻+50'}
          </span>
        </button>

        {/* 4. 特殊 */}
        <button
          onClick={() => onAction('SPECIAL')}
          disabled={!isEnabled || !isSpecialReady}
          style={{
            height: '56px',
            backgroundColor: isEnabled && isSpecialReady ? '#7B1FA2' : '#281C30',
            color: isEnabled && isSpecialReady ? '#FFFFFF' : '#7E7288',
            border: isEnabled && isSpecialReady ? '1px solid #EA80FC' : '1px solid #3A2A44',
            borderRadius: '10px',
            cursor: isEnabled && isSpecialReady ? 'pointer' : 'not-allowed',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 4px',
            transition: 'transform 0.1s ease, filter 0.15s ease',
          }}
          onMouseDown={e => isEnabled && isSpecialReady && (e.currentTarget.style.transform = 'scale(0.96)')}
          onMouseUp={e => isEnabled && isSpecialReady && (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span style={{ fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap' }}>特殊</span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: isEnabled && isSpecialReady ? '#FFE082' : '#94A3B8',
              whiteSpace: 'nowrap',
            }}
          >
            {isSpecialReady ? `${specialDamagePreview}ダメ` : `CD:${player.specialCooldownRemaining}T`}
          </span>
        </button>
      </div>

      {/* Row 2: Prominent 必殺技 Command */}
      <button
        onClick={() => onAction('ULTIMATE')}
        disabled={!isEnabled || !isUltimateReady}
        style={{
          width: '100%',
          height: '50px',
          backgroundColor: isEnabled && isUltimateReady ? '#D84315' : '#251A1C',
          color: isEnabled && isUltimateReady ? '#FFFFFF' : '#6B575A',
          border: isEnabled && isUltimateReady ? '1.5px solid #FFD54F' : '1px solid #3E2D30',
          borderRadius: '10px',
          cursor: isEnabled && isUltimateReady ? 'pointer' : 'not-allowed',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '0 12px',
          boxShadow: isEnabled && isUltimateReady ? '0 0 12px rgba(255, 213, 79, 0.4)' : 'none',
          transition: 'transform 0.1s ease, filter 0.15s ease',
        }}
        onMouseDown={e => isEnabled && isUltimateReady && (e.currentTarget.style.transform = 'scale(0.98)')}
        onMouseUp={e => isEnabled && isUltimateReady && (e.currentTarget.style.transform = 'scale(1)')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Flame
            size={18}
            color={isEnabled && isUltimateReady ? '#FFD54F' : '#8D6E63'}
            style={{ filter: isEnabled && isUltimateReady ? 'drop-shadow(0 0 4px #FFD54F)' : 'none' }}
          />
          <span style={{ fontSize: '14px', fontWeight: 900, color: '#FFFFFF', whiteSpace: 'nowrap' }}>
            必殺技
          </span>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: isEnabled && isUltimateReady ? '#FFE082' : '#B0BEC5',
              whiteSpace: 'nowrap',
            }}
          >
            【{player.character.ultimateSkillName}】
          </span>
        </div>

        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: '6px',
            backgroundColor: isEnabled && isUltimateReady ? '#FFD54F' : '#2B2124',
            color: isEnabled && isUltimateReady ? '#210E04' : '#B0BEC5',
            border: `1px solid ${isEnabled && isUltimateReady ? '#FFE082' : '#4A373A'}`,
            whiteSpace: 'nowrap',
          }}
        >
          {isUltimateReady ? `${ultimateDamagePreview}ダメ [発動可能!]` : `ゲージ ${player.ultimateGauge}/3`}
        </div>
      </button>
    </div>
  );
};
