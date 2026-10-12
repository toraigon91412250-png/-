import React from 'react';
import { AbilityId, AbilityProgress } from '../types/game';
import { ABILITY_DEFINITIONS } from '../data/abilities';

interface AbilityUpgradePanelProps {
  progress: AbilityProgress;
  onUpgrade: (abilityId: AbilityId) => void;
}

export const AbilityUpgradePanel: React.FC<AbilityUpgradePanelProps> = ({ progress, onUpgrade }) => (
  <section className="ability-upgrade-panel" aria-labelledby="ability-upgrade-title">
    <header className="ability-upgrade-panel__header">
      <div>
        <p className="ability-upgrade-panel__eyebrow">POWER GROWTH</p>
        <h2 id="ability-upgrade-title">権能育成</h2>
        <p>所持している権能の欠片を使ってレベルアップ。</p>
      </div>
      <span>最大 Lv.5</span>
    </header>
    <div className="ability-upgrade-panel__list">
      {ABILITY_DEFINITIONS.map(ability => {
        const level = progress.levels[ability.id];
        const shards = progress.shards[ability.id];
        const cost = level >= 5 ? null : 40 + Math.max(0, level - 1) * 40;
        const canUpgrade = level > 0 && cost !== null && shards >= cost;

        return (
          <div className="ability-upgrade-panel__row" key={ability.id}>
            <span className="ability-upgrade-panel__symbol" aria-hidden="true">{ability.symbol}</span>
            <span className="ability-upgrade-panel__details">
              <strong>{ability.name} <span>Lv.{level > 0 ? level : '—'}</span></strong>
              <small>{level > 0 ? `欠片 ${shards}${cost !== null ? ` / ${cost}` : ' / MAX'}` : '未解放。黒翼召喚で獲得できます'}</small>
            </span>
            <button type="button" disabled={!canUpgrade} onClick={() => onUpgrade(ability.id)}>
              {level >= 5 ? 'MAX' : 'Lv.UP'}
            </button>
          </div>
        );
      })}
    </div>
  </section>
);

export default AbilityUpgradePanel;
