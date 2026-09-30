import React, { useState, useEffect } from 'react';
import { CharacterDef, CpuDifficulty } from './types/game';
import { CHARACTERS, IRENA, KAISER } from './data/characters';
import { useBattleGame } from './hooks/useBattleGame';
import { CharacterSelectScreen } from './components/CharacterSelectScreen';
import { BattleScreen } from './components/BattleScreen';
import { loadOverallStats } from './utils/storage';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<'SELECT' | 'BATTLE'>('SELECT');
  const [playerChar, setPlayerChar] = useState<CharacterDef>(IRENA);
  const [enemyChar, setEnemyChar] = useState<CharacterDef>(KAISER);
  const [difficulty, setDifficulty] = useState<CpuDifficulty>('NORMAL');
  const [overallStats, setOverallStats] = useState(() => loadOverallStats());

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
    const opp = CHARACTERS.find(c => c.id !== playerChar.id) || KAISER;
    setEnemyChar(opp);
    setCpuDifficulty(difficulty);
    restartBattle(playerChar, opp);
    setScreen('BATTLE');
  };

  const handleBackToSelect = () => {
    setOverallStats(loadOverallStats());
    setScreen('SELECT');
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {screen === 'SELECT' ? (
        <CharacterSelectScreen
          overallStats={overallStats}
          selectedPlayer={playerChar}
          selectedDifficulty={difficulty}
          onSelectPlayer={setPlayerChar}
          onSelectDifficulty={setDifficulty}
          onStartBattle={handleStartBattle}
        />
      ) : (
        <BattleScreen
          state={battleState}
          onAction={onActionSelected}
          onBackToSelect={handleBackToSelect}
          onRestart={() => restartBattle()}
          onToggleSound={toggleSound}
          onToggleSpeed={toggleSpeed}
        />
      )}
    </div>
  );
};
