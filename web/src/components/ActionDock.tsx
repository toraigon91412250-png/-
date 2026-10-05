import React from 'react';
import { BattleAction, BattleFighter, getEffectiveAttack, getEffectiveDefense, getIrenaFeatherChargeRange, getIrenaFeatherMaxChargeCount, getIrenaSuperFallenShotMultiplier, IrenaSpecialSkillId } from '../types/game';
import { Flame } from 'lucide-react';

interface ActionDockProps {
  player: BattleFighter;
  enemy: BattleFighter;
  isEnabled: boolean;
  onAction: (
    action: BattleAction,
    ultimateVariant?: 'ALL_GODS' | 'RUIN' | 'OMNIPOTENCE',
    specialSkillId?: IrenaSpecialSkillId,
  ) => void;
  irenaUltimateUses?: {
    allGods: number;
    ruin: number;
  };
  onIrenaUltimateAction: (variant: 'ALL_GODS' | 'RUIN') => void;
}

export const ActionDock: React.FC<ActionDockProps> = ({
  player,
  enemy,
  isEnabled,
  onAction,
  irenaUltimateUses = { allGods: 0, ruin: 0 },
  onIrenaUltimateAction,
}) => {
  const buffDamageBonus = player.isBuffed ? (player.buffDamageBonus || 125) : 0;
  const estimatedAttackDamage = Math.max(15, getEffectiveAttack(player) - getEffectiveDefense(enemy)) + buffDamageBonus;
  const [selectedSpecialSkill, setSelectedSpecialSkill] = React.useState<IrenaSpecialSkillId>('FEATHER');
  const hasSuperFallenShot = player.character.id === 'irena' && Boolean(player.character.hasSuperFallenShot);
  const isChargingSuperFallenShot = player.isSuperFallenShotCharging;
  const isSpecialReady = player.specialCooldownRemaining <= 0 && !isChargingSuperFallenShot;
  const isUltimateReady = player.ultimateGauge >= 3;
  const featherSkillLevel = player.character.featherSkillLevel || 1;
  const featherChargeMaxCount = getIrenaFeatherMaxChargeCount(featherSkillLevel);
  const featherChargeAtMax = player.featherChargeCount >= featherChargeMaxCount;
  const nextFeatherChargeRange = getIrenaFeatherChargeRange(player.featherChargeCount);
  const superFallenMultiplier = getIrenaSuperFallenShotMultiplier(featherSkillLevel);
  const specialDamagePreview = selectedSpecialSkill === 'SUPER_FALLEN_SHOT'
    ? Math.max(0, Math.round(getEffectiveAttack(player) * superFallenMultiplier - getEffectiveDefense(enemy))) + buffDamageBonus
    : player.character.specialSkillDamage + player.featherChargeBonus + buffDamageBonus;
  React.useEffect(() => {
    if (!hasSuperFallenShot && selectedSpecialSkill === 'SUPER_FALLEN_SHOT') {
      setSelectedSpecialSkill('FEATHER');
    }
  }, [hasSuperFallenShot, selectedSpecialSkill]);

  const evadeRateText = `${Math.round(player.character.evasionRate * 100)}%`;
  const featherPathName =
    player.character.featherSkillPath === 'ABYSS'
      ? '深淵'
      : player.character.featherSkillPath === 'JUDGMENT'
        ? '断罪'
        : player.character.featherSkillPath === 'CHARGE'
          ? '蓄積'
          : null;
  const ruinPathName =
    player.character.ruinSkillPath === 'EXECUTION'
      ? '処刑'
      : player.character.ruinSkillPath === 'ANNIHILATION'
        ? '殲滅'
        : null;
  const isIrenaUltimate = true;
  const hasUsedAllGods = isIrenaUltimate && irenaUltimateUses.allGods >= 1;
  const hasUsedRuin = isIrenaUltimate && irenaUltimateUses.ruin >= 1;
  const hasUnlockedOmnipotence = hasUsedAllGods && hasUsedRuin;
  const [cinematicActive, setCinematicActive] = React.useState(false);
  const [cinematicVariant, setCinematicVariant] = React.useState<'ALL_GODS' | 'RUIN' | 'OMNIPOTENCE' | null>(null);
  const cinematicActionTimer = React.useRef<number | null>(null);
  const cinematicFinishTimer = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (cinematicActionTimer.current !== null) window.clearTimeout(cinematicActionTimer.current);
      if (cinematicFinishTimer.current !== null) window.clearTimeout(cinematicFinishTimer.current);
    };
  }, []);

  const triggerIrenaUltimate = (variant: 'ALL_GODS' | 'RUIN' | 'OMNIPOTENCE') => {
    if (cinematicActive || !isEnabled || !isUltimateReady) return;
    if (variant === 'ALL_GODS' && hasUsedAllGods) return;
    if (variant === 'RUIN' && hasUsedRuin) return;

    if (cinematicActionTimer.current !== null) window.clearTimeout(cinematicActionTimer.current);
    if (cinematicFinishTimer.current !== null) window.clearTimeout(cinematicFinishTimer.current);

    setCinematicVariant(variant);
    setCinematicActive(true);

    cinematicActionTimer.current = window.setTimeout(() => {
      if (variant === 'OMNIPOTENCE') {
        onAction('ULTIMATE');
      } else {
        onIrenaUltimateAction(variant);
      }
    }, 260);

    cinematicFinishTimer.current = window.setTimeout(() => {
      setCinematicActive(false);
      setCinematicVariant(null);
    }, 1300);
  };
  const ultimateDamagePreview = hasUnlockedOmnipotence
    ? 1500 + buffDamageBonus
    : player.character.ultimateSkillDamage + buffDamageBonus;

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

      <style>{`
        @keyframes irenaUltimatePulse {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50% { transform: scale(1.02); filter: brightness(1.2); }
        }
        @keyframes irenaUltimateSweep {
          0% { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
          20% { opacity: 0.98; }
          55% { opacity: 0.38; }
          100% { transform: translateX(120%) skewX(-18deg); opacity: 0; }
        }
        @keyframes irenaUltimateCore {
          0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(0.92); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.18); }
        }
        @keyframes irenaGodsPulse {
          0%, 100% { filter: brightness(0.98) saturate(1); box-shadow: inset 0 0 30px rgba(255,255,255,0.12), 0 0 0 rgba(255,213,79,0); }
          50% { filter: brightness(1.2) saturate(1.18); box-shadow: inset 0 0 42px rgba(255,255,255,0.2), 0 0 22px rgba(255,213,79,0.4), 0 0 44px rgba(255,170,0,0.16); }
        }
        @keyframes irenaRuinPulse {
          0%, 100% { filter: brightness(0.96) saturate(1); box-shadow: inset 0 0 30px rgba(255,0,0,0.12), 0 0 0 rgba(255,0,0,0); }
          50% { filter: brightness(1.28) saturate(1.3); box-shadow: inset 0 0 48px rgba(255,0,0,0.3), 0 0 24px rgba(255,30,30,0.38), 0 0 52px rgba(255,0,0,0.14); }
        }
        @keyframes irenaOmnipotencePulse {
          0%, 100% { filter: brightness(0.98) saturate(1); box-shadow: inset 0 0 38px rgba(255,213,79,0.1), inset -18px 0 44px rgba(255,0,0,0.06), 0 0 8px rgba(255,213,79,0.12); }
          50% { filter: brightness(1.24) saturate(1.22); box-shadow: inset 0 0 62px rgba(255,240,180,0.18), inset -22px 0 54px rgba(255,0,0,0.15), 0 0 30px rgba(255,213,79,0.42), 0 0 58px rgba(255,0,0,0.18); }
        }
        @keyframes irenaUltimateBlackout {
          0% { opacity: 0; }
          12% { opacity: 0.98; }
          32% { opacity: 0.92; }
          58% { opacity: 0.38; }
          82% { opacity: 0.12; }
          100% { opacity: 0; }
        }
        @keyframes irenaUltimateShockwave {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 0; }
          18% { opacity: 0.95; }
          65% { opacity: 0.3; }
          100% { transform: translate(-50%, -50%) scale(1.8); opacity: 0; }
        }
      `}</style>

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>
              🎯 コマンド選択
            </span>
            {featherPathName && (
              <span style={{ fontSize: '9px', fontWeight: 900, color: '#E1BEE7', background: 'rgba(126,87,194,0.2)', border: '1px solid rgba(179,157,219,0.35)', padding: '2px 6px', borderRadius: '999px' }}>
                羽弾・{featherPathName}
              </span>
            )}
            {ruinPathName && (
              <span style={{ fontSize: '9px', fontWeight: 900, color: '#FFB3B3', background: 'rgba(198,40,40,0.16)', border: '1px solid rgba(239,83,80,0.3)', padding: '2px 6px', borderRadius: '999px' }}>
                破壊・{ruinPathName}
              </span>
            )}
          </div>
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
              ⚡【強化中】攻撃+{buffDamageBonus}
            </span>
          )}
          {selectedSpecialSkill === 'FEATHER' && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#B2DFDB',
                backgroundColor: 'rgba(38, 166, 154, 0.16)',
                border: '1px solid rgba(128, 203, 196, 0.45)',
                padding: '1px 5px',
                borderRadius: '4px',
              }}
            >
              🪶【羽弾蓄積】+{player.featherChargeBonus}　回数 {Math.min(player.featherChargeCount, featherChargeMaxCount)}/{featherChargeMaxCount}　{featherChargeAtMax ? 'MAX' : `次+${nextFeatherChargeRange[0]}〜${nextFeatherChargeRange[1]}`}
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

      {/* Row 1: Normal Commands (いれーなは強化コマンドなし) */}
      {hasSuperFallenShot && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px', marginBottom:'6px' }}>
          <button
            type="button"
            onClick={() => setSelectedSpecialSkill('FEATHER')}
            disabled={!isEnabled || isChargingSuperFallenShot}
            style={{
              minHeight:'30px', borderRadius:'8px',
              border: selectedSpecialSkill === 'FEATHER' ? '1px solid #EA80FC' : '1px solid #39445C',
              background: selectedSpecialSkill === 'FEATHER' ? 'rgba(123,31,162,.34)' : 'rgba(16,21,32,.9)',
              color: selectedSpecialSkill === 'FEATHER' ? '#F3E5F5' : '#98A6BC',
              fontSize:'10px', fontWeight:900,
              cursor: !isEnabled || isChargingSuperFallenShot ? 'not-allowed' : 'pointer',
            }}
          >羽弾</button>
          <button
            type="button"
            onClick={() => setSelectedSpecialSkill('SUPER_FALLEN_SHOT')}
            disabled={!isEnabled || isChargingSuperFallenShot}
            style={{
              minHeight:'30px', borderRadius:'8px',
              border: selectedSpecialSkill === 'SUPER_FALLEN_SHOT' ? '1px solid #FFE082' : '1px solid #39445C',
              background: selectedSpecialSkill === 'SUPER_FALLEN_SHOT' ? 'rgba(117,56,12,.34)' : 'rgba(16,21,32,.9)',
              color: selectedSpecialSkill === 'SUPER_FALLEN_SHOT' ? '#FFE082' : '#98A6BC',
              fontSize:'10px', fontWeight:900,
              cursor: !isEnabled || isChargingSuperFallenShot ? 'not-allowed' : 'pointer',
            }}
          >⚡超堕天撃</button>
        </div>
      )}

      {isChargingSuperFallenShot && (
        <div style={{ marginBottom:'6px', padding:'7px 9px', borderRadius:'9px', border:'1px solid rgba(255,224,130,.58)', background:'linear-gradient(90deg,rgba(65,38,11,.72),rgba(11,12,18,.9))', color:'#FFE082', fontSize:'10px', fontWeight:900, textAlign:'center' }}>
          ⚡🪶 超堕天撃 充填中 — 次のターン自動発射 / 充填中 DEF 0
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
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

        {/* 3. 特殊 */}
        <button
          onClick={() => onAction('SPECIAL', undefined, selectedSpecialSkill)}
          disabled={!isEnabled || !isSpecialReady || isChargingSuperFallenShot}
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
          <span style={{ fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap' }}>
            {selectedSpecialSkill === 'SUPER_FALLEN_SHOT' ? '超堕天撃' : '羽弾'}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: isEnabled && isSpecialReady ? '#FFE082' : '#94A3B8',
              whiteSpace: 'nowrap',
            }}
          >
            {isChargingSuperFallenShot
              ? '次ターン自動発射'
              : isSpecialReady
                ? selectedSpecialSkill === 'SUPER_FALLEN_SHOT'
                  ? `${specialDamagePreview}ダメ / 倍率×${superFallenMultiplier.toFixed(1)} / 1T充填`
                  : `${specialDamagePreview}ダメ（蓄積+${player.featherChargeBonus}）`
                : `CD:${player.specialCooldownRemaining}T`}
          </span>
        </button>
      </div>

      {/* Row 2: Prominent 必殺技 Command */}
      {isIrenaUltimate && hasUnlockedOmnipotence && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '86px',
            border: isEnabled && isUltimateReady ? '1.5px solid #FFE082' : '1px solid #3E2D30',
            borderRadius: '12px',
            overflow: 'hidden',
            background: 'linear-gradient(112deg, #F5D96A 0%, #A77B16 24%, #241A05 42%, #050505 53%, #120000 64%, #751010 82%, #010101 100%)',
            animation: isEnabled && isUltimateReady ? 'irenaOmnipotencePulse 1.6s ease-in-out infinite' : 'none',
            boxShadow: isEnabled && isUltimateReady
              ? '0 0 18px rgba(255, 213, 79, 0.45), 0 0 34px rgba(255, 30, 30, 0.18), 0 0 58px rgba(255, 200, 60, 0.12)'
              : 'none',
          }}
        >
          {cinematicActive && (
            <div
              aria-hidden="true"
              data-irena-ultimate-cut-in-slot="ready"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                pointerEvents: 'none',
                background: cinematicVariant === 'OMNIPOTENCE'
                  ? 'radial-gradient(circle at center, rgba(255,245,210,0.16) 0%, rgba(255,213,79,0.08) 18%, rgba(0,0,0,0.92) 58%, rgba(0,0,0,1) 100%)'
                  : '#000000',
                animation: 'irenaUltimateBlackout 1.3s ease-out forwards',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: '58px',
                  height: '58px',
                  borderRadius: '50%',
                  background: cinematicVariant === 'OMNIPOTENCE'
                    ? 'radial-gradient(circle, #FFFFFF 0%, #FFE27A 16%, rgba(255,80,30,0.38) 42%, transparent 74%)'
                    : 'radial-gradient(circle, #FFFFFF 0%, #FFD54F 20%, rgba(255,0,0,0.22) 48%, transparent 74%)',
                  animation: 'irenaUltimateShockwave 1.05s cubic-bezier(0.14,0.78,0.2,1) forwards',
                  pointerEvents: 'none',
                  mixBlendMode: 'screen',
                }}
              />
            </div>
          )}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(110deg, transparent 0%, rgba(255,255,255,0.16) 45%, transparent 60%)',
              transform: 'translateX(-120%)',
              animation: isEnabled && isUltimateReady ? 'irenaUltimateSweep 1.45s ease-in-out infinite' : 'none',
              pointerEvents: 'none',
            }}
          />
          <button
            onClick={() => triggerIrenaUltimate('OMNIPOTENCE')}
            disabled={!isEnabled || !isUltimateReady || cinematicActive}
            style={{
              position: 'relative',
              zIndex: 2,
              width: '100%',
              minHeight: '84px',
              background: 'transparent',
              color: isEnabled && isUltimateReady ? '#FFFFFF' : '#6B575A',
              border: 'none',
              cursor: isEnabled && isUltimateReady ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '10px 14px',
            }}
          >
            <div style={{ minWidth: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  flexShrink: 0,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #FFF8D6 0%, #D9AF35 42%, #241A04 72%, #050505 100%)',
                  border: '1px solid rgba(255,255,255,0.55)',
                  boxShadow: isEnabled && isUltimateReady ? '0 0 14px rgba(255, 225, 130, 0.65)' : 'none',
                }}
              >
                <Flame
                  size={19}
                  color={isEnabled && isUltimateReady ? '#FFFFFF' : '#8D6E63'}
                  style={{ filter: isEnabled && isUltimateReady ? 'drop-shadow(0 0 5px #FFD54F)' : 'none' }}
                />
              </div>
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <div
                  style={{
                    fontSize: '18px',
                    fontWeight: 950,
                    letterSpacing: '0.05em',
                    color: isEnabled && isUltimateReady ? '#FFFFFF' : '#76686A',
                    whiteSpace: 'nowrap',
                    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
                  }}
                >
                  全能の一撃
                </div>
                <div
                  style={{
                    marginTop: '3px',
                    fontSize: '10px',
                    fontWeight: 900,
                    letterSpacing: '0.12em',
                    color: '#FFE082',
                    whiteSpace: 'nowrap',
                  }}
                >
                  全神の権能 1/1　×　破壊の権能 1/1　—　融合完了
                </div>
              </div>
            </div>

            <div
              style={{
                flexShrink: 0,
                padding: '6px 10px',
                borderRadius: '8px',
                background: 'rgba(0,0,0,0.58)',
                border: isEnabled && isUltimateReady ? '1px solid #FFE082' : '1px solid #4A373A',
                color: isEnabled && isUltimateReady ? '#FFFFFF' : '#B0BEC5',
                fontSize: '11px',
                fontWeight: 900,
                whiteSpace: 'nowrap',
                boxShadow: 'inset 0 0 14px rgba(0,0,0,0.35)',
              }}
            >
              {isUltimateReady ? `${ultimateDamagePreview}ダメ [発動可能!]` : `ゲージ ${player.ultimateGauge}/3`}
            </div>
          </button>
        </div>
      )}

      {isIrenaUltimate && !hasUnlockedOmnipotence && (
        <div
          style={{
            position: 'relative',
            width: '100%',
            minHeight: '138px',
            border: isEnabled && isUltimateReady ? '1.5px solid #FFE082' : '1px solid #3E2D30',
            borderRadius: '12px',
            overflow: 'hidden',
            background: '#020202',
            boxShadow: isEnabled && isUltimateReady
              ? '0 0 16px rgba(255, 213, 79, 0.42), 0 0 30px rgba(255, 0, 0, 0.12), 0 0 54px rgba(255, 196, 70, 0.1)'
              : 'none',
          }}
        >
          {cinematicActive && (
            <div
              aria-hidden="true"
              data-irena-ultimate-cut-in-slot="ready"
              style={{
                position: 'fixed',
                inset: 0,
                zIndex: 9999,
                pointerEvents: 'none',
                background: cinematicVariant === 'ALL_GODS'
                  ? 'radial-gradient(circle at 32% 50%, rgba(255,234,153,0.18) 0%, rgba(255,213,79,0.08) 22%, rgba(0,0,0,0.9) 64%, rgba(0,0,0,1) 100%)'
                  : cinematicVariant === 'RUIN'
                    ? 'radial-gradient(circle at 68% 50%, rgba(255,30,30,0.18) 0%, rgba(80,0,0,0.1) 22%, rgba(0,0,0,0.92) 64%, rgba(0,0,0,1) 100%)'
                    : '#000000',
                animation: 'irenaUltimateBlackout 1.3s ease-out forwards',
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: cinematicVariant === 'ALL_GODS' ? '30%' : cinematicVariant === 'RUIN' ? '70%' : '50%',
                  width: '50px',
                  height: '50px',
                  borderRadius: '50%',
                  background: cinematicVariant === 'ALL_GODS'
                    ? 'radial-gradient(circle, #FFFFFF 0%, #FFE082 18%, rgba(255,213,79,0.34) 44%, transparent 74%)'
                    : 'radial-gradient(circle, #FFFFFF 0%, #FF4D4D 17%, rgba(255,0,0,0.28) 46%, transparent 74%)',
                  animation: 'irenaUltimateShockwave 1.05s cubic-bezier(0.14,0.78,0.2,1) forwards',
                  pointerEvents: 'none',
                  mixBlendMode: 'screen',
                }}
              />
            </div>
          )}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(112deg, #B78B13 0%, #F7D66A 20%, #3C2B06 39%, #090909 50%, #120303 62%, #6D0808 80%, #000000 100%)',
              opacity: isEnabled && isUltimateReady ? 1 : 0.42,
              pointerEvents: 'none',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(112deg, transparent 0%, rgba(255,255,255,0.18) 44%, transparent 59%)',
              transform: 'translateX(-120%)',
              animation: isEnabled && isUltimateReady ? 'irenaUltimateSweep 2.2s ease-in-out infinite' : 'none',
              pointerEvents: 'none',
            }}
          />

          <button
            onClick={() => triggerIrenaUltimate('ALL_GODS')}
            disabled={!isEnabled || !isUltimateReady || hasUsedAllGods || cinematicActive}
            aria-label="全神の権能"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              clipPath: 'polygon(0 0, 60% 0, 40% 100%, 0 100%)',
              background: isEnabled && isUltimateReady && !hasUsedAllGods
                ? 'linear-gradient(135deg, #F7D66A 0%, #C99C25 32%, #6D5010 78%, #2A210B 100%)'
                : 'linear-gradient(135deg, #70550E 0%, #4D3B10 45%, #211C10 100%)',
              color: isEnabled && isUltimateReady && !hasUsedAllGods ? '#FFFFFF' : '#A89B7A',
              border: 'none',
              cursor: isEnabled && isUltimateReady && !hasUsedAllGods ? 'pointer' : 'not-allowed',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 44px 12px 16px',
              zIndex: 2,
              textAlign: 'left',
              boxShadow: isEnabled && isUltimateReady && !hasUsedAllGods ? 'inset 0 0 28px rgba(255,255,255,0.12), 0 0 18px rgba(255,213,79,0.18)' : 'none',
              animation: isEnabled && isUltimateReady && !hasUsedAllGods ? 'irenaGodsPulse 1.45s ease-in-out infinite' : 'none',
            }}
          >
            <span
              style={{
                fontSize: '19px',
                fontWeight: 950,
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
                color: isEnabled && isUltimateReady && !hasUsedAllGods ? '#FFFFFF' : '#A89B7A',
                textShadow: '0 2px 10px rgba(0,0,0,0.75)',
              }}
            >
              全神の権能
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '0.08em',
                color: isEnabled && isUltimateReady && !hasUsedAllGods ? '#FFF4C2' : '#8C7F61',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: '14px' }}>◆</span> 使用回数 {irenaUltimateUses.allGods}/1
            </span>
          </button>

          <button
            onClick={() => triggerIrenaUltimate('RUIN')}
            disabled={!isEnabled || !isUltimateReady || hasUsedRuin || cinematicActive}
            aria-label="破壊の権能"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              clipPath: 'polygon(60% 0, 100% 0, 100% 100%, 40% 100%)',
              background: isEnabled && isUltimateReady && !hasUsedRuin
                ? 'linear-gradient(135deg, #101010 0%, #050505 48%, #130000 73%, #320000 100%)'
                : 'linear-gradient(135deg, #222222 0%, #0E0E0E 56%, #180606 100%)',
              color: isEnabled && isUltimateReady && !hasUsedRuin ? '#FF3838' : '#805050',
              border: 'none',
              cursor: isEnabled && isUltimateReady && !hasUsedRuin ? 'pointer' : 'not-allowed',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 16px 12px 44px',
              zIndex: 2,
              textAlign: 'right',
              boxShadow: isEnabled && isUltimateReady && !hasUsedRuin ? 'inset 0 0 30px rgba(255,0,0,0.12), 0 0 18px rgba(255,30,30,0.16)' : 'none',
              animation: isEnabled && isUltimateReady && !hasUsedRuin ? 'irenaRuinPulse 1.2s ease-in-out infinite' : 'none',
            }}
          >
            <span
              style={{
                fontSize: '19px',
                fontWeight: 950,
                letterSpacing: '0.06em',
                whiteSpace: 'nowrap',
                color: isEnabled && isUltimateReady && !hasUsedRuin ? '#FF3838' : '#805050',
                textShadow: '0 2px 10px rgba(0,0,0,0.9)',
              }}
            >
              破壊の権能
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                fontSize: '11px',
                fontWeight: 900,
                letterSpacing: '0.08em',
                color: isEnabled && isUltimateReady && !hasUsedRuin ? '#FF8B8B' : '#795757',
                whiteSpace: 'nowrap',
              }}
            >
              使用回数 {irenaUltimateUses.ruin}/1 <span style={{ fontSize: '14px' }}>◆</span>
            </span>
          </button>

          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '-6%',
              bottom: '-6%',
              left: '42%',
              width: '17%',
              background: 'linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(255,215,92,0.55) 24%, rgba(255,255,255,0.96) 50%, rgba(255,0,0,0.34) 78%, rgba(0,0,0,0.95) 100%)',
              clipPath: 'polygon(50% 0, 100% 0, 50% 100%, 0 100%)',
              transform: 'translateZ(0)',
              pointerEvents: 'none',
              zIndex: 3,
              filter: 'blur(0.4px) drop-shadow(0 0 8px rgba(255,213,79,0.58)) drop-shadow(0 0 10px rgba(255,0,0,0.24))',
              mixBlendMode: 'screen',
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '66px',
              height: '66px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, #FFFBEA 0%, #FFD54F 18%, rgba(255,213,79,0.28) 46%, rgba(255,0,0,0.12) 62%, transparent 72%)',
              transform: 'translate(-50%, -50%)',
              animation: isEnabled && isUltimateReady ? 'irenaUltimateCore 1.25s ease-in-out infinite' : 'none',
              boxShadow: isEnabled && isUltimateReady ? '0 0 24px rgba(255,213,79,0.24), 0 0 38px rgba(255,0,0,0.12)' : 'none',
              pointerEvents: 'none',
              zIndex: 4,
              mixBlendMode: 'screen',
            }}
          />
        </div>
      )}


    </div>
  );
};
