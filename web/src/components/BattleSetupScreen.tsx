import React, { useState } from 'react';
import { ArrowLeft, Check, Minus, Play, Plus } from 'lucide-react';
import arenaBg from '../assets/img_arena_bg.jpg';
import { ABILITY_DEFINITIONS, getAbilityDefinition } from '../data/abilities';
import { RESONANCE_DEFINITIONS } from '../data/resonanceAbilities';
import { AbilityId, AbilityProgress, AchievementBadgeId, BATTLE_CHALLENGE_LEVELS, BattleAbilityId, BattleChallengeLevel, BattleSetupConfig, CharacterDef, CpuDifficulty, ImprintId, ImprintProgress, ResonanceAbilityId, ResonanceProgress, StatAllocation } from '../types/game';
import { getSelectableKaiserLevels } from '../utils/kaiserChallengeProgress';
import { IRENA } from '../data/characters';
import { BuildSavePanel } from './BuildSavePanel';
import { validateBuildSnapshot, type BuildValidationContext, type SavedBuildSnapshot } from '../utils/buildSaveSystem';
import type { AchievementBadgeProgress } from '../utils/achievementSystem';
import { createStatPreset, getAbilityBuildHint, getAbilityBuildMatchPercent, getRemainingStatPoints, getSpentStatPoints, normalizeStatAllocation, STAT_ALLOCATION_KEYS, STAT_BUILD_POINT_VALUES, StatAllocationKey, StatPresetId } from '../utils/statBuild';

interface BattleSetupScreenProps {
  playerCharacters: readonly CharacterDef[];
  selectedPlayerCharacterId: string;
  onSelectPlayerCharacter: (characterId: string) => void;
  abilityProgress: AbilityProgress;
  resonanceProgress: ResonanceProgress;
  imprintProgress: ImprintProgress;
  achievementBadges: AchievementBadgeProgress[];
  equippedAchievementBadgeId: AchievementBadgeId | null;
  achievementBadgeMessage: string | null;
  onSelectAchievementBadge: (id: AchievementBadgeId | null) => void;
  onApplySavedBuild: (config: BattleSetupConfig) => { success: boolean; message?: string };
  selectedDifficulty: CpuDifficulty;
  onSelectDifficulty: (difficulty: CpuDifficulty) => void;
  initialConfig?: BattleSetupConfig;
  onBack: () => void;
  onStartBattle: (config: BattleSetupConfig) => void;
  availableStatPoints: number;
  unlockedKaiserLevel: BattleChallengeLevel;
  allowAllKaiserLevels?: boolean;
  isExKaiserChallenge?: boolean;
}

