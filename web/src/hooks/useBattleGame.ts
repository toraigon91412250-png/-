import { useState, useRef, useCallback, useEffect } from 'react';
import {
  BattleAction,
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
  STATUS_AILMENTS,
  LogType,
  StatusAilmentType,
} from '../types/game';
import { CpuAi } from '../utils/ai';
import { GAME_BALANCE } from '../data/gameBalance';
import { calculateNormalAttackDamage, calculateSpecialDamage, calculateUltimateDamage } from '../utils/battleMath';
import { soundManager } from '../utils/audio';
import { getBattleReward, PATH_MASTERY_REWARD, saveBattleResult } from '../utils/storage';
import { normalizeStatAllocation } from '../utils/statBuild';
import { getTurnExecutionPlan, normalizeEquippedImprints, resolveYinYangDefense, shouldSuppressCpuBuffAction, shouldTriggerForesight } from '../utils/imprintSystem';
import {
  applyDynamicAbilityModifiers,
  createBattleCharacters,
  getAbilityLevel,
  getJudgmentDamageMultiplier,
  getJudgmentThreshold,
  hasAbility,
  normalizeEquippedAbilities,
} from '../utils/abilitySystem';

export function createInitialFighter(character: CharacterDef, isPlayer: boolean): BattleFighter {
  return {
    character,
    currentHp: character.maxHp,
    specialCooldownRemaining: 0,
    ultimateGauge: 0,
    isBuffed: false,
    buffDamageBonus: 0,
    featherChargeBonus: 0,
    featherChargeCount: 0,
    isSuperFallenShotCharging: false,
    isEvading: false,
    isPlayer,
    activeAilments: [],
  };
}

