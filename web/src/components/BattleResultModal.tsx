import React from 'react';
import { BattleUiState } from '../types/game';
import { Trophy, Skull, RotateCcw, ArrowLeft } from 'lucide-react';

interface BattleResultModalProps {
  state: BattleUiState;
  onRematch: () => void;
  onBackToSelect: () => void;
}

export const BattleResultModal: React.FC<BattleResultModalProps> = ({
  state,
  onRematch,
  onBackToSelect,
}) => {
  const playerWon = state.winnerIsPlayer === true;
  const winner = playerWon ? state.player : state.enemy;
  const loser = playerWon ? state.enemy : state.player;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          backgroundColor: '#131724',
          borderRadius: '20px',
          border: playerWon
            ? '2px solid #FFD54F'
            : '2px solid #E57373',
          boxShadow: playerWon
            ? '0 0 30px rgba(255, 213, 79, 0.3)'
            : '0 0 30px rgba(229, 115, 115, 0.3)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          animation: 'modalPop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
      >
        {/* Banner Header Icon */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '50%',
            backgroundColor: playerWon ? 'rgba(255, 179, 0, 0.2)' : 'rgba(183, 28, 28, 0.2)',
            border: `1.5px solid ${playerWon ? '#FFB300' : '#E57373'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '12px',
          }}
        >
          {playerWon ? (
            <Trophy size={36} color="#FFD54F" />
          ) : (
            <Skull size={36} color="#EF5350" />
          )}
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: '24px',
            fontWeight: 900,
            color: playerWon ? '#FFD54F' : '#EF5350',
            marginBottom: '4px',
          }}
        >
          {playerWon ? 'VICTORY! 勝利！' : 'DEFEAT... 敗北'}
        </div>

        <div style={{ fontSize: '13px', color: '#B0BEC5', marginBottom: '16px' }}>
          {playerWon
            ? `見事な戦略で ${state.enemy.character.name} を撃破しました！`
            : `${state.enemy.character.name} の前に倒れました... 次こそ勝利を掴みましょう！`}
        </div>

        {/* Summary Card */}
        <div
          style={{
            width: '100%',
            backgroundColor: '#1A2132',
            borderRadius: '12px',
            border: '1px solid #2B3752',
            padding: '12px',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              padding: '4px 0',
              borderBottom: '1px solid #242E44',
            }}
          >
            <span style={{ color: '#90CAF9' }}>勝者</span>
            <span style={{ fontWeight: 800, color: '#FFFFFF' }}>{winner.character.name}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              padding: '4px 0',
              borderBottom: '1px solid #242E44',
            }}
          >
            <span style={{ color: '#90CAF9' }}>敗者</span>
            <span style={{ fontWeight: 800, color: '#FFFFFF' }}>{loser.character.name}</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              padding: '4px 0',
              borderBottom: '1px solid #242E44',
            }}
          >
            <span style={{ color: '#90CAF9' }}>総ターン数</span>
            <span style={{ fontWeight: 800, color: '#FFD54F' }}>第 {state.turnNumber} ターン</span>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12px',
              padding: '4px 0',
            }}
          >
            <span style={{ color: '#90CAF9' }}>CPU 難易度</span>
            <span style={{ fontWeight: 800, color: '#FFFFFF' }}>
              {state.cpuDifficulty === 'EXPERT' ? 'エキスパート' : 'ノーマル'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={onRematch}
            style={{
              width: '100%',
              height: '46px',
              backgroundColor: playerWon ? '#E65100' : '#1976D2',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '10px',
              fontSize: '15px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            }}
          >
            <RotateCcw size={16} />
            <span>再戦する（同じ対戦カード）</span>
          </button>

          <button
            onClick={onBackToSelect}
            style={{
              width: '100%',
              height: '42px',
              backgroundColor: 'transparent',
              color: '#B0BEC5',
              border: '1px solid #3B4868',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={16} />
            <span>キャラクター選択に戻る</span>
          </button>
        </div>
      </div>
    </div>
  );
};
