import React, { useState } from 'react';
import superFallenChargeImage from '../assets/super-fallen-shot-charge.jpg';
import superFallenLimitGif from '../assets/super-fallen-shot-limit.gif';
import superFallenShotImage from '../assets/super-fallen-shot.jpg';

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
  const [chargeImageFailed, setChargeImageFailed] = useState(false);
  const [limitImageFailed, setLimitImageFailed] = useState(false);
  const [shotImageFailed, setShotImageFailed] = useState(false);

  const duration = `${durationMs}ms`;
  const t = clamp01(progress);
  const isShot = mode === 'SHOT';
  const impactWindow = isShot && t >= 0.30 && t <= 0.60;
  const damageVisible = impactWindow && damage > 0 && !isEvade;
  const missVisible = impactWindow && isEvade;

  const chargeOpacity = chargeImageFailed
    ? 0
    : t < 0.08
      ? t / 0.08
      : t > 0.86
        ? (1 - t) / 0.14
        : 1;

  const limitWindow = clamp01((t - 0.06) / 0.36);
  const limitOpacity = !isShot || limitImageFailed || t > 0.45
    ? 0
    : Math.sin(Math.min(1, limitWindow) * Math.PI);

  const shotWindow = clamp01((t - 0.28) / 0.72);
  const shotOpacity = !isShot || shotImageFailed
    ? 0
    : shotWindow < 0.12
      ? shotWindow / 0.12
      : shotWindow > 0.86
        ? (1 - shotWindow) / 0.14
        : 1;

  const corePulse = isShot
    ? Math.max(0, 1 - Math.abs(t - 0.30) / 0.14)
    : Math.max(0, Math.sin(t * Math.PI));

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
          ? `superFallenShotShake ${duration} cubic-bezier(0.18, 0.86, 0.22, 1) both`
          : `superFallenChargePulse ${duration} ease-out both`,
      }}
    >
      <style>{`
        @keyframes superFallenChargePulse {
          0% { transform: scale(1); }
          42% { transform: scale(1.006); }
          100% { transform: scale(1.012); }
        }
        @keyframes superFallenShotShake {
          0%, 100% { transform: translate3d(0, 0, 0); }
          12% { transform: translate3d(-3px, 2px, 0); }
          18% { transform: translate3d(5px, -2px, 0); }
          24% { transform: translate3d(-8px, 3px, 0); }
          32% { transform: translate3d(7px, -3px, 0) scale(1.015); }
          42% { transform: translate3d(-4px, 2px, 0); }
          58% { transform: translate3d(2px, -1px, 0); }
          74% { transform: translate3d(-1px, 0, 0); }
        }
        @keyframes superFallenChargeImage {
          0% { transform: scale(0.985) translate3d(0, 1.2%, 0); opacity: 0; }
          14% { opacity: 1; }
          58% { transform: scale(1.025) translate3d(0, -0.4%, 0); opacity: 1; }
          100% { transform: scale(1.045) translate3d(0, -0.8%, 0); opacity: 0; }
        }
        @keyframes superFallenChargeAura {
          0% { transform: scale(0.6); opacity: 0; }
          22% { opacity: 0.7; }
          65% { transform: scale(1.08); opacity: 0.32; }
          100% { transform: scale(1.24); opacity: 0; }
        }
        @keyframes superFallenLineBurst {
          0% { transform: scale(0.2); opacity: 0; }
          35% { opacity: 0.95; }
          100% { transform: scale(1.18); opacity: 0; }
        }
        @keyframes superFallenLimitZoom {
          0% { transform: scale(1.02); filter: contrast(1.1) saturate(1.1) brightness(0.94); }
          100% { transform: scale(1.20); filter: contrast(1.45) saturate(1.35) brightness(1.1); }
        }
        @keyframes superFallenShotImage {
          0% { transform: scale(1.14) translate3d(-1.5%, 3.5%, 0); filter: saturate(1.05) brightness(0.82); }
          35% { transform: scale(1.055) translate3d(0, 0, 0); filter: saturate(1.2) brightness(1.06); }
          100% { transform: scale(1.01) translate3d(0, -2.5%, 0); filter: saturate(1.08) brightness(1); }
        }
        @keyframes superFallenTravelLines {
          0% { transform: translate3d(0, 11%, 0) scale(1.03); opacity: 0; }
          22% { opacity: 0.9; }
          100% { transform: translate3d(0, -14%, 0) scale(1.16); opacity: 0; }
        }
        @keyframes superFallenFlash {
          0%, 40% { opacity: 0; }
          48% { opacity: 0.95; }
          58% { opacity: 0.22; }
          100% { opacity: 0; }
        }
        @keyframes superFallenTextPop {
          0% { transform: scale(0.75) translateY(14px); opacity: 0; }
          35% { transform: scale(1.08) translateY(0); opacity: 1; }
          100% { transform: scale(1) translateY(-8px); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .super-fallen-vfx-motion { animation: none !important; }
        }
      `}</style>

      {mode === 'CHARGE' ? (
        <>
          <div
            className="super-fallen-vfx-motion"
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,4,0.94)',
              opacity: t < 0.12 ? 0.72 + t * 2.2 : 0.98,
            }}
          />
          <div
            className="super-fallen-vfx-motion"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: 'min(82vw, 860px)',
              height: 'min(78vh, 720px)',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              animation: `superFallenChargeImage ${duration} cubic-bezier(0.16, 0.82, 0.26, 1) both`,
              willChange: 'transform, opacity',
            }}
          >
            {!chargeImageFailed && (
              <img
                src={superFallenChargeImage}
                alt=""
                draggable={false}
                onError={() => setChargeImageFailed(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                  opacity: chargeOpacity,
                  filter: 'contrast(1.04) saturate(0.88) brightness(0.92)',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              />
            )}
          </div>

          <div
            style={{
              position: 'absolute',
              left: '31%',
              top: '47%',
              width: '24%',
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.55) 0%, rgba(191,235,255,0.16) 24%, rgba(113,72,180,0.10) 44%, transparent 72%)',
              filter: 'blur(9px)',
              animation: `superFallenChargeAura ${duration} ease-out both`,
              willChange: 'transform, opacity',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: '-25%',
              background: 'radial-gradient(circle at 31% 47%, rgba(165,218,255,0.11) 0%, rgba(98,70,170,0.05) 18%, transparent 46%)',
              opacity: Math.max(0, 1 - t * 1.1),
            }}
          />

          <div
            className="super-fallen-vfx-motion"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'radial-gradient(circle at 30% 48%, rgba(210,245,255,0.95) 0 1.5px, transparent 2px), radial-gradient(circle at 34% 44%, rgba(150,220,255,0.75) 0 1px, transparent 1.5px), radial-gradient(circle at 29% 53%, rgba(190,170,255,0.65) 0 1px, transparent 1.5px)',
              backgroundSize: '18px 18px, 27px 27px, 33px 33px',
              mixBlendMode: 'screen',
              opacity: Math.max(0, 0.16 - t * 0.16),
              transform: `translateY(${t * -18}px)`,
              willChange: 'transform, opacity',
            }}
          />
        </>
      ) : (
        <>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'radial-gradient(circle at 50% 43%, rgba(255,255,255,0.22) 0%, rgba(90,160,255,0.08) 22%, rgba(0,0,0,0.78) 78%)',
              opacity: Math.max(0.28, 0.82 - t * 0.42),
            }}
          />

          {!limitImageFailed && (
            <img
              src={superFallenLimitGif}
              alt=""
              draggable={false}
              onError={() => setLimitImageFailed(true)}
              className="super-fallen-vfx-motion"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 'min(96vw, 1120px)',
                height: 'min(82vh, 760px)',
                transform: 'translate(-50%, -50%)',
                objectFit: 'contain',
                objectPosition: 'center',
                opacity: limitOpacity,
                mixBlendMode: 'screen',
                animation: `superFallenLimitZoom calc(${duration} * 0.42) cubic-bezier(0.12, 0.78, 0.18, 1) both`,
                willChange: 'transform, opacity',
              }}
            />
          )}

          <div
            style={{
              position: 'absolute',
              inset: '-35%',
              background: 'repeating-conic-gradient(from 0deg, rgba(224,242,255,0) 0deg 2.2deg, rgba(224,242,255,0.64) 2.2deg 2.7deg, rgba(224,242,255,0) 2.7deg 7deg)',
              maskImage: 'radial-gradient(circle at center, transparent 0 18%, black 37%, black 82%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(circle at center, transparent 0 18%, black 37%, black 82%, transparent 100%)',
              opacity: Math.max(0, limitOpacity * 0.88),
              transform: `scale(${0.82 + limitWindow * 0.38})`,
              transformOrigin: 'center',
              willChange: 'transform, opacity',
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '48%',
              width: '18%',
              aspectRatio: '1',
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.98) 0 7%, rgba(176,240,255,0.9) 12%, rgba(80,170,255,0.16) 40%, transparent 72%)',
              filter: 'blur(2px)',
              opacity: corePulse,
              mixBlendMode: 'screen',
            }}
          />

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(255,255,255,0.95)',
              opacity: Math.max(0, corePulse - 0.62) * 0.75,
              animation: `superFallenFlash calc(${duration} * 0.62) ease-out both`,
            }}
          />

          {!shotImageFailed && (
            <div
              className="super-fallen-vfx-motion"
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: 'min(94vw, 1120px)',
                height: 'min(84vh, 780px)',
                transform: 'translate(-50%, -50%)',
                opacity: shotOpacity,
                animation: `superFallenShotImage ${duration} cubic-bezier(0.12, 0.74, 0.2, 1) ${`calc(${duration} * 0.25)`} both`,
                willChange: 'transform, opacity, filter',
              }}
            >
              <img
                src={superFallenShotImage}
                alt=""
                draggable={false}
                onError={() => setShotImageFailed(true)}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
              />
            </div>
          )}

          <div
            className="super-fallen-vfx-motion"
            style={{
              position: 'absolute',
              inset: '-18%',
              background: 'repeating-linear-gradient(112deg, transparent 0 13px, rgba(195,235,255,0.22) 13px 15px, transparent 15px 31px)',
              mixBlendMode: 'screen',
              opacity: Math.max(0, Math.min(0.8, shotWindow * 0.86)),
              animation: `superFallenTravelLines ${duration} cubic-bezier(0.1, 0.85, 0.2, 1) both`,
              willChange: 'transform, opacity',
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '47%',
              width: `clamp(150px, 25vw, 330px)`,
              height: `clamp(150px, 25vw, 330px)`,
              transform: 'translate(-50%, -50%)',
              border: '1px solid rgba(213,245,255,0.66)',
              borderRadius: '50%',
              boxShadow: '0 0 30px rgba(141,211,255,0.42), inset 0 0 28px rgba(255,255,255,0.18)',
              opacity: Math.max(0, corePulse * 0.75),
            }}
          />

          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              whiteSpace: 'nowrap',
              color: '#FFFFFF',
              fontSize: 'clamp(16px, 3.2vw, 30px)',
              fontWeight: 1000,
              letterSpacing: '0.14em',
              textShadow: '0 0 10px rgba(105,198,255,0.92), 0 2px 6px rgba(0,0,0,0.95)',
              opacity: damageVisible || missVisible ? 1 : 0,
              animation: `superFallenTextPop calc(${duration} * 0.44) cubic-bezier(0.12, 0.8, 0.2, 1) calc(${duration} * 0.29) both`,
            }}
          >
            {missVisible ? 'MISS!!  超堕天撃回避' : damageVisible ? `−${damage} DMG` : ''}
          </div>
        </>
      )}
    </div>
  );
};
