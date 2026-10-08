import React, { useEffect, useMemo, useState } from 'react';
import beamImage from '../assets/IMG_1151.jpeg';
import backgroundImage from '../assets/IMG_1152.jpeg';
import controlledShotImage from '../assets/IMG_1154.jpeg';
import strongShotImage from '../assets/IMG_1155.jpeg';

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
const easeOutCubic = (value: number) => {
  const t = clamp01(value);
  return 1 - Math.pow(1 - t, 3);
};
const easeInCubic = (value: number) => {
  const t = clamp01(value);
  return t * t * t;
};
const between = (t: number, start: number, end: number) => {
  if (t <= start || t >= end) return 0;
  return clamp01((t - start) / Math.max(0.0001, end - start));
};
const peak = (t: number, start: number, center: number, end: number) => {
  if (t <= start || t >= end) return 0;
  if (t <= center) return clamp01((t - start) / Math.max(0.0001, center - start));
  return clamp01((end - t) / Math.max(0.0001, end - center));
};

const HERO_FRAME = {
  width: 'min(100vw, 177.7778vh)',
  height: 'min(56.25vw, 100vh)',
};

const IMPACT_X = 88;
const IMPACT_Y = 50;
const ORIGIN_X = 32;
const ORIGIN_Y = 50;

const PARTICLES = Array.from({ length: 26 }, (_, index) => {
  const angle = ((index * 137.5) % 360) * (Math.PI / 180);
  const distance = 14 + (index % 7) * 5.5;
  const size = 0.20 + (index % 5) * 0.08;
  const start = 0.57 + (index % 6) * 0.012;
  const end = 0.81 + (index % 4) * 0.025;
  return { angle, distance, size, start, end };
});

const RAYS = Array.from({ length: 12 }, (_, index) => ({
  angle: (index / 12) * Math.PI * 2,
  length: 10 + (index % 4) * 4,
  width: 0.12 + (index % 3) * 0.05,
  offset: (index % 5) * 0.006,
}));

// Start loading the real cinematic assets as soon as this module is imported.
// This reduces the chance that the first Super Fallen Shot is missing frames
// simply because the browser has not decoded the JPEGs yet.

const VIEW_W = 160;
const VIEW_H = 90;

const ProceduralChargeFx: React.FC<{ t: number }> = ({ t }) => {
  const charge = smooth(between(t, 0.08, 0.90));
  const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 12);
  const cx = ORIGIN_X * 1.6;
  const cy = ORIGIN_Y * 0.9;
  const radius = 7 + charge * 15;
  const outer = radius + 5 + pulse * 2;
  const spin = charge * 260;
  const orbit = charge * 360;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 90"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 3,
        mixBlendMode: 'screen',
      }}
    >
      <defs>
        <radialGradient id="sf-charge-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="18%" stopColor="#FFE9B0" stopOpacity="0.78" />
          <stop offset="48%" stopColor="#8CCBFF" stopOpacity="0.30" />
          <stop offset="100%" stopColor="#72BFFF" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sf-charge-arc" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#7CC8FF" stopOpacity="0" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#A7D9FF" stopOpacity="0" />
        </linearGradient>
      </defs>

      <g transform={'translate(' + cx + ' ' + cy + ')'}>
        <circle r={radius * 0.82} fill="url(#sf-charge-core)" opacity={0.20 + charge * 0.45} />

        {[0, 1, 2].map((index) => {
          const ringRadius = radius + index * 4;
          const dash = 16 + index * 7;
          return (
            <circle
              key={index}
              r={ringRadius}
              fill="none"
              stroke="url(#sf-charge-arc)"
              strokeWidth={0.7 + charge * 0.5}
              strokeDasharray={dash + ' ' + (42 - index * 4)}
              strokeDashoffset={-spin * (index % 2 === 0 ? 1 : -1) - index * 6}
              opacity={(0.24 + charge * 0.56) - index * 0.10}
            />
          );
        })}

        <ellipse
          rx={outer}
          ry={outer * 0.36}
          fill="none"
          stroke="#9ED8FF"
          strokeWidth={0.7 + charge * 0.7}
          strokeDasharray="3 3.8"
          strokeDashoffset={-orbit}
          opacity={charge * 0.62}
          transform="rotate(-10)"
        />

        <ellipse
          rx={outer + 4}
          ry={(outer + 4) * 0.20}
          fill="none"
          stroke="#FFF5D0"
          strokeWidth="0.45"
          strokeDasharray="1.8 5.2"
          strokeDashoffset={orbit * 0.8}
          opacity={charge * 0.42}
          transform="rotate(18)"
        />

        {[0, 1, 2, 3, 4, 5].map((index) => {
          const a = (index / 6) * Math.PI * 2 + orbit * 0.012;
          const rr = radius + 5 + (index % 2) * 3;
          const px = Math.cos(a) * rr;
          const py = Math.sin(a) * rr * 0.68;
          const size = 0.45 + (index % 3) * 0.22;
          return (
            <circle
              key={index}
              cx={px}
              cy={py}
              r={size}
              fill={index % 2 === 0 ? '#FFFFFF' : '#9AD6FF'}
              opacity={charge * (0.48 + pulse * 0.30)}
            />
          );
        })}
      </g>
    </svg>
  );
};

