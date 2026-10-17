import { useState, useRef, useCallback, useEffect } from 'react';
import {
  BattleAction,
  BattleChallengeLevel,
  BattleFighter,
  BattleLog,
  BattleSetupConfig,
  BattleUiState,
  CharacterDef,
  CpuDifficulty,
  EffectType,
  getEffectiveSpeed,
  getIrenaFeatherMaxChargeCount,
  rollIrenaFeatherChargeGain,
  getIrenaSuperFallenShotMultiplier,
  IRENA_SUPER_FALLEN_SHOT_COOLDOWN,
  IrenaSpecialSkillId,
  PlayerBattleAction,
  ResonanceAbilityId,
  STATUS_AILMENTS,
  LogType,
  StatusAilmentType,
} from '../types/game';
import { CpuAi } from '../utils/ai';
import { GAME_BALANCE } from '../data/gameBalance';
import { calculateNormalAttackDamage, calculateSpecialDamage, calculateUltimateDamage } from '../utils/battleMath';
import { getEquippedResonanceAbilities } from '../utils/resonanceSystem';
import { getFeatherErosionRate, getFallenGodRevivalHpFraction, getFallenGodStatMultiplier, getKingWingStackValues, getKingZoneValues, getResonanceExecutionStats, getResonanceSurvivalLimit, getTurnErosionRate, type WeaknessKey } from '../utils/resonanceSystem';
import { soundManager } from '../utils/audio';
import { getBattleReward, PATH_MASTERY_REWARD, saveBattleResult } from '../utils/storage';
import { normalizeStatAllocation } from '../utils/statBuild';
import {
  advanceKaiserChallengeRound,
  initializeKaiserChallengeFighter,
  resolveKaiserHit,
} from '../utils/kaiserChallenge';
import {
  BLOOD_MEDIA_EXTRA_BLEED_TURNS,
  COSTLY_SHOT_HP_COST,
  FEATHER_SPLIT_ALTERNATION_BONUS,
  FEATHER_SPLIT_PIERCE_COOLDOWN,
  FEATHER_SPLIT_RAPID_COOLDOWN,
  getFeatherSplitModeForSkill,
  getSpecialCooldownRemaining,
  getBloodTearBurstDamage,
  getTurnExecutionPlan,
  getWindGuardCounterDamage,
  normalizeEquippedImprints,
  resolveWindGuardDamage,
  resolveYinYangDefense,
  shouldSuppressCpuBuffAction,
  shouldTriggerForesight,
} from '../utils/imprintSystem';
import {
  applyDynamicAbilityModifiers,
  applyPassiveDamageReduction,
  createBattleCharacters,
  getAbilityLevel,
  getJudgmentDamageMultiplier,
  getJudgmentThreshold,
  hasAbility,
  normalizeEquippedAbilities,
} from '../utils/abilitySystem';

export function createInitialFighter(
  character: CharacterDef,
  isPlayer: boolean,
  kaiserLevel: BattleChallengeLevel = 10,
): BattleFighter {
  const fighter: BattleFighter = {
    character,
    currentHp: character.maxHp,
    specialCooldownRemaining: 0,
    ultimateGauge: 0,
    isBuffed: false,
    buffDamageBonus: 0,
    featherChargeBonus: 0,
    featherChargeCount: 0,
    featherPierceCooldownRemaining: 0,
    featherRapidCooldownRemaining: 0,
    lastFeatherSplitMode: null,
    isSuperFallenShotCharging: false,
    isEvading: false,
    isPlayer,
    activeAilments: [],
    resonanceBaseStats: {
      maxHp: character.maxHp,
      attack: character.attack,
      defense: character.defense,
      speed: character.speed,
      specialSkillDamage: character.specialSkillDamage,
      ultimateSkillDamage: character.ultimateSkillDamage,
    },
    resonanceWeakness: { attack: 0, defense: 0, speed: 0, specialSkillDamage: 0, ultimateSkillDamage: 0 },
    resonanceWeaknessStages: { attack: 0, defense: 0, speed: 0, specialSkillDamage: 0, ultimateSkillDamage: 0 },
    resonanceKingZoneStacks: 0,
    resonanceKingZoneThreshold: 0,
    resonanceRevivalCount: 0,
    resonanceGodObservedHpStage: 0,
    resonanceJudgmentMarks: 0,
    resonanceJudgmentReady: false,
    resonanceKingWingStackExpiresAtTurns: [],
    resonanceKingWingStacks: 0,
  };
  return initializeKaiserChallengeFighter(fighter, kaiserLevel);
}

