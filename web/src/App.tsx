import React, { useState, useEffect } from 'react';
import { AbilityId, BattleSetupConfig, CpuDifficulty, ImprintId } from './types/game';
import { IRENA, KAISER, CPU_CHARACTERS, PLAYER_CHARACTERS, getIrenaWithSkillProgress, getPlayerCharacterById } from './data/characters';
import { useBattleGame } from './hooks/useBattleGame';
import { HomeDashboard } from './components/HomeDashboard';
import { GrowthHubScreen } from './components/GrowthHubScreen';
import { IrenaTalentBoard } from './components/IrenaTalentBoard';
import { BattleScreen } from './components/BattleScreen';
import { BattleDeployOverlay } from './components/BattleDeployOverlay';
import { addAbilityShardsForDeveloper, addRecruitmentTicketsForDeveloper, chooseIrenaSkillPath, loadAbilityProgress, loadOverallStats, loadRaidRewardProgress, loadRecruitmentProgress, loadSkillProgress, performRecruitment, drawImprintGacha, redeemRaidCoreFragment, resetProgressForDeveloper, setAbilityForDeveloper, setAllAbilitiesForDeveloper, setRecruitmentTicketsForDeveloper, setImprintTicketsForDeveloper, addImprintTicketsForDeveloper, unlockAllImprintsForDeveloper, setSkillProgressForDeveloper, upgradeAbility, upgradeIrenaSkill, loadStatPoints, loadImprintProgress, equipImprint, unequipImprint, replaceEquippedImprints } from './utils/storage';
import { RaidGame } from './raid/RaidGame';
import { RecruitmentDraw } from './data/recruitment';
import { RecruitmentScreen } from './components/RecruitmentScreen';
import { BattleSetupScreen } from './components/BattleSetupScreen';
import { ImprintScreen } from './components/ImprintScreen';
import { ImprintGachaScreen } from './components/ImprintGachaScreen';
import { DeveloperToolsScreen } from './components/DeveloperToolsScreen';
import { GachaHubScreen } from './components/GachaHubScreen';
import { BottomNavigation } from './components/BottomNavigation';
import { ScreenTransitionLoader } from './components/ScreenTransitionLoader';
import type { MainTab } from './components/BottomNavigation';
import { normalizeStatAllocation } from './utils/statBuild';
import { preloadBattleImages, preloadRecruitmentImages } from './utils/imagePreload';
import { getSelectableKaiserLevels, loadKaiserChallengeProgress, recordKaiserChallengeResult, resetKaiserChallengeProgress } from './utils/kaiserChallengeProgress';
import { applyIrenaTalentModifiers, loadIrenaTalentProgress, resetIrenaTalentRanks, spendIrenaTalentPoint } from './utils/irenaTalentSystem';
import type { IrenaTalentId } from './utils/irenaTalentSystem';

type AppScreen = 'SELECT' | 'GROWTH_HUB' | 'GACHA_HUB' | 'BATTLE_SETUP' | 'BATTLE' | 'RAID_PROTOTYPE' | 'RECRUITMENT' | 'IMPRINTS' | 'IMPRINT_GACHA' | 'IRENA_TALENTS' | 'DEV_TOOLS';

// These screens already have their own transition or combat presentation.
const SCREENS_WITH_EXISTING_TRANSITIONS: ReadonlySet<AppScreen> = new Set([
  'BATTLE_SETUP',
  'BATTLE',
  'RAID_PROTOTYPE',
  'DEV_TOOLS',
]);

