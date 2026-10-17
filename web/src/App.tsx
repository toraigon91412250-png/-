import React, { useState, useEffect } from 'react';
import { AbilityId, AchievementBadgeId, BATTLE_CHALLENGE_LEVELS, BattleSetupConfig, CpuDifficulty, ImprintId, ResonanceAbilityId } from './types/game';
import { IRENA, STELLA, KAISER, CPU_CHARACTERS, PLAYER_CHARACTERS, getIrenaWithSkillProgress, getPlayerCharacterById } from './data/characters';
import { useBattleGame } from './hooks/useBattleGame';
import { HomeDashboard } from './components/HomeDashboard';
import { AchievementScreen } from './components/AchievementScreen';
import { GrowthHubScreen } from './components/GrowthHubScreen';
import { ResonanceScreen } from './components/ResonanceScreen';
import { IrenaTalentBoard } from './components/IrenaTalentBoard';
import { BattleScreen } from './components/BattleScreen';
import { BattleDeployOverlay } from './components/BattleDeployOverlay';
import { addAbilityShardsForDeveloper, addRecruitmentTicketsForDeveloper, chooseIrenaSkillPath, loadAbilityProgress, loadOverallStats, loadRaidRewardProgress, loadRecruitmentProgress, loadSkillProgress, performRecruitment, drawImprintGacha, redeemRaidCoreFragment, resetProgressForDeveloper, setAbilityForDeveloper, setAllAbilitiesForDeveloper, setRecruitmentTicketsForDeveloper, setImprintTicketsForDeveloper, addImprintTicketsForDeveloper, unlockAllImprintsForDeveloper, setSkillProgressForDeveloper, unlockSuperFallenShotForDeveloper, upgradeAbility, upgradeIrenaSkill, loadStatPoints, loadImprintProgress, equipImprint, unequipImprint, replaceEquippedImprints, claimKaiser100VictoryReward, claimStellaFinalBattleReward, enableDeveloperMode, loadStellaModeProgress, recordExKaiserVictory, unlockStellaMode, unlockAllGameFeaturesForDeveloper, loadAchievementProgress, recordAchievementBattleProgress, syncAchievementCompletion, claimAchievementReward, markAllAchievementsCompleteForDeveloper, resetAchievementProgressForDeveloper, setEquippedAchievementBadge, unlockAchievementUltimateAuthority, loadResonanceProgress, unlockAbilityResonance, combineResonanceAbility, upgradeResonanceAbility } from './utils/storage';
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
import { StellaWarpTransition } from './components/StellaWarpTransition';
import { StellaFinalBattleScreen } from './components/StellaFinalBattleScreen';
import type { MainTab } from './components/BottomNavigation';
import { normalizeStatAllocation } from './utils/statBuild';
import { preloadBattleImages, preloadRecruitmentImages } from './utils/imagePreload';
import { getSelectableKaiserLevels, loadKaiserChallengeProgress, recordKaiserChallengeResult, resetKaiserChallengeProgress } from './utils/kaiserChallengeProgress';
import { applyIrenaTalentModifiers, getIrenaLevel, loadIrenaTalentProgress, resetIrenaTalentRanks, spendIrenaTalentPoint } from './utils/irenaTalentSystem';
import type { IrenaTalentId } from './utils/irenaTalentSystem';
import { ACHIEVEMENT_DEFINITIONS, buildAchievementBadgeProgress, buildAchievementBoard } from './utils/achievementSystem';
import type { AchievementProgress } from './utils/achievementSystem';
import type { StellaModeProgress } from './utils/storage';

