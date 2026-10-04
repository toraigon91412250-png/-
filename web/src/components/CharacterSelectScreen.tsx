import React, { useState } from 'react';
import { CharacterDef, CpuDifficulty, IrenaSkillId, IrenaSkillProgress, FeatherSkillPath, RuinSkillPath, OverallStats } from '../types/game';
import { getIrenaWithSkillProgress, KAISER } from '../data/characters';
import arenaBg from '../assets/img_arena_bg.jpg';
import { Swords, Trophy, Play, CheckCircle, Sparkles } from 'lucide-react';
import SkillUpgradeModal from './SkillUpgradeModal';

interface CharacterSelectScreenProps {
  overallStats: OverallStats;
  selectedDifficulty: CpuDifficulty;
  onSelectDifficulty: (diff: CpuDifficulty) => void;
  onStartBattle: () => void;
  onOpenRaidBoss: () => void;
  onOpenRecruitment: () => void;
  skillProgress: IrenaSkillProgress;
  onUpgradeSkill: (skillId: IrenaSkillId) => void;
  onChooseSkillPath: (skillId: IrenaSkillId, path: FeatherSkillPath | RuinSkillPath) => void;
}

export const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({
  overallStats,
  selectedDifficulty,
  onSelectDifficulty,
  onStartBattle,
  onOpenRaidBoss,
  onOpenRecruitment,
  skillProgress,
  onUpgradeSkill,
  onChooseSkillPath,
}) => {
  const [viewingChar, setViewingChar] = useState<CharacterDef | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const pathLabel = (path: string | null) => {
    const labels: Record<string, string> = {
      ABYSS: '深淵',
      JUDGMENT: '断罪',
      CHARGE: '蓄積',
      EXECUTION: '処刑',
      ANNIHILATION: '殲滅',
    };
    return path ? labels[path] ?? path : '';
  };

  const playerChar = getIrenaWithSkillProgress(skillProgress);
  const cpuChar = KAISER;
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

        {/* Fixed matchup: the player controls Irena only; Kaiser is CPU-only. */}
        <div style={{ width: '100%', textAlign: 'left', marginBottom: '8px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF' }}>対戦キャラクター</h2>
        </div>
        <div style={{
          width: '100%', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px', marginBottom: '18px',
        }}>
          {[
            { char: playerChar, role: 'あなた' },
            { char: KAISER, role: 'CPU' },
          ].map(({ char, role }) => (
            <div key={char.id} style={{
              backgroundColor: '#1E2436', border: `2px solid ${char.primaryColor}`, borderRadius: '16px',
              padding: '12px', display: 'flex', flexDirection: 'column', boxShadow: `0 0 16px ${char.primaryColor}25`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{
                  fontSize: '10px', fontWeight: 800, color: char.primaryColor, backgroundColor: `${char.primaryColor}25`,
                  padding: '2px 7px', borderRadius: '4px',
                }}>{role}</span>
                {role === 'あなた' && <CheckCircle size={18} color="#64FFDA" />}
              </div>
              <div style={{
                width: '100%', height: char.selectImageSrc ? '200px' : '140px', borderRadius: '10px', overflow: 'hidden',
                border: `1px solid ${char.primaryColor}80`, marginBottom: '8px', backgroundColor: '#0a0d16', position: 'relative',
              }}>
                <img src={char.selectImageSrc ?? char.imageSrc} alt={char.name} style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  objectPosition: char.selectImageSrc ? 'center 22%' : 'center', display: 'block',
                }} />
                <button type="button" onClick={() => setViewingChar(char)} style={{
                  position: 'absolute', right: '6px', bottom: '6px', backgroundColor: 'rgba(10, 13, 22, 0.75)',
                  border: `1px solid ${char.primaryColor}`, color: '#FFFFFF', fontSize: '10px', fontWeight: 700,
                  borderRadius: '6px', padding: '3px 8px', cursor: 'pointer',
                }}>🔍 全身を見る</button>
              </div>
              <div style={{ fontSize: '17px', fontWeight: 900, color: '#FFFFFF', marginBottom: '8px' }}>{char.name}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                <StatItem label="HP" value={char.maxHp.toString()} ratio={char.maxHp / 1200} color="#66BB6A" />
                <StatItem label="攻撃力" value={char.attack.toString()} ratio={char.attack / 200} color="#EF5350" />
                <StatItem label="防御力" value={char.defense.toString()} ratio={char.defense / 200} color="#42A5F5" />
                <StatItem label="素早さ" value={char.speed.toString()} ratio={char.speed / 150} color="#FFCA28" />
                <StatItem label="回避率" value={`${Math.round(char.evasionRate * 100)}%`} ratio={char.evasionRate / 0.3} color="#26C6DA" />
              </div>
              <div style={{
                backgroundColor: '#1E1C2B', border: '1px solid #4A3B69', borderRadius: '8px',
                padding: '6px 8px', marginBottom: '6px', fontSize: '11px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#D1C4E9', marginBottom: '2px' }}>
                  <Sparkles size={12} color="#B39DDB" /><span>固有能力「{char.passiveName}」</span>
                </div>
                <div style={{ color: '#B0BEC5', fontSize: '10px', lineHeight: 1.3 }}>{char.passiveDescription}</div>
              </div>
              <div style={{ fontSize: '10px', color: '#90CAF9', lineHeight: 1.4 }}>
                <div>✨ 特殊「{char.specialSkillName}」: {char.specialSkillDamage}ダメ (CD:{char.specialSkillCooldown}T)</div>
                <div>🌟 必殺「{char.ultimateSkillName}」: {char.ultimateSkillDamage}ダメ (ゲージ3消費)</div>
              </div>
            </div>
          ))}
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
              あなた: {playerChar.name} (素早さ {playerChar.speed})
            </span>
            <span style={{ color: '#FF5252', fontWeight: 900 }}>VS</span>
            <span style={{ color: '#FFCC80' }}>
              CPU: {cpuChar.name} (素早さ {cpuChar.speed})
            </span>
          </div>

          <div style={{ fontSize: '11px', color: '#B0BEC5' }}>
            {playerChar.speed > cpuChar.speed
              ? '⚡ あなたの素早さが高いため、毎ターン先手で行動できます！'
              : '🌀 相手の素早さが高いため、相手が先手で行動します。回避や強化を上手く活用しましょう！'}
          </div>
        </div>

        {/* Persistent Irena growth */}
        <div style={{ width: '100%', marginBottom: '18px', padding: '12px', borderRadius: '14px', background: 'linear-gradient(135deg, rgba(28,20,48,0.96), rgba(14,20,34,0.96))', border: '1px solid rgba(179,157,219,0.42)', boxShadow: '0 8px 20px rgba(0,0,0,0.22)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.16em', color: '#B39DDB' }}>IRENA GROWTH</div>
              <div style={{ marginTop: '3px', fontSize: '16px', fontWeight: 950, color: '#FFFFFF' }}>いれーなの成長</div>
            </div>
            <div style={{ color: '#FFE082', fontSize: '12px', fontWeight: 900 }}>✦ {skillProgress.shards} 欠片</div>
          </div>
          <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
            <div style={{ padding: '8px', borderRadius: '9px', background: 'rgba(126,87,194,0.12)', border: '1px solid rgba(149,117,205,0.25)' }}>
              <div style={{ fontSize: '10px', color: '#BDB4D0', fontWeight: 800 }}>羽弾</div>
              <div style={{ marginTop: '2px', fontSize: '15px', color: '#FFFFFF', fontWeight: 950 }}>Lv.{skillProgress.featherLevel}{skillProgress.featherPath ? ' ・ ' + pathLabel(skillProgress.featherPath) : ''}</div>
            </div>
            <div style={{ padding: '8px', borderRadius: '9px', background: 'rgba(198,40,40,0.10)', border: '1px solid rgba(239,83,80,0.24)' }}>
              <div style={{ fontSize: '10px', color: '#CDB7B7', fontWeight: 800 }}>破壊の権能</div>
              <div style={{ marginTop: '2px', fontSize: '15px', color: '#FFFFFF', fontWeight: 950 }}>Lv.{skillProgress.ruinLevel}{skillProgress.ruinPath ? ' ・ ' + pathLabel(skillProgress.ruinPath) : ''}</div>
            </div>
          </div>
          <button type='button' onClick={() => setUpgradeOpen(true)} style={{ width: '100%', height: '42px', marginTop: '9px', borderRadius: '10px', background: 'linear-gradient(90deg,#6A1B9A,#8E24AA)', color: '#FFFFFF', border: '1px solid #D1C4E9', fontSize: '13px', fontWeight: 950, cursor: 'pointer' }}>
            ✨ 技を強化・ビルドを育てる
          </button>
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

        {/* Black Wing Summon */}
        <button
          type="button"
          onClick={onOpenRecruitment}
          style={{
            width: '100%',
            height: '50px',
            marginBottom: '8px',
            background: 'linear-gradient(135deg, #2A1744 0%, #17122A 55%, #3A2910 100%)',
            color: '#FFFFFF',
            border: '1.5px solid #B39DDB',
            borderRadius: '14px',
            fontSize: '16px',
            fontWeight: 950,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            boxShadow: '0 4px 18px rgba(126, 87, 194, 0.22)',
          }}
        >
          <Sparkles size={19} color="#FFE082" />
          <span>黒翼召喚</span>
          <span style={{ fontSize: '9px', color: '#C5B8D9', fontWeight: 800 }}>SUMMON</span>
        </button>

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

        <button
          type="button"
          onClick={onOpenRaidBoss}
          style={{
            width: '100%',
            height: '50px',
            marginTop: '8px',
            backgroundColor: '#24173A',
            color: '#FFD54F',
            border: '1.5px solid #8E6BBE',
            borderRadius: '14px',
            fontSize: '16px',
            fontWeight: 900,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>👹</span>
          <span>レイドボスに挑戦</span>
        </button>
      </div>

      {/* Full Art Viewer */}
      {viewingChar && (
        <ArtViewer char={viewingChar} onClose={() => setViewingChar(null)} />
      )}
      {upgradeOpen && (
        <SkillUpgradeModal
          progress={skillProgress}
          onUpgrade={onUpgradeSkill}
          onChoosePath={onChooseSkillPath}
          onClose={() => setUpgradeOpen(false)}
        />
      )}
    </div>
  );
};