export function useBattleGame(
  initialPlayerChar: CharacterDef,
  initialEnemyChar: CharacterDef,
  initialDifficulty: CpuDifficulty,
  initialBattleConfig: BattleSetupConfig = { kaiserLevel: 10, abilities: [] },
) {
  const normalizedInitialConfig: BattleSetupConfig = {
    kaiserLevel: initialBattleConfig.kaiserLevel,
    kaiserChallengeMode: initialBattleConfig.kaiserChallengeMode ?? 'NORMAL',
    playerCharacterId: initialBattleConfig.playerCharacterId ?? initialPlayerChar.id,
    abilities: normalizeEquippedAbilities(initialBattleConfig.abilities),
    imprints: normalizeEquippedImprints(initialBattleConfig.imprints),
    achievementBadgeId: initialBattleConfig.achievementBadgeId ?? null,
    achievementBadgeLevel: initialBattleConfig.achievementBadgeLevel ?? 0,
    statPointTotal: Math.max(0, Math.floor(initialBattleConfig.statPointTotal ?? 12)),
    statAllocation: normalizeStatAllocation(
      initialBattleConfig.statAllocation,
      initialBattleConfig.statPointTotal ?? 12,
    ),
  };

  const [state, setState] = useState<BattleUiState>(() => {
    const initialCharacters = createBattleCharacters(initialPlayerChar, initialEnemyChar, normalizedInitialConfig);
    const initialPlayer = createInitialFighter(initialCharacters.player, true);
    const initialEnemy = createInitialFighter(initialCharacters.enemy, false, normalizedInitialConfig.kaiserLevel);
    const initialCpuIntent = CpuAi.decideAction(initialEnemy, initialPlayer, initialDifficulty, {
      kaiserLevel: normalizedInitialConfig.kaiserLevel,
    });

    return {
    turnNumber: 1,
    player: initialPlayer,
    enemy: initialEnemy,
    logs: [
      {
        id: 1,
        turn: 1,
        text: `⚔️ バトル開始！ ${initialPlayerChar.name} (あなた) VS ${initialEnemyChar.name} Lv.${normalizedInitialConfig.kaiserLevel} (CPU)`,
        type: 'SYSTEM',
        timestamp: Date.now(),
      },
    ],
    phase: 'SELECT_ACTION',
    visualEffect: null,
    visualEffects: [],
    judgmentReady: false,
    winnerIsPlayer: null,
    cpuDifficulty: initialDifficulty,
    cpuIntent: initialCpuIntent,
    playerActionsTaken: [],
    usedImprints: [],
    yinYangActivatedTurn: null,
    yinYangDefenseResult: null,
    windGuardResult: null,
    bloodMediaHealResult: null,
    costlyShotResult: null,
    battleSpeedMultiplier: 1.0,
    isSoundEnabled: true,
    isAnimating: false,
    lastBattleReward: 0,
    lastBattleMasteryReward: 0,
    battleConfig: normalizedInitialConfig,
    };
  });

  const stateRef = useRef(state);
  stateRef.current = state;

  const updateState = useCallback((updater: (prev: BattleUiState) => BattleUiState) => {
    setState(prev => {
      const next = updater(prev);
      const previousEffects = prev.visualEffects ?? [];
      let visualEffects = previousEffects;

      const nextVisualEffect = next.visualEffect;
      if (nextVisualEffect) {
        const alreadyTracked = previousEffects.some(effect => effect.effectId === nextVisualEffect.effectId);
        visualEffects = alreadyTracked
          ? previousEffects.map(effect => effect.effectId === nextVisualEffect.effectId ? nextVisualEffect : effect)
          : [...previousEffects, nextVisualEffect];
      } else if (prev.visualEffect) {
        visualEffects = previousEffects.filter(effect => effect.effectId !== prev.visualEffect?.effectId);
      }

      const normalizedNext: BattleUiState = {
        ...next,
        visualEffects,
      };
      stateRef.current = normalizedNext;
      return normalizedNext;
    });
  }, []);

  const nextLogId = useRef(2);
  const nextVisualEffectId = useRef(0);
  const battleRunIdRef = useRef(0);
  const pendingSleepCancellersRef = useRef(new Map<number, () => void>());

  const cancelPendingBattleWork = useCallback(() => {
    battleRunIdRef.current += 1;
    for (const cancel of pendingSleepCancellersRef.current.values()) {
      cancel();
    }
    pendingSleepCancellersRef.current.clear();
  }, []);

  const isBattleCancelled = (error: unknown): boolean =>
    error instanceof Error && error.message === 'BATTLE_CANCELLED';

  useEffect(() => () => {
    cancelPendingBattleWork();
  }, [cancelPendingBattleWork]);
  const recentPlayerActionsRef = useRef<BattleAction[]>([]);
  const recentCpuActionsRef = useRef<BattleAction[]>([]);
  // Track the chosen command explicitly so combat effects do not depend only on a React state render timing.
  const playerEvadeSelectedRef = useRef(false);
  // Snapshot Foresight eligibility when the player commits to evade against the displayed CPU telegraph.
  const foresightTriggerPendingRef = useRef(false);
  // Defensive half of Yin-Yang Conversion; scoped to the current round and set before turn order resolves.
  const yinYangDefensePendingRef = useRef(false);
  const judgmentMarksRef = useRef(0);
  const judgmentReadyRef = useRef(false);
  const fallenKingSurvivalCountRef = useRef(0);
  const fallenGodRevivalCountRef = useRef(0);
  const resonanceKingSurvivalCountRef = useRef<Partial<Record<ResonanceAbilityId, number>>>({});
  const resonanceKingWingStackExpiresAtRef = useRef<number[]>([]);
  const resonanceJudgmentMarksRef = useRef<Partial<Record<ResonanceAbilityId, number>>>({});
  const resonanceJudgmentReadyRef = useRef<ResonanceAbilityId[]>([]);
  const lastStandUsedRef = useRef(false);
  const fallenReleaseLoggedRef = useRef(false);
  const masteryClaimedRef = useRef<Set<string>>(new Set());
  const battleMasteryRewardRef = useRef(0);


  const addLog = useCallback((text: string, type: LogType, turn: number) => {
    const newLog: BattleLog = {
      id: nextLogId.current++,
      turn,
      text,
      type,
      timestamp: Date.now(),
    };
    updateState(prev => ({
      ...prev,
      logs: [...prev.logs, newLog],
    }));
  }, [updateState]);

  const claimPathMasteryReward = useCallback((masteryId: string, masteryName: string, turn: number) => {
    if (masteryClaimedRef.current.has(masteryId)) return;
    masteryClaimedRef.current.add(masteryId);
    battleMasteryRewardRef.current += PATH_MASTERY_REWARD;
    addLog(
      `✦【戦術達成】${masteryName}を活かした！ 黒羽の欠片 +${PATH_MASTERY_REWARD}`,
      'GAUGE_CHANGE',
      turn
    );
  }, [addLog]);

  const sleep = useCallback((ms: number) => {
    const runId = battleRunIdRef.current;
    return new Promise<void>((resolve, reject) => {
      let timerId = 0;
      const cancel = () => {
        window.clearTimeout(timerId);
        pendingSleepCancellersRef.current.delete(timerId);
        reject(new Error('BATTLE_CANCELLED'));
      };

      timerId = window.setTimeout(() => {
        pendingSleepCancellersRef.current.delete(timerId);
        if (runId !== battleRunIdRef.current) {
          reject(new Error('BATTLE_CANCELLED'));
        } else {
          resolve();
        }
      }, Math.max(0, ms));

      pendingSleepCancellersRef.current.set(timerId, cancel);
    });
  }, []);

  const toggleSound = useCallback(() => {
    updateState(prev => {
      const nextVal = !prev.isSoundEnabled;
      soundManager.setEnabled(nextVal);
      return { ...prev, isSoundEnabled: nextVal };
    });
  }, [updateState]);

  const toggleSpeed = useCallback(() => {
    updateState(prev => ({
      ...prev,
      battleSpeedMultiplier: prev.battleSpeedMultiplier === 1.0 ? 2.0 : 1.0,
    }));
  }, [updateState]);

  const setCpuDifficulty = useCallback((diff: CpuDifficulty) => {
    updateState(prev => ({ ...prev, cpuDifficulty: diff }));
  }, [updateState]);

  const cancelBattle = useCallback(() => {
    cancelPendingBattleWork();
    updateState(prev => ({
      ...prev,
      phase: prev.phase === 'EXECUTING_TURNS' ? 'SELECT_ACTION' : prev.phase,
      isAnimating: false,
      visualEffect: null,
      visualEffects: [],
      player: { ...prev.player, isEvading: false },
      enemy: { ...prev.enemy, isEvading: false },
    }));
  }, [cancelPendingBattleWork, updateState]);

  const addJudgmentMarks = (amount: number, turn: number) => {
    const config = stateRef.current.battleConfig;
    const level = getAbilityLevel(config, 'JUDGMENT');
    if (level <= 0 || judgmentReadyRef.current) return;

    judgmentMarksRef.current += amount;
    const threshold = getJudgmentThreshold(level);

    if (judgmentMarksRef.current >= threshold) {
      judgmentReadyRef.current = true;
      judgmentMarksRef.current = threshold;
      updateState(prev => ({ ...prev, judgmentReady: true }));
      addLog(
        `⚖️【断罪準備完了】断罪の刻が満ちた！ 次の攻撃が「断罪執行」になる。`,
        'PASSIVE_TRIGGER',
        turn,
      );
    } else {
      addLog(
        `⚖️【断罪蓄積】断罪 ${judgmentMarksRef.current}/${threshold}`,
        'PASSIVE_TRIGGER',
        turn,
      );
    }
  };


  const addResonanceJudgmentMarks = (
    amount: number,
    turn: number,
    source: string,
    eligibleIds: readonly ResonanceAbilityId[],
  ) => {
    if (amount <= 0 || eligibleIds.length === 0) return;
    const equipped = getEquippedResonanceAbilities(stateRef.current.battleConfig);
    for (const resonance of equipped) {
      if (!eligibleIds.includes(resonance.id)) continue;
      const execution = getResonanceExecutionStats(resonance.id, resonance.level);
      if (!execution) continue;
      const readyIds = resonanceJudgmentReadyRef.current;
      if (readyIds.includes(resonance.id) && resonance.id !== 'ABYSS_JUDGMENT') continue;

      const marks = resonanceJudgmentMarksRef.current;
      const previous = marks[resonance.id] ?? 0;
      const maximum = resonance.id === 'ABYSS_JUDGMENT' ? execution.threshold * 3 : execution.threshold;
      const next = Math.min(maximum, previous + amount);
      resonanceJudgmentMarksRef.current = { ...marks, [resonance.id]: next };
      if (next >= execution.threshold && !readyIds.includes(resonance.id)) {
        resonanceJudgmentReadyRef.current = [...readyIds, resonance.id];
        addLog(`⚖️【${resonance.id === 'JUDGMENT_WING' ? '断罪翼' : resonance.id === 'ABYSS_JUDGMENT' ? '深淵断罪' : '共鳴断罪'}】蓄積完了（${next}/${execution.threshold}）。次の対象攻撃で執行！`, 'PASSIVE_TRIGGER', turn);
      } else {
        addLog(`⚖️【${resonance.id}・蓄積】${next}/${execution.threshold}（${source}）`, 'PASSIVE_TRIGGER', turn);
      }
    }
  };

  const getReadyResonanceExecutionIds = (
    action: 'ATTACK' | 'SPECIAL' | 'ULTIMATE',
    specialSkillId?: IrenaSpecialSkillId,
  ): ResonanceAbilityId[] => {
    const equipped = getEquippedResonanceAbilities(stateRef.current.battleConfig);
    return equipped
      .filter(resonance => resonanceJudgmentReadyRef.current.includes(resonance.id))
      .filter(resonance => {
        const execution = getResonanceExecutionStats(resonance.id, resonance.level);
        if (!execution) return false;
        if (resonance.id === 'JUDGMENT_WING') {
          return action === 'SPECIAL'
            && specialSkillId !== undefined
            && stateRef.current.player.character.id === 'irena';
        }
        return resonance.id === 'FALLEN_JUDGMENT'
          || resonance.id === 'KING_JUDGMENT'
          || resonance.id === 'ABYSS_JUDGMENT';
      })
      .map(resonance => resonance.id);
  };

  const finishResonanceJudgmentExecution = (turn: number, executedIds: readonly ResonanceAbilityId[]) => {
    if (executedIds.length === 0) return;
    for (const id of executedIds) {
      const resonance = getEquippedResonanceAbilities(stateRef.current.battleConfig).find(item => item.id === id);
      const execution = resonance ? getResonanceExecutionStats(id, resonance.level) : null;
      if (!execution) continue;
      const marks = resonanceJudgmentMarksRef.current[id] ?? 0;
      const readyIds = resonanceJudgmentReadyRef.current;
      if (id === 'ABYSS_JUDGMENT') {
        const remaining = Math.max(0, marks - execution.threshold);
        resonanceJudgmentMarksRef.current = { ...resonanceJudgmentMarksRef.current, [id]: remaining };
        resonanceJudgmentReadyRef.current = remaining >= execution.threshold
          ? readyIds
          : readyIds.filter(readyId => readyId !== id);
        addLog(`⚖️【深淵断罪】執行。蓄積を${execution.threshold}消費、残り${remaining}。`, 'PASSIVE_TRIGGER', turn);
      } else {
        resonanceJudgmentMarksRef.current = { ...resonanceJudgmentMarksRef.current, [id]: 0 };
        resonanceJudgmentReadyRef.current = readyIds.filter(readyId => readyId !== id);
        addLog(`⚖️【${id === 'JUDGMENT_WING' ? '断罪翼' : id === 'FALLEN_JUDGMENT' ? '堕天審判' : '王権断罪'}】執行完了。蓄積をリセットした。`, 'PASSIVE_TRIGGER', turn);
      }
    }
  };

  const calculateErosionResult = (
    enemy: BattleFighter,
    player: BattleFighter,
    amount: number,
  ): { enemy: BattleFighter; player: BattleFighter; judgmentMarksGained: number; kingZoneStacksGained: number } => {
    if (amount <= 0) return { enemy, player, judgmentMarksGained: 0, kingZoneStacksGained: 0 };
    const fields: WeaknessKey[] = ['attack', 'defense', 'speed', 'specialSkillDamage', 'ultimateSkillDamage'];
    const previous = enemy.resonanceWeakness ?? { attack: 0, defense: 0, speed: 0, specialSkillDamage: 0, ultimateSkillDamage: 0 };
    const oldStages = enemy.resonanceWeaknessStages ?? { attack: 0, defense: 0, speed: 0, specialSkillDamage: 0, ultimateSkillDamage: 0 };
    const weakness = { ...previous };
    const stages = { ...oldStages };
    let judgmentMarksGained = 0;
    for (const field of fields) {
      weakness[field] = Math.min(95, previous[field] + amount);
      const crossedStage = Math.min(9, Math.floor(weakness[field] / 10));
      if (getEquippedResonanceAbilities(stateRef.current.battleConfig).some(resonance => resonance.id === 'ABYSS_JUDGMENT')) {
        judgmentMarksGained += Math.max(0, crossedStage - oldStages[field]);
      }
      stages[field] = Math.max(oldStages[field], crossedStage);
    }

    let nextPlayer = player;
    let kingZoneStacksGained = 0;
    const resonance = getEquippedResonanceAbilities(stateRef.current.battleConfig).find(item => item.id === 'ABYSS_KING');
    if (resonance) {
      const zone = getKingZoneValues(resonance.level);
      const greatestWeakness = Math.max(weakness.attack, weakness.defense, weakness.speed);
      const oldThreshold = player.resonanceKingZoneThreshold ?? 0;
      const nextThreshold = Math.max(oldThreshold, Math.min(9, Math.floor(greatestWeakness / 10)));
      const nextStacks = Math.min(zone.maxStacks, (player.resonanceKingZoneStacks ?? 0) + Math.max(0, nextThreshold - oldThreshold));
      kingZoneStacksGained = Math.max(0, nextStacks - (player.resonanceKingZoneStacks ?? 0));
      nextPlayer = {
        ...player,
        resonanceKingZoneThreshold: nextThreshold,
        resonanceKingZoneStacks: nextStacks,
      };
    }
    return {
      enemy: { ...enemy, resonanceWeakness: weakness, resonanceWeaknessStages: stages },
      player: nextPlayer,
      judgmentMarksGained,
      kingZoneStacksGained,
    };
  };

  const applyResonanceErosion = (amount: number, turn: number, source: string) => {
    if (amount <= 0) return;
    const result = calculateErosionResult(stateRef.current.enemy, stateRef.current.player, amount);
    updateState(prev => ({
      ...prev,
      enemy: { ...prev.enemy, resonanceWeakness: result.enemy.resonanceWeakness, resonanceWeaknessStages: result.enemy.resonanceWeaknessStages },
      player: { ...prev.player, resonanceKingZoneThreshold: result.player.resonanceKingZoneThreshold, resonanceKingZoneStacks: result.player.resonanceKingZoneStacks },
    }));
    addLog(`🌑【共鳴侵食：${source}】敵5項目に+${amount}%侵食（攻撃${result.enemy.resonanceWeakness?.attack ?? 0}% / 防御${result.enemy.resonanceWeakness?.defense ?? 0}% / 速度${result.enemy.resonanceWeakness?.speed ?? 0}% / 特殊技${result.enemy.resonanceWeakness?.specialSkillDamage ?? 0}% / 必殺技${result.enemy.resonanceWeakness?.ultimateSkillDamage ?? 0}%）。`, 'PASSIVE_TRIGGER', turn);
    if (result.kingZoneStacksGained > 0) {
      addLog(`👑【王域】新たな弱体化段階を検出。王域+${result.kingZoneStacksGained}（現在${result.player.resonanceKingZoneStacks ?? 0}スタック）。`, 'PASSIVE_TRIGGER', turn);
    }
    if (result.judgmentMarksGained > 0) addResonanceJudgmentMarks(result.judgmentMarksGained, turn, '新規弱体化段階', ['ABYSS_JUDGMENT']);
  };

  const resolveIncomingDamage = (target: BattleFighter, damage: number, turn: number, source: string, isDirectHit = source !== '出血ダメージ' && source !== '星蝕ダメージ'): number => {
    const safeDamage = Math.max(0, Math.floor(damage));
    const lethal = safeDamage >= target.currentHp && target.currentHp > 0;
    const equippedResonances = target.isPlayer ? getEquippedResonanceAbilities(stateRef.current.battleConfig) : [];
    const fallenGod = equippedResonances.find(item => item.id === 'FALLEN_GOD');
    const fallenKingLevel = getAbilityLevel(stateRef.current.battleConfig, 'FALLEN_KING');
    let resultingHp = Math.max(0, target.currentHp - safeDamage);
    let resonanceSurvived = false;

    if (target.isPlayer && lethal && fallenGod) {
      const fraction = getFallenGodRevivalHpFraction(fallenGod.level, fallenGodRevivalCountRef.current);
      if (fraction !== null) {
        fallenGodRevivalCountRef.current += 1;
        resultingHp = fraction > 0
          ? Math.max(1, Math.round((target.resonanceBaseStats?.maxHp ?? target.character.maxHp) * fraction))
          : 1;
        resonanceSurvived = true;
        addLog(`♛【堕天の神・復活】第${fallenGodRevivalCountRef.current}段階！ HPを${fraction > 0 ? `${Math.round(fraction * 100)}%` : '1'}に設定して致命傷を拒絶した。`, 'PASSIVE_TRIGGER', turn);
      }
    }

    if (target.isPlayer && lethal && !resonanceSurvived) {
      const kingResonance = equippedResonances.find(item =>
        (item.id === 'KING_WING' || item.id === 'KING_JUDGMENT' || item.id === 'ABYSS_KING')
        && (resonanceKingSurvivalCountRef.current[item.id] ?? 0) < getResonanceSurvivalLimit(item.id, item.level),
      );
      if (kingResonance) {
        const used = (resonanceKingSurvivalCountRef.current[kingResonance.id] ?? 0) + 1;
        resonanceKingSurvivalCountRef.current = { ...resonanceKingSurvivalCountRef.current, [kingResonance.id]: used };
        resultingHp = 1;
        resonanceSurvived = true;
        addLog(`👑【${kingResonance.id === 'KING_WING' ? '王の翼' : kingResonance.id === 'KING_JUDGMENT' ? '王権断罪' : '深淵王'}】致死ダメージを拒絶！（${used}/${getResonanceSurvivalLimit(kingResonance.id, kingResonance.level)}回）HP1で耐えた。`, 'PASSIVE_TRIGGER', turn);
        if (kingResonance.id === 'KING_WING') {
          const stackRules = getKingWingStackValues(kingResonance.level);
          const activeStacks = resonanceKingWingStackExpiresAtRef.current.filter(expiresAt => expiresAt >= turn);
          if (activeStacks.length < stackRules.maxStacks) activeStacks.push(turn + 1);
          resonanceKingWingStackExpiresAtRef.current = activeStacks;
          updateState(prev => ({
            ...prev,
            player: {
              ...prev.player,
              resonanceKingWingStacks: activeStacks.length,
              resonanceKingWingStackExpiresAtTurns: activeStacks,
            },
          }));
          addLog(`🪶【王の羽】致命傷を耐え、羽弾強化を獲得（${activeStacks.length}/${stackRules.maxStacks}スタック、2ターン）。`, 'PASSIVE_TRIGGER', turn);
        }
      }
    }

    if (
      !resonanceSurvived &&
      target.isPlayer &&
      fallenKingLevel >= 5 &&
      lethal &&
      fallenKingSurvivalCountRef.current < 5
    ) {
      fallenKingSurvivalCountRef.current += 1;
      addLog(
        `👑【堕天王】いれーなは致命傷を拒絶した！（${source}）HP1で踏みとどまる。`,
        'PASSIVE_TRIGGER',
        turn,
      );
      resultingHp = 1;
    }

    if (target.isPlayer && resultingHp > 0 && fallenGod) {
      const baseHp = Math.max(1, target.resonanceBaseStats?.maxHp ?? target.character.maxHp);
      const stage = resultingHp <= 1 ? 3 : resultingHp <= baseHp * 0.25 ? 2 : resultingHp <= baseHp * 0.5 ? 1 : 0;
      const oldStage = stateRef.current.player.resonanceGodObservedHpStage ?? 0;
      updateState(prev => {
        const previous = prev.player.resonanceGodObservedHpStage ?? 0;
        const previousBuff = prev.player.resonanceStatBuff;
        const nextBuff = stage > previous
          ? { multiplier: getFallenGodStatMultiplier(fallenGod.level, stage), expiresAtTurn: turn + 1, stage }
          : previousBuff;
        return {
          ...prev,
          player: {
            ...prev.player,
            resonanceGodObservedHpStage: stage,
            ...(stage > previous ? { resonanceStatBuff: nextBuff } : {}),
          },
        };
      });
      if (stage > oldStage) {
        addLog(`♛【堕天の神・神格上昇】HP段階${stage}を検出。全ステータス×${getFallenGodStatMultiplier(fallenGod.level, stage)}（2ターン）。`, 'PASSIVE_TRIGGER', turn);
      }
    }

    if (target.isPlayer && isDirectHit && equippedResonances.some(item => item.id === 'KING_JUDGMENT')) {
      addResonanceJudgmentMarks(1, turn, '被弾', ['KING_JUDGMENT']);
    }
    const lastStandIsEligible = Boolean(
      target.isPlayer &&
      resultingHp <= 0 &&
      stateRef.current.battleConfig.imprints?.includes('LAST_STAND') &&
      !lastStandUsedRef.current &&
      !stateRef.current.usedImprints.includes('LAST_STAND')
    );
    if (lastStandIsEligible) {
      lastStandUsedRef.current = true;
      resultingHp = 1;
      updateState(prev => ({
        ...prev,
        usedImprints: prev.usedImprints.includes('LAST_STAND') ? prev.usedImprints : [...prev.usedImprints, 'LAST_STAND'],
      }));
      addLog('✧【不屈の印】致命傷を受けたが、HP1で踏みとどまった！', 'PASSIVE_TRIGGER', turn);
    }

    // Wind Guard counters after a landed direct CPU hit. DoT must never trigger it.
    const windGuardIsEligible = Boolean(
      target.isPlayer &&
      source !== '出血ダメージ' &&
      stateRef.current.battleConfig.imprints?.includes('WIND_GUARD') &&
      target.featherChargeBonus > 0 &&
      safeDamage > 0
    );
    if (windGuardIsEligible) {
      const counterDamage = getWindGuardCounterDamage(target.featherChargeBonus);
      const counterHit = resolveKaiserDamage(stateRef.current.enemy, counterDamage, turn, '風守り・反撃');
      const actualCounterDamage = counterHit.damage;
      const nextEnemyHp = counterHit.targetHp;
      addLog(
        `🪶【風守り・自動反撃】羽弾蓄積+${target.featherChargeBonus}に反応！ CPUへ${actualCounterDamage}ダメージ。`,
        'PASSIVE_TRIGGER',
        turn,
      );
      soundManager.playHeavyStrike();
      if (nextEnemyHp <= 0) {
        addLog('🪶【風守り】反撃が決定打になった！', 'PASSIVE_TRIGGER', turn);
      }
    }

    return resultingHp;
  };

  const resolveKaiserDamage = (
    target: BattleFighter,
    damage: number,
    turn: number,
    source: string,
    isDirectHit = source !== '出血ダメージ',
  ): { damage: number; targetHp: number; phaseChanged: boolean } => {
    if (target.isPlayer && isDirectHit) {
      const resonance = getEquippedResonanceAbilities(stateRef.current.battleConfig).find(item => item.id === 'ABYSS_KING');
      if (resonance) {
        const zone = getKingZoneValues(resonance.level);
        const stacks = Math.min(zone.maxStacks, target.resonanceKingZoneStacks ?? 0);
        const reduction = Math.min(0.95, stacks * zone.directDamageReductionPerStack);
        if (reduction > 0) {
          const beforeZone = Math.max(0, Math.floor(damage));
          damage = Math.max(0, Math.floor(beforeZone * (1 - reduction)));
          addLog(`👑【王域】直接攻撃を${Math.round(reduction * 100)}%軽減（${beforeZone} → ${damage}）。`, 'PASSIVE_TRIGGER', turn);
        }
      }
    }
    const damageBeforePassive = Math.max(0, Math.floor(damage));
    damage = applyPassiveDamageReduction(target, damage, isDirectHit);
    if (damage < damageBeforePassive) {
      addLog(
        `✨【${target.character.passiveName}】直接ダメージを${damageBeforePassive - damage}軽減！`,
        'PASSIVE_TRIGGER',
        turn,
      );
    }

    if (!target.isPlayer && target.character.id === 'kaiser') {
      // Use authoritative enemy state; the action-local target may be a dynamic-stat snapshot.
      const outcome = resolveKaiserHit(
        stateRef.current.enemy,
        damage,
        stateRef.current.battleConfig.kaiserLevel,
        turn,
        isDirectHit,
        source,
      );
      updateState(prev => ({ ...prev, enemy: outcome.fighter }));
      if (outcome.armorWasActive) {
        addLog(
          outcome.phaseChanged
            ? `🛡️【鉄壁装甲】第2フェーズ移行により装甲を${outcome.armorAfter} / ${outcome.fighter.kaiserArmorMax ?? 0}で再展開。`
            : `🛡️【鉄壁装甲】耐久 ${outcome.armorBefore} → ${outcome.armorAfter} / ${outcome.fighter.kaiserArmorMax ?? 0}。HPダメージは25%軽減。`,
          'PASSIVE_TRIGGER',
          turn,
        );
      }
      // Phase two redeploys armor immediately, so its fresh armor state takes
      // precedence over any break/broken-state message from the same hit.
      if (outcome.armorBroke && !outcome.phaseChanged) {
        addLog('💥【鉄壁装甲破壊】カイザーが2ターンの装甲破壊状態に入った！ 被ダメージ×1.3。', 'PASSIVE_TRIGGER', turn);
      } else if (!outcome.phaseChanged && outcome.armorWasBroken && isDirectHit) {
        addLog(
          `⚔️【装甲破壊中】カイザーへのダメージ×1.3（残り${Math.max(1, stateRef.current.enemy.kaiserArmorBrokenTurns ?? 1)}ターン）。`,
          'PASSIVE_TRIGGER',
          turn,
        );
      }
      if (outcome.phaseChanged) {
        addLog(
          '⚠️【最終試練・第2フェーズ】カイザーの攻撃力・技威力が上昇！ 素早さ強化、鉄壁装甲を50%再展開。',
          'SYSTEM',
          turn,
        );
      }
      return { damage: outcome.damage, targetHp: outcome.fighter.currentHp, phaseChanged: outcome.phaseChanged };
    }
    return {
      damage: Math.max(0, Math.floor(damage)),
      targetHp: resolveIncomingDamage(target, damage, turn, source, isDirectHit),
      phaseChanged: false,
    };
  };

  const restartBattle = useCallback((
    pChar?: CharacterDef,
    eChar?: CharacterDef,
    difficultyOverride?: CpuDifficulty,
    battleConfigOverride?: BattleSetupConfig,
  ) => {
    const baseP = pChar || stateRef.current.player.character;
    const baseE = eChar || stateRef.current.enemy.character;
    const nextDifficulty = difficultyOverride || stateRef.current.cpuDifficulty;
    const nextStatPointTotal = Math.max(
      0,
      Math.floor(
        battleConfigOverride?.statPointTotal
          ?? stateRef.current.battleConfig.statPointTotal
          ?? 12,
      ),
    );
    const nextConfig: BattleSetupConfig = {
      kaiserLevel: battleConfigOverride?.kaiserLevel ?? stateRef.current.battleConfig.kaiserLevel,
      // Preserve challenge mode when a battle starts or restarts. Without this,
      // EX Kaiser silently falls back to normal Lv.100 and its victory is misclassified.
      kaiserChallengeMode: battleConfigOverride?.kaiserChallengeMode
        ?? stateRef.current.battleConfig.kaiserChallengeMode
        ?? 'NORMAL',
      playerCharacterId: battleConfigOverride?.playerCharacterId ?? baseP.id,
      abilities: normalizeEquippedAbilities(
        battleConfigOverride?.abilities ?? stateRef.current.battleConfig.abilities,
      ),
      imprints: normalizeEquippedImprints(
        battleConfigOverride?.imprints ?? stateRef.current.battleConfig.imprints,
      ),
      achievementBadgeId: battleConfigOverride?.achievementBadgeId !== undefined
        ? battleConfigOverride.achievementBadgeId
        : stateRef.current.battleConfig.achievementBadgeId ?? null,
      achievementBadgeLevel: battleConfigOverride?.achievementBadgeLevel
        ?? (battleConfigOverride?.achievementBadgeId === null ? 0 : stateRef.current.battleConfig.achievementBadgeLevel ?? 0),
      statPointTotal: nextStatPointTotal,
      statAllocation: normalizeStatAllocation(
        battleConfigOverride?.statAllocation ?? stateRef.current.battleConfig.statAllocation,
        nextStatPointTotal,
      ),
    };
    const prepared = createBattleCharacters(baseP, baseE, nextConfig);
    const nextPlayer = createInitialFighter(prepared.player, true);
    const nextEnemy = createInitialFighter(prepared.enemy, false, nextConfig.kaiserLevel);

    recentPlayerActionsRef.current = [];
    recentCpuActionsRef.current = [];
    playerEvadeSelectedRef.current = false;
    foresightTriggerPendingRef.current = false;
    yinYangDefensePendingRef.current = false;
    masteryClaimedRef.current = new Set();
    battleMasteryRewardRef.current = 0;
    judgmentMarksRef.current = 0;
    judgmentReadyRef.current = false;
    fallenKingSurvivalCountRef.current = 0;
    fallenGodRevivalCountRef.current = 0;
    resonanceKingSurvivalCountRef.current = {};
    resonanceKingWingStackExpiresAtRef.current = [];
    resonanceJudgmentMarksRef.current = {};
    resonanceJudgmentReadyRef.current = [];
    lastStandUsedRef.current = false;
    fallenReleaseLoggedRef.current = false;
    nextLogId.current = 1;
    cancelPendingBattleWork();

    const nextCpuIntent = CpuAi.decideAction(nextEnemy, nextPlayer, nextDifficulty, {
      kaiserLevel: nextConfig.kaiserLevel,
    });

    updateState(prev => ({
      ...prev,
      turnNumber: 1,
      player: nextPlayer,
      enemy: nextEnemy,
      logs: [
        {
          id: nextLogId.current++,
          turn: 1,
          text: `⚔️ バトル開始！ ${prepared.player.name} (あなた) VS ${prepared.enemy.name} Lv.${nextConfig.kaiserLevel} (CPU)`,
          type: 'SYSTEM',
          timestamp: Date.now(),
        },
      ],
      phase: 'SELECT_ACTION',
      visualEffect: null,
      visualEffects: [],
      judgmentReady: false,
      winnerIsPlayer: null,
      cpuDifficulty: nextDifficulty,
      cpuIntent: nextCpuIntent,
      playerActionsTaken: [],
      usedImprints: [],
      yinYangActivatedTurn: null,
      yinYangDefenseResult: null,
      windGuardResult: null,
      bloodMediaHealResult: null,
      costlyShotResult: null,
      isAnimating: false,
      lastBattleReward: 0,
      lastBattleMasteryReward: 0,
      battleConfig: nextConfig,
    }));
  }, [updateState]);

  // Gain ultimate gauge
  const gainUltimateGauge = (isPlayer: boolean, actorName: string, source: string, turn: number) => {
    const curFighter = isPlayer ? stateRef.current.player : stateRef.current.enemy;
    const currentGauge = curFighter.ultimateGauge;
    if (currentGauge < 3) {
      const newGauge = currentGauge + 1;
      updateState(prev => (isPlayer
        ? { ...prev, player: { ...prev.player, ultimateGauge: newGauge } }
        : { ...prev, enemy: { ...prev.enemy, ultimateGauge: newGauge } }
      ));
      if (newGauge === 3) {
        addLog(`⚡【必殺技解放！】${actorName}の必殺技ゲージがMAXになった！（${source}）`, isPlayer ? 'GAUGE_CHANGE' : 'GAUGE_CHANGE', turn);
      } else {
        addLog(`⚡ ${actorName}の必殺技ゲージが溜まった！（${newGauge}/3）（${source}）`, isPlayer ? 'GAUGE_CHANGE' : 'GAUGE_CHANGE', turn);
      }
    }
  };

  // Consume buff
  const consumeBuff = (isPlayer: boolean) => {
    updateState(prev => (isPlayer
      ? { ...prev, player: { ...prev.player, isBuffed: false, buffDamageBonus: 0 } }
      : { ...prev, enemy: { ...prev.enemy, isBuffed: false, buffDamageBonus: 0 } }
    ));
  };

  // Only direct hits use this helper. Bleed ticks retain their existing damage and duration rules.
  const applyWindGuardToDamage = (
    attackerIsPlayer: boolean,
    target: BattleFighter,
    damage: number,
    turn: number,
  ): number => {
    const result = resolveWindGuardDamage(
      damage,
      target.featherChargeBonus,
      !attackerIsPlayer &&
        target.isPlayer &&
        Boolean(stateRef.current.battleConfig.imprints?.includes('WIND_GUARD')),
    );
    if (!result.applied) return damage;

    updateState(prev => ({
      ...prev,
      windGuardResult: {
        turn,
        reducedBy: result.reducedBy,
        counterDamage: result.counterDamage,
        featherChargeBonus: target.featherChargeBonus,
      },
    }));
    addLog(
      `🪶【風守り】羽弾蓄積+${target.featherChargeBonus}により被ダメージを${result.reducedBy}軽減（${Math.floor(damage)} → ${result.damage}）。`,
      'PASSIVE_TRIGGER',
      turn,
    );
    soundManager.playDefend();
    return result.damage;
  };

  const applyYinYangDefenseToDamage = (
    attackerIsPlayer: boolean,
    target: BattleFighter,
    damage: number,
    turn: number,
  ): number => {
    const result = resolveYinYangDefense(damage, {
      attackerIsPlayer,
      targetIsPlayer: target.isPlayer,
      defenseActive: yinYangDefensePendingRef.current,
    });
    let adjustedDamage = damage;

    if (result.applied) {
      yinYangDefensePendingRef.current = false;
      updateState(prev => ({
        ...prev,
        yinYangDefenseResult: { turn, reducedBy: result.reducedBy },
      }));
      addLog(
        `☯️【陰陽転化・防御】CPUの直撃を半減！ ${Math.floor(damage)} → ${result.damage}。`,
        'PASSIVE_TRIGGER',
        turn,
      );
      soundManager.playDefend();
      adjustedDamage = result.damage;
    }

    return applyWindGuardToDamage(attackerIsPlayer, target, adjustedDamage, turn);
  };

  // Apply Special Status Ailment (Bleed or Pressure), including player-only imprint conversions.
  const applySpecialStatusAilment = (
    attacker: BattleFighter,
    defenderIsPlayer: boolean,
    turn: number,
  ): { bloodTearBurstDamage: number; appliedAilmentDuration: number | null } => {
    const ailmentType: StatusAilmentType = attacker.character.id === 'irena'
      ? 'BLEED'
      : attacker.character.id === 'stella'
        ? 'STAR_ECLIPSE'
        : 'PRESSURE';
    const ailmentDef = STATUS_AILMENTS[ailmentType];
    const dotDamage = ailmentType === 'BLEED' && (attacker.character.featherSkillLevel || 1) >= 3
      ? 40
      : ailmentDef.dotDamage;
    const statusDescription = ailmentType === 'BLEED' && dotDamage !== ailmentDef.dotDamage
      ? `各ターン開始時に${dotDamage}ダメージ、速度-20、防御-20`
      : ailmentDef.description;
    const playerAppliedBleed = attacker.isPlayer && !defenderIsPlayer && ailmentType === 'BLEED';
    const equippedImprints = stateRef.current.battleConfig.imprints ?? [];

    if (playerAppliedBleed && equippedImprints.includes('BLOOD_TEAR')) {
      const burstDamage = getBloodTearBurstDamage(dotDamage, ailmentDef.defaultDuration);
      // Consume any previous Bleed first: Blood Tear must never leave a stale
      // status behind when it converts the newly applied Bleed into burst damage.
      updateState(prev => {
        const target = defenderIsPlayer ? prev.player : prev.enemy;
        const remainingAilments = target.activeAilments.filter(ailment => ailment.type !== 'BLEED');
        return defenderIsPlayer
          ? { ...prev, player: { ...prev.player, activeAilments: remainingAilments } }
          : { ...prev, enemy: { ...prev.enemy, activeAilments: remainingAilments } };
      });
      addLog(
        `🩸【刻印発動：血裂】出血を付与した瞬間に凝縮！ ${dotDamage}×${ailmentDef.defaultDuration}×1.5＝${burstDamage}ダメージ。出血状態は残らない。`,
        'PASSIVE_TRIGGER',
        turn,
      );
      return { bloodTearBurstDamage: burstDamage, appliedAilmentDuration: null };
    }

    const duration = ailmentDef.defaultDuration + (
      playerAppliedBleed && equippedImprints.includes('BLOOD_MEDIA')
        ? BLOOD_MEDIA_EXTRA_BLEED_TURNS
        : 0
    );

    updateState(prev => {
      const target = defenderIsPlayer ? prev.player : prev.enemy;
      const filtered = target.activeAilments.filter(a => a.type !== ailmentType);
      const updated = [
        ...filtered,
        { type: ailmentType, remainingTurns: duration, ...(dotDamage > 0 ? { dotDamage } : {}) },
      ];
      return defenderIsPlayer
        ? { ...prev, player: { ...prev.player, activeAilments: updated } }
        : { ...prev, enemy: { ...prev.enemy, activeAilments: updated } };
    });

    const defenderName = defenderIsPlayer ? stateRef.current.player.character.name : stateRef.current.enemy.character.name;
    const displayName = ailmentDef.displayName;
    addLog(`⚠️【状態異常付与】${defenderName}に「${displayName}」が付与された！（${duration}ターン: ${statusDescription}）`, 'AILMENT_APPLIED', turn);
    return { bloodTearBurstDamage: 0, appliedAilmentDuration: duration };
  };


  const tryTriggerForesight = (
    attackerIsPlayer: boolean,
    target: BattleFighter,
    incomingAction: BattleAction,
    turn: number,
  ): boolean => {
    const current = stateRef.current;
    // Eligibility was snapshotted from the telegraph and the player's committed action.
    // Do not re-read cpuIntent here: state updates during turn execution must not invalidate that decision.
    const triggered = Boolean(
      !attackerIsPlayer &&
      target.isPlayer &&
      foresightTriggerPendingRef.current &&
      !current.usedImprints.includes('FORESIGHT') &&
      (incomingAction === 'SPECIAL' || incomingAction === 'ULTIMATE')
    );
    if (!triggered) return false;

    foresightTriggerPendingRef.current = false;
    updateState(prev => prev.usedImprints.includes('FORESIGHT')
      ? prev
      : { ...prev, usedImprints: [...prev.usedImprints, 'FORESIGHT'] });
    addLog(
      '👁️【刻印発動：見切り】特殊技／必殺技の予告を読み切った！ この回避は確定成功。',
      'PASSIVE_TRIGGER',
      turn,
    );
    return true;
  };

  const executeFighterTurn = async (
    isActorPlayer: boolean,
    action: PlayerBattleAction,
    isActingFirst: boolean,
    speed: number,
    turn: number,
    ultimateVariant?: 'ALL_GODS' | 'RUIN' | 'OMNIPOTENCE',
    specialSkillId?: IrenaSpecialSkillId,
  ): Promise<boolean> => {
    let actor = isActorPlayer ? stateRef.current.player : stateRef.current.enemy;
    let target = isActorPlayer ? stateRef.current.enemy : stateRef.current.player;
    const baseActorMaxHp = actor.character.maxHp;

    actor = applyDynamicAbilityModifiers(actor, stateRef.current.battleConfig, turn);
    target = applyDynamicAbilityModifiers(target, stateRef.current.battleConfig, turn);

    if (
      isActorPlayer &&
      hasAbility(stateRef.current.battleConfig, 'FALLEN') &&
      actor.currentHp <= baseActorMaxHp * 0.10 &&
      !fallenReleaseLoggedRef.current
    ) {
      fallenReleaseLoggedRef.current = true;
      addLog('🩸【堕天・完全解放】いれーなの堕天使の力が完全に解放された！', 'PASSIVE_TRIGGER', turn);
    }

    // 1. Process a damaging status at turn start (Bleed or Star Eclipse).
    const dotAilment = actor.activeAilments.find(ailment => ailment.type === 'BLEED' || ailment.type === 'STAR_ECLIPSE');
    if (dotAilment) {
      const ailmentDef = STATUS_AILMENTS[dotAilment.type];
      const dotDamage = dotAilment.dotDamage ?? ailmentDef.dotDamage;
      const dotSource = dotAilment.type === 'BLEED' ? '出血ダメージ' : '星蝕ダメージ';
      const dotMark = dotAilment.type === 'BLEED' ? '🩸' : '🌑';
      soundManager.playHeavyStrike();
      addLog(`${dotMark}【${ailmentDef.displayName}ダメージ】${actor.character.name}は${ailmentDef.displayName}により ${dotDamage} ダメージを受けた！`, 'AILMENT_DOT', turn);

      const dotOutcome = resolveKaiserDamage(actor, dotDamage, turn, dotSource, false);
      const newHp = dotOutcome.targetHp;
      // Blood Media remains specific to damage caused by Bleed, never Star Eclipse.
      const actualDotDamage = Math.max(0, actor.currentHp - newHp);
      const bloodMediaHealAmount = dotAilment.type === 'BLEED' && !isActorPlayer &&
        Boolean(stateRef.current.battleConfig.imprints?.includes('BLOOD_MEDIA'))
        ? Math.min(actualDotDamage, Math.max(0, stateRef.current.player.character.maxHp - stateRef.current.player.currentHp))
        : 0;
      if (bloodMediaHealAmount > 0) {
        updateState(prev => ({
          ...prev,
          player: {
            ...prev.player,
            currentHp: Math.min(prev.player.character.maxHp, prev.player.currentHp + bloodMediaHealAmount),
          },
          bloodMediaHealResult: { turn, amount: bloodMediaHealAmount },
        }));
        addLog(
          `🩸【血媒・吸収】出血で実際に与えたダメージからHP+${bloodMediaHealAmount}回復。`,
          'PASSIVE_TRIGGER',
          turn,
        );
        soundManager.playDefend();
      }
      updateState(prev => (isActorPlayer
        ? {
            ...prev,
            player: { ...prev.player, currentHp: newHp },
            visualEffect: {
              targetIsPlayer: isActorPlayer,
              damage: dotDamage,
              effectType: 'BLEED_TICK',
              isCritical: false,
              isEvade: false,
              isBuff: false,
              isUltimate: false,
              actorName: ailmentDef.displayName,
              skillName: dotSource,
              statusAilmentName: ailmentDef.displayName,
              bannerText: `${dotMark} ${ailmentDef.displayName} -${dotDamage} DMG`,
              effectId: nextVisualEffectId.current++,
            },
          }
        : {
            ...prev,
            enemy: { ...prev.enemy, currentHp: newHp },
            visualEffect: {
              targetIsPlayer: isActorPlayer,
              damage: dotDamage,
              effectType: 'BLEED_TICK',
              isCritical: false,
              isEvade: false,
              isBuff: false,
              isUltimate: false,
              actorName: ailmentDef.displayName,
              skillName: dotSource,
              statusAilmentName: ailmentDef.displayName,
              bannerText: `${dotMark} ${ailmentDef.displayName} -${dotDamage} DMG`,
              effectId: nextVisualEffectId.current++,
            },
          }
      ));

      await sleep(850 / speed);
      updateState(prev => ({ ...prev, visualEffect: null }));

      if (newHp <= 0) {
        addLog(`💀 ${actor.character.name}は${ailmentDef.displayName}により力尽きた！`, isActorPlayer ? 'DEFEAT' : 'VICTORY', turn);
        return false;
      }
    }

    // 2. Decrement Status Ailments duration
    if (actor.activeAilments.length > 0) {
      const remaining: typeof actor.activeAilments = [];
      for (const a of actor.activeAilments) {
        const nextTurns = a.remainingTurns - 1;
        if (nextTurns > 0) {
          remaining.push({ ...a, remainingTurns: nextTurns });
        } else {
          const name = STATUS_AILMENTS[a.type].displayName;
          addLog(`✨ ${actor.character.name}の「${name}」状態が解除された！`, 'AILMENT_EXPIRED', turn);
        }
      }
      updateState(prev => (isActorPlayer
        ? { ...prev, player: { ...prev.player, activeAilments: remaining } }
        : { ...prev, enemy: { ...prev.enemy, activeAilments: remaining } }
      ));
    }

    // Refresh references
    actor = applyDynamicAbilityModifiers(
      isActorPlayer ? stateRef.current.player : stateRef.current.enemy,
      stateRef.current.battleConfig,
      turn,
    );
    target = applyDynamicAbilityModifiers(
      isActorPlayer ? stateRef.current.enemy : stateRef.current.player,
      stateRef.current.battleConfig,
      turn,
    );

    // 3. Execute Chosen Action
    switch (action) {
      case 'BUFF': {
        if (shouldSuppressCpuBuffAction(action, isActorPlayer, stateRef.current.battleConfig.imprints)) {
          addLog(
            `⛓️【刻印発動：詠唱狩り】${actor.character.name}の強化詠唱を断ち切った！ 強化効果は発生しない。`,
            'PASSIVE_TRIGGER',
            turn,
          );
          soundManager.playDefend();
          await sleep(450 / speed);
          return true;
        }

        if (!actor.isBuffed) {
          updateState(prev => (isActorPlayer
            ? { ...prev, player: { ...prev.player, isBuffed: true, buffDamageBonus: GAME_BALANCE.BUFF_DAMAGE_BONUS } }
            : { ...prev, enemy: { ...prev.enemy, isBuffed: true, buffDamageBonus: GAME_BALANCE.BUFF_DAMAGE_BONUS } }
          ));
          soundManager.playAttack();
          addLog(
            `⚡ ${actor.character.name}は気合を高めた！（次の攻撃系行動のダメージ+${GAME_BALANCE.BUFF_DAMAGE_BONUS}）`,
            isActorPlayer ? 'BUFF_PLAYER' : 'BUFF_ENEMY',
            turn
          );
        } else {
          addLog(
            `⚡ ${actor.character.name}はすでに強化状態だ！（効果は重複しない）`,
            isActorPlayer ? 'BUFF_PLAYER' : 'BUFF_ENEMY',
            turn
          );
        }

        updateState(prev => ({
          ...prev,
          visualEffect: {
            targetIsPlayer: isActorPlayer,
            damage: 0,
            effectType: 'BUFF_POWER',
            isCritical: false,
            isEvade: false,
            isBuff: true,
            isUltimate: false,
            actorName: actor.character.name,
            skillName: '強化',
            statusAilmentName: '',
            bannerText: `⚡ 攻撃強化 (+${GAME_BALANCE.BUFF_DAMAGE_BONUS})！`,
            effectId: nextVisualEffectId.current++,
          },
        }));

        await sleep(650 / speed);
        updateState(prev => ({ ...prev, visualEffect: null }));
        return true;
      }

      case 'YIN_YANG': {
        if (!isActorPlayer || !stateRef.current.battleConfig.imprints?.includes('YIN_YANG')) {
          return true;
        }

        const existingBonus = stateRef.current.player.isBuffed
          ? stateRef.current.player.buffDamageBonus
          : 0;
        const attackBonus = Math.max(existingBonus, GAME_BALANCE.BUFF_DAMAGE_BONUS);
        updateState(prev => ({
          ...prev,
          yinYangActivatedTurn: turn,
          player: {
            ...prev.player,
            isBuffed: true,
            buffDamageBonus: Math.max(
              prev.player.isBuffed ? prev.player.buffDamageBonus : 0,
              GAME_BALANCE.BUFF_DAMAGE_BONUS,
            ),
          },
          visualEffect: {
            targetIsPlayer: true,
            damage: 0,
            effectType: 'BUFF_POWER',
            isCritical: false,
            isEvade: false,
            isBuff: true,
            isUltimate: false,
            actorName: actor.character.name,
            skillName: '陰陽転化',
            statusAilmentName: '',
            bannerText: `☯️ 防御50% / 次の攻撃+${attackBonus}`,
            effectId: nextVisualEffectId.current++,
          },
        }));
        soundManager.playDefend();
        addLog(
          `☯️【陰陽転化】陰の守りを展開。今ターンはCPUの直撃を半減し、次の攻撃系行動を+${attackBonus}強化する！`,
          'PASSIVE_TRIGGER',
          turn,
        );

        await sleep(650 / speed);
        updateState(prev => ({ ...prev, visualEffect: null }));
        return true;
      }

      case 'COSTLY_SHOT': {
        if (!isActorPlayer || !stateRef.current.battleConfig.imprints?.includes('COSTLY_SHOT')) {
          return true;
        }
        const featherSplitEnabled =
          actor.character.id === 'irena' &&
          Boolean(stateRef.current.battleConfig.imprints?.includes('FEATHER_SPLIT'));
        const selectedSplitMode = getFeatherSplitModeForSkill(specialSkillId);
        if (
          actor.currentHp <= COSTLY_SHOT_HP_COST ||
          getSpecialCooldownRemaining(actor, specialSkillId ?? 'FEATHER', featherSplitEnabled) <= 0 ||
          actor.isSuperFallenShotCharging
        ) {
          return true;
        }

        const hpAfterCost = actor.currentHp - COSTLY_SHOT_HP_COST;
        updateState(prev => ({
          ...prev,
          player: {
            ...prev.player,
            currentHp: hpAfterCost,
            ...(featherSplitEnabled && selectedSplitMode === 'PIERCE'
              ? { featherPierceCooldownRemaining: 0 }
              : {}),
            ...(featherSplitEnabled && selectedSplitMode === 'RAPID'
              ? { featherRapidCooldownRemaining: 0 }
              : {}),
            ...(!featherSplitEnabled || !selectedSplitMode
              ? { specialCooldownRemaining: 0 }
              : {}),
          },
          costlyShotResult: { turn, hpSpent: COSTLY_SHOT_HP_COST },
          visualEffect: {
            targetIsPlayer: true,
            damage: 0,
            effectType: 'BUFF_POWER',
            isCritical: false,
            isEvade: false,
            isBuff: true,
            isUltimate: false,
            actorName: actor.character.name,
            skillName: '代償撃ち',
            statusAilmentName: '',
            bannerText: `♻️ HP-${COSTLY_SHOT_HP_COST} / 特殊CT RESET`,
            effectId: nextVisualEffectId.current++,
          },
        }));
        addLog(
          `♻️【刻印発動：代償撃ち】HPを${COSTLY_SHOT_HP_COST}消費し、特殊技のクールタイムをリセット！`,
          'PASSIVE_TRIGGER',
          turn,
        );
        soundManager.playDefend();
        await sleep(650 / speed);
        updateState(prev => ({ ...prev, visualEffect: null }));
        return hpAfterCost > 0;
      }

      case 'EVADE': {
        const evadePercent = Math.round(actor.character.evasionRate * 100);
        addLog(
          `🌀 ${actor.character.name}は身構えて回避態勢に入った！（固有回避率: ${evadePercent}%）`,
          isActorPlayer ? 'PLAYER_ACTION' : 'ENEMY_ACTION',
          turn
        );

        updateState(prev => ({
          ...prev,
          visualEffect: {
            targetIsPlayer: isActorPlayer,
            damage: 0,
            effectType: 'EVADE_DODGE',
            isCritical: false,
            isEvade: true,
            isBuff: false,
            isUltimate: false,
            actorName: actor.character.name,
            skillName: '回避構え',
            statusAilmentName: '',
            bannerText: `回避の構え(${evadePercent}%)！`,
            effectId: nextVisualEffectId.current++,
          },
        }));

        await sleep(600 / speed);
        updateState(prev => ({ ...prev, visualEffect: null }));
        return true;
      }

      case 'ATTACK': {
        const hadBuff = actor.isBuffed;
        const buffDamageBonus = actor.buffDamageBonus || GAME_BALANCE.BUFF_DAMAGE_BONUS;
        if (hadBuff) {
          consumeBuff(isActorPlayer);
        }

        // Check opponent evasion
        if (target.isEvading) {
          const isEvaded = Math.random() < target.character.evasionRate;
          if (isEvaded) {
            soundManager.playDefend();
            addLog(
              `💨【回避成功！】${target.character.name}は身をかわし、${actor.character.name}の攻撃を完全に回避した！`,
              isActorPlayer ? 'EVADE_SUCCESS_ENEMY' : 'EVADE_SUCCESS_PLAYER',
              turn
            );
            gainUltimateGauge(!isActorPlayer, target.character.name, '回避成功', turn);

            updateState(prev => ({
              ...prev,
              visualEffect: {
                targetIsPlayer: !isActorPlayer,
                damage: 0,
                effectType: 'EVADE_DODGE',
                isCritical: false,
                isEvade: true,
                isBuff: false,
                isUltimate: false,
                actorName: target.character.name,
                skillName: '回避成功',
                statusAilmentName: '',
                bannerText: '💨 回避成功！ 0 DMG',
                effectId: nextVisualEffectId.current++,
              },
            }));

            await sleep(850 / speed);
            updateState(prev => ({ ...prev, visualEffect: null }));
            return true;
          } else {
            addLog(
              `⚠️【回避失敗！】${target.character.name}は回避を試みたが間に合わず、攻撃を受けた！`,
              isActorPlayer ? 'EVADE_FAIL_ENEMY' : 'EVADE_FAIL_PLAYER',
              turn
            );
          }
        }

        const judgmentLevel = isActorPlayer
          ? getAbilityLevel(stateRef.current.battleConfig, 'JUDGMENT')
          : 0;
        const resonanceExecutionIds = isActorPlayer ? getReadyResonanceExecutionIds('ATTACK') : [];
        const judgmentActive = isActorPlayer && judgmentReadyRef.current;
        const anyExecutionActive = judgmentActive || resonanceExecutionIds.length > 0;
        const isCritical = Math.random() < GAME_BALANCE.CRITICAL_RATE;
        const calculatedDamage = calculateNormalAttackDamage(
          {
            attacker: actor,
            target,
            config: stateRef.current.battleConfig,
            turn,
            isActingFirst,
            judgmentReady: judgmentActive,
            resonanceJudgmentMarks: resonanceJudgmentMarksRef.current,
            resonanceJudgmentReadyIds: resonanceExecutionIds,
            alreadyPrepared: true,
            baseAttackerMaxHp: baseActorMaxHp,
          },
          isCritical,
        );
        const attackResonances = getEquippedResonanceAbilities(stateRef.current.battleConfig);
        const resonanceFallenExecution = attackResonances.some(resonance => ['FALLEN_GOD', 'FALLEN_WING', 'FALLEN_JUDGMENT', 'ABYSS_FALLEN'].includes(resonance.id));
        const executionForHit =
          isActorPlayer &&
          (hasAbility(stateRef.current.battleConfig, 'FALLEN') || resonanceFallenExecution) &&
          target.currentHp > 0 &&
          actor.currentHp > 1 &&
          actor.currentHp <= baseActorMaxHp * 0.05;
        let finalDamage = applyYinYangDefenseToDamage(isActorPlayer, target, calculatedDamage, turn);
        // Capture armor state before resolving this hit; the hit itself may break it
        // or trigger phase two's immediate armor redeployment.
        const armorWasActiveForHit =
          target.character.id === 'kaiser' &&
          stateRef.current.battleConfig.kaiserLevel >= 40 &&
          (stateRef.current.enemy.kaiserArmorCurrent ?? 0) > 0;
        const hitOutcome = resolveKaiserDamage(target, finalDamage, turn, executionForHit ? '堕天・終局' : '通常攻撃');
        finalDamage = hitOutcome.damage;

        if (actor.character.id === 'irena' && isActingFirst) {
          addLog(
            `🔮【先読み発動】いれーなは先手を制し通常攻撃ダメージ+${GAME_BALANCE.IRENA_PRECOGNITION_BONUS}！`,
            'PASSIVE_TRIGGER',
            turn,
          );
        }

        const heavyArmorTriggered = target.character.id === 'kaiser' && !armorWasActiveForHit;
        if (hadBuff) {
          addLog(
            `⚡【強化消費】強化の効果でダメージ+${buffDamageBonus}！`,
            'BUFF_PLAYER',
            turn,
          );
        }

        if (anyExecutionActive) {
          if (judgmentActive) addLog(`⚖️【断罪執行】通常攻撃に断罪が発動。ダメージ×${getJudgmentDamageMultiplier(judgmentLevel).toFixed(2)}。`, 'PASSIVE_TRIGGER', turn);
          resonanceExecutionIds.forEach(id => {
            const resonance = attackResonances.find(item => item.id === id);
            const execution = resonance ? getResonanceExecutionStats(id, resonance.level) : null;
            if (execution) addLog(`⚖️【${id === 'ABYSS_JUDGMENT' ? '深淵断罪' : id === 'JUDGMENT_WING' ? '断罪翼' : id === 'FALLEN_JUDGMENT' ? '堕天審判' : '王権断罪'}執行】倍率×${execution.multiplier} / 防御無視${Math.round(execution.defenseIgnore * 100)}% / 現在HP追加${Math.round(execution.currentHpBonus * 100)}%。`, 'PASSIVE_TRIGGER', turn);
          });
        }

        if (isCritical) {
          soundManager.playCritical();
        } else {
          soundManager.playAttack();
        }

        const armorNote = heavyArmorTriggered
          ? `（カイザーの【重装】により${GAME_BALANCE.KAISER_HEAVY_ARMOR_REDUCTION}軽減！）`
          : '';
        if (isCritical) {
          addLog(
            `💥【会心の一撃】クリティカル！ ${actor.character.name}の猛撃！ ${target.character.name}に ${finalDamage} の大ダメージ！${armorNote}`,
            isActorPlayer ? 'CRITICAL_PLAYER' : 'CRITICAL_ENEMY',
            turn
          );
        } else {
          addLog(
            `⚔️ ${actor.character.name}の攻撃！ ${target.character.name}に ${finalDamage} のダメージ！${armorNote}`,
            isActorPlayer ? 'PLAYER_ACTION' : 'ENEMY_ACTION',
            turn
          );
        }

        if (executionForHit) {
          addLog('🩸【堕天・終局】5%以下のいれーなが、次の攻撃に即死効果を宿した！', 'PASSIVE_TRIGGER', turn);
        }

        const newTargetHp = hitOutcome.targetHp;
        updateState(prev => ({
          ...prev,
          player: isActorPlayer ? prev.player : { ...prev.player, currentHp: newTargetHp },
          enemy: isActorPlayer ? { ...prev.enemy, currentHp: newTargetHp } : prev.enemy,
          visualEffect: {
            targetIsPlayer: !isActorPlayer,
            damage: finalDamage,
            effectType: 'NORMAL_HIT',
            isCritical,
            isEvade: false,
            isBuff: false,
            isUltimate: false,
            actorName: actor.character.name,
            skillName: '通常攻撃',
            statusAilmentName: '',
            bannerText: isCritical ? `💥 クリティカル！ -${finalDamage} DMG` : `-${finalDamage} DMG`,
            effectId: nextVisualEffectId.current++,
          },
        }));

        await sleep(850 / speed);
        updateState(prev => ({ ...prev, visualEffect: null }));

        if (judgmentActive) {
          judgmentReadyRef.current = false;
          judgmentMarksRef.current = 0;
          updateState(prev => ({ ...prev, judgmentReady: false }));
          addLog('⚖️【断罪執行完了】断罪の力が解放された。', 'PASSIVE_TRIGGER', turn);
        }
        finishResonanceJudgmentExecution(turn, resonanceExecutionIds);
        if (isActorPlayer) {
          if (!resonanceExecutionIds.includes('FALLEN_JUDGMENT')) {
            addResonanceJudgmentMarks(isCritical ? 2 : 1, turn, '通常攻撃命中', ['FALLEN_JUDGMENT']);
          }
          if (!resonanceExecutionIds.includes('KING_JUDGMENT')) {
            addResonanceJudgmentMarks(1, turn, '通常攻撃命中', ['KING_JUDGMENT']);
          }
          if (!judgmentActive && hasAbility(stateRef.current.battleConfig, 'JUDGMENT')) {
            addJudgmentMarks(isCritical ? 2 : 1, turn);
          }
        }

        // A successful Irena normal hit builds Feather power with diminishing random gains.
        if (actor.character.id === 'irena') {
          const currentCount = isActorPlayer
            ? stateRef.current.player.featherChargeCount
            : stateRef.current.enemy.featherChargeCount;
          const currentBonus = isActorPlayer
            ? stateRef.current.player.featherChargeBonus
            : stateRef.current.enemy.featherChargeBonus;
          const skillLevel = actor.character.featherSkillLevel || 1;
          const maxChargeCount = getIrenaFeatherMaxChargeCount(skillLevel);

          if (currentCount >= maxChargeCount) {
            addLog(
              '🪶【羽弾蓄積MAX】蓄積上限 ' + maxChargeCount + '回に到達している！ さらに通常攻撃してもチャージは増えない。',
              isActorPlayer ? 'PLAYER_ACTION' : 'ENEMY_ACTION',
              turn
            );
          } else {
            const gain = rollIrenaFeatherChargeGain(currentCount);
            const nextBonus = currentBonus + gain;
            updateState(prev => (isActorPlayer
              ? {
                  ...prev,
                  player: {
                    ...prev.player,
                    featherChargeBonus: prev.player.featherChargeBonus + gain,
                    featherChargeCount: prev.player.featherChargeCount + 1,
                  },
                }
              : {
                  ...prev,
                  enemy: {
                    ...prev.enemy,
                    featherChargeBonus: prev.enemy.featherChargeBonus + gain,
                    featherChargeCount: prev.enemy.featherChargeCount + 1,
                  },
                }
            ));
            addLog(
              '🪶【羽弾蓄積】通常攻撃成功！ 羽弾ダメージ+' + gain + '（累計+' + nextBonus + '）',
              isActorPlayer ? 'PLAYER_ACTION' : 'ENEMY_ACTION',
              turn
            );
          }
        }

        if (newTargetHp <= 0) return false;
        return true;
      }

      case 'SPECIAL': {
        const activeResonancesForSpecial = getEquippedResonanceAbilities(stateRef.current.battleConfig);
        const isSuperFallenShot =
          isActorPlayer &&
          actor.character.id === 'irena' &&
          specialSkillId === 'SUPER_FALLEN_SHOT';

        if (isSuperFallenShot && !actor.isSuperFallenShotCharging) {
          const skillLevel = actor.character.featherSkillLevel || 1;
          const multiplier = getIrenaSuperFallenShotMultiplier(skillLevel);
          const effectId = nextVisualEffectId.current++;

          updateState(prev => ({
            ...prev,
            player: isActorPlayer
              ? {
                  ...prev.player,
                  isSuperFallenShotCharging: true,
                  specialCooldownRemaining: IRENA_SUPER_FALLEN_SHOT_COOLDOWN,
                  isEvading: false,
                }
              : prev.player,
            visualEffect: {
              targetIsPlayer: true,
              damage: 0,
              effectType: 'SUPER_FALLEN_CHARGE',
              isCritical: false,
              isEvade: false,
              isBuff: false,
              isUltimate: false,
              actorName: actor.character.name,
              skillName: '超堕天撃',
              statusAilmentName: '',
              bannerText: '⚡🪶『超堕天撃』CHARGE',
              effectId,
            },
          }));

          gainUltimateGauge(isActorPlayer, actor.character.name, '特殊技『超堕天撃』充填開始', turn);
          addLog(
            `⚡🪶【超堕天撃・充填】${actor.character.name}は力を一点に集中している！ 次のターンに発射（倍率×${multiplier.toFixed(1)}）。充填中は防御力0。`,
            'SPECIAL_PLAYER',
            turn,
          );

          return true;
        }

        if (isSuperFallenShot && actor.isSuperFallenShotCharging) {
          const skillLevel = actor.character.featherSkillLevel || 1;
          const multiplier = getIrenaSuperFallenShotMultiplier(skillLevel);
          const hadBuff = actor.isBuffed;
          const buffDamageBonus = actor.buffDamageBonus || GAME_BALANCE.BUFF_DAMAGE_BONUS;

          updateState(prev => ({
            ...prev,
            player: {
              ...prev.player,
              isSuperFallenShotCharging: false,
              specialCooldownRemaining: IRENA_SUPER_FALLEN_SHOT_COOLDOWN,
            },
          }));

          if (hadBuff) {
            consumeBuff(isActorPlayer);
          }

          const resonanceExecutionIds = isActorPlayer ? getReadyResonanceExecutionIds('SPECIAL', 'SUPER_FALLEN_SHOT') : [];
          const judgmentActive = isActorPlayer && judgmentReadyRef.current;
          let finalDamage = calculateSpecialDamage({
            attacker: actor,
            target,
            config: stateRef.current.battleConfig,
            turn,
            isActingFirst,
            judgmentReady: judgmentActive,
            resonanceJudgmentMarks: resonanceJudgmentMarksRef.current,
            resonanceJudgmentReadyIds: resonanceExecutionIds,
            specialSkillId: 'SUPER_FALLEN_SHOT',
            alreadyPrepared: true,
            baseAttackerMaxHp: baseActorMaxHp,
          });

          if (hadBuff) {
            addLog(
              `⚡【強化消費】『超堕天撃』のダメージ+${buffDamageBonus}！（計: ${finalDamage}）`,
              'BUFF_PLAYER',
              turn,
            );
          }

          let isEvaded = false;
          if (target.isEvading) {
            const foresightTriggered = tryTriggerForesight(isActorPlayer, target, 'SPECIAL', turn);
            isEvaded = foresightTriggered || Math.random() < target.character.evasionRate;
            if (isEvaded) {
              soundManager.playDefend();
              addLog(
                `💨【回避成功！】${target.character.name}は『超堕天撃』を完全に回避した！`,
                'EVADE_SUCCESS_ENEMY',
                turn
              );
            } else {
              addLog(
                `⚠️【回避失敗！】${target.character.name}は『超堕天撃』を避け切れなかった！`,
                'EVADE_FAIL_ENEMY',
                turn,
              );
            }
          }

          // Show the cut-in without waiting for it to finish before resolving the hit.
          const effectId = nextVisualEffectId.current++;
          updateState(prev => ({
            ...prev,
            visualEffect: {
              targetIsPlayer: !isActorPlayer,
              damage: 0,
              effectType: 'SUPER_FALLEN_SHOT',
              isCritical: false,
              isEvade: isEvaded,
              isBuff: false,
              isUltimate: false,
              actorName: actor.character.name,
              skillName: '超堕天撃',
              statusAilmentName: '',
              bannerText: isEvaded
                ? '💨『超堕天撃』MISS!'
                : '⚡🪶『超堕天撃』発射！',
              effectId,
            },
          }));
          if (isEvaded) return true;

          const activeResonancesForShot = getEquippedResonanceAbilities(stateRef.current.battleConfig);
          const resonanceFallenExecution = activeResonancesForShot.some(resonance =>
            ['FALLEN_GOD', 'FALLEN_WING', 'FALLEN_JUDGMENT', 'ABYSS_FALLEN'].includes(resonance.id),
          );
          const executionForHit =
            isActorPlayer &&
            (hasAbility(stateRef.current.battleConfig, 'FALLEN') || resonanceFallenExecution) &&
            target.currentHp > 0 &&
            actor.currentHp > 1 &&
            actor.currentHp <= baseActorMaxHp * 0.05;
          const hitOutcome = resolveKaiserDamage(target, finalDamage, turn, executionForHit ? '堕天・終局' : '超堕天撃');
          finalDamage = hitOutcome.damage;

          addLog(
            `⚡🪶【超堕天撃】${actor.character.name}が電撃をまとった羽弾を撃ち出す！ ${target.character.name}に ${finalDamage} ダメージ！（倍率×${multiplier.toFixed(1)}）`,
            'SPECIAL_PLAYER',
            turn,
          );

          const newTargetHp = hitOutcome.targetHp;

          updateState(prev => ({
            ...prev,
            player: isActorPlayer ? prev.player : { ...prev.player, currentHp: newTargetHp },
            enemy: isActorPlayer ? { ...prev.enemy, currentHp: newTargetHp } : prev.enemy,
            visualEffect: prev.visualEffect?.effectId === effectId
              ? {
                  ...prev.visualEffect,
                  damage: finalDamage,
                  bannerText: `⚡🪶『超堕天撃』-${finalDamage}!`,
                }
              : prev.visualEffect,
          }));

          if (judgmentActive) {
            judgmentReadyRef.current = false;
            judgmentMarksRef.current = 0;
            updateState(prev => ({ ...prev, judgmentReady: false }));
          }
          finishResonanceJudgmentExecution(turn, resonanceExecutionIds);
          if (isActorPlayer) {
            if (!resonanceExecutionIds.includes('FALLEN_JUDGMENT')) addResonanceJudgmentMarks(2, turn, '超堕天撃命中', ['FALLEN_JUDGMENT']);
            if (!resonanceExecutionIds.includes('KING_JUDGMENT')) addResonanceJudgmentMarks(1, turn, '超堕天撃命中', ['KING_JUDGMENT']);
            if (!resonanceExecutionIds.includes('JUDGMENT_WING')) addResonanceJudgmentMarks(1, turn, '超堕天撃命中', ['JUDGMENT_WING']);
            if (!judgmentActive && hasAbility(stateRef.current.battleConfig, 'JUDGMENT')) addJudgmentMarks(2, turn);
          }
          if (isActorPlayer && !isEvaded) {
            const immediateErosion = getEquippedResonanceAbilities(stateRef.current.battleConfig)
              .reduce((sum, resonance) => sum + getFeatherErosionRate(resonance.id, resonance.level), 0);
            if (immediateErosion > 0) applyResonanceErosion(immediateErosion, turn, '超堕天撃命中');
          }

          if (newTargetHp <= 0) return false;
          return true;
        }

        const isIrenaSpecial = actor.character.id === 'irena';
        const featherSplitMode =
          isActorPlayer &&
          isIrenaSpecial &&
          stateRef.current.battleConfig.imprints?.includes('FEATHER_SPLIT')
            ? getFeatherSplitModeForSkill(specialSkillId)
            : null;
        const isAlternatingSplitAttack = Boolean(
          featherSplitMode &&
          actor.lastFeatherSplitMode &&
          featherSplitMode !== actor.lastFeatherSplitMode
        );
        const irenaSkillLevel = actor.character.featherSkillLevel || 1;
        const irenaSkillPath = actor.character.featherSkillPath || null;
        const featherChargeBonus = isIrenaSpecial ? actor.featherChargeBonus : 0;
        const chargeRetentionRate =
          irenaSkillPath === 'CHARGE'
            ? irenaSkillLevel >= 10
              ? 0.45
              : irenaSkillLevel >= 7
                ? 0.35
                : 0.25
            : 0;
        const retainedFeatherCharge = isIrenaSpecial
          ? Math.floor(featherChargeBonus * chargeRetentionRate)
          : 0;

        // The Charge route turns Feather into a renewable resource instead of a full reset.
        if (isIrenaSpecial) {
          if (irenaSkillPath === 'CHARGE' && retainedFeatherCharge > 0) {
            claimPathMasteryReward('FEATHER_CHARGE', '羽弾・蓄積', turn);
          }
          updateState(prev => (isActorPlayer
            ? {
                ...prev,
                player: {
                  ...prev.player,
                  featherChargeBonus: retainedFeatherCharge,
                  featherChargeCount: 0,
                },
              }
            : {
                ...prev,
                enemy: {
                  ...prev.enemy,
                  featherChargeBonus: retainedFeatherCharge,
                  featherChargeCount: 0,
                },
              }
          ));
        }

        const hadBuff = actor.isBuffed;
        const buffDamageBonus = actor.buffDamageBonus || GAME_BALANCE.BUFF_DAMAGE_BONUS;
        if (hadBuff) {
          consumeBuff(isActorPlayer);
        }

        const skillName = featherSplitMode === 'PIERCE'
          ? '穿羽'
          : featherSplitMode === 'RAPID'
            ? '連羽'
            : actor.character.specialSkillName;
        if (isAlternatingSplitAttack) {
          addLog(
            `🪽【羽撃ち分け・交互ボーナス】${skillName}へ切替！ 威力補正+${Math.round(FEATHER_SPLIT_ALTERNATION_BONUS * 100)}%。`,
            'PASSIVE_TRIGGER',
            turn,
          );
        }
        let baseDamage = actor.character.specialSkillDamage;
        if (featherChargeBonus > 0) {
          baseDamage += featherChargeBonus;
          addLog(
            '🪶【羽弾解放】蓄積した羽の力を放つ！ +' + featherChargeBonus + '（合計: ' + baseDamage + 'ダメージ）',
            'SPECIAL_PLAYER',
            turn
          );
        }
        if (hadBuff) {
          baseDamage += buffDamageBonus;
          addLog(`⚡【強化消費】強化の効果で『${skillName}』のダメージ+${buffDamageBonus}！`, 'BUFF_PLAYER', turn);
        }

        // Special gives +1 ultimate gauge
        gainUltimateGauge(isActorPlayer, actor.character.name, `特殊技『${skillName}』使用`, turn);

        // Each Feather Split form tracks its cooldown independently. Other specials retain the legacy shared timer.
        if (featherSplitMode) {
          const splitCooldown = featherSplitMode === 'PIERCE'
            ? FEATHER_SPLIT_PIERCE_COOLDOWN
            : FEATHER_SPLIT_RAPID_COOLDOWN;
          updateState(prev => ({
            ...prev,
            player: {
              ...prev.player,
              ...(featherSplitMode === 'PIERCE'
                ? { featherPierceCooldownRemaining: splitCooldown }
                : { featherRapidCooldownRemaining: splitCooldown }),
              lastFeatherSplitMode: featherSplitMode,
            },
          }));
        } else {
          updateState(prev => (isActorPlayer
            ? { ...prev, player: { ...prev.player, specialCooldownRemaining: actor.character.specialSkillCooldown } }
            : { ...prev, enemy: { ...prev.enemy, specialCooldownRemaining: actor.character.specialSkillCooldown } }
          ));
        }

        // Check opponent evasion
        if (target.isEvading || (!isActorPlayer && target.isPlayer && playerEvadeSelectedRef.current)) {
          const foresightTriggered = tryTriggerForesight(isActorPlayer, target, action, turn);
          const isEvaded = foresightTriggered || Math.random() < target.character.evasionRate;
          if (isEvaded) {
            soundManager.playDefend();
            addLog(
              `💨【回避成功！】${target.character.name}は身をかわし、${actor.character.name}の特殊技を完全に回避した！`,
              isActorPlayer ? 'EVADE_SUCCESS_ENEMY' : 'EVADE_SUCCESS_PLAYER',
              turn
            );
            gainUltimateGauge(!isActorPlayer, target.character.name, '回避成功', turn);

            updateState(prev => ({
              ...prev,
              visualEffect: {
                targetIsPlayer: !isActorPlayer,
                damage: 0,
                effectType: 'EVADE_DODGE',
                isCritical: false,
                isEvade: true,
                isBuff: false,
                isUltimate: false,
                actorName: target.character.name,
                skillName: '回避成功',
                statusAilmentName: '',
                bannerText: '💨 回避成功！ 0 DMG',
                effectId: nextVisualEffectId.current++,
              },
            }));

            await sleep(850 / speed);
            updateState(prev => ({ ...prev, visualEffect: null }));
            return true;
          } else {
            addLog(
              `⚠️【回避失敗！】${target.character.name}は回避を試みたが間に合わず、攻撃を受けた！`,
              isActorPlayer ? 'EVADE_FAIL_ENEMY' : 'EVADE_FAIL_PLAYER',
              turn
            );
          }
        }

        const judgmentLevel = isActorPlayer
          ? getAbilityLevel(stateRef.current.battleConfig, 'JUDGMENT')
          : 0;
        const resonanceExecutionIds = isActorPlayer ? getReadyResonanceExecutionIds('SPECIAL', specialSkillId ?? 'FEATHER') : [];
        const judgmentActive = isActorPlayer && judgmentReadyRef.current;
        const calculatedDamage = calculateSpecialDamage({
          attacker: actor,
          target,
          config: stateRef.current.battleConfig,
          turn,
          isActingFirst,
          judgmentReady: judgmentActive,
          resonanceJudgmentMarks: resonanceJudgmentMarksRef.current,
          resonanceJudgmentReadyIds: resonanceExecutionIds,
          specialSkillId: specialSkillId ?? 'FEATHER',
          alreadyPrepared: true,
          baseAttackerMaxHp: baseActorMaxHp,
        });
        const resonanceFallenExecution = activeResonancesForSpecial.some(resonance =>
          ['FALLEN_GOD', 'FALLEN_WING', 'FALLEN_JUDGMENT', 'ABYSS_FALLEN'].includes(resonance.id),
        );
        const executionForHit =
          isActorPlayer &&
          (hasAbility(stateRef.current.battleConfig, 'FALLEN') || resonanceFallenExecution) &&
          target.currentHp > 0 &&
          actor.currentHp > 1 &&
          actor.currentHp <= baseActorMaxHp * 0.05;
        let finalDamage = applyYinYangDefenseToDamage(isActorPlayer, target, calculatedDamage, turn);
        const hitOutcome = resolveKaiserDamage(target, finalDamage, turn, executionForHit ? '堕天・終局' : '特殊技');
        finalDamage = hitOutcome.damage;

        if (isIrenaSpecial && getAbilityLevel(stateRef.current.battleConfig, 'BLACK_WING') >= 5) {
          addLog('🪽【黒翼】羽弾の最終ダメージが5倍になった！', 'PASSIVE_TRIGGER', turn);
        }
        if (isIrenaSpecial && irenaSkillLevel >= 4 && irenaSkillPath === 'ABYSS' && featherChargeBonus >= 150) {
          claimPathMasteryReward('FEATHER_ABYSS', '羽弾・深淵', turn);
          const abyssBonus = 100 + Math.max(0, irenaSkillLevel - 4) * 25;
          addLog(
            `🌑【羽弾・深淵】高密度の羽が炸裂！ 追加ダメージ+${abyssBonus}`,
            isActorPlayer ? 'SPECIAL_PLAYER' : 'SPECIAL_ENEMY',
            turn
          );
        }
        if (
          isIrenaSpecial &&
          irenaSkillLevel >= 4 &&
          irenaSkillPath === 'JUDGMENT' &&
          target.activeAilments.some(a => a.type === 'BLEED')
        ) {
          claimPathMasteryReward('FEATHER_JUDGMENT', '羽弾・断罪', turn);
          const judgmentBonus = 100 + Math.max(0, irenaSkillLevel - 4) * 25;
          addLog(
            `⚖️【羽弾・断罪】出血した敵を穿つ！ 追加ダメージ+${judgmentBonus}`,
            isActorPlayer ? 'SPECIAL_PLAYER' : 'SPECIAL_ENEMY',
            turn
          );
        }
        if (judgmentActive) {
          addLog(
            `⚖️【断罪執行】特殊技にも断罪が宿った！ ダメージ×${getJudgmentDamageMultiplier(judgmentLevel).toFixed(2)}`,
            'PASSIVE_TRIGGER',
            turn,
          );
        }

        if (actor.character.id === 'irena') {
          soundManager.playFeatherShot();
        } else {
          soundManager.playHeavyStrike();
        }

        addLog(
          `✨ ${actor.character.name}の特殊技『${skillName}』発動！ ${target.character.name}に ${finalDamage} の大ダメージ！`,
          isActorPlayer ? 'SPECIAL_PLAYER' : 'SPECIAL_ENEMY',
          turn
        );

        // Apply 100% Status Ailment upon hit or convert the bleed into Blood Tear's burst.
        const statusOutcome = applySpecialStatusAilment(actor, !isActorPlayer, turn);

        const resonanceFallenExecution = activeResonancesForSpecial.some(resonance =>
          ['FALLEN_GOD', 'FALLEN_WING', 'FALLEN_JUDGMENT', 'ABYSS_FALLEN'].includes(resonance.id),
        );
        const fallenExecution =
          isActorPlayer &&
          (hasAbility(stateRef.current.battleConfig, 'FALLEN') || resonanceFallenExecution) &&
          target.currentHp > 0 &&
          actor.currentHp > 1 &&
          actor.currentHp <= baseActorMaxHp * 0.05;

        if (fallenExecution) {
          addLog('🩸【堕天・終局】5%以下のいれーなの特殊技に即死効果が発動した！', 'PASSIVE_TRIGGER', turn);
        }

        const newTargetHp = hitOutcome.targetHp;
        const appliedAilmentName = STATUS_AILMENTS[actor.character.id === 'irena' ? 'BLEED' : actor.character.id === 'stella' ? 'STAR_ECLIPSE' : 'PRESSURE'].displayName;
        const effType: EffectType = actor.character.id === 'irena'
          ? 'SPECIAL_FEATHER'
          : actor.character.id === 'stella'
            ? 'SPECIAL_STELLAR'
            : 'SPECIAL_SMASH';

        updateState(prev => ({
          ...prev,
          player: isActorPlayer ? prev.player : { ...prev.player, currentHp: newTargetHp },
          enemy: isActorPlayer ? { ...prev.enemy, currentHp: newTargetHp } : prev.enemy,
          visualEffect: {
            targetIsPlayer: !isActorPlayer,
            damage: finalDamage,
            effectType: effType,
            isCritical: false,
            isEvade: false,
            isBuff: false,
            isUltimate: false,
            actorName: actor.character.name,
            skillName: statusOutcome.bloodTearBurstDamage > 0 ? '血裂' : skillName,
            statusAilmentName: statusOutcome.bloodTearBurstDamage > 0 ? '' : appliedAilmentName,
            statusAilmentDuration: statusOutcome.appliedAilmentDuration ?? undefined,
            bannerText: statusOutcome.bloodTearBurstDamage > 0
              ? `🩸『血裂』出血凝縮を開始 · 羽弾-${finalDamage}`
              : `✨『${skillName}』-${finalDamage} [${appliedAilmentName}付与]`,
            effectId: nextVisualEffectId.current++,
          },
        }));

        await sleep(850 / speed);
        updateState(prev => ({ ...prev, visualEffect: null }));

        let postSpecialTargetHp = newTargetHp;
        if (statusOutcome.bloodTearBurstDamage > 0 && newTargetHp > 0) {
          let burstDamage = statusOutcome.bloodTearBurstDamage;
          const burstTarget = { ...target, currentHp: newTargetHp };
          soundManager.playCritical();
          const bloodTearOutcome = resolveKaiserDamage(burstTarget, burstDamage, turn, '血裂');
          burstDamage = bloodTearOutcome.damage;
          const bloodTearTargetHp = bloodTearOutcome.targetHp;
          updateState(prev => ({
            ...prev,
            player: isActorPlayer ? prev.player : { ...prev.player, currentHp: bloodTearTargetHp },
            enemy: isActorPlayer ? { ...prev.enemy, currentHp: bloodTearTargetHp } : prev.enemy,
            visualEffect: {
              targetIsPlayer: !isActorPlayer,
              damage: burstDamage,
              effectType: 'NORMAL_HIT',
              isCritical: false,
              isEvade: false,
              isBuff: false,
              isUltimate: false,
              actorName: actor.character.name,
              skillName: '血裂',
              statusAilmentName: '',
              bannerText: `🩸『血裂』-${burstDamage} DMG`,
              effectId: nextVisualEffectId.current++,
            },
          }));
          await sleep(850 / speed);
          updateState(prev => ({ ...prev, visualEffect: null }));
          postSpecialTargetHp = bloodTearTargetHp;
        }

        if (judgmentActive) {
          judgmentReadyRef.current = false;
          judgmentMarksRef.current = 0;
          updateState(prev => ({ ...prev, judgmentReady: false }));
          addLog('⚖️【断罪執行完了】断罪の力が解放された。', 'PASSIVE_TRIGGER', turn);
        }
        finishResonanceJudgmentExecution(turn, resonanceExecutionIds);
        if (isActorPlayer) {
          if (!resonanceExecutionIds.includes('FALLEN_JUDGMENT')) addResonanceJudgmentMarks(2, turn, '特殊技命中', ['FALLEN_JUDGMENT']);
          if (!resonanceExecutionIds.includes('KING_JUDGMENT')) addResonanceJudgmentMarks(1, turn, '特殊技命中', ['KING_JUDGMENT']);
          if (isIrenaSpecial && !resonanceExecutionIds.includes('JUDGMENT_WING')) addResonanceJudgmentMarks(1, turn, '羽弾命中', ['JUDGMENT_WING']);
          if (!judgmentActive && hasAbility(stateRef.current.battleConfig, 'JUDGMENT')) addJudgmentMarks(2, turn);
        }
        if (isActorPlayer && isIrenaSpecial) {
          const immediateErosion = getEquippedResonanceAbilities(stateRef.current.battleConfig)
            .reduce((sum, resonance) => sum + getFeatherErosionRate(resonance.id, resonance.level), 0);
          if (immediateErosion > 0) applyResonanceErosion(immediateErosion, turn, '羽弾命中');
        }

        if (newTargetHp <= 0 || postSpecialTargetHp <= 0) return false;
        return true;
      }

      case 'ULTIMATE': {
        const hadBuff = actor.isBuffed;
        const buffDamageBonus = actor.buffDamageBonus || GAME_BALANCE.BUFF_DAMAGE_BONUS;
        if (hadBuff) {
          consumeBuff(isActorPlayer);
        }

        const isIrena = actor.character.id === 'irena';
        const appliedIrenaVariant = isIrena ? ultimateVariant : undefined;
        const skillName = isIrena
          ? appliedIrenaVariant === 'ALL_GODS'
            ? '全神の権能'
            : appliedIrenaVariant === 'RUIN'
              ? '破壊の権能'
              : appliedIrenaVariant === 'OMNIPOTENCE'
                ? '全能の一撃'
                : actor.character.ultimateSkillName
          : actor.character.ultimateSkillName;
        if (isIrena && appliedIrenaVariant === 'RUIN') {
          const ruinLevel = actor.character.ruinSkillLevel || 1;
          const ruinPath = actor.character.ruinSkillPath || null;
          if (
            ruinLevel >= 4 &&
            ruinPath === 'EXECUTION' &&
            target.currentHp <= target.character.maxHp * (ruinLevel >= 10 ? 0.5 : ruinLevel >= 7 ? 0.45 : 0.4)
          ) {
            claimPathMasteryReward('RUIN_EXECUTION', '破壊・処刑', turn);
            const executionBonus = 150 + Math.max(0, ruinLevel - 4) * 30;
            addLog(
              `☠️【破壊・処刑】瀕死の敵を断ち切る！ 追加ダメージ+${executionBonus}`,
              isActorPlayer ? 'ULTIMATE_PLAYER' : 'ULTIMATE_ENEMY',
              turn
            );
          } else if (
            ruinLevel >= 4 &&
            ruinPath === 'ANNIHILATION' &&
            target.activeAilments.some(a => a.type === 'BLEED')
          ) {
            claimPathMasteryReward('RUIN_ANNIHILATION', '破壊・殲滅', turn);
            const annihilationBonus = 150 + Math.max(0, ruinLevel - 4) * 30;
            addLog(
              `🩸【破壊・殲滅】出血した敵へ権能が共鳴！ 追加ダメージ+${annihilationBonus}`,
              isActorPlayer ? 'ULTIMATE_PLAYER' : 'ULTIMATE_ENEMY',
              turn
            );
          }
        }

        if (hadBuff) {
          addLog(
            `⚡【強化消費】強化の効果で必殺技『${skillName}』のダメージ+${buffDamageBonus}！`,
            'BUFF_PLAYER',
            turn
          );
        }

        // Reset ultimate gauge to 0
        updateState(prev => (isActorPlayer
          ? { ...prev, player: { ...prev.player, ultimateGauge: 0 } }
          : { ...prev, enemy: { ...prev.enemy, ultimateGauge: 0 } }
        ));

        addLog(`🔥 ${actor.character.name}は必殺技ゲージを全て解放した！（ゲージ 0/3）`, 'GAUGE_CHANGE', turn);

        // Irena authority effects use the same existing ultimate visual effect.
        if (isIrena && appliedIrenaVariant === 'ALL_GODS') {
          const strongBuff = GAME_BALANCE.ALL_GODS_BUFF_DAMAGE;
          updateState(prev => (isActorPlayer
            ? { ...prev, player: { ...prev.player, isBuffed: true, buffDamageBonus: strongBuff } }
            : { ...prev, enemy: { ...prev.enemy, isBuffed: true, buffDamageBonus: strongBuff } }
          ));
          addLog(
            `✨【全神の権能】${actor.character.name}は神性を極限まで高めた！ 次の攻撃系行動のダメージ+${strongBuff}！`,
            isActorPlayer ? 'ULTIMATE_PLAYER' : 'ULTIMATE_ENEMY',
            turn
          );
          soundManager.playCritical();
          soundManager.playFeatherShot();
          updateState(prev => ({
            ...prev,
            visualEffect: {
              targetIsPlayer: isActorPlayer,
              damage: 0,
              effectType: 'ULTIMATE_BLAST',
              isCritical: false,
              isEvade: false,
              isBuff: false,
              isUltimate: true,
              actorName: actor.character.name,
              skillName: '全神の権能',
              statusAilmentName: '',
              bannerText: `✨『全神の権能』強化 +${strongBuff}！`,
              effectId: nextVisualEffectId.current++,
            },
          }));
          await sleep(1300 / speed);
          updateState(prev => ({ ...prev, visualEffect: null }));
          return true;
        }

        // Check opponent evasion
        if (target.isEvading || (!isActorPlayer && target.isPlayer && playerEvadeSelectedRef.current)) {
          const foresightTriggered = tryTriggerForesight(isActorPlayer, target, action, turn);
          const isEvaded = foresightTriggered || Math.random() < target.character.evasionRate;
          if (isEvaded) {
            soundManager.playDefend();
            addLog(
              `💨【回避成功！】${target.character.name}は神速で身をかわし、${actor.character.name}の必殺技を完全に回避した！`,
              isActorPlayer ? 'EVADE_SUCCESS_ENEMY' : 'EVADE_SUCCESS_PLAYER',
              turn
            );
            gainUltimateGauge(!isActorPlayer, target.character.name, '回避成功', turn);

            updateState(prev => ({
              ...prev,
              visualEffect: {
                targetIsPlayer: !isActorPlayer,
                damage: 0,
                effectType: 'EVADE_DODGE',
                isCritical: false,
                isEvade: true,
                isBuff: false,
                isUltimate: false,
                actorName: target.character.name,
                skillName: '回避成功',
                statusAilmentName: '',
                bannerText: '💨 回避成功！ 0 DMG',
                effectId: nextVisualEffectId.current++,
              },
            }));

            await sleep(850 / speed);
            updateState(prev => ({ ...prev, visualEffect: null }));
            return true;
          } else {
            addLog(
              `⚠️【回避失敗！】${target.character.name}は回避を試みたが間に合わず、攻撃を受けた！`,
              isActorPlayer ? 'EVADE_FAIL_ENEMY' : 'EVADE_FAIL_PLAYER',
              turn
            );
          }
        }

        const resonanceExecutionIds = isActorPlayer ? getReadyResonanceExecutionIds('ULTIMATE') : [];
        const activeResonancesForUltimate = getEquippedResonanceAbilities(stateRef.current.battleConfig);
        const resonanceFallenExecution = activeResonancesForUltimate.some(resonance =>
          ['FALLEN_GOD', 'FALLEN_WING', 'FALLEN_JUDGMENT', 'ABYSS_FALLEN'].includes(resonance.id),
        );
        const judgmentActive = isActorPlayer && judgmentReadyRef.current;
        const baseCalculatedDamage = calculateUltimateDamage({
          attacker: actor,
          target,
          config: stateRef.current.battleConfig,
          turn,
          isActingFirst,
          judgmentReady: judgmentActive,
          resonanceJudgmentMarks: resonanceJudgmentMarksRef.current,
          resonanceJudgmentReadyIds: resonanceExecutionIds,
          ultimateVariant: appliedIrenaVariant,
          alreadyPrepared: true,
          baseAttackerMaxHp: baseActorMaxHp,
        });
        const starfallTriggered = Boolean(
          isActorPlayer &&
          baseCalculatedDamage > 0 &&
          appliedIrenaVariant !== 'ALL_GODS' &&
          stateRef.current.battleConfig.imprints?.includes('STARFALL') &&
          !stateRef.current.usedImprints.includes('STARFALL')
        );
        const calculatedDamage = starfallTriggered ? Math.round(baseCalculatedDamage * 1.35) : baseCalculatedDamage;
        if (starfallTriggered) {
          addLog('✦【星墜の印】星の力が必殺技に重なり、ダメージ×1.35！', 'PASSIVE_TRIGGER', turn);
        }
        const executionForHit =
          isActorPlayer &&
          (hasAbility(stateRef.current.battleConfig, 'FALLEN') || resonanceFallenExecution) &&
          target.currentHp > 0 &&
          actor.currentHp > 1 &&
          actor.currentHp <= baseActorMaxHp * 0.05;
        let finalDamage = applyYinYangDefenseToDamage(isActorPlayer, target, calculatedDamage, turn);
        const hitOutcome = resolveKaiserDamage(target, finalDamage, turn, executionForHit ? '堕天・終局' : '必殺技');
        finalDamage = hitOutcome.damage;

        const judgmentLevel = isActorPlayer
          ? getAbilityLevel(stateRef.current.battleConfig, 'JUDGMENT')
          : 0;
        if (judgmentActive) {
          addLog(
            `⚖️【断罪執行】必殺技に断罪が発動。ダメージ×${getJudgmentDamageMultiplier(judgmentLevel).toFixed(2)}。`,
            'PASSIVE_TRIGGER',
            turn,
          );
        }
        resonanceExecutionIds.forEach(id => {
          const resonance = activeResonancesForUltimate.find(item => item.id === id);
          const execution = resonance ? getResonanceExecutionStats(id, resonance.level) : null;
          if (execution) addLog(`⚖️【${id === 'ABYSS_JUDGMENT' ? '深淵断罪' : id === 'FALLEN_JUDGMENT' ? '堕天審判' : '王権断罪'}執行】倍率×${execution.multiplier} / 防御無視${Math.round(execution.defenseIgnore * 100)}% / 現在HP追加${Math.round(execution.currentHpBonus * 100)}%。`, 'PASSIVE_TRIGGER', turn);
        });

        const fallenExecution =
          isActorPlayer &&
          (hasAbility(stateRef.current.battleConfig, 'FALLEN') || resonanceFallenExecution) &&
          target.currentHp > 0 &&
          actor.currentHp > 1 &&
          actor.currentHp <= baseActorMaxHp * 0.05;

        if (fallenExecution) {
          addLog('🩸【堕天・終局】5%以下のいれーなが、必殺技に即死効果を宿した！', 'PASSIVE_TRIGGER', turn);
        }

        addLog(
          `💥 ${target.character.name}に ${finalDamage} の超絶ダメージ！`,
          isActorPlayer ? 'ULTIMATE_PLAYER' : 'ULTIMATE_ENEMY',
          turn
        );

        const newTargetHp = hitOutcome.targetHp;
        updateState(prev => ({
          ...prev,
          player: isActorPlayer ? prev.player : { ...prev.player, currentHp: newTargetHp },
          enemy: isActorPlayer ? { ...prev.enemy, currentHp: newTargetHp } : prev.enemy,
          usedImprints: starfallTriggered && !prev.usedImprints.includes('STARFALL')
            ? [...prev.usedImprints, 'STARFALL']
            : prev.usedImprints,
          visualEffect: {
            targetIsPlayer: !isActorPlayer,
            damage: finalDamage,
            effectType: 'ULTIMATE_BLAST',
            isCritical: false,
            isEvade: false,
            isBuff: false,
            isUltimate: true,
            actorName: actor.character.name,
            skillName,
            statusAilmentName: '',
            bannerText: `🌟『${skillName}』-${finalDamage}!`,
            effectId: nextVisualEffectId.current++,
          },
        }));

        await sleep((appliedIrenaVariant === 'RUIN' ? 5600 : 1300) / speed);
        updateState(prev => ({ ...prev, visualEffect: null }));

        if (judgmentActive) {
          judgmentReadyRef.current = false;
          judgmentMarksRef.current = 0;
          updateState(prev => ({ ...prev, judgmentReady: false }));
          addLog('⚖️【断罪執行完了】断罪の力が解放された。', 'PASSIVE_TRIGGER', turn);
        }
        finishResonanceJudgmentExecution(turn, resonanceExecutionIds);
        if (isActorPlayer) {
          if (!resonanceExecutionIds.includes('FALLEN_JUDGMENT')) addResonanceJudgmentMarks(3, turn, '必殺技命中', ['FALLEN_JUDGMENT']);
          if (!resonanceExecutionIds.includes('KING_JUDGMENT')) addResonanceJudgmentMarks(1, turn, '必殺技命中', ['KING_JUDGMENT']);
          if (!judgmentActive && hasAbility(stateRef.current.battleConfig, 'JUDGMENT')) addJudgmentMarks(3, turn);
        }

        if (newTargetHp <= 0) return false;
        return true;
      }
    }

    return true;
  };

  const finalizeBattle = (winnerIsPlayer: boolean) => {
    yinYangDefensePendingRef.current = false;
    const masteryBonus = battleMasteryRewardRef.current;
    const playerCharacterId = stateRef.current.player.character.id;
    const reward = playerCharacterId === 'irena' ? getBattleReward(winnerIsPlayer, masteryBonus) : 0;
    const saveOutcome = saveBattleResult(winnerIsPlayer, masteryBonus, playerCharacterId);
    if (winnerIsPlayer) {
      soundManager.playVictory();
      addLog('👑 あなたの勝利です！ おめでとうございます！', 'VICTORY', stateRef.current.turnNumber);
    } else {
      soundManager.playDefeat();
      addLog('💀 敗北しました... 再挑戦してみましょう！', 'DEFEAT', stateRef.current.turnNumber);
    }
    if (!saveOutcome.persisted) {
      addLog(
        '⚠️ 保存に失敗しました。今回の報酬は記録されていません。ブラウザの保存容量・保存設定を確認してください。',
        'SYSTEM',
        stateRef.current.turnNumber,
      );
    }
    updateState(prev => ({
      ...prev,
      phase: 'BATTLE_FINISHED',
      winnerIsPlayer,
      visualEffect: null,
      visualEffects: [],
      judgmentReady: false,
      isAnimating: false,
      lastBattleReward: saveOutcome.persisted ? reward : 0,
      lastBattleMasteryReward: masteryBonus,
    }));
  };

  const onActionSelected = useCallback(async (
    playerAction: PlayerBattleAction,
    ultimateVariant?: 'ALL_GODS' | 'RUIN' | 'OMNIPOTENCE',
    specialSkillId?: IrenaSpecialSkillId,
  ) => {
    if (stateRef.current.phase !== 'SELECT_ACTION') return;

    const player = stateRef.current.player;
    const isForcedSuperFallenShot =
      player.isSuperFallenShotCharging &&
      playerAction === 'SPECIAL' &&
      specialSkillId === 'SUPER_FALLEN_SHOT';

    // The charge turn is locked: only the automatic release is accepted.
    if (player.isSuperFallenShotCharging && !isForcedSuperFallenShot) return;

    // Resolve the selected mode's own cooldown when Feather Split is equipped. Other specials keep their legacy timer.
    const featherSplitEnabled =
      player.character.id === 'irena' &&
      Boolean(stateRef.current.battleConfig.imprints?.includes('FEATHER_SPLIT'));
    const selectedFeatherSplitMode = getFeatherSplitModeForSkill(specialSkillId);
    if (selectedFeatherSplitMode && !featherSplitEnabled) return;

    // Check prerequisites
    if (
      playerAction === 'SPECIAL' &&
      !isForcedSuperFallenShot &&
      getSpecialCooldownRemaining(player, specialSkillId ?? 'FEATHER', featherSplitEnabled) > 0
    ) return;
    if (
      specialSkillId === 'SUPER_FALLEN_SHOT' &&
      !isForcedSuperFallenShot &&
      !player.character.hasSuperFallenShot
    ) return;
    if (playerAction === 'ULTIMATE' && stateRef.current.player.ultimateGauge < 3) return;
    if (playerAction === 'YIN_YANG' && !stateRef.current.battleConfig.imprints?.includes('YIN_YANG')) return;
    if (
      playerAction === 'COSTLY_SHOT' &&
      (
        !stateRef.current.battleConfig.imprints?.includes('COSTLY_SHOT') ||
        getSpecialCooldownRemaining(player, specialSkillId ?? 'FEATHER', featherSplitEnabled) <= 0 ||
        player.currentHp <= COSTLY_SHOT_HP_COST ||
        player.isSuperFallenShotCharging
      )
    ) return;
    // Irena's Buff command was removed from the player UI; reject stale shortcuts/programmatic calls too.
    if (playerAction === 'BUFF' && stateRef.current.player.character.id === 'irena') return;

    // The chosen action is authoritative for the incoming response, even if a state update has not rendered yet.
    playerEvadeSelectedRef.current = playerAction === 'EVADE';
    const actionRunId = battleRunIdRef.current;
    updateState(prev => ({
      ...prev,
      playerActionsTaken: [...prev.playerActionsTaken, playerAction],
      phase: 'EXECUTING_TURNS',
      isAnimating: true,
      visualEffect: null,
      visualEffects: [],
      yinYangDefenseResult: playerAction === 'YIN_YANG' ? null : prev.yinYangDefenseResult,
      windGuardResult: null,
      bloodMediaHealResult: null,
      costlyShotResult: null,
    }));
    const speed = stateRef.current.battleSpeedMultiplier;
    const currentTurn = stateRef.current.turnNumber;

    // The CPU intent was selected at the end of the previous round and is now the
    // telegraphed action the player has been allowed to react to.
    const cpuAction = stateRef.current.cpuIntent;
    foresightTriggerPendingRef.current = shouldTriggerForesight({
      equippedImprints: stateRef.current.battleConfig.imprints,
      usedImprints: stateRef.current.usedImprints,
      attackerIsPlayer: false,
      targetIsPlayer: true,
      targetIsEvading: playerAction === 'EVADE',
      incomingAction: cpuAction,
      predictedAction: cpuAction,
    });

    addLog(`--- 第${currentTurn}ターン 開始 ---`, 'SYSTEM', currentTurn);

    // Set evading stances
    updateState(prev => ({
      ...prev,
      player: { ...prev.player, isEvading: playerAction === 'EVADE' },
      enemy: { ...prev.enemy, isEvading: cpuAction === 'EVADE' },
    }));

    // Determine Turn Order from the same dynamic/stat-modified fighters used during turn execution.
    const preparedPlayer = applyDynamicAbilityModifiers(
      stateRef.current.player,
      stateRef.current.battleConfig,
      currentTurn,
    );
    const preparedEnemy = applyDynamicAbilityModifiers(
      stateRef.current.enemy,
      stateRef.current.battleConfig,
      currentTurn,
    );
    const playerSpeed = getEffectiveSpeed(preparedPlayer);
    const cpuSpeed = getEffectiveSpeed(preparedEnemy);
    const turnPlan = getTurnExecutionPlan(playerAction, cpuAction, playerSpeed, cpuSpeed);
    const { firstIsPlayer, firstAction, secondAction } = turnPlan;
    // Arm protection before either actor resolves, independent of who has turn priority.
    yinYangDefensePendingRef.current = turnPlan.yinYangDefenseActive;

    try {
      // Step 1: First Battler Turn
      const continue1 = await executeFighterTurn(
        firstIsPlayer,
        firstAction,
        true,
        speed,
        currentTurn,
        firstIsPlayer && playerAction === 'ULTIMATE' ? ultimateVariant : undefined,
        firstIsPlayer && (playerAction === 'SPECIAL' || playerAction === 'COSTLY_SHOT') ? specialSkillId : undefined,
      );
      if (!continue1 || stateRef.current.player.currentHp <= 0 || stateRef.current.enemy.currentHp <= 0) {
        const winner = stateRef.current.player.currentHp > 0;
        finalizeBattle(winner);
        return;
      }

      await sleep(500 / speed);

      // Step 2: Second Battler Turn (if still alive)
      const continue2 = await executeFighterTurn(
        !firstIsPlayer,
        secondAction,
        false,
        speed,
        currentTurn,
        !firstIsPlayer && playerAction === 'ULTIMATE' ? ultimateVariant : undefined,
        !firstIsPlayer && (playerAction === 'SPECIAL' || playerAction === 'COSTLY_SHOT') ? specialSkillId : undefined,
      );
      if (!continue2 || stateRef.current.player.currentHp <= 0 || stateRef.current.enemy.currentHp <= 0) {
        const winner = stateRef.current.player.currentHp > 0;
        finalizeBattle(winner);
        return;
      }

      await sleep(400 / speed);

      // End of Round: remember what the player just did, then select the next
      // CPU action from the updated state. This makes the opponent learn from
      // repeated habits without re-rolling its action after the player commits.
      if (playerAction !== 'YIN_YANG' && playerAction !== 'COSTLY_SHOT') {
        recentPlayerActionsRef.current = [...recentPlayerActionsRef.current.slice(-5), playerAction];
      }
      recentCpuActionsRef.current = [...recentCpuActionsRef.current.slice(-5), cpuAction];
      yinYangDefensePendingRef.current = false;

      let nextPlayer: BattleFighter = {
        ...stateRef.current.player,
        isEvading: false,
        specialCooldownRemaining: Math.max(0, stateRef.current.player.specialCooldownRemaining - 1),
        featherPierceCooldownRemaining: Math.max(0, (stateRef.current.player.featherPierceCooldownRemaining ?? 0) - 1),
        featherRapidCooldownRemaining: Math.max(0, (stateRef.current.player.featherRapidCooldownRemaining ?? 0) - 1),
      };
      const enemyBeforeArmorTick = {
        ...stateRef.current.enemy,
        isEvading: false,
        specialCooldownRemaining: Math.max(0, stateRef.current.enemy.specialCooldownRemaining - 1),
        featherPierceCooldownRemaining: Math.max(0, (stateRef.current.enemy.featherPierceCooldownRemaining ?? 0) - 1),
        featherRapidCooldownRemaining: Math.max(0, (stateRef.current.enemy.featherRapidCooldownRemaining ?? 0) - 1),
      };
      let nextEnemy: BattleFighter = advanceKaiserChallengeRound(enemyBeforeArmorTick, currentTurn);
      const equippedResonances = getEquippedResonanceAbilities(stateRef.current.battleConfig);
      const playerBaseHp = Math.max(1, nextPlayer.resonanceBaseStats?.maxHp ?? nextPlayer.character.maxHp);
      const hpRatio = nextPlayer.currentHp / playerBaseHp;
      const erosionRate = equippedResonances.reduce(
        (sum, equipped) => sum + getTurnErosionRate(equipped.id, equipped.level, hpRatio),
        0,
      );
      if (erosionRate > 0) {
        const erosion = calculateErosionResult(nextEnemy, nextPlayer, erosionRate);
        nextEnemy = erosion.enemy;
        nextPlayer = erosion.player;
        addLog(`🌑【共鳴侵食：ターン経過】敵5項目をさらに${erosionRate}%弱体化（上限95%）。`, 'PASSIVE_TRIGGER', currentTurn);
        if (erosion.kingZoneStacksGained > 0) {
          addLog(`👑【王域】弱体化段階を突破。王域+${erosion.kingZoneStacksGained}（現在${nextPlayer.resonanceKingZoneStacks ?? 0}スタック）。`, 'PASSIVE_TRIGGER', currentTurn);
        }
        if (erosion.judgmentMarksGained > 0) addResonanceJudgmentMarks(erosion.judgmentMarksGained, currentTurn, '新規弱体化段階', ['ABYSS_JUDGMENT']);
      }

      const remainingKingWingStacks = resonanceKingWingStackExpiresAtRef.current.filter(expiresAt => expiresAt > currentTurn);
      resonanceKingWingStackExpiresAtRef.current = remainingKingWingStacks;
      nextPlayer = {
        ...nextPlayer,
        resonanceKingWingStacks: remainingKingWingStacks.length,
        resonanceKingWingStackExpiresAtTurns: remainingKingWingStacks,
      };
      if (
        (enemyBeforeArmorTick.kaiserArmorBrokenTurns ?? 0) > 0 &&
        (nextEnemy.kaiserArmorBrokenTurns ?? 0) === 0
      ) {
        addLog('🛡️【装甲破壊終了】カイザーが立て直した。ただし装甲ゲージは再生成されない。', 'SYSTEM', currentTurn);
      }
      const aiEnemy = applyDynamicAbilityModifiers(nextEnemy, stateRef.current.battleConfig, currentTurn + 1);
      const aiPlayer = applyDynamicAbilityModifiers(nextPlayer, stateRef.current.battleConfig, currentTurn + 1);
      const nextCpuIntent = CpuAi.decideAction(
        aiEnemy,
        aiPlayer,
        stateRef.current.cpuDifficulty,
        {
          recentPlayerActions: recentPlayerActionsRef.current,
          recentCpuActions: recentCpuActionsRef.current,
          turnNumber: currentTurn + 1,
          kaiserLevel: stateRef.current.battleConfig.kaiserLevel,
        }
      );

      updateState(prev => ({
        ...prev,
        turnNumber: prev.turnNumber + 1,
        phase: 'SELECT_ACTION',
        player: nextPlayer,
        enemy: nextEnemy,
        cpuIntent: nextCpuIntent,
        visualEffect: null,
        visualEffects: [],
        isAnimating: false,
      }));
    } catch (err) {
      yinYangDefensePendingRef.current = false;
      if (isBattleCancelled(err) || actionRunId !== battleRunIdRef.current) return;
      console.error('Battle execution error occurred, recovering state:', err);
      updateState(prev => ({
        ...prev,
        visualEffect: null,
        isAnimating: false,
        phase: prev.phase === 'BATTLE_FINISHED' ? 'BATTLE_FINISHED' : 'SELECT_ACTION',
      }));
    } finally {
      if (actionRunId !== battleRunIdRef.current) return;
      // Guaranteed safety cleanup: ensure visualEffect is null if settled
      updateState(prev => {
        if (prev.phase === 'SELECT_ACTION' || prev.phase === 'BATTLE_FINISHED') {
          return {
            ...prev,
            visualEffect: null,
            isAnimating: false,
          };
        }
        return prev;
      });
    }
  }, [addLog, updateState]);

  return {
    state,
    onActionSelected,
    restartBattle,
    cancelBattle,
    toggleSound,
    toggleSpeed,
    setCpuDifficulty,
  };
}
