import React from 'react';
import { Home, Skull, Sparkles, Swords, Zap } from 'lucide-react';
import './BottomNavigation.css';

export type MainTab = 'HOME' | 'GROWTH' | 'GACHA' | 'BATTLE' | 'RAID';

interface BottomNavigationProps {
  active: MainTab;
  onNavigate: (tab: MainTab) => void;
}

const NAV_ITEMS = [
  { id: 'HOME', label: 'ホーム', icon: Home },
  { id: 'GROWTH', label: '強化', icon: Zap },
  { id: 'GACHA', label: 'ガチャ', icon: Sparkles },
  { id: 'BATTLE', label: '戦闘', icon: Swords },
  { id: 'RAID', label: 'レイド', icon: Skull },
] as const;

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ active, onNavigate }) => (
  <nav className="bottom-navigation" aria-label="メインナビゲーション">
    <div className="bottom-navigation__inner">
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const selected = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            className={'bottom-navigation__item' + (selected ? ' is-active' : '')}
            onClick={() => onNavigate(item.id)}
            aria-current={selected ? 'page' : undefined}
            aria-label={item.label}
            title={item.label}
          >
            <span className="bottom-navigation__icon"><Icon size={20} strokeWidth={selected ? 2.5 : 2} aria-hidden="true" /></span>
            <span className="bottom-navigation__label">{item.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);

export default BottomNavigation;
