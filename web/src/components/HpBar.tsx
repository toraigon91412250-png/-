import React from 'react';

interface HpBarProps {
  currentHp: number;
  maxHp: number;
}

export const HpBar: React.FC<HpBarProps> = ({ currentHp, maxHp }) => {
  const ratio = Math.max(0, Math.min(1, currentHp / maxHp));
  const percent = Math.round(ratio * 100);

  let barColor = '#4CAF50'; // Green
  if (ratio <= 0.25) {
    barColor = '#EF5350'; // Red
  } else if (ratio <= 0.5) {
    barColor = '#FFCA28'; // Yellow
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '11px',
        fontWeight: 700,
        marginBottom: '4px'
      }}>
        <span style={{ color: barColor, fontWeight: 900 }}>HP</span>
        <span style={{ color: '#FFFFFF' }}>{currentHp} / {maxHp} ({percent}%)</span>
      </div>
      <div style={{
        width: '100%',
        height: '13px',
        backgroundColor: '#161B28',
        borderRadius: '6px',
        border: '1px solid #3B4868',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          width: `${percent}%`,
          height: '100%',
          background: `linear-gradient(90deg, ${barColor}D0 0%, ${barColor} 100%)`,
          transition: 'width 0.35s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s ease',
          borderRadius: '5px'
        }} />
      </div>
    </div>
  );
};
