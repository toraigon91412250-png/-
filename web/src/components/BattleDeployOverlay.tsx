import React from 'react';
import './BattleDeployOverlay.css';

export const BattleDeployOverlay: React.FC = () => (
  <section
    className="battle-deploy-overlay"
    role="status"
    aria-live="polite"
    aria-label="戦闘出撃中"
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
        TACTICAL INTERFACE <strong>/ 01</strong>
      </span>
      <span className="battle-deploy-system-status">
        <i />
        SYSTEM INITIALIZING
      </span>
    </div>

    <div className="battle-deploy-side-label battle-deploy-side-label--left" aria-hidden="true">
      VECTOR LOCK <span>///</span> 01
    </div>
    <div className="battle-deploy-side-label battle-deploy-side-label--right" aria-hidden="true">
      FIELD SCAN <span>///</span> ACTIVE
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
          BATTLE DEPLOYING...
          <span />
        </div>
        <h1>戦闘出撃中</h1>
        <p className="battle-deploy-subtitle">INITIALIZING COMBAT FIELD</p>
        <div className="battle-deploy-progress" aria-hidden="true">
          <span />
        </div>
      </div>
    </div>

    <div className="battle-deploy-footer" aria-hidden="true">
      <div>
        <span>COMBAT SYSTEM</span>
        <strong>STARTING</strong>
      </div>
      <div>
        <span>TACTICAL LINK</span>
        <strong>INITIALIZING</strong>
      </div>
      <div>
        <span>DEPLOY SEQUENCE</span>
        <strong>IN PROGRESS</strong>
      </div>
    </div>
  </section>
);

export default BattleDeployOverlay;
