import React, { useEffect, useState } from 'react';
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
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const easeOut = (value: number) => {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
};
const phase = (t: number, start: number, end: number) => {
  if (t <= start || t >= end) return 0;
  return clamp01((t - start) / Math.max(0.0001, end - start));
};
const peak = (t: number, start: number, peakAt: number, end: number) => {
  if (t <= start || t >= end) return 0;
  if (t <= peakAt) return clamp01((t - start) / Math.max(0.0001, peakAt - start));
  return clamp01((end - t) / Math.max(0.0001, end - peakAt));
};

const ENERGY_SHARDS = [
  { angle: -39, start: 0.19, end: 0.48, length: 14, width: 0.32, delay: 0.00 },
  { angle: -29, start: 0.22, end: 0.55, length: 10, width: 0.24, delay: 0.04 },
  { angle: -18, start: 0.16, end: 0.45, length: 18, width: 0.20, delay: 0.02 },
  { angle: -10, start: 0.27, end: 0.57, length: 11, width: 0.18, delay: 0.05 },
  { angle: -4, start: 0.31, end: 0.60, length: 16, width: 0.16, delay: 0.01 },
  { angle: 6, start: 0.23, end: 0.53, length: 13, width: 0.22, delay: 0.07 },
  { angle: 13, start: 0.18, end: 0.50, length: 19, width: 0.18, delay: 0.03 },
  { angle: 22, start: 0.26, end: 0.59, length: 12, width: 0.24, delay: 0.08 },
  { angle: 31, start: 0.20, end: 0.52, length: 17, width: 0.20, delay: 0.05 },
  { angle: 41, start: 0.28, end: 0.62, length: 11, width: 0.29, delay: 0.10 },
  { angle: -51, start: 0.34, end: 0.64, length: 9, width: 0.35, delay: 0.12 },
  { angle: 52, start: 0.37, end: 0.65, length: 10, width: 0.31, delay: 0.14 },
];

const AFTERMATH_SHARDS = [
  { angle: -70, speed: 22, size: 7, width: 2.2 },
  { angle: -55, speed: 18, size: 5, width: 1.8 },
  { angle: -38, speed: 26, size: 9, width: 2.4 },
  { angle: -21, speed: 20, size: 6, width: 2.0 },
  { angle: -7, speed: 29, size: 8, width: 2.2 },
  { angle: 9, speed: 24, size: 6, width: 2.0 },
  { angle: 25, speed: 19, size: 9, width: 2.4 },
  { angle: 43, speed: 27, size: 6, width: 1.9 },
  { angle: 59, speed: 22, size: 8, width: 2.1 },
  { angle: 74, speed: 17, size: 5, width: 1.7 },
];

