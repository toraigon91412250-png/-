import React, { useState } from 'react';
import chargeImage from '../assets/IMG_1148.jpeg';
import irenaCutin from '../assets/img_irena_cutin.jpg';
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
  const focalPosition = '50% 50%';

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
          0%, 100% { transform: scale(1); }
          55% { transform: scale(1.012); }
          88% { transform: scale(1.025); }
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
          0% { transform: scale(1); }
          7% { transform: translate3d(-4px, 1px, 0) scale(1.05); }
          12% { transform: translate3d(7px, -2px, 0) scale(1.11); }
          18% { transform: translate3d(-9px, 3px, 0) scale(1.13); }
          25% { transform: translate3d(7px, -3px, 0) scale(1.08); }
          34% { transform: translate3d(-4px, 1px, 0) scale(1.035); }
          46% { transform: translate3d(2px, -1px, 0) scale(1.015); }
          62%, 100% { transform: scale(1); }
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

        @keyframes superFallenCutinIn {
          0% {
            transform: translate3d(-115%, 0, 0) skewX(-10deg) rotate(-3deg);
            opacity: 0;
          }
          18% {
            opacity: 1;
          }
          44% {
            transform: translate3d(0, 0, 0) skewX(-4deg) rotate(-1deg);
            opacity: 1;
          }
          100% {
            transform: translate3d(8%, 0, 0) skewX(-4deg) rotate(-1deg);
            opacity: 0;
          }
        }

        @keyframes superFallenDamagePop {
          0% {
            transform: translate(-50%, -50%) scale(0.55) rotate(-4deg);
            opacity: 0;
          }
          20% {
            transform: translate(-50%, -50%) scale(1.12) rotate(-2deg);
            opacity: 1;
          }
          38% {
            transform: translate(-50%, -50%) scale(1.02) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -58%) scale(1) rotate(0deg);
            opacity: 0;
          }
        }

        @keyframes superFallenLightning {
          0% {
            transform: translate(-50%, -50%) scale(0.2) rotate(-8deg);
            opacity: 0;
          }
          18% {
            opacity: 0.95;
          }
          34% {
            transform: translate(-50%, -50%) scale(1.05) rotate(2deg);
            opacity: 0.9;
          }
          58% {
            transform: translate(-50%, -50%) scale(1.35) rotate(-2deg);
            opacity: 0.22;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.65) rotate(4deg);
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
                  objectFit: 'contain',
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
                  objectFit: 'contain',
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
                width: '42%',
                aspectRatio: '1',
                transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background:
                  'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(185,235,255,0.58) 13%, rgba(55,145,255,0.22) 35%, transparent 70%)',
                filter: 'blur(1px)',
                animation: `superFallenLightning calc(${d} * 0.58) cubic-bezier(0.10, 0.86, 0.14, 1) calc(${d} * 0.14) both`,
                pointerEvents: 'none',
                willChange: 'transform, opacity',
              }}
            />

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

          {showDamage && (
            <>
              <div
                className="super-fallen-motion"
                style={{
                  position: 'absolute',
                  left: '-4%',
                  top: '54%',
                  width: 'min(76vw, 720px)',
                  maxHeight: '30vh',
                  objectFit: 'cover',
                  transform: 'rotate(-6deg)',
                  borderTop: '3px solid rgba(160,220,255,0.78)',
                  borderBottom: '3px solid rgba(160,220,255,0.26)',
                  boxShadow: '0 0 28px rgba(90,180,255,0.24)',
                  clipPath: 'polygon(0 8%, 100% 0, 93% 92%, 0 100%)',
                  overflow: 'hidden',
                  background: 'rgba(3,10,24,0.76)',
                  animation: `superFallenCutinIn calc(${d} * 0.60) cubic-bezier(0.10, 0.86, 0.14, 1) calc(${d} * 0.26) both`,
                }}
              >
                <img
                  src={irenaCutin}
                  alt=""
                  draggable={false}
                  onError={(event) => { event.currentTarget.style.display = 'none'; }}
                  style={{
                    display: 'block',
                    width: '100%',
                    height: 'auto',
                    maxHeight: '30vh',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    opacity: 0.92,
                    userSelect: 'none',
                  }}
                />
              </div>

              <div
                className="super-fallen-motion"
                style={{
                  position: 'absolute',
                  left: '52%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  whiteSpace: 'nowrap',
                  textAlign: 'center',
                  lineHeight: 0.88,
                  animation: `superFallenDamagePop calc(${d} * 0.56) cubic-bezier(0.10, 0.82, 0.16, 1) calc(${d} * 0.30) both`,
                  pointerEvents: 'none',
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(44px, 14vw, 126px)',
                    fontWeight: 1000,
                    color: '#FFFFFF',
                    letterSpacing: '-0.055em',
                    textShadow: '0 0 8px rgba(255,255,255,0.95), 0 0 24px rgba(86,190,255,0.9), 5px 6px 0 rgba(5,12,28,0.9)',
                  }}
                >
                  −{damage}
                </div>
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: 'clamp(10px, 2.4vw, 18px)',
                    fontWeight: 1000,
                    color: '#D7F4FF',
                    letterSpacing: '0.24em',
                    textShadow: '0 0 10px rgba(105,198,255,0.9)',
                  }}
                >
                  SUPER FALLEN SHOT
                </div>
              </div>
            </>
          )}

          {showMiss && (
            <div
              className="super-fallen-motion"
              style={{
                position: 'absolute',
                left: '50%',
                top: '76%',
                transform: 'translate(-50%, -50%)',
                whiteSpace: 'nowrap',
                color: '#FFFFFF',
                fontSize: 'clamp(22px, 5vw, 44px)',
                fontWeight: 1000,
                textShadow: '0 0 12px rgba(105,198,255,0.92), 0 2px 8px rgba(0,0,0,0.96)',
                animation: `superFallenDamagePop calc(${d} * 0.40) cubic-bezier(0.10, 0.82, 0.16, 1) calc(${d} * 0.28) both`,
              }}
            >
              MISS!!  超堕天撃回避
            </div>
          )}
        </>
      )}
    </div>
  );
};

export { SuperFallenShotVfx };
