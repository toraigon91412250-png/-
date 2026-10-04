import React, { useState } from 'react';
import { ArrowLeft, Check, Play, Sparkles } from 'lucide-react';
import arenaBg from '../assets/img_arena_bg.jpg';

type AbilityId = 'ABYSS' | 'FALLEN' | 'BLACK_WING' | 'FALLEN_KING' | 'JUDGMENT';

interface BattleSetupScreenProps {
  onBack: () => void;
  onStartBattle: () => void;
}

const LEVELS = Array.from({ length: 10 }, (_, index) => (index + 1) * 10);

const ABILITIES: Array<{
  id: AbilityId;
  name: string;
  symbol: string;
  description: string;
}> = [
  {
    id: 'ABYSS',
    name: '深淵',
    symbol: '🌑',
    description: 'ターン経過でカイザーのステータスを徐々に低下。',
  },
  {
    id: 'FALLEN',
    name: '堕天',
    symbol: '🩸',
    description: 'いれーなのHPが減るほど、堕天の力が解放される。',
  },
  {
    id: 'BLACK_WING',
    name: '黒翼',
    symbol: '🪽',
    description: 'いれーなのステータスと羽弾を大幅に強化。',
  },
  {
    id: 'FALLEN_KING',
    name: '堕天王',
    symbol: '👑',
    description: '耐久力を高め、致命的な一撃にも抗う生存特化。',
  },
  {
    id: 'JUDGMENT',
    name: '断罪',
    symbol: '⚖️',
    description: '戦況の隙を捉えて、強力な断罪を執行する。',
  },
];