const ProceduralShotFx: React.FC<{ t: number }> = ({ t }) => {
  const beamP = easeOutCubic(between(t, 0.08, 0.56));
  const contact = easeOutCubic(between(t, 0.535, 0.74));
  const impact = between(t, 0.535, 0.86);
  const cx1 = ORIGIN_X * 1.6;
  const cy1 = ORIGIN_Y * 0.9;
  const cx2 = IMPACT_X * 1.6;
  const cy2 = IMPACT_Y * 0.9;
  const flow = t * 240;

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 160 90"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 8,
        mixBlendMode: 'screen',
      }}
    >
      <defs>
        <linearGradient id="sf-shot-beam" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="10%" stopColor="#DDF3FF" stopOpacity="0.56" />
          <stop offset="38%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="84%" stopColor="#9FD8FF" stopOpacity="0.94" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="sf-shot-impact" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="16%" stopColor="#FFF4C9" stopOpacity="0.96" />
          <stop offset="42%" stopColor="#9ED8FF" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#7EC9FF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g opacity={beamP}>
        <line
          x1={cx1}
          y1={cy1}
          x2={cx2}
          y2={cy2}
          pathLength="100"
          stroke="#79C7FF"
          strokeWidth={2.8 + beamP * 3.8}
          strokeLinecap="round"
          opacity={0.16 + beamP * 0.20}
          strokeDasharray="100 7"
          strokeDashoffset={-flow}
        />
        <line
          x1={cx1}
          y1={cy1}
          x2={cx2}
          y2={cy2}
          pathLength="100"
          stroke="url(#sf-shot-beam)"
          strokeWidth={0.95 + beamP * 1.85}
          strokeLinecap="round"
          strokeDasharray="100 100"
          strokeDashoffset={100 - beamP * 100}
        />
        <line
          x1={cx1}
          y1={cy1}
          x2={cx2}
          y2={cy2}
          pathLength="100"
          stroke="#FFFFFF"
          strokeWidth={0.24 + beamP * 0.42}
          strokeLinecap="round"
          strokeDasharray="7 5"
          strokeDashoffset={-flow * 1.8}
          opacity={0.58 + beamP * 0.30}
        />
      </g>

      <g transform={'translate(' + cx1 + ' ' + cy1 + ')'} opacity={beamP * 0.95}>
        <circle r={2.2 + beamP * 3.5} fill="url(#sf-shot-impact)" opacity="0.52" />
        <circle r={0.65 + beamP * 1.2} fill="#FFFFFF" opacity="0.96" />
      </g>

      <g transform={'translate(' + cx2 + ' ' + cy2 + ')'}>
        <circle r={4 + contact * 22} fill="url(#sf-shot-impact)" opacity={contact * 0.82} />

        <circle
          r={3 + contact * 23}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={1.1 - contact * 0.65}
          opacity={contact * (1 - contact * 0.52)}
        />

        <circle
          r={7 + contact * 36}
          fill="none"
          stroke="#A8DDFF"
          strokeWidth={0.65 - contact * 0.30}
          strokeDasharray="5 3.8"
          strokeDashoffset={-flow * 1.4}
          opacity={contact * 0.78}
        />

        {Array.from({ length: 10 }, (_, index) => {
          const a = (index / 10) * Math.PI * 2 + t * 5.5;
          const inner = 4 + contact * 7;
          const outer = inner + 8 + contact * 17 + (index % 3) * 3;
          const x1 = Math.cos(a) * inner;
          const y1 = Math.sin(a) * inner * 0.72;
          const x2 = Math.cos(a) * outer;
          const y2 = Math.sin(a) * outer * 0.72;
          return (
            <line
              key={index}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={index % 2 === 0 ? '#FFFFFF' : '#8FD4FF'}
              strokeWidth={0.45 + contact * 0.55}
              strokeLinecap="round"
              opacity={impact * (1 - contact * 0.70) * 0.86}
            />
          );
        })}
      </g>
    </svg>
  );
};

