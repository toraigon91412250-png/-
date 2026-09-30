import React, { useEffect, useState, useRef } from 'react';
import { VisualEffect } from '../types/game';
import { CHARACTERS } from '../data/characters';

interface VisualEffectOverlayProps {
  effect: VisualEffect | null;
  speedMultiplier?: number;
}

// Floating feather layout for the special cut-in (x%, y%, delay ratio, size px, rotation deg)
const CUTIN_FEATHERS = [
  [8, 20, 0.0, 26, -30], [22, 78, 0.12, 20, 20], [38, 12, 0.2, 18, 60],
  [55, 85, 0.05, 24, -60], [70, 18, 0.18, 22, 15], [86, 70, 0.08, 28, -15],
  [94, 30, 0.25, 16, 45], [3, 60, 0.3, 18, 80],
];

const SpecialCutIn: React.FC<{ imageSrc: string; skillName: string; actorName: string; isEnemy: boolean; durationMs: number }> = ({
  imageSrc,
  skillName,
  actorName,
  isEnemy,
  durationMs,
}) => {
  const d = `${durationMs}ms`;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
      <style>{`
        @keyframes cutinBand {
          0% { transform: translateX(-110%) skewY(-8deg); opacity: 0; }
          14% { transform: translateX(0) skewY(-8deg); opacity: 1; }
          70% { transform: translateX(0) skewY(-8deg); opacity: 1; }
          100% { transform: translateX(110%) skewY(-8deg); opacity: 0; }
        }
        @keyframes cutinImage {
          0% { transform: scale(1.25) translateX(-6%); }
          100% { transform: scale(1.05) translateX(4%); }
        }
        @keyframes cutinText {
          0%, 12% { transform: translateX(60px); opacity: 0; letter-spacing: 12px; }
          28% { transform: translateX(0); opacity: 1; letter-spacing: 3px; }
          72% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes cutinFeather {
          0% { transform: translate(0, 0) rotate(var(--r)) scale(0.4); opacity: 0; }
          25% { opacity: 1; }
          100% { transform: translate(90px, -70px) rotate(calc(var(--r) + 140deg)) scale(1.1); opacity: 0; }
        }
        @keyframes cutinFlash {
          0% { opacity: 0.55; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* Brief white flash */}
      <div style={{ position: 'absolute', inset: 0, background: '#E0F7FA', animation: `cutinFlash calc(${d} * 0.25) ease-out forwards` }} />

      {/* Diagonal band with the cut-in art */}
      <div
        style={{
          position: 'absolute',
          left: '-5%',
          right: '-5%',
          top: '34%',
          height: '30%',
          minHeight: '150px',
          overflow: 'hidden',
          borderTop: '3px solid #B2EBF2',
          borderBottom: '3px solid #E1BEE7',
          boxShadow: '0 0 30px rgba(128, 222, 234, 0.7)',
          background: '#1a2233',
          animation: `cutinBand ${d} cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, transform: isEnemy ? 'scaleX(-1)' : undefined }}>
          <img
            src={imageSrc}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 40%',
              display: 'block',
              animation: `cutinImage ${d} linear forwards`,
            }}
          />
        </div>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(90deg, rgba(10,13,22,0) 40%, rgba(10,13,22,0.75) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: '6%',
            top: '50%',
            marginTop: '-34px',
            textAlign: 'right',
            animation: `cutinText ${d} ease-out forwards`,
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#B2EBF2', textShadow: '0 1px 4px #000' }}>
            {actorName} ─ SPECIAL SKILL
          </div>
          <div style={{ fontSize: '38px', fontWeight: 900, color: '#FFFFFF', textShadow: '0 0 12px #00E5FF, 0 2px 6px #000' }}>
            『{skillName}』
          </div>
        </div>
      </div>

      {/* Drifting feathers */}
      {CUTIN_FEATHERS.map(([x, y, delay, size, rot], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            fontSize: `${size}px`,
            opacity: 0,
            filter: 'drop-shadow(0 0 6px #80DEEA)',
            ['--r' as string]: `${rot}deg`,
            animation: `cutinFeather calc(${d} * 0.8) ease-out calc(${d} * ${delay}) forwards`,
          } as React.CSSProperties}
        >
          🪶
        </div>
      ))}
    </div>
  );
};

