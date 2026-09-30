import React from 'react';
import { BattleUiState } from '../types/game';
import { Skull, RotateCcw, ArrowLeft } from 'lucide-react';
import battleBackground from '../assets/戦闘中背景.png';
import irenaVictoryImage from '../assets/いれーな勝利演出.jpg';

interface BattleResultModalProps {
  state: BattleUiState;
  onRematch: () => void;
  onBackToSelect: () => void;
}

export const BattleResultModal: React.FC<BattleResultModalProps> = ({
  state,
  onRematch,
  onBackToSelect,
}) => {
  const playerWon = state.winnerIsPlayer === true;
  const winner = playerWon ? state.player : state.enemy;
  const loser = playerWon ? state.enemy : state.player;
  const [victoryAssetsReady, setVictoryAssetsReady] = React.useState(!playerWon);

  React.useEffect(() => {
    if (!playerWon) return;

    let cancelled = false;
    let revealTimer: ReturnType<typeof setTimeout> | undefined;
    const startedAt = Date.now();
    const minimumDarkScreenMs = 220;
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
            .victory-reveal, .victory-glow, .victory-particle {
              animation: none !important;
            }
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
          .victory-particle:nth-child(1) { left: 10%; animation-delay: -0.2s; }
          .victory-particle:nth-child(2) { left: 18%; animation-delay: -1.3s; width: 4px; height: 4px; }
          .victory-particle:nth-child(3) { left: 27%; animation-delay: -0.8s; }
          .victory-particle:nth-child(4) { left: 36%; animation-delay: -1.8s; width: 6px; height: 6px; }
          .victory-particle:nth-child(5) { left: 46%; animation-delay: -0.5s; width: 4px; height: 4px; }
          .victory-particle:nth-child(6) { left: 56%; animation-delay: -1.6s; }
          .victory-particle:nth-child(7) { left: 66%; animation-delay: -1s; width: 6px; height: 6px; }
          .victory-particle:nth-child(8) { left: 75%; animation-delay: -0.4s; width: 4px; height: 4px; }
          .victory-particle:nth-child(9) { left: 84%; animation-delay: -1.9s; }
          .victory-particle:nth-child(10) { left: 92%; animation-delay: -1.1s; width: 4px; height: 4px; }
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
          {Array.from({ length: 10 }, (_, index) => (
            <span key={index} className="victory-particle" />
          ))}
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
                width: 'clamp(230px, 58vw, 390px)',
                height: 'clamp(270px, 52vh, 440px)',
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

        <div style={{ fontSize: '13px', color: '#B0BEC5', marginBottom: '16px' }}>
          {state.enemy.character.name} の前に倒れました... 次こそ勝利を掴みましょう！
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
    </div>
  );
};