export const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>('SELECT');
  const [isScreenTransitioning, setIsScreenTransitioning] = useState(false);
  const [screenTransitionIndex, setScreenTransitionIndex] = useState(0);
  const [screenTransitionWaitFor, setScreenTransitionWaitFor] = useState<Promise<unknown> | null>(null);
  const [difficulty, setDifficulty] = useState<CpuDifficulty>('NORMAL');
  const [overallStats, setOverallStats] = useState(() => loadOverallStats());
  const [skillProgress, setSkillProgress] = useState(() => loadSkillProgress());
  const [recruitmentProgress, setRecruitmentProgress] = useState(() => loadRecruitmentProgress());
  const [abilityProgress, setAbilityProgress] = useState(() => loadAbilityProgress());
  const [kaiserChallengeProgress, setKaiserChallengeProgress] = useState(() => loadKaiserChallengeProgress());
  const [irenaTalentProgress, setIrenaTalentProgress] = useState(() => loadIrenaTalentProgress());
  const [irenaTalentMessage, setIrenaTalentMessage] = useState<string | null>(null);
  const [availableStatPoints, setAvailableStatPoints] = useState(() => loadStatPoints());
  const [raidRewardProgress, setRaidRewardProgress] = useState(() => loadRaidRewardProgress());
  const [imprintProgress, setImprintProgress] = useState(() => loadImprintProgress());
  const [raidItemMessage, setRaidItemMessage] = useState<string | null>(null);
  const [imprintMessage, setImprintMessage] = useState<string | null>(null);
  const [imprintGachaMessage, setImprintGachaMessage] = useState<string | null>(null);
  const [battleSetupReturnScreen, setBattleSetupReturnScreen] = useState<'SELECT' | 'GROWTH_HUB'>('SELECT');
  const [talentReturnScreen, setTalentReturnScreen] = useState<'SELECT' | 'GROWTH_HUB'>('SELECT');
  const [imprintReturnScreen, setImprintReturnScreen] = useState<'GACHA_HUB' | 'GROWTH_HUB'>('GACHA_HUB');
  const [recruitmentReturnScreen, setRecruitmentReturnScreen] = useState<'GACHA_HUB' | 'GROWTH_HUB'>('GACHA_HUB');
  const [raidReturnScreen, setRaidReturnScreen] = useState<'SELECT' | 'GROWTH_HUB' | 'GACHA_HUB'>('SELECT');
  const [battleSetup, setBattleSetup] = useState<BattleSetupConfig>({
    kaiserLevel: kaiserChallengeProgress.unlockedLevel,
    playerCharacterId: IRENA.id,
    abilities: [],
    statAllocation: normalizeStatAllocation(),
    statPointTotal: loadStatPoints(),
  });
  const [isBattleDeploying, setIsBattleDeploying] = useState(false);

  const handleScreenTransitionComplete = React.useCallback(() => {
    setIsScreenTransitioning(false);
    setScreenTransitionWaitFor(null);
  }, []);

  const navigateToScreen = (nextScreen: AppScreen, waitFor?: Promise<unknown>) => {
    if (nextScreen === screen) return;

    const shouldShowTransition =
      !SCREENS_WITH_EXISTING_TRANSITIONS.has(screen)
      && !SCREENS_WITH_EXISTING_TRANSITIONS.has(nextScreen);

    setScreen(nextScreen);
    if (!shouldShowTransition) {
      setIsScreenTransitioning(false);
      setScreenTransitionWaitFor(null);
      return;
    }

    setScreenTransitionIndex(index => index + 1);
    setScreenTransitionWaitFor(waitFor ?? Promise.resolve());
    setIsScreenTransitioning(true);
  };

  const upgradedIrena = applyIrenaTalentModifiers(getIrenaWithSkillProgress(skillProgress), irenaTalentProgress);
  const getPlayerCharacterForBattle = (characterId?: string) => {
    const selectedCharacter = getPlayerCharacterById(characterId);
    return selectedCharacter.id === IRENA.id ? upgradedIrena : selectedCharacter;
  };

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
    void preloadBattleImages();
  }, []);

  // Battle rewards, including Irena talent EXP, are persisted atomically by saveBattleResult.