type AppScreen = 'SELECT' | 'GROWTH_HUB' | 'RESONANCE' | 'GACHA_HUB' | 'BATTLE_SETUP' | 'BATTLE' | 'STELLA_FINAL' | 'RAID_PROTOTYPE' | 'RECRUITMENT' | 'IMPRINTS' | 'IMPRINT_GACHA' | 'IRENA_TALENTS' | 'ACHIEVEMENTS' | 'DEV_TOOLS';
type BattleSetupMode = 'NORMAL' | 'EX_KAISER' | 'STELLA' | 'DEVELOPER';

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
  const [resonanceProgress, setResonanceProgress] = useState(() => loadResonanceProgress());
  const [resonanceMessage, setResonanceMessage] = useState<string | null>(null);
  const [kaiserChallengeProgress, setKaiserChallengeProgress] = useState(() => loadKaiserChallengeProgress());
  const [irenaTalentProgress, setIrenaTalentProgress] = useState(() => loadIrenaTalentProgress());
  const [irenaTalentMessage, setIrenaTalentMessage] = useState<string | null>(null);
  const [availableStatPoints, setAvailableStatPoints] = useState(() => loadStatPoints());
  const [raidRewardProgress, setRaidRewardProgress] = useState(() => loadRaidRewardProgress());
  const [imprintProgress, setImprintProgress] = useState(() => loadImprintProgress());
  const [raidItemMessage, setRaidItemMessage] = useState<string | null>(null);
  const [imprintMessage, setImprintMessage] = useState<string | null>(null);
  const [imprintGachaMessage, setImprintGachaMessage] = useState<string | null>(null);
  const [battleSetupReturnScreen, setBattleSetupReturnScreen] = useState<'SELECT' | 'GROWTH_HUB' | 'DEV_TOOLS'>('SELECT');
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
  const [allowAllKaiserLevelsInBattleSetup, setAllowAllKaiserLevelsInBattleSetup] = useState(false);
  const [stellaModeProgress, setStellaModeProgress] = useState<StellaModeProgress>(() => loadStellaModeProgress());
  const [isStellaWarping, setIsStellaWarping] = useState(false);
  const [stellaRewardSaveError, setStellaRewardSaveError] = useState(false);
  const [battleSetupMode, setBattleSetupMode] = useState<BattleSetupMode>('NORMAL');
  const [achievementProgress, setAchievementProgress] = useState<AchievementProgress>(() => loadAchievementProgress());
  const [achievementMessage, setAchievementMessage] = useState<string | null>(null);
  const [achievementBadgeMessage, setAchievementBadgeMessage] = useState<string | null>(null);

  const achievementBoard = buildAchievementBoard({
    progress: achievementProgress,
    snapshot: {
      overallStats,
      abilityProgress,
      skillProgress,
      imprintProgress,
      recruitmentProgress,
      raidRewardProgress,
      kaiserUnlockedLevel: kaiserChallengeProgress.unlockedLevel,
      kaiser100RewardClaimed: stellaModeProgress.kaiser100RewardClaimed,
      exKaiserDefeated: stellaModeProgress.exKaiserDefeated,
      finalBattleCleared: stellaModeProgress.finalBattleCleared,
      developerModeEnabled: stellaModeProgress.developerModeEnabled === true,
      talentLevel: getIrenaLevel(irenaTalentProgress.experience),
    },
  });
  const achievementCompletedCount = achievementBoard.filter(item => item.complete).length;
  const achievementClaimedCount = achievementBoard.filter(item => item.claimed).length;
  const achievementCompletionKey = achievementBoard.filter(item => item.complete).map(item => item.id).join('|');
  const achievementBadgeProgress = buildAchievementBadgeProgress(achievementProgress);
  const equippedAchievementBadge = achievementBadgeProgress.find(badge => badge.id === achievementProgress.equippedBadgeId && badge.tier > 0);

  useEffect(() => {
    const alreadyCompleted = new Set(achievementProgress.completedIds);
    const missingCompletedIds = achievementBoard.filter(item => item.complete && !alreadyCompleted.has(item.id)).map(item => item.id);
    if (missingCompletedIds.length > 0) {
      const nextProgress = syncAchievementCompletion(missingCompletedIds);
      if (nextProgress) setAchievementProgress(nextProgress);
    }
    const ultimateUnlock = unlockAchievementUltimateAuthority();
    if (ultimateUnlock.persisted && ultimateUnlock.progress.levels.ASTRAL_DOMINION !== abilityProgress.levels.ASTRAL_DOMINION) {
      setAbilityProgress(ultimateUnlock.progress);
    }
  }, [achievementCompletionKey, achievementProgress.completedIds.length, abilityProgress.levels.ASTRAL_DOMINION]);

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

    const completedLevel = battleState.battleConfig.kaiserLevel;
    const playerWon = battleState.winnerIsPlayer === true;
    const currentStellaProgress = loadStellaModeProgress();
    // EX battles launched directly from Developer Tools are combat-only tests until normal unlocks exist.
    // Do not create an artificial save-error message or advance the normal Kaiser challenge track.
    const isDeveloperOnlyExTest =
      battleState.battleConfig.kaiserChallengeMode === 'EX'
      && battleSetupReturnScreen === 'DEV_TOOLS'
      && (!currentStellaProgress.kaiser100RewardClaimed || !currentStellaProgress.stellaModeUnlocked);

    if (
      completedLevel === 50 &&
      playerWon &&
      (battleState.battleConfig.kaiserChallengeMode ?? 'NORMAL') === 'NORMAL' &&
      battleSetupReturnScreen !== 'DEV_TOOLS'
    ) {
      const unlock = unlockAbilityResonance();
      setResonanceProgress(unlock.progress);
      setResonanceMessage(unlock.persisted
        ? '通常カイザーLv.50撃破を確認。権能共鳴が解放されました。'
        : '解放状態を保存できませんでした。ブラウザの保存設定を確認してください。');
    }

    if (completedLevel === 100 && playerWon && !isDeveloperOnlyExTest) {
      const result = battleState.battleConfig.kaiserChallengeMode === 'EX'
        ? recordExKaiserVictory()
        : claimKaiser100VictoryReward();
      if (result.persisted) {
        setStellaModeProgress(result.progress);
        setStellaRewardSaveError(false);
      } else {
        setStellaRewardSaveError(true);
      }
    }

    setOverallStats(loadOverallStats());
    setSkillProgress(loadSkillProgress());
    setRecruitmentProgress(loadRecruitmentProgress());
    setAbilityProgress(loadAbilityProgress());
    setAvailableStatPoints(loadStatPoints());
    setIrenaTalentProgress(loadIrenaTalentProgress());
    if (battleSetupReturnScreen !== 'DEV_TOOLS') {
      const achievementOutcome = recordAchievementBattleProgress({
        playerWon,
        kaiserLevel: completedLevel,
        challengeMode: battleState.battleConfig.kaiserChallengeMode ?? 'NORMAL',
        turnNumber: battleState.turnNumber,
        playerHp: battleState.player.currentHp,
        playerMaxHp: battleState.player.character.maxHp,
        actionsTaken: battleState.playerActionsTaken ?? [],
        abilities: battleState.battleConfig.abilities,
        equippedImprints: battleState.battleConfig.imprints ?? [],
        usedImprints: battleState.usedImprints,
        logLines: battleState.logs.map(log => log.text),
        difficulty: battleState.cpuDifficulty,
      });
      if (achievementOutcome) setAchievementProgress(achievementOutcome);
    }

    const nextChallengeProgress = isDeveloperOnlyExTest
      ? loadKaiserChallengeProgress()
      : recordKaiserChallengeResult(completedLevel, playerWon);
    setKaiserChallengeProgress(nextChallengeProgress);
    setBattleSetup(prev => ({
      ...prev,
      kaiserLevel: playerWon ? nextChallengeProgress.unlockedLevel : completedLevel,
    }));
  }, [battleState.phase]);

  const refreshProgress = () => {
    setRaidRewardProgress(loadRaidRewardProgress());
    setStellaModeProgress(loadStellaModeProgress());
    setKaiserChallengeProgress(loadKaiserChallengeProgress());
    setIrenaTalentProgress(loadIrenaTalentProgress());
    const currentImprintProgress = loadImprintProgress();
    setImprintProgress(currentImprintProgress);
    setOverallStats(loadOverallStats());
    setSkillProgress(loadSkillProgress());
    setRecruitmentProgress(loadRecruitmentProgress());
    setAbilityProgress(loadAbilityProgress());
    setResonanceProgress(loadResonanceProgress());
    const nextAchievementProgress = loadAchievementProgress();
    setAchievementProgress(nextAchievementProgress);
    const nextEquippedBadge = buildAchievementBadgeProgress(nextAchievementProgress).find(badge => badge.id === nextAchievementProgress.equippedBadgeId && badge.tier > 0);
    const currentStatPoints = loadStatPoints();
    setAvailableStatPoints(currentStatPoints);
    setBattleSetup(prev => ({
      ...prev,
      statPointTotal: currentStatPoints,
      imprints: currentImprintProgress.equippedIds,
      achievementBadgeId: nextEquippedBadge?.id ?? null,
      achievementBadgeLevel: nextEquippedBadge?.tier ?? 0,
    }));
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

  const handleOpenBattleSetup = (
    prefill?: BattleSetupConfig,
    returnTo: 'SELECT' | 'GROWTH_HUB' | 'DEV_TOOLS' = 'SELECT',
    allowAllKaiserLevels = false,
    mode: BattleSetupMode = returnTo === 'DEV_TOOLS' ? 'DEVELOPER' : 'NORMAL',
  ) => {
    setBattleSetupReturnScreen(returnTo);
    setBattleSetupMode(mode);
    refreshProgress();
    const currentStatPoints = loadStatPoints();
    const currentImprintProgress = loadImprintProgress();
    const currentAchievementProgress = loadAchievementProgress();
    setAchievementProgress(currentAchievementProgress);
    const currentEquippedBadge = buildAchievementBadgeProgress(currentAchievementProgress).find(badge => badge.id === currentAchievementProgress.equippedBadgeId && badge.tier > 0);
    setAchievementBadgeMessage(null);
    const currentKaiserProgress = loadKaiserChallengeProgress();
    const currentStellaProgress = loadStellaModeProgress();
    const shouldAllowAllKaiserLevels = allowAllKaiserLevels
      || currentStellaProgress.allGameFeaturesUnlocked === true;
    setAllowAllKaiserLevelsInBattleSetup(shouldAllowAllKaiserLevels);
    const selectableKaiserLevels = mode === 'EX_KAISER'
      ? BATTLE_CHALLENGE_LEVELS.filter(level => level === 100)
      : shouldAllowAllKaiserLevels
        ? BATTLE_CHALLENGE_LEVELS
        : getSelectableKaiserLevels(currentKaiserProgress.unlockedLevel);
    setKaiserChallengeProgress(currentKaiserProgress);
    setImprintProgress(currentImprintProgress);
    setAvailableStatPoints(currentStatPoints);
    const requestedPlayerCharacterId = mode === 'STELLA'
      ? STELLA.id
      : mode === 'NORMAL' || mode === 'EX_KAISER'
        ? IRENA.id
        : getPlayerCharacterById(prefill?.playerCharacterId ?? battleSetup.playerCharacterId).id;
    const safePlayerCharacterId = mode === 'DEVELOPER'
      && requestedPlayerCharacterId === STELLA.id
      && !currentStellaProgress.stellaModeUnlocked
        ? IRENA.id
        : requestedPlayerCharacterId;
    const keepStellaAbilities = (abilities: BattleSetupConfig['abilities']) =>
      abilities.filter(ability => ability.id === 'ABYSS' || ability.id === 'JUDGMENT');

    if (prefill) {
      setBattleSetup({
        ...prefill,
        playerCharacterId: safePlayerCharacterId,
        abilities: mode === 'STELLA' ? keepStellaAbilities(prefill.abilities) : prefill.abilities,
        kaiserLevel: mode === 'EX_KAISER' ? 100 : selectableKaiserLevels.includes(prefill.kaiserLevel) ? prefill.kaiserLevel : currentKaiserProgress.unlockedLevel,
        statPointTotal: currentStatPoints,
        imprints: currentImprintProgress.equippedIds,
        achievementBadgeId: currentEquippedBadge?.id ?? null,
        achievementBadgeLevel: currentEquippedBadge?.tier ?? 0,
      });
    } else {
      setBattleSetup(prev => ({
        ...prev,
        playerCharacterId: mode === 'DEVELOPER'
          ? safePlayerCharacterId
          : requestedPlayerCharacterId,
        abilities: mode === 'STELLA' ? keepStellaAbilities(prev.abilities) : prev.abilities,
        kaiserLevel: mode === 'EX_KAISER' ? 100 : selectableKaiserLevels.includes(prev.kaiserLevel) ? prev.kaiserLevel : currentKaiserProgress.unlockedLevel,
        statPointTotal: currentStatPoints,
        imprints: currentImprintProgress.equippedIds,
        achievementBadgeId: currentEquippedBadge?.id ?? null,
        achievementBadgeLevel: currentEquippedBadge?.tier ?? 0,
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
    const activation = enableDeveloperMode();
    if (!activation.persisted) {
      window.alert('開発者モードを保存できませんでした。ブラウザの保存設定を確認してください。');
      return;
    }
    setStellaModeProgress(activation.progress);
    refreshProgress();
    setScreen('DEV_TOOLS');
  };

  const handleRevealStella = () => {
    const progress = loadStellaModeProgress();
    setStellaModeProgress(progress);
    if (progress.revealAvailable && !progress.isUnlocked) setIsStellaWarping(true);
  };

  const handleCompleteStellaReveal = (): boolean => {
    const result = unlockStellaMode();
    if (!result.persisted) return false;
    setStellaModeProgress(result.progress);
    setStellaRewardSaveError(false);
    setIsStellaWarping(false);
    setBattleSetupMode('NORMAL');
    return true;
  };

  const handleClaimStellaFinalBattleReward = React.useCallback(() => {
    const result = claimStellaFinalBattleReward(true);
    if (result.persisted) {
      setStellaModeProgress(result.progress);
      setStellaRewardSaveError(false);
      const currentStatPoints = loadStatPoints();
      setAvailableStatPoints(currentStatPoints);
      setBattleSetup(prev => ({ ...prev, statPointTotal: currentStatPoints }));
    } else {
      setStellaRewardSaveError(true);
    }
    return result;
  }, []);

  const handleOpenStellaMode = () => {
    const progress = loadStellaModeProgress();
    setStellaModeProgress(progress);
    if (!progress.stellaModeUnlocked) return;
    handleOpenBattleSetup(undefined, 'SELECT', false, 'STELLA');
  };

  const handleOpenStellaFinalBattle = () => {
    const progress = loadStellaModeProgress();
    setStellaModeProgress(progress);
    if (!progress.isUnlocked || !progress.exKaiserDefeated) return;
    cancelBattle();
    setBattleSetupMode('NORMAL');
    setScreen('STELLA_FINAL');
  };

  const handleStartExKaiser = (returnTo: 'SELECT' | 'DEV_TOOLS' = 'SELECT', bypassUnlockRequirements = false) => {
    const progress = loadStellaModeProgress();
    // Keep the normal Home route progression-gated; Developer Tools can bypass the gate for testing.
    if (!bypassUnlockRequirements && (!progress.stellaModeUnlocked || (!progress.kaiser100RewardClaimed && !progress.exKaiserDefeated))) return;
    const currentStatPoints = loadStatPoints();
    const currentImprintProgress = loadImprintProgress();
    handleOpenBattleSetup({
      ...battleSetup,
      playerCharacterId: IRENA.id,
      kaiserLevel: 100,
      kaiserChallengeMode: 'EX',
      statAllocation: normalizeStatAllocation(battleSetup.statAllocation, currentStatPoints),
      statPointTotal: currentStatPoints,
      imprints: currentImprintProgress.equippedIds,
    }, returnTo, false, 'EX_KAISER');
  };

  const getBattleCpuOpponent = () =>
    CPU_CHARACTERS.find(character => character.id === KAISER.id)
    ?? CPU_CHARACTERS[0]
    ?? KAISER;

  const handleStartBattle = (config: BattleSetupConfig) => {
    const latestAchievementProgress = loadAchievementProgress();
    const selectedBadge = buildAchievementBadgeProgress(latestAchievementProgress).find(badge => badge.id === config.achievementBadgeId && badge.tier > 0);
    const safePlayerCharacterId = config.playerCharacterId === STELLA.id
      && !loadStellaModeProgress().stellaModeUnlocked
        ? IRENA.id
        : config.playerCharacterId;
    const battleConfigWithImprints: BattleSetupConfig = {
      ...config,
      playerCharacterId: safePlayerCharacterId,
      kaiserChallengeMode: battleSetupMode === 'EX_KAISER' ? 'EX' : 'NORMAL',
      imprints: [...(config.imprints ?? imprintProgress.equippedIds)],
      achievementBadgeId: selectedBadge?.id ?? null,
      achievementBadgeLevel: selectedBadge?.tier ?? 0,
    };
    setAchievementProgress(latestAchievementProgress);
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

  const handleClaimAchievementReward = (id: string) => {
    const selectedAchievement = achievementBoard.find(item => item.id === id);
    if (selectedAchievement?.complete) {
      const synced = syncAchievementCompletion([id]);
      if (synced) setAchievementProgress(synced);
    }
    const result = claimAchievementReward(id);
    if (!result.persisted) {
      setAchievementMessage('報酬の保存に失敗しました。保存容量・ブラウザ設定を確認してください。');
      return;
    }
    setAchievementProgress(result.progress);
    if (!result.claimed) {
      setAchievementMessage('この実績は未達成か、報酬をすでに受け取っています。');
      return;
    }
    const rewardName = achievementBoard.find(item => item.id === id)?.rewardLabel ?? '報酬';
    setAchievementMessage('報酬を受け取りました：' + rewardName);
    const currentStatPoints = loadStatPoints();
    setAvailableStatPoints(currentStatPoints);
    setBattleSetup(prev => ({ ...prev, statPointTotal: currentStatPoints }));
    setRecruitmentProgress(loadRecruitmentProgress());
    setRaidRewardProgress(loadRaidRewardProgress());
    setSkillProgress(loadSkillProgress());
  };

  const handleSelectAchievementBadge = (id: AchievementBadgeId | null) => {
    const next = setEquippedAchievementBadge(id);
    if (!next) {
      setAchievementBadgeMessage('このバッジは未獲得か、装備状態を保存できませんでした。');
      return;
    }
    const nextEquippedBadge = buildAchievementBadgeProgress(next).find(badge => badge.id === id && badge.tier > 0);
    setAchievementProgress(next);
    setBattleSetup(prev => ({
      ...prev,
      achievementBadgeId: nextEquippedBadge?.id ?? null,
      achievementBadgeLevel: nextEquippedBadge?.tier ?? 0,
    }));
    setAchievementBadgeMessage(id === null
      ? '実績バッジを外しました。'
      : `${nextEquippedBadge?.name ?? '実績バッジ'}を装備しました。`);
  };

  const handleMarkAllAchievementsComplete = () => {
    const next = markAllAchievementsCompleteForDeveloper();
    if (!next) {
      setAchievementMessage('実績状態を保存できませんでした。');
      return;
    }
    setAchievementProgress(next);
    setAchievementMessage('開発テスト用に全実績を達成扱いにしました。最強権能の解放条件を確認できます。');
  };

  const handleResetAchievementProgress = () => {
    const next = resetAchievementProgressForDeveloper();
    if (!next) {
      setAchievementMessage('実績状態を初期化できませんでした。');
      return;
    }
    setAchievementProgress(next);
    setAbilityProgress(loadAbilityProgress());
    setBattleSetup(prev => ({ ...prev, achievementBadgeId: null, achievementBadgeLevel: 0 }));
    setAchievementBadgeMessage(null);
    setAchievementMessage('実績の進捗・受取履歴と最強権能を初期化しました。');
  };

  const handleUpgradeAbility = (abilityId: AbilityId) => {
    const next = upgradeAbility(abilityId);
    if (!next) return;
    setAbilityProgress(next);
    setBattleSetup(prev => ({
      ...prev,
      abilities: prev.abilities.map(ability => ({
        ...ability,
        level: ability.id in next.levels
          ? next.levels[ability.id as AbilityId]
          : next.resonance?.levels[ability.id as ResonanceAbilityId] ?? ability.level,
      })),
    }));
  };

  const handleOpenResonance = () => {
    setAbilityProgress(loadAbilityProgress());
    setResonanceProgress(loadResonanceProgress());
    setResonanceMessage(null);
    setScreen('RESONANCE');
  };

  const handleCombineResonance = (id: ResonanceAbilityId) => {
    const result = combineResonanceAbility(id);
    setAbilityProgress(result.progress);
    setResonanceProgress(result.resonance);
    setResonanceMessage(result.message);
    if (!result.success) return;
    setBattleSetup(prev => ({
      ...prev,
      abilities: prev.abilities.filter(ability => (
        ability.id in result.progress.levels
          ? result.progress.levels[ability.id as AbilityId] > 0
          : (result.resonance.levels[ability.id as ResonanceAbilityId] ?? 0) > 0
      )),
    }));
  };

  const handleUpgradeResonance = (id: ResonanceAbilityId) => {
    const result = upgradeResonanceAbility(id);
    setAbilityProgress(result.progress);
    setResonanceProgress(result.resonance);
    setResonanceMessage(result.message);
    if (!result.success) return;
    setBattleSetup(prev => ({
      ...prev,
      abilities: prev.abilities.map(ability => ({
        ...ability,
        level: ability.id in result.progress.levels
          ? result.progress.levels[ability.id as AbilityId]
          : result.resonance.levels[ability.id as ResonanceAbilityId] ?? ability.level,
      })),
    }));
  };

  const handleBackToSelect = () => {
    const wasStellaMode = battleSetupMode === 'STELLA';
    const wasExKaiser = battleSetupMode === 'EX_KAISER';
    cancelBattle();
    refreshProgress();
    setBattleSetupMode('NORMAL');
    if (wasStellaMode || wasExKaiser) {
      setBattleSetup(prev => ({
        ...prev,
        playerCharacterId: IRENA.id,
        kaiserChallengeMode: 'NORMAL',
      }));
    }
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

  const handleDeveloperUnlockSuperFallenShot = () => {
    setSkillProgress(unlockSuperFallenShotForDeveloper());
  };

  const handleUnlockAllGameFeatures = (): boolean => {
    const result = unlockAllGameFeaturesForDeveloper();
    if (!result.persisted) return false;
    setStellaModeProgress(result.progress);
    refreshProgress();
    return true;
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
    setStellaModeProgress(loadStellaModeProgress());
    setAchievementProgress(loadAchievementProgress());
    setAchievementMessage(null);
    setStellaRewardSaveError(false);
    setBattleSetupMode('NORMAL');
    setBattleSetup({
      kaiserLevel: 10,
      playerCharacterId: getPlayerCharacterById(battleSetup.playerCharacterId).id,
      abilities: [],
      statAllocation: normalizeStatAllocation(),
      statPointTotal: loadStatPoints(),
      achievementBadgeId: null,
      achievementBadgeLevel: 0,
    });
    setScreen('SELECT');
  };

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {isBattleDeploying && <BattleDeployOverlay />}
      {screen === 'SELECT' ? (
        <HomeDashboard
          overallStats={overallStats}
          onStartBattle={() => handleOpenBattleSetup(undefined, 'SELECT', false, 'NORMAL')}
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
          onOpenAchievements={() => { setAchievementMessage(null); refreshProgress(); navigateToScreen('ACHIEVEMENTS'); }}
          achievementCompletedCount={achievementCompletedCount}
          achievementTotalCount={ACHIEVEMENT_DEFINITIONS.length}
          astralDominionUnlocked={abilityProgress.levels.ASTRAL_DOMINION > 0}
          unlockedKaiserLevel={kaiserChallengeProgress.unlockedLevel}
          availableStatPoints={availableStatPoints}
          abilityProgress={abilityProgress}
          stellaUnlockAvailable={stellaModeProgress.revealAvailable}
          stellaModeUnlocked={stellaModeProgress.stellaModeUnlocked}
          stellaFinalBattleUnlocked={stellaModeProgress.isUnlocked && stellaModeProgress.exKaiserDefeated}
          exKaiserChallengeAvailable={stellaModeProgress.kaiser100RewardClaimed && stellaModeProgress.stellaModeUnlocked && !stellaModeProgress.exKaiserDefeated}
          exKaiserReplayAvailable={stellaModeProgress.stellaModeUnlocked && stellaModeProgress.exKaiserDefeated}
          stellaRewardSaveError={stellaRewardSaveError}
          onRevealStella={handleRevealStella}
          onStartExKaiser={handleStartExKaiser}
          onOpenStellaMode={handleOpenStellaMode}
          onOpenStellaFinalBattle={handleOpenStellaFinalBattle}
        />
      ) : screen === 'GROWTH_HUB' ? (
        <GrowthHubScreen
          availableStatPoints={availableStatPoints}
          skillProgress={skillProgress}
          irenaTalentProgress={irenaTalentProgress}
          abilityProgress={abilityProgress}
          resonanceProgress={resonanceProgress}
          imprintProgress={imprintProgress}
          raidRewardProgress={raidRewardProgress}
          raidItemMessage={raidItemMessage}
          onOpenBattleSetup={() => handleOpenBattleSetup(undefined, 'GROWTH_HUB')}
          onOpenTalentBoard={() => handleOpenTalentBoard('GROWTH_HUB')}
          onUpgradeSkill={handleUpgradeSkill}
          onChooseSkillPath={handleChooseSkillPath}
          onUpgradeAbility={handleUpgradeAbility}
          onOpenResonance={handleOpenResonance}
          onOpenRecruitment={() => handleOpenRecruitment('GROWTH_HUB')}
          onOpenImprints={() => handleOpenImprints('GROWTH_HUB')}
          onUseRaidCoreFragment={handleUseRaidCoreFragment}
        />
      ) : screen === 'RESONANCE' ? (
        <ResonanceScreen
          abilityProgress={abilityProgress}
          resonanceProgress={resonanceProgress}
          message={resonanceMessage}
          onCombine={handleCombineResonance}
          onUpgrade={handleUpgradeResonance}
          onBack={() => {
            setAbilityProgress(loadAbilityProgress());
            setResonanceProgress(loadResonanceProgress());
            setResonanceMessage(null);
            setScreen('GROWTH_HUB');
          }}
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
          playerCharacters={battleSetupMode === 'STELLA'
            ? [STELLA]
            : battleSetupMode === 'DEVELOPER'
              ? PLAYER_CHARACTERS.filter(character => character.id !== STELLA.id || stellaModeProgress.stellaModeUnlocked)
              : [IRENA]}
          selectedPlayerCharacterId={battleSetupMode === 'STELLA'
            ? STELLA.id
            : getPlayerCharacterById(battleSetup.playerCharacterId).id}
          onSelectPlayerCharacter={playerCharacterId => {
            if (playerCharacterId === STELLA.id && !loadStellaModeProgress().stellaModeUnlocked) return;
            setBattleSetup(prev => ({ ...prev, playerCharacterId }));
          }}
          abilityProgress={abilityProgress}
          imprintProgress={imprintProgress}
          achievementBadges={achievementBadgeProgress}
          equippedAchievementBadgeId={equippedAchievementBadge?.id ?? null}
          achievementBadgeMessage={achievementBadgeMessage}
          onSelectAchievementBadge={handleSelectAchievementBadge}
          onApplySavedBuild={handleApplySavedBuild}
          availableStatPoints={availableStatPoints}
          unlockedKaiserLevel={kaiserChallengeProgress.unlockedLevel}
          allowAllKaiserLevels={allowAllKaiserLevelsInBattleSetup}
          isExKaiserChallenge={battleSetupMode === 'EX_KAISER'}
          initialConfig={battleSetup}
          selectedDifficulty={difficulty}
          onSelectDifficulty={setDifficulty}
          onBack={() => {
            if (battleSetupMode === 'STELLA' || battleSetupMode === 'EX_KAISER') {
              setBattleSetupMode('NORMAL');
              setBattleSetup(prev => ({
                ...prev,
                playerCharacterId: IRENA.id,
                kaiserChallengeMode: 'NORMAL',
              }));
            }
            navigateToScreen(battleSetupReturnScreen);
          }}
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
      ) : screen === 'STELLA_FINAL' ? (
        <StellaFinalBattleScreen
          progress={stellaModeProgress}
          isDeveloperPreview={false}
          onClaimVictoryReward={handleClaimStellaFinalBattleReward}
          onBackHome={() => {
            cancelBattle();
            refreshProgress();
            setScreen('SELECT');
            setBattleSetupMode('NORMAL');
          }}
        />
      ) : screen === 'ACHIEVEMENTS' ? (
        <AchievementScreen
          items={achievementBoard}
          completedCount={achievementCompletedCount}
          claimedCount={achievementClaimedCount}
          astralDominionUnlocked={abilityProgress.levels.ASTRAL_DOMINION > 0}
          badgeProgress={achievementBadgeProgress}
          message={achievementMessage}
          onClaimReward={handleClaimAchievementReward}
          onBack={() => { setAchievementMessage(null); setScreen('SELECT'); }}
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
          onUnlockSuperFallenShot={handleDeveloperUnlockSuperFallenShot}
          onOpenRecruitment={() => handleOpenRecruitment('GACHA_HUB')}
          onOpenBattleSetup={config => handleOpenBattleSetup(config, 'DEV_TOOLS', true, 'DEVELOPER')}
          onOpenExKaiserChallenge={() => handleStartExKaiser('DEV_TOOLS', true)}
          onUnlockAllGameFeatures={handleUnlockAllGameFeatures}
          achievementCompletedCount={achievementCompletedCount}
          achievementClaimedCount={achievementClaimedCount}
          achievementTotalCount={ACHIEVEMENT_DEFINITIONS.length}
          onMarkAllAchievementsComplete={handleMarkAllAchievementsComplete}
          onResetAchievementProgress={handleResetAchievementProgress}
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
          waitFor={screenTransitionWaitFor}
          onComplete={handleScreenTransitionComplete}
        />
      )}
      {isStellaWarping && <StellaWarpTransition onComplete={handleCompleteStellaReveal} />}
    </div>
  );
};
