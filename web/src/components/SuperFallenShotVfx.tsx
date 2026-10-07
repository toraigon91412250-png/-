import React, { useState } from 'react';
import chargeImage from '../assets/fallen_irena_charge_black.jpg';
import irenaCutin from '../assets/img_irena_cutin.jpg';
import limitGif from '../assets/bannerkoubou-koukasen-20261007-170734.gif';
import shotImage from '../assets/fallen_irena_shot_gold.jpg';

interface SuperFallenShotVfxProps {
  mode: 'CHARGE' | 'SHOT';
  progress: number;
  durationMs: number;
  damage?: number;
  isEvade?: boolean;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

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
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 999, background: '#000', isolation: 'isolate' }}>
      <style>{`
        @keyframes sfsChargeWide {
          0% { transform: translate3d(-50%,-50%,0) scale(1.00); }
          20% { transform: translate3d(calc(-50% - 14px), calc(-50% + 2px), 0) scale(1.05); }
          40% { transform: translate3d(calc(-50% + 8px), calc(-50% - 5px), 0) scale(1.08); }
          60% { transform: translate3d(calc(-50% - 7px), calc(-50% + 4px), 0) scale(1.12); }
          82% { transform: translate3d(calc(-50% + 6px), calc(-50% - 2px), 0) scale(1.09); }
          100% { transform: translate3d(calc(-50% + 1px), calc(-50% - 2px), 0) scale(1.07); }
        }

        @keyframes sfsChargeClose {
          0%, 24% { transform: translate3d(-46%,-42%,0) scale(1.10); opacity: 0; }
          38% { transform: translate3d(-38%,-38%,0) scale(1.26); opacity: 0.2; }
          58% { transform: translate3d(-31%,-32%,0) scale(1.36); opacity: 1; }
          72% { transform: translate3d(-38%,-37%,0) scale(1.22); opacity: 0.35; }
          100% { transform: translate3d(-46%,-42%,0) scale(1.08); opacity: 0; }
        }

        @keyframes sfsShotCamera {
          0% { transform: translate3d(0,0,0) scale(1) rotate(0deg); }
          10% { transform: translate3d(-8px,3px,0) scale(1.02) rotate(-0.12deg); }
          18% { transform: translate3d(10px,-4px,0) scale(1.06) rotate(0.24deg); }
          34% { transform: translate3d(-16px,5px,0) scale(1.12) rotate(-0.32deg); }
          52% { transform: translate3d(11px,-4px,0) scale(1.08) rotate(0.2deg); }
          72% { transform: translate3d(-7px,2px,0) scale(1.04) rotate(-0.08deg); }
          100% { transform: translate3d(0,0,0) scale(1) rotate(0deg); }
        }

        @keyframes sfsShotWide {
          0% { transform: translate3d(-50%,-50%,0) scale(1.04); }
          20% { transform: translate3d(calc(-50% - 10px), calc(-50% + 4px), 0) scale(1.02); }
          42% { transform: translate3d(calc(-50% + 16px), calc(-50% - 2px), 0) scale(1.06); }
          68% { transform: translate3d(calc(-50% - 7px), calc(-50% + 4px), 0) scale(1.04); }
          100% { transform: translate3d(-50%,-50%,0) scale(1); }
        }

        @keyframes sfsShotClose {
          0%, 20% { transform: translate3d(-44%,-41%,0) scale(1.06); opacity: 0; }
          29% { transform: translate3d(-36%,-35%,0) scale(1.24); opacity: 0.24; }
          42% { transform: translate3d(-28%,-30%,0) scale(1.42); opacity: 1; }
          56% { transform: translate3d(-35%,-36%,0) scale(1.30); opacity: 0.38; }
          100% { transform: translate3d(-40%,-40%,0) scale(1.08); opacity: 0; }
        }

        @keyframes sfsLimit {
          0% { transform: scale(1.00); filter: contrast(1.0) brightness(0.75) saturate(0.7) blur(0px); }
          100% { transform: scale(1.18); filter: contrast(1.3) brightness(1.08) saturate(1.2) blur(0px); }
        }

        @keyframes sfsOrigin {
          0% { transform: translate(-50%,-50%) scale(0.2); opacity: 0; }
          18% { transform: translate(-50%,-50%) scale(0.6); opacity: 1; }
          38% { transform: translate(-50%,-50%) scale(1.0); opacity: 0.7; }
          62% { transform: translate(-50%,-50%) scale(1.4); opacity: 0.2; }
          100% { transform: translate(-50%,-50%) scale(1.9); opacity: 0; }
        }

        @keyframes sfsBoltA {
          0% { transform: rotate(-7deg) scaleX(0.04); opacity: 0; }
          10% { opacity: 1; }
          35% { transform: rotate(-9deg) scaleX(1); opacity: 0.96; }
          68% { transform: translateX(18%) rotate(-6deg) scaleX(1.3); opacity: 0.3; }
          100% { transform: translateX(36%) rotate(-4deg) scaleX(1.5); opacity: 0; }
        }

        @keyframes sfsBoltB {
          0% { transform: rotate(8deg) scaleX(0.03); opacity: 0; }
          14% { opacity: 1; }
          42% { transform: translateX(10%) rotate(7deg) scaleX(1); opacity: 0.87; }
          72% { transform: translateX(28%) rotate(5deg) scaleX(1.22); opacity: 0.18; }
          100% { transform: translateX(42%) rotate(4deg) scaleX(1.36); opacity: 0; }
        }

        @keyframes sfsFlash {
          0%, 26% { opacity: 0; }
          30% { opacity: 0.96; }
          40% { opacity: 0.12; }
          100% { opacity: 0; }
        }

        @keyframes sfsCameraCut {
          0%, 34% { opacity: 0; transform: scale(0.96); }
          38% { opacity: 0.8; transform: scale(1.01); }
          44% { opacity: 0; transform: scale(1.03); }
          100% { opacity: 0; }
        }

        @keyframes sfsCutin {
          0% { transform: translate3d(-120%, 10%, 0) skewX(-12deg) rotate(-3deg); opacity: 0; }
          15% { opacity: 1; }
          38% { transform: translate3d(-8%,1%,0) skewX(-5deg) rotate(-1.5deg); opacity: 1; }
          58% { transform: translate3d(8%,-2%,0) skewX(-3deg) rotate(-1deg); opacity: 1; }
          100% { transform: translate3d(18%,-5%,0) skewX(-3deg) rotate(-1deg); opacity: 0; }
        }

        @keyframes sfsImpactTitle {
          0% { transform: translate(-50%,-50%) scale(0.72); opacity: 0; }
          16% { transform: translate(-50%,-50%) scale(1.08); opacity: 0.8; }
          44% { transform: translate(-50%,-50%) scale(1.14); opacity: 0.32; }
          100% { transform: translate(-50%,-60%) scale(1.2); opacity: 0; }
        }

        @keyframes sfsDamage {
          0% { transform: translate(-50%,-50%) scale(0.40) rotate(-5deg); opacity: 0; }
          10% { transform: translate(-50%,-50%) scale(1.24) rotate(-1deg); opacity: 1; }
          26% { transform: translate(-50%,-50%) scale(1.06) rotate(0); opacity: 1; }
          50% { transform: translate(-50%,-54%) scale(1) rotate(0); opacity: 0.32; }
          100% { transform: translate(-50%,-60%) scale(0.94) rotate(0); opacity: 0; }
        }

        @keyframes sfsTitle {
          0% { transform: translate(-50%,12px) scale(0.84); opacity: 0; }
          22% { transform: translate(-50%,2px) scale(1.02); opacity: 1; }
          76% { transform: translate(-50%,-2px) scale(1.06); opacity: 1; }
          100% { transform: translate(-50%,-10px) scale(1.04); opacity: 0; }
        }

        @keyframes sfsChargeGlow {
          0% { transform: translate(-50%,-50%) scale(0.75); opacity: 0; }
          24% { transform: translate(-50%,-50%) scale(1.15); opacity: 0.9; }
          62% { transform: translate(-50%,-50%) scale(1.8); opacity: 0.34; }
          100% { transform: translate(-50%,-50%) scale(2.2); opacity: 0; }
        }

        @keyframes sfsChargeRing {
          0% { transform: translate(-50%,-50%) scale(0.38) rotate(0deg); opacity: 0.4; }
          40% { transform: translate(-50%,-50%) scale(1.1) rotate(180deg); opacity: 0.9; }
          100% { transform: translate(-50%,-50%) scale(1.55) rotate(330deg); opacity: 0; }
        }

        @keyframes sfsChargePulse {
          0%, 100% { opacity: 0.24; filter: blur(3px); }
          50% { opacity: 0.82; filter: blur(12px); }
        }

        @keyframes sfsBlackThunder {
          0% { transform: translate3d(0,0,0) scaleX(0.4); opacity: 0; }
          15% { opacity: 0.8; }
          45% { transform: translate3d(10px,-2px,0) scaleX(1.0); opacity: 1; }
          72% { transform: translate3d(24px,-4px,0) scaleX(1.25); opacity: 0.32; }
          100% { transform: translate3d(36px,-8px,0) scaleX(1.5); opacity: 0; }
        }

        @keyframes sfsShockwave {
          0% { transform: translate(-50%,-50%) scale(0.2); opacity: 1; }
          60% { opacity: 0.6; }
          100% { transform: translate(-50%,-50%) scale(2.4); opacity: 0; }
        }

        @keyframes sfsCoreFlash {
          0% { transform: translate(-50%,-50%) scale(1); opacity: 0.3; }
          20% { transform: translate(-50%,-50%) scale(1.4); opacity: 0.9; }
          40% { transform: translate(-50%,-50%) scale(1.15); opacity: 0.7; }
          70% { transform: translate(-50%,-50%) scale(1.5); opacity: 0.56; }
          100% { transform: translate(-50%,-50%) scale(0.8); opacity: 0; }
        }

        @keyframes sfsTextShimmer {
          0% { filter: drop-shadow(0 0 0 rgba(255,255,255,0)) drop-shadow(0 0 0 rgba(74,178,255,0)); }
          50% { filter: drop-shadow(0 0 16px rgba(255,255,255,0.9)) drop-shadow(0 0 24px rgba(74,178,255,0.78)); }
          100% { filter: drop-shadow(0 0 0 rgba(255,255,255,0)) drop-shadow(0 0 0 rgba(74,178,255,0)); }
        }

        .sfs-art {
          position: absolute;
          left: 50%;
          top: 50%;
          height: min(86vh, 780px);
          width: auto;
          max-width: none;
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
            height: min(78dvh, 640px);
            left: 53%;
          }
        }

        @media (min-width: 1100px) {
          .sfs-art { height: min(90vh, 800px); }
        }

        @media (prefers-reduced-motion: reduce) {
          .sfs-motion { animation: none !important; }
        }
      `}</style>

      {mode === 'CHARGE' ? (
        <div style={{ position: 'absolute', inset: 0, background: '#000' }}>
          {!chargeFailed && (
            <>
              <img src={chargeImage} alt="" draggable={false} onError={(event) => { setChargeFailed(true); event.currentTarget.style.display = 'none'; }} className="sfs-art sfs-backdrop" style={{ animation: `sfsChargeWide ${d} ease-out both` }} />
              <img src={chargeImage} alt="" draggable={false} onError={(event) => { setChargeFailed(true); event.currentTarget.style.display = 'none'; }} className="sfs-art sfs-motion" style={{ opacity: chargeImageOpacity * (1 - chargeClose * 0.92), animation: `sfsChargeWide ${d} cubic-bezier(0.16,0.80,0.20,1) both`, willChange: 'transform, opacity' }} />
              <img src={chargeImage} alt="" draggable={false} onError={(event) => { setChargeFailed(true); event.currentTarget.style.display = 'none'; }} className="sfs-art sfs-motion" style={{ opacity: chargeClose, filter: 'brightness(1.08) saturate(1.08)', animation: `sfsChargeClose ${d} cubic-bezier(0.08,0.84,0.14,1) both`, willChange: 'transform, opacity, filter' }} />
            </>
          )}

          <div className="sfs-motion" style={{ position: 'absolute', left: '31%', top: '44%', width: '48%', aspectRatio: '1', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(180,220,255,0.92) 0%, rgba(120,180,255,0.52) 18%, rgba(60,100,180,0.16) 42%, transparent 72%)', filter: 'blur(10px)', animation: `sfsChargeGlow ${d} cubic-bezier(0.08,0.88,0.16,1) both`, pointerEvents: 'none' }} />

          <div className="sfs-motion" style={{ position: 'absolute', left: '31%', top: '44%', width: '40%', aspectRatio: '1', transform: 'translate(-50%,-50%)', borderRadius: '50%', border: '3px solid rgba(135,205,255,0.82)', boxShadow: '0 0 18px rgba(135,205,255,0.88), inset 0 0 18px rgba(135,205,255,0.48)', animation: `sfsChargeRing ${d} linear both`, pointerEvents: 'none' }} />

          <div className="sfs-motion" style={{ position: 'absolute', left: '31%', top: '44%', width: '24%', aspectRatio: '1', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.94) 0%, rgba(196,232,255,0.55) 22%, transparent 72%)', filter: 'blur(4px)', animation: `sfsChargePulse ${d} ease-in-out infinite`, pointerEvents: 'none' }} />

          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 44%, transparent 30%, rgba(0,0,0,0.18) 58%, rgba(0,0,0,0.76) 100%)', pointerEvents: 'none' }} />

          <div className="sfs-motion" style={{ position: 'absolute', left: '50%', top: '14%', color: '#EAF8FF', fontSize: 'clamp(28px,6.2vw,56px)', fontWeight: 1000, letterSpacing: '0.32em', textShadow: '0 0 12px rgba(104,205,255,0.80), 0 0 32px rgba(68,132,255,0.48), 0 0 48px rgba(40,80,200,0.32)', opacity: Math.max(0, Math.min(1, (t - 0.60) / 0.16)) * Math.max(0, Math.min(1, (0.98 - t) / 0.20)), animation: `sfsTitle ${d} cubic-bezier(0.10,0.84,0.16,1) both, sfsTextShimmer calc(${d} * 0.6) ease-in-out infinite`, pointerEvents: 'none' }}>
            超堕天撃
          </div>
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: '#000', animation: `sfsShotCamera ${d} cubic-bezier(0.12,0.84,0.18,1) both`, willChange: 'transform' }}>
          <img src={shotImage} alt="" draggable={false} onError={(event) => { setShotFailed(true); event.currentTarget.style.display = 'none'; }} className="sfs-art sfs-backdrop" style={{ animation: `sfsShotWide ${d} ease-out both` }} />

          {!limitFailed && (
            <img src={limitGif} alt="" draggable={false} onError={(event) => { setLimitFailed(true); event.currentTarget.style.display = 'none'; }} className="sfs-art sfs-motion" style={{ opacity: limitOpacity, animation: `sfsLimit calc(${d} * 0.30) cubic-bezier(0.08,0.88,0.16,1) both`, willChange: 'transform, opacity, filter' }} />
          )}

          {!shotFailed && (
            <>
              <img src={shotImage} alt="" draggable={false} onError={(event) => { setShotFailed(true); event.currentTarget.style.display = 'none'; }} className="sfs-art sfs-motion" style={{ opacity: shotOpacity * (1 - closePunch * 0.92), animation: `sfsShotWide ${d} cubic-bezier(0.10,0.76,0.18,1) both`, willChange: 'transform, opacity, filter' }} />
              <img src={shotImage} alt="" draggable={false} onError={(event) => { setShotFailed(true); event.currentTarget.style.display = 'none'; }} className="sfs-art sfs-motion" style={{ opacity: closePunch, height: 'min(100vh, 900px)', filter: 'brightness(1.08) saturate(1.08)', animation: `sfsShotClose ${d} cubic-bezier(0.08,0.84,0.14,1) both`, willChange: 'transform, opacity, filter' }} />
            </>
          )}

          <div className="sfs-motion" style={{ position: 'absolute', left: '31%', top: '44%', width: '44%', aspectRatio: '1', transform: 'translate(-50%,-50%)', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.7)', background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(180,220,255,0.56) 18%, rgba(50,80,150,0.2) 46%, transparent 72%)', boxShadow: '0 0 26px rgba(130,190,255,0.7), inset 0 0 26px rgba(255,255,255,0.3)', animation: `sfsShockwave ${d} cubic-bezier(0.06,0.88,0.14,1) both`, willChange: 'transform, opacity' }} />

          <div className="sfs-motion" style={{ position: 'absolute', left: '31%', top: '44%', width: '34%', aspectRatio: '1', transform: 'translate(-50%,-50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.98) 0%, rgba(200,236,255,0.62) 16%, rgba(90,160,255,0.16) 42%, transparent 74%)', filter: 'blur(2px)', animation: `sfsCoreFlash ${d} cubic-bezier(0.06,0.88,0.14,1) both`, willChange: 'transform, opacity' }} />

          <div className="sfs-motion" style={{ position: 'absolute', left: '31%', top: '44%', width: '58%', height: '10px', transformOrigin: 'left center', background: 'linear-gradient(90deg, rgba(0,0,0,0), rgba(0,0,0,0.85) 18%, rgba(255,255,255,0.95) 36%, rgba(150,200,255,0.9) 53%, rgba(255,255,255,0.95) 70%, rgba(0,0,0,0.82) 85%, rgba(0,0,0,0) 100%)', boxShadow: '0 0 12px rgba(140,210,255,0.95), 0 0 26px rgba(60,120,255,0.5)', clipPath: 'polygon(0 43%, 8% 5%, 15% 72%, 25% 20%, 39% 80%, 49% 14%, 62% 74%, 76% 24%, 100% 40%, 86% 66%, 69% 48%, 56% 94%, 40% 52%, 24% 86%, 13% 52%, 7% 82%)', animation: `sfsBoltA calc(${d} * 0.52) cubic-bezier(0.08,0.9,0.12,1) calc(${d} * 0.12) both`, pointerEvents: 'none' }} />

          <div className="sfs-motion" style={{ position: 'absolute', left: '31%', top: '47%', width: '62%', height: '8px', transformOrigin: 'left center', background: 'linear-gradient(90deg, rgba(0,0,0,0), rgba(24,24,30,0.9) 14%, rgba(255,255,255,0.96) 33%, rgba(120,200,255,0.92) 55%, rgba(255,255,255,0.96) 70%, rgba(24,24,30,0.8) 88%, rgba(0,0,0,0) 100%)', boxShadow: '0 0 10px rgba(110,190,255,0.75)', clipPath: 'polygon(0 42%, 9% 8%, 18% 80%, 28% 18%, 40% 84%, 50% 13%, 63% 74%, 76% 24%, 100% 42%, 84% 66%, 64% 48%, 52% 94%, 32% 52%, 15% 88%, 6% 42%)', animation: `sfsBoltB calc(${d} * 0.46) cubic-bezier(0.08,0.9,0.12,1) calc(${d} * 0.15) both`, pointerEvents: 'none' }} />

          <div className="sfs-motion" style={{ position: 'absolute', left: '30%', top: '46%', width: '42%', height: '5px', transformOrigin: 'left center', background: 'linear-gradient(90deg, rgba(255,255,255,0), rgba(0,0,0,0.9) 15%, rgba(255,255,255,0.95) 30%, rgba(130,200,255,0.9) 52%, rgba(255,255,255,0.95) 74%, rgba(0,0,0,0.9) 90%, rgba(255,255,255,0) 100%)', boxShadow: '0 0 12px rgba(255,255,255,0.36)', clipPath: 'polygon(0 50%, 8% 30%, 20% 78%, 35% 28%, 55% 82%, 70% 24%, 82% 70%, 100% 48%, 88% 60%, 72% 44%, 54% 92%, 34% 42%, 18% 88%, 6% 48%)', animation: `sfsBlackThunder calc(${d} * 0.55) cubic-bezier(0.08,0.9,0.12,1) calc(${d} * 0.1) both`, pointerEvents: 'none' }} />

          <div className="sfs-motion" style={{ position: 'absolute', inset: 0, background: '#fff', opacity: 0, animation: `sfsFlash ${d} ease-out both`, pointerEvents: 'none' }} />

          {cutinVisible && !cutinFailed && (
            <div className="sfs-motion" style={{ position: 'absolute', left: '-4%', bottom: '4%', width: 'min(60vw, 700px)', maxHeight: '25vh', overflow: 'hidden', clipPath: 'polygon(0 12%, 100% 0, 93% 88%, 0 100%)', borderTop: '3px solid rgba(188,235,255,0.98)', borderBottom: '2px solid rgba(71,157,255,0.48)', background: 'linear-gradient(90deg, rgba(2,8,22,0.96), rgba(8,24,48,0.88))', boxShadow: '0 0 36px rgba(70,168,255,0.32), inset 0 2px 12px rgba(132,200,255,0.16)', animation: `sfsCutin ${d} cubic-bezier(0.08,0.88,0.12,1) calc(${d} * 0.40) both` }}>
              <img src={irenaCutin} alt="" draggable={false} onError={() => setCutinFailed(true)} style={{ display: 'block', width: '100%', height: 'auto', opacity: 0.98, userSelect: 'none', filter: 'brightness(1.05) contrast(1.08)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(1,7,17,0.48), rgba(1,7,17,0) 78%)' }} />
            </div>
          )}

          {damageVisible && (
            <>
              <div className="sfs-motion" style={{ position: 'absolute', left: '50%', top: '53%', width: '40%', aspectRatio: '1', transform: 'translate(-50%,-50%)', border: '3px solid rgba(255,200,120,0.6)', borderRadius: '50%', animation: `sfsShockwave ${d} cubic-bezier(0.08,0.88,0.14,1) calc(${d} * 0.48) both`, pointerEvents: 'none' }} />

              <div className="sfs-motion" style={{ position: 'absolute', left: '50%', top: '52%', transform: 'translate(-50%,-50%)', color: 'rgba(228,249,255,0.2)', fontSize: 'clamp(42px,10vw,96px)', fontWeight: 1000, letterSpacing: '0.16em', whiteSpace: 'nowrap', textShadow: '0 0 26px rgba(74,178,255,0.56), 0 0 12px rgba(132,213,255,0.48)', animation: `sfsImpactTitle calc(${d} * 0.40) cubic-bezier(0.08,0.84,0.14,1) calc(${d} * 0.44) both`, pointerEvents: 'none' }}>
                超堕天撃
              </div>

              <div className="sfs-motion" style={{ position: 'absolute', left: '68%', top: '53%', transform: 'translate(-50%,-50%)', textAlign: 'center', lineHeight: 0.80, animation: `sfsDamage calc(${d} * 0.46) cubic-bezier(0.08,0.84,0.14,1) calc(${d} * 0.48) both`, pointerEvents: 'none' }}>
                <div style={{ fontSize: 'clamp(72px,20vw,200px)', fontWeight: 1000, letterSpacing: '-0.075em', color: '#FFFFFF', WebkitTextStroke: '2px rgba(190,236,255,0.88)', textShadow: '0 0 12px rgba(255,255,255,0.98), 0 0 32px rgba(74,178,255,0.98), 0 0 48px rgba(100,200,255,0.64), 12px 14px 0 rgba(3,10,24,0.96)', filter: 'drop-shadow(0 0 8px rgba(255,200,100,0.44))', animation: `sfsTextShimmer calc(${d} * 0.46) ease-in-out calc(${d} * 0.48)` }}>
                  −{damage}
                </div>
                <div style={{ marginTop: '8px', fontSize: 'clamp(12px,2.4vw,20px)', fontWeight: 1000, color: '#DFF7FF', letterSpacing: '0.24em', textShadow: '0 0 12px rgba(105,198,255,0.94), 0 0 24px rgba(74,178,255,0.64)', filter: 'drop-shadow(0 0 6px rgba(132,213,255,0.56))', animation: `sfsTextShimmer calc(${d} * 0.46) ease-in-out calc(${d} * 0.48)` }}>
                  超堕天撃
                </div>
              </div>
            </>
          )}

          {missVisible && (
            <div className="sfs-motion" style={{ position: 'absolute', left: '50%', top: '76%', transform: 'translate(-50%,-50%)', fontSize: 'clamp(28px,6vw,52px)', fontWeight: 1000, color: '#fff', textShadow: '0 0 14px rgba(105,198,255,0.92), 0 0 20px rgba(255,150,100,0.64), 0 2px 8px rgba(0,0,0,0.96)', animation: `sfsDamage calc(${d} * 0.36) cubic-bezier(0.08,0.84,0.14,1) calc(${d} * 0.50) both, sfsTextShimmer calc(${d} * 0.36) ease-in-out calc(${d} * 0.50)` }}>
              MISS!! 超堕天撃回避
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { SuperFallenShotVfx };
