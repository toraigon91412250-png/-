import React from 'react';
import { BattleFighter, BattleSetupConfig, getIrenaFeatherMaxChargeCount, IrenaSpecialSkillId, PlayerBattleAction } from '../types/game';
import { Flame } from 'lucide-react';
import {
  COSTLY_SHOT_HP_COST,
  FEATHER_SPLIT_ALTERNATION_BONUS,
  getFeatherSplitModeForSkill,
  getSpecialCooldownRemaining,
} from '../utils/imprintSystem';

interface ActionDockProps {
  player: BattleFighter;
  battleConfig: BattleSetupConfig;
  turnNumber: number;
  isEnabled: boolean;
  onCinematicActiveChange: (active: boolean) => void;
  selectedSpecialSkill: IrenaSpecialSkillId;
  onSelectedSpecialSkillChange: (skillId: IrenaSpecialSkillId) => void;
  onAction: (
    action: PlayerBattleAction,
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
  battleConfig,
  turnNumber,
  isEnabled,
  onCinematicActiveChange,
  selectedSpecialSkill,
  onSelectedSpecialSkillChange,
  onAction,
  irenaUltimateUses = { allGods: 0, ruin: 0 },
  onIrenaUltimateAction,
}) => {
  const isIrena = player.character.id === 'irena';
  const hasSuperFallenShot = isIrena && Boolean(player.character.hasSuperFallenShot);
  const hasFeatherSplitImprint = player.character.id === 'irena' && (battleConfig.imprints?.includes('FEATHER_SPLIT') ?? false);
  const hasYinYangImprint = battleConfig.imprints?.includes('YIN_YANG') ?? false;
  const hasCostlyShotImprint = battleConfig.imprints?.includes('COSTLY_SHOT') ?? false;
  const isChargingSuperFallenShot = player.isSuperFallenShotCharging;
  const selectedFeatherSplitMode = hasFeatherSplitImprint ? getFeatherSplitModeForSkill(selectedSpecialSkill) : null;
  const selectedSpecialCooldownRemaining = getSpecialCooldownRemaining(player, selectedSpecialSkill, hasFeatherSplitImprint);
  const isSpecialReady = selectedSpecialCooldownRemaining <= 0 && !isChargingSuperFallenShot;
  const hasSelectedModeAlternationBonus = Boolean(
    selectedFeatherSplitMode &&
    player.lastFeatherSplitMode &&
    selectedFeatherSplitMode !== player.lastFeatherSplitMode
  );
  const isUltimateReady = player.ultimateGauge >= 3;
  const featherChargeMaxCount = getIrenaFeatherMaxChargeCount(player.character.featherSkillLevel || 1);
  React.useEffect(() => {
    if (!hasSuperFallenShot && selectedSpecialSkill === 'SUPER_FALLEN_SHOT') {
      onSelectedSpecialSkillChange('FEATHER');
      return;
    }
    if (hasFeatherSplitImprint && selectedSpecialSkill === 'FEATHER') {
      onSelectedSpecialSkillChange('FEATHER_PIERCE');
      return;
    }
    if (
      !hasFeatherSplitImprint &&
      (selectedSpecialSkill === 'FEATHER_PIERCE' || selectedSpecialSkill === 'FEATHER_RAPID')
    ) {
      onSelectedSpecialSkillChange('FEATHER');
    }
  }, [hasSuperFallenShot, hasFeatherSplitImprint, selectedSpecialSkill, onSelectedSpecialSkillChange]);


  const isIrenaUltimate = isIrena;
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
    onCinematicActiveChange(true);

    cinematicActionTimer.current = window.setTimeout(() => {
      if (variant === 'OMNIPOTENCE') {
        onAction('ULTIMATE', 'OMNIPOTENCE');
      } else {
        onIrenaUltimateAction(variant);
      }
    }, 260);

    cinematicFinishTimer.current = window.setTimeout(() => {
      setCinematicActive(false);
      setCinematicVariant(null);
      onCinematicActiveChange(false);
    }, 1300);
  };

  return (
    <div
      className="battle-action-dock"
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

      <div
        className="battle-action-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap',
          marginBottom: '8px',
          minHeight: '28px',
        }}
      >
        <strong style={{ fontSize: '14px', fontWeight: 900, color: '#FFFFFF' }}>行動</strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          {player.isBuffed && (
            <span
              aria-label="強化中"
              style={{
                fontSize: '10px',
                fontWeight: 850,
                color: '#FFE082',
                background: 'rgba(255,143,0,0.16)',
                border: '1px solid rgba(255,179,0,0.38)',
                borderRadius: '999px',
                padding: '3px 7px',
              }}
            >
              強化中
            </span>
          )}
          {isIrena && selectedSpecialSkill !== 'SUPER_FALLEN_SHOT' && (
            <span
              aria-label={`羽弾蓄積 ${Math.min(player.featherChargeCount, featherChargeMaxCount)} / ${featherChargeMaxCount}`}
              style={{
                fontSize: '10px',
                fontWeight: 850,
                color: '#B2DFDB',
                background: 'rgba(38,166,154,0.12)',
                border: '1px solid rgba(128,203,196,0.32)',
                borderRadius: '999px',
                padding: '3px 7px',
                whiteSpace: 'nowrap',
              }}
            >
              🪶 {Math.min(player.featherChargeCount, featherChargeMaxCount)}/{featherChargeMaxCount}
            </span>
          )}
          {hasSelectedModeAlternationBonus && (
            <span
              aria-label={`交互ボーナス準備中：与ダメージ+${Math.round(FEATHER_SPLIT_ALTERNATION_BONUS * 100)}%`}
              style={{
                fontSize: '10px',
                fontWeight: 900,
                color: '#FFE8A3',
                background: 'rgba(255,193,7,0.13)',
                border: '1px solid rgba(255,224,130,0.45)',
                borderRadius: '999px',
                padding: '3px 7px',
                whiteSpace: 'nowrap',
              }}
            >
              交互 +{Math.round(FEATHER_SPLIT_ALTERNATION_BONUS * 100)}%
            </span>
          )}
        </div>
        <div
          aria-label={`必殺技ゲージ ${player.ultimateGauge}/3`}
          title="必殺技ゲージ"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '11px',
            fontWeight: 900,
            backgroundColor: isUltimateReady ? 'rgba(255,111,0,0.24)' : '#1E2332',
            border: `1px solid ${isUltimateReady ? '#FFD54F' : '#3E4C66'}`,
            color: isUltimateReady ? '#FFE082' : '#D1D9E8',
            borderRadius: '8px',
            padding: '4px 8px',
            whiteSpace: 'nowrap',
          }}
        >
          <Flame size={13} aria-hidden="true" />
          {player.ultimateGauge}/3
        </div>
      </div>

      {/* Row 1: Normal Commands (いれーなは強化コマンドなし) */}
      {(hasFeatherSplitImprint || hasSuperFallenShot) && (
        <div
          className="battle-special-selector"
          role="group"
          aria-label={hasFeatherSplitImprint ? '羽撃ち分け・特殊技選択' : '特殊技選択'}
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${hasFeatherSplitImprint ? (hasSuperFallenShot ? 3 : 2) : 2}, minmax(0, 1fr))`,
            gap: '5px',
            marginBottom: '6px',
          }}
        >
          {hasFeatherSplitImprint ? (
            <>
              {([
                {
                  id: 'FEATHER_PIERCE' as const,
                  label: '🪽 穿羽',
                  detail: getSpecialCooldownRemaining(player, 'FEATHER_PIERCE', true) > 0 ? `CT ${getSpecialCooldownRemaining(player, 'FEATHER_PIERCE', true)}T` : '使用可能',
                  accent: '#EA80FC',
                  background: 'rgba(123,31,162,.34)',
                  text: '#F3E5F5',
                },
                {
                  id: 'FEATHER_RAPID' as const,
                  label: '🪶 連羽',
                  detail: getSpecialCooldownRemaining(player, 'FEATHER_RAPID', true) > 0 ? `CT ${getSpecialCooldownRemaining(player, 'FEATHER_RAPID', true)}T` : '使用可能',
                  accent: '#80CBC4',
                  background: 'rgba(0,121,107,.28)',
                  text: '#D7FFF8',
                },
              ]).map(choice => {
                const selected = selectedSpecialSkill === choice.id;
                return (
                  <button
                    key={choice.id}
                    type="button"
                    aria-label={`${choice.id === 'FEATHER_PIERCE' ? '穿羽' : '連羽'}を選択`}
                    aria-pressed={selected}
                    onClick={() => onSelectedSpecialSkillChange(choice.id)}
                    disabled={!isEnabled || isChargingSuperFallenShot}
                    style={{
                      minWidth: 0,
                      minHeight: '44px',
                      borderRadius: '8px',
                      border: selected ? `1px solid ${choice.accent}` : '1px solid #39445C',
                      background: selected ? choice.background : 'rgba(16,21,32,.9)',
                      color: selected ? choice.text : '#98A6BC',
                      fontSize: '10px',
                      fontWeight: 900,
                      cursor: !isEnabled || isChargingSuperFallenShot ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '2px',
                      padding: '3px 2px',
                      lineHeight: 1.15,
                      overflow: 'hidden',
                    }}
                  >
                    <span style={{ whiteSpace: 'nowrap' }}>{choice.label}</span>
                    <span style={{ fontSize: '10px', fontWeight: 800, opacity: selected ? 1 : 0.88, whiteSpace: 'nowrap' }}>
                      {choice.detail}
                    </span>
                  </button>
                );
              })}
            </>
          ) : (
            <button
              type="button"
              onClick={() => onSelectedSpecialSkillChange('FEATHER')}
              aria-label="羽弾を選択"
              aria-pressed={selectedSpecialSkill === 'FEATHER'}
              disabled={!isEnabled || isChargingSuperFallenShot}
              style={{
                minWidth: 0,
                minHeight: '44px',
                borderRadius: '8px',
                border: selectedSpecialSkill === 'FEATHER' ? '1px solid #EA80FC' : '1px solid #39445C',
                background: selectedSpecialSkill === 'FEATHER' ? 'rgba(123,31,162,.34)' : 'rgba(16,21,32,.9)',
                color: selectedSpecialSkill === 'FEATHER' ? '#F3E5F5' : '#98A6BC',
                fontSize: '10px',
                fontWeight: 900,
                cursor: !isEnabled || isChargingSuperFallenShot ? 'not-allowed' : 'pointer',
              }}
            >羽弾</button>
          )}
          {hasSuperFallenShot && (
            <button
              type="button"
              onClick={() => onSelectedSpecialSkillChange('SUPER_FALLEN_SHOT')}
              aria-label="超堕天撃を選択"
              aria-pressed={selectedSpecialSkill === 'SUPER_FALLEN_SHOT'}
              disabled={!isEnabled || isChargingSuperFallenShot}
              style={{
                minWidth: 0,
                minHeight: '44px',
                borderRadius: '8px',
                border: selectedSpecialSkill === 'SUPER_FALLEN_SHOT' ? '1px solid #FFE082' : '1px solid #39445C',
                background: selectedSpecialSkill === 'SUPER_FALLEN_SHOT' ? 'rgba(117,56,12,.34)' : 'rgba(16,21,32,.9)',
                color: selectedSpecialSkill === 'SUPER_FALLEN_SHOT' ? '#FFE082' : '#98A6BC',
                fontSize: '10px',
                fontWeight: 900,
                cursor: !isEnabled || isChargingSuperFallenShot ? 'not-allowed' : 'pointer',
              }}
            >⚡超堕天撃</button>
          )}
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
          aria-label="攻撃"
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
          <span style={{ fontSize: '14px', fontWeight: 800, whiteSpace: 'nowrap' }}>攻撃</span>        </button>

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
            {selectedSpecialSkill === 'SUPER_FALLEN_SHOT'
              ? '超堕天撃'
              : selectedSpecialSkill === 'FEATHER_PIERCE'
                ? '穿羽'
                : selectedSpecialSkill === 'FEATHER_RAPID'
                  ? '連羽'
                  : isIrena ? '羽弾' : player.character.specialSkillName}
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
              ? '次ターン発射'
              : isSpecialReady
                ? selectedSpecialSkill === 'SUPER_FALLEN_SHOT'
                  ? '充填・次ターン発射'
                  : selectedFeatherSplitMode && hasSelectedModeAlternationBonus
                    ? `交互+${Math.round(FEATHER_SPLIT_ALTERNATION_BONUS * 100)}%`
                    : '使用可能'
                : `CT:${selectedSpecialCooldownRemaining}T`}
          </span>
        </button>
      </div>

      {hasYinYangImprint && (
        <div style={{ marginBottom: '6px' }}>
          <button
            type="button"
            aria-label="陰陽転化"
            onClick={() => onAction('YIN_YANG')}
            disabled={!isEnabled || isChargingSuperFallenShot}
            style={{
              width: '100%',
              minHeight: '48px',
              padding: '6px 10px',
              borderRadius: '10px',
              border: isEnabled && !isChargingSuperFallenShot ? '1px solid #D4B05B' : '1px solid #3D3940',
              background: isEnabled && !isChargingSuperFallenShot
                ? 'linear-gradient(105deg, rgba(43,43,62,0.98), rgba(54,43,24,0.98))'
                : 'rgba(26,30,40,0.92)',
              color: isEnabled && !isChargingSuperFallenShot ? '#FFF0C2' : '#667085',
              cursor: isEnabled && !isChargingSuperFallenShot ? 'pointer' : 'not-allowed',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 900, whiteSpace: 'nowrap' }}>☯️ 陰陽転化</span>
            <span style={{ fontSize: '10px', fontWeight: 700, color: 'inherit' }}>
              防御＋攻撃強化
            </span>
          </button>
        </div>
      )}

      {hasCostlyShotImprint && (
        <div style={{ marginBottom: '6px' }}>
          <button
            type="button"
            aria-label="代償撃ち"
            onClick={() => onAction('COSTLY_SHOT', undefined, selectedSpecialSkill)}
            disabled={
              !isEnabled ||
              isChargingSuperFallenShot ||
              selectedSpecialCooldownRemaining <= 0 ||
              player.currentHp <= COSTLY_SHOT_HP_COST
            }
            style={{
              width: '100%',
              minHeight: '46px',
              padding: '6px 10px',
              borderRadius: '10px',
              border: isEnabled && !isChargingSuperFallenShot && selectedSpecialCooldownRemaining > 0 && player.currentHp > COSTLY_SHOT_HP_COST
                ? '1px solid #D7A4D7'
                : '1px solid #3D3940',
              background: isEnabled && !isChargingSuperFallenShot && selectedSpecialCooldownRemaining > 0 && player.currentHp > COSTLY_SHOT_HP_COST
                ? 'linear-gradient(105deg, rgba(52,24,57,0.98), rgba(44,35,62,0.98))'
                : 'rgba(26,30,40,0.92)',
              color: isEnabled && !isChargingSuperFallenShot && selectedSpecialCooldownRemaining > 0 && player.currentHp > COSTLY_SHOT_HP_COST
                ? '#F6D7FF'
                : '#667085',
              cursor: !isEnabled || isChargingSuperFallenShot || selectedSpecialCooldownRemaining <= 0 || player.currentHp <= COSTLY_SHOT_HP_COST
                ? 'not-allowed'
                : 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '2px',
              fontFamily: 'inherit',
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 900, whiteSpace: 'nowrap' }}>♻️ 代償撃ち</span>
            <span style={{ fontSize: '10px', fontWeight: 700 }}>
              HP-{COSTLY_SHOT_HP_COST} · CTリセット
            </span>
          </button>
        </div>
      )}

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
                  融合必殺
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
              {isUltimateReady ? '発動可能' : `ゲージ ${player.ultimateGauge}/3`}
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
              <span style={{ fontSize: '14px' }}>◆</span> {hasUsedAllGods ? '使用済み' : '使用可能'}
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
              {hasUsedRuin ? '使用済み' : '使用可能'} <span style={{ fontSize: '14px' }}>◆</span>
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


      {!isIrenaUltimate && (
        <button
          type="button"
          aria-label={player.character.ultimateSkillName + 'を発動'}
          onClick={() => onAction('ULTIMATE')}
          disabled={!isEnabled || !isUltimateReady}
          style={{
            width: '100%',
            minHeight: '72px',
            marginTop: '2px',
            padding: '10px 12px',
            borderRadius: '12px',
            border: isEnabled && isUltimateReady ? '1.5px solid ' + player.character.primaryColor : '1px solid #3E2D30',
            background: isEnabled && isUltimateReady
              ? 'linear-gradient(115deg, ' + player.character.primaryColor + '44, rgba(8,12,20,.98))'
              : 'rgba(18,22,31,.96)',
            color: isEnabled && isUltimateReady ? '#FFFFFF' : '#758198',
            cursor: isEnabled && isUltimateReady ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          <span style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <strong style={{ fontSize: '16px', fontWeight: 950 }}>{player.character.ultimateSkillName}</strong>
          </span>
          <span style={{ flexShrink: 0, fontSize: '11px', fontWeight: 900, color: isEnabled && isUltimateReady ? '#FFE082' : '#758198' }}>
            {isUltimateReady ? '発動可能' : 'ゲージ ' + player.ultimateGauge + '/3'}
          </span>
        </button>
      )}

    </div>
  );
};