// Refresh the displayed progression here without granting the same battle EXP again.
  useEffect(() => {
    if (battleState.phase !== 'BATTLE_FINISHED') return;

    setOverallStats(loadOverallStats());
    setSkillProgress(loadSkillProgress());
    setRecruitmentProgress(loadRecruitmentProgress());
    setAbilityProgress(loadAbilityProgress());
    setAvailableStatPoints(loadStatPoints());
    setIrenaTalentProgress(loadIrenaTalentProgress());

    const completedLevel = battleState.battleConfig.kaiserLevel;
    const playerWon = battleState.winnerIsPlayer === true;
    const nextChallengeProgress = recordKaiserChallengeResult(completedLevel, playerWon);
    setKaiserChallengeProgress(nextChallengeProgress);
    setBattleSetup(prev => ({
      ...prev,
      kaiserLevel: playerWon ? nextChallengeProgress.unlockedLevel : completedLevel,
    }));
  }, [battleState.phase]);

  const refreshProgress = () => {
    setRaidRewardProgress(loadRaidRewardProgress());
    setKaiserChallengeProgress(loadKaiserChallengeProgress());
    setIrenaTalentProgress(loadIrenaTalentProgress());
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

  const handleOpenBattleSetup = (prefill?: BattleSetupConfig, returnTo: 'SELECT' | 'GROWTH_HUB' = 'SELECT') => {
    setBattleSetupReturnScreen(returnTo);
    refreshProgress();
    const currentStatPoints = loadStatPoints();
    const currentImprintProgress = loadImprintProgress();
    const currentKaiserProgress = loadKaiserChallengeProgress();
    const selectableKaiserLevels = getSelectableKaiserLevels(currentKaiserProgress.unlockedLevel);
    setKaiserChallengeProgress(currentKaiserProgress);
    setImprintProgress(currentImprintProgress);
    setAvailableStatPoints(currentStatPoints);
    if (prefill) {
      setBattleSetup({
        ...prefill,
        playerCharacterId: getPlayerCharacterById(prefill.playerCharacterId ?? battleSetup.playerCharacterId).id,
        kaiserLevel: selectableKaiserLevels.includes(prefill.kaiserLevel) ? prefill.kaiserLevel : currentKaiserProgress.unlockedLevel,
        statPointTotal: currentStatPoints,
        imprints: currentImprintProgress.equippedIds,
      });
    } else {
      setBattleSetup(prev => ({
        ...prev,
        playerCharacterId: getPlayerCharacterById(prev.playerCharacterId).id,
        kaiserLevel: selectableKaiserLevels.includes(prev.kaiserLevel) ? prev.kaiserLevel : currentKaiserProgress.unlockedLevel,
        statPointTotal: currentStatPoints,
        imprints: currentImprintProgress.equippedIds,
      }));
    }
    setScreen('BATTLE_SETUP');
  };

  const handleOpenImprints = (returnTo: 'GACHA_HUB' | 'GROWTH_HUB' = 'GACHA_HUB') => {
    setImprintReturnScreen(returnTo);
    const current = loadImprintProgress();
    setImprintProgress(current);
    setBattleSetup(prev => ({ ...prev, imprints: current.equippedIds }));
    setImprintMessage(null);
    navigateToScreen('IMPRINTS');
  };

  const handleOpenTalentBoard = (returnTo: 'SELECT' | 'GROWTH_HUB' = 'SELECT') => {
    setTalentReturnScreen(returnTo);
    setIrenaTalentProgress(loadIrenaTalentProgress());
    setIrenaTalentMessage(null);
    navigateToScreen('IRENA_TALENTS');
  };

  const handleSpendIrenaTalentPoint = (id: IrenaTalentId) => {
    const next = spendIrenaTalentPoint(id);
    if (!next) {
      setIrenaTalentMessage('才能ポイントが足りないか、保存に失敗しました。');
      return;
    }
    setIrenaTalentProgress(next);
    setIrenaTalentMessage('才能を強化しました。次の戦闘から効果が反映されます。');
  };

  const handleResetIrenaTalents = () => {
    const next = resetIrenaTalentRanks();
    if (!next) {
      setIrenaTalentMessage('振り直しの保存に失敗しました。ブラウザの保存設定を確認してください。');
      return;
    }
    setIrenaTalentProgress(next);
    setIrenaTalentMessage('才能を振り直しました。レベルと経験値は維持されています。');
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

  const handleApplySavedBuild = (config: BattleSetupConfig): { success: boolean; message?: string } => {
    const nextImprints = replaceEquippedImprints(config.imprints ?? []);
    if (!nextImprints) {
      return {
        success: false,
        message: '刻印の解放状況が変わったか、保存に失敗したためビルドを読み込めませんでした。',
      };
    }
    setImprintProgress(nextImprints);
    setBattleSetup({ ...config, imprints: [...nextImprints.equippedIds] });
    setImprintMessage(null);
    return { success: true };
  };

  const handleOpenImprintGacha = () => {
    refreshProgress();
    setImprintGachaMessage(null);
    navigateToScreen('IMPRINT_GACHA');
  };

  const handleOpenRecruitment = (returnTo: 'GACHA_HUB' | 'GROWTH_HUB' = 'GACHA_HUB') => {
    setRecruitmentReturnScreen(returnTo);
    const recruitmentAssetsReady = preloadRecruitmentImages();
    refreshProgress();
    navigateToScreen('RECRUITMENT', recruitmentAssetsReady);
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
    CPU_CHARACTERS.find(character => character.id === KAISER.id)
    ?? CPU_CHARACTERS[0]
    ?? KAISER;

  const handleStartBattle = (config: BattleSetupConfig) => {
    const battleConfigWithImprints: BattleSetupConfig = {
      ...config,
      imprints: [...(config.imprints ?? imprintProgress.equippedIds)],
    };
    setBattleSetup(battleConfigWithImprints);
    setCpuDifficulty(difficulty);
    const cpuOpponent = getBattleCpuOpponent();
    restartBattle(
      getPlayerCharacterForBattle(battleConfigWithImprints.playerCharacterId),
      cpuOpponent,
      difficulty,
      battleConfigWithImprints,
    );
    setIsBattleDeploying(true);
    setScreen('BATTLE');

    const minimumDeploy = new Promise<void>(resolve => {
      window.setTimeout(resolve, 1100);
    });

    // Keep the deployment overlay over the battle until all battle artwork,
    // including the dedicated 穿羽 cut-in, has finished loading/decoding.
    // The preload helper settles on both load and error, so a missing optional
    // image cannot permanently lock the player out of combat.
    void Promise.all([preloadBattleImages(), minimumDeploy]).then(
      () => setIsBattleDeploying(false),
      () => setIsBattleDeploying(false),
    );
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
    setKaiserChallengeProgress(resetKaiserChallengeProgress());
    setIrenaTalentProgress(loadIrenaTalentProgress());
    setIrenaTalentMessage(null);
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
      playerCharacterId: getPlayerCharacterById(battleSetup.playerCharacterId).id,
      abilities: [],
      statAllocation: normalizeStatAllocation(),
      statPointTotal: loadStatPoints(),
    });
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {isBattleDeploying && <BattleDeployOverlay />}
      {screen === 'SELECT' ? (
        <HomeDashboard
          overallStats={overallStats}
          onStartBattle={() => handleOpenBattleSetup()}
          onOpenGrowth={() => {
            refreshProgress();
            navigateToScreen('GROWTH_HUB');
          }}
          onOpenGacha={() => {
            refreshProgress();
            navigateToScreen('GACHA_HUB');
          }}
          onOpenRaid={() => {
            refreshProgress();
            setRaidReturnScreen('SELECT');
            setScreen('RAID_PROTOTYPE');
          }}
          skillProgress={skillProgress}
          raidRewardProgress={raidRewardProgress}
          recruitmentProgress={recruitmentProgress}
          onOpenDeveloperTools={handleOpenDeveloperTools}
          unlockedKaiserLevel={kaiserChallengeProgress.unlockedLevel}
          availableStatPoints={availableStatPoints}
          abilityProgress={abilityProgress}
        />
      ) : screen === 'GROWTH_HUB' ? (
        <GrowthHubScreen
          availableStatPoints={availableStatPoints}
          skillProgress={skillProgress}
          irenaTalentProgress={irenaTalentProgress}
          abilityProgress={abilityProgress}
          imprintProgress={imprintProgress}
          raidRewardProgress={raidRewardProgress}
          raidItemMessage={raidItemMessage}
          onOpenBattleSetup={() => handleOpenBattleSetup(undefined, 'GROWTH_HUB')}
          onOpenTalentBoard={() => handleOpenTalentBoard('GROWTH_HUB')}
          onUpgradeSkill={handleUpgradeSkill}
          onChooseSkillPath={handleChooseSkillPath}
          onUpgradeAbility={handleUpgradeAbility}
          onOpenRecruitment={() => handleOpenRecruitment('GROWTH_HUB')}
          onOpenImprints={() => handleOpenImprints('GROWTH_HUB')}
          onUseRaidCoreFragment={handleUseRaidCoreFragment}
        />
      ) : screen === 'IRENA_TALENTS' ? (
        <IrenaTalentBoard
          progress={irenaTalentProgress}
          message={irenaTalentMessage}
          onSpendPoint={handleSpendIrenaTalentPoint}
          onResetTalents={handleResetIrenaTalents}
          onBack={() => {
            setIrenaTalentMessage(null);
            refreshProgress();
            navigateToScreen(talentReturnScreen);
          }}
        />
      ) : screen === 'GACHA_HUB' ? (
        <GachaHubScreen
          imprintTickets={raidRewardProgress.imprintTickets}
          recruitmentTickets={recruitmentProgress.tickets}
          unlockedImprints={imprintProgress.unlockedIds.length}
          equippedImprints={imprintProgress.equippedIds.length}
          onOpenRecruitment={() => handleOpenRecruitment('GACHA_HUB')}
          onOpenImprintGacha={handleOpenImprintGacha}
          onOpenImprints={() => handleOpenImprints('GACHA_HUB')}
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
            navigateToScreen(imprintReturnScreen);
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
            navigateToScreen('GACHA_HUB');
          }}
        />
      ) : screen === 'BATTLE_SETUP' ? (
        <BattleSetupScreen
          playerCharacters={PLAYER_CHARACTERS}
          selectedPlayerCharacterId={getPlayerCharacterById(battleSetup.playerCharacterId).id}
          onSelectPlayerCharacter={playerCharacterId => setBattleSetup(prev => ({ ...prev, playerCharacterId }))}
          abilityProgress={abilityProgress}
          imprintProgress={imprintProgress}
          onApplySavedBuild={handleApplySavedBuild}
          availableStatPoints={availableStatPoints}
          unlockedKaiserLevel={kaiserChallengeProgress.unlockedLevel}
          initialConfig={battleSetup}
          selectedDifficulty={difficulty}
          onSelectDifficulty={setDifficulty}
          onBack={() => navigateToScreen(battleSetupReturnScreen)}
          onStartBattle={handleStartBattle}
        />
      ) : screen === 'BATTLE' ? (
        <BattleScreen
          state={battleState}
          onAction={onActionSelected}
          onBackToSelect={handleBackToSelect}
          onRestart={() => restartBattle(getPlayerCharacterForBattle(battleSetup.playerCharacterId), getBattleCpuOpponent(), difficulty, battleSetup)}
          skillProgress={skillProgress}
          onUpgradeSkill={handleUpgradeSkill}
          onChooseSkillPath={handleChooseSkillPath}
          onToggleSound={toggleSound}
          onToggleSpeed={toggleSpeed}
        />
      ) : screen === 'RAID_PROTOTYPE' ? (
        <RaidGame
          onBack={() => navigateToScreen(raidReturnScreen)}
          onRaidRewardProgressChange={setRaidRewardProgress}
        />
      ) : screen === 'RECRUITMENT' ? (
        <RecruitmentScreen
          progress={recruitmentProgress}
          abilityProgress={abilityProgress}
          onRecruit={handleRecruit}
          onUpgradeAbility={handleUpgradeAbility}
          onBack={() => navigateToScreen(recruitmentReturnScreen)}
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
          onOpenRecruitment={() => handleOpenRecruitment('GACHA_HUB')}
          onOpenBattleSetup={handleOpenBattleSetup}
          onReset={handleDeveloperReset}
        />
      )}
      {(screen === 'SELECT' || screen === 'GROWTH_HUB' || screen === 'GACHA_HUB') && (
        <BottomNavigation
          active={screen === 'SELECT' ? 'HOME' : screen === 'GROWTH_HUB' ? 'GROWTH' : 'GACHA'}
          onNavigate={(tab: MainTab) => {
            if (tab === 'HOME') {
              navigateToScreen('SELECT');
            } else if (tab === 'GROWTH') {
              refreshProgress();
              navigateToScreen('GROWTH_HUB');
            } else if (tab === 'GACHA') {
              refreshProgress();
              navigateToScreen('GACHA_HUB');
            } else if (tab === 'BATTLE') {
              handleOpenBattleSetup(undefined, screen === 'GROWTH_HUB' ? 'GROWTH_HUB' : 'SELECT');
            } else {
              refreshProgress();
              setRaidReturnScreen(screen);
              setScreen('RAID_PROTOTYPE');
            }
          }}
        />
      )}
      {isScreenTransitioning && (
        <ScreenTransitionLoader
          key={screenTransitionIndex}
          transitionIndex={screenTransitionIndex}
          waitFor={screenTransitionWaitFor}
          onComplete={handleScreenTransitionComplete}
        />
      )}
    </div>
  );
};
