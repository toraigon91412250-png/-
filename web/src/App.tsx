import React, { useState, useEffect, useRef } from 'react';
import { AbilityId, BattleSetupConfig, CpuDifficulty } from './types/game';
import { IRENA, KAISER, CPU_CHARACTERS, getIrenaWithSkillProgress } from './data/characters';
import { useBattleGame } from './hooks/useBattleGame';
import { CharacterSelectScreen } from './components/CharacterSelectScreen';
import { BattleScreen } from './components/BattleScreen';
import { addAbilityShardsForDeveloper, addRecruitmentTicketsForDeveloper, chooseIrenaSkillPath, loadAbilityProgress, loadOverallStats, loadRecruitmentProgress, loadSkillProgress, performRecruitment, resetProgressForDeveloper, setAbilityForDeveloper, setAllAbilitiesForDeveloper, setRecruitmentTicketsForDeveloper, setSkillProgressForDeveloper, upgradeAbility, upgradeIrenaSkill, loadStatPoints } from './utils/storage';
import battleBackground from './assets/戦闘中背景.png';
import { RaidBossScreen } from './components/RaidBossScreen';
import { RecruitmentDraw } from './data/recruitment';
import { RecruitmentScreen } from './components/RecruitmentScreen';
import { BattleSetupScreen } from './components/BattleSetupScreen';
import { DeveloperToolsScreen } from './components/DeveloperToolsScreen';
import { normalizeStatAllocation } from './utils/statBuild';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<'SELECT' | 'BATTLE_SETUP' | 'BATTLE' | 'RAID_BOSS' | 'RECRUITMENT' | 'DEV_TOOLS'>('SELECT');
  const [difficulty, setDifficulty] = useState<CpuDifficulty>('NORMAL');
  const [overallStats, setOverallStats] = useState(() => loadOverallStats());
  const [skillProgress, setSkillProgress] = useState(() => loadSkillProgress());
  const [recruitmentProgress, setRecruitmentProgress] = useState(() => loadRecruitmentProgress());
  const [abilityProgress, setAbilityProgress] = useState(() => loadAbilityProgress());
  const [availableStatPoints, setAvailableStatPoints] = useState(() => loadStatPoints());
  const [battleSetup, setBattleSetup] = useState<BattleSetupConfig>({
    kaiserLevel: 10,
    abilities: [],
    statAllocation: normalizeStatAllocation(),
    statPointTotal: loadStatPoints(),
  });
  const [isBattleDeploying, setIsBattleDeploying] = useState(false);

  const upgradedIrena = getIrenaWithSkillProgress(skillProgress);

  const {
    state: battleState,
    onActionSelected,
    restartBattle,
    toggleSound,
    toggleSpeed,
    setCpuDifficulty,
  } = useBattleGame(IRENA, KAISER, difficulty, battleSetup);

  // Battle-only image preload cache. Keep strong references so the first VFX/cut-in
  // does not have to start a fresh image decode during the attack.
  const battleImagePreloadCacheRef = useRef(new Map<string, Promise<void>>());

  const preloadBattleImage = (src: string) => {
    const cached = battleImagePreloadCacheRef.current.get(src);
    if (cached) return cached;

    const promise = new Promise<void>(resolve => {
      const image = new Image();
      let finished = false;

      const finish = () => {
        if (finished) return;
        finished = true;

        if (typeof image.decode === 'function') {
          image.decode().catch(() => {}).finally(() => resolve());
        } else {
          resolve();
        }
      };

      image.decoding = 'async';
      image.setAttribute('fetchpriority', 'high');
      image.onload = finish;
      image.onerror = () => resolve();
      image.src = src;

      if (image.complete) {
        finish();
      }
    });

    battleImagePreloadCacheRef.current.set(src, promise);
    return promise;
  };

  // Reload stats whenever battle is finished
  useEffect(() => {
    if (battleState.phase === 'BATTLE_FINISHED') {
      setOverallStats(loadOverallStats());
      setSkillProgress(loadSkillProgress());
      setRecruitmentProgress(loadRecruitmentProgress());
      setAbilityProgress(loadAbilityProgress());
      setAvailableStatPoints(loadStatPoints());
    }
  }, [battleState.phase]);

  const refreshProgress = () => {
    setOverallStats(loadOverallStats());
    setSkillProgress(loadSkillProgress());
    setRecruitmentProgress(loadRecruitmentProgress());
    setAbilityProgress(loadAbilityProgress());
    const currentStatPoints = loadStatPoints();
    setAvailableStatPoints(currentStatPoints);
    setBattleSetup(prev => ({ ...prev, statPointTotal: currentStatPoints }));
  };

  const handleOpenBattleSetup = (prefill?: BattleSetupConfig) => {
    refreshProgress();
    const currentStatPoints = loadStatPoints();
    setAvailableStatPoints(currentStatPoints);
    if (prefill) {
      setBattleSetup({ ...prefill, statPointTotal: currentStatPoints });
    } else {
      setBattleSetup(prev => ({ ...prev, statPointTotal: currentStatPoints }));
    }
    setScreen('BATTLE_SETUP');
  };

  const handleOpenDeveloperTools = () => {
    refreshProgress();
    setScreen('DEV_TOOLS');
  };

  const getBattleCpuOpponent = () =>
    CPU_CHARACTERS.find(c => c.id !== upgradedIrena.id)
    || CPU_CHARACTERS.find(c => c.id === KAISER.id)
    || KAISER;

  const handleStartBattle = (config: BattleSetupConfig) => {
    setBattleSetup(config);
    const sources = [
      battleBackground,
      IRENA.imageSrc,
      IRENA.iconImageSrc,
      IRENA.specialCutInSrc,
      KAISER.imageSrc,
      KAISER.iconImageSrc,
      KAISER.specialCutInSrc,
    ].filter((src): src is string => Boolean(src));

    setCpuDifficulty(difficulty);
    const cpuOpponent = getBattleCpuOpponent();
    restartBattle(upgradedIrena, cpuOpponent, difficulty, config);
    setIsBattleDeploying(true);
    setScreen('BATTLE');

    const minimumDeployMs = 1100;

    // Image preloading is best-effort only. Do not block battle visibility on
    // an image decode that may never settle.
    void Promise.all(sources.map(preloadBattleImage)).catch(() => {});
    window.setTimeout(() => setIsBattleDeploying(false), minimumDeployMs);
  };
  const handleUpgradeSkill = (skillId: 'FEATHER' | 'RUIN') => {
    const next = upgradeIrenaSkill(skillId);
    if (next) setSkillProgress(next);
  };

  const handleChooseSkillPath = (
    skillId: 'FEATHER' | 'RUIN',
    path: 'ABYSS' | 'JUDGMENT' | 'CHARGE' | 'EXECUTION' | 'ANNIHILATION'
  ) => {
    const next =
      skillId === 'FEATHER'
        ? chooseIrenaSkillPath('FEATHER', path as 'ABYSS' | 'JUDGMENT' | 'CHARGE')
        : chooseIrenaSkillPath('RUIN', path as 'EXECUTION' | 'ANNIHILATION');
    if (next) setSkillProgress(next);
  };

  const handleRecruit = (count: 1 | 10): RecruitmentDraw[] | null => {
    const outcome = performRecruitment(count);
    if (!outcome) return null;
    setRecruitmentProgress(outcome.progress);
    setAbilityProgress(loadAbilityProgress());
    return outcome.results;
  };

  const handleUpgradeAbility = (abilityId: AbilityId) => {
    const next = upgradeAbility(abilityId);
    if (!next) return;
    setAbilityProgress(next);
    setBattleSetup(prev => ({
      ...prev,
      abilities: prev.abilities.map(ability => ({
        ...ability,
        level: next.levels[ability.id],
      })),
    }));
  };

  const handleBackToSelect = () => {
    refreshProgress();
    setScreen('SELECT');
  };

  const handleDeveloperSetAbility = (id: AbilityId, level: number, shards?: number) => {
    setAbilityProgress(setAbilityForDeveloper(id, level, shards));
  };

  const handleDeveloperSetAllAbilities = (level: number, shards: number) => {
    setAbilityProgress(setAllAbilitiesForDeveloper(level, shards));
  };

  const handleDeveloperAddAbilityShards = (id: AbilityId, amount: number) => {
    setAbilityProgress(addAbilityShardsForDeveloper(id, amount));
  };

  const handleDeveloperSetTickets = (tickets: number) => {
    setRecruitmentProgress(setRecruitmentTicketsForDeveloper(tickets));
  };

  const handleDeveloperAddTickets = (amount: number) => {
    setRecruitmentProgress(addRecruitmentTicketsForDeveloper(amount));
  };

  const handleDeveloperSetSkillProgress = (featherLevel: number, ruinLevel: number, shards: number) => {
    setSkillProgress(setSkillProgressForDeveloper(featherLevel, ruinLevel, shards));
  };

  const handleDeveloperReset = () => {
    const reset = resetProgressForDeveloper();
    setOverallStats(reset.overallStats);
    setSkillProgress(reset.skillProgress);
    setRecruitmentProgress(reset.recruitmentProgress);
    setAbilityProgress(reset.abilityProgress);
    setAvailableStatPoints(loadStatPoints());
    setBattleSetup({
      kaiserLevel: 10,
      abilities: [],
      statAllocation: normalizeStatAllocation(),
      statPointTotal: loadStatPoints(),
    });
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {screen !== 'BATTLE' && (
        <button
          type="button"
          onClick={handleOpenDeveloperTools}
          style={{
            position:'fixed',
            right:10,
            bottom:10,
            zIndex:500,
            minHeight:38,
            padding:'0 11px',
            borderRadius:10,
            border:'1px solid #C48726',
            background:'rgba(30,23,12,.96)',
            color:'#FFE082',
            fontSize:10,
            fontWeight:950,
            letterSpacing:'.06em',
            boxShadow:'0 6px 20px rgba(0,0,0,.35)',
            cursor:'pointer',
          }}
        >
          開発者ツール
        </button>
      )}

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
          selectedDifficulty={difficulty}
          onSelectDifficulty={setDifficulty}
          onStartBattle={() => handleOpenBattleSetup()}
          onOpenRaidBoss={() => setScreen('RAID_BOSS')}
          onOpenRecruitment={() => setScreen('RECRUITMENT')}
          skillProgress={skillProgress}
          onUpgradeSkill={handleUpgradeSkill}
          onChooseSkillPath={handleChooseSkillPath}
        />
      ) : screen === 'BATTLE_SETUP' ? (
        <BattleSetupScreen
          abilityProgress={abilityProgress}
          availableStatPoints={availableStatPoints}
          initialConfig={battleSetup}
          onBack={() => setScreen('SELECT')}
          onStartBattle={handleStartBattle}
        />
      ) : screen === 'BATTLE' ? (
        <BattleScreen
          state={battleState}
          onAction={onActionSelected}
          onBackToSelect={handleBackToSelect}
          onRestart={() => restartBattle(upgradedIrena, getBattleCpuOpponent(), difficulty, battleSetup)}
          skillProgress={skillProgress}
          onUpgradeSkill={handleUpgradeSkill}
          onChooseSkillPath={handleChooseSkillPath}
          onToggleSound={toggleSound}
          onToggleSpeed={toggleSpeed}
        />
      ) : screen === 'RAID_BOSS' ? (
        <RaidBossScreen onBack={() => setScreen('SELECT')} />
      ) : screen === 'RECRUITMENT' ? (
        <RecruitmentScreen
          progress={recruitmentProgress}
          abilityProgress={abilityProgress}
          onRecruit={handleRecruit}
          onUpgradeAbility={handleUpgradeAbility}
          onBack={() => setScreen('SELECT')}
        />
      ) : (
        <DeveloperToolsScreen
          abilityProgress={abilityProgress}
          recruitmentProgress={recruitmentProgress}
          skillProgress={skillProgress}
          overallStats={overallStats}
          battleSetup={battleSetup}
          onBack={() => setScreen('SELECT')}
          onRefresh={refreshProgress}
          onSetAbility={handleDeveloperSetAbility}
          onSetAllAbilities={handleDeveloperSetAllAbilities}
          onAddAbilityShards={handleDeveloperAddAbilityShards}
          onSetTickets={handleDeveloperSetTickets}
          onAddTickets={handleDeveloperAddTickets}
          onSetSkillProgress={handleDeveloperSetSkillProgress}
          onOpenRecruitment={() => setScreen('RECRUITMENT')}
          onOpenBattleSetup={handleOpenBattleSetup}
          onReset={handleDeveloperReset}
        />
      )}
    </div>
  );
};
