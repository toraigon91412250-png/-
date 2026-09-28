import React from 'react';
import { CharacterDef, CpuDifficulty, OverallStats } from '../types/game';
import { CHARACTERS } from '../data/characters';
import arenaBg from '../assets/img_arena_bg.jpg';
import { Swords, Trophy, Play, CheckCircle, Sparkles } from 'lucide-react';

interface CharacterSelectScreenProps {
  overallStats: OverallStats;
  selectedPlayer: CharacterDef;
  selectedDifficulty: CpuDifficulty;
  onSelectPlayer: (char: CharacterDef) => void;
  onSelectDifficulty: (diff: CpuDifficulty) => void;
  onStartBattle: () => void;
}

export const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({
  overallStats,
  selectedPlayer,
  selectedDifficulty,
  onSelectPlayer,
  onSelectDifficulty,
  onStartBattle,
}) => {
  const cpuChar = CHARACTERS.find(c => c.id !== selectedPlayer.id) || CHARACTERS[1];
  const winRate = overallStats.totalBattles > 0
    ? Math.round((overallStats.wins / overallStats.totalBattles) * 100)
    : 0;

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        backgroundColor: '#0C0E17',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '20px 16px 30px 16px',
      }}
    >
      {/* Background Image */}
      <img
        src={arenaBg}
        alt=""
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          opacity: 0.18,
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 5,
          width: '100%',
          maxWidth: '680px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Title Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <Swords size={32} color="#FFB300" />
          <h1 style={{ fontSize: '26px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '0.5px' }}>
            バトルアリーナデュエル
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: '#90CAF9', marginBottom: '14px' }}>
          1対1 ターン制キャラクターバトル（スマホ / PC両対応Web版）
        </p>

        {/* Overall Stats Banner */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#141824',
            border: '1px solid #232C42',
            borderRadius: '12px',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            marginBottom: '18px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Trophy size={16} color="#FFD54F" />
            <span style={{ fontSize: '12px', color: '#B0BEC5' }}>通算成績:</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
              {overallStats.totalBattles}戦 {overallStats.wins}勝 {overallStats.losses}敗
            </span>
          </div>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#64FFDA' }}>
            勝率 {winRate}%
          </div>
        </div>

        {/* Section Heading */}
        <div style={{ width: '100%', textAlign: 'left', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>
            キャラクターを選択
          </h2>
        </div>

        {/* Character Selection Cards */}
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '12px',
            marginBottom: '18px',
          }}
        >
          {CHARACTERS.map(char => {
            const isSelected = char.id === selectedPlayer.id;
            return (
              <div
                key={char.id}
                onClick={() => onSelectPlayer(char)}
                style={{
                  backgroundColor: isSelected ? '#1E2436' : '#121520',
                  border: isSelected ? `2.5px solid ${char.primaryColor}` : '1px solid #2B3347',
                  borderRadius: '16px',
                  padding: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.15s ease, border-color 0.2s ease',
                  boxShadow: isSelected ? `0 0 16px ${char.primaryColor}40` : 'none',
                }}
              >
                {/* Header: Title badge + Checkmark */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      color: char.primaryColor,
                      backgroundColor: `${char.primaryColor}25`,
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {char.title}
                  </span>
                  {isSelected && <CheckCircle size={18} color="#64FFDA" />}
                </div>

                {/* Portrait */}
                <div
                  style={{
                    width: '100%',
                    height: '140px',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: `1px solid ${char.primaryColor}80`,
                    marginBottom: '8px',
                    backgroundColor: '#0a0d16',
                  }}
                >
                  <img
                    src={char.imageSrc}
                    alt={char.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </div>

                {/* Name */}
                <div style={{ fontSize: '17px', fontWeight: 900, color: '#FFFFFF', marginBottom: '8px' }}>
                  {char.name}
                </div>

                {/* Stats List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                  <StatItem label="HP" value={char.maxHp.toString()} ratio={char.maxHp / 1200} color="#66BB6A" />
                  <StatItem label="攻撃力" value={char.attack.toString()} ratio={char.attack / 200} color="#EF5350" />
                  <StatItem label="防御力" value={char.defense.toString()} ratio={char.defense / 200} color="#42A5F5" />
                  <StatItem label="素早さ" value={char.speed.toString()} ratio={char.speed / 150} color="#FFCA28" />
                  <StatItem label="回避率" value={`${Math.round(char.evasionRate * 100)}%`} ratio={char.evasionRate / 0.3} color="#26C6DA" />
                </div>

                {/* Passive Ability Card */}
                <div
                  style={{
                    backgroundColor: '#1E1C2B',
                    border: '1px solid #4A3B69',
                    borderRadius: '8px',
                    padding: '6px 8px',
                    marginBottom: '6px',
                    fontSize: '11px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#D1C4E9', marginBottom: '2px' }}>
                    <Sparkles size={12} color="#B39DDB" />
                    <span>固有能力「{char.passiveName}」</span>
                  </div>
                  <div style={{ color: '#B0BEC5', fontSize: '10px', lineHeight: 1.3 }}>
                    {char.passiveDescription}
                  </div>
                </div>

                {/* Special & Ultimate skills overview */}
                <div style={{ fontSize: '10px', color: '#90CAF9', lineHeight: 1.4 }}>
                  <div>✨ 特殊「{char.specialSkillName}」: {char.specialSkillDamage}ダメ (CD:{char.specialSkillCooldown}T)</div>
                  <div>🌟 必殺「{char.ultimateSkillName}」: {char.ultimateSkillDamage}ダメ (ゲージ3消費)</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Matchup Overview Preview Card */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#161C2C',
            border: '1px solid #283754',
            borderRadius: '14px',
            padding: '12px 16px',
            marginBottom: '18px',
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', marginBottom: '6px' }}>
            ⚔️ 対戦カード詳細
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '13px',
              fontWeight: 700,
              marginBottom: '6px',
            }}
          >
            <span style={{ color: '#90CAF9' }}>
              あなた: {selectedPlayer.name} (素早さ {selectedPlayer.speed})
            </span>
            <span style={{ color: '#FF5252', fontWeight: 900 }}>VS</span>
            <span style={{ color: '#FFCC80' }}>
              CPU: {cpuChar.name} (素早さ {cpuChar.speed})
            </span>
          </div>

          <div style={{ fontSize: '11px', color: '#B0BEC5' }}>
            {selectedPlayer.speed > cpuChar.speed
              ? '⚡ あなたの素早さが高いため、毎ターン先手で行動できます！'
              : '🌀 相手の素早さが高いため、相手が先手で行動します。回避や強化を上手く活用しましょう！'}
          </div>
        </div>

        {/* Difficulty Selector */}
        <div style={{ width: '100%', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF', marginBottom: '8px' }}>
            CPU 難易度
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => onSelectDifficulty('NORMAL')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: selectedDifficulty === 'NORMAL' ? '#1E3A8A' : '#161B26',
                border: selectedDifficulty === 'NORMAL' ? '1.5px solid #60A5FA' : '1px solid #333F58',
                color: selectedDifficulty === 'NORMAL' ? '#FFFFFF' : '#B0BEC5',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: selectedDifficulty === 'NORMAL' ? 800 : 500,
              }}
            >
              <div>ノーマル</div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>状況を見てバランスよく行動</div>
            </button>

            <button
              onClick={() => onSelectDifficulty('EXPERT')}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: selectedDifficulty === 'EXPERT' ? '#1E3A8A' : '#161B26',
                border: selectedDifficulty === 'EXPERT' ? '1.5px solid #60A5FA' : '1px solid #333F58',
                color: selectedDifficulty === 'EXPERT' ? '#FFFFFF' : '#B0BEC5',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: selectedDifficulty === 'EXPERT' ? 800 : 500,
              }}
            >
              <div>エキスパート</div>
              <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '2px' }}>先読みと回避・強化を駆使する戦略派</div>
            </button>
          </div>
        </div>

        {/* Start Battle Button */}
        <button
          onClick={onStartBattle}
          style={{
            width: '100%',
            height: '54px',
            backgroundColor: '#E65100',
            color: '#FFFFFF',
            border: '1.5px solid #FFB74D',
            borderRadius: '14px',
            fontSize: '18px',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 16px rgba(230, 81, 0, 0.4)',
            transition: 'transform 0.1s ease',
          }}
          onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <Play size={22} fill="#FFFFFF" />
          <span>バトル開始！</span>
        </button>
      </div>
    </div>
  );
};

const StatItem: React.FC<{ label: string; value: string; ratio: number; color: string }> = ({
  label,
  value,
  ratio,
  color,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
    <span style={{ width: '42px', color: '#94A3B8', fontWeight: 600 }}>{label}</span>
    <div
      style={{
        flex: 1,
        height: '6px',
        backgroundColor: '#1E2536',
        borderRadius: '3px',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${Math.min(100, Math.round(ratio * 100))}%`,
          height: '100%',
          backgroundColor: color,
        }}
      />
    </div>
    <span style={{ width: '40px', textAlign: 'right', fontWeight: 700, color: '#FFFFFF' }}>{value}</span>
  </div>
);