const SuperFallenShotVfx: React.FC<SuperFallenShotVfxProps> = ({
  mode,
  progress,
  durationMs: _durationMs,
  damage = 0,
  isEvade = false,
}) => {
  const [shotFailed, setShotFailed] = useState(false);
  const [chargeFailed, setChargeFailed] = useState(false);
  const [limitFailed, setLimitFailed] = useState(false);
  const [cutinFailed, setCutinFailed] = useState(false);

  useEffect(() => {
    const sources = [chargeImage, shotImage, limitGif, irenaCutin];
    sources.forEach((src) => {
      const image = new Image();
      image.decoding = 'async';
      image.src = src;
      if (typeof image.decode === 'function') {
        image.decode().catch(() => undefined);
      }
    });
  }, []);

  const t = clamp01(progress);
  const isShot = mode === 'SHOT';

  if (!isShot) {
    const chargeBurst = peak(t, 0.18, 0.76, 0.96);
    const chargePulse = peak(t, 0.28, 0.60, 0.90);
    const ringP = smooth(phase(t, 0.08, 0.78));
    const focusP = easeOut(phase(t, 0.48, 0.92));
    const imageScale = 1.00 + ringP * 0.10 + chargePulse * 0.045;
    const imageOpacity = chargeFailed ? 0 : 0.28 + chargePulse * 0.64;
    const coreScale = 0.15 + focusP * 0.85;
    const blackout = phase(t, 0.91, 1.00);

    return (
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
          zIndex: 999,
          background: '#02040a',
          isolation: 'isolate',
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 31% 46%, rgba(38,92,170,0.26), rgba(0,0,0,0.92) 56%, #000 100%)' }} />

        {!chargeFailed && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src={chargeImage}
              alt=""
              draggable={false}
              onError={(event) => {
                setChargeFailed(true);
                event.currentTarget.style.display = 'none';
              }}
              style={{
                width: 'auto',
                height: 'min(88vh, 760px)',
                maxWidth: '94vw',
                maxHeight: '88vh',
                objectFit: 'contain',
                opacity: imageOpacity,
                transform: `scale(${imageScale}) translate3d(${-chargePulse * 5}px, ${chargePulse * -2}px, 0)`,
                transformOrigin: 'center center',
                filter: `brightness(${0.80 + chargePulse * 0.52}) contrast(${1.02 + chargePulse * 0.20}) saturate(${0.85 + chargePulse * 0.36})`,
                willChange: 'transform, opacity, filter',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </div>
        )}

        {[0, 1, 2].map((ring) => {
          const delay = ring * 0.06;
          const rp = clamp01((ringP - delay) / 0.90);
          const alpha = (0.26 + chargePulse * 0.55) * (1 - ring * 0.12);
          return (
            <div
              key={ring}
              style={{
                position: 'absolute',
                left: '31%',
                top: '46%',
                width: `${34 + ring * 9}%`,
                aspectRatio: '1 / 0.46',
                borderRadius: '50%',
                border: `${2 + ring}px solid rgba(198,233,255,${alpha})`,
                boxShadow: `0 0 ${12 + ring * 7}px rgba(89,177,255,${alpha * 0.95}), inset 0 0 ${10 + ring * 4}px rgba(180,230,255,${alpha * 0.55})`,
                transform: `translate(-50%,-50%) rotate(${-13 + ring * 18}deg) scale(${0.45 + rp * 1.35})`,
                opacity: chargeBurst * (0.72 - ring * 0.12),
                mixBlendMode: 'screen',
                willChange: 'transform, opacity',
              }}
            />
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: '31%',
            top: '46%',
            width: `${7 + focusP * 28}%`,
            aspectRatio: '1',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(190,232,255,0.65) 18%, rgba(70,145,255,0.22) 46%, transparent 74%)',
            filter: `blur(${Math.max(1, 8 - focusP * 6)}px)`,
            opacity: 0.25 + focusP * 0.75,
            transform: `translate(-50%,-50%) scale(${coreScale})`,
            mixBlendMode: 'screen',
            willChange: 'transform, opacity',
          }}
        />

        {[0, 1, 2, 3, 4, 5].map((i) => {
          const lineP = phase(t, 0.18 + i * 0.055, 0.73 + i * 0.025);
          const y = 41 + i * 2.1;
          const width = 24 + (i % 3) * 9;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: '29%',
                top: `${y}%`,
                width: `${width * lineP}%`,
                height: `${1 + (i % 2) * 1.4}px`,
                transformOrigin: 'left center',
                transform: `skewX(-18deg) scaleY(${0.55 + lineP * 0.45})`,
                background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(167,221,255,0.88), rgba(255,255,255,0))',
                opacity: lineP * (0.35 + (i % 3) * 0.12),
                filter: 'blur(0.25px)',
                mixBlendMode: 'screen',
              }}
            />
          );
        })}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 31% 46%, rgba(160,220,255,${chargeBurst * 0.18}), transparent 36%, rgba(0,0,0,${0.46 + blackout * 0.52}) 100%)`,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '13%',
            color: '#EAF8FF',
            fontSize: 'clamp(28px, 6vw, 54px)',
            fontWeight: 1000,
            letterSpacing: '0.28em',
            textShadow: '0 0 12px rgba(121,214,255,0.95), 0 0 30px rgba(56,118,255,0.62), 0 3px 10px rgba(0,0,0,0.9)',
            transform: `translateX(-50%) translateY(${phase(t, 0.55, 0.82) * -4}px) scale(${0.92 + phase(t, 0.55, 0.82) * 0.08})`,
            opacity: phase(t, 0.46, 0.91),
            whiteSpace: 'nowrap',
          }}
        >
          超堕天撃
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#ffffff',
            opacity: peak(t, 0.90, 0.965, 1.0) * 0.72,
            mixBlendMode: 'screen',
          }}
        />
      </div>
    );
  }

  // The visual-only hit-stop holds the pre-contact image for ~75ms without pausing game logic.
  const visualT = t >= 0.535 && t <= 0.5485 ? 0.535 : t;
  const introP = phase(visualT, 0.00, 0.18);
  const ringP = phase(visualT, 0.05, 0.33);
  const chargeP = phase(visualT, 0.16, 0.44);
  const beamP = phase(visualT, 0.26, 0.585);
  const launchP = phase(visualT, 0.39, 0.56);
  const contactP = phase(visualT, 0.535, 0.59);
  const fadeP = phase(visualT, 0.80, 1.00);

  const ringIn = easeOut(ringP);
  const launchEase = easeOut(beamP);
  const beamLength = 4 + launchEase * 105;
  const beamWidth = 1.5 + launchEase * 12;
  const originX = 31;
  const originY = 46;
  const impactX = 86;
  const impactY = 46;

  const cameraPulse = peak(t, 0.54, 0.565, 0.69);
  const cameraX = Math.sin(t * 250) * cameraPulse * 5.5;
  const cameraY = Math.cos(t * 230) * cameraPulse * 3.4;
  const cameraScale = 1 + cameraPulse * 0.022;

  const imageScale =
    0.98 +
    easeOut(introP) * 0.06 +
    launchP * 0.045 -
    peak(visualT, 0.59, 0.66, 0.80) * 0.035;
  const imageOpacity = shotFailed
    ? 0
    : 0.74 +
      peak(visualT, 0.09, 0.22, 0.36) * 0.18 +
      contactP * 0.08 -
      fadeP * 0.72;

  const contactFlash = peak(t, 0.535, 0.545, 0.585);
  const explosion = easeOut(contactP);
  const shockwave1 = phase(visualT, 0.565, 0.74);
  const shockwave2 = phase(visualT, 0.59, 0.84);
  const damageP = phase(t, 0.565, 0.71);
  const cutinP = phase(visualT, 0.36, 0.66);
  const labelP = phase(visualT, 0.63, 0.86);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 999,
        background: '#01030a',
        isolation: 'isolate',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at 31% 46%, rgba(34,87,170,0.20) 0%, rgba(4,10,22,0.82) 42%, rgba(0,0,0,0.98) 100%)',
          opacity: 0.94,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate3d(${cameraX}px,${cameraY}px,0) scale(${cameraScale})`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        {!shotFailed && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <img
              src={shotImage}
              alt=""
              draggable={false}
              onError={(event) => {
                setShotFailed(true);
                event.currentTarget.style.display = 'none';
              }}
              style={{
                width: 'auto',
                height: 'min(90vh, 790px)',
                maxWidth: '94vw',
                maxHeight: '90vh',
                objectFit: 'contain',
                objectPosition: 'center',
                opacity: imageOpacity,
                transform: `scale(${imageScale}) translate3d(${-launchP * 7}px,${launchP * -2}px,0)`,
                transformOrigin: 'center center',
                filter: `brightness(${0.78 + launchP * 0.32 + contactP * 0.28}) contrast(${1.04 + launchP * 0.18}) saturate(${0.92 + launchP * 0.22})`,
                mixBlendMode: 'screen',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                pointerEvents: 'none',
                willChange: 'transform, opacity, filter',
              }}
            />
          </div>
        )}

        {ringP > 0.001 && [0, 1, 2].map((ring) => {
          const rp = clamp01(ringIn - ring * 0.18);
          const alpha = (0.30 + chargeP * 0.54) * (1 - ring * 0.10);
          return (
            <div
              key={ring}
              style={{
                position: 'absolute',
                left: `${originX}%`,
                top: `${originY}%`,
                width: `${28 + ring * 10 + chargeP * 24}%`,
                aspectRatio: '1 / 0.40',
                borderRadius: '50%',
                border: `${2 + ring}px solid rgba(191,232,255,${alpha})`,
                boxShadow: `0 0 ${14 + ring * 8}px rgba(69,163,255,${alpha}), inset 0 0 ${12 + ring * 5}px rgba(214,244,255,${alpha * 0.72})`,
                transform: `translate(-50%,-50%) rotate(${-18 + ring * 18 + ringIn * 38}deg) scale(${0.30 + rp * 1.20})`,
                opacity: (1 - ring * 0.14) * (0.34 + ringP * 0.66),
                mixBlendMode: 'screen',
                willChange: 'transform, opacity',
              }}
            />
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: `${originX}%`,
            top: `${originY}%`,
            width: `${7 + chargeP * 27}%`,
            aspectRatio: '1',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.99) 0%, rgba(198,236,255,0.74) 18%, rgba(72,145,255,0.30) 48%, transparent 74%)',
            filter: 'blur(2px)',
            opacity: 0.28 + chargeP * 0.72,
            transform: `translate(-50%,-50%) scale(${0.22 + chargeP * 1.15})`,
            mixBlendMode: 'screen',
          }}
        />

        {ENERGY_SHARDS.map((shard, index) => {
          const p = phase(visualT, shard.start, shard.end);
          const drift = easeOut(p);
          const angle = shard.angle * (Math.PI / 180);
          const x = originX + Math.cos(angle) * drift * shard.length;
          const y = originY + Math.sin(angle) * drift * shard.length * 0.58;
          const alpha = p * (1 - p * 0.42) * (0.45 + (index % 3) * 0.16);
          return (
            <span
              key={index}
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                width: `${5 + shard.length * 0.42}%`,
                height: `${shard.width}%`,
                transformOrigin: 'left center',
                transform: `translate(-50%,-50%) rotate(${shard.angle}deg) scaleX(${0.18 + p * 1.24})`,
                background: index % 2 === 0
                  ? 'linear-gradient(90deg, rgba(255,255,255,0), rgba(213,241,255,0.98) 38%, rgba(72,165,255,0.78) 72%, rgba(0,0,0,0))'
                  : 'linear-gradient(90deg, rgba(0,0,0,0), rgba(90,183,255,0.90) 44%, rgba(255,255,255,0.95) 70%, rgba(0,0,0,0))',
                boxShadow: '0 0 12px rgba(116,204,255,0.74)',
                clipPath: 'polygon(0 50%, 75% 0, 100% 50%, 75% 100%)',
                opacity: alpha,
                mixBlendMode: 'screen',
                pointerEvents: 'none',
              }}
            />
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: `${originX}%`,
            top: `${originY}%`,
            width: `${beamLength}%`,
            height: `${beamWidth}%`,
            transformOrigin: 'left center',
            transform: `translateY(-50%) rotate(-1.4deg) skewX(-5deg)`,
            background:
              'linear-gradient(90deg, rgba(255,255,255,0), rgba(92,183,255,0.62) 8%, rgba(255,255,255,0.96) 23%, rgba(179,227,255,0.98) 50%, rgba(255,255,255,0.94) 72%, rgba(82,166,255,0.56) 91%, rgba(0,0,0,0) 100%)',
            filter: `blur(${Math.max(1, 7 - launchP * 5)}px)`,
            opacity: launchEase * 0.82,
            clipPath: 'polygon(0 50%, 8% 13%, 17% 33%, 31% 0, 43% 30%, 56% 6%, 69% 36%, 82% 10%, 100% 50%, 82% 90%, 69% 64%, 56% 94%, 43% 70%, 31% 100%, 17% 67%, 8% 87%)',
            mixBlendMode: 'screen',
            willChange: 'width, height, opacity',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: `${originX}%`,
            top: `${originY - 0.1}%`,
            width: `${Math.max(0, beamLength - 3)}%`,
            height: `${Math.max(0.6, beamWidth * 0.30)}%`,
            transformOrigin: 'left center',
            transform: 'translateY(-50%)',
            background: 'linear-gradient(90deg, rgba(255,255,255,0), #ffffff 17%, #e9f8ff 53%, #ffffff 82%, rgba(255,255,255,0) 100%)',
            boxShadow: '0 0 10px rgba(255,255,255,0.96), 0 0 26px rgba(85,178,255,0.74)',
            opacity: launchEase,
            mixBlendMode: 'screen',
            willChange: 'width, opacity',
          }}
        />

        {[0, 1].map((beam) => {
          const ghostP = phase(visualT, 0.31 + beam * 0.05, 0.60);
          return (
            <div
              key={beam}
              style={{
                position: 'absolute',
                left: `${originX + ghostP * 2}%`,
                top: `${originY + (beam ? 1.2 : -1.5)}%`,
                width: `${Math.max(0, (beamLength - 10) * ghostP)}%`,
                height: `${Math.max(0.5, 2.8 - beam * 0.8)}%`,
                transform: 'translateY(-50%) skewX(-8deg)',
                background: beam === 0
                  ? 'linear-gradient(90deg, rgba(255,255,255,0), rgba(126,207,255,0.66), rgba(255,255,255,0))'
                  : 'linear-gradient(90deg, rgba(95,178,255,0), rgba(68,133,255,0.60), rgba(255,255,255,0))',
                filter: 'blur(1.2px)',
                opacity: ghostP * 0.64,
                mixBlendMode: 'screen',
              }}
            />
          );
        })}

        {cutinP > 0.001 && !cutinFailed && (
          <div
            style={{
              position: 'absolute',
              left: '-5%',
              bottom: '6%',
              width: 'min(58vw, 650px)',
              maxHeight: '22vh',
              overflow: 'hidden',
              clipPath: 'polygon(0 15%, 100% 0, 93% 86%, 0 100%)',
              borderTop: '2px solid rgba(203,239,255,0.88)',
              borderBottom: '2px solid rgba(60,153,255,0.40)',
              background: 'linear-gradient(90deg, rgba(1,7,17,0.90), rgba(7,25,53,0.72))',
              boxShadow: '0 0 28px rgba(59,165,255,0.24), inset 0 0 16px rgba(167,225,255,0.08)',
              opacity: cutinP * (1 - phase(visualT, 0.56, 0.66)),
              transform: `translate3d(${-34 + cutinP * 42}%,0,0) skewX(-10deg)`,
              willChange: 'transform, opacity',
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
                opacity: 0.92,
                filter: 'brightness(1.04) contrast(1.08)',
                transform: `scale(${1.05 + cutinP * 0.06}) translateX(${-3 + cutinP * 5}%)`,
              }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(1,8,19,0.34), rgba(1,8,19,0) 70%)' }} />
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            left: '31%',
            top: '46%',
            width: `${8 + explosion * 70}%`,
            aspectRatio: '1',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(221,242,255,0.86) 12%, rgba(114,188,255,0.46) 28%, rgba(38,95,185,0.16) 51%, transparent 73%)',
            opacity: contactFlash * 0.82 + explosion * 0.34,
            transform: `translate(-50%,-50%) scale(${0.08 + explosion * 1.10})`,
            filter: 'blur(2px)',
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: `${impactX}%`,
            top: `${impactY}%`,
            width: `${shockwave1 * 42}%`,
            aspectRatio: '1',
            borderRadius: '50%',
            border: `${Math.max(2, 7 - shockwave1 * 4)}px solid rgba(231,248,255,${(1 - shockwave1) * 0.86})`,
            boxShadow: '0 0 22px rgba(92,188,255,0.54), inset 0 0 20px rgba(255,255,255,0.26)',
            transform: 'translate(-50%,-50%)',
            opacity: shockwave1 * (1 - shockwave1 * 0.54),
            mixBlendMode: 'screen',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: `${impactX}%`,
            top: `${impactY}%`,
            width: `${shockwave2 * 72}%`,
            aspectRatio: '1',
            borderRadius: '50%',
            border: `${Math.max(1.5, 5 - shockwave2 * 3)}px solid rgba(133,207,255,${(1 - shockwave2) * 0.68})`,
            transform: 'translate(-50%,-50%) scaleY(0.56)',
            opacity: shockwave2 * (1 - shockwave2 * 0.64),
            mixBlendMode: 'screen',
          }}
        />

        {AFTERMATH_SHARDS.map((shard, index) => {
          const p = phase(visualT, 0.57 + index * 0.005, 0.84);
          const r = easeOut(p) * shard.speed;
          const a = p * (1 - p * 0.84) * 0.90;
          const rad = shard.angle * (Math.PI / 180);
          return (
            <span
              key={index}
              style={{
                position: 'absolute',
                left: `${impactX + Math.cos(rad) * r}%`,
                top: `${impactY + Math.sin(rad) * r * 0.62}%`,
                width: `${shard.size}%`,
                height: `${shard.width}px`,
                transform: `translate(-50%,-50%) rotate(${shard.angle}deg)`,
                background: index % 2 === 0
                  ? 'linear-gradient(90deg, rgba(0,0,0,0), rgba(238,250,255,0.98), rgba(77,173,255,0))'
                  : 'linear-gradient(90deg, rgba(0,0,0,0), rgba(112,199,255,0.96), rgba(255,255,255,0))',
                boxShadow: '0 0 9px rgba(106,197,255,0.78)',
                clipPath: 'polygon(0 50%, 72% 0, 100% 50%, 72% 100%)',
                opacity: a,
                mixBlendMode: 'screen',
              }}
            />
          );
        })}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 84% 46%, rgba(255,255,255,0.98) 0%, rgba(186,229,255,0.30) 10%, rgba(66,139,255,0.12) 28%, rgba(0,0,0,0) 58%)',
            opacity: contactFlash * 0.96,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#ffffff',
            opacity: contactFlash * 0.32,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }}
        />

        {damage > 0 && !isEvade && damageP > 0.001 && (
          <div
            style={{
              position: 'absolute',
              left: `${impactX - 4}%`,
              top: '52%',
              textAlign: 'center',
              transform: `translate(-50%,-50%) scale(${0.52 + easeOut(damageP) * 0.62}) translateY(${-damageP * 12}px)`,
              opacity: damageP * (1 - phase(t, 0.71, 0.82)),
              lineHeight: 0.82,
              willChange: 'transform, opacity',
            }}
          >
            <div
              style={{
                fontSize: 'clamp(64px, 16vw, 180px)',
                fontWeight: 1000,
                letterSpacing: '-0.075em',
                color: '#ffffff',
                WebkitTextStroke: '2px rgba(198,237,255,0.90)',
                textShadow: '0 0 10px rgba(255,255,255,0.98), 0 0 30px rgba(58,156,255,0.98), 0 0 52px rgba(86,190,255,0.52), 10px 12px 0 rgba(2,8,20,0.98)',
                filter: 'drop-shadow(0 0 8px rgba(120,206,255,0.72))',
              }}
            >
              −{damage}
            </div>
            <div
              style={{
                marginTop: '8px',
                fontSize: 'clamp(11px, 2.2vw, 19px)',
                fontWeight: 1000,
                color: '#DFF7FF',
                letterSpacing: '0.24em',
                textShadow: '0 0 12px rgba(104,205,255,0.90), 0 0 24px rgba(74,178,255,0.58)',
              }}
            >
              超堕天撃
            </div>
          </div>
        )}

        {isEvade && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '76%',
              transform: `translate(-50%,-50%) scale(${0.72 + phase(t, 0.56, 0.64) * 0.28})`,
              opacity: phase(t, 0.55, 0.65) * (1 - phase(t, 0.70, 0.82)),
              color: '#E9FBFF',
              fontSize: 'clamp(24px, 5vw, 48px)',
              fontWeight: 1000,
              letterSpacing: '0.05em',
              textShadow: '0 0 15px rgba(97,198,255,0.98), 0 2px 8px rgba(0,0,0,0.96)',
              whiteSpace: 'nowrap',
            }}
          >
            MISS! 超堕天撃回避
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '12%',
            color: '#F2FAFF',
            fontSize: 'clamp(16px, 3vw, 28px)',
            fontWeight: 900,
            letterSpacing: '0.30em',
            textShadow: '0 0 12px rgba(105,201,255,0.88), 0 2px 8px rgba(0,0,0,0.9)',
            transform: `translateX(-50%) translateY(${(1 - labelP) * 7}px) scale(${0.92 + labelP * 0.08})`,
            opacity: labelP * (1 - fadeP),
            whiteSpace: 'nowrap',
          }}
        >
          ⚡ 超堕天撃
        </div>

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 42%, rgba(0,0,0,0.62) 100%)',
            opacity: 0.56 + fadeP * 0.28,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: '#000',
            opacity: phase(t, 0.90, 1.00) * 0.72,
            pointerEvents: 'none',
          }}
        />
      </div>

      {!limitFailed && (
        <img
          src={limitGif}
          alt=""
          draggable={false}
          onError={(event) => {
            setLimitFailed(true);
            event.currentTarget.style.display = 'none';
          }}
          style={{
            position: 'absolute',
            left: '50%',
            top: '49%',
            width: 'min(68vw, 760px)',
            height: 'auto',
            maxHeight: '48vh',
            objectFit: 'contain',
            opacity: phase(t, 0.08, 0.27) * 0.34,
            transform: `translate(-50%,-50%) scale(${0.80 + phase(t, 0.08, 0.27) * 0.22})`,
            mixBlendMode: 'screen',
            filter: 'saturate(1.15) contrast(1.10) brightness(1.02)',
            pointerEvents: 'none',
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: '3.5%',
          transform: `translateX(-50%) scale(${0.94 + phase(t, 0.70, 0.80) * 0.06})`,
          opacity: phase(t, 0.68, 0.82) * 0.72,
          color: 'rgba(225,246,255,0.82)',
          fontSize: 'clamp(9px, 1.6vw, 13px)',
          fontWeight: 800,
          letterSpacing: '0.20em',
          textShadow: '0 0 9px rgba(75,174,255,0.54)',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
        }}
      >
        LIMIT BREAK
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(90deg, rgba(0,0,0,0.22), transparent 24%, transparent 76%, rgba(0,0,0,0.20))',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: introP * 0.18,
          background: 'radial-gradient(circle at 31% 46%, rgba(255,255,255,0.25), transparent 28%)',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

export { SuperFallenShotVfx };
