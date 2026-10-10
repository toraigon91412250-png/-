import React, { useState } from 'react';
import { CharacterDef, IrenaSkillId, IrenaSkillProgress, FeatherSkillPath, RuinSkillPath, OverallStats, RaidRewardProgress } from '../types/game';
import { getIrenaWithSkillProgress, KAISER } from '../data/characters';
import arenaBg from '../assets/img_arena_bg.jpg';
import { Swords, Trophy, Play, CheckCircle, Gem } from 'lucide-react';
import SkillUpgradeModal from './SkillUpgradeModal';

interface CharacterSelectScreenProps {
  overallStats: OverallStats;
  onStartBattle: () => void;
  skillProgress: IrenaSkillProgress;
  raidRewardProgress: RaidRewardProgress;
  raidItemMessage: string | null;
  onUseRaidCoreFragment: () => void;
  onUpgradeSkill: (skillId: IrenaSkillId) => void;
  onChooseSkillPath: (skillId: IrenaSkillId, path: FeatherSkillPath | RuinSkillPath) => void;
}

export const CharacterSelectScreen: React.FC<CharacterSelectScreenProps> = ({
  overallStats,
  onStartBattle,
  skillProgress,
  raidRewardProgress,
  raidItemMessage,
  onUseRaidCoreFragment,
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
        padding: '20px 16px 108px 16px',
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

        {/* Compact matchup cards keep the home screen scannable. */}
        <div style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '10px',
          marginBottom: '14px',
        }}>
          {[
            { char: playerChar, role: 'あなた' },
            { char: KAISER, role: 'CPU' },
          ].map(({ char, role }) => (
            <div key={char.id} style={{
              minWidth: 0,
              background: 'linear-gradient(155deg, rgba(28,35,53,0.98), rgba(16,20,32,0.98))',
              border: `1px solid ${char.primaryColor}99`,
              borderRadius: '14px',
              padding: '9px',
              boxShadow: `0 4px 16px ${char.primaryColor}18`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '4px', marginBottom: '7px' }}>
                <span style={{
                  fontSize: '10px',
                  fontWeight: 900,
                  color: char.primaryColor,
                  background: `${char.primaryColor}20`,
                  padding: '3px 7px',
                  borderRadius: '5px',
                }}>{role}</span>
                {role === 'あなた' && <CheckCircle size={15} color="#64FFDA" />}
              </div>
              <div style={{ width: '100%', height: '104px', borderRadius: '9px', overflow: 'hidden', background: '#0a0d16', border: `1px solid ${char.primaryColor}55` }}>
                <img
                  src={char.selectImageSrc ?? char.imageSrc}
                  alt={char.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: char.selectImageSrc ? 'center 22%' : 'center',
                    display: 'block',
                  }}
                />
              </div>
              <div style={{ marginTop: '7px', fontSize: '15px', fontWeight: 950, color: '#FFFFFF', overflowWrap: 'anywhere' }}>{char.name}</div>
              <div style={{ marginTop: '3px', fontSize: '10px', lineHeight: 1.5, color: '#C1CDDC' }}>
                HP {char.maxHp.toLocaleString()} · 攻撃 {char.attack}
              </div>
              <button
                type="button"
                onClick={() => setViewingChar(char)}
                aria-label={char.name + 'の全身を見る'}
                style={{
                  width: '100%',
                  minHeight: '31px',
                  marginTop: '7px',
                  borderRadius: '7px',
                  border: '1px solid #46536B',
                  background: 'rgba(10,13,22,0.78)',
                  color: '#DCE6F5',
                  fontSize: '10px',
                  fontWeight: 850,
                  cursor: 'pointer',
                }}
              >
                全身を見る
              </button>
              <details style={{ marginTop: '7px', borderTop: '1px solid #30394D', paddingTop: '6px' }}>
                <summary style={{ cursor: 'pointer', color: '#90CAF9', fontSize: '10px', fontWeight: 850 }}>能力・詳細を表示</summary>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                  <StatItem label="HP" value={char.maxHp.toString()} ratio={char.maxHp / 4000} color="#66BB6A" />
                  <StatItem label="攻撃力" value={char.attack.toString()} ratio={char.attack / 400} color="#EF5350" />
                  <StatItem label="防御力" value={char.defense.toString()} ratio={char.defense / 200} color="#42A5F5" />
                  <StatItem label="素早さ" value={char.speed.toString()} ratio={char.speed / 240} color="#FFCA28" />
                  <StatItem label="回避率" value={`${Math.round(char.evasionRate * 100)}%`} ratio={char.evasionRate / 0.3} color="#26C6DA" />
                </div>
                <div style={{ marginTop: '8px', padding: '7px', borderRadius: '8px', background: '#1E1C2B', border: '1px solid #4A3B69' }}>
                  <div style={{ fontSize: '10px', fontWeight: 800, color: '#D1C4E9', marginBottom: '3px' }}>固有能力「{char.passiveName}」</div>
                  <div style={{ color: '#B0BEC5', fontSize: '10px', lineHeight: 1.45 }}>{char.passiveDescription}</div>
                </div>
                <div style={{ marginTop: '7px', fontSize: '10px', lineHeight: 1.5, color: '#90CAF9' }}>
                  <div>特殊「{char.specialSkillName}」: {char.specialSkillDamage}ダメ (CD:{char.specialSkillCooldown}T)</div>
                  <div>必殺「{char.ultimateSkillName}」: {char.ultimateSkillDamage}ダメ (ゲージ3消費)</div>
                </div>
              </details>
            </div>
          ))}
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

        <details
          aria-label="レイド限定アイテム"
          style={{
            width: '100%',
            marginBottom: '12px',
            borderRadius: '12px',
            border: '1px solid rgba(91,205,205,0.35)',
            background: 'rgba(9,31,45,0.72)',
            overflow: 'hidden',
          }}
        >
          <summary style={{
            listStyle: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            padding: '12px',
            color: '#DDFBFF',
            fontSize: '12px',
            fontWeight: 900,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}><Gem size={16} color="#81E6DF" />深淵核片・アイテム</span>
            <span style={{ color: '#81E6DF', fontSize: '11px' }}>所持 {raidRewardProgress.coreFragments} 個　⌄</span>
          </summary>
        {/* Raid-exclusive item: redeemable only after clearing the standalone raid. */}
        <section aria-label="レイド限定アイテム詳細" style={{
          width: '100%',
          marginBottom: '18px',
          padding: '13px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(9,31,45,0.98), rgba(14,20,36,0.98))',
          border: '1px solid rgba(91,205,205,0.42)',
          boxShadow: '0 8px 22px rgba(0,0,0,0.24)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
              <div style={{ width: '40px', height: '40px', flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: '10px', background: 'rgba(65,190,202,0.12)', border: '1px solid rgba(109,225,220,0.3)' }}>
                <Gem size={23} color="#81E6DF" />
              </div>
              <div>
                <div style={{ fontSize: '10px', fontWeight: 900, letterSpacing: '0.16em', color: '#81E6DF' }}>RAID EXCLUSIVE ITEM</div>
                <div style={{ marginTop: '2px', fontSize: '17px', fontWeight: 950, color: '#F3FCFF' }}>深淵核片</div>
                <div style={{ marginTop: '3px', fontSize: '10px', color: '#A2B8C8', lineHeight: 1.45 }}>レイド勝利でのみ入手。本編で使用するとステータス配分上限が永続的に +2P。</div>
              </div>
            </div>
            <div style={{ flex: '0 0 auto', textAlign: 'center', minWidth: '48px', padding: '6px 8px', borderRadius: '9px', background: 'rgba(101,224,218,0.08)', border: '1px solid rgba(101,224,218,0.22)' }}>
              <div style={{ fontSize: '9px', fontWeight: 800, color: '#8CA9BA' }}>所持数</div>
              <div aria-label={`深淵核片の所持数 ${raidRewardProgress.coreFragments}`} style={{ fontSize: '22px', fontWeight: 950, color: '#B7FFF7', lineHeight: 1.2 }}>{raidRewardProgress.coreFragments}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '11px', padding: '8px 9px', borderRadius: '9px', background: 'rgba(8,14,24,0.68)', color: '#D0E5EA', fontSize: '11px', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 900, color: '#81E6DF' }}>使用効果</span>
            <span>1個消費 → ステータス配分ポイント +2P</span>
            <span style={{ marginLeft: 'auto', color: '#7DE0D4', fontWeight: 900 }}>累計 +{raidRewardProgress.bonusStatPoints}P</span>
          </div>
          <button
            type="button"
            onClick={onUseRaidCoreFragment}
            disabled={raidRewardProgress.coreFragments <= 0}
            style={{
              width: '100%',
              minHeight: '42px',
              marginTop: '9px',
              borderRadius: '10px',
              border: '1px solid rgba(129,230,223,0.65)',
              background: raidRewardProgress.coreFragments > 0 ? 'linear-gradient(90deg, #145566, #187A83)' : 'rgba(31,47,57,0.72)',
              color: raidRewardProgress.coreFragments > 0 ? '#F1FFFF' : '#738A96',
              fontSize: '12px',
              fontWeight: 950,
              cursor: raidRewardProgress.coreFragments > 0 ? 'pointer' : 'not-allowed',
              opacity: raidRewardProgress.coreFragments > 0 ? 1 : 0.72,
            }}
          >
            {raidRewardProgress.coreFragments > 0 ? '深淵核片を使用する（+2P・永続）' : 'レイドをクリアすると入手できます'}
          </button>
          {raidItemMessage && (
            <p role="status" aria-live="polite" style={{ margin: '8px 2px 0', fontSize: '11px', lineHeight: 1.5, color: raidItemMessage.includes('失敗') || raidItemMessage.includes('ありません') ? '#FFB4A9' : '#9FF5D9' }}>
              {raidItemMessage}
            </p>
          )}
        </section>
        </details>



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