const preloadSources = [
  beamImage,
  backgroundImage,
  controlledShotImage,
  strongShotImage,
];

if (typeof window !== 'undefined') {
  preloadSources.forEach((src) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    if (typeof image.decode === 'function') {
      image.decode().catch(() => undefined);
    }
  });
}

const SuperFallenShotVfx: React.FC<SuperFallenShotVfxProps> = ({
  mode,
  progress,
  durationMs: _durationMs,
  damage = 0,
  isEvade = false,
}) => {
  const [assetsFailed, setAssetsFailed] = useState<Record<string, boolean>>({});
  const [decoded, setDecoded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      preloadSources.map((src) => {
        const image = new Image();
        image.src = src;
        if (typeof image.decode === 'function') {
          return image.decode().catch(() => undefined);
        }
        return Promise.resolve();
      }),
    ).finally(() => {
      if (!cancelled) setDecoded(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const markFailed = (key: string) => {
    setAssetsFailed(prev => (prev[key] ? prev : { ...prev, [key]: true }));
  };

  const t = clamp01(progress);
  const isShot = mode === 'SHOT';

  const assetReady = useMemo(
    () => decoded || Object.keys(assetsFailed).length > 0,
    [decoded, assetsFailed],
  );

  if (!isShot) {
    const controlledA = between(t, 0.04, 0.90);
    const controlledHold = peak(t, 0.24, 0.60, 0.91);
    const chargeGlow = peak(t, 0.12, 0.72, 0.96);
    const finalWhite = peak(t, 0.88, 0.955, 1.00);

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
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          opacity: 1 - controlledA * 0.58,
        }} />

        {!assetsFailed.background && (
          <img
            src={backgroundImage}
            alt=""
            draggable={false}
            onError={() => markFailed('background')}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              ...HERO_FRAME,
              objectFit: 'cover',
              objectPosition: 'center',
              transform: `translate(-50%,-50%) scale(${1.03 + controlledHold * 0.04})`,
              opacity: controlledA * 0.26,
              filter: 'brightness(0.45) saturate(0.72) contrast(1.04)',
              userSelect: 'none',
            }}
          />
        )}

        {!assetsFailed.controlled && (
          <img
            src={controlledShotImage}
            alt=""
            draggable={false}
            onError={() => markFailed('controlled')}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              ...HERO_FRAME,
              objectFit: 'contain',
              objectPosition: 'center',
              transform: `translate(-50%,-50%) scale(${0.98 + controlledHold * 0.06})`,
              opacity: assetReady ? controlledA * (0.48 + controlledHold * 0.40) : 0,
              filter: `brightness(${0.72 + controlledHold * 0.34}) contrast(${1.02 + controlledHold * 0.12}) saturate(${0.82 + controlledHold * 0.22})`,
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          />
        )}

        <ProceduralChargeFx t={t} />

        <div
          style={{
            position: 'absolute',
            left: '31%',
            top: '50%',
            width: `${8 + chargeGlow * 34}%`,
            aspectRatio: '1',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.92) 0%, rgba(255,225,147,0.48) 18%, rgba(72,156,255,0.18) 44%, transparent 74%)',
            opacity: 0.30 + chargeGlow * 0.70,
            transform: `translate(-50%,-50%) scale(${0.55 + chargeGlow * 1.12})`,
            filter: `blur(${Math.max(2, 11 - chargeGlow * 7)}px)`,
            mixBlendMode: 'screen',
          }}
        />

        {[0, 1, 2].map((ring) => {
          const ringT = smooth(between(t, 0.18 + ring * 0.07, 0.82));
          return (
            <div
              key={ring}
              style={{
                position: 'absolute',
                left: '31%',
                top: '50%',
                width: `${25 + ring * 10 + ringT * 17}%`,
                aspectRatio: '1 / 0.43',
                borderRadius: '50%',
                border: `${2 + ring}px solid rgba(231,244,255,${0.34 + chargeGlow * 0.45 - ring * 0.06})`,
                boxShadow: `0 0 ${12 + ring * 8}px rgba(73,158,255,${0.50 + chargeGlow * 0.30}), inset 0 0 ${10 + ring * 5}px rgba(255,223,143,0.28)`,
                transform: `translate(-50%,-50%) rotate(${-16 + ring * 19 + ringT * 32}deg) scale(${0.30 + ringT * 1.20})`,
                opacity: ringT * (0.78 - ring * 0.10),
                mixBlendMode: 'screen',
              }}
            />
          );
        })}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 31% 50%, transparent 18%, rgba(0,0,0,0.24) 55%, rgba(0,0,0,0.78) 100%)',
            opacity: 0.72,
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '12%',
            transform: 'translateX(-50%)',
            color: '#F1FAFF',
            fontSize: 'clamp(26px, 5.8vw, 54px)',
            fontWeight: 1000,
            letterSpacing: '0.28em',
            textShadow: '0 0 14px rgba(115,208,255,0.90), 0 0 30px rgba(71,118,255,0.48), 0 2px 9px rgba(0,0,0,0.96)',
            opacity: between(t, 0.52, 0.72) * (1 - between(t, 0.78, 0.95)),
            whiteSpace: 'nowrap',
          }}
        >
          超堕天撃
        </div>

        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#fff',
          opacity: finalWhite * 0.78,
          mixBlendMode: 'screen',
        }} />
      </div>
    );
  }

  const visualT = t >= 0.535 && t <= 0.5485 ? 0.535 : t;

  const controlledA = between(visualT, 0.00, 0.48);
  const strongA = between(visualT, 0.32, 0.66);
  const beamReveal = between(visualT, 0.15, 0.57);
  const beamFast = easeOutCubic(beamReveal);
  const launchSnap = easeInCubic(between(visualT, 0.44, 0.57));
  const contactFlash = peak(t, 0.535, 0.546, 0.595);
  const contactBurst = easeOutCubic(between(visualT, 0.535, 0.70));
  const firstShockwave = between(visualT, 0.545, 0.72);
  const secondShockwave = between(visualT, 0.57, 0.80);
  const damageP = between(t, 0.575, 0.72);
  const aftermathA = between(visualT, 0.62, 0.87);
  const finalFade = between(t, 0.84, 1.00);

  const cameraPulse = peak(t, 0.535, 0.565, 0.70);
  const cameraX = Math.sin(t * 560) * cameraPulse * 5.5;
  const cameraY = Math.cos(t * 490) * cameraPulse * 3.4;
  const cameraScale = 1 + cameraPulse * 0.025 + launchSnap * 0.012;

  const controlledOpacity = controlledA * (1 - strongA * 0.58) * 0.86;
  const strongOpacity = strongA * 0.98;
  const beamOpacity = assetReady && !assetsFailed.beam
    ? (0.10 + beamFast * 0.38) * (1 - finalFade * 0.72)
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
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at 48% 50%, rgba(36,83,146,0.15), rgba(0,0,0,0.74) 52%, #000 100%)',
      }} />

      <ProceduralShotFx t={visualT} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          transform: `translate3d(${cameraX}px,${cameraY}px,0) scale(${cameraScale})`,
          transformOrigin: 'center center',
          willChange: 'transform',
        }}
      >
        {!assetsFailed.controlled && (
          <img
            src={controlledShotImage}
            alt=""
            draggable={false}
            onError={() => markFailed('controlled')}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              ...HERO_FRAME,
              objectFit: 'contain',
              objectPosition: 'center',
              transform: `translate(-50%,-50%) scale(${1.00 + controlledA * 0.035})`,
              opacity: controlledOpacity,
              filter: `brightness(${0.70 + controlledA * 0.22}) contrast(${1.04 + controlledA * 0.08}) saturate(${0.88 + controlledA * 0.16})`,
              userSelect: 'none',
              WebkitUserSelect: 'none',
            }}
          />
        )}

        {!assetsFailed.strong && (
          <img
            src={strongShotImage}
            alt=""
            draggable={false}
            onError={() => markFailed('strong')}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              ...HERO_FRAME,
              objectFit: 'contain',
              objectPosition: 'center',
              transform: `translate(-50%,-50%) scale(${0.98 + strongA * 0.055 + launchSnap * 0.02})`,
              opacity: strongOpacity,
              filter: `brightness(${0.70 + strongA * 0.46 + contactFlash * 0.24}) contrast(${1.04 + strongA * 0.12}) saturate(${0.90 + strongA * 0.30})`,
              userSelect: 'none',
              WebkitUserSelect: 'none',
              willChange: 'transform, opacity, filter',
            }}
          />
        )}

        {!assetsFailed.beam && (
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              ...HERO_FRAME,
              transform: 'translate(-50%,-50%)',
              clipPath: `inset(0 ${Math.max(0, 100 - beamFast * 100)}% 0 0)`,
              opacity: beamOpacity,
              mixBlendMode: 'screen',
              willChange: 'clip-path, opacity',
            }}
          >
            <img
              src={beamImage}
              alt=""
              draggable={false}
              onError={() => markFailed('beam')}
              style={{
                display: 'block',
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                filter: `brightness(${0.96 + launchSnap * 0.42 + contactFlash * 0.28}) contrast(${1.08 + launchSnap * 0.22}) saturate(${1.02 + launchSnap * 0.28})`,
              }}
            />
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            left: `${ORIGIN_X}%`,
            top: `${ORIGIN_Y}%`,
            width: `${8 + beamFast * 18}%`,
            height: `${0.8 + beamFast * 1.8}%`,
            transform: 'translateY(-50%) rotate(0.3deg)',
            transformOrigin: 'left center',
            background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,241,191,0.70) 18%, rgba(255,255,255,0.98) 52%, rgba(255,255,255,0) 100%)',
            boxShadow: '0 0 10px rgba(255,255,255,0.86), 0 0 24px rgba(115,186,255,0.64)',
            opacity: beamFast * 0.88,
            mixBlendMode: 'screen',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: `${ORIGIN_X}%`,
            top: '50%',
            width: `${Math.max(5, (IMPACT_X - ORIGIN_X) * launchSnap)}%`,
            height: '0.36%',
            transform: 'translateY(-50%)',
            background: 'linear-gradient(90deg, rgba(255,255,255,0), #fff6d7 22%, #fff 52%, rgba(255,255,255,0.1) 100%)',
            boxShadow: '0 0 8px rgba(255,255,255,0.98), 0 0 22px rgba(101,180,255,0.72)',
            opacity: launchSnap,
            mixBlendMode: 'screen',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: `${IMPACT_X}%`,
            top: `${IMPACT_Y}%`,
            width: `${5 + contactBurst * 58}%`,
            aspectRatio: '1',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(255,235,174,0.78) 13%, rgba(89,167,255,0.28) 37%, transparent 73%)',
            opacity: contactFlash * 0.92 + contactBurst * 0.24,
            transform: 'translate(-50%,-50%)',
            filter: 'blur(2px)',
            mixBlendMode: 'screen',
          }}
        />

        {RAYS.map((ray, index) => {
          const rayT = between(visualT, 0.56 + ray.offset, 0.73 + ray.offset);
          const length = ray.length * easeOutCubic(rayT);
          const alpha = rayT * (1 - rayT * 0.66) * 0.92;
          return (
            <span
              key={index}
              style={{
                position: 'absolute',
                left: `${IMPACT_X}%`,
                top: `${IMPACT_Y}%`,
                width: `${length}%`,
                height: `${ray.width}%`,
                transformOrigin: 'left center',
                transform: `translateY(-50%) rotate(${ray.angle}rad)`,
                background: index % 2 === 0
                  ? 'linear-gradient(90deg, rgba(255,255,255,0), rgba(255,246,210,0.96), rgba(87,166,255,0))'
                  : 'linear-gradient(90deg, rgba(255,255,255,0), rgba(106,190,255,0.90), rgba(255,255,255,0))',
                boxShadow: '0 0 8px rgba(110,194,255,0.68)',
                clipPath: 'polygon(0 50%, 68% 0, 100% 50%, 68% 100%)',
                opacity: alpha,
                mixBlendMode: 'screen',
              }}
            />
          );
        })}

        <div
          style={{
            position: 'absolute',
            left: `${IMPACT_X}%`,
            top: `${IMPACT_Y}%`,
            width: `${firstShockwave * 48}%`,
            aspectRatio: '1 / 0.68',
            borderRadius: '50%',
            border: `${Math.max(2, 7 - firstShockwave * 4)}px solid rgba(232,247,255,${(1 - firstShockwave) * 0.92})`,
            boxShadow: '0 0 22px rgba(89,189,255,0.62), inset 0 0 18px rgba(255,255,255,0.32)',
            transform: 'translate(-50%,-50%)',
            opacity: firstShockwave * (1 - firstShockwave * 0.42),
            mixBlendMode: 'screen',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: `${IMPACT_X}%`,
            top: `${IMPACT_Y}%`,
            width: `${secondShockwave * 82}%`,
            aspectRatio: '1 / 0.40',
            borderRadius: '50%',
            border: `${Math.max(1.5, 5 - secondShockwave * 2.8)}px solid rgba(131,205,255,${(1 - secondShockwave) * 0.72})`,
            transform: 'translate(-50%,-50%)',
            opacity: secondShockwave * (1 - secondShockwave * 0.64),
            mixBlendMode: 'screen',
          }}
        />

        {PARTICLES.map((particle, index) => {
          const particleT = between(visualT, particle.start, particle.end);
          const travel = easeOutCubic(particleT) * particle.distance;
          const x = IMPACT_X + Math.cos(particle.angle) * travel;
          const y = IMPACT_Y + Math.sin(particle.angle) * travel * 0.68;
          const alpha = particleT * (1 - particleT * 0.86) * 0.92;
          return (
            <span
              key={index}
              style={{
                position: 'absolute',
                left: `${x}%`,
                top: `${y}%`,
                width: `${particle.size}%`,
                aspectRatio: '1',
                transform: 'translate(-50%,-50%) rotate(32deg)',
                background: index % 3 === 0 ? '#FFFFFF' : '#A9D9FF',
                boxShadow: '0 0 8px rgba(120,208,255,0.85)',
                clipPath: 'polygon(50% 0, 100% 50%, 50% 100%, 0 50%)',
                opacity: alpha,
                mixBlendMode: 'screen',
              }}
            />
          );
        })}

        {damage > 0 && !isEvade && damageP > 0.001 && (
          <div
            style={{
              position: 'absolute',
              left: '76%',
              top: '52%',
              transform: `translate(-50%,-50%) scale(${0.56 + easeOutCubic(damageP) * 0.66}) translateY(${-damageP * 12}px)`,
              opacity: damageP * (1 - between(t, 0.73, 0.83)),
              textAlign: 'center',
              lineHeight: 0.80,
            }}
          >
            <div
              style={{
                fontSize: 'clamp(62px, 15.8vw, 180px)',
                fontWeight: 1000,
                letterSpacing: '-0.075em',
                color: '#FFFFFF',
                WebkitTextStroke: '2px rgba(203,237,255,0.92)',
                textShadow: '0 0 12px rgba(255,255,255,1), 0 0 30px rgba(77,171,255,1), 0 0 56px rgba(86,187,255,0.54), 10px 12px 0 rgba(1,7,18,0.98)',
                filter: 'drop-shadow(0 0 8px rgba(120,208,255,0.74))',
              }}
            >
              −{damage}
            </div>
            <div
              style={{
                marginTop: '8px',
                fontSize: 'clamp(11px, 2.2vw, 19px)',
                fontWeight: 1000,
                color: '#DFF8FF',
                letterSpacing: '0.24em',
                textShadow: '0 0 11px rgba(104,205,255,0.92), 0 0 24px rgba(74,178,255,0.58)',
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
              transform: `translate(-50%,-50%) scale(${0.72 + between(t, 0.56, 0.64) * 0.28})`,
              opacity: between(t, 0.55, 0.65) * (1 - between(t, 0.70, 0.82)),
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
            inset: 0,
            background: '#fff',
            opacity: contactFlash * 0.42,
            mixBlendMode: 'screen',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at 88% 50%, rgba(255,255,255,0) 30%, rgba(0,0,0,0.66) 100%)',
            opacity: 0.54 + aftermathA * 0.20,
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '12%',
            transform: `translateX(-50%) translateY(${(1 - between(visualT, 0.64, 0.80)) * 6}px) scale(${0.92 + between(visualT, 0.64, 0.80) * 0.08})`,
            opacity: between(visualT, 0.64, 0.83) * (1 - finalFade),
            color: '#F3FBFF',
            fontSize: 'clamp(16px, 3.2vw, 28px)',
            fontWeight: 1000,
            letterSpacing: '0.28em',
            textShadow: '0 0 12px rgba(112,210,255,0.92), 0 2px 8px rgba(0,0,0,0.96)',
            whiteSpace: 'nowrap',
          }}
        >
          超堕天撃
        </div>
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#000',
          opacity: finalFade * 0.84,
          pointerEvents: 'none',
        }}
      />
    </div>
  );
};

{/* Preview retry marker: no runtime behavior change. */}

export { SuperFallenShotVfx };
