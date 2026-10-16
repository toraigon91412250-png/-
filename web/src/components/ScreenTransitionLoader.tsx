import React, { useEffect } from 'react';
import './ScreenTransitionLoader.css';

interface ScreenTransitionLoaderProps {
  waitFor?: Promise<unknown> | null;
  onComplete: () => void;
}

// Keep the brief dark transition; battle deployment uses its own separate loading flow.
const MINIMUM_TRANSITION_TIME_MS = 450;

export const ScreenTransitionLoader: React.FC<ScreenTransitionLoaderProps> = ({
  waitFor,
  onComplete,
}) => {
  useEffect(() => {
    let cancelled = false;
    let complete = false;
    let minimumTimeElapsed = false;
    let extraWorkReady = !waitFor;

    const finishIfReady = () => {
      if (cancelled || complete || !minimumTimeElapsed || !extraWorkReady) return;
      complete = true;
      onComplete();
    };

    const minimumTimer = window.setTimeout(() => {
      minimumTimeElapsed = true;
      finishIfReady();
    }, MINIMUM_TRANSITION_TIME_MS);

    void Promise.resolve(waitFor).then(
      () => {
        if (cancelled) return;
        extraWorkReady = true;
        finishIfReady();
      },
      () => {
        // A failed optional preload must not trap the player on the dark screen.
        if (cancelled) return;
        extraWorkReady = true;
        finishIfReady();
      },
    );

    return () => {
      cancelled = true;
      window.clearTimeout(minimumTimer);
    };
  }, [waitFor, onComplete]);

  return (
    <section
      className="screen-transition-loader"
      role="status"
      aria-live="polite"
      aria-label="画面遷移中"
      data-testid="screen-transition-loader"
    >
      <span className="screen-transition-loader__sr-only">画面を切り替えています...</span>
    </section>
  );
};

export default ScreenTransitionLoader;
