import React, { useEffect } from 'react';
import './ScreenTransitionLoader.css';

import cuteIrenaRoom from '../assets/IMG_1174.jpeg';
import cuteIrenaMagic from '../assets/IMG_1176.jpeg';
import loadingIrenaShop from '../assets/IMG_1177.jpeg';
import loadingIrenaCrystal from '../assets/IMG_1178.jpeg';
import loadingIrenaNight from '../assets/IMG_1179.jpeg';

interface ScreenTransitionLoaderProps {
  transitionIndex: number;
  waitFor?: Promise<unknown> | null;
  onComplete: () => void;
}

const SCREEN_TRANSITION_ARTWORK = [
  { name: 'IMG_1174.jpeg', src: cuteIrenaRoom, hasLoadingText: false },
  { name: 'IMG_1177.jpeg', src: loadingIrenaShop, hasLoadingText: true },
  { name: 'IMG_1176.jpeg', src: cuteIrenaMagic, hasLoadingText: false },
  { name: 'IMG_1178.jpeg', src: loadingIrenaCrystal, hasLoadingText: true },
  { name: 'IMG_1179.jpeg', src: loadingIrenaNight, hasLoadingText: true },
] as const;

// Keep non-combat navigation snappy; battle deployment has its own separate loading flow.
const MINIMUM_TRANSITION_TIME_MS = 450;

export const ScreenTransitionLoader: React.FC<ScreenTransitionLoaderProps> = ({
  transitionIndex,
  waitFor,
  onComplete,
}) => {
  const normalizedIndex = ((Math.trunc(transitionIndex) % SCREEN_TRANSITION_ARTWORK.length)
    + SCREEN_TRANSITION_ARTWORK.length) % SCREEN_TRANSITION_ARTWORK.length;
  const artwork = SCREEN_TRANSITION_ARTWORK[normalizedIndex];

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
        // A failed optional preload must not trap the player on the loading screen.
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
      data-screen-transition-art={artwork.name}
    >
      <div className="screen-transition-loader__backdrop" aria-hidden="true">
        <img className="screen-transition-loader__backdrop-art" src={artwork.src} alt="" />
        <div className="screen-transition-loader__shade" />
      </div>

      <div className="screen-transition-loader__artwork" aria-hidden="true">
        <img className="screen-transition-loader__art" src={artwork.src} alt="" />
      </div>

      {!artwork.hasLoadingText && (
        <div className="screen-transition-loader__caption" aria-hidden="true">
          <span className="screen-transition-loader__eyebrow">NOW LOADING...</span>
          <span className="screen-transition-loader__subtitle">画面を切り替えています</span>
          <span className="screen-transition-loader__progress">
            <span />
          </span>
        </div>
      )}

      <span className="screen-transition-loader__sr-only">画面を切り替えています...</span>
    </section>
  );
};

export default ScreenTransitionLoader;
