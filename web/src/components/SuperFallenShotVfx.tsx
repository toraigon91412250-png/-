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

/*
 * The supplied artwork is 3:2. The VFX uses that same aspect ratio as its
 * cinematic stage instead of fitting each image against the whole viewport.
 * This keeps the face, hand, and wing composition in the artwork's own space.
 */
const SuperFallenShotVfx: React.FC<SuperFallenShotVfxProps> = ({
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
  const duration = Math.max(1, durationMs);
  const d = `${duration}ms`;
  const isShot = mode === 'SHOT';

  // Both supplied hero images have the same visual axis: the emitting hand
  // sits left of center while the face anchors the composition near center.
  // 45% x / 44% y keeps both readable on portrait crops.
  const focalPosition = '45% 44%';

  const chargeVisible = chargeFailed
    ? 0
    : t < 0.08
      ? t / 0.08
      : t > 0.93
        ? (1 - t) / 0.07
        : 1;

  // The source GIF is ~300ms (3 x 100ms). It is intentionally shown for a
  // little longer than one loop, then immediately yields to the launch art.
  const limitT = clamp01((t - 0.015) / 0.18);
  const limitOpacity = isShot && !limitFailed
    ? limitT < 0.24
      ? limitT / 0.24
      : limitT > 0.82
        ? (1 - limitT) / 0.18
        : 1
    : 0;

  // Launch art starts while the negative-frame impact is still present.
  // It expands from the same hand-origin instead of sliding in as a panel.
  const revealT = clamp01((t - 0.18) / 0.36);
  const launchOpacity = isShot && !shotFailed
    ? revealT < 0.08
      ? revealT / 0.08
      : 1
    : 0;

  const impactPulse = isShot
    ? Math.max(0, 1 - Math.abs(t - 0.28) / 0.12)
    : 0;

  const showDamage =
    isShot &&
    !isEvade &&
    damage > 0 &&
    t >= 0.31 &&
    t <= 0.80;

  const showMiss =
    isShot &&
    isEvade &&
    t >= 0.30 &&
    t <= 0.72;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 999,
        background: '#000',
        isolation: 'isolate',
      }}
    >
      <style>{`
        @keyframes superFallenChargeCamera {
          0% { transform: scale(1); }
          72% { transform: scale(1.018); }
          100% { transform: scale(1.032); }
        }

        @keyframes superFallenChargeImage {
          0% {
            transform: scale(1);
            opacity: 0;
            filter: brightness(0.70) contrast(1.02);
          }
          10% {
            opacity: 1;
          }
          88% {
            transform: scale(1.028);
            opacity: 1;
            filter: brightness(0.94) contrast(1.06);
          }
          100% {
            transform: scale(1.04);
            opacity: 0;
            filter: brightness(0.72) contrast(1.03);
          }
        }

        @keyframes superFallenChargeGlow {
          0% {
            transform: translate(-50%, -50%) scale(0.45);
            opacity: 0;
          }
          24% {
            transform: translate(-50%, -50%) scale(0.82);
            opacity: 0.46;
          }
          66% {
            transform: translate(-50%, -50%) scale(1.06);
            opacity: 0.18;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.28);
            opacity: 0;
          }
        }

        @keyframes superFallenShotCamera {
          0%, 100% { transform: scale(1); }
          8% { transform: translate3d(-3px, 1px, 0) scale(1.012); }
          14% { transform: translate3d(5px, -2px, 0) scale(1.020); }
          21% { transform: translate3d(-7px, 2px, 0) scale(1.028); }
          30% { transform: translate3d(6px, -2px, 0) scale(1.020); }
          42% { transform: translate3d(-3px, 1px, 0) scale(1.012); }
          58% { transform: translate3d(1px, 0, 0) scale(1.006); }
        }

        @keyframes superFallenLimitImage {
          0% { transform: scale(1); }
          100% { transform: scale(1.055); }
        }

        @keyframes superFallenLaunchImage {
          0% {
            transform: scale(1.10);
            filter: brightness(0.72) saturate(1.02);
          }
          18% {
            transform: scale(1.045);
            filter: brightness(1.08) saturate(1.12);
          }
          40% {
            transform: scale(1.018);
            filter: brightness(1.04) saturate(1.09);
          }
          100% {
            transform: scale(1.008);
            filter: brightness(1) saturate(1.05);
          }
        }

        @keyframes superFallenLaunchBloom {
          0% {
            transform: translate(-50%, -50%) scale(0.28);
            opacity: 0;
          }
          34% {
            transform: translate(-50%, -50%) scale(0.86);
            opacity: 0.88;
          }
          62% {
            transform: translate(-50%, -50%) scale(1.36);
            opacity: 0.20;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.72);
            opacity: 0;
          }
        }

        @keyframes superFallenFlash {
          0%, 27% { opacity: 0; }
          30% { opacity: 0.95; }
          35% { opacity: 0.06; }
          100% { opacity: 0; }
        }

        @keyframes superFallenEnergyTravel {
          0% {
            transform: translate3d(16%, 5%, 0) scaleX(0.70);
            opacity: 0;
          }
          18% {
            opacity: 0.72;
          }
          100% {
            transform: translate3d(-18%, -3%, 0) scaleX(1.18);
            opacity: 0;
          }
        }

        @keyframes superFallenImpactText {
          0% {
            transform: translate(-50%, -50%) scale(0.76);
            opacity: 0;
          }
          26% {
            transform: translate(-50%, -50%) scale(1.04);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }

        .super-fallen-fullstage {
          width: 100vw;
          height: 100vh;
          min-width: 100%;
          min-height: 100%;
        }

        @media (max-aspect-ratio: 4/5) {
          .super-fallen-art {
            object-position: 45% 44% !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .super-fallen-motion {
            animation: none !important;
          }
        }
      `}</style>

      {mode === 'CHARGE' ? (
        <div
          className="super-fallen-fullstage super-fallen-motion"
          style={{
            position: 'absolute',
            inset: 0,
            background: '#000',
            animation: `superFallenChargeCamera ${d} cubic-bezier(0.18, 0.80, 0.22, 1) both`,
            willChange: 'transform',
          }}
        >
          {!chargeFailed && (
            <img
              src={chargeImage}
              alt=""
              draggable={false}
              onError={() => setChargeFailed(true)}
              className="super-fallen-art super-fallen-motion"
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: focalPosition,
                opacity: chargeVisible,
                animation: `superFallenChargeImage ${d} cubic-bezier(0.14, 0.80, 0.24, 1) both`,
                willChange: 'transform, opacity, filter',
                userSelect: 'none',
              }}
            />
          )}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(circle at 45% 44%, rgba(100,150,200,0.035) 0%, rgba(0,0,0,0.08) 38%, rgba(0,0,0,0.62) 100%)',
              pointerEvents: 'none',
            }}
          />

          <div
            className="super-fallen-motion"
            style={{
              position: 'absolute',
              left: '31%',
              top: '43%',
              width: '30%',
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(255,255,255,0.30) 0%, rgba(184,230,255,0.13) 22%, rgba(105,105,190,0.05) 46%, transparent 72%)',
              filter: 'blur(8px)',
              animation: `superFallenChargeGlow ${d} ease-out both`,
              pointerEvents: 'none',
              willChange: 'transform, opacity',
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: '31%',
              top: '43%',
              width: '9%',
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              boxShadow: '0 0 28px rgba(207,240,255,0.18)',
              opacity: Math.max(0, Math.sin(t * Math.PI) * 0.42),
              pointerEvents: 'none',
            }}
          />
        </div>
      ) : (
        <>
          <div
            className="super-fallen-fullstage super-fallen-motion"
            style={{
              position: 'absolute',
              inset: 0,
              background: '#000',
              animation: `superFallenShotCamera ${d} cubic-bezier(0.14, 0.84, 0.20, 1) both`,
              willChange: 'transform',
            }}
          >
            {!limitFailed && (
              <img
                src={limitGif}
                alt=""
                draggable={false}
                onError={() => setLimitFailed(true)}
                className="super-fallen-art super-fallen-motion"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: focalPosition,
                  opacity: limitOpacity,
                  animation: `superFallenLimitImage calc(${d} * 0.42) cubic-bezier(0.08, 0.86, 0.16, 1) both`,
                  willChange: 'transform, opacity',
                }}
              />
            )}

            {!shotFailed && (
              <img
                src={shotImage}
                alt=""
                draggable={false}
                onError={() => setShotFailed(true)}
                className="super-fallen-art super-fallen-motion"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: focalPosition,
                  opacity: launchOpacity,
                  animation: `superFallenLaunchImage calc(${d} * 0.72) cubic-bezier(0.08, 0.82, 0.14, 1) calc(${d} * 0.10) both`,
                  willChange: 'transform, opacity, filter',
                }}
              />
            )}

            <div
              className="super-fallen-motion"
              style={{
                position: 'absolute',
                left: '31%',
                top: '43%',
                width: '34%',
                aspectRatio: '1',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(189,235,255,0.42) 18%, rgba(84,165,255,0.10) 45%, transparent 72%)',
                filter: 'blur(2px)',
                animation: `superFallenLaunchBloom ${d} cubic-bezier(0.08, 0.84, 0.16, 1) both`,
                pointerEvents: 'none',
                willChange: 'transform, opacity',
              }}
            />

            <div
              className="super-fallen-motion"
              style={{
                position: 'absolute',
                inset: '-20%',
                background:
                  'linear-gradient(112deg, transparent 42%, rgba(203,239,255,0.12) 46%, rgba(255,255,255,0.40) 49%, rgba(203,239,255,0.10) 52%, transparent 57%)',
                mixBlendMode: 'screen',
                opacity: Math.max(0, Math.min(0.70, t * 1.65)),
                animation: `superFallenEnergyTravel calc(${d} * 0.68) cubic-bezier(0.10, 0.88, 0.16, 1) calc(${d} * 0.13) both`,
                pointerEvents: 'none',
                willChange: 'transform, opacity',
              }}
            />

            <div
              className="super-fallen-motion"
              style={{
                position: 'absolute',
                inset: 0,
                background: '#fff',
                opacity: 0,
                animation: `superFallenFlash ${d} ease-out both`,
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at 46% 45%, rgba(255,255,255,0) 28%, rgba(0,0,0,0.08) 62%, rgba(0,0,0,0.42) 100%)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {(showDamage || showMiss) && (
            <div
              className="super-fallen-motion"
              style={{
                position: 'absolute',
                left: '50%',
                top: '88%',
                transform: 'translate(-50%, -50%)',
                whiteSpace: 'nowrap',
                color: '#FFFFFF',
                fontSize: 'clamp(18px, 3.8vw, 34px)',
                fontWeight: 950,
                letterSpacing: '0.08em',
                textShadow: '0 0 12px rgba(110,203,255,0.85), 0 2px 8px rgba(0,0,0,0.96)',
                animation: `superFallenImpactText calc(${d} * 0.34) cubic-bezier(0.12, 0.80, 0.20, 1) calc(${d} * 0.28) both`,
                pointerEvents: 'none',
              }}
            >
              {showMiss ? 'MISS!!  超堕天撃回避' : `−${damage} DMG`}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export { SuperFallenShotVfx };