export const VisualEffectOverlay: React.FC<VisualEffectOverlayProps> = ({ effect, speedMultiplier = 1 }) => {
  const [progress, setProgress] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastUiUpdateRef = useRef(0);

  useEffect(() => {
    if (!effect) {
      setProgress(0);
      lastUiUpdateRef.current = 0;
      return;
    }

    setProgress(0);
    lastUiUpdateRef.current = 0;
    const duration = effect.isUltimate ? 700 : 450;
    const startTime = performance.now();
    let animId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      // Keep the animation clock at 60fps, but update React-driven visuals at about 30fps.
      // CSS cut-in animation remains smooth while reducing per-frame React/canvas work.
      if (t >= 1 || now - lastUiUpdateRef.current >= 33) {
        lastUiUpdateRef.current = now;
        setProgress(t);
      }

      if (t < 1) {
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [effect?.effectId]);

  // Canvas drawing for slashes, bursts, projectiles, shockwaves
  useEffect(() => {
    if (!effect || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const w = canvas.width || 800;
      const h = canvas.height || 800;
      ctx.clearRect(0, 0, w, h);

      const targetCenter = effect.targetIsPlayer ? { x: w * 0.5, y: h * 0.70 } : { x: w * 0.5, y: h * 0.28 };
      const actorCenter = effect.targetIsPlayer ? { x: w * 0.5, y: h * 0.28 } : { x: w * 0.5, y: h * 0.70 };
      const t = progress;

      ctx.save();

      // 1. Buff Aura
      if (effect.isBuff) {
        const radius = Math.max(1, t * 110);
        const alpha = Math.max(0, 1 - t);
        const grad = ctx.createRadialGradient(targetCenter.x, targetCenter.y, 0, targetCenter.x, targetCenter.y, radius);
        grad.addColorStop(0, 'rgba(255, 213, 79, 0.8)');
        grad.addColorStop(0.6, 'rgba(255, 143, 0, 0.5)');
        grad.addColorStop(1, 'rgba(255, 143, 0, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Energy rings
        ctx.strokeStyle = `rgba(255, 224, 130, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, Math.max(1, radius * 0.85), 0, Math.PI * 2);
        ctx.stroke();

        // Sparks
        for (let i = -3; i <= 3; i++) {
          const sx = targetCenter.x + i * 22;
          const sy = targetCenter.y + 40 - t * 90;
          ctx.strokeStyle = `rgba(255, 213, 79, ${alpha})`;
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx, sy - 28);
          ctx.stroke();
        }
      }

      // 2. Evade Dodge Speedlines
      else if (effect.isEvade) {
        const alpha = Math.max(0, 1 - t);
        const len = 140 * t;
        ctx.strokeStyle = `rgba(0, 229, 255, ${alpha * 0.85})`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        for (let i = -2; i <= 2; i++) {
          const oy = targetCenter.y + i * 24;
          ctx.beginPath();
          ctx.moveTo(targetCenter.x - len + i * 15, oy);
          ctx.lineTo(targetCenter.x + len + i * 15, oy);
          ctx.stroke();
        }
        ctx.strokeStyle = `rgba(100, 255, 218, ${alpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, Math.max(1, 60 * t), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Ultimate Nova Blast
      else if (effect.isUltimate) {
        const radius = Math.max(1, t * w * 0.65);
        const alpha = Math.max(0, 1 - t);
        const grad = ctx.createRadialGradient(targetCenter.x, targetCenter.y, 0, targetCenter.x, targetCenter.y, radius);
        grad.addColorStop(0, 'rgba(255, 249, 196, 0.95)');
        grad.addColorStop(0.3, 'rgba(255, 111, 0, 0.8)');
        grad.addColorStop(0.7, 'rgba(216, 67, 21, 0.5)');
        grad.addColorStop(1, 'rgba(216, 67, 21, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Outer ring
        ctx.strokeStyle = `rgba(255, 213, 79, ${alpha * 0.8})`;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, Math.max(1, radius * 0.9), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Irena Feather Projectiles & Burst (羽弾)
      else if (effect.effectType === 'SPECIAL_FEATHER') {
        if (t < 0.45) {
          const projT = t / 0.45;
          const cx = actorCenter.x + (targetCenter.x - actorCenter.x) * projT;
          const cy = actorCenter.y + (targetCenter.y - actorCenter.y) * projT;
          for (let i = -2; i <= 2; i++) {
            const px = cx + i * 16;
            const py = cy - i * 12;
            ctx.fillStyle = 'rgba(100, 255, 218, 0.9)';
            ctx.beginPath();
            ctx.arc(px, py, 10, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = 'rgba(224, 64, 251, 1)';
            ctx.beginPath();
            ctx.arc(px, py, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          const impactT = (t - 0.45) / 0.55;
          const radius = Math.max(1, impactT * 120);
          const alpha = Math.max(0, 1 - impactT);
          const grad = ctx.createRadialGradient(targetCenter.x, targetCenter.y, 0, targetCenter.x, targetCenter.y, radius);
          grad.addColorStop(0, `rgba(224, 64, 251, ${alpha})`);
          grad.addColorStop(0.6, `rgba(0, 229, 255, ${alpha * 0.7})`);
          grad.addColorStop(1, 'rgba(0, 229, 255, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(targetCenter.x, targetCenter.y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 5. Kaiser Seismic Smash (重撃)
      else if (effect.effectType === 'SPECIAL_SMASH') {
        const radius = Math.max(1, t * 140);
        const alpha = Math.max(0, 1 - t);
        ctx.strokeStyle = `rgba(255, 143, 0, ${alpha * 0.9})`;
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 61, 0, ${alpha * 0.8})`;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, Math.max(1, radius * 0.65), 0, Math.PI * 2);
        ctx.stroke();
      }

      // 6. Critical Hit (Dual Golden Slash + Spark Burst)
      else if (effect.isCritical) {
        const slashLen = 160 * t;
        const alpha = Math.max(0, 1 - t * 0.8);
        ctx.strokeStyle = `rgba(255, 213, 79, ${alpha})`;
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(targetCenter.x - slashLen, targetCenter.y - slashLen * 0.7);
        ctx.lineTo(targetCenter.x + slashLen, targetCenter.y + slashLen * 0.7);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 111, 0, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(targetCenter.x - slashLen, targetCenter.y + slashLen * 0.7);
        ctx.lineTo(targetCenter.x + slashLen, targetCenter.y + slashLen * 0.7);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 249, 196, ${alpha})`;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, Math.max(1, 35 * t), 0, Math.PI * 2);
        ctx.fill();
      }

      // 7. Normal Hit (Single Sharp Slash + Impact Spark)
      else if (effect.effectType === 'NORMAL_HIT') {
        const slashLen = 120 * t;
        const alpha = Math.max(0, 1 - t);
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 6;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(targetCenter.x - slashLen, targetCenter.y - slashLen * 0.5);
        ctx.lineTo(targetCenter.x + slashLen, targetCenter.y + slashLen * 0.5);
        ctx.stroke();

        ctx.strokeStyle = `rgba(144, 202, 249, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(targetCenter.x - slashLen * 0.8, targetCenter.y - slashLen * 0.4);
        ctx.lineTo(targetCenter.x + slashLen * 0.8, targetCenter.y + slashLen * 0.4);
        ctx.stroke();

        ctx.fillStyle = `rgba(226, 232, 240, ${alpha * 0.9})`;
        ctx.beginPath();
        ctx.arc(targetCenter.x, targetCenter.y, Math.max(1, 20 * t), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    } catch {
      // safely handle any canvas rendering failure
    }
  }, [effect, progress]);

  if (!effect) return null;

  const t = progress;

  // Ultimate Screen Dim: Only active during 0.05 < t < 0.75 of ULTIMATE skill
  // Strictly guaranteed to be 0 otherwise, so it can never remain on screen!
  const ultimateDimAlpha = effect.isUltimate && t >= 0.05 && t <= 0.75
    ? (t < 0.25 ? ((t - 0.05) / 0.2) * 0.55 : ((0.75 - t) / 0.5) * 0.55)
    : 0;

  const ultimateFlashAlpha = effect.isUltimate && t >= 0.15 && t <= 0.35
    ? (1 - Math.abs(t - 0.25) / 0.1) * 0.4
    : 0;

  const critFlashAlpha = effect.isCritical && t >= 0.08 && t <= 0.24
    ? (1 - Math.abs(t - 0.16) / 0.08) * 0.25
    : 0;

  // Damage Number Scale & Offset
  const popScale = t < 0.2 ? (t / 0.2) * 1.3 : t < 0.4 ? 1.3 - (t - 0.2) * 0.8 : 1.0;
  const popAlpha = t > 0.75 ? (1 - t) / 0.25 : 1;
  const yOffset = -30 - t * 45;

  const cutInSrc = effect.effectType === 'SPECIAL_FEATHER'
    ? CHARACTERS.find(c => c.name === effect.actorName)?.specialCutInSrc
    : undefined;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        overflow: 'hidden',
      }}
    >
      {/* Dim Overlay - strictly conditional and zero when animation finishes */}
      {ultimateDimAlpha > 0.01 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `rgba(0, 0, 0, ${ultimateDimAlpha})`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Screen Flash */}
      {ultimateFlashAlpha > 0.01 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `rgba(255, 255, 255, ${ultimateFlashAlpha})`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Critical Flash */}
      {critFlashAlpha > 0.01 && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: `rgba(255, 213, 79, ${critFlashAlpha})`,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        width={typeof window !== 'undefined' ? window.innerWidth || 800 : 800}
        height={typeof window !== 'undefined' ? window.innerHeight || 800 : 800}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />

      {/* Special Skill Cut-In (e.g. いれーな『羽弾』) */}
      {cutInSrc && (
        <SpecialCutIn
          key={effect.effectId}
          imageSrc={cutInSrc}
          skillName={effect.skillName}
          actorName={effect.actorName}
          isEnemy={effect.targetIsPlayer}
          durationMs={Math.round(820 / Math.max(0.1, speedMultiplier))}
        />
      )}

      {/* Grand Ultimate Cut-In Banner */}
      {effect.isUltimate && t >= 0.05 && t <= 0.85 && (
        <div
          style={{
            position: 'absolute',
            top: '32%',
            transform: `translateY(-50px) scale(${t < 0.25 ? 0.85 + t * 0.6 : 1.0})`,
            opacity: t > 0.65 ? (0.85 - t) / 0.2 : 1,
            backgroundColor: '#1E0E08',
            border: '2px solid #FFD54F',
            borderRadius: '14px',
            padding: '12px 28px',
            boxShadow: '0 0 24px rgba(255, 213, 79, 0.6)',
            textAlign: 'center',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 900,
              color: '#FFD54F',
              letterSpacing: '2px',
              marginBottom: '4px',
            }}
          >
            🌟 ULTIMATE SKILL 🌟
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 900,
              color: '#FFFFFF',
              textShadow: '0 0 10px #FF6F00',
            }}
          >
            必殺技『{effect.skillName}』
          </div>
        </div>
      )}

      {/* Evade "MISS!" Badge */}
      {effect.isEvade && (
        <div
          style={{
            position: 'absolute',
            top: effect.targetIsPlayer ? '68%' : '28%',
            transform: `translateY(-30px) scale(${t < 0.2 ? (t / 0.2) * 1.2 : 1.0})`,
            opacity: t > 0.7 ? (1 - t) / 0.3 : 1,
            backgroundColor: 'rgba(0, 56, 71, 0.95)',
            border: '2px solid #00E5FF',
            borderRadius: '10px',
            padding: '8px 18px',
            textAlign: 'center',
            boxShadow: '0 0 16px rgba(0, 229, 255, 0.5)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 900, color: '#80D8FF' }}>
            💨 MISS!! 回避成功！
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#E0F7FA' }}>
            ダメージ無効＆必殺技ゲージ+1
          </div>
        </div>
      )}

      {/* Buff "POWER UP!" Badge */}
      {effect.isBuff && (
        <div
          style={{
            position: 'absolute',
            top: effect.targetIsPlayer ? '68%' : '28%',
            transform: `translateY(-30px) scale(${t < 0.2 ? (t / 0.2) * 1.2 : 1.0})`,
            opacity: t > 0.7 ? (1 - t) / 0.3 : 1,
            backgroundColor: 'rgba(62, 30, 5, 0.95)',
            border: '2px solid #FFB300',
            borderRadius: '10px',
            padding: '8px 18px',
            textAlign: 'center',
            boxShadow: '0 0 16px rgba(255, 179, 0, 0.5)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 900, color: '#FFD54F' }}>
            ⚡ POWER UP!! 強化完了！
          </div>
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#FFF9C4' }}>
            次の攻撃行動のダメージ +50
          </div>
        </div>
      )}

      {/* Floating Damage Numbers */}
      {effect.damage > 0 && (
        <div
          style={{
            position: 'absolute',
            top: effect.targetIsPlayer ? '68%' : '28%',
            transform: `translateY(${yOffset}px) scale(${popScale})`,
            opacity: Math.max(0, Math.min(1, popAlpha)),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pointerEvents: 'none',
          }}
        >
          {effect.isCritical && (
            <div
              style={{
                backgroundColor: '#D84315',
                border: '1.5px solid #FFD54F',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '12px',
                fontWeight: 900,
                color: '#FFF9C4',
                marginBottom: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              ⚡ CRITICAL HIT! ⚡
            </div>
          )}

          {effect.statusAilmentName && (
            <div
              style={{
                backgroundColor: effect.statusAilmentName === '出血' ? '#B71C1C' : '#4A148C',
                border: `1.5px solid ${effect.statusAilmentName === '出血' ? '#FF8A80' : '#E1BEE7'}`,
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '11px',
                fontWeight: 700,
                color: '#FFFFFF',
                marginBottom: '4px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              {effect.statusAilmentName === '出血' ? '🩸 出血付与！ (毎T -50)' : '🌀 重圧付与！ (速度/攻撃-25)'}
            </div>
          )}

          <div
            style={{
              backgroundColor: effect.isUltimate
                ? 'rgba(62, 18, 5, 0.95)'
                : effect.isCritical
                ? 'rgba(56, 18, 6, 0.95)'
                : 'rgba(30, 36, 51, 0.95)',
              border: `2px solid ${
                effect.isUltimate
                  ? '#FFD54F'
                  : effect.isCritical
                  ? '#FF9800'
                  : '#64B5F6'
              }`,
              borderRadius: '10px',
              padding: '4px 16px',
              fontSize: effect.isUltimate ? '32px' : effect.isCritical ? '28px' : '22px',
              fontWeight: 900,
              color: effect.isUltimate ? '#FFEB3B' : effect.isCritical ? '#FFD54F' : '#FFFFFF',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.6)',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.8)',
            }}
          >
            -{effect.damage} DMG
          </div>
        </div>
      )}
    </div>
  );
};
