import React, { useState, useEffect } from 'react';
import { AbilityId, BattleSetupConfig, CpuDifficulty, ImprintId } from './types/game';
import { IRENA, KAISER, CPU_CHARACTERS, getIrenaWithSkillProgress } from './data/characters';
import { useBattleGame } from './hooks/useBattleGame';
import { CharacterSelectScreen } from './components/CharacterSelectScreen';
import { BattleScreen } from './components/BattleScreen';
import { BattleDeployOverlay } from './components/BattleDeployOverlay';
import { addAbilityShardsForDeveloper, addRecruitmentTicketsForDeveloper, chooseIrenaSkillPath, loadAbilityProgress, loadOverallStats, loadRaidRewardProgress, loadRecruitmentProgress, loadSkillProgress, performRecruitment, drawImprintGacha, redeemRaidCoreFragment, resetProgressForDeveloper, setAbilityForDeveloper, setAllAbilitiesForDeveloper, setRecruitmentTicketsForDeveloper, setImprintTicketsForDeveloper, addImprintTicketsForDeveloper, unlockAllImprintsForDeveloper, setSkillProgressForDeveloper, upgradeAbility, upgradeIrenaSkill, loadStatPoints, loadImprintProgress, equipImprint, unequipImprint } from './utils/storage';
import { RaidGame } from './raid/RaidGame';
import { RecruitmentDraw } from './data/recruitment';
import { RecruitmentScreen } from './components/RecruitmentScreen';
import { BattleSetupScreen } from './components/BattleSetupScreen';
import { ImprintScreen } from './components/ImprintScreen';
import { ImprintGachaScreen } from './components/ImprintGachaScreen';
import { DeveloperToolsScreen } from './components/DeveloperToolsScreen';
import { GachaHubScreen } from './components/GachaHubScreen';
import { BottomNavigation } from './components/BottomNavigation';
import type { MainTab } from './components/BottomNavigation';
import { normalizeStatAllocation } from './utils/statBuild';
import { preloadAllGameImages } from './utils/imagePreload';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<'SELECT' | 'GACHA_HUB' | 'BATTLE_SETUP' | 'BATTLE' | 'RAID_PROTOTYPE' | 'RECRUITMENT' | 'IMPRINTS' | 'IMPRINT_GACHA' | 'DEV_TOOLS'>('SELECT');
  const [difficulty, setDifficulty] = useState<CpuDifficulty>('NORMAL');
  const [overallStats, setOverallStats] = useState(() => loadOverallStats());
  const [skillProgress, setSkillProgress] = useState(() => loadSkillProgress());
  const [recruitmentProgress, setRecruitmentProgress] = useState(() => loadRecruitmentProgress());
  const [abilityProgress, setAbilityProgress] = useState(() => loadAbilityProgress());
  const [availableStatPoints, setAvailableStatPoints] = useState(() => loadStatPoints());
  const [raidRewardProgress, setRaidRewardProgress] = useState(() => loadRaidRewardProgress());
  const [imprintProgress, setImprintProgress] = useState(() => loadImprintProgress());
  const [raidItemMessage, setRaidItemMessage] = useState<string | null>(null);
  const [imprintMessage, setImprintMessage] = useState<string | null>(null);
  const [imprintGachaMessage, setImprintGachaMessage] = useState<string | null>(null);
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
    cancelBattle,
    toggleSound,
    toggleSpeed,
    setCpuDifficulty,
  } = useBattleGame(IRENA, KAISER, difficulty, battleSetup);

  useEffect(() => {
    void preloadAllGameImages();
  }, []);

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
    setRaidRewardProgress(loadRaidRewardProgress());
    const currentImprintProgress = loadImprintProgress();
    setImprintProgress(currentImprintProgress);
    setOverallStats(loadOverallStats());
    setSkillProgress(loadSkillProgress());
    setRecruitmentProgress(loadRecruitmentProgress());
    setAbilityProgress(loadAbilityProgress());
    const currentStatPoints = loadStatPoints();
    setAvailableStatPoints(currentStatPoints);
    setBattleSetup(prev => ({ ...prev, statPointTotal: currentStatPoints, imprints: currentImprintProgress.equippedIds }));
  };

  const handleUseRaidCoreFragment = () => {
    const redemption = redeemRaidCoreFragment();
    setRaidRewardProgress(redemption.progress);

    if (!redemption.used) {
      setRaidItemMessage(
        redemption.persisted
          ? '使用できる深淵核片がありません。レイド勝利で入手できます。'
          : '保存に失敗したため使用できませんでした。空き容量やブラウザの保存設定を確認してください。',
      );
      return;
    }

    const nextStatPoints = loadStatPoints();
    setAvailableStatPoints(nextStatPoints);
    setBattleSetup(prev => ({ ...prev, statPointTotal: nextStatPoints }));
    setRaidItemMessage(`深淵核片を使用！ ステータス配分上限 +2P（永続）。現在 ${nextStatPoints}P。`);
  };

  const handleOpenBattleSetup = (prefill?: BattleSetupConfig) => {
    refreshProgress();
    const currentStatPoints = loadStatPoints();
    const currentImprintProgress = loadImprintProgress();
    setImprintProgress(currentImprintProgress);
    setAvailableStatPoints(currentStatPoints);
    if (prefill) {
      setBattleSetup({ ...prefill, statPointTotal: currentStatPoints, imprints: currentImprintProgress.equippedIds });
    } else {
      setBattleSetup(prev => ({ ...prev, statPointTotal: currentStatPoints, imprints: currentImprintProgress.equippedIds }));
    }
    setScreen('BATTLE_SETUP');
  };

  const handleOpenImprints = () => {
    const current = loadImprintProgress();
    setImprintProgress(current);
    setBattleSetup(prev => ({ ...prev, imprints: current.equippedIds }));
    setImprintMessage(null);
    setScreen('IMPRINTS');
  };

  const handleEquipImprint = (id: ImprintId) => {
    const next = equipImprint(id);
    if (!next) {
      setImprintMessage('装備を保存できませんでした。空き枠と保存設定を確認してください。');
      return;
    }
    setImprintProgress(next);
    setBattleSetup(prev => ({ ...prev, imprints: next.equippedIds }));
    setImprintMessage('刻印の装備を保存しました。');
  };

  const handleUnequipImprint = (id: ImprintId) => {
    const next = unequipImprint(id);
    if (!next) {
      setImprintMessage('解除を保存できませんでした。保存設定を確認してください。');
      return;
    }
    setImprintProgress(next);
    setBattleSetup(prev => ({ ...prev, imprints: next.equippedIds }));
    setImprintMessage('刻印の解除を保存しました。');
  };

  const handleOpenImprintGacha = () => {
    refreshProgress();
    setImprintGachaMessage(null);
    setScreen('IMPRINT_GACHA');
  };

  const handleDrawImprintGacha = () => {
    const result = drawImprintGacha();
    setRaidRewardProgress(result.raidRewardProgress);
    setImprintProgress(result.imprintProgress);

    if (result.status === 'DRAWN') {
      setImprintGachaMessage(`${result.imprint.name}を獲得しました！ 刻印管理から装備できます。`);
    } else if (result.status === 'ALL_COLLECTED') {
      setImprintGachaMessage('すべての刻印を所持しています。これ以上ガチャを引く必要はありません。');
    } else if (result.status === 'NO_TICKETS') {
      setImprintGachaMessage('刻印ガチャチケットがありません。レイドに勝利すると1枚入手できます。');
    } else {
      setImprintGachaMessage('保存に失敗したため、チケットは消費していません。ブラウザの保存設定を確認してください。');
    }
    return result;
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
    const battleConfigWithImprints: BattleSetupConfig = {
      ...config,
      imprints: [...imprintProgress.equippedIds],
    };
    setBattleSetup(battleConfigWithImprints);
    setCpuDifficulty(difficulty);
    const cpuOpponent = getBattleCpuOpponent();
    restartBattle(upgradedIrena, cpuOpponent, difficulty, battleConfigWithImprints);
    setIsBattleDeploying(true);
    setScreen('BATTLE');

    const minimumDeployMs = 1100;

    // Image preloading is best-effort only. Do not block battle visibility on
    // an image decode that may never settle.
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
    cancelBattle();
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

  const handleDeveloperSetImprintTickets = (tickets: number) => {
    setRaidRewardProgress(setImprintTicketsForDeveloper(tickets));
  };

  const handleDeveloperAddImprintTickets = (amount: number) => {
    setRaidRewardProgress(addImprintTicketsForDeveloper(amount));
  };

  const handleDeveloperUnlockAllImprints = () => {
    const next = unlockAllImprintsForDeveloper();
    if (!next) return;
    setImprintProgress(next);
    setBattleSetup(prev => ({ ...prev, imprints: next.equippedIds }));
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
    setImprintProgress(reset.imprintProgress);
    setBattleSetup(prev => ({ ...prev, imprints: reset.imprintProgress.equippedIds }));
    setRaidRewardProgress(loadRaidRewardProgress());
    setRaidItemMessage(null);
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
      {screen === 'SELECT' && (
        <button
          type="button"
          onClick={handleOpenDeveloperTools}
          style={{
            position:'fixed',
            right:10,
            bottom:82,
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

      {isBattleDeploying && <BattleDeployOverlay />}
      {screen === 'SELECT' ? (
        <CharacterSelectScreen
          overallStats={overallStats}
          onStartBattle={() => handleOpenBattleSetup()}
          skillProgress={skillProgress}
          raidRewardProgress={raidRewardProgress}
          raidItemMessage={raidItemMessage}
          onUseRaidCoreFragment={handleUseRaidCoreFragment}
          onUpgradeSkill={handleUpgradeSkill}
          onChooseSkillPath={handleChooseSkillPath}
        />
      ) : screen === 'GACHA_HUB' ? (
        <GachaHubScreen
          imprintTickets={raidRewardProgress.imprintTickets}
          unlockedImprints={imprintProgress.unlockedIds.length}
          onOpenRecruitment={() => {
            refreshProgress();
            setScreen('RECRUITMENT');
          }}
          onOpenImprintGacha={handleOpenImprintGacha}
          onOpenImprints={handleOpenImprints}
        />
      ) : screen === 'IMPRINTS' ? (
        <ImprintScreen
          progress={imprintProgress}
          message={imprintMessage}
          onEquip={handleEquipImprint}
          onUnequip={handleUnequipImprint}
          onBack={() => {
            refreshProgress();
            setImprintMessage(null);
            setScreen('GACHA_HUB');
          }}
        />
      ) : screen === 'IMPRINT_GACHA' ? (
        <ImprintGachaScreen
          progress={imprintProgress}
          raidRewardProgress={raidRewardProgress}
          message={imprintGachaMessage}
          onDraw={handleDrawImprintGacha}
          onBack={() => {
            refreshProgress();
            setImprintGachaMessage(null);
            setScreen('GACHA_HUB');
          }}
        />
      ) : screen === 'BATTLE_SETUP' ? (
        <BattleSetupScreen
          abilityProgress={abilityProgress}
          availableStatPoints={availableStatPoints}
          initialConfig={battleSetup}
          selectedDifficulty={difficulty}
          onSelectDifficulty={setDifficulty}
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
      ) : screen === 'RAID_PROTOTYPE' ? (
        <RaidGame
          onBack={() => setScreen('SELECT')}
          onRaidRewardProgressChange={setRaidRewardProgress}
        />
      ) : screen === 'RECRUITMENT' ? (
        <RecruitmentScreen
          progress={recruitmentProgress}
          abilityProgress={abilityProgress}
          onRecruit={handleRecruit}
          onUpgradeAbility={handleUpgradeAbility}
          onBack={() => setScreen('GACHA_HUB')}
        />
      ) : (
        <DeveloperToolsScreen
          abilityProgress={abilityProgress}
          recruitmentProgress={recruitmentProgress}
          imprintProgress={imprintProgress}
          raidRewardProgress={raidRewardProgress}
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
          onSetImprintTickets={handleDeveloperSetImprintTickets}
          onAddImprintTickets={handleDeveloperAddImprintTickets}
          onUnlockAllImprints={handleDeveloperUnlockAllImprints}
          onSetSkillProgress={handleDeveloperSetSkillProgress}
          onOpenRecruitment={() => setScreen('RECRUITMENT')}
          onOpenBattleSetup={handleOpenBattleSetup}
          onReset={handleDeveloperReset}
        />
      )}
      {(screen === 'SELECT' || screen === 'GACHA_HUB') && (
        <BottomNavigation
          active={screen === 'SELECT' ? 'HOME' : 'GACHA'}
          onNavigate={(tab: MainTab) => {
            if (tab === 'HOME') {
              setScreen('SELECT');
            } else if (tab === 'GACHA') {
              refreshProgress();
              setScreen('GACHA_HUB');
            } else if (tab === 'BATTLE') {
              handleOpenBattleSetup();
            } else {
              refreshProgress();
              setScreen('RAID_PROTOTYPE');
            }
          }}
        />
      )}
    </div>
  );
};
