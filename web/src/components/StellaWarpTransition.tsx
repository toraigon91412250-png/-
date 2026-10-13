import React, { useEffect, useState } from 'react';
import './StellaWarpTransition.css';

interface StellaWarpTransitionProps {
  /** Returns false when the unlock could not be saved, leaving the reveal open for retry. */
  onComplete: () => boolean;
}

type TransitionPhase = 'warp' | 'reveal';

export const StellaWarpTransition: React.FC<StellaWarpTransitionProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<TransitionPhase>('warp');
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => setPhase('reveal'), reducedMotion ? 160 : 2_150);
    return () => window.clearTimeout(timer);
  }, []);

  const completeReveal = () => {
    setSaveError(false);
    if (!onComplete()) setSaveError(true);
  };

  return (
    <div
      className={`stella-warp stella-warp--${phase}`}
      role="dialog"
      aria-modal="true"
      aria-label={phase === 'warp' ? '隠された領域へのワープ演出' : undefined}
      aria-labelledby={phase === 'reveal' ? 'stella-warp-title' : undefined}
      aria-describedby={phase === 'reveal' ? 'stella-warp-description' : undefined}
    >
      <div className="stella-warp__space" aria-hidden="true">
        <div className="stella-warp__stars stella-warp__stars--far" />
        <div className="stella-warp__stars stella-warp__stars--near" />
        <div className="stella-warp__rays" />
        <div className="stella-warp__rings">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="stella-warp__core" />
        <div className="stella-warp__flash" />
      </div>

      {phase === 'warp' ? (
        <div className="stella-warp__travel-label" role="status" aria-live="polite">
          <span>UNKNOWN COORDINATES</span>
          <strong>境界を突破中</strong>
        </div>
      ) : (
        <section className="stella-warp__reveal">
          <p className="stella-warp__eyebrow">HIDDEN CHARACTER UNLOCKED</p>
          <div className="stella-warp__sigil" aria-hidden="true">✦</div>
          <h1 id="stella-warp-title">ステラモード解放</h1>
          <p id="stella-warp-description" className="stella-warp__description">
            星の法則を操る、もうひとつの戦いが目を覚ました。
          </p>
          <button className="stella-warp__continue" type="button" onClick={completeReveal}>
            解放を確認
          </button>
          {saveError && (
            <p className="stella-warp__error" role="alert">
              解放状態を保存できませんでした。保存領域を確認して、もう一度お試しください。
            </p>
          )}
        </section>
      )}
    </div>
  );
};

export default StellaWarpTransition;
