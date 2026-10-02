import React, { useState, useEffect } from 'react';
import { CharacterDef, CpuDifficulty } from './types/game';
import { CHARACTERS, CPU_CHARACTERS, IRENA, KAISER } from './data/characters';
import { useBattleGame } from './hooks/useBattleGame';
import { CharacterSelectScreen } from './components/CharacterSelectScreen';
import { BattleScreen } from './components/BattleScreen';
import { loadOverallStats } from './utils/storage';
import battleBackground from './assets/戦闘中背景.png';
import { RaidBossScreen } from './components/RaidBossScreen';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<'SELECT' | 'BATTLE' | 'RAID_BOSS'>('SELECT');
  const [playerChar, setPlayerChar] = useState<CharacterDef>(IRENA);
  const [enemyChar, setEnemyChar] = useState<CharacterDef>(KAISER);
  const [difficulty, setDifficulty] = useState<CpuDifficulty>('NORMAL');
  const [overallStats, setOverallStats] = useState(() => loadOverallStats());
  const [isBattleDeploying, setIsBattleDeploying] = useState(false);

  const {
    state: battleState,
    onActionSelected,
    restartBattle,
    toggleSound,
    toggleSpeed,
    setCpuDifficulty,
  } = useBattleGame(playerChar, enemyChar, difficulty);

  // Preload character special-skill cut-ins before the first battle action.
  useEffect(() => {
    CHARACTERS.forEach(character => {
      if (!character.specialCutInSrc) return;
      const image = new Image();
      image.decoding = 'async';
      image.src = character.specialCutInSrc;
      if (typeof image.decode === 'function') {
        image.decode().catch(() => {});
      }
    });
  }, []);

  // Reload stats whenever battle is finished
  useEffect(() => {
    if (battleState.phase === 'BATTLE_FINISHED') {
      setOverallStats(loadOverallStats());
    }
  }, [battleState.phase]);

  const handleStartBattle = () => {
    const opp = CPU_CHARACTERS.find(c => c.id !== playerChar.id) || CPU_CHARACTERS.find(c => c.id === KAISER.id) || KAISER;
    const sources = [
      battleBackground,
      playerChar.imageSrc,
      playerChar.iconImageSrc,
      playerChar.specialCutInSrc,
      opp.imageSrc,
      opp.iconImageSrc,
      opp.specialCutInSrc,
    ].filter((src): src is string => Boolean(src));

    setEnemyChar(opp);
    setCpuDifficulty(difficulty);
    restartBattle(playerChar, opp);
    setIsBattleDeploying(true);
    setScreen('BATTLE');

    const startedAt = Date.now();
    const minimumDeployMs = 1100;

    Promise.all(
      sources.map(
        (src) =>
          new Promise<void>((resolve) => {
            const image = new Image();
            image.onload = () => resolve();
            image.onerror = () => resolve();
            image.src = src;
            if (typeof image.decode === 'function') image.decode().catch(() => {});
          }),
      ),
    ).then(() => {
      const remainingMs = Math.max(0, minimumDeployMs - (Date.now() - startedAt));
      setTimeout(() => setIsBattleDeploying(false), remainingMs);
    });
  };

  const handleBackToSelect = () => {
    setOverallStats(loadOverallStats());
    setScreen('SELECT');
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {isBattleDeploying && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200, backgroundColor: '#000000',
            color: '#FFFFFF', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', textAlign: 'center',
          }}
          aria-label="戦闘出撃中"
        >
          <style>{`
            @keyframes battleDeployProgress {
              0% { transform: scaleX(0); opacity: 0.4; }
              20% { opacity: 1; }
              100% { transform: scaleX(1); opacity: 1; }
            }
          `}</style>
          <div style={{
            fontSize: 'clamp(11px, 2vw, 16px)', fontWeight: 800,
            letterSpacing: '0.28em', color: '#90CAF9', marginBottom: '10px',
          }}>
            BATTLE DEPLOYING...
          </div>
          <div style={{
            fontSize: 'clamp(28px, 6vw, 52px)', fontWeight: 1000,
            letterSpacing: '0.08em', textShadow: '0 0 18px rgba(144, 202, 249, 0.45)',
          }}>
            戦闘出撃中
          </div>
          <div style={{
            width: 'clamp(120px, 28vw, 220px)', height: '2px', marginTop: '22px',
            backgroundColor: '#1E283D', overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', inset: 0, backgroundColor: '#64B5F6',
              transformOrigin: 'left center', animation: 'battleDeployProgress 1.1s ease-out both',
            }} />
          </div>
        </div>
      )}
      {screen === 'SELECT' ? (
        <CharacterSelectScreen
          overallStats={overallStats}
          selectedPlayer={playerChar}
          selectedDifficulty={difficulty}
          onSelectPlayer={setPlayerChar}
          onSelectDifficulty={setDifficulty}
          onStartBattle={handleStartBattle}
          onOpenRaidBoss={() => setScreen('RAID_BOSS')}
        />
      ) : screen === 'BATTLE' ? (
        <BattleScreen
          state={battleState}
          onAction={onActionSelected}
          onBackToSelect={handleBackToSelect}
          onRestart={() => restartBattle()}
          onToggleSound={toggleSound}
          onToggleSpeed={toggleSpeed}
        />
      ) : (
        <RaidBossScreen onBack={() => setScreen('SELECT')} />
      )}
    </div>
  );
};
