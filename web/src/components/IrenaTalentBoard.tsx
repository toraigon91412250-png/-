import React from 'react';
import { ArrowLeft, Eye, Feather, MoonStar, Shield, Sparkles, Swords, RotateCcw } from 'lucide-react';
import {
  getAvailableIrenaTalentPoints,
  getIrenaLevelProgress,
  getIrenaTalentPointsForLevel,
  IrenaTalentId,
  IrenaTalentProgress,
  IRENA_TALENT_MAX_LEVEL,
  IRENA_TALENT_MAX_RANK,
  IRENA_TALENT_WIN_XP,
  IRENA_TALENT_LOSS_XP,
} from '../utils/irenaTalentSystem';

interface IrenaTalentBoardProps {
  progress: IrenaTalentProgress;
  message: string | null;
  onSpendPoint: (id: IrenaTalentId) => void;
  onResetTalents: () => void;
  onBack: () => void;
}

const TALENTS: Array<{
  id: IrenaTalentId;
  name: string;
  subtitle: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  effect: (rank: number) => string;
}> = [
  {
    id: 'WIND_READ',
    name: '風読み',
    subtitle: 'FORESIGHT',
    description: '相手の動きを読む力を磨き、先手と回避を伸ばす。',
    color: '#69D9C5',
    icon: <Eye size={23} />,
    effect: rank => `素早さ +${rank * 5}・回避率 +${rank}%`,
  },
  {
    id: 'FEATHER_RESONANCE',
    name: '羽脈共鳴',
    subtitle: 'FEATHER RESONANCE',
    description: '羽弾に流れる魔力を増幅し、特殊技を強化する。',
    color: '#A9B9FF',
    icon: <Feather size={23} />,
    effect: rank => `羽弾ダメージ +${rank * 6}%`,
  },
  {
    id: 'ABYSS_RESONANCE',
    name: '深淵共鳴',
    subtitle: 'ABYSS RESONANCE',
    description: '防御を少し犠牲にし、必殺技の破壊力を引き上げる。',
    color: '#E08AFF',
    icon: <MoonStar size={23} />,
    effect: rank => `必殺ダメージ +${rank * 8}%・防御力 -${rank * 3}`,
  },
  {
    id: 'RAVEN_ASSAULT',
    name: '黒翼の牙',
    subtitle: 'RAVEN ASSAULT',
    description: '通常攻撃で攻め続けたいプレイヤー向けの攻撃型。',
    color: '#FF9B8A',
    icon: <Swords size={23} />,
    effect: rank => `攻撃力 +${rank * 5}%`,
  },
  {
    id: 'LAST_WING',
    name: '不屈の翼',
    subtitle: 'LAST WING',
    description: '最大HPを高め、強敵との長期戦で立て直す余裕を作る。',
    color: '#9EC7FF',
    icon: <Shield size={23} />,
    effect: rank => `最大HP +${rank * 5}%`,
  },
];