export const BattleSetupScreen: React.FC<BattleSetupScreenProps> = ({
  playerCharacters,
  selectedPlayerCharacterId,
  onSelectPlayerCharacter,
  abilityProgress,
  resonanceProgress,
  imprintProgress,
  achievementBadges,
  equippedAchievementBadgeId,
  achievementBadgeMessage,
  onSelectAchievementBadge,
  onApplySavedBuild,
  selectedDifficulty,
  onSelectDifficulty,
  initialConfig,
  onBack,
  onStartBattle,
  availableStatPoints,
  unlockedKaiserLevel,
  allowAllKaiserLevels = false,
  isExKaiserChallenge = false,
}) => {
  const [selectedLevel, setSelectedLevel] = useState<BattleChallengeLevel>(
    initialConfig?.kaiserLevel ?? 10,
  );
  const [selectedAbilities, setSelectedAbilities] = useState<BattleAbilityId[]>(
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
      }, availableStatPoints);
    });
  };

  const applyPreset = (preset: StatPresetId) => {
    setStatAllocation(createStatPreset(preset, availableStatPoints));
  };

  const isAbilityAvailableForSelectedCharacter = (id: BattleAbilityId) =>
    selectedPlayerCharacterId !== 'stella' || id === 'ABYSS' || id === 'JUDGMENT';
  const getAbilityLevelForSelection = (id: BattleAbilityId) =>
    id in abilityProgress.levels
      ? abilityProgress.levels[id as AbilityId]
      : resonanceProgress.levels[id as ResonanceAbilityId] ?? 0;
  const getAbilityNameForSelection = (id: BattleAbilityId) =>
    ABILITY_DEFINITIONS.find(ability => ability.id === id)?.name
      ?? RESONANCE_DEFINITIONS.find(ability => ability.id === id)?.name
      ?? id;
  const availableSelectedAbilities = selectedAbilities.filter(isAbilityAvailableForSelectedCharacter);
  const STELLA_INCOMPATIBLE_IMPRINTS: readonly ImprintId[] = ['BLOOD_TEAR', 'BLOOD_MEDIA', 'WIND_GUARD', 'FEATHER_SPLIT'];
  const getCompatibleImprints = (ids: readonly ImprintId[]) =>
    selectedPlayerCharacterId === 'stella'
      ? ids.filter(id => !STELLA_INCOMPATIBLE_IMPRINTS.includes(id))
      : [...ids];

  const toggleAbility = (id: BattleAbilityId) => {
    if (!isAbilityAvailableForSelectedCharacter(id)) return;
    setSelectedAbilities(current => {
      if (current.includes(id)) return current.filter(value => value !== id);
      if (current.length >= 2) return current;
      if (getAbilityLevelForSelection(id) <= 0) return current;
      return [...current, id];
    });
  };

  const selectableKaiserLevels = isExKaiserChallenge
    ? [100] as const
    : allowAllKaiserLevels
      ? BATTLE_CHALLENGE_LEVELS
      : getSelectableKaiserLevels(unlockedKaiserLevel);

  const buildValidationContext: BuildValidationContext = {
    availableStatPoints,
    abilityLevels: { ...abilityProgress.levels, ...resonanceProgress.levels },
    unlockedImprintIds: imprintProgress.unlockedIds,
  };

  const applySavedBuild = (snapshot: SavedBuildSnapshot): string | null => {
    const validation = validateBuildSnapshot(snapshot, buildValidationContext);
    if (!validation.valid) return validation.message;

    const config: BattleSetupConfig = {
      kaiserLevel: selectedLevel,
      playerCharacterId: selectedPlayerCharacterId,
      abilities: validation.snapshot.abilityIds.filter(isAbilityAvailableForSelectedCharacter).map(id => ({
        id,
        level: getAbilityLevelForSelection(id),
      })),
      statAllocation: validation.snapshot.statAllocation,
      statPointTotal: availableStatPoints,
      imprints: getCompatibleImprints(validation.snapshot.imprintIds),
      achievementBadgeId: equippedAchievementBadgeId,
      achievementBadgeLevel: achievementBadges.find(badge => badge.id === equippedAchievementBadgeId)?.tier ?? 0,
    };
    const result = onApplySavedBuild(config);
    if (!result.success) return result.message ?? 'ビルドを反映できませんでした。';

    setStatAllocation({ ...validation.snapshot.statAllocation });
    setSelectedAbilities(validation.snapshot.abilityIds.filter(isAbilityAvailableForSelectedCharacter));
    return null;
  };

  const startBattle = () => {
    const equippedBadge = achievementBadges.find(badge => badge.id === equippedAchievementBadgeId && badge.tier > 0);
    onStartBattle({
      kaiserLevel: selectedLevel,
      playerCharacterId: selectedPlayerCharacterId,
      abilities: availableSelectedAbilities.map(id => ({
        id,
        level: getAbilityLevelForSelection(id),
      })),
      statAllocation: normalizeStatAllocation(statAllocation, availableStatPoints),
      statPointTotal: availableStatPoints,
      imprints: getCompatibleImprints(imprintProgress.equippedIds),
      achievementBadgeId: equippedBadge?.id ?? null,
      achievementBadgeLevel: equippedBadge?.tier ?? 0,
    });
  };

  return (
    <div className="battle-setup-screen" style={{
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

      <div className="battle-setup-content" style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '720px', margin: '0 auto' }}>
        <button type="button" className="battle-setup-top-back" onClick={onBack} style={{
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
          {isExKaiserChallenge && (
            <div role="status" aria-label="EXカイザー挑戦" style={{
              marginTop: '10px', padding: '10px 12px', borderRadius: '10px',
              border: '1px solid rgba(255, 112, 142, .6)',
              background: 'linear-gradient(110deg, rgba(104, 24, 47, .46), rgba(37, 20, 48, .7))',
              color: '#FFE0E8', fontSize: '12px', fontWeight: 850, lineHeight: 1.5,
            }}>
              EXカイザー挑戦：Lv.100の全戦闘ステータスが2倍。いれーなの編成で挑め。
            </div>
          )}
        </div>

        <section
          aria-labelledby="player-character-heading"
          style={{
            marginTop: '14px',
            padding: '14px',
            borderRadius: '16px',
            border: '1px solid #333B52',
            backgroundColor: 'rgba(16, 21, 34, 0.94)',
          }}
        >
          <div style={{ fontSize: '10px', color: '#90CAF9', fontWeight: 900, letterSpacing: '0.16em' }}>
            PLAYER CHARACTER
          </div>
          <h2 id="player-character-heading" style={{ margin: '4px 0 5px', fontSize: '18px', fontWeight: 950 }}>
            操作キャラクター
          </h2>
          <p style={{ margin: 0, fontSize: '11px', lineHeight: 1.55, color: '#9CA3AF' }}>
            ここで選んだキャラクターをあなたが操作する。CPUのキャラクター一覧とは別管理。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))', gap: '8px', marginTop: '10px' }}>
            {playerCharacters.map(character => {
              const selected = selectedPlayerCharacterId === character.id;
              return (
                <button
                  key={character.id}
                  type="button"
                  data-player-character-id={character.id}
                  aria-label={character.name + '、' + character.title}
                  aria-pressed={selected}
                  onClick={() => onSelectPlayerCharacter(character.id)}
                  style={{
                    position: 'relative',
                    minWidth: 0,
                    minHeight: '142px',
                    overflow: 'hidden',
                    padding: '0',
                    borderRadius: '12px',
                    border: selected ? '1.5px solid #F6D58B' : '1px solid #34415A',
                    background: selected ? 'linear-gradient(155deg, rgba(100,76,39,.5), rgba(16,22,35,.98))' : 'rgba(9,14,24,.96)',
                    color: '#FFFFFF',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <img
                    src={character.selectImageSrc ?? character.imageSrc}
                    alt=""
                    style={{ display: 'block', width: '100%', height: '76px', objectFit: 'cover', objectPosition: 'center 30%', opacity: selected ? 1 : 0.78 }}
                  />
                  <div style={{ padding: '8px 9px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 950, overflowWrap: 'anywhere' }}>{character.name}</div>
                    <div style={{ marginTop: '2px', fontSize: '10px', color: '#AEBBD0' }}>{character.title}</div>
                    <div style={{ marginTop: '7px', fontSize: '10px', fontWeight: 900, color: selected ? '#F6D58B' : '#91A1B8' }}>
                      {selected ? '✓ 選択中' : '選択する'}
                    </div>
                  </div>
                </button>
              );
            })}
            {playerCharacters.length < 2 && (
              <button
                type="button"
                disabled
                aria-label="新キャラ準備中"
                style={{
                  minWidth: 0,
                  minHeight: '142px',
                  padding: '12px 9px',
                  borderRadius: '12px',
                  border: '1px dashed #47536B',
                  background: 'linear-gradient(155deg, rgba(25,34,51,.86), rgba(9,14,24,.96))',
                  color: '#B7C4D8',
                  opacity: 0.84,
                  cursor: 'not-allowed',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  textAlign: 'center',
                }}
              >
                <span aria-hidden="true" style={{ fontSize: '26px', lineHeight: 1, color: '#E3C989' }}>＋</span>
                <strong style={{ fontSize: '12px' }}>新キャラ</strong>
                <span style={{ fontSize: '10px', fontWeight: 900, color: '#E3C989' }}>近日追加予定</span>
                <span style={{ fontSize: '9px', lineHeight: 1.4, color: '#8F9CB2' }}>画像・性能登録後に選択可能</span>
              </button>
            )}
          </div>
        </section>

        <BuildSavePanel
          snapshot={{
            statAllocation,
            abilityIds: [...selectedAbilities],
            imprintIds: [...imprintProgress.equippedIds],
          }}
          context={buildValidationContext}
          onLoad={applySavedBuild}
        />

        <section aria-label="実績バッジ選択" style={{
          marginTop: '14px',
          padding: '14px',
          borderRadius: '16px',
          border: '1px solid #5C4A76',
          background: 'linear-gradient(135deg, rgba(31,24,45,.96), rgba(14,17,29,.96))',
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <div>
              <div style={{ fontSize: '10px', color: '#C5A9F5', fontWeight: 900, letterSpacing: '.14em' }}>ACHIEVEMENT BADGE</div>
              <div style={{ marginTop: 4, fontSize: '20px', fontWeight: 950 }}>実績バッジ</div>
            </div>
            <div style={{ fontSize: '10px', color: '#A99ABE' }}>装備枠 1 / 1</div>
          </div>
          <p style={{ margin: '7px 0 0', fontSize: '10px', lineHeight: 1.55, color: '#A49AB7' }}>
            各系統の実績を3・5・8個達成すると進化。装備できるのは1種類だけで、権能2枠・刻印3枠とは別枠です。
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 7, marginTop: 11 }}>
            {achievementBadges.map(badge => {
              const selected = badge.id === equippedAchievementBadgeId && badge.tier > 0;
              const locked = badge.tier === 0;
              const color = badge.id === 'A' ? '#FFB5A8' : badge.id === 'B' ? '#D1B6FF' : '#A9E9CE';
              return (
                <button
                  key={badge.id}
                  type="button"
                  disabled={locked}
                  aria-pressed={selected}
                  onClick={() => onSelectAchievementBadge(badge.id)}
                  style={{
                    minWidth: 0,
                    minHeight: 126,
                    padding: '9px 7px',
                    borderRadius: 10,
                    border: selected ? `1.5px solid ${color}` : '1px solid #353146',
                    background: selected ? 'rgba(75,57,100,.55)' : 'rgba(12,15,25,.92)',
                    color: '#F5F1FF',
                    textAlign: 'left',
                    opacity: locked ? 0.56 : 1,
                    cursor: locked ? 'not-allowed' : 'pointer',
                  }}
                >
                  <div style={{ fontSize: 10, color, fontWeight: 950 }}>{badge.typeLabel}</div>
                  <div style={{ marginTop: 4, fontSize: 12, fontWeight: 950, overflowWrap: 'anywhere' }}>{badge.name}</div>
                  <div style={{ marginTop: 5, fontSize: 9, color: '#AAA3BE' }}>
                    {badge.tier > 0 ? `第${badge.tier}段階` : '未獲得'} · {badge.completedAchievementCount}/12
                  </div>
                  <div style={{ marginTop: 5, fontSize: 9, lineHeight: 1.45, color: selected ? color : '#B9B1CD' }}>
                    {badge.tier > 0 ? badge.tierEffects[badge.tier - 1] : '関連実績を3個達成で獲得'}
                  </div>
                  {selected && <div style={{ marginTop: 5, fontSize: 9, fontWeight: 950, color }}>✓ 装備中</div>}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            aria-pressed={!achievementBadges.some(badge => badge.id === equippedAchievementBadgeId && badge.tier > 0)}
            onClick={() => onSelectAchievementBadge(null)}
            style={{
              width: '100%', minHeight: 36, marginTop: 8, borderRadius: 8,
              border: '1px solid #3A4051', background: 'rgba(14,17,27,.95)',
              color: '#C5C9D8', fontSize: 10, fontWeight: 900, cursor: 'pointer',
            }}
          >バッジを装備しない</button>
          {achievementBadgeMessage && (
            <p role="status" style={{ margin: '8px 0 0', fontSize: 10, lineHeight: 1.5, color: '#CDB8F6' }}>
              {achievementBadgeMessage}
            </p>
          )}
        </section>

        <section style={{
          marginTop: '14px',
          padding: '14px',
          borderRadius: '16px',
          border: '1px solid #333B52',
          backgroundColor: 'rgba(16, 21, 34, 0.94)',
        }}>
          <div style={{ fontSize: '10px', color: '#90CAF9', fontWeight: 900, letterSpacing: '0.16em' }}>CPU DIFFICULTY</div>
          <div className="battle-setup-difficulty-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '8px', marginTop: '8px', marginBottom: '14px' }}>
            {([
              ['NORMAL', 'ノーマル', '状況を見てバランスよく行動'],
              ['EXPERT', 'エキスパート', '先読みと回避・強化を駆使'],
            ] as const).map(([difficulty, label, description]) => {
              const selected = selectedDifficulty === difficulty;
              return (
                <button
                  key={difficulty}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectDifficulty(difficulty)}
                  style={{
                    minWidth: 0,
                    minHeight: '58px',
                    padding: '9px 10px',
                    borderRadius: '10px',
                    border: selected ? '1.5px solid #90CAF9' : '1px solid #303B51',
                    background: selected ? 'linear-gradient(135deg, rgba(24,58,92,0.98), rgba(18,31,51,0.98))' : 'rgba(12,18,30,0.92)',
                    color: selected ? '#FFFFFF' : '#B8C4D6',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: '12px', fontWeight: 950 }}>{label}</div>
                  <div style={{ marginTop: '3px', fontSize: '9px', lineHeight: 1.4, color: selected ? '#B9DEFF' : '#8290A8' }}>{description}</div>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.16em', color: '#FFCC80' }}>KAISER LEVEL</div>
              <div style={{ marginTop: '4px', fontSize: '21px', fontWeight: 950 }}>Lv.{selectedLevel}</div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#FFCC80', fontWeight: 900 }}>
              <div>挑戦状況</div>
              {isExKaiserChallenge ? (
                <div style={{ marginTop: '3px', fontSize: '13px' }}>EX挑戦：Lv.100固定</div>
              ) : allowAllKaiserLevels ? (
                <div style={{ marginTop: '3px', fontSize: '13px' }}>開発者テスト：全Lv選択可能</div>
              ) : (
                <div style={{ marginTop: '3px', fontSize: '13px' }}>Lv.{unlockedKaiserLevel} 解放中</div>
              )}
            </div>
          </div>
          <p style={{ margin: '8px 0 0', fontSize: '11px', lineHeight: 1.55, color: '#9AA8BF' }}>
            {isExKaiserChallenge
              ? 'EXカイザーへの挑戦はLv.100固定です。通常のカイザー挑戦の解放進行とは別に戦います。'
              : allowAllKaiserLevels
                ? '開発者テストでは、進行状況に関係なく任意のレベルで戦闘を開始できます。'
                : '勝利すると次の10レベルが解放されます。選べるのは「次の挑戦」と「直前にクリアしたレベル」のみです。'}
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '8px',
            marginTop: '12px',
          }}>
            {selectableKaiserLevels.map(level => {
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
                  <div className="battle-challenge-level-caption" style={{ marginTop: '2px', fontSize: '9px', color: level === unlockedKaiserLevel ? '#FFE082' : level === 100 ? '#FFB74D' : '#7C879C' }}>
                    {level === 100 ? '最終試練' : allowAllKaiserLevels && level !== unlockedKaiserLevel && level !== unlockedKaiserLevel - 10 ? '開発者テスト' : level === unlockedKaiserLevel ? '次の挑戦' : '直前にクリア'}
                  </div>
                </button>
              );
            })}
          </div>
          <div
            className="battle-challenge-rules"
            role="status"
            aria-label="挑戦レベルの特殊ルール"
            aria-live="polite"
            style={{
              marginTop: '10px',
              padding: '10px 11px',
              borderRadius: '10px',
              border: '1px solid rgba(144,202,249,0.24)',
              background: 'rgba(8,14,24,0.72)',
              color: '#C9D5E8',
              fontSize: '10px',
              lineHeight: 1.55,
            }}
          >
            <div style={{ fontSize: '9px', fontWeight: 900, letterSpacing: '0.12em', color: '#90CAF9', marginBottom: '4px' }}>
              LV.{selectedLevel} RULES
            </div>
            {selectedLevel < 40 ? (
              <div>装甲なし。レベルに応じてカイザーの能力値が上昇します。</div>
            ) : (
              <>
                <div>
                  <strong style={{ color: '#B3E5FC' }}>鉄壁装甲：</strong>
                  装甲ゲージがある間、直接ヒットのHPダメージを25%軽減。破壊すると2ターン被ダメージ×1.3。通常は再展開しません。
                </div>
                {selectedLevel >= 70 && (
                  <div style={{ marginTop: '4px' }}>
                    <strong style={{ color: '#CE93D8' }}>行動適応：</strong>
                    同じ行動を繰り返すと、対抗行動を選びやすくなります。
                  </div>
                )}
                {selectedLevel === 100 && (
                  <div style={{ marginTop: '4px' }}>
                    <strong style={{ color: '#FFB74D' }}>最終試練：</strong>
                    HP50%で第2フェーズへ移行。攻撃系×1.25・速さ×1.15となり、装甲を初期耐久値の50%で再展開します。大ダメージでも移行は飛ばせません。
                  </div>
                )}
              </>
            )}
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
              残り {getRemainingStatPoints(statAllocation, availableStatPoints)}P / {availableStatPoints}P
            </div>
          </div>

          <div style={{ marginTop: '12px', fontSize: '9px', color: '#8190A8', lineHeight: 1.4 }}>
            1Pごとの上昇量: HP +{STAT_BUILD_POINT_VALUES.maxHp} / 攻撃 +{STAT_BUILD_POINT_VALUES.attack} / 防御 +{STAT_BUILD_POINT_VALUES.defense} / 素早さ +{STAT_BUILD_POINT_VALUES.speed}
          </div>

          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '9px', color: '#8290A8', fontWeight: 850, marginBottom: '6px' }}>クイックビルド</div>
            <div className="battle-setup-quickbuild" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px' }}>
              {([
                ['BALANCED', '均衡'],
                ['OFFENSE', '火力'],
                ['DEFENSE', '耐久'],
                ['SPEED', '先手'],
              ] as const).map(([preset, label]) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  style={{
                    minHeight: '34px',
                    borderRadius: '8px',
                    border: '1px solid #36445B',
                    background: 'rgba(20,29,43,0.92)',
                    color: '#D9E4F2',
                    fontSize: '10px',
                    fontWeight: 900,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
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
                maxHp: IRENA.maxHp,
                attack: IRENA.attack,
                defense: IRENA.defense,
                speed: IRENA.speed,
              };
              const points = statAllocation[key];
              const bonus = points * STAT_BUILD_POINT_VALUES[key];
              const remaining = getRemainingStatPoints(statAllocation, availableStatPoints);

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
              {availableSelectedAbilities.length} / 2
            </div>
          </div>

          <div style={{ display: 'grid', gap: '9px', marginTop: '12px' }}>
            {ABILITY_DEFINITIONS.filter(ability => isAbilityAvailableForSelectedCharacter(ability.id)).map(ability => {
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
                          {' '}現在の配分との一致: {getAbilityBuildMatchPercent(ability.id, statAllocation, availableStatPoints)}%
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
            {RESONANCE_DEFINITIONS.map(ability => {
              const level = resonanceProgress.levels[ability.id] ?? 0;
              const selected = selectedAbilities.includes(ability.id);
              const locked = !resonanceProgress.unlocked || level <= 0;
              const disabled = locked || (!selected && selectedAbilities.length >= 2);
              const detail = level > 0 ? ability.levelDescriptions[level - 1] : ability.shortDescription;
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
                    border: selected ? '1.5px solid #C4B5FD' : '1px solid #554A87',
                    background: selected ? 'linear-gradient(135deg, rgba(61,45,112,.98), rgba(30,22,58,.98))' : 'rgba(25,23,47,.94)',
                    opacity: locked ? 0.45 : disabled ? 0.52 : 1,
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
                  <span style={{ width: 42, height: 42, flexShrink: 0, display: 'grid', placeItems: 'center', borderRadius: 11, background: selected ? 'rgba(196,181,253,.18)' : 'rgba(109,91,208,.12)', border: '1px solid rgba(196,181,253,.28)', fontSize: 22 }}>{ability.symbol}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                      <strong style={{ fontSize: 15 }}>{ability.name}</strong>
                      <span style={{ fontSize: 10, fontWeight: 900, color: level > 0 ? '#DDD6FE' : '#94A3B8' }}>{level > 0 ? `Lv.${level}` : '未合成'}</span>
                      {selected && <span style={{ fontSize: 9, color: '#DDD6FE', fontWeight: 900 }}>装備中</span>}
                    </span>
                    <span style={{ display: 'block', marginTop: 4, color: '#CBD5E1', fontSize: 10, lineHeight: 1.5 }}>{ability.shortDescription}</span>
                    {level > 0 && <span style={{ display: 'block', marginTop: 3, color: '#A5B4FC', fontSize: 9, lineHeight: 1.45 }}>Lv.{level}効果：{detail}</span>}
                    {locked && <span style={{ display: 'block', marginTop: 3, color: '#FCD34D', fontSize: 9 }}>{!resonanceProgress.unlocked ? '通常カイザーLv.50勝利で解放' : '先に権能共鳴画面で合成してください'}</span>}
                  </span>
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

        <div className="battle-setup-action-footer">
        <div className="battle-setup-challenge-summary" style={{
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
            {availableSelectedAbilities.length === 0
              ? '権能なしで開始します。'
              : availableSelectedAbilities.map(getAbilityNameForSelection).join(' ＋ ')}
          </div>
        </div>

        <div className="battle-setup-footer-actions">
        <button type="button" className="battle-setup-mobile-back" onClick={onBack}>
          <ArrowLeft size={17} /> 戻る
        </button>
        <button
          className="battle-setup-start-button"
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
        </div>

        <div className="battle-setup-start-note" style={{ marginTop: '9px', textAlign: 'center', fontSize: '9px', color: '#566176' }}>
          権能は任意で0〜2個まで選択可能。権能なしでも戦闘を開始できます。
        </div>
        </div>
      </div>
    </div>
  );
};
