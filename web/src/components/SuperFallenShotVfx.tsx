import React, { useState } from 'react';
import chargeImage from '../assets/IMG_1148.jpeg';
import limitGif from '../assets/bannerkoubou-koukasen-20261007-170734.gif';
import shotImage from '../assets/IMG_1149.jpeg';

interface SuperFallenShotVfxProps {
  mode: 'CHARGE' | 'SHOT';
  progress: number;
  durationMs: number;
  damage?: number;
  isEvade?: boolean;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const SuperFallenShotVfx: React.FC<SuperFallenShotVfxProps> = ({
  mode,
  progress,
  durationMs,
  damage = 0,
  isEvade = false,
}) => {
  const [chargeFailed, setChargeFailed] = useState(false);
  const [limitFailed, setLimitFailed] = useState(false);
  const [shotFailed, setShotFailed] = useState(false);

  const t = clamp01(progress);
  const duration = `${Math.max(1, durationMs)}ms`;
  const isShot = mode === 'SHOT';

  // The "breakthrough" is deliberately very short. It overlaps the GIF
  // slightly with the launch art so this reads as one attack, not 3 slides.
  const limitT = clamp01((t - 0.04) / 0.38);
  const limitOpacity = isShot && !limitFailed
    ? Math.sin(limitT * Math.PI)
    : 0;

  const shotT = clamp01((t - 0.25) / 0.75);
  const shotOpacity = isShot && !shotFailed
    ? shotT < 0.09
      ? shotT / 0.09
      : shotT > 0.88
        ? (1 - shotT) / 0.12
        : 1
    : 0;

  const impactPulse = isShot
    ? Math.max(0, 1 - Math.abs(t - 0.31) / 0.16)
    : 0;

  const chargeImageOpacity = chargeFailed
    ? 0
    : t < 0.10
      ? t / 0.10
      : t > 0.88
        ? (1 - t) / 0.12
        : 1;

  const impactTextVisible = isShot && t >= 0.30 && t <= 0.56 && (damage > 0 || isEvade);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 12,
        isolation: 'isolate',
        animation: isShot
          ? `superFallenShotShake ${duration} cubic-bezier(0.16, 0.86, 0.22, 1) both`
          : `superFallenChargeCamera ${duration} ease-out both`,
      }}
    >
      <style>{`
        @keyframes superFallenChargeCamera {
          0% { transform: scale(1); }
          55% { transform: scale(1.006); }
          100% { transform: scale(1.012); }
        }

        @keyframes superFallenChargeImage {
          0% { transform: scale(0.985); opacity: 0; }
          12% { opacity: 1; }
          62% { transform: scale(1.025); opacity: 1; }
          100% { transform: scale(1.045); opacity: 0; }
        }

        @keyframes superFallenChargeGlow {
          0% { transform: scale(0.55); opacity: 0; }
          22% { opacity: 0.66; }
          65% { transform: scale(1.1); opacity: 0.24; }
          100% { transform: scale(1.25); opacity: 0; }
        }

        @keyframes superFallenLimitZoom {
          0% { transform: translate(-50%, -50%) scale(1.02); }
          100% { transform: translate(-50%, -50%) scale(1.18); }
        }

        @keyframes superFallenShotImage {
          0% {
            transform: translate3d(-1.5%, 3%, 0) scale(1.12);
            filter: saturate(1.05) brightness(0.82);
          }
          30% {
            transform: translate3d(0, 0, 0) scale(1.055);
            filter: saturate(1.2) brightness(1.08);
          }
          100% {
            transform: translate3d(0, -2.2%, 0) scale(1.01);
            filter: saturate(1.08) brightness(1);
          }
        }

        @keyframes superFallenTravelLines {
          0% { transform: translate3d(0, 10%, 0) scale(1.02); opacity: 0; }
          18% { opacity: 0.85; }
          100% { transform: translate3d(0, -14%, 0) scale(1.18); opacity: 0; }
        }

        @keyframes superFallenFlash {
          0%, 42% { opacity: 0; }
          47% { opacity: 0.92; }
          57% { opacity: 0.18; }
          100% { opacity: 0; }
        }

        @keyframes superFallenShotShake {
          0%, 100% { transform: translate3d(0, 0, 0); }
          10% { transform: translate3d(-3px, 1px, 0); }
          18% { transform: translate3d(5px, -2px, 0); }
          25% { transform: translate3d(-8px, 3px, 0); }
          33% { transform: translate3d(7px, -3px, 0) scale(1.012); }
          43% { transform: translate3d(-4px, 2px, 0); }
          57% { transform: translate3d(2px, -1px, 0); }
          72% { transform: translate3d(-1px, 0, 0); }
        }

        @keyframes superFallenTextPop {
          0% { transform: translate(-50%, -50%) scale(0.72); opacity: 0; }
          30% { transform: translate(-50%, -50%) scale(1.08); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }

        @media (prefers-reduced-motion: reduce) {
          .super-fallen-vfx-motion {
            animation: none !important;
          }
        }
      `}</style>

      {mode === 'CHARGE' ? (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,3,0.965)',
            }}
          />

          <div
            className="super-fallen-vfx-motion"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 'min(84vw, 900px)',
              height: 'min(79vh, 730px)',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: `superFallenChargeImage ${duration} cubic-bezier(0.16, 0.82, 0.26, 1) both`,
              willChange: 'transform, opacity',
            }}
          >
            {!chargeFailed && (
              <img
                src={chargeImage}
                alt=""
                draggable={false}
                onError={() => setChargeFailed(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                  opacity: chargeImageOpacity,
                  filter: 'contrast(1.04) saturate(0.9) brightness(0.91)',
                  userSelect: 'none',
                }}
              />
            )}
          </div>

          <div
            style={{
              position: 'absolute',
              left: '31%',
              top: '48%',
              width: '26%',
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.46) 0%, rgba(190,230,255,0.15) 25%, rgba(103,75,170,0.09) 46%, transparent 72%)',
              filter: 'blur(9px)',
              animation: `superFallenChargeGlow ${duration} ease-out both`,
              willChange: 'transform, opacity',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: '-18%',
              background: 'radial-gradient(circle at 31% 48%, rgba(180,225,255,0.10) 0%, rgba(87,68,150,0.04) 20%, transparent 48%)',
              opacity: Math.max(0, 1 - t * 1.12),
            }}
          />

          <div
            className="super-fallen-vfx-motion"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(circle at 30% 48%, rgba(215,245,255,0.92) 0 1.5px, transparent 2px), radial-gradient(circle at 34% 44%, rgba(155,218,255,0.70) 0 1px, transparent 1.5px), radial-gradient(circle at 29% 53%, rgba(190,170,255,0.58) 0 1px, transparent 1.5px)',
              backgroundSize: '18px 18px, 27px 27px, 33px 33px',
              mixBlendMode: 'screen',
              opacity: Math.max(0, 0.14 - t * 0.14),
              transform: `translateY(${t * -16}px)`,
              willChange: 'transform, opacity',
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: '31%',
              top: '48%',
              width: '8%',
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              boxShadow: '0 0 34px rgba(191,235,255,0.24)',
              opacity: Math.max(0, Math.sin(t * Math.PI) * 0.38),
            }}
          />
        </>
      ) : (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 50% 44%, rgba(255,255,255,0.17) 0%, rgba(90,160,255,0.06) 22%, rgba(0,0,0,0.84) 78%)',
            }}
          />

          {!limitFailed && (
            <img
              src={limitGif}
              alt=""
              draggable={false}
              onError={() => setLimitFailed(true)}
              className="super-fallen-vfx-motion"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 'min(97vw, 1180px)',
                height: 'min(84vh, 790px)',
                transform: 'translate(-50%, -50%)',
                objectFit: 'contain',
                objectPosition: 'center',
                opacity: limitOpacity,
                mixBlendMode: 'screen',
                animation: `superFallenLimitZoom calc(${duration} * 0.44) cubic-bezier(0.08, 0.84, 0.14, 1) both`,
                willChange: 'transform, opacity',
              }}
            />
          )}

          <div
            style={{
              position: 'absolute',
              inset: '-34%',
              background:
                'repeating-conic-gradient(from 0deg, rgba(224,242,255,0) 0deg 2.2deg, rgba(224,242,255,0.60) 2.2deg 2.7deg, rgba(224,242,255,0) 2.7deg 7deg)',
              maskImage: 'radial-gradient(circle at center, transparent 0 18%, black 38%, black 82%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(circle at center, transparent 0 18%, black 38%, black 82%, transparent 100%)',
              opacity: limitOpacity * 0.84,
              transform: `scale(${0.82 + limitT * 0.42})`,
              transformOrigin: 'center',
              willChange: 'transform, opacity',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.94)',
              opacity: Math.max(0, impactPulse - 0.60) * 0.82,
              animation: `superFallenFlash calc(${duration} * 0.64) ease-out both`,
            }}
          />

          {!shotFailed && (
            <div
              className="super-fallen-vfx-motion"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 'min(96vw, 1180px)',
                height: 'min(85vh, 800px)',
                transform: 'translate(-50%, -50%)',
                opacity: shotOpacity,
                animation: `superFallenShotImage ${duration} cubic-bezier(0.10, 0.74, 0.20, 1) ${`calc(${duration} * 0.23)`} both`,
                willChange: 'transform, opacity, filter',
              }}
            >
              <img
                src={shotImage}
                alt=""
                draggable={false}
                onError={() => setShotFailed(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                  userSelect: 'none',
                }}
              />
            </div>
          )}

          <div
            className="super-fallen-vfx-motion"
            style={{
              position: 'absolute',
              inset: '-18%',
              background:
                'repeating-linear-gradient(112deg, transparent 0 13px, rgba(195,235,255,0.20) 13px 15px, transparent 15px 31px)',
              mixBlendMode: 'screen',
              opacity: Math.min(0.74, shotT * 0.82),
              animation: `superFallenTravelLines ${duration} cubic-bezier(0.1, 0.85, 0.2, 1) both`,
              willChange: 'transform, opacity',
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '47%',
              width: 'clamp(140px, 24vw, 320px)',
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              border: '1px solid rgba(213,245,255,0.54)',
              borderRadius: '50%',
              boxShadow: '0 0 28px rgba(141,211,255,0.32), inset 0 0 24px rgba(255,255,255,0.12)',
              opacity: impactPulse * 0.72,
              willChange: 'opacity',
            }}
          />

          {impactTextVisible && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                whiteSpace: 'nowrap',
                color: '#FFFFFF',
                fontSize: 'clamp(17px, 3.5vw, 32px)',
                fontWeight: 1000,
                letterSpacing: '0.11em',
                textShadow: '0 0 10px rgba(105,198,255,0.92), 0 2px 7px rgba(0,0,0,0.95)',
                animation: `superFallenTextPop calc(${duration} * 0.40) cubic-bezier(0.12, 0.8, 0.2, 1) calc(${duration} * 0.27) both`,
              }}
            >
              {isEvade ? 'MISS!!  超堕天撃回避' : `−${damage} DMG`}
            </div>
          )}
        </>
      )}
    </div>
  );
};