const VIEWER_FEATHERS = Array.from({ length: 10 }, (_, i) => ({
  left: (i * 37 + 7) % 100,
  delay: (i * 0.9) % 6,
  duration: 6 + (i % 4) * 1.5,
  size: 14 + (i % 3) * 6,
}));

const ArtViewer: React.FC<{ char: CharacterDef; onClose: () => void }> = ({ char, onClose }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed',
      inset: 0,
      zIndex: 100,
      backgroundColor: 'rgba(5, 6, 12, 0.88)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      overflow: 'hidden',
      cursor: 'pointer',
    }}
  >
    <style>{`
      @keyframes viewerFeatherFall {
        0% { transform: translateY(-10vh) rotate(0deg); opacity: 0; }
        10% { opacity: 0.9; }
        100% { transform: translateY(110vh) rotate(360deg) translateX(40px); opacity: 0; }
      }
      @keyframes viewerPopIn {
        0% { transform: scale(0.92); opacity: 0; }
        100% { transform: scale(1); opacity: 1; }
      }
    `}</style>
    {VIEWER_FEATHERS.map((f, i) => (
      <div
        key={i}
        style={{
          position: 'absolute',
          top: 0,
          left: `${f.left}%`,
          fontSize: `${f.size}px`,
          opacity: 0,
          pointerEvents: 'none',
          filter: `drop-shadow(0 0 6px ${char.primaryColor})`,
          animation: `viewerFeatherFall ${f.duration}s linear ${f.delay}s infinite`,
        }}
      >
        🪶
      </div>
    ))}
    <img
      src={char.selectImageSrc ?? char.imageSrc}
      alt={char.name}
      style={{
        maxWidth: '100%',
        maxHeight: '78vh',
        objectFit: 'contain',
        borderRadius: '14px',
        border: `2px solid ${char.primaryColor}`,
        boxShadow: `0 0 40px ${char.primaryColor}80`,
        animation: 'viewerPopIn 0.25s ease-out',
        position: 'relative',
      }}
    />
    <div style={{ marginTop: '12px', textAlign: 'center', position: 'relative' }}>
      <div style={{ fontSize: '11px', fontWeight: 700, color: char.primaryColor }}>{char.title}</div>
      <div style={{ fontSize: '22px', fontWeight: 900, color: '#FFFFFF' }}>{char.name}</div>
      <div style={{ fontSize: '12px', color: '#FFD54F', marginTop: '2px' }}>「{char.ultimateSlogan}」</div>
      <div style={{ fontSize: '10px', color: '#78909C', marginTop: '8px' }}>タップして閉じる</div>
    </div>
  </div>
);

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
