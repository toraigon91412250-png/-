import React, { useState } from 'react';
import { BattleFighter, VisualEffect, STATUS_AILMENTS } from '../types/game';
import { HpBar } from './HpBar';
import { Sparkles, Activity, Shield } from 'lucide-react';

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

  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);

  const detailEntries = new Map<string, { title: string; description: string }>();

  if (fighter.isBuffed) {
    detailEntries.set('buff', {
      title: '強化中',
      description: '次の攻撃ダメージが +' + fighter.buffDamageBonus + ' されます。',
    });
  }

  fighter.activeAilments.forEach(ailment => {
    const def = STATUS_AILMENTS[ailment.type];
    const actualDotDamage = ailment.dotDamage ?? def.dotDamage;
    const effectParts = [
      def.dotDamage > 0 ? 'HP-' + actualDotDamage : '',
      def.speedMod !== 0 ? '速度' + (def.speedMod > 0 ? '+' : '') + def.speedMod : '',
      def.attackMod !== 0 ? '攻撃' + (def.attackMod > 0 ? '+' : '') + def.attackMod : '',
      def.defenseMod !== 0 ? '防御' + (def.defenseMod > 0 ? '+' : '') + def.defenseMod : '',
    ].filter(Boolean).join(' / ');
    const description = ailment.type === 'BLEED'
      ? '各ターン開始時に' + actualDotDamage + 'ダメージ。' + effectParts + '。'
      : def.description + (effectParts ? '（' + effectParts + '）' : '');

    detailEntries.set('ailment-' + ailment.type, {
      title: def.displayName + ' ' + ailment.remainingTurns + 'T',
      description,
    });
  });

  const selectedDetail = selectedDetailId ? detailEntries.get(selectedDetailId) ?? null : null;
  const toggleDetail = (detailId: string) => {
    setSelectedDetailId(current => current === detailId ? null : detailId);
  };
  let borderStyle = `1px solid ${fighter.character.primaryColor}CC`;
  if (fighter.isBuffed) {
    borderStyle = '2px solid #FFB300';
  } else if (fighter.isEvading) {
    borderStyle = '2px solid #00E5FF';
  }

  return (
    <div
      className="battle-fighter-card"
      style={{
        backgroundColor: '#131724',
        borderRadius: '14px',
        border: borderStyle,
        padding: '8px',
        position: 'relative',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        animation: isHit ? 'cardHitShake 0.3s ease-in-out' : undefined,
        transition: 'border 0.2s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center' }}>
        {/* Avatar with Status Overlay */}
        <div
          className="battle-fighter-avatar"
          style={{
            width: '60px',
            height: '60px',
            borderRadius: '12px',
            border: `2px solid ${fighter.character.primaryColor}`,
            overflow: 'hidden',
            position: 'relative',
            flexShrink: 0,
            backgroundColor: '#0a0d16',
          }}
        >
          <img
            src={fighter.character.iconImageSrc ?? fighter.character.imageSrc}
            alt={fighter.character.name}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 20%',
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


          </div>

          <div style={{ marginTop: '5px' }}>
            <HpBar currentHp={fighter.currentHp} maxHp={fighter.character.maxHp} />
          </div>
          {fighter.character.id === 'kaiser' && fighter.kaiserPhase === 2 && (
            <div
              role="status"
              aria-label="カイザー第2フェーズ"
              style={{
                marginTop: '5px',
                padding: '5px 7px',
                borderRadius: '6px',
                border: '1px solid rgba(255,82,82,0.75)',
                background: 'linear-gradient(90deg, rgba(183,28,28,0.28), rgba(255,111,0,0.16))',
                color: '#FFB4A2',
                fontSize: '10px',
                lineHeight: 1.4,
                fontWeight: 900,
              }}
            >
              第2フェーズ
            </div>
          )}
          {fighter.character.id === 'kaiser' && (fighter.kaiserArmorMax ?? 0) > 0 && (
            <div
              role="status"
              aria-label="カイザー装甲"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                marginTop: '5px',
                padding: '4px 8px',
                borderRadius: '7px',
                border: '1px solid ' + (
                  (fighter.kaiserArmorCurrent ?? 0) > 0
                    ? 'rgba(144,202,249,0.55)'
                    : (fighter.kaiserArmorBrokenTurns ?? 0) > 0
                      ? 'rgba(255,112,67,0.55)'
                      : 'rgba(120,144,156,0.32)'
                ),
                backgroundColor: (fighter.kaiserArmorCurrent ?? 0) > 0
                  ? 'rgba(21,101,192,0.14)'
                  : (fighter.kaiserArmorBrokenTurns ?? 0) > 0
                    ? 'rgba(191,54,12,0.12)'
                    : 'rgba(120,144,156,0.06)',
                color: (fighter.kaiserArmorCurrent ?? 0) > 0 ? '#B3E5FC' : '#FFB4A2',
                fontSize: '10px',
                lineHeight: 1.25,
                fontWeight: 850,
              }}
            >
              <Shield size={13} aria-hidden="true" />
              <span>
                {(fighter.kaiserArmorCurrent ?? 0) > 0
                  ? '装甲あり'
                  : (fighter.kaiserArmorBrokenTurns ?? 0) > 0
                    ? '装甲破壊中'
                    : '装甲破壊済み'}
              </span>
            </div>
          )}

        </div>
      </div>

      {/* Middle status row: Buff and Ailments */}
      {(fighter.isBuffed || fighter.activeAilments.length > 0) && (
        <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
          {fighter.isBuffed && (
            <button
              type="button"
              onClick={() => toggleDetail('buff')}
              aria-expanded={selectedDetailId === 'buff'}
              aria-label="強化中の詳細を表示"
              title="タップで詳細"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: 'rgba(230, 81, 0, 0.4)',
                border: '1px solid #FFB300',
                borderRadius: '5px',
                padding: '3px 6px',
                fontSize: '10px',
                fontWeight: 700,
                color: '#FFE082',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <Sparkles size={11} color="#FFD54F" />
              <span>強化中</span>
            </button>
          )}

          {fighter.activeAilments.map(ailment => {
            const def = STATUS_AILMENTS[ailment.type];
            const isBleed = ailment.type === 'BLEED';
            const detailId = 'ailment-' + ailment.type;
            return (
              <button
                key={ailment.type}
                type="button"
                onClick={() => toggleDetail(detailId)}
                aria-expanded={selectedDetailId === detailId}
                aria-label={def.displayName + ' ' + ailment.remainingTurns + 'ターンの詳細を表示'}
                title="タップで詳細"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: isBleed ? 'rgba(183, 28, 28, 0.4)' : 'rgba(74, 20, 140, 0.4)',
                  border: '1px solid ' + (isBleed ? '#EF5350' : '#AB47BC'),
                  borderRadius: '5px',
                  padding: '3px 6px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: isBleed ? '#FFCDD2' : '#F3E5F5',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <span>{def.displayName} {ailment.remainingTurns}T</span>
              </button>
            );
          })}
        </div>
      )}

      {selectedDetail && (
        <div
          aria-live="polite"
          style={{
            marginTop: '5px',
            padding: '6px 8px',
            borderRadius: '7px',
            backgroundColor: 'rgba(10, 16, 28, 0.9)',
            border: '1px solid rgba(144, 202, 249, 0.28)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '10px', fontWeight: 900, color: '#D5DEEB' }}>
              {selectedDetail.title}
            </span>
            <button
              type="button"
              onClick={() => setSelectedDetailId(null)}
              aria-label="詳細を閉じる"
              style={{
                width: '20px',
                height: '20px',
                padding: 0,
                border: '1px solid rgba(255,255,255,0.18)',
                borderRadius: '5px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: '#AEB9CB',
                fontSize: '14px',
                lineHeight: 1,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              ×
            </button>
          </div>
          <div style={{ marginTop: '3px', fontSize: '9px', lineHeight: 1.45, fontWeight: 700, color: '#AEB9CB' }}>
            {selectedDetail.description}
          </div>
        </div>
      )}

    </div>
  );
};
