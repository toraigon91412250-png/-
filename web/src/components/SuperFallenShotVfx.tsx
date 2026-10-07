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

  const chargeImageOpacity = chargeFailed
    ? 0
    : t < 0.08
      ? t / 0.08
      : t > 0.94
        ? (1 - t) / 0.06
        : 1;

  const shotOpacity = isShot
    ? t < 0.13
      ? 0
      : t < 0.22
        ? (t - 0.13) / 0.09
        : t > 0.94
          ? (1 - t) / 0.06
          : 1
    : 0;

  const limitT = clamp01((t - 0.025) / 0.22);
  const limitOpacity = isShot && !limitFailed
    ? limitT < 0.14
      ? limitT / 0.14
      : limitT > 0.78
        ? (1 - limitT) / 0.22
        : 1
    : 0;

  const closePunch = isShot
    ? Math.max(0, 1 - Math.abs(t - 0.32) / 0.16)
    : 0;

  const chargeClose = !isShot
    ? Math.max(0, 1 - Math.abs(t - 0.64) / 0.22)
    : 0;

  const cutinVisible = isShot && !cutinFailed && t >= 0.42 && t <= 0.86;
  const damageVisible = isShot && !isEvade && damage > 0 && t >= 0.54 && t <= 0.88;
  const missVisible = isShot && isEvade && t >= 0.54 && t <= 0.82;

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
        @keyframes sfsChargeWide {
          0% { transform: translate(-50%, -50%) scale(1.01); }
          20% { transform: translate(calc(-50% - 10px), calc(-50% + 2px)) scale(1.025); }
          42% { transform: translate(calc(-50% + 6px), calc(-50% - 4px)) scale(1.04); }
          64% { transform: translate(calc(-50% - 4px), calc(-50% + 3px)) scale(1.055); }
          82% { transform: translate(calc(-50% + 5px), calc(-50% - 2px)) scale(1.07); }
          100% { transform: translate(calc(-50% + 1px), calc(-50% - 2px)) scale(1.08); }
        }

        @keyframes sfsChargeClose {
          0%, 28% { transform: translate(-50%, -50%) scale(1.05); opacity: 0; }
          42% { transform: translate(calc(-50% - 5px), calc(-50% - 2px)) scale(1.18); opacity: 0.18; }
          55% { transform: translate(calc(-50% + 3px), calc(-50% - 3px)) scale(1.30); opacity: 0.78; }
          66% { transform: translate(calc(-50% - 3px), calc(-50% - 2px)) scale(1.24); opacity: 0.34; }
          76%,100% { transform: translate(-50%, -50%) scale(1.08); opacity: 0; }
        }

        @keyframes sfsShotCamera {
          0% { transform: translate3d(0,0,0) scale(1) rotate(0deg); }
          9% { transform: translate3d(-7px,3px,0) scale(1.028) rotate(-0.24deg); }
          17% { transform: translate3d(10px,-4px,0) scale(1.07) rotate(0.34deg); }
          26% { transform: translate3d(-14px,5px,0) scale(1.12) rotate(-0.48deg); }
          36% { transform: translate3d(11px,-3px,0) scale(1.085) rotate(0.28deg); }
          48% { transform: translate3d(-8px,3px,0) scale(1.055) rotate(-0.18deg); }
          61% { transform: translate3d(6px,-2px,0) scale(1.032) rotate(0.10deg); }
          74% { transform: translate3d(-4px,1px,0) scale(1.017) rotate(-0.05deg); }
          88% { transform: translate3d(2px,0,0) scale(1.006) rotate(0.02deg); }
          100% { transform: translate3d(0,0,0) scale(1) rotate(0deg); }
        }

        @keyframes sfsShotWide {
          0% { transform: translate(-50%, -50%) scale(1.045); }
          20% { transform: translate(calc(-50% - 8px), calc(-50% + 2px)) scale(1.015); }
          42% { transform: translate(calc(-50% + 10px), calc(-50% - 2px)) scale(1.045); }
          65% { transform: translate(calc(-50% - 6px), calc(-50% + 2px)) scale(1.025); }
          84% { transform: translate(calc(-50% + 5px), calc(-50% - 1px)) scale(1.01); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }

        @keyframes sfsShotClose {
          0%, 20% { transform: translate(-50%, -50%) scale(1.06); opacity: 0; }
          28% { transform: translate(calc(-50% + 4px), calc(-50% - 3px)) scale(1.20); opacity: 0.16; }
          36% { transform: translate(calc(-50% + 8px), calc(-50% - 5px)) scale(1.34); opacity: 0.82; }
          47% { transform: translate(calc(-50% + 5px), calc(-50% - 4px)) scale(1.27); opacity: 0.42; }
          58% { transform: translate(-50%, -50%) scale(1.08); opacity: 0; }
          100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
        }

        @keyframes sfsLimit {
          0% { transform: scale(1.00); filter: contrast(1.0) brightness(0.80) saturate(0.88); }
          100% { transform: scale(1.18); filter: contrast(1.34) brightness(1.06) saturate(1.2); }
        }

        @keyframes sfsOrigin {
          0% { transform: translate(-50%,-50%) scale(0.2); opacity: 0; }
          17% { transform: translate(-50%,-50%) scale(0.58); opacity: 0.98; }
          35% { transform: translate(-50%,-50%) scale(1.0); opacity: 0.52; }
          58% { transform: translate(-50%,-50%) scale(1.46); opacity: 0.12; }
          100% { transform: translate(-50%,-50%) scale(1.9); opacity: 0; }
        }

        @keyframes sfsBoltA {
          0% { transform: rotate(-7deg) scaleX(0.05); opacity: 0; }
          10% { opacity: 1; }
          35% { transform: rotate(-9deg) scaleX(1); opacity: 0.96; }
          65% { transform: translateX(16%) rotate(-7deg) scaleX(1.25); opacity: 0.20; }
          100% { transform: translateX(34%) rotate(-5deg) scaleX(1.45); opacity: 0; }
        }

        @keyframes sfsBoltB {
          0% { transform: rotate(8deg) scaleX(0.04); opacity: 0; }
          14% { opacity: 0.92; }
          42% { transform: translateX(10%) rotate(7deg) scaleX(1); opacity: 0.78; }
          72% { transform: translateX(28%) rotate(5deg) scaleX(1.24); opacity: 0.16; }
          100% { transform: translateX(42%) rotate(4deg) scaleX(1.40); opacity: 0; }
        }

        @keyframes sfsFlash {
          0%, 27% { opacity: 0; }
          31% { opacity: 0.98; }
          36% { opacity: 0.06; }
          100% { opacity: 0; }
        }

        @keyframes sfsCrackle {
          0%, 100% { opacity: 0; transform: scaleY(0.55) rotate(-7deg); }
          9% { opacity: 0.85; }
          13% { opacity: 0.18; }
          19% { opacity: 0.92; }
          25% { opacity: 0.10; }
          34% { opacity: 0.76; transform: scaleY(1) rotate(-3deg); }
          48% { opacity: 0.18; }
          62% { opacity: 0.70; transform: scaleY(0.78) rotate(4deg); }
          76% { opacity: 0.08; }
          88% { opacity: 0.54; transform: scaleY(1.05) rotate(-2deg); }
        }

        @keyframes sfsCrackle2 {
          0%, 100% { opacity: 0; transform: scaleY(0.4) rotate(9deg); }
          12% { opacity: 0.58; }
          24% { opacity: 0.08; }
          38% { opacity: 0.84; transform: scaleY(1) rotate(5deg); }
          52% { opacity: 0.14; }
          66% { opacity: 0.70; transform: scaleY(0.72) rotate(-4deg); }
          82% { opacity: 0.16; }
        }

        @keyframes sfsCameraCut {
          0%, 34% { opacity: 0; transform: scale(0.96); }
          37% { opacity: 0.82; transform: scale(1.01); }
          42% { opacity: 0; transform: scale(1.04); }
          100% { opacity: 0; }
        }

        @keyframes sfsCutin {
          0% { transform: translate3d(-120%, 10%, 0) skewX(-12deg) rotate(-3deg); opacity: 0; }
          16% { opacity: 1; }
          36% { transform: translate3d(-8%,1%,0) skewX(-5deg) rotate(-1.5deg); opacity: 1; }
          54% { transform: translate3d(8%,-2%,0) skewX(-4deg) rotate(-1deg); opacity: 1; }
          100% { transform: translate3d(18%,-5%,0) skewX(-4deg) rotate(-1deg); opacity: 0; }
        }

        @keyframes sfsImpactTitle {
          0% { transform: translate(-50%,-50%) scale(0.82); opacity: 0; }
          24% { transform: translate(-50%,-50%) scale(1.02); opacity: 0.72; }
          52% { transform: translate(-50%,-50%) scale(1.08); opacity: 0.24; }
          100% { transform: translate(-50%,-56%) scale(1.14); opacity: 0; }
        }

        @keyframes sfsDamage {
          0% { transform: translate(-50%,-50%) scale(0.42) rotate(-6deg); opacity: 0; }
          14% { transform: translate(-50%,-50%) scale(1.22) rotate(-2deg); opacity: 1; }
          28% { transform: translate(-50%,-50%) scale(1.04) rotate(0); opacity: 1; }
          52% { transform: translate(-50%,-54%) scale(0.99) rotate(0); opacity: 0.28; }
          100% { transform: translate(-50%,-58%) scale(0.96) rotate(0); opacity: 0; }
        }

        @keyframes sfsTitle {
          0% { transform: translate(-50%,8px) scale(0.88); opacity: 0; }
          26% { transform: translate(-50%,0) scale(1); opacity: 1; }
          70% { transform: translate(-50%,-2px) scale(1.03); opacity: 1; }
          100% { transform: translate(-50%,-8px) scale(1.02); opacity: 0; }
        }

        .sfs-art {
          position: absolute;
          left: 50%;
          top: 46%;
          width: min(149vw, 1870px);
          height: auto;
          max-width: 149vw;
          max-height: 94vh;
          object-fit: contain;
          object-position: center center;
          transform: translate(-50%, -50%);
          user-select: none;
          -webkit-user-select: none;
          pointer-events: none;
        }

        .sfs-backdrop {
          filter: blur(20px) brightness(0.22) saturate(0.90);
          opacity: 0.54;
          transform: translate(-50%,-50%) scale(1.18);
        }

        @media (max-width: 600px) {
          .sfs-art {
            width: min(149vw, 990px);
            max-width: 149vw;
            max-height: 90dvh;
          }
        }


        @media (prefers-reduced-motion: reduce) {
          .sfs-motion { animation: none !important; }
        }
      `}</style>

      <div
        className="sfs-motion"
        aria-hidden="true"
        style={{
          position: 'absolute',
          left: '7%',
          bottom: '-2%',
          width: '38%',
          height: '42%',
          borderLeft: '3px solid rgba(183,233,255,0.46)',
          borderBottom: '2px solid rgba(93,182,255,0.24)',
          clipPath: 'polygon(0 100%, 8% 68%, 18% 74%, 28% 34%, 37% 48%, 49% 12%, 58% 28%, 70% 0, 78% 25%, 89% 18%, 100% 0, 90% 38%, 79% 32%, 68% 54%, 59% 46%, 48% 88%, 38% 72%, 28% 100%)',
          boxShadow: '0 0 12px rgba(117,205,255,0.55), 0 0 28px rgba(73,157,255,0.22)',
          filter: 'drop-shadow(0 0 8px rgba(184,237,255,0.34))',
          animation: `sfsCrackle ${d} linear infinite`,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

      <div
        className="sfs-motion"
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: '6%',
          bottom: '-3%',
          width: '34%',
          height: '38%',
          borderRight: '3px solid rgba(180,230,255,0.42)',
          borderBottom: '2px solid rgba(87,176,255,0.22)',
          clipPath: 'polygon(0 98%, 12% 72%, 23% 84%, 31% 48%, 43% 54%, 54% 16%, 63% 28%, 75% 4%, 86% 34%, 100% 18%, 90% 48%, 77% 43%, 65% 61%, 53% 52%, 43% 88%, 30% 77%, 18% 100%)',
          boxShadow: '0 0 12px rgba(117,205,255,0.52), 0 0 28px rgba(73,157,255,0.20)',
          filter: 'drop-shadow(0 0 8px rgba(184,237,255,0.30))',
          animation: `sfsCrackle2 ${d} linear infinite`,
          pointerEvents: 'none',
          zIndex: 3,
        }}
      />

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
                style={{ animation: `sfsChargeWide ${d} ease-out both` }}
              />
              <img
                src={chargeImage}
                alt=""
                draggable={false}
                onError={(event) => { setChargeFailed(true); event.currentTarget.style.display = 'none'; }}
                className="sfs-art sfs-motion"
                style={{
                  opacity: chargeImageOpacity * (1 - chargeClose * 0.92),
                  animation: `sfsChargeWide ${d} cubic-bezier(0.16,0.80,0.20,1) both`,
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
                  opacity: chargeClose,
                  filter: 'brightness(1.08) saturate(1.08)',
                  animation: `sfsChargeClose ${d} cubic-bezier(0.08,0.84,0.14,1) both`,
                  willChange: 'transform, opacity, filter',
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
              transform: 'translate(-50%,-50%)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.86) 0%, rgba(173,228,255,0.30) 26%, transparent 72%)',
              animation: `sfsCameraCut ${d} ease-out both`,
              pointerEvents: 'none',
            }}
          />

          <div
            className="sfs-motion"
            style={{
              position: 'absolute',
              left: '31%',
              top: '45%',
              width: '30%',
              aspectRatio: '1',
              transform: 'translate(-50%,-50%)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.32) 0%, rgba(175,228,255,0.13) 24%, rgba(104,102,195,0.04) 50%, transparent 72%)',
              filter: 'blur(9px)',
              animation: `sfsChargeGlow ${d} ease-out both`,
              willChange: 'transform, opacity',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 50% 44%, transparent 30%, rgba(0,0,0,0.18) 58%, rgba(0,0,0,0.76) 100%)',
              pointerEvents: 'none',
            }}
          />

          <div
            className="sfs-motion"
            style={{
              position: 'absolute',
              left: '50%',
              top: '14%',
              color: '#EAF8FF',
              fontSize: 'clamp(18px,4.5vw,48px)',
              fontWeight: 1000,
              letterSpacing: '0.28em',
              textShadow: '0 0 10px rgba(104,205,255,0.80), 0 0 26px rgba(68,132,255,0.34)',
              opacity: Math.max(0, Math.min(1, (t - 0.60) / 0.16)) * Math.max(0, Math.min(1, (0.98 - t) / 0.20)),
              animation: `sfsTitle ${d} cubic-bezier(0.10,0.84,0.16,1) both`,
              pointerEvents: 'none',
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
            style={{ animation: `sfsShotWide ${d} ease-out both` }}
          />

          {!limitFailed && (
            <img
              src={limitGif}
              alt=""
              draggable={false}
              onError={(event) => { setLimitFailed(true); event.currentTarget.style.display = 'none'; }}
              className="sfs-art sfs-motion"
              style={{
                opacity: limitOpacity,
                animation: `sfsLimit calc(${d} * 0.30) cubic-bezier(0.08,0.88,0.16,1) both`,
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
                className="sfs-art sfs-motion"
                style={{
                  opacity: shotOpacity * (1 - closePunch * 0.92),
                  animation: `sfsShotWide ${d} cubic-bezier(0.10,0.76,0.18,1) both`,
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
                  opacity: closePunch,
                  width: 'min(135vw, 1700px)',
                  height: 'auto',
                  maxWidth: '135vw',
                  maxHeight: '86vh',
                  objectFit: 'contain',
                  objectPosition: 'center center',
                  filter: 'brightness(1.10) saturate(1.10)',
                  animation: `sfsShotClose ${d} cubic-bezier(0.08,0.84,0.14,1) both`,
                  willChange: 'transform, opacity, filter',
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
              width: '35%',
              aspectRatio: '1',
              transform: 'translate(-50%,-50%)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(190,236,255,0.44) 16%, rgba(75,166,255,0.11) 43%, transparent 74%)',
              filter: 'blur(2px)',
              animation: `sfsOrigin ${d} cubic-bezier(0.06,0.88,0.14,1) both`,
              willChange: 'transform, opacity',
            }}
          />

          <div
            className="sfs-motion"
            style={{
              position: 'absolute',
              left: '31%',
              top: '44%',
              width: '68%',
              height: '6px',
              transformOrigin: 'left center',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.04), rgba(224,247,255,0.94) 18%, rgba(83,184,255,0.82) 66%, rgba(83,184,255,0) 100%)',
              boxShadow: '0 0 10px rgba(132,213,255,0.86), 0 0 23px rgba(80,160,255,0.34)',
              clipPath: 'polygon(0 44%, 7% 9%, 14% 71%, 21% 23%, 29% 79%, 38% 18%, 48% 78%, 61% 18%, 74% 73%, 86% 22%, 100% 43%, 86% 66%, 73% 47%, 60% 94%, 47% 50%, 34% 86%, 21% 47%, 11% 90%, 5% 51%)',
              animation: `sfsBoltA calc(${d} * 0.48) cubic-bezier(0.08,0.9,0.12,1) calc(${d} * 0.12) both`,
              pointerEvents: 'none',
            }}
          />

          <div
            className="sfs-motion"
            style={{
              position: 'absolute',
              left: '31%',
              top: '47%',
              width: '58%',
              height: '4px',
              transformOrigin: 'left center',
              background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(220,246,255,0.82) 22%, rgba(75,170,255,0.70) 70%, rgba(75,170,255,0) 100%)',
              boxShadow: '0 0 8px rgba(112,203,255,0.60)',
              clipPath: 'polygon(0 42%, 9% 8%, 17% 67%, 28% 20%, 39% 80%, 51% 16%, 64% 73%, 78% 23%, 100% 42%, 85% 68%, 66% 49%, 54% 94%, 39% 50%, 24% 88%, 12% 49%, 4% 82%)',
              animation: `sfsBoltB calc(${d} * 0.45) cubic-bezier(0.08,0.9,0.12,1) calc(${d} * 0.14) both`,
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

          {cutinVisible && !cutinFailed && (
            <div
              className="sfs-motion"
              style={{
                position: 'absolute',
                left: '-4%',
                bottom: '4%',
                width: 'min(60vw, 700px)',
                maxHeight: '25vh',
                overflow: 'hidden',
                clipPath: 'polygon(0 12%, 100% 0, 93% 88%, 0 100%)',
                borderTop: '2px solid rgba(188,235,255,0.90)',
                borderBottom: '2px solid rgba(71,157,255,0.28)',
                background: 'rgba(2,8,22,0.92)',
                boxShadow: '0 0 36px rgba(70,168,255,0.24)',
                animation: `sfsCutin ${d} cubic-bezier(0.08,0.88,0.12,1) calc(${d} * 0.40) both`,
              }}
            >
              <img
                src={irenaCutin}
                alt=""
                draggable={false}
                onError={() => setCutinFailed(true)}
                style={{
                  display: 'block',
                  width: '100%',
                  height: 'auto',
                  opacity: 0.96,
                  userSelect: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(90deg, rgba(1,7,17,0.34), rgba(1,7,17,0) 78%)',
                }}
              />
            </div>
          )}

          {damageVisible && (
            <>
              <div
                className="sfs-motion"
                style={{
                  position: 'absolute',
                  left: '50%',
                  top: '54%',
                  transform: 'translate(-50%,-50%)',
                  color: 'rgba(228,249,255,0.20)',
                  fontSize: 'clamp(34px,8vw,84px)',
                  fontWeight: 1000,
                  letterSpacing: '0.18em',
                  whiteSpace: 'nowrap',
                  textShadow: '0 0 24px rgba(74,178,255,0.56)',
                  animation: `sfsImpactTitle calc(${d} * 0.42) cubic-bezier(0.08,0.84,0.14,1) calc(${d} * 0.46) both`,
                  pointerEvents: 'none',
                }}
              >
                超堕天撃
              </div>

              <div
                className="sfs-motion"
                style={{
                  position: 'absolute',
                  left: '68%',
                  top: '53%',
                transform: 'translate(-50%,-50%)',
                textAlign: 'center',
                lineHeight: 0.82,
                animation: `sfsDamage calc(${d} * 0.48) cubic-bezier(0.08,0.84,0.14,1) calc(${d} * 0.50) both`,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  fontSize: 'clamp(64px,18vw,186px)',
                  fontWeight: 1000,
                  letterSpacing: '-0.075em',
                  color: '#FFFFFF',
                  WebkitTextStroke: '1px rgba(190,236,255,0.72)',
                  textShadow: '0 0 9px rgba(255,255,255,0.98), 0 0 26px rgba(74,178,255,0.98), 7px 8px 0 rgba(3,10,24,0.96)',
                }}
              >
                −{damage}
              </div>
              <div
                style={{
                  marginTop: '8px',
                  fontSize: 'clamp(10px,2.2vw,18px)',
                  fontWeight: 1000,
                  color: '#DFF7FF',
                  letterSpacing: '0.26em',
                  textShadow: '0 0 12px rgba(105,198,255,0.94)',
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
                transform: 'translate(-50%,-50%)',
                fontSize: 'clamp(24px,5vw,48px)',
                fontWeight: 1000,
                color: '#fff',
                textShadow: '0 0 14px rgba(105,198,255,0.92), 0 2px 8px rgba(0,0,0,0.96)',
                animation: `sfsDamage calc(${d} * 0.36) cubic-bezier(0.08,0.84,0.14,1) calc(${d} * 0.50) both`,
              }}
            >
              MISS!! 超堕天撃回避
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export { SuperFallenShotVfx };
