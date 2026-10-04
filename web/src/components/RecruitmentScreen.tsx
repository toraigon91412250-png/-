import React, { useState } from 'react';
import {
  ArrowLeft,
  Award,
  Check,
  Crown,
  Feather,
  Gift,
  Sparkles,
  Ticket,
  Zap,
} from 'lucide-react';
import { IRENA } from '../data/characters';
import {
  RECRUITMENT_REWARD_SEQUENCE,
  RecruitmentDraw,
  RecruitmentRewardDef,
  getRecruitmentRewardForPull,
} from '../data/recruitment';
import { RecruitmentProgress } from '../types/game';

interface Props {
  progress: RecruitmentProgress;
  onRecruit: (count: 1 | 10) => { progress: RecruitmentProgress; results: RecruitmentDraw[] } | null;
  onBack: () => void;
}

const rarityMeta: Record<
  RecruitmentRewardDef['rarity'],
  { label: string; icon: React.ReactNode; glow: string; border: string; bg: string }
> = {
  R: {
    label: 'RARE',
    icon: <Feather size={16} />,
    glow: 'rgba(144, 202, 249, 0.45)',
    border: '#64B5F6',
    bg: 'rgba(25, 66, 104, 0.72)',
  },
  SR: {
    label: 'SUPER RARE',
    icon: <Sparkles size={16} />,
    glow: 'rgba(186, 104, 200, 0.55)',
    border: '#CE93D8',
    bg: 'rgba(74, 33, 91, 0.78)',
  },
  SSR: {
    label: 'ULTRA RARE',
    icon: <Crown size={17} />,
    glow: 'rgba(255, 213, 79, 0.72)',
    border: '#FFD54F',
    bg: 'rgba(91, 62, 12, 0.84)',
  },
};

