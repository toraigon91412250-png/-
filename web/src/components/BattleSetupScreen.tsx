import React, { useState } from 'react';
import { ArrowLeft, Check, Play } from 'lucide-react';
import arenaBg from '../assets/img_arena_bg.jpg';
import { ABILITY_DEFINITIONS, getAbilityDefinition } from '../data/abilities';
import { AbilityId, AbilityProgress, BATTLE_CHALLENGE_LEVELS, BattleChallengeLevel, BattleSetupConfig } from '../types/game';

interface BattleSetupScreenProps {
  abilityProgress: AbilityProgress;
  initialConfig?: BattleSetupConfig;
  onBack: () => void;
  onStartBattle: (config: BattleSetupConfig) => void;
}

export const BattleSetupScreen: React.FC<BattleSetupScreenProps> = ({
  abilityProgress,
  initialConfig,
  onBack,
  onStartBattle,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<BattleChallengeLevel>(
    initialConfig?.kaiserLevel ?? 10,
  );
  const [selectedAbilities, setSelectedAbilities] = useState<AbilityId[]>(
    initialConfig?.abilities.map(ability => ability.id).slice(0, 2) ?? [],
  );

  const toggleAbility = (id: AbilityId) => {
    setSelectedAbilities(current => {
      if (current.includes(id)) return current.filter(value => value !== id);
      if (current.length >= 2) return current;
      if (abilityProgress.levels[id] <= 0) return current;
      return [...current, id];
    });
  };

  const startBattle = () => {
    onStartBattle({
      kaiserLevel: selectedLevel,
      abilities: selectedAbilities.map(id => ({
        id,
        level: abilityProgress.levels[id],
      })),
    });
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      backgroundColor: '#090B12',
      overflowY: 'auto',
      color: '#FFFFFF',
      padding: '18px 14px 30px',
      boxSizing: 'border-box',
    }}>
      <img
        src={arenaBg}
        alt=""
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.12,
          pointerEvents: 'none',
        }}
      />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '720px', margin: '0 auto' }}>
        <button type="button" onClick={onBack} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          minHeight: '40px',
          padding: '8px 12px',
          marginBottom: '10px',
          borderRadius: '10px',
          border: '1px solid #374151',
          background: 'rgba(17, 24, 39, 0.92)',
          color: '#D1D5DB',
          fontWeight: 800,
          cursor: 'pointer',
        }}>
          <ArrowLeft size={17} /> 戻る
        </button>

        <div style={{
          padding: '16px',
          borderRadius: '16px',
          border: '1px solid #3B4561',
          background: 'linear-gradient(135deg, rgba(21,27,42,0.97), rgba(13,17,28,0.97))',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.24em', color: '#90CAF9' }}>
            BATTLE CONFIGURATION
          </div>
          <h1 style={{ margin: '4px 0 6px', fontSize: '28px', fontWeight: 950 }}>バトル選択</h1>
          <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.55, color: '#9CA3AF' }}>
            挑戦するカイザーのレベルと、装備する権能を選択してください。
          </p>
        </div>

        <section style={{
          marginTop: '14px',
          padding: '14px',
          borderRadius: '16px',
          border: '1px solid #333B52',
          backgroundColor: 'rgba(16, 21, 34, 0.94)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.16em', color: '#FFCC80' }}>KAISER LEVEL</div>
              <div style={{ marginTop: '4px', fontSize: '21px', fontWeight: 950 }}>Lv.{selectedLevel}</div>
            </div>
            <div style={{ fontSize: '11px', color: '#78909C' }}>10刻み / 全10段階</div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '8px',
            marginTop: '12px',
          }}>
            {BATTLE_CHALLENGE_LEVELS.map(level => {
              const selected = selectedLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSelectedLevel(level)}
                  style={{
                    minHeight: '54px',
                    borderRadius: '11px',
                    border: selected ? '1.5px solid #FFD54F' : '1px solid #39445D',
                    background: selected
                      ? 'linear-gradient(135deg, rgba(92,64,20,0.92), rgba(52,39,15,0.95))'
                      : 'rgba(24,31,47,0.94)',
                    color: selected ? '#FFF8E1' : '#D1D5DB',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: '8px 11px',
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: 950 }}>Lv.{level}</div>
                  <div style={{ marginTop: '2px', fontSize: '9px', color: level === 100 ? '#FFB74D' : '#7C879C' }}>
                    {level === 100 ? '最終試練' : '挑戦レベル'}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section style={{
          marginTop: '14px',
          padding: '14px',
          borderRadius: '16px',
          border: '1px solid #443D5C',
          background: 'linear-gradient(135deg, rgba(28,22,43,0.96), rgba(14,17,29,0.96))',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.16em', color: '#B39DDB' }}>FALLEN ANGEL POWERS</div>
              <div style={{ marginTop: '4px', fontSize: '21px', fontWeight: 950 }}>権能選択</div>
            </div>
            <div style={{
              fontSize: '12px',
              fontWeight: 900,
              color: selectedAbilities.length === 2 ? '#64FFDA' : '#90A4AE',
            }}>
              {selectedAbilities.length} / 2
            </div>
          </div>

          <div style={{ display: 'grid', gap: '9px', marginTop: '12px' }}>
            {ABILITY_DEFINITIONS.map(ability => {
              const level = abilityProgress.levels[ability.id];
              const selected = selectedAbilities.includes(ability.id);
              const locked = level <= 0;
              const disabled = locked || (!selected && selectedAbilities.length >= 2);
              const detail = getAbilityDefinition(ability.id).levelDescriptions[Math.max(0, Math.min(4, level - 1))];

              return (
                <button
                  key={ability.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => toggleAbility(ability.id)}
                  style={{
                    width: '100%',
                    minHeight: '82px',
                    borderRadius: '12px',
                    border: selected ? '1.5px solid #D1C4E9' : '1px solid #463E5E',
                    background: selected
                      ? 'linear-gradient(135deg, rgba(64,38,88,0.98), rgba(32,22,48,0.98))'
                      : 'rgba(28,24,41,0.94)',
                    opacity: locked ? 0.42 : disabled ? 0.52 : 1,
                    color: '#FFFFFF',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                    textAlign: 'left',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{
                    width: '42px',
                    height: '42px',
                    flexShrink: 0,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: '11px',
                    background: selected ? 'rgba(211,183,255,0.16)' : 'rgba(99,80,135,0.12)',
                    border: '1px solid rgba(179,157,219,0.24)',
                    fontSize: '22px',
                  }}>
                    {ability.symbol}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '17px', fontWeight: 950 }}>{ability.name}</span>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: level > 0 ? '#FFE082' : '#7C879C' }}>
                        {level > 0 ? `Lv.${level}` : '未解放'}
                      </span>
                      {selected && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          padding: '2px 6px',
                          borderRadius: '999px',
                          background: '#6A1B9A',
                          color: '#FFFFFF',
                          fontSize: '9px',
                          fontWeight: 900,
                        }}>
                          <Check size={11} /> 選択中
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '10px', lineHeight: 1.45, color: '#B8B0C8' }}>
                      {ability.shortDescription}
                    </div>
                    {level > 0 && (
                      <div style={{ marginTop: '3px', fontSize: '9px', color: '#8D849B' }}>
                        Lv.{level}効果: {detail}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div style={{
            marginTop: '10px',
            padding: '9px 10px',
            borderRadius: '9px',
            background: 'rgba(87,60,120,0.10)',
            border: '1px solid rgba(179,157,219,0.17)',
            fontSize: '10px',
            lineHeight: 1.45,
            color: '#9288A3',
          }}>
            権能は任意で0〜2個まで装備できます。選択しない場合は権能なしで戦闘を開始します。効果は選択した現在のLvで適用されます。
          </div>
        </section>

        <div style={{
          marginTop: '14px',
          padding: '12px 14px',
          borderRadius: '13px',
          background: 'rgba(8,11,18,0.92)',
          border: '1px solid #242C3E',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 900, color: '#78909C', letterSpacing: '0.12em' }}>CHALLENGE SET</div>
          <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 900, color: '#FFFFFF' }}>
            カイザー Lv.{selectedLevel}
          </div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#B0BEC5' }}>
            {selectedAbilities.length === 0
              ? '権能なしで開始します。'
              : selectedAbilities.map(id => ABILITY_DEFINITIONS.find(ability => ability.id === id)?.name).join(' ＋ ')}
          </div>
        </div>

        <button
          type="button"
          onClick={startBattle}
          style={{
            width: '100%',
            minHeight: '56px',
            marginTop: '12px',
            borderRadius: '14px',
            border: '1.5px solid #FFB74D',
            background: 'linear-gradient(135deg, #E65100, #B52E00)',
            color: '#FFFFFF',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '18px',
            fontWeight: 950,
          }}
        >
          <Play size={21} fill="currentColor" /> 戦闘開始！
        </button>

        <div style={{ marginTop: '9px', textAlign: 'center', fontSize: '9px', color: '#566176' }}>
          権能は任意で0〜2個まで選択可能。権能なしでも戦闘を開始できます。
        </div>
      </div>
    </div>
  );
};
