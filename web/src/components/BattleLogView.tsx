import React, { useEffect, useRef } from 'react';
import { BattleLog, LogType } from '../types/game';

interface BattleLogViewProps {
  logs: BattleLog[];
  height?: string | number;
}

const LOG_TYPE_STYLES: Record<LogType, { bg: string; text: string; icon: string }> = {
  SYSTEM: { bg: '#1E2433', text: '#B0BEC5', icon: '🔹' },
  PLAYER_ACTION: { bg: '#1B3A5A', text: '#90CAF9', icon: '🗡️' },
  ENEMY_ACTION: { bg: '#4A1A2C', text: '#FFAB91', icon: '💥' },
  CRITICAL_PLAYER: { bg: '#5A1C06', text: '#FFD54F', icon: '⚡💥' },
  CRITICAL_ENEMY: { bg: '#6B0E1D', text: '#FF8A80', icon: '⚠️💥' },
  DAMAGE_PLAYER: { bg: '#3D1E28', text: '#FF8A80', icon: '💥' },
  DAMAGE_ENEMY: { bg: '#1E344A', text: '#80D8FF', icon: '💥' },
  EVADE_SUCCESS_PLAYER: { bg: '#004D40', text: '#80E8DD', icon: '💨' },
  EVADE_SUCCESS_ENEMY: { bg: '#003847', text: '#80D8FF', icon: '💨' },
  EVADE_FAIL_PLAYER: { bg: '#3E2723', text: '#FFCCBC', icon: '⚠️' },
  EVADE_FAIL_ENEMY: { bg: '#3E2723', text: '#FFCCBC', icon: '⚠️' },
  BUFF_PLAYER: { bg: '#4E342E', text: '#FFCC80', icon: '⚡' },
  BUFF_ENEMY: { bg: '#3E2723', text: '#FFB74D', icon: '⚡' },
  SPECIAL_PLAYER: { bg: 'rgba(74, 20, 140, 0.7)', text: '#EA80FC', icon: '✨' },
  SPECIAL_ENEMY: { bg: 'rgba(183, 28, 28, 0.7)', text: '#FF8A80', icon: '🔥' },
  ULTIMATE_PLAYER: { bg: 'rgba(230, 81, 0, 0.8)', text: '#FFE082', icon: '🌟🔥' },
  ULTIMATE_ENEMY: { bg: 'rgba(191, 54, 12, 0.8)', text: '#FFCC80', icon: '🌟💥' },
  GAUGE_CHANGE: { bg: 'rgba(49, 27, 146, 0.65)', text: '#D1C4E9', icon: '⚡' },
  PASSIVE_TRIGGER: { bg: 'rgba(0, 77, 64, 0.6)', text: '#80CBC4', icon: '🔮' },
  AILMENT_APPLIED: { bg: 'rgba(74, 20, 140, 0.6)', text: '#CE93D8', icon: '⚠️' },
  AILMENT_DOT: { bg: '#5D101D', text: '#FF8A80', icon: '🩸' },
  AILMENT_EXPIRED: { bg: '#1B3A36', text: '#80CBC4', icon: '✨' },
  VICTORY: { bg: '#1B5E20', text: '#A5D6A7', icon: '👑' },
  DEFEAT: { bg: '#B71C1C', text: '#FFCDD2', icon: '💀' },
};

const HIDDEN_LOG_TERMS = ['ダメージ', 'DMG', '出血', '重圧'];

export const BattleLogView: React.FC<BattleLogViewProps> = ({ logs, height = '100%' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleLogs = logs.filter(log => !HIDDEN_LOG_TERMS.some(term => log.text.includes(term)));

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [visibleLogs.length]);

  return (
    <div
      style={{
        backgroundColor: '#10131E',
        borderRadius: '14px',
        border: '1px solid #282F45',
        padding: '8px',
        display: 'flex',
        flexDirection: 'column',
        height,
        boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '6px',
          paddingBottom: '4px',
          borderBottom: '1px solid #1E2538',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 700, color: '#90CAF9' }}>
          📜 戦闘ログ
        </span>
        <span style={{ fontSize: '11px', color: '#94A3B8' }}>
          計 {visibleLogs.length} 件
        </span>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          paddingRight: '4px',
        }}
      >
        {visibleLogs.map(log => {
          const style = LOG_TYPE_STYLES[log.type] || { bg: '#1A1F2C', text: '#FFFFFF', icon: '▫️' };
          const isBold =
            log.type === 'VICTORY' ||
            log.type === 'DEFEAT' ||
            log.type === 'ULTIMATE_PLAYER' ||
            log.type === 'ULTIMATE_ENEMY' ||
            log.type === 'CRITICAL_PLAYER';

          return (
            <div
              key={log.id}
              style={{
                backgroundColor: style.bg,
                border: '1px solid #2B3347',
                borderRadius: '8px',
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                color: style.text,
                fontWeight: isBold ? 800 : 500,
                lineHeight: 1.4,
              }}
            >
              <span style={{ fontSize: '11px', flexShrink: 0 }}>{style.icon}</span>
              <span style={{ wordBreak: 'break-word' }}>{log.text}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
