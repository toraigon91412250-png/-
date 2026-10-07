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
  const [cutinFailed, setCutinFailed] = useState(false);

  const t = clamp01(progress);
  const duration = Math.max(1, durationMs);
  const d = `${duration}ms`;
  const isShot = mode === 'SHOT';

  const damageVisible =
    isShot &&
    !isEvade &&
    damage > 0 &&
    t >= 0.54 &&
    t <= 0.86;

  const missVisible =
    isShot &&
    isEvade &&
    t >= 0.54 &&
    t <= 0.82;

  const chargeImageOpacity = chargeFailed
    ? 0
    : t < 0.08
      ? t / 0.08
      : t > 0.95
        ? (1 - t) / 0.05
        : 1;

  const limitT = clamp01((t - 0.02) / 0.22);
  const limitOpacity = isShot && !limitFailed
    ? limitT < 0.18
      ? limitT / 0.18
      : limitT > 0.82
        ? (1 - limitT) / 0.18
        : 1
    : 0;

  const shotOpacity = isShot && !shotFailed
    ? t < 0.20
      ? 0
      : t < 0.28
        ? (t - 0.20) / 0.08
        : t > 0.92
          ? (1 - t) / 0.08
          : 1
    : 0;

  const closePunch = isShot
    ? Math.max(0, Math.min(1, (t - 0.30) / 0.18)) *
      Math.max(0, Math.min(1, (0.66 - t) / 0.20))
    : 0;

  const cutinOpacity =
    isShot && !cutinFailed
      ? t < 0.44
        ? 0
        : t < 0.54
          ? (t - 0.44) / 0.10
          : t > 0.82
            ? (0.96 - t) / 0.14
            : 1
      : 0;

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
        @keyframes sfsChargeCamera {
          0% { transform: translate3d(-50%, -50%, 0) scale(1); }
          23% { transform: translate3d(calc(-50% - 14px), calc(-50% + 4px), 0) scale(1.012); }
          48% { transform: translate3d(calc(-50% + 10px), calc(-50% - 6px), 0) scale(1.026); }
          72% { transform: translate3d(calc(-50% - 6px), calc(-50% + 2px), 0) scale(1.038); }
          100% { transform: translate3d(calc(-50% + 8px), calc(-50% - 3px), 0) scale(1.048); }
        }

        @keyframes sfsChargeClose {
          0% { transform: translate3d(-47%, -47%, 0) scale(1.04); opacity: 0; }
          18% { opacity: 0; }
          34% { transform: translate3d(-43%, -46%, 0) scale(1.13); opacity: 0.22; }
          50% { transform: translate3d(-39%, -45%, 0) scale(1.20); opacity: 0.72; }
          66% { transform: translate3d(-43%, -48%, 0) scale(1.26); opacity: 0.18; }
          84% { opacity: 0; }
          100% { opacity: 0; }
        }

        @keyframes sfsChargeGlow {
          0% { transform: translate(-50%, -50%) scale(0.45); opacity: 0; }
          22% { transform: translate(-50%, -50%) scale(0.72); opacity: 0.54; }
          52% { transform: translate(-50%, -50%) scale(1.00); opacity: 0.20; }
          76% { transform: translate(-50%, -50%) scale(1.25); opacity: 0.10; }
          100% { transform: translate(-50%, -50%) scale(1.55); opacity: 0; }
        }

        @keyframes sfsChargeClose {
          0%, 26% {
            transform: translate3d(-54%, -48%, 0) scale(1.08);
            opacity: 0;
          }
          38% {
            transform: translate3d(-49%, -46%, 0) scale(1.20);
            opacity: 0.16;
          }
          50% {
            transform: translate3d(-44%, -43%, 0) scale(1.34);
            opacity: 0.72;
          }
          62% {
            transform: translate3d(-47%, -45%, 0) scale(1.27);
            opacity: 0.40;
          }
          72%, 100% {
            transform: translate3d(-52%, -48%, 0) scale(1.10);
            opacity: 0;
          }
        }

        @keyframes sfsShotClose {
          0%, 18% {
            transform: translate3d(-49%, -47%, 0) scale(1.05);
            opacity: 0;
          }
          25% {
            transform: translate3d(-45%, -44%, 0) scale(1.17);
            opacity: 0.20;
          }
          34% {
            transform: translate3d(-40%, -41%, 0) scale(1.31);
            opacity: 0.78;
          }
          44% {
            transform: translate3d(-43%, -43%, 0) scale(1.25);
            opacity: 0.42;
          }
          54% {
            transform: translate3d(-49%, -46%, 0) scale(1.08);
            opacity: 0;
          }
          100% { opacity: 0; }
        }

        @keyframes sfsShotCamera {
          0% { transform: translate3d(0,0,0) scale(1); }
          8% { transform: translate3d(-6px,2px,0) scale(1.035); }
          14% { transform: translate3d(9px,-3px,0) scale(1.08); }
          20% { transform: translate3d(-12px,4px,0) scale(1.12); }
          28% { transform: translate3d(9px,-3px,0) scale(1.09); }
          38% { transform: translate3d(-5px,2px,0) scale(1.05); }
          52% { transform: translate3d(2px,-1px,0) scale(1.025); }
          68% { transform: translate3d(-1px,0,0) scale(1.012); }
          84%,100% { transform: translate3d(0,0,0) scale(1); }
        }

        @keyframes sfsLimitZoom {
          0% { transform: scale(1.02); filter: contrast(1.04) brightness(0.84) saturate(0.9); }
          100% { transform: scale(1.16); filter: contrast(1.32) brightness(1.04) saturate(1.18); }
        }

        @keyframes sfsShotImage {
          0% {
            transform: translate3d(2%, 3%, 0) scale(1.08);
            filter: brightness(0.72) saturate(1.00);
          }
          18% {
            transform: translate3d(-1%, 0%, 0) scale(1.035);
            filter: brightness(1.04) saturate(1.10);
          }
          48% {
            transform: translate3d(-4%, -1.5%, 0) scale(1.06);
            filter: brightness(1.02) saturate(1.08);
          }
          72% {
            transform: translate3d(1%, -2%, 0) scale(1.02);
            filter: brightness(1) saturate(1.06);
          }
          100% {
            transform: translate3d(0%, 0%, 0) scale(1);
            filter: brightness(1) saturate(1.04);
          }
        }

        @keyframes sfsShotClose {
          0% { transform: translate3d(-3%, 2%, 0) scale(1.12); opacity: 0; }
          8% { opacity: 0; }
          18% { transform: translate3d(-10%, 1%, 0) scale(1.22); opacity: 0.34; }
          28% { transform: translate3d(-15%, -1%, 0) scale(1.30); opacity: 0.76; }
          38% { transform: translate3d(-8%, -2%, 0) scale(1.24); opacity: 0.35; }
          52% { opacity: 0; }
          100% { opacity: 0; }
        }

        @keyframes sfsFlash {
          0%, 27% { opacity: 0; }
          31% { opacity: 0.94; }
          36% { opacity: 0.08; }
          100% { opacity: 0; }
        }

        @keyframes sfsOriginBurst {
          0% { transform: translate(-50%, -50%) scale(0.25); opacity: 0; }
          16% { transform: translate(-50%, -50%) scale(0.62); opacity: 0.95; }
          34% { transform: translate(-50%, -50%) scale(1.02); opacity: 0.52; }
          62% { transform: translate(-50%, -50%) scale(1.52); opacity: 0.12; }
          100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
        }

        @keyframes sfsLightningA {
          0% { transform: rotate(-8deg) scaleX(0.08); opacity: 0; }
          12% { opacity: 1; }
          36% { transform: rotate(-10deg) scaleX(1); opacity: 0.92; }
          68% { transform: translateX(18%) rotate(-8deg) scaleX(1.30); opacity: 0.20; }
          100% { transform: translateX(34%) rotate(-6deg) scaleX(1.5); opacity: 0; }
        }

        @keyframes sfsLightningB {
          0% { transform: rotate(7deg) scaleX(0.04); opacity: 0; }
          16% { opacity: 0.85; }
          42% { transform: translateX(12%) rotate(8deg) scaleX(1); opacity: 0.72; }
          74% { transform: translateX(28%) rotate(6deg) scaleX(1.26); opacity: 0.16; }
          100% { transform: translateX(40%) rotate(5deg) scaleX(1.4); opacity: 0; }
        }

        @keyframes sfsLightningC {
          0% { transform: rotate(-2deg) scaleX(0.05); opacity: 0; }
          18% { opacity: 0.64; }
          45% { transform: translateX(8%) rotate(-3deg) scaleX(1); opacity: 0.58; }
          70% { transform: translateX(22%) rotate(-1deg) scaleX(1.20); opacity: 0.10; }
          100% { transform: translateX(36%) rotate(0deg) scaleX(1.36); opacity: 0; }
        }

        @keyframes sfsCutin {
          0% { transform: translate3d(-115%, 12%, 0) skewX(-10deg) rotate(-3deg); }
          22% { transform: translate3d(-25%, 2%, 0) skewX(-7deg) rotate(-2deg); }
          42% { transform: translate3d(0, 0, 0) skewX(-4deg) rotate(-1deg); }
          100% { transform: translate3d(8%, -3%, 0) skewX(-4deg) rotate(-1deg); }
        }

        @keyframes sfsDamage {
          0% { transform: translate(-50%, -50%) scale(0.48) rotate(-5deg); opacity: 0; }
          18% { transform: translate(-50%, -50%) scale(1.14) rotate(-2deg); opacity: 1; }
          34% { transform: translate(-50%, -50%) scale(1.02) rotate(0); opacity: 1; }
          100% { transform: translate(-50%, -54%) scale(0.98) rotate(0); opacity: 0; }
        }

        .sfs-art {
          position: absolute;
          left: 50%;
          top: 50%;
          height: min(84vh, 760px);
          width: auto;
          max-width: none;
          user-select: none;
          -webkit-user-select: none;
          pointer-events: none;
        }

        .sfs-backdrop {
          filter: blur(18px) brightness(0.18) saturate(0.85);
          opacity: 0.42;
          transform: translate(-50%, -50%) scale(1.20);
        }

        .sfs-wide {
          transform: translate(-50%, -50%);
        }

        @media (max-width: 600px) {
          .sfs-art {
            height: min(86dvh, 700px);
          }
        }

        @media (min-width: 1100px) {
          .sfs-art {
            height: min(88vh, 780px);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .sfs-motion {
            animation: none !important;
          }
        }
      `}</style>

      {mode === 'CHARGE' ? (
        <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
          {!chargeFailed && (
            <>
              <img
                src={chargeImage}
                alt=""
                draggable={false}
                onError={(event) => { setChargeFailed(true); event.currentTarget.style.display = 'none'; }}
                className="sfs-art sfs-backdrop"
                style={{ animation: `sfsChargeCamera ${d} ease-out both` }}
              />
              <img
                src={chargeImage}
                alt=""
                draggable={false}
                onError={(event) => { setChargeFailed(true); event.currentTarget.style.display = 'none'; }}
                className="sfs-art sfs-wide sfs-motion"
                style={{
                  opacity: chargeImageOpacity,
                  animation: `sfsChargeCamera ${d} cubic-bezier(0.16,0.80,0.20,1) both`,
                  willChange: 'transform, opacity',
                }}
              />
              <img
                src={chargeImage}
                alt=""
                draggable={false}
                onError={(event) => { setChargeFailed(true); event.currentTarget.style.display = 'none'; }}
                className="sfs-art sfs-motion"
                style={{
                  animation: `sfsChargeClose ${d} cubic-bezier(0.08,0.84,0.14,1) both`,
                  filter: 'brightness(1.05) saturate(1.08)',
                  willChange: 'transform, opacity, filter',
                }}
              />
              <img
                src={chargeImage}
                alt=""
                draggable={false}
                onError={(event) => { setChargeFailed(true); event.currentTarget.style.display = 'none'; }}
                className="sfs-art sfs-wide sfs-motion"
                style={{
                  animation: `sfsChargeClose ${d} cubic-bezier(0.10,0.82,0.18,1) both`,
                  willChange: 'transform, opacity',
                }}
              />
            </>
          )}

          <div
            className="sfs-motion"
            style={{
              position: 'absolute',
              left: '31%',
              top: '45%',
              width: '30%',
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.30) 0%, rgba(174,226,255,0.12) 25%, rgba(104,100,195,0.05) 50%, transparent 72%)',
              filter: 'blur(9px)',
              animation: `sfsChargeGlow ${d} ease-out both`,
              willChange: 'transform, opacity',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 52% 46%, transparent 34%, rgba(0,0,0,0.20) 60%, rgba(0,0,0,0.76) 100%)',
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: '#000',
              opacity: Math.max(0, 0.40 - t * 0.26),
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              position: 'absolute',
              right: '6%',
              bottom: '8%',
              color: 'rgba(224,242,255,0.76)',
              fontSize: 'clamp(10px, 1.8vw, 15px)',
              fontWeight: 900,
              letterSpacing: '0.28em',
              textShadow: '0 0 12px rgba(105,198,255,0.72)',
              opacity: Math.max(0, Math.min(1, (t - 0.42) / 0.30)),
            }}
          >
            超堕天撃
          </div>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#000',
            animation: `sfsShotCamera ${d} cubic-bezier(0.12,0.84,0.18,1) both`,
            willChange: 'transform',
          }}
        >
          <img
            src={shotImage}
            alt=""
            draggable={false}
            onError={(event) => { setShotFailed(true); event.currentTarget.style.display = 'none'; }}
            className="sfs-art sfs-backdrop"
            style={{ animation: `sfsShotImage ${d} cubic-bezier(0.10,0.76,0.18,1) both` }}
          />

          {!limitFailed && (
            <img
              src={limitGif}
              alt=""
              draggable={false}
              onError={(event) => { setLimitFailed(true); event.currentTarget.style.display = 'none'; }}
              className="sfs-art sfs-wide sfs-motion"
              style={{
                opacity: limitOpacity,
                animation: `sfsLimitZoom calc(${d} * 0.38) cubic-bezier(0.08,0.88,0.16,1) both`,
                willChange: 'transform, opacity, filter',
              }}
            />
          )}

          {!shotFailed && (
            <>
              <img
                src={shotImage}
                alt=""
                draggable={false}
                onError={(event) => { setShotFailed(true); event.currentTarget.style.display = 'none'; }}
                className="sfs-art sfs-wide sfs-motion"
                style={{
                  opacity: shotOpacity,
                  animation: `sfsShotImage ${d} cubic-bezier(0.10,0.76,0.18,1) both`,
                  willChange: 'transform, opacity, filter',
                }}
              />
              <img
                src={shotImage}
                alt=""
                draggable={false}
                onError={(event) => { setShotFailed(true); event.currentTarget.style.display = 'none'; }}
                className="sfs-art sfs-motion"
                style={{
                  animation: `sfsShotClose ${d} cubic-bezier(0.08,0.84,0.14,1) both`,
                  filter: 'brightness(1.10) saturate(1.10)',
                  willChange: 'transform, opacity, filter',
                }}
              />
              <img
                src={shotImage}
                alt=""
                draggable={false}
                onError={(event) => { setShotFailed(true); event.currentTarget.style.display = 'none'; }}
                className="sfs-art sfs-wide sfs-motion"
                style={{
                  opacity: closePunch * 0.78,
                  height: 'min(100vh, 900px)',
                  animation: `sfsShotClose ${d} cubic-bezier(0.08,0.84,0.14,1) both`,
                  willChange: 'transform, opacity',
                }}
              />
            </>
          )}

          <div
            className="sfs-motion"
            style={{
              position: 'absolute',
              left: '31%',
              top: '44%',
              width: '34%',
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(188,235,255,0.42) 16%, rgba(74,163,255,0.12) 42%, transparent 74%)',
              filter: 'blur(2px)',
              animation: `sfsOriginBurst ${d} cubic-bezier(0.06,0.88,0.14,1) both`,
            }}
          />

          <div
            className="sfs-motion"
            style={{
              position: 'absolute',
              left: '31%',
              top: '44%',
              width: '70%',
              height: '7px',
              transformOrigin: 'left center',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(224,247,255,0.96) 18%, rgba(98,190,255,0.86) 64%, rgba(98,190,255,0) 100%)',
              boxShadow: '0 0 10px rgba(132,213,255,0.86), 0 0 25px rgba(80,160,255,0.36)',
              clipPath: 'polygon(0 44%, 5% 10%, 13% 70%, 20% 24%, 28% 78%, 36% 20%, 47% 76%, 60% 18%, 73% 70%, 86% 20%, 100% 42%, 86% 67%, 72% 48%, 59% 94%, 46% 50%, 34% 86%, 21% 48%, 11% 90%, 5% 51%)',
              animation: `sfsLightningA calc(${d} * 0.55) cubic-bezier(0.08,0.9,0.12,1) calc(${d} * 0.10) both`,
              pointerEvents: 'none',
            }}
          />

          <div
            className="sfs-motion"
            style={{
              position: 'absolute',
              left: '31%',
              top: '47%',
              width: '60%',
              height: '5px',
              transformOrigin: 'left center',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(214,245,255,0.84) 24%, rgba(74,166,255,0.72) 68%, rgba(74,166,255,0) 100%)',
              boxShadow: '0 0 8px rgba(112,203,255,0.64)',
              clipPath: 'polygon(0 42%, 9% 8%, 17% 68%, 28% 20%, 39% 79%, 51% 16%, 64% 74%, 78% 24%, 100% 42%, 85% 68%, 66% 49%, 54% 94%, 39% 50%, 24% 88%, 12% 49%, 4% 82%)',
              animation: `sfsLightningB calc(${d} * 0.50) cubic-bezier(0.08,0.9,0.12,1) calc(${d} * 0.13) both`,
              pointerEvents: 'none',
            }}
          />

          <div
            className="sfs-motion"
            style={{
              position: 'absolute',
              left: '31%',
              top: '45%',
              width: '56%',
              height: '3px',
              transformOrigin: 'left center',
              background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(233,249,255,0.75) 30%, rgba(120,205,255,0.54) 70%, rgba(120,205,255,0) 100%)',
              clipPath: 'polygon(0 44%, 14% 8%, 24% 68%, 37% 22%, 49% 78%, 61% 18%, 73% 68%, 88% 26%, 100% 42%, 85% 64%, 72% 49%, 60% 92%, 48% 51%, 35% 86%, 22% 48%, 11% 82%)',
              animation: `sfsLightningC calc(${d} * 0.46) cubic-bezier(0.08,0.9,0.12,1) calc(${d} * 0.16) both`,
              pointerEvents: 'none',
            }}
          />

          <div
            className="sfs-motion"
            style={{
              position: 'absolute',
              inset: 0,
              background: '#fff',
              opacity: 0,
              animation: `sfsFlash ${d} ease-out both`,
              pointerEvents: 'none',
            }}
          />

          {damageVisible && (
            <>
              <div
                className="sfs-motion"
                style={{
                  position: 'absolute',
                  left: '-5%',
                  bottom: '6%',
                  width: 'min(62vw, 700px)',
                  maxHeight: '25vh',
                  overflow: 'hidden',
                  clipPath: 'polygon(0 11%, 100% 0, 92% 89%, 0 100%)',
                  borderTop: '2px solid rgba(184,233,255,0.92)',
                  borderBottom: '2px solid rgba(72,151,255,0.30)',
                  background: 'rgba(2,8,22,0.90)',
                  boxShadow: '0 0 34px rgba(70,168,255,0.24)',
                  animation: `sfsCutin calc(${d} * 0.62) cubic-bezier(0.08,0.86,0.14,1) calc(${d} * 0.40) both`,
                }}
              >
                {!cutinFailed && (
                  <img
                    src={irenaCutin}
                    alt=""
                    draggable={false}
                    onError={() => setCutinFailed(true)}
                    style={{
                      display: 'block',
                      width: '100%',
                      height: 'auto',
                      opacity: cutinOpacity,
                      userSelect: 'none',
                    }}
                  />
                )}
              </div>

              <div
                className="sfs-motion"
                style={{
                  position: 'absolute',
                  left: '66%',
                  top: '53%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  lineHeight: 0.84,
                  animation: `sfsDamage calc(${d} * 0.55) cubic-bezier(0.08,0.84,0.14,1) calc(${d} * 0.40) both`,
                }}
              >
                <div
                  style={{
                    fontSize: 'clamp(62px, 17vw, 170px)',
                    fontWeight: 1000,
                    letterSpacing: '-0.07em',
                    color: '#FFFFFF',
                    WebkitTextStroke: '1px rgba(190,236,255,0.66)',
                    textShadow: '0 0 8px rgba(255,255,255,0.98), 0 0 24px rgba(74,178,255,0.96), 7px 8px 0 rgba(3,10,24,0.94)',
                  }}
                >
                  −{damage}
                </div>
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: 'clamp(10px, 2.2vw, 18px)',
                    fontWeight: 1000,
                    color: '#DFF7FF',
                    letterSpacing: '0.26em',
                    textShadow: '0 0 12px rgba(105,198,255,0.92)',
                  }}
                >
                  超堕天撃
                </div>
              </div>
            </>
          )}

          {missVisible && (
            <div
              className="sfs-motion"
              style={{
                position: 'absolute',
                left: '50%',
                top: '76%',
                transform: 'translate(-50%, -50%)',
                fontSize: 'clamp(24px, 5vw, 46px)',
                fontWeight: 1000,
                color: '#fff',
                textShadow: '0 0 14px rgba(105,198,255,0.92), 0 2px 8px rgba(0,0,0,0.96)',
                animation: `sfsDamage calc(${d} * 0.40) cubic-bezier(0.08,0.84,0.14,1) calc(${d} * 0.30) both`,
              }}
            >
              MISS!!  超堕天撃回避
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export { SuperFallenShotVfx };
