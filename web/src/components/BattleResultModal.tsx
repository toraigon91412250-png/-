import React from 'react';
import { BattleUiState, IrenaSkillId, IrenaSkillProgress, FeatherSkillPath, RuinSkillPath } from '../types/game';
import { Skull, RotateCcw, ArrowLeft } from 'lucide-react';
import battleBackground from '../assets/戦闘中背景.png';
import irenaVictoryImage from '../assets/いれーな勝利演出.jpg';
import SkillUpgradeModal from './SkillUpgradeModal';
import { STAT_POINTS_PER_WIN } from '../utils/storage';

interface BattleResultModalProps {
  state: BattleUiState;
  onRematch: () => void;
  onBackToSelect: () => void;
  skillProgress: IrenaSkillProgress;
  onUpgradeSkill: (skillId: IrenaSkillId) => void;
  onChooseSkillPath: (skillId: IrenaSkillId, path: FeatherSkillPath | RuinSkillPath) => void;
}

export const BattleResultModal: React.FC<BattleResultModalProps> = ({
  state,
  onRematch,
  onBackToSelect,
  skillProgress,
  onUpgradeSkill,
  onChooseSkillPath,
}) => {
  const playerWon = state.winnerIsPlayer === true;
  const winner = playerWon ? state.player : state.enemy;
  const loser = playerWon ? state.enemy : state.player;

  // 評価は報酬・勝敗には影響せず、今回の戦闘内容だけを可視化する。
  const playerHpRatio = state.player.character.maxHp > 0
    ? Math.max(0, Math.min(1, state.player.currentHp / state.player.character.maxHp))
    : 0;
  const performanceScore = playerWon
    ? Math.min(
        100,
        Math.round(
          55
          + playerHpRatio * 30
          + (state.turnNumber <= 5 ? 15 : state.turnNumber <= 8 ? 8 : 0)
          + Math.min(10, state.lastBattleMasteryReward),
        ),
      )
    : 0;
  const performanceGrade = performanceScore >= 90
    ? 'S'
    : performanceScore >= 75
      ? 'A'
      : performanceScore >= 60
        ? 'B'
        : performanceScore >= 45
          ? 'C'
          : 'D';
  const [victoryAssetsReady, setVictoryAssetsReady] = React.useState(!playerWon);
  const [upgradeOpen, setUpgradeOpen] = React.useState(false);
  const skillUpgradeOverlay = upgradeOpen ? (
    <SkillUpgradeModal
      progress={skillProgress}
      onUpgrade={onUpgradeSkill}
      onChoosePath={onChooseSkillPath}
      onClose={() => setUpgradeOpen(false)}
    />
  ) : null;

  React.useEffect(() => {
    if (!playerWon) return;

    let cancelled = false;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    const minimumDarkScreenMs = 300;
    const sources = [battleBackground, irenaVictoryImage];

    const preloadImages = async () => {
      await Promise.all(
        sources.map(
          (src) =>
            new Promise<void>((resolve) => {
              const image = new Image();
              image.onload = () => resolve();
              image.onerror = () => resolve();
              image.src = src;
            }),
        ),
      );

      if (cancelled) return;

      const remainingMs = Math.max(0, minimumDarkScreenMs - (Date.now() - startedAt));
      revealTimer = setTimeout(() => {
        if (!cancelled) setVictoryAssetsReady(true);
      }, remainingMs);
    };

    preloadImages();

    return () => {
      cancelled = true;
      if (revealTimer) clearTimeout(revealTimer);
    };
  }, [playerWon]);

  if (playerWon) {
    if (!victoryAssetsReady) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#000000',
            zIndex: 100,
          }}
          aria-label="勝利画面を読み込み中"
        />
      );
    }
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          overflow: 'hidden',
          backgroundColor: '#050812',
          zIndex: 100,
          color: '#FFFFFF',
        }}
      >
        <style>{`
          @keyframes victoryReveal {
            0% { opacity: 0; transform: translateY(18px) scale(0.96); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes victoryTitleImpact {
            0% { opacity: 0; transform: translateY(10px) scale(0.55); }
            55% { opacity: 1; transform: translateY(0) scale(1.12); }
            78% { transform: translateY(0) scale(0.97); }
            100% { transform: translateY(0) scale(1); }
          }
          @keyframes victoryGlow {
            0%, 100% { opacity: 0.45; transform: scale(0.92); }
            50% { opacity: 0.85; transform: scale(1.08); }
          }
          @keyframes victoryDrift {
            0% { transform: translateY(18px); opacity: 0; }
            25%, 75% { opacity: 0.85; }
            100% { transform: translateY(-90px); opacity: 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            .victory-reveal, .victory-title-impact, .victory-glow, .victory-particle {
              animation: none !important;
            }
          }
          .victory-title-impact {
            animation: victoryTitleImpact 0.72s cubic-bezier(0.18, 0.88, 0.22, 1) both;
          }
          .victory-reveal {
            animation: victoryReveal 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) both;
          }
          .victory-glow {
            animation: victoryGlow 2.2s ease-in-out infinite;
          }
          .victory-particle {
            position: absolute;
            bottom: 22%;
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: #FFE082;
            box-shadow: 0 0 12px rgba(255, 224, 130, 0.95);
            animation: victoryDrift 2.4s ease-out infinite;
          }
        `}</style>

        <img
          src={battleBackground}
          alt=""
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.72,
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 50% 42%, rgba(255, 213, 79, 0.22) 0%, rgba(18, 28, 52, 0.44) 35%, rgba(3, 7, 15, 0.88) 100%)',
          }}
        />

        <div
          className="victory-glow"
          style={{
            position: 'absolute',
            left: '50%',
            top: '36%',
            width: 'clamp(220px, 42vw, 420px)',
            height: 'clamp(220px, 42vw, 420px)',
            transform: 'translate(-50%, -50%)',
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255, 224, 130, 0.55) 0%, rgba(255, 193, 7, 0.12) 42%, rgba(255, 193, 7, 0) 72%)',
            filter: 'blur(3px)',
          }}
        />

        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}
        >
          {Array.from({ length: 240 }, (_, index) => {
            const left = (index * 41) % 98;
            const bottom = 10 + ((index * 29) % 58);
            const delayMs = (index * 137) % 2400;
            const size = 3 + (index % 4);
            return (
              <span
                key={index}
                className="victory-particle"
                style={{
                  left: `${left}%`,
                  bottom: `${bottom}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  animationDelay: `-${delayMs}ms`,
                }}
              />
            );
          })}
        </div>

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'clamp(24px, 5vh, 52px) 18px 22px',
            boxSizing: 'border-box',
            overflowY: 'auto',
          }}
        >
          <div
            className="victory-reveal"
            style={{
              textAlign: 'center',
              marginTop: 'clamp(4px, 2vh, 18px)',
            }}
          >
            <div
              className="victory-title-impact"
              style={{
                fontSize: 'clamp(56px, 15vw, 108px)',
                lineHeight: 0.9,
                fontWeight: 1000,
                letterSpacing: '0.08em',
                color: '#FFF3C4',
                textShadow:
                  '0 0 12px rgba(255, 213, 79, 0.85), 0 0 36px rgba(255, 179, 0, 0.55), 0 8px 20px rgba(0,0,0,0.45)',
              }}
            >
              VICTORY
            </div>
            <div
              style={{
                marginTop: '10px',
                fontSize: 'clamp(20px, 5vw, 34px)',
                fontWeight: 900,
                letterSpacing: '0.22em',
                color: '#FFFFFF',
                textShadow: '0 3px 12px rgba(0,0,0,0.6)',
              }}
            >
              勝利！
            </div>
          </div>

          <div
            className="victory-reveal"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              animationDelay: '90ms',
              margin: '8px 0',
            }}
          >
            <div
              style={{
                width: 'clamp(345px, 87vw, 585px)',
                height: 'clamp(405px, 78vh, 660px)',
                borderRadius: '22px',
                overflow: 'hidden',
                border: '2px solid rgba(255, 224, 130, 0.92)',
                boxShadow:
                  '0 0 0 1px rgba(255,255,255,0.12) inset, 0 0 30px rgba(255, 193, 7, 0.32), 0 16px 50px rgba(0,0,0,0.45)',
                background:
                  'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(0,0,0,0.14))',
              }}
            >
              <img
                src={irenaVictoryImage}
                alt="いれーな"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>

            <div
              style={{
                fontSize: 'clamp(22px, 5vw, 32px)',
                fontWeight: 900,
                color: '#FFFFFF',
                textShadow: '0 3px 14px rgba(0,0,0,0.72)',
              }}
            >
              {winner.character.name}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: '#FFE082',
                fontWeight: 800,
                letterSpacing: '0.08em',
              }}
            >
              {state.enemy.character.name} を撃破！
            <div style={{ marginTop: '7px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 10px', borderRadius: '999px', background: 'rgba(126, 87, 194, 0.18)', border: '1px solid rgba(206, 147, 216, 0.42)', color: '#E1BEE7', fontSize: '12px', fontWeight: 950 }}>
              ✦ 黒羽の欠片 +{state.lastBattleReward}
              {state.lastBattleMasteryReward > 0 && (
                <span style={{ marginLeft: '2px', color: '#B39DDB', fontSize: '10px' }}>
                  （戦術達成 +{state.lastBattleMasteryReward}）
                </span>
              )}
              {playerWon && (
                <span style={{ marginLeft: '7px', color: '#FFE082', fontSize: '10px' }}>
                  ＋ステータスポイント {STAT_POINTS_PER_WIN}P
                </span>
              )}
            </div>
            </div>
          </div>

          <div
            className="victory-reveal"
            style={{
              width: '100%',
              maxWidth: '520px',
              display: 'flex',
              flexDirection: 'column',
              gap: '9px',
              animationDelay: '180ms',
            }}
          >
            <button
              onClick={() => setUpgradeOpen(true)}
              style={{
                width: '100%',
                minHeight: '48px',
                background: 'linear-gradient(90deg, #5E35B1 0%, #7E57C2 100%)',
                color: '#FFFFFF',
                border: '1px solid rgba(225, 190, 231, 0.75)',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(32, 15, 70, 0.32)',
              }}
            >
              ✨ 技を強化する
            </button>

            <button
              onClick={onRematch}
              style={{
                width: '100%',
                minHeight: '50px',
                background:
                  'linear-gradient(90deg, #FFB300 0%, #F57C00 100%)',
                color: '#17120A',
                border: '1px solid rgba(255, 236, 179, 0.72)',
                borderRadius: '12px',
                fontSize: '15px',
                fontWeight: 900,
                cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(0, 0, 0, 0.35)',
              }}
            >
              <RotateCcw size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              再戦する（同じ対戦カード）
            </button>

            <button
              onClick={onBackToSelect}
              style={{
                width: '100%',
                minHeight: '46px',
                background: 'rgba(10, 17, 31, 0.68)',
                color: '#FFFFFF',
                border: '1px solid rgba(176, 190, 197, 0.55)',
                borderRadius: '12px',
                fontSize: '14px',
                fontWeight: 800,
                cursor: 'pointer',
                backdropFilter: 'blur(5px)',
              }}
            >
              <ArrowLeft size={16} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
              キャラクター選択に戻る
            </button>
          </div>
        </div>
      {skillUpgradeOverlay}
    </div>
  );
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#131724',
          borderRadius: '20px',
          border: '2px solid #E57373',
          boxShadow: '0 0 30px rgba(229, 115, 115, 0.3)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'modalPop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: 'rgba(183, 28, 28, 0.2)',
            border: '1.5px solid #E57373',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          <Skull size={36} color="#EF5350" />
        </div>

        <div
          style={{
            fontSize: '24px',
            fontWeight: 900,
            color: '#EF5350',
            marginBottom: '4px',
          }}
        >
          DEFEAT... 敗北
        </div>

        <div style={{ fontSize: '13px', color: '#B0BEC5', marginBottom: '7px' }}>
          {state.enemy.character.name} の前に倒れました... 次こそ勝利を掴みましょう！
        </div>
        <div style={{ marginBottom: '16px', padding: '6px 10px', borderRadius: '999px', background: 'rgba(126, 87, 194, 0.18)', border: '1px solid rgba(206, 147, 216, 0.42)', color: '#E1BEE7', fontSize: '12px', fontWeight: 950 }}>
          ✦ 黒羽の欠片 +{state.lastBattleReward}
          {state.lastBattleMasteryReward > 0 && (
            <span style={{ marginLeft: '2px', color: '#B39DDB', fontSize: '10px' }}>
              （戦術達成 +{state.lastBattleMasteryReward}）
            </span>
          )}
        </div>
        <div
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 14px',
            marginBottom: '10px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 224, 130, 0.35)',
            background: 'linear-gradient(90deg, rgba(255, 193, 7, 0.12), rgba(126, 87, 194, 0.12))',
            boxSizing: 'border-box',
          }}
        >
          <div>
            <div style={{ color: '#90CAF9', fontSize: '10px', fontWeight: 900, letterSpacing: '0.14em' }}>
              BATTLE PERFORMANCE
            </div>
            <div style={{ marginTop: '3px', color: '#FFFFFF', fontSize: '13px', fontWeight: 900 }}>
              {playerWon ? '戦闘評価' : '戦闘結果'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '28px', lineHeight: 1, fontWeight: 1000, color: '#FFE082' }}>
              {performanceGrade}
            </span>
            <span style={{ marginLeft: '7px', color: '#B0BEC5', fontSize: '11px', fontWeight: 800 }}>
              {performanceScore} pt
            </span>
          </div>
        </div>

        <div
          style={{
            width: '100%',
            backgroundColor: '#1A2132',
            borderRadius: '12px',
            border: '1px solid #2B3752',
            padding: '12px',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              padding: '4px 0',
              borderBottom: '1px solid #242E44',
            }}
          >
            <span style={{ color: '#90CAF9' }}>勝者</span>
            <span style={{ fontWeight: 800, color: '#FFFFFF' }}>{winner.character.name}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              padding: '4px 0',
              borderBottom: '1px solid #242E44',
            }}
          >
            <span style={{ color: '#90CAF9' }}>敗者</span>
            <span style={{ fontWeight: 800, color: '#FFFFFF' }}>{loser.character.name}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              padding: '4px 0',
              borderBottom: '1px solid #242E44',
            }}
          >
            <span style={{ color: '#90CAF9' }}>総ターン数</span>
            <span style={{ fontWeight: 800, color: '#FFD54F' }}>第 {state.turnNumber} ターン</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              padding: '4px 0',
            }}
          >
            <span style={{ color: '#90CAF9' }}>CPU 難易度</span>
            <span style={{ fontWeight: 800, color: '#FFFFFF' }}>
              {state.cpuDifficulty === 'EXPERT' ? 'エキスパート' : 'ノーマル'}
            </span>
          </div>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => setUpgradeOpen(true)}
            style={{
              width: '100%',
              height: '46px',
              background: 'linear-gradient(90deg, #5E35B1 0%, #7E57C2 100%)',
              color: '#FFFFFF',
              border: '1px solid #D1C4E9',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 900,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
            }}
          >
            ✨ 技を強化する
          </button>

          <button
            onClick={onRematch}
            style={{
              width: '100%',
              height: '46px',
              backgroundColor: '#1976D2',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            <RotateCcw size={16} />
            <span>再戦する（同じ対戦カード）</span>
          </button>

          <button
            onClick={onBackToSelect}
            style={{
              width: '100%',
              height: '42px',
              backgroundColor: 'transparent',
              color: '#B0BEC5',
              border: '1px solid #3B4868',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={16} />
            <span>キャラクター選択に戻る</span>
          </button>
        </div>
      </div>
      {skillUpgradeOverlay}
    </div>
  );
};