export const RecruitmentScreen: React.FC<Props> = ({ progress, onRecruit, onBack }) => {
  const [revealing, setRevealing] = useState(false);
  const [results, setResults] = useState<RecruitmentDraw[]>([]);

  const nextPull = getRecruitmentRewardForPull(progress.totalPulls + 1);
  const collectedCount = progress.collectedIds.length;
  const maxCollection = RECRUITMENT_REWARD_SEQUENCE.length;

  const handleRecruit = (count: 1 | 10) => {
    if (revealing || progress.tickets < count) return;
    setRevealing(true);
    setResults([]);

    window.setTimeout(() => {
      const outcome = onRecruit(count);
      if (outcome) {
        setResults(outcome.results);
      }
      setRevealing(false);
    }, count === 10 ? 850 : 650);
  };

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        background:
          'radial-gradient(circle at 78% 18%, rgba(126,87,194,0.18), transparent 28%), linear-gradient(180deg, #080A12 0%, #101426 52%, #080B13 100%)',
        color: '#FFFFFF',
      }}
    >
      <style>{`
        @keyframes summonPulse {
          0%, 100% { transform: scale(0.96); opacity: 0.45; }
          50% { transform: scale(1.04); opacity: 0.9; }
        }
        @keyframes summonSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes rewardReveal {
          0% { transform: translateY(18px) scale(0.86); opacity: 0; filter: brightness(2); }
          55% { transform: translateY(-4px) scale(1.03); opacity: 1; filter: brightness(1.2); }
          100% { transform: translateY(0) scale(1); opacity: 1; filter: brightness(1); }
        }
        @keyframes shineSweep {
          0% { transform: translateX(-130%) skewX(-18deg); }
          100% { transform: translateX(240%) skewX(-18deg); }
        }
        @keyframes ticketGlow {
          0%, 100% { box-shadow: 0 0 0 rgba(255,224,130,0); }
          50% { box-shadow: 0 0 26px rgba(255,224,130,0.22); }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background:
            'linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.035) 45%, transparent 52%), radial-gradient(circle at 18% 78%, rgba(38,166,154,0.08), transparent 25%)',
        }}
      />

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '760px',
          minHeight: '100%',
          margin: '0 auto',
          padding: '18px 14px 30px',
          boxSizing: 'border-box',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '14px',
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              width: '42px',
              height: '42px',
              flexShrink: 0,
              borderRadius: '12px',
              border: '1px solid #33415F',
              background: 'rgba(9,13,22,0.82)',
              color: '#FFFFFF',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
            }}
            aria-label="戻る"
          >
            <ArrowLeft size={19} />
          </button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: '#B39DDB',
                fontSize: '10px',
                letterSpacing: '0.24em',
                fontWeight: 900,
              }}
            >
              BLACK WING SUMMON
            </div>
            <div
              style={{
                marginTop: '3px',
                fontSize: '25px',
                lineHeight: 1,
                fontWeight: 950,
                letterSpacing: '0.06em',
              }}
            >
              黒翼召喚
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 11px',
              borderRadius: '12px',
              border: '1px solid rgba(255,224,130,0.48)',
              background: 'rgba(29,24,16,0.92)',
              animation: 'ticketGlow 2.4s ease-in-out infinite',
            }}
          >
            <Ticket size={17} color="#FFE082" />
            <div>
              <div style={{ color: '#BDB7AB', fontSize: '8px', fontWeight: 800 }}>召喚札</div>
              <div style={{ color: '#FFE082', fontSize: '19px', fontWeight: 950, lineHeight: 1 }}>
                {progress.tickets}
              </div>
            </div>
          </div>
        </header>

        <section
          style={{
            position: 'relative',
            minHeight: '246px',
            overflow: 'hidden',
            borderRadius: '22px',
            border: '1px solid rgba(179,157,219,0.38)',
            background:
              'linear-gradient(115deg, rgba(11,14,25,0.98) 0%, rgba(26,20,47,0.94) 46%, rgba(12,17,31,0.98) 100%)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.45), inset 0 0 48px rgba(126,87,194,0.08)',
          }}
        >
          <img
            src={IRENA.selectImageSrc ?? IRENA.imageSrc}
            alt=""
            style={{
              position: 'absolute',
              right: '-8px',
              bottom: '-42px',
              width: '48%',
              maxWidth: '360px',
              opacity: 0.28,
              objectFit: 'contain',
              objectPosition: 'center',
              filter: 'saturate(0.9) contrast(1.05)',
              pointerEvents: 'none',
              maskImage: 'linear-gradient(to left, black 55%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to left, black 55%, transparent 100%)',
            }}
          />

          <div
            style={{
              position: 'absolute',
              width: '220px',
              height: '220px',
              borderRadius: '50%',
              right: '10%',
              top: '15px',
              border: '1px solid rgba(179,157,219,0.24)',
              boxShadow: '0 0 70px rgba(126,87,194,0.16)',
              animation: 'summonPulse 4.5s ease-in-out infinite',
            }}
          />

          <div
            style={{
              position: 'absolute',
              width: '150px',
              height: '150px',
              right: '15%',
              top: '50px',
              borderRadius: '50%',
              border: '1px dashed rgba(255,224,130,0.22)',
              animation: 'summonSpin 18s linear infinite',
            }}
          />

          <div style={{ position: 'relative', zIndex: 2, width: '60%', minWidth: '280px', padding: '22px 18px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 8px',
                borderRadius: '999px',
                background: 'rgba(126,87,194,0.16)',
                border: '1px solid rgba(179,157,219,0.24)',
                color: '#D1C4E9',
                fontSize: '9px',
                fontWeight: 900,
                letterSpacing: '0.14em',
              }}
            >
              <Zap size={12} /> FIXED REWARD ROUTE
            </div>

            <h1 style={{ margin: '14px 0 6px', fontSize: '31px', fontWeight: 950, letterSpacing: '0.03em' }}>
              黒翼の記憶を引き出す
            </h1>
            <p style={{ margin: 0, maxWidth: '440px', color: '#AAB6C8', fontSize: '11px', lineHeight: 1.65 }}>
              戦闘で集めた召喚札から、いれーなの戦技を象徴する収集報酬を獲得。
              初回獲得はコレクションへ登録され、重複分は黒羽の欠片に変換されます。
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px' }}>
              <div style={miniStatStyle}>
                <Award size={14} color="#B39DDB" />
                <span>収集 {collectedCount}/{maxCollection}</span>
              </div>
              <div style={miniStatStyle}>
                <Sparkles size={14} color="#FFE082" />
                <span>10回目はSSR固定</span>
              </div>
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: '12px',
            padding: '12px',
            borderRadius: '16px',
            border: '1px solid #293653',
            background: 'rgba(12,17,29,0.9)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div>
              <div style={{ color: '#8EA0BB', fontSize: '9px', fontWeight: 800 }}>NEXT REWARD</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginTop: '3px', fontSize: '14px', fontWeight: 900 }}>
                <span style={{ color: rarityMeta[nextPull.rarity].border }}>{rarityMeta[nextPull.rarity].label}</span>
                <span>{nextPull.name}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right', color: '#FFE082', fontSize: '11px', fontWeight: 900 }}>
              {progress.totalPulls % 10 === 9 ? '次の1回がSSR' : (10 - (progress.totalPulls % 10)) + '回目まで'}
            </div>
          </div>
        </section>

        <section
          style={{
            marginTop: '12px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}
        >
          {([1, 10] as const).map(count => {
            const disabled = revealing || progress.tickets < count;
            return (
              <button
                key={count}
                type="button"
                onClick={() => handleRecruit(count)}
                disabled={disabled}
                style={{
                  minHeight: count === 10 ? '76px' : '68px',
                  borderRadius: '16px',
                  border: count === 10 ? '1px solid #FFD54F' : '1px solid #8E7BB8',
                  background: count === 10
                    ? 'linear-gradient(135deg, rgba(88,58,11,0.96), rgba(55,33,8,0.96))'
                    : 'linear-gradient(135deg, rgba(47,29,70,0.96), rgba(31,25,53,0.96))',
                  color: disabled ? '#67738A' : '#FFFFFF',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  boxShadow: disabled ? 'none' : count === 10 ? '0 7px 24px rgba(255,213,79,0.16)' : '0 7px 20px rgba(126,87,194,0.15)',
                  textAlign: 'left',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '17px', fontWeight: 950 }}>{count === 10 ? '10連召喚' : '1回召喚'}</span>
                  {count === 10 ? <Crown size={18} color={disabled ? '#67738A' : '#FFE082'} /> : <Ticket size={17} color={disabled ? '#67738A' : '#D1C4E9'} />}
                </div>
                <div style={{ marginTop: '3px', fontSize: '10px', color: disabled ? '#67738A' : '#B9C2D3' }}>
                  召喚札 × {count}
                  {count === 10 ? '　10回目はSSR固定' : '　次の報酬を獲得'}
                </div>
              </button>
            );
          })}
        </section>

        {revealing && (
          <section
            style={{
              marginTop: '16px',
              minHeight: '184px',
              borderRadius: '18px',
              border: '1px solid rgba(206,147,216,0.36)',
              background: 'radial-gradient(circle, rgba(126,87,194,0.18), rgba(8,11,19,0.96) 62%)',
              display: 'grid',
              placeItems: 'center',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                width: '92px',
                height: '92px',
                borderRadius: '50%',
                border: '1px solid rgba(255,224,130,0.45)',
                boxShadow: '0 0 60px rgba(255,224,130,0.16)',
                animation: 'summonPulse 1s ease-in-out infinite',
              }}
            />
            <div style={{ position: 'relative', textAlign: 'center' }}>
              <div style={{ color: '#FFE082', fontSize: '10px', fontWeight: 900, letterSpacing: '0.2em' }}>
                SUMMONING
              </div>
              <div style={{ marginTop: '6px', fontSize: '25px', fontWeight: 950 }}>黒翼展開</div>
            </div>
          </section>
        )}

        {results.length > 0 && (
          <section style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '9px' }}>
              <div>
                <div style={{ color: '#B39DDB', fontSize: '9px', fontWeight: 900, letterSpacing: '0.16em' }}>
                  ACQUIRED
                </div>
                <div style={{ marginTop: '2px', fontSize: '18px', fontWeight: 950 }}>召喚結果</div>
              </div>
              <div style={{ color: '#9FAEC4', fontSize: '10px' }}>
                欠片獲得合計 {results.reduce((sum, result) => sum + result.shardGain, 0)}
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: results.length === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                gap: '9px',
              }}
            >
              {results.map((result, index) => (
                <RewardCard key={`${result.reward.id}-${index}`} result={result} index={index} featured={results.length === 1} />
              ))}
            </div>
          </section>
        )}

        <section
          style={{
            marginTop: '18px',
            padding: '12px',
            borderRadius: '15px',
            border: '1px solid #293653',
            background: 'rgba(8,12,21,0.78)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#D1C4E9', fontSize: '11px', fontWeight: 900 }}>
            <Gift size={14} /> 召喚のルール
          </div>
          <div style={{ marginTop: '7px', color: '#9EABBF', fontSize: '10px', lineHeight: 1.65 }}>
            報酬順は固定ローテーション。戦闘終了時に召喚札を1枚獲得します。各報酬は初回だけコレクション登録され、2回目以降はレアリティに応じて追加の黒羽の欠片へ変換されます。
          </div>
        </section>

        <div style={{ height: '4px' }} />
      </div>
    </div>
  );
};

const miniStatStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 8px',
  borderRadius: '9px',
  background: 'rgba(9,13,22,0.72)',
  border: '1px solid rgba(179,157,219,0.18)',
  color: '#B6C0D1',
  fontSize: '9px',
  fontWeight: 850,
};

const RewardCard: React.FC<{ result: RecruitmentDraw; index: number; featured: boolean }> = ({ result, index, featured }) => {
  const meta = rarityMeta[result.reward.rarity];

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        minHeight: featured ? '210px' : '135px',
        padding: featured ? '18px' : '12px',
        borderRadius: '17px',
        border: `1px solid ${meta.border}`,
        background: `linear-gradient(145deg, ${meta.bg}, rgba(10,14,23,0.96))`,
        boxShadow: `0 9px 30px ${meta.glow}, inset 0 0 30px rgba(255,255,255,0.025)`,
        animation: 'rewardReveal 420ms cubic-bezier(.18,.82,.27,1) both',
        animationDelay: `${index * 70}ms`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-30%',
          width: '28%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
          animation: 'shineSweep 850ms ease-out 80ms both',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: meta.border, fontSize: '9px', fontWeight: 950, letterSpacing: '0.1em' }}>
          {meta.icon} {meta.label}
        </div>
        {result.isNew ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#80CBC4', fontSize: '8px', fontWeight: 900 }}>
            <Check size={11} /> NEW
          </span>
        ) : (
          <span style={{ color: '#FFE082', fontSize: '8px', fontWeight: 900 }}>DUPLICATE</span>
        )}
      </div>

      <div
        style={{
          marginTop: featured ? '18px' : '10px',
          display: 'grid',
          placeItems: 'center',
          width: featured ? '72px' : '48px',
          height: featured ? '72px' : '48px',
          borderRadius: '50%',
          border: `1px solid ${meta.border}`,
          background: 'rgba(4,7,13,0.52)',
          boxShadow: `0 0 30px ${meta.glow}`,
          color: meta.border,
        }}
      >
        {result.reward.rarity === 'SSR' ? <Crown size={featured ? 34 : 24} /> : result.reward.rarity === 'SR' ? <Sparkles size={featured ? 31 : 22} /> : <Feather size={featured ? 31 : 22} />}
      </div>

      <div style={{ marginTop: featured ? '12px' : '8px', fontSize: featured ? '21px' : '14px', fontWeight: 950 }}>
        {result.reward.name}
      </div>
      <div style={{ marginTop: '4px', color: '#AEB9CB', fontSize: featured ? '11px' : '9px', lineHeight: 1.5 }}>
        {result.reward.description}
      </div>

      <div
        style={{
          display: 'inline-flex',
          marginTop: featured ? '13px' : '9px',
          padding: '5px 8px',
          borderRadius: '8px',
          background: 'rgba(4,7,13,0.44)',
          color: '#FFE082',
          fontSize: '10px',
          fontWeight: 900,
        }}
      >
        +{result.shardGain} 黒羽の欠片
      </div>

      {!result.isNew && (
        <div style={{ marginTop: '5px', color: '#8997AB', fontSize: '8px' }}>
          重複変換ボーナスを含む
        </div>
      )}
    </div>
  );
};
