import React, { useState } from 'react';
import { ArrowLeft, Check, Minus, Play, Plus } from 'lucide-react';
import arenaBg from '../assets/img_arena_bg.jpg';
import { ABILITY_DEFINITIONS, getAbilityDefinition } from '../data/abilities';
import { AbilityId, AbilityProgress, BATTLE_CHALLENGE_LEVELS, BattleChallengeLevel, BattleSetupConfig, StatAllocation } from '../types/game';
import { getAbilityBuildHint, getAbilityBuildMatchPercent, getRemainingStatPoints, getSpentStatPoints, normalizeStatAllocation, STAT_ALLOCATION_KEYS, STAT_BUILD_POINT_TOTAL, STAT_BUILD_POINT_VALUES, StatAllocationKey } from '../utils/statBuild';

interface BattleSetupScreenProps {
  abilityProgress: AbilityProgress;
  initialConfig?: BattleSetupConfig;
  onBack: () => void;
  onStartBattle: (config: BattleSetupConfig) => void;
  availableStatPoints: number;
}

export const BattleSetupScreen: React.FC<BattleSetupScreenProps> = ({
  abilityProgress,
  initialConfig,
  onBack,
  onStartBattle,
  availableStatPoints,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<BattleChallengeLevel>(
    initialConfig?.kaiserLevel ?? 10,
  );
  const [selectedAbilities, setSelectedAbilities] = useState<AbilityId[]>(
    initialConfig?.abilities.map(ability => ability.id).slice(0, 2) ?? [],
  );
  const [statAllocation, setStatAllocation] = useState<StatAllocation>(() =>
    normalizeStatAllocation(initialConfig?.statAllocation, availableStatPoints),
  );

  const changeStat = (key: StatAllocationKey, delta: number) => {
    setStatAllocation(current => {
      if (delta > 0 && getRemainingStatPoints(current, availableStatPoints) <= 0) return current;
      if (delta < 0 && current[key] <= 0) return current;
      return normalizeStatAllocation({
        ...current,
        [key]: current[key] + delta,
      });
    });
  };

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
      statAllocation: normalizeStatAllocation(statAllocation),
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
            ステータスを自由に配分し、そのビルドに合わせて権能を選択してください。型は固定されません。
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
          border: '1px solid #394D6C',
          background: 'linear-gradient(135deg, rgba(18,28,46,0.96), rgba(14,17,29,0.96))',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.16em', color: '#90CAF9' }}>FREE STAT ALLOCATION</div>
              <div style={{ marginTop: '4px', fontSize: '21px', fontWeight: 950 }}>ステータス配分</div>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 900, color: getRemainingStatPoints(statAllocation, availableStatPoints) === 0 ? '#64FFDA' : '#FFCC80' }}>
              残り {getRemainingStatPoints(statAllocation)}P / {availableStatPoints}P
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '9px', color: '#8190A8', lineHeight: 1.4 }}>
            1Pごとの上昇量: HP +{STAT_BUILD_POINT_VALUES.maxHp} / 攻撃 +{STAT_BUILD_POINT_VALUES.attack} / 防御 +{STAT_BUILD_POINT_VALUES.defense} / 素早さ +{STAT_BUILD_POINT_VALUES.speed}
          </div>

          <div style={{ display: 'grid', gap: '8px', marginTop: '10px' }}>
            {STAT_ALLOCATION_KEYS.map(key => {
              const labels: Record<StatAllocationKey, string> = {
                maxHp: 'HP',
                attack: '攻撃力',
                defense: '防御力',
                speed: '素早さ',
              };
              const displayBase: Record<StatAllocationKey, number> = {
                maxHp: 4000,
                attack: 360,
                defense: 200,
                speed: 240,
              };
              const points = statAllocation[key];
              const bonus = points * STAT_BUILD_POINT_VALUES[key];
              const remaining = getRemainingStatPoints(statAllocation);

              return (
                <div key={key} style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(92px, 1fr) auto',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 10px',
                  borderRadius: '11px',
                  background: 'rgba(18,25,39,0.86)',
                  border: '1px solid #303B51',
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 950 }}>{labels[key]}</span>
                      <span style={{ fontSize: '12px', color: '#E3F2FD', fontWeight: 800 }}>
                        {displayBase[key] + bonus}
                      </span>
                      <span style={{ fontSize: '9px', color: '#7C879C' }}>配分後</span>
                      <span style={{ fontSize: '9px', color: '#90CAF9' }}>＋{bonus}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <button
                      type="button"
                      onClick={() => changeStat(key, -1)}
                      disabled={points <= 0}
                      aria-label={`${labels[key]}を1P減らす`}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '9px',
                        border: '1px solid #39445D',
                        background: points > 0 ? '#182132' : '#111722',
                        color: points > 0 ? '#D1D5DB' : '#4B5563',
                        cursor: points > 0 ? 'pointer' : 'not-allowed',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Minus size={15} />
                    </button>

                    <div style={{ minWidth: '27px', textAlign: 'center', fontSize: '14px', fontWeight: 950 }}>
                      {points}P
                    </div>

                    <button
                      type="button"
                      onClick={() => changeStat(key, 1)}
                      disabled={remaining <= 0}
                      aria-label={`${labels[key]}を1P増やす`}
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '9px',
                        border: '1px solid #4B647F',
                        background: remaining > 0 ? '#173047' : '#111722',
                        color: remaining > 0 ? '#E3F2FD' : '#4B5563',
                        cursor: remaining > 0 ? 'pointer' : 'not-allowed',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: '10px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 10px',
            borderRadius: '9px',
            background: 'rgba(13,20,32,0.9)',
            border: '1px solid #283549',
          }}>
            <div style={{ fontSize: '10px', color: '#8EA1B9', lineHeight: 1.4 }}>
              {getSpentStatPoints(statAllocation, availableStatPoints)}P使用中。固定職はなく、配分した数値そのものがビルドになります。
            </div>

            <button
              type="button"
              onClick={() => setStatAllocation(normalizeStatAllocation(undefined, availableStatPoints))}
              disabled={getSpentStatPoints(statAllocation) === 0}
              style={{
                flexShrink: 0,
                minHeight: '34px',
                padding: '6px 9px',
                borderRadius: '8px',
                border: '1px solid #39445D',
                background: getSpentStatPoints(statAllocation) > 0 ? '#182132' : '#111722',
                color: getSpentStatPoints(statAllocation) > 0 ? '#CFD8E3' : '#566176',
                cursor: getSpentStatPoints(statAllocation) > 0 ? 'pointer' : 'not-allowed',
                fontSize: '10px',
                fontWeight: 900,
              }}
            >
              配分リセット
            </button>
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
                    <div style={{ marginTop: '4px', fontSize: '9px', color: '#90CAF9', lineHeight: 1.35 }}>
                      {getAbilityBuildHint(ability.id)}
                      {getSpentStatPoints(statAllocation) > 0 && (
                        <span style={{ color: '#B0BEC5' }}>
                          {' '}現在の配分との一致: {getAbilityBuildMatchPercent(ability.id, statAllocation)}%
                        </span>
                      )}
                    </div>
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
            権能は戦闘開始時に2つだけ装備されます。効果は現在のLvで適用されます。
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