export const BattleSetupScreen: React.FC<BattleSetupScreenProps> = ({
  onBack,
  onStartBattle,
}) => {
  const [selectedLevel, setSelectedLevel] = useState(10);
  const [selectedAbilities, setSelectedAbilities] = useState<AbilityId[]>([]);

  const toggleAbility = (abilityId: AbilityId) => {
    setSelectedAbilities(current => {
      if (current.includes(abilityId)) {
        return current.filter(id => id !== abilityId);
      }
      if (current.length >= 2) return current;
      return [...current, abilityId];
    });
  };

  const canStart = selectedAbilities.length === 2;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#090B12',
        overflowY: 'auto',
        color: '#FFFFFF',
        padding: '18px 14px 30px',
      }}
    >
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

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          maxWidth: '720px',
          margin: '0 auto',
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{
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
          }}
        >
          <ArrowLeft size={17} />
          戻る
        </button>

        <div
          style={{
            padding: '16px',
            borderRadius: '16px',
            border: '1px solid #3B4561',
            background: 'linear-gradient(135deg, rgba(21,27,42,0.97), rgba(13,17,28,0.97))',
            boxShadow: '0 10px 30px rgba(0,0,0,0.24)',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.24em', color: '#90CAF9' }}>
            BATTLE CONFIGURATION
          </div>
          <h1 style={{ margin: '4px 0 6px', fontSize: '28px', fontWeight: 950 }}>
            バトル選択
          </h1>
          <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.55, color: '#9CA3AF' }}>
            挑戦するカイザーのレベルと、装備する権能を選択してください。
          </p>
        </div>

        <section
          style={{
            marginTop: '14px',
            padding: '14px',
            borderRadius: '16px',
            border: '1px solid #333B52',
            backgroundColor: 'rgba(16, 21, 34, 0.94)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.16em', color: '#FFCC80' }}>
                KAISER LEVEL
              </div>
              <div style={{ marginTop: '4px', fontSize: '21px', fontWeight: 950 }}>
                Lv.{selectedLevel}
              </div>
            </div>
            <div style={{ fontSize: '11px', color: '#78909C' }}>10刻み / 全10段階</div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '8px',
              marginTop: '12px',
            }}
          >
            {LEVELS.map(level => {
              const selected = selectedLevel === level;
              const finalLevel = level === 100;
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
                      : 'rgba(24, 31, 47, 0.94)',
                    color: selected ? '#FFF8E1' : '#D1D5DB',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: '8px 11px',
                    boxShadow: selected ? '0 0 18px rgba(255,213,79,0.13)' : 'none',
                  }}
                >
                  <div style={{ fontSize: '15px', fontWeight: 950 }}>
                    Lv.{level}
                  </div>
                  <div style={{ marginTop: '2px', fontSize: '9px', color: finalLevel ? '#FFB74D' : '#7C879C' }}>
                    {finalLevel ? '最終試練' : '挑戦レベル'}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section
          style={{
            marginTop: '14px',
            padding: '14px',
            borderRadius: '16px',
            border: '1px solid #443D5C',
            background: 'linear-gradient(135deg, rgba(28,22,43,0.96), rgba(14,17,29,0.96))',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.16em', color: '#B39DDB' }}>
                FALLEN ANGEL POWERS
              </div>
              <div style={{ marginTop: '4px', fontSize: '21px', fontWeight: 950 }}>
                権能選択
              </div>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: canStart ? '#64FFDA' : '#90A4AE' }}>
              {selectedAbilities.length} / 2
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(1, minmax(0, 1fr))',
              gap: '9px',
              marginTop: '12px',
            }}
          >
            {ABILITIES.map(ability => {
              const selected = selectedAbilities.includes(ability.id);
              const disabled = !selected && selectedAbilities.length >= 2;

              return (
                <button
                  key={ability.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={disabled}
                  onClick={() => toggleAbility(ability.id)}
                  style={{
                    width: '100%',
                    minHeight: '74px',
                    borderRadius: '12px',
                    border: selected ? '1.5px solid #D1C4E9' : '1px solid #463E5E',
                    background: selected
                      ? 'linear-gradient(135deg, rgba(64,38,88,0.98), rgba(32,22,48,0.98))'
                      : 'rgba(28, 24, 41, 0.94)',
                    opacity: disabled ? 0.45 : 1,
                    color: '#FFFFFF',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '11px',
                    textAlign: 'left',
                    boxShadow: selected ? '0 0 20px rgba(179,157,219,0.12)' : 'none',
                  }}
                >
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      flexShrink: 0,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: '11px',
                      background: selected ? 'rgba(211, 183, 255, 0.16)' : 'rgba(99, 80, 135, 0.12)',
                      border: '1px solid rgba(179,157,219,0.24)',
                      fontSize: '22px',
                    }}
                  >
                    {ability.symbol}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <span style={{ fontSize: '17px', fontWeight: 950 }}>{ability.name}</span>
                      {selected && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '2px 6px',
                            borderRadius: '999px',
                            background: '#6A1B9A',
                            color: '#FFFFFF',
                            fontSize: '9px',
                            fontWeight: 900,
                          }}
                        >
                          <Check size={11} />
                          選択中
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: '4px', fontSize: '10px', lineHeight: 1.45, color: '#B8B0C8' }}>
                      {ability.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div
            style={{
              marginTop: '10px',
              padding: '9px 10px',
              borderRadius: '9px',
              background: 'rgba(87, 60, 120, 0.10)',
              border: '1px solid rgba(179,157,219,0.17)',
              fontSize: '10px',
              lineHeight: 1.45,
              color: '#9288A3',
            }}
          >
            権能はこの試作段階では選択画面のみ。戦闘中の効果処理はまだ接続していません。
          </div>
        </section>

        <div
          style={{
            marginTop: '14px',
            padding: '12px 14px',
            borderRadius: '13px',
            background: 'rgba(8, 11, 18, 0.92)',
            border: '1px solid #242C3E',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 900, color: '#78909C', letterSpacing: '0.12em' }}>
            CHALLENGE SET
          </div>
          <div style={{ marginTop: '6px', fontSize: '13px', fontWeight: 900, color: '#FFFFFF' }}>
            カイザー Lv.{selectedLevel}
          </div>
          <div style={{ marginTop: '4px', fontSize: '11px', color: '#B0BEC5' }}>
            {selectedAbilities.length === 0
              ? '権能を2つ選択してください。'
              : selectedAbilities
                  .map(id => ABILITIES.find(ability => ability.id === id)?.name)
                  .filter(Boolean)
                  .join(' ＋ ')}
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!canStart) return;
            onStartBattle();
          }}
          disabled={!canStart}
          style={{
            width: '100%',
            minHeight: '56px',
            marginTop: '12px',
            borderRadius: '14px',
            border: canStart ? '1.5px solid #FFB74D' : '1px solid #394153',
            background: canStart
              ? 'linear-gradient(135deg, #E65100, #B52E00)'
              : '#1A1F2B',
            color: canStart ? '#FFFFFF' : '#667085',
            cursor: canStart ? 'pointer' : 'not-allowed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '18px',
            fontWeight: 950,
            boxShadow: canStart ? '0 7px 20px rgba(230,81,0,0.25)' : 'none',
          }}
        >
          <Play size={21} fill="currentColor" />
          戦闘開始！
        </button>

        <div
          style={{
            marginTop: '9px',
            textAlign: 'center',
            fontSize: '9px',
            color: '#566176',
          }}
        >
          権能は2つまで選択可能。組み合わせは全10通り。
        </div>
      </div>
    </div>
  );
};
