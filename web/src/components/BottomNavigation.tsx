import React from 'react';
import { Home, Skull, Sparkles, Swords } from 'lucide-react';

export type MainTab = 'HOME' | 'GACHA' | 'BATTLE' | 'RAID';

interface BottomNavigationProps {
  active: MainTab;
  onNavigate: (tab: MainTab) => void;
}

const NAV_ITEMS = [
  { id: 'HOME', label: 'ホーム', icon: Home },
  { id: 'GACHA', label: 'ガチャ', icon: Sparkles },
  { id: 'BATTLE', label: '戦闘', icon: Swords },
  { id: 'RAID', label: 'レイド', icon: Skull },
] as const;

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ active, onNavigate }) => (
  <nav
    aria-label="メインナビゲーション"
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 450,
      padding: '8px 12px calc(8px + env(safe-area-inset-bottom, 0px))',
      borderTop: '1px solid rgba(116,137,173,0.22)',
      background: 'linear-gradient(180deg, rgba(10,13,22,0.9), rgba(10,13,22,0.985))',
      backdropFilter: 'blur(16px)',
    }}
  >
    <div style={{ width: '100%', maxWidth: '640px', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '6px' }}>
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const selected = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            aria-current={selected ? 'page' : undefined}
            style={{
              minWidth: 0,
              minHeight: '58px',
              padding: '6px 2px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              borderRadius: '11px',
              border: selected ? '1px solid rgba(255,213,79,0.58)' : '1px solid transparent',
              background: selected ? 'linear-gradient(145deg, rgba(87,65,26,0.66), rgba(40,34,24,0.55))' : 'transparent',
              color: selected ? '#FFE082' : '#929EB3',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            <Icon size={20} strokeWidth={selected ? 2.5 : 2} />
            <span style={{ fontSize: '10px', lineHeight: 1.2, fontWeight: selected ? 950 : 800 }}>{item.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
