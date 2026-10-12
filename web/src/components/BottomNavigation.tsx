import React from 'react';
import { Home, Skull, Sparkles, Swords } from 'lucide-react';
import './BottomNavigation.css';

export type MainTab = 'HOME' | 'GACHA' | 'BATTLE' | 'RAID';

interface BottomNavigationProps {
  active: MainTab;
  onNavigate: (tab: MainTab) => void;
}

const NAV_ITEMS = [
  { id: 'HOME', label: 'ホーム', english: 'HOME', icon: Home },
  { id: 'GACHA', label: 'ガチャ', english: 'SUMMON', icon: Sparkles },
  { id: 'BATTLE', label: '戦闘', english: 'BATTLE', icon: Swords },
  { id: 'RAID', label: 'レイド', english: 'RAID', icon: Skull },
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
            <span className="bottom-navigation__icon"><Icon size={19} strokeWidth={selected ? 2.5 : 2} /></span>
            <span className="bottom-navigation__label">{item.label}</span>
            <span className="bottom-navigation__english">{item.english}</span>
          </button>
        );
      })}
    </div>
  </nav>
);

export default BottomNavigation;