export function useBattleGame(
  initialPlayerChar: CharacterDef,
  initialEnemyChar: CharacterDef,
  initialDifficulty: CpuDifficulty,
  initialBattleConfig: BattleSetupConfig = { kaiserLevel: 10, abilities: [] },
) {
  const normalizedInitialConfig: BattleSetupConfig = {
    kaiserLevel: initialBattleConfig.kaiserLevel,
    abilities: normalizeEquippedAbilities(initialBattleConfig.abilities),
    imprints: normalizeEquippedImprints(initialBattleConfig.imprints),
    statPointTotal: Math.max(0, Math.floor(initialBattleConfig.statPointTotal ?? 12)),
    statAllocation: normalizeStatAllocation(
      initialBattleConfig.statAllocation,
      initialBattleConfig.statPointTotal ?? 12,
    ),
  };

  const [state, setState] = useState<BattleUiState>(() => {
    const initialCharacters = createBattleCharacters(initialPlayerChar, initialEnemyChar, normalizedInitialConfig);
    const initialPlayer = createInitialFighter(initialCharacters.player, true);
    const initialEnemy = createInitialFighter(initialCharacters.enemy, false);
    const initialCpuIntent = CpuAi.decideAction(initialEnemy, initialPlayer, initialDifficulty);

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
    usedImprints: [],
    yinYangActivatedTurn: null,
    yinYangDefenseResult: null,
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

      if (next.visualEffect) {
        if (!previousEffects.some(effect => effect.effectId === next.visualEffect?.effectId)) {
          visualEffects = [...previousEffects, next.visualEffect];
        }
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

  const resolveIncomingDamage = (target: BattleFighter, damage: number, turn: number, source: string): number => {
    const safeDamage = Math.max(0, Math.floor(damage));
    const lethal = safeDamage >= target.currentHp && target.currentHp > 0;
    const fallenKingLevel = getAbilityLevel(stateRef.current.battleConfig, 'FALLEN_KING');

    if (
      target.isPlayer &&
      fallenKingLevel >= 5 &&
      lethal &&
      fallenKingSurvivalCountRef.current < (fallenKingLevel >= 5 ? 5 : 1)
    ) {
      fallenKingSurvivalCountRef.current += 1;
      addLog(
        `👑【堕天王】いれーなは致命傷を拒絶した！（${source}）HP1で踏みとどまる。`,
        'PASSIVE_TRIGGER',
        turn,
      );
      return 1;
    }

    return Math.max(0, target.currentHp - safeDamage);
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
      abilities: normalizeEquippedAbilities(
        battleConfigOverride?.abilities ?? stateRef.current.battleConfig.abilities,
      ),
      imprints: normalizeEquippedImprints(
        battleConfigOverride?.imprints ?? stateRef.current.battleConfig.imprints,
      ),
      statPointTotal: nextStatPointTotal,
      statAllocation: normalizeStatAllocation(
        battleConfigOverride?.statAllocation ?? stateRef.current.battleConfig.statAllocation,
        nextStatPointTotal,
      ),
    };
    const prepared = createBattleCharacters(baseP, baseE, nextConfig);
    const nextPlayer = createInitialFighter(prepared.player, true);
    const nextEnemy = createInitialFighter(prepared.enemy, false);

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
    fallenReleaseLoggedRef.current = false;
    nextLogId.current = 1;
    cancelPendingBattleWork();

    const nextCpuIntent = CpuAi.decideAction(nextEnemy, nextPlayer, nextDifficulty);

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
      usedImprints: [],
      yinYangActivatedTurn: null,
      yinYangDefenseResult: null,
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
    if (!result.applied) return damage;

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
    return result.damage;
  };

  // Apply Special Status Ailment (Bleed or Pressure)
  const applySpecialStatusAilment = (attacker: BattleFighter, defenderIsPlayer: boolean, turn: number) => {
    const ailmentType: StatusAilmentType = attacker.character.id === 'irena' ? 'BLEED' : 'PRESSURE';
    const bleedDamage = attacker.character.id === 'irena' && (attacker.character.featherSkillLevel || 1) >= 3
      ? 40
      : STATUS_AILMENTS.BLEED.dotDamage;
    const def = ailmentType === 'BLEED'
      ? { type: 'BLEED' as const, defaultDuration: 3, dotDamage: bleedDamage, description: '各ターン開始時' + bleedDamage + 'ダメージ、速度-20、防御-20' }
      : { type: 'PRESSURE' as const, defaultDuration: 2, description: '速度-25、攻撃力-25' };

    updateState(prev => {
      const target = defenderIsPlayer ? prev.player : prev.enemy;
      const filtered = target.activeAilments.filter(a => a.type !== ailmentType);
      const updated = [
        ...filtered,
        ailmentType === 'BLEED'
          ? { type: ailmentType, remainingTurns: def.defaultDuration, dotDamage: bleedDamage }
          : { type: ailmentType, remainingTurns: def.defaultDuration },
      ];
      return defenderIsPlayer
        ? { ...prev, player: { ...prev.player, activeAilments: updated } }
        : { ...prev, enemy: { ...prev.enemy, activeAilments: updated } };
    });

    const defenderName = defenderIsPlayer ? stateRef.current.player.character.name : stateRef.current.enemy.character.name;
    const displayName = ailmentType === 'BLEED' ? '出血' : '重圧';
    addLog(`⚠️【状態異常付与】${defenderName}に「${displayName}」が付与された！（${def.defaultDuration}ターン: ${def.description}）`, 'AILMENT_APPLIED', turn);
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

    // 1. Process Start-of-Turn DoT (Bleed: 30 damage)
    const bleedAilment = actor.activeAilments.find(a => a.type === 'BLEED');
    if (bleedAilment) {
      soundManager.playHeavyStrike();
      const dotDamage = bleedAilment.dotDamage ?? STATUS_AILMENTS.BLEED.dotDamage;
      addLog(`🩸【出血ダメージ】${actor.character.name}は出血により ${dotDamage} ダメージを受けた！`, 'AILMENT_DOT', turn);

      const newHp = resolveIncomingDamage(actor, dotDamage, turn, '出血ダメージ');
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
              actorName: '出血',
              skillName: '出血ダメージ',
              statusAilmentName: '出血',
              bannerText: `🩸 出血 -${dotDamage} DMG`,
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
              actorName: '出血',
              skillName: '出血ダメージ',
              statusAilmentName: '出血',
              bannerText: `🩸 出血 -${dotDamage} DMG`,
              effectId: nextVisualEffectId.current++,
            },
          }
      ));

      await sleep(850 / speed);
      updateState(prev => ({ ...prev, visualEffect: null }));

      if (newHp <= 0) {
        addLog(`💀 ${actor.character.name}は出血により力尽きた！`, isActorPlayer ? 'DEFEAT' : 'VICTORY', turn);
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
          const name = a.type === 'BLEED' ? '出血' : '重圧';
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
        const judgmentActive = isActorPlayer && judgmentReadyRef.current;
        const isCritical = Math.random() < GAME_BALANCE.CRITICAL_RATE;
        const calculatedDamage = calculateNormalAttackDamage(
          {
            attacker: actor,
            target,
            config: stateRef.current.battleConfig,
            turn,
            isActingFirst,
            judgmentReady: judgmentActive,
            alreadyPrepared: true,
            baseAttackerMaxHp: baseActorMaxHp,
          },
          isCritical,
        );
        const finalDamage = applyYinYangDefenseToDamage(isActorPlayer, target, calculatedDamage, turn);

        if (actor.character.id === 'irena' && isActingFirst) {
          addLog(
            `🔮【先読み発動】いれーなは先手を制し通常攻撃ダメージ+${GAME_BALANCE.IRENA_PRECOGNITION_BONUS}！`,
            'PASSIVE_TRIGGER',
            turn,
          );
        }

        const heavyArmorTriggered = target.character.id === 'kaiser';
        if (hadBuff) {
          addLog(
            `⚡【強化消費】強化の効果でダメージ+${buffDamageBonus}！`,
            'BUFF_PLAYER',
            turn,
          );
        }

        if (judgmentActive) {
          addLog(
            `⚖️【断罪執行】次の一撃に断罪が下る！ ダメージ×${getJudgmentDamageMultiplier(judgmentLevel).toFixed(2)} / DEF貫通`,
            'PASSIVE_TRIGGER',
            turn,
          );
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

        const fallenExecution =
          isActorPlayer &&
          hasAbility(stateRef.current.battleConfig, 'FALLEN') &&
          target.currentHp > 0 &&
          actor.currentHp > 1 &&
          actor.currentHp <= baseActorMaxHp * 0.05;

        if (fallenExecution) {
          addLog('🩸【堕天・終局】5%以下のいれーなが、次の攻撃に即死効果を宿した！', 'PASSIVE_TRIGGER', turn);
        }

        const newTargetHp = resolveIncomingDamage(target, finalDamage, turn, fallenExecution ? '堕天・終局' : '通常攻撃');
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
        } else if (isActorPlayer && hasAbility(stateRef.current.battleConfig, 'JUDGMENT')) {
          addJudgmentMarks(isCritical ? 2 : 1, turn);
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
        const isSuperFallenShot =
          isActorPlayer &&
          actor.character.id === 'irena' &&
          specialSkillId === 'SUPER_FALLEN_SHOT';

        if (isSuperFallenShot && !actor.isSuperFallenShotCharging) {
          const skillLevel = actor.character.featherSkillLevel || 1;
          const multiplier = getIrenaSuperFallenShotMultiplier(skillLevel);

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
          }));

          gainUltimateGauge(isActorPlayer, actor.character.name, '特殊技『超堕天撃』充填開始', turn);
          addLog(
            `⚡🪶【超堕天撃・充填】${actor.character.name}は力を一点に集中している！ 次のターンに発射（倍率×${multiplier.toFixed(1)}）。充填中は防御力0。`,
            'SPECIAL_PLAYER',
            turn,
          );

          updateState(prev => ({
            ...prev,
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
              effectId: nextVisualEffectId.current++,
            },
          }));

          await sleep(2800 / speed);
          updateState(prev => ({ ...prev, visualEffect: null }));
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

          const finalDamage = calculateSpecialDamage({
            attacker: actor,
            target,
            config: stateRef.current.battleConfig,
            turn,
            isActingFirst,
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
                : '⚡🪶『超堕天撃』発射準備！',
              effectId,
            },
          }));

          // The visual peaks before the hit lands, so the damage application
          // happens on the launch beat rather than when the animation begins.
          const impactDelay = 3000 / speed;
          const totalDuration = 5600 / speed;
          const remainingDuration = Math.max(0, totalDuration - impactDelay);

          await sleep(impactDelay);

          if (isEvaded) {
            updateState(prev => ({
              ...prev,
              visualEffect: prev.visualEffect?.effectId === effectId
                ? {
                    ...prev.visualEffect,
                    bannerText: '💨『超堕天撃』MISS!',
                  }
                : prev.visualEffect,
            }));
            await sleep(remainingDuration);
            updateState(prev => ({ ...prev, visualEffect: null }));
            return true;
          }

          soundManager.playCritical();
          soundManager.playFeatherShot();

          addLog(
            `⚡🪶【超堕天撃】${actor.character.name}が電撃をまとった羽弾を撃ち出す！ ${target.character.name}に ${finalDamage} ダメージ！（倍率×${multiplier.toFixed(1)}）`,
            'SPECIAL_PLAYER',
            turn,
          );

          const newTargetHp = resolveIncomingDamage(target, finalDamage, turn, '超堕天撃');

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

          await sleep(remainingDuration);
          updateState(prev => ({ ...prev, visualEffect: null }));

          if (newTargetHp <= 0) return false;
          return true;
        }

        const isIrenaSpecial = actor.character.id === 'irena';
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

        const skillName = actor.character.specialSkillName;
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

        // Set cooldown on actor
        updateState(prev => (isActorPlayer
          ? { ...prev, player: { ...prev.player, specialCooldownRemaining: actor.character.specialSkillCooldown } }
          : { ...prev, enemy: { ...prev.enemy, specialCooldownRemaining: actor.character.specialSkillCooldown } }
        ));

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
        const judgmentActive = isActorPlayer && judgmentReadyRef.current;
        const calculatedDamage = calculateSpecialDamage({
          attacker: actor,
          target,
          config: stateRef.current.battleConfig,
          turn,
          isActingFirst,
          judgmentReady: judgmentActive,
          specialSkillId: specialSkillId ?? 'FEATHER',
          alreadyPrepared: true,
          baseAttackerMaxHp: baseActorMaxHp,
        });
        const finalDamage = applyYinYangDefenseToDamage(isActorPlayer, target, calculatedDamage, turn);

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

        // Apply 100% Status Ailment upon hit
        applySpecialStatusAilment(actor, !isActorPlayer, turn);

        const fallenExecution =
          isActorPlayer &&
          hasAbility(stateRef.current.battleConfig, 'FALLEN') &&
          target.currentHp > 0 &&
          actor.currentHp > 1 &&
          actor.currentHp <= baseActorMaxHp * 0.05;

        if (fallenExecution) {
          addLog('🩸【堕天・終局】5%以下のいれーなの特殊技に即死効果が発動した！', 'PASSIVE_TRIGGER', turn);
        }

        const newTargetHp = resolveIncomingDamage(target, finalDamage, turn, fallenExecution ? '堕天・終局' : '特殊技');
        const appliedAilmentName = actor.character.id === 'irena' ? '出血' : '重圧';
        const effType: EffectType = actor.character.id === 'irena' ? 'SPECIAL_FEATHER' : 'SPECIAL_SMASH';

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
            skillName,
            statusAilmentName: appliedAilmentName,
            bannerText: `✨『${skillName}』-${finalDamage} [${appliedAilmentName}付与]`,
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
        } else if (isActorPlayer && hasAbility(stateRef.current.battleConfig, 'JUDGMENT')) {
          addJudgmentMarks(2, turn);
        }

        if (newTargetHp <= 0) return false;
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

        const judgmentActive = isActorPlayer && judgmentReadyRef.current;
        const calculatedDamage = calculateUltimateDamage({
          attacker: actor,
          target,
          config: stateRef.current.battleConfig,
          turn,
          isActingFirst,
          judgmentReady: judgmentActive,
          ultimateVariant: appliedIrenaVariant,
          alreadyPrepared: true,
          baseAttackerMaxHp: baseActorMaxHp,
        });
        const finalDamage = applyYinYangDefenseToDamage(isActorPlayer, target, calculatedDamage, turn);

        const judgmentLevel = isActorPlayer
          ? getAbilityLevel(stateRef.current.battleConfig, 'JUDGMENT')
          : 0;
        if (judgmentActive) {
          addLog(
            `⚖️【断罪執行】必殺技に断罪が宿った！ ダメージ×${getJudgmentDamageMultiplier(judgmentLevel).toFixed(2)}`,
            'PASSIVE_TRIGGER',
            turn,
          );
        }

        const fallenExecution =
          isActorPlayer &&
          hasAbility(stateRef.current.battleConfig, 'FALLEN') &&
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

        const newTargetHp = resolveIncomingDamage(target, finalDamage, turn, fallenExecution ? '堕天・終局' : '必殺技');
        updateState(prev => ({
          ...prev,
          player: isActorPlayer ? prev.player : { ...prev.player, currentHp: newTargetHp },
          enemy: isActorPlayer ? { ...prev.enemy, currentHp: newTargetHp } : prev.enemy,
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
        } else if (isActorPlayer && hasAbility(stateRef.current.battleConfig, 'JUDGMENT')) {
          addJudgmentMarks(3, turn);
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
    const reward = getBattleReward(winnerIsPlayer, masteryBonus);
    saveBattleResult(winnerIsPlayer, masteryBonus);
    if (winnerIsPlayer) {
      soundManager.playVictory();
      addLog('👑 あなたの勝利です！ おめでとうございます！', 'VICTORY', stateRef.current.turnNumber);
    } else {
      soundManager.playDefeat();
      addLog('💀 敗北しました... 再挑戦してみましょう！', 'DEFEAT', stateRef.current.turnNumber);
    }
    updateState(prev => ({
      ...prev,
      phase: 'BATTLE_FINISHED',
      winnerIsPlayer,
      visualEffect: null,
      visualEffects: [],
      judgmentReady: false,
      isAnimating: false,
      lastBattleReward: reward,
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

    // Check prerequisites
    if (playerAction === 'SPECIAL' && !isForcedSuperFallenShot && player.specialCooldownRemaining > 0) return;
    if (
      specialSkillId === 'SUPER_FALLEN_SHOT' &&
      !isForcedSuperFallenShot &&
      !player.character.hasSuperFallenShot
    ) return;
    if (playerAction === 'ULTIMATE' && stateRef.current.player.ultimateGauge < 3) return;
    if (playerAction === 'YIN_YANG' && !stateRef.current.battleConfig.imprints?.includes('YIN_YANG')) return;
    // Irena's Buff command was removed from the player UI; reject stale shortcuts/programmatic calls too.
    if (playerAction === 'BUFF' && stateRef.current.player.character.id === 'irena') return;

    // The chosen action is authoritative for the incoming response, even if a state update has not rendered yet.
    playerEvadeSelectedRef.current = playerAction === 'EVADE';
    const actionRunId = battleRunIdRef.current;
    updateState(prev => ({
      ...prev,
      phase: 'EXECUTING_TURNS',
      isAnimating: true,
      visualEffect: null,
      visualEffects: [],
      yinYangDefenseResult: playerAction === 'YIN_YANG' ? null : prev.yinYangDefenseResult,
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
        firstIsPlayer && playerAction === 'SPECIAL' ? specialSkillId : undefined,
      );
      if (!continue1) {
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
        !firstIsPlayer && playerAction === 'SPECIAL' ? specialSkillId : undefined,
      );
      if (!continue2) {
        const winner = stateRef.current.player.currentHp > 0;
        finalizeBattle(winner);
        return;
      }

      await sleep(400 / speed);

      // End of Round: remember what the player just did, then select the next
      // CPU action from the updated state. This makes the opponent learn from
      // repeated habits without re-rolling its action after the player commits.
      if (playerAction !== 'YIN_YANG') {
        recentPlayerActionsRef.current = [...recentPlayerActionsRef.current.slice(-5), playerAction];
      }
      recentCpuActionsRef.current = [...recentCpuActionsRef.current.slice(-5), cpuAction];
      yinYangDefensePendingRef.current = false;

      const nextPlayer = {
        ...stateRef.current.player,
        isEvading: false,
        specialCooldownRemaining: Math.max(0, stateRef.current.player.specialCooldownRemaining - 1),
      };
      const nextEnemy = {
        ...stateRef.current.enemy,
        isEvading: false,
        specialCooldownRemaining: Math.max(0, stateRef.current.enemy.specialCooldownRemaining - 1),
      };
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
