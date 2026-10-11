import React from 'react';
import './BattleDeployOverlay.css';

interface BattleDeployOverlayProps {
  variant?: 'battle' | 'gacha';
}

export const BattleDeployOverlay: React.FC<BattleDeployOverlayProps> = ({ variant = 'battle' }) => {
  const isGacha = variant === 'gacha';

  return (
  <section
    className={isGacha ? 'battle-deploy-overlay battle-deploy-overlay--gacha' : 'battle-deploy-overlay'}
    role="status"
    aria-live="polite"
    aria-label={isGacha ? '召喚準備中' : '戦闘出撃中'}
  >
    <div className="battle-deploy-grid" aria-hidden="true" />
    <div className="battle-deploy-sweep" aria-hidden="true" />
    <div className="battle-deploy-frame" aria-hidden="true">
      <span className="battle-deploy-corner battle-deploy-corner--top-left" />
      <span className="battle-deploy-corner battle-deploy-corner--top-right" />
      <span className="battle-deploy-corner battle-deploy-corner--bottom-left" />
      <span className="battle-deploy-corner battle-deploy-corner--bottom-right" />
    </div>

    <div className="battle-deploy-topbar" aria-hidden="true">
      <span className="battle-deploy-brand">
        {isGacha ? <>SUMMON INTERFACE <strong>/ 02</strong></> : <>TACTICAL INTERFACE <strong>/ 01</strong></>}
      </span>
      <span className="battle-deploy-system-status">
        <i />
        {isGacha ? 'RESONANCE INITIALIZING' : 'SYSTEM INITIALIZING'}
      </span>
    </div>

    <div className="battle-deploy-side-label battle-deploy-side-label--left" aria-hidden="true">
      {isGacha ? <>WING SIGNAL <span>///</span> 01</> : <>VECTOR LOCK <span>///</span> 01</>}
    </div>
    <div className="battle-deploy-side-label battle-deploy-side-label--right" aria-hidden="true">
      {isGacha ? <>GATE SCAN <span>///</span> ACTIVE</> : <>FIELD SCAN <span>///</span> ACTIVE</>}
    </div>

    <div className="battle-deploy-center">
      <div className="battle-deploy-reticle" aria-hidden="true">
        <span className="battle-deploy-ring battle-deploy-ring--outer" />
        <span className="battle-deploy-ring battle-deploy-ring--middle" />
        <span className="battle-deploy-ring battle-deploy-ring--inner" />
        <span className="battle-deploy-reticle-crosshair" />
        <span className="battle-deploy-reticle-scan" />
        <span className="battle-deploy-reticle-core" />
      </div>

      <div className="battle-deploy-copy">
        <div className="battle-deploy-eyebrow">
          <span />
          {isGacha ? 'BLACK WING / SUMMONING...' : 'BATTLE DEPLOYING...'}
          <span />
        </div>
        <h1>{isGacha ? '召喚準備中' : '戦闘出撃中'}</h1>
        <p className="battle-deploy-subtitle">{isGacha ? 'INITIALIZING SUMMON GATE' : 'INITIALIZING COMBAT FIELD'}</p>
        <div className="battle-deploy-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>

    <div className="battle-deploy-footer" aria-hidden="true">
      <div>
        <span>{isGacha ? 'SUMMON SYSTEM' : 'COMBAT SYSTEM'}</span>
        <strong>STARTING</strong>
      </div>
      <div>
        <span>{isGacha ? 'WING SIGNAL' : 'TACTICAL LINK'}</span>
        <strong>{isGacha ? 'SCANNING' : 'INITIALIZING'}</strong>
      </div>
      <div>
        <span>{isGacha ? 'GATE SEQUENCE' : 'DEPLOY SEQUENCE'}</span>
        <strong>{isGacha ? 'OPENING' : 'IN PROGRESS'}</strong>
      </div>
    </div>
  </section>
  );
};

export default BattleDeployOverlay;
