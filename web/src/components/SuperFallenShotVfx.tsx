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

  /*
   * Artwork coordinates, not viewport coordinates.
   * Both supplied JPEGs place the face near the center and the emitting hand
   * around x=31%, y=43%. All light/origin effects follow that composition.
   */
  const originX = '31%';
  const originY = '43%';

  const chargeOpacity = chargeFailed
    ? 0
    : t < 0.10
      ? t / 0.10
      : t > 0.90
        ? (1 - t) / 0.10
        : 1;

  const limitOpacity = isShot && !limitFailed
    ? Math.sin(clamp01((t - 0.015) / 0.19) * Math.PI)
    : 0;

  const impactTextVisible =
    isShot &&
    !isEvade &&
    damage > 0 &&
    t >= 0.34 &&
    t <= 0.78;

  const missTextVisible =
    isShot &&
    isEvade &&
    t >= 0.28 &&
    t <= 0.70;

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 60,
        isolation: 'isolate',
        background: '#000',
      }}
    >
      <style>{`
        @keyframes superFallenChargeCamera {
          0% {
            transform: translate(-50%, -50%) scale(1);
          }
          70% {
            transform: translate(-50%, -50%) scale(1.018);
          }
          100% {
            transform: translate(-50%, -50%) scale(1.032);
          }
        }

        @keyframes superFallenChargeImage {
          0% {
            transform: scale(1.015);
            opacity: 0;
            filter: brightness(0.72) contrast(1.02);
          }
          13% {
            opacity: 1;
          }
          70% {
            transform: scale(1.035);
            opacity: 1;
            filter: brightness(0.91) contrast(1.05);
          }
          100% {
            transform: scale(1.05);
            opacity: 0;
            filter: brightness(0.76) contrast(1.02);
          }
        }

        @keyframes superFallenChargeVignette {
          0% { opacity: 0.90; }
          50% { opacity: 0.74; }
          100% { opacity: 0.96; }
        }

        @keyframes superFallenChargePulse {
          0% {
            transform: translate(-50%, -50%) scale(0.48);
            opacity: 0;
          }
          24% {
            transform: translate(-50%, -50%) scale(0.86);
            opacity: 0.64;
          }
          68% {
            transform: translate(-50%, -50%) scale(1.04);
            opacity: 0.18;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.26);
            opacity: 0;
          }
        }

        @keyframes superFallenShotCamera {
          0%, 100% {
            transform: translate(-50%, -50%) scale(1.03);
          }
          11% {
            transform: translate(calc(-50% - 3px), calc(-50% + 1px)) scale(1.045);
          }
          18% {
            transform: translate(calc(-50% + 6px), calc(-50% - 2px)) scale(1.055);
          }
          25% {
            transform: translate(calc(-50% - 7px), calc(-50% + 2px)) scale(1.06);
          }
          33% {
            transform: translate(calc(-50% + 5px), calc(-50% - 1px)) scale(1.045);
          }
          46% {
            transform: translate(calc(-50% - 2px), -50%) scale(1.035);
          }
          100% {
            transform: translate(-50%, -50%) scale(1.03);
          }
        }

        @keyframes superFallenLimitImage {
          0% {
            transform: scale(1);
            filter: contrast(1.02) brightness(0.96);
          }
          100% {
            transform: scale(1.08);
            filter: contrast(1.16) brightness(1.02);
          }
        }

        @keyframes superFallenShotReveal {
          0% {
            clip-path: circle(0% at 31% 43%);
            transform: scale(1.09);
            filter: brightness(0.82) saturate(1.02);
          }
          21% {
            clip-path: circle(62% at 31% 43%);
            transform: scale(1.04);
            filter: brightness(1.02) saturate(1.10);
          }
          42% {
            clip-path: circle(116% at 31% 43%);
            transform: scale(1.018);
            filter: brightness(1.08) saturate(1.16);
          }
          100% {
            clip-path: circle(125% at 31% 43%);
            transform: scale(1);
            filter: brightness(1) saturate(1.06);
          }
        }

        @keyframes superFallenShotFlash {
          0%, 26% { opacity: 0; }
          32% { opacity: 0.92; }
          40% { opacity: 0.08; }
          100% { opacity: 0; }
        }

        @keyframes superFallenOriginBloom {
          0% {
            transform: translate(-50%, -50%) scale(0.35);
            opacity: 0;
          }
          48% {
            transform: translate(-50%, -50%) scale(0.9);
            opacity: 0.92;
          }
          68% {
            transform: translate(-50%, -50%) scale(1.42);
            opacity: 0.18;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.8);
            opacity: 0;
          }
        }

        @keyframes superFallenImpactText {
          0% {
            transform: translate(-50%, -50%) scale(0.78);
            opacity: 0;
          }
          34% {
            transform: translate(-50%, -50%) scale(1.04);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0;
          }
        }

        @media (max-aspect-ratio: 4/5) {
          .super-fallen-stage {
            width: auto !important;
            height: 70% !important;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .super-fallen-motion {
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
              background: '#000',
            }}
          />

          <div
            className="super-fallen-stage super-fallen-motion"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 'min(96%, 1264px)',
              aspectRatio: '3 / 2',
              transform: 'translate(-50%, -50%)',
              overflow: 'hidden',
              background: '#000',
              boxShadow: '0 0 80px rgba(76, 115, 170, 0.10)',
              animation: `superFallenChargeCamera ${d} cubic-bezier(0.18, 0.78, 0.22, 1) both`,
              willChange: 'transform',
            }}
          >
            {!chargeFailed && (
              <img
                src={chargeImage}
                alt=""
                draggable={false}
                onError={() => setChargeFailed(true)}
                className="super-fallen-motion"
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  userSelect: 'none',
                  animation: `superFallenChargeImage ${d} cubic-bezier(0.15, 0.80, 0.25, 1) both`,
                  willChange: 'transform, opacity, filter',
                }}
              />
            )}

            <div
              className="super-fallen-motion"
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at 31% 43%, rgba(255,255,255,0.06) 0%, rgba(128,174,220,0.03) 24%, transparent 55%)',
                animation: `superFallenChargeVignette ${d} ease-in-out both`,
                pointerEvents: 'none',
              }}
            />

            <div
              className="super-fallen-motion"
              style={{
                position: 'absolute',
                left: originX,
                top: originY,
                width: '30%',
                aspectRatio: '1',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.34) 0%, rgba(184,230,255,0.14) 22%, rgba(111,123,201,0.06) 44%, transparent 72%)',
                filter: 'blur(7px)',
                animation: `superFallenChargePulse ${d} ease-out both`,
                pointerEvents: 'none',
                willChange: 'transform, opacity',
              }}
            />

            <div
              style={{
                position: 'absolute',
                left: originX,
                top: originY,
                width: '11%',
                aspectRatio: '1',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                border: '1px solid rgba(224,242,255,0.34)',
                boxShadow: '0 0 24px rgba(191,235,255,0.13)',
                opacity: Math.max(0, Math.sin(t * Math.PI) * 0.58),
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at 50% 46%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.28) 74%, rgba(0,0,0,0.70) 100%)',
                opacity: 0.96,
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: '#000',
                opacity: 0.42,
                pointerEvents: 'none',
              }}
            />
          </div>
        </>
      ) : (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#000',
            }}
          />

          <div
            className="super-fallen-stage super-fallen-motion"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 'min(100%, 1264px)',
              aspectRatio: '3 / 2',
              transform: 'translate(-50%, -50%)',
              overflow: 'hidden',
              background: '#000',
              animation: `superFallenShotCamera ${d} cubic-bezier(0.16, 0.82, 0.20, 1) both`,
              willChange: 'transform',
            }}
          >
            {!limitFailed && (
              <img
                src={limitGif}
                alt=""
                draggable={false}
                onError={() => setLimitFailed(true)}
                className="super-fallen-motion"
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  opacity: limitOpacity,
                  animation: `superFallenLimitImage calc(${d} * 0.25) cubic-bezier(0.08, 0.86, 0.16, 1) both`,
                  willChange: 'transform, opacity',
                }}
              />
            )}

            {!shotFailed && (
              <div
                className="super-fallen-motion"
                style={{
                  position: 'absolute',
                  inset: 0,
                  animation: `superFallenShotReveal calc(${d} * 0.72) cubic-bezier(0.08, 0.80, 0.12, 1) calc(${d} * 0.10) both`,
                  willChange: 'transform, clip-path, filter',
                }}
              >
                <img
                  src={shotImage}
                  alt=""
                  draggable={false}
                  onError={() => setShotFailed(true)}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    userSelect: 'none',
                  }}
                />
              </div>
            )}

            <div
              className="super-fallen-motion"
              style={{
                position: 'absolute',
                left: originX,
                top: originY,
                width: '28%',
                aspectRatio: '1',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(189,235,255,0.42) 18%, rgba(92,168,255,0.10) 45%, transparent 72%)',
                filter: 'blur(2px)',
                animation: `superFallenOriginBloom ${d} cubic-bezier(0.10, 0.84, 0.20, 1) both`,
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
                animation: `superFallenShotFlash ${d} ease-out both`,
                pointerEvents: 'none',
              }}
            />

            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(circle at 46% 45%, rgba(255,255,255,0) 30%, rgba(0,0,0,0.14) 64%, rgba(0,0,0,0.46) 100%)',
                pointerEvents: 'none',
              }}
            />
          </div>

          {(impactTextVisible || missTextVisible) && (
            <div
              className="super-fallen-motion"
              style={{
                position: 'absolute',
                left: '50%',
                top: '86%',
                transform: 'translate(-50%, -50%)',
                whiteSpace: 'nowrap',
                color: '#FFFFFF',
                fontSize: 'clamp(18px, 3.6vw, 34px)',
                fontWeight: 950,
                letterSpacing: '0.08em',
                textShadow:
                  '0 0 12px rgba(118,202,255,0.80), 0 2px 8px rgba(0,0,0,0.96)',
                animation: `superFallenImpactText calc(${d} * 0.42) cubic-bezier(0.12, 0.80, 0.20, 1) calc(${d} * 0.28) both`,
                pointerEvents: 'none',
              }}
            >
              {missTextVisible ? 'MISS!!  超堕天撃回避' : `−${damage} DMG`}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export { SuperFallenShotVfx };