export const IrenaTalentBoard: React.FC<IrenaTalentBoardProps> = ({
  progress,
  message,
  onSpendPoint,
  onResetTalents,
  onBack,
}) => {
  const [showResetConfirmation, setShowResetConfirmation] = React.useState(false);
  const levelProgress = getIrenaLevelProgress(progress.experience);
  const availablePoints = getAvailableIrenaTalentPoints(progress);
  const earnedPoints = getIrenaTalentPointsForLevel(levelProgress.level);
  const spentPoints = Object.values(progress.ranks).reduce((sum, rank) => sum + rank, 0);
  const maxLevel = levelProgress.level >= IRENA_TALENT_MAX_LEVEL;

  return (
    <div className="talent-board-screen" style={{
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      boxSizing: 'border-box',
      padding: '18px 14px 110px',
      background: 'radial-gradient(ellipse at 50% 0%, #302044 0%, #111523 48%, #090B12 100%)',
      color: '#F5F3FF',
    }}>
      <div style={{ width: '100%', maxWidth: '720px', margin: '0 auto' }}>
        <button type="button" onClick={onBack} style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          minHeight: '40px',
          padding: '8px 12px',
          marginBottom: '14px',
          borderRadius: '10px',
          border: '1px solid #4A4562',
          background: 'rgba(18,20,34,0.9)',
          color: '#E1DBF3',
          fontWeight: 850,
          cursor: 'pointer',
        }}>
          <ArrowLeft size={17} /> ホームに戻る
        </button>

        <header style={{
          padding: '18px',
          borderRadius: '18px',
          border: '1px solid rgba(190,148,255,0.42)',
          background: 'linear-gradient(135deg, rgba(47,31,68,0.96), rgba(15,19,33,0.98))',
          boxShadow: '0 10px 30px rgba(0,0,0,0.26)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#D8B7FF', fontSize: '10px', fontWeight: 950, letterSpacing: '0.18em' }}>
            <Sparkles size={15} /> IRENA · TALENT BOARD
          </div>
          <h1 style={{ margin: '7px 0 4px', fontSize: '27px', fontWeight: 950 }}>堕天の才能盤</h1>
          <p style={{ margin: 0, color: '#B8B6CD', fontSize: '12px', lineHeight: 1.6 }}>
            戦闘経験でいれーなを育て、好きな才能にポイントを振り分けよう。
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '12px', marginTop: '20px' }}>
            <div>
              <div style={{ color: '#AFA7C5', fontSize: '10px', fontWeight: 850, letterSpacing: '0.12em' }}>IRENA LEVEL</div>
              <div aria-label={`いれーなレベル ${levelProgress.level}`} style={{ marginTop: '2px', fontSize: '36px', lineHeight: 1.1, fontWeight: 950 }}>Lv.{levelProgress.level}<span style={{ fontSize: '12px', color: '#C7B7E5' }}> / {IRENA_TALENT_MAX_LEVEL}</span></div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ color: '#AFA7C5', fontSize: '10px', fontWeight: 850 }}>才能ポイント</div>
              <div aria-label={`未使用才能ポイント ${availablePoints}`} style={{ fontSize: '27px', fontWeight: 950, color: availablePoints > 0 ? '#FFE18A' : '#F5F3FF' }}>
                {availablePoints}<span style={{ fontSize: '12px', color: '#B8B6CD' }}> / {earnedPoints}</span>
              </div>
            </div>
          </div>

          <div style={{ height: '9px', marginTop: '13px', overflow: 'hidden', borderRadius: '99px', background: '#29243B', border: '1px solid #504264' }}>
            <div
              role="progressbar"
              aria-label="いれーな経験値"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(levelProgress.progressPercent)}
              style={{ width: `${levelProgress.progressPercent}%`, height: '100%', borderRadius: '99px', background: 'linear-gradient(90deg, #9C67EF, #F0B4FF)', transition: 'width 180ms ease' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginTop: '6px', fontSize: '10px', color: '#B8B6CD' }}>
            <span>{maxLevel ? '最大レベル到達' : `EXP ${progress.experience - levelProgress.currentLevelXp} / ${levelProgress.nextLevelXp - levelProgress.currentLevelXp}`}</span>
            <span>{maxLevel ? 'MAX' : `次のレベルまで ${levelProgress.nextLevelXp - progress.experience} EXP`}</span>
          </div>
          <div style={{ marginTop: '12px', padding: '9px 10px', borderRadius: '10px', background: 'rgba(9,11,20,0.55)', color: '#D9D2EA', fontSize: '11px', lineHeight: 1.6 }}>
            勝利で {IRENA_TALENT_WIN_XP} EXP、敗北でも {IRENA_TALENT_LOSS_XP} EXP。Lv.2、4、6…18で才能ポイントを1獲得。最大Lv.{IRENA_TALENT_MAX_LEVEL}。5つの才能から、合計9Pで自分の戦い方を組み立てよう。
          </div>
        </header>

        <div style={{ marginTop: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: '8px' }}>
          <div>
            <div style={{ color: '#BFA0EA', fontSize: '10px', fontWeight: 950, letterSpacing: '0.16em' }}>CHOOSE YOUR STYLE</div>
            <h2 style={{ margin: '4px 0 0', fontSize: '20px', fontWeight: 950 }}>才能を選ぶ</h2>
          </div>
          <div style={{ color: '#A8A1BD', fontSize: '10px' }}>使用 {spentPoints} / {earnedPoints} P</div>
        </div>

        <div style={{ display: 'grid', gap: '10px', marginTop: '11px' }}>
          {TALENTS.map(talent => {
            const rank = progress.ranks[talent.id];
            const atMaxRank = rank >= IRENA_TALENT_MAX_RANK;
            const canUpgrade = availablePoints > 0 && !atMaxRank;
            return (
              <section key={talent.id} aria-label={talent.name} style={{
                padding: '14px',
                borderRadius: '15px',
                border: `1px solid ${talent.color}55`,
                background: 'linear-gradient(145deg, rgba(24,27,43,0.98), rgba(15,17,29,0.98))',
                boxShadow: rank > 0 ? `inset 3px 0 0 ${talent.color}, 0 6px 18px rgba(0,0,0,0.16)` : '0 6px 18px rgba(0,0,0,0.16)',
              }}>
                <div style={{ display: 'flex', gap: '11px', alignItems: 'start' }}>
                  <div style={{ width: '44px', height: '44px', flex: '0 0 auto', display: 'grid', placeItems: 'center', borderRadius: '12px', color: talent.color, background: `${talent.color}18`, border: `1px solid ${talent.color}55` }}>
                    {talent.icon}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ color: talent.color, fontSize: '9px', fontWeight: 950, letterSpacing: '0.12em' }}>{talent.subtitle}</div>
                    <h3 style={{ margin: '3px 0 4px', fontSize: '17px', fontWeight: 950 }}>{talent.name}</h3>
                    <p style={{ margin: 0, color: '#B8B6CD', fontSize: '11px', lineHeight: 1.55 }}>{talent.description}</p>
                  </div>
                  <div style={{ flex: '0 0 auto', padding: '5px 7px', borderRadius: '8px', border: `1px solid ${talent.color}55`, color: talent.color, fontSize: '11px', fontWeight: 950 }}>
                    {rank}/{IRENA_TALENT_MAX_RANK}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '5px', marginTop: '12px' }}>
                  {Array.from({ length: IRENA_TALENT_MAX_RANK }, (_, index) => (
                    <div key={index} style={{ flex: 1, height: '5px', borderRadius: '99px', background: index < rank ? talent.color : '#333344' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginTop: '10px' }}>
                  <div style={{ color: rank > 0 ? '#F2E8FF' : '#928BA8', fontSize: '11px', fontWeight: 850 }}>{talent.effect(rank)}</div>
                  <button
                    type="button"
                    aria-label={`${talent.name}を強化`}
                    onClick={() => onSpendPoint(talent.id)}
                    disabled={!canUpgrade}
                    style={{
                      minHeight: '36px',
                      flex: '0 0 auto',
                      padding: '7px 10px',
                      borderRadius: '9px',
                      border: canUpgrade ? `1px solid ${talent.color}` : '1px solid #414153',
                      background: canUpgrade ? `${talent.color}20` : '#202130',
                      color: canUpgrade ? '#FFFFFF' : '#89869A',
                      fontSize: '11px',
                      fontWeight: 950,
                      cursor: canUpgrade ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {atMaxRank ? 'MAX' : '強化 +1'}
                  </button>
                </div>
              </section>
            );
          })}
        </div>

        {spentPoints > 0 && (
          <div style={{ marginTop: '14px', padding: '12px', borderRadius: '12px', border: '1px solid #4A4562', background: 'rgba(12,14,24,0.75)' }}>
            {!showResetConfirmation ? (
              <button
                type="button"
                aria-label="才能ポイントを振り直す"
                onClick={() => setShowResetConfirmation(true)}
                style={{ width: '100%', minHeight: '42px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px', borderRadius: '9px', border: '1px solid #8D7BA8', background: 'rgba(111,86,146,0.16)', color: '#E4D5FF', fontSize: '12px', fontWeight: 900, cursor: 'pointer' }}
              >
                <RotateCcw size={15} /> 才能を振り直す
              </button>
            ) : (
              <div role="alertdialog" aria-label="才能振り直しの確認">
                <p style={{ margin: '0 0 10px', color: '#E8E1F5', fontSize: '12px', lineHeight: 1.6 }}>
                  全才能ポイントを未使用に戻します。レベルと経験値は失われず、いつでも再配分できます。
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button type="button" aria-label="才能を振り直すことを確定" onClick={() => { setShowResetConfirmation(false); onResetTalents(); }} style={{ minHeight: '40px', borderRadius: '9px', border: '1px solid #C8A7FF', background: 'rgba(157,111,219,0.24)', color: '#FFFFFF', fontWeight: 900, cursor: 'pointer' }}>
                    振り直す
                  </button>
                  <button type="button" aria-label="振り直しをキャンセル" onClick={() => setShowResetConfirmation(false)} style={{ minHeight: '40px', borderRadius: '9px', border: '1px solid #4A4562', background: 'rgba(26,28,42,0.9)', color: '#C9C4D9', fontWeight: 850, cursor: 'pointer' }}>
                    キャンセル
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {message && (
          <p role="status" aria-live="polite" style={{ margin: '12px 2px 0', color: message.includes('失敗') ? '#FFB4A9' : '#9FF5D9', fontSize: '12px', lineHeight: 1.5 }}>
            {message}
          </p>
        )}

        <p style={{ margin: '14px 2px 0', color: '#938CA6', fontSize: '10px', lineHeight: 1.6 }}>
          効果は次の戦闘から反映。合計9Pでは全5系統を最大化できないため、攻撃・耐久・技巧を組み合わせよう。経験値を失わず無料で何度でも再配分できます。
        </p>
      </div>
    </div>
  );
};
