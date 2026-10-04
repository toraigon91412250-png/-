import { useState, useRef, useCallback } from 'react';
import {
  BattleAction,
  BattleFighter,
  BattleLog,
  BattleUiState,
  CharacterDef,
  CpuDifficulty,
  EffectType,
  getEffectiveAttack,
  getEffectiveDefense,
  getEffectiveSpeed,
  rollIrenaFeatherChargeGain,
  LogType,
  StatusAilmentType,
} from '../types/game';
import { CpuAi } from '../utils/ai';
import { soundManager } from '../utils/audio';
import { saveBattleResult } from '../utils/storage';

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
    isEvading: false,
    isPlayer,
    activeAilments: [],
  };
}

export function useBattleGame(
  initialPlayerChar: CharacterDef,
  initialEnemyChar: CharacterDef,
  initialDifficulty: CpuDifficulty
) {
  const [state, setState] = useState<BattleUiState>(() => ({
    turnNumber: 1,
    player: createInitialFighter(initialPlayerChar, true),
    enemy: createInitialFighter(initialEnemyChar, false),
    logs: [
      {
        id: 1,
        turn: 1,
        text: `⚔️ バトル開始！ ${initialPlayerChar.name} (あなた) VS ${initialEnemyChar.name} (CPU)`,
        type: 'SYSTEM',
        timestamp: Date.now(),
      },
    ],
    phase: 'SELECT_ACTION',
    visualEffect: null,
    winnerIsPlayer: null,
    cpuDifficulty: initialDifficulty,
    battleSpeedMultiplier: 1.0,
    isSoundEnabled: true,
    isAnimating: false,
  }));

  const stateRef = useRef(state);
  stateRef.current = state;

  const updateState = useCallback((updater: (prev: BattleUiState) => BattleUiState) => {
    setState(prev => {
      const next = updater(prev);
      stateRef.current = next;
      return next;
    });
  }, []);

  const nextLogId = useRef(2);
  const nextVisualEffectId = useRef(0);


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

  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

  const restartBattle = useCallback((pChar?: CharacterDef, eChar?: CharacterDef) => {
    const curP = pChar || stateRef.current.player.character;
    const curE = eChar || stateRef.current.enemy.character;
    nextLogId.current = 1;
    updateState(prev => ({
      ...prev,
      turnNumber: 1,
      player: createInitialFighter(curP, true),
      enemy: createInitialFighter(curE, false),
      logs: [
        {
          id: nextLogId.current++,
          turn: 1,
          text: `⚔️ バトル開始！ ${curP.name} (あなた) VS ${curE.name} (CPU)`,
          type: 'SYSTEM',
          timestamp: Date.now(),
        },
      ],
      phase: 'SELECT_ACTION',
      visualEffect: null,
      winnerIsPlayer: null,
      isAnimating: false,
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

  // Apply Special Status Ailment (Bleed or Pressure)
  const applySpecialStatusAilment = (attacker: BattleFighter, defenderIsPlayer: boolean, turn: number) => {
    const ailmentType: StatusAilmentType = attacker.character.id === 'irena' ? 'BLEED' : 'PRESSURE';
    const def = ailmentType === 'BLEED'
      ? { type: 'BLEED' as const, defaultDuration: 3, description: '各ターン開始時30ダメージ、速度-20、防御-20' }
      : { type: 'PRESSURE' as const, defaultDuration: 2, description: '速度-25、攻撃力-25' };

    updateState(prev => {
      const target = defenderIsPlayer ? prev.player : prev.enemy;
      const filtered = target.activeAilments.filter(a => a.type !== ailmentType);
      const updated = [...filtered, { type: ailmentType, remainingTurns: def.defaultDuration }];
      return defenderIsPlayer
        ? { ...prev, player: { ...prev.player, activeAilments: updated } }
        : { ...prev, enemy: { ...prev.enemy, activeAilments: updated } };
    });

    const defenderName = defenderIsPlayer ? stateRef.current.player.character.name : stateRef.current.enemy.character.name;
    const displayName = ailmentType === 'BLEED' ? '出血' : '重圧';
    addLog(`⚠️【状態異常付与】${defenderName}に「${displayName}」が付与された！（${def.defaultDuration}ターン: ${def.description}）`, 'AILMENT_APPLIED', turn);
  };

  const executeFighterTurn = async (
    isActorPlayer: boolean,
    action: BattleAction,
    isActingFirst: boolean,
    speed: number,
    turn: number,
    ultimateVariant?: 'ALL_GODS' | 'RUIN' | 'OMNIPOTENCE'
  ): Promise<boolean> => {
    let actor = isActorPlayer ? stateRef.current.player : stateRef.current.enemy;
    let target = isActorPlayer ? stateRef.current.enemy : stateRef.current.player;

    // 1. Process Start-of-Turn DoT (Bleed: 30 damage)
    const bleedAilment = actor.activeAilments.find(a => a.type === 'BLEED');
    if (bleedAilment) {
      soundManager.playHeavyStrike();
      const dotDamage = 30;
      addLog(`🩸【出血ダメージ】${actor.character.name}は出血により ${dotDamage} ダメージを受けた！`, 'AILMENT_DOT', turn);

      const newHp = Math.max(0, actor.currentHp - dotDamage);
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
    actor = isActorPlayer ? stateRef.current.player : stateRef.current.enemy;
    target = isActorPlayer ? stateRef.current.enemy : stateRef.current.player;

    // 3. Execute Chosen Action
    switch (action) {
      case 'BUFF': {
        if (!actor.isBuffed) {
          updateState(prev => (isActorPlayer
            ? { ...prev, player: { ...prev.player, isBuffed: true, buffDamageBonus: 125 } }
            : { ...prev, enemy: { ...prev.enemy, isBuffed: true, buffDamageBonus: 125 } }
          ));
          soundManager.playAttack();
          addLog(
            `⚡ ${actor.character.name}は気合を高めた！（次の攻撃系行動のダメージ+125）`,
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
            bannerText: '⚡ 攻撃強化 (+125)！',
            effectId: nextVisualEffectId.current++,
          },
        }));

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
        const buffDamageBonus = actor.buffDamageBonus || 125;
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

        // Calculate attack damage
        const rawDamage = getEffectiveAttack(actor) - getEffectiveDefense(target);
        let baseDamage = Math.max(15, rawDamage);

        // Irena Precognition passive (+20 when acting first)
        const isIrenaPrecognition = actor.character.id === 'irena' && isActingFirst;
        if (isIrenaPrecognition) {
          baseDamage += 20;
          addLog(`🔮【先読み発動】いれーなは先手を制し通常攻撃ダメージ+20！（基礎: ${baseDamage}）`, 'PASSIVE_TRIGGER', turn);
        }

        // Buff bonus (+50)
        if (hadBuff) {
          baseDamage += buffDamageBonus;
          addLog(`⚡【強化消費】強化の効果でダメージ+${buffDamageBonus}！（基礎: ${baseDamage}）`, 'BUFF_PLAYER', turn);
        }

        // Critical: 20% on normal attack only (1.5x after additions)
        const isCritical = Math.random() < 0.20;
        const attackDamage = isCritical ? Math.round(baseDamage * 1.5) : baseDamage;

        // Kaiser Heavy Armor passive (-20 from normal attack, min 0)
        let finalDamage = attackDamage;
        let heavyArmorTriggered = false;
        if (target.character.id === 'kaiser') {
          heavyArmorTriggered = true;
          finalDamage = Math.max(0, finalDamage - 20);
        }

        if (isCritical) {
          soundManager.playCritical();
        } else {
          soundManager.playAttack();
        }

        const armorNote = heavyArmorTriggered ? '（カイザーの【重装】により20軽減！）' : '';
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

        const newTargetHp = Math.max(0, target.currentHp - finalDamage);
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

        // A successful Irena normal hit builds Feather power with diminishing random gains.
        if (actor.character.id === 'irena') {
          const currentCount = isActorPlayer
            ? stateRef.current.player.featherChargeCount
            : stateRef.current.enemy.featherChargeCount;
          const currentBonus = isActorPlayer
            ? stateRef.current.player.featherChargeBonus
            : stateRef.current.enemy.featherChargeBonus;
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

        if (newTargetHp <= 0) return false;
        return true;
      }

      case 'SPECIAL': {
        // Firing Feather consumes all accumulated Feather power, even if the shot is evaded.
        const featherChargeBonus = actor.character.id === 'irena' ? actor.featherChargeBonus : 0;
        if (actor.character.id === 'irena') {
          updateState(prev => ({
            ...prev,
            player: { ...prev.player, featherChargeBonus: 0, featherChargeCount: 0 },
          }));
        }

        const hadBuff = actor.isBuffed;
        const buffDamageBonus = actor.buffDamageBonus || 125;
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
          addLog(`⚡【強化消費】強化の効果で『${skillName}』のダメージ+${buffDamageBonus}！（計: ${baseDamage}）`, 'BUFF_PLAYER', turn);
        }

        // Special gives +1 ultimate gauge
        gainUltimateGauge(isActorPlayer, actor.character.name, `特殊技『${skillName}』使用`, turn);

        // Set cooldown on actor
        updateState(prev => (isActorPlayer
          ? { ...prev, player: { ...prev.player, specialCooldownRemaining: actor.character.specialSkillCooldown } }
          : { ...prev, enemy: { ...prev.enemy, specialCooldownRemaining: actor.character.specialSkillCooldown } }
        ));

        // Check opponent evasion
        if (target.isEvading) {
          const isEvaded = Math.random() < target.character.evasionRate;
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

        const finalDamage = baseDamage;

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

        const newTargetHp = Math.max(0, target.currentHp - finalDamage);
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

        if (newTargetHp <= 0) return false;
        return true;
      }

      case 'ULTIMATE': {
        const hadBuff = actor.isBuffed;
        const buffDamageBonus = actor.buffDamageBonus || 125;
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
        let baseDamage =
          appliedIrenaVariant === 'ALL_GODS'
            ? 0
            : appliedIrenaVariant === 'RUIN'
              ? 900
              : appliedIrenaVariant === 'OMNIPOTENCE'
                ? 1500
                : actor.character.ultimateSkillDamage;
        if (hadBuff) {
          baseDamage += buffDamageBonus;
          addLog(`⚡【強化消費】強化の効果で必殺技『${skillName}』のダメージ+${buffDamageBonus}！（計: ${baseDamage}）`, 'BUFF_PLAYER', turn);
        }

        // Reset ultimate gauge to 0
        updateState(prev => (isActorPlayer
          ? { ...prev, player: { ...prev.player, ultimateGauge: 0 } }
          : { ...prev, enemy: { ...prev.enemy, ultimateGauge: 0 } }
        ));

        addLog(`🔥 ${actor.character.name}は必殺技ゲージを全て解放した！（ゲージ 0/3）`, 'GAUGE_CHANGE', turn);

        // Irena authority effects use the same existing ultimate visual effect.
        if (isIrena && appliedIrenaVariant === 'ALL_GODS') {
          const strongBuff = 200;
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
        if (target.isEvading) {
          const isEvaded = Math.random() < target.character.evasionRate;
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

        const finalDamage = baseDamage;

        if (isIrena && appliedIrenaVariant === 'OMNIPOTENCE') {
          const superBuff = 500;
          updateState(prev => (isActorPlayer
            ? { ...prev, player: { ...prev.player, isBuffed: true, buffDamageBonus: superBuff } }
            : { ...prev, enemy: { ...prev.enemy, isBuffed: true, buffDamageBonus: superBuff } }
          ));
          addLog(
            `👑【全能の一撃】${actor.character.name}は全ての権能を統合した！ 次の攻撃系行動のダメージ+${superBuff}！`,
            isActorPlayer ? 'ULTIMATE_PLAYER' : 'ULTIMATE_ENEMY',
            turn
          );
        }

        soundManager.playCritical();
        if (actor.character.id === 'irena') {
          soundManager.playFeatherShot();
        } else {
          soundManager.playHeavyStrike();
        }

        const slogan = isIrena
          ? appliedIrenaVariant === 'RUIN'
            ? '破壊の権能を解放する一撃！'
            : appliedIrenaVariant === 'OMNIPOTENCE'
              ? '全ての権能を統合した一撃！'
              : actor.character.ultimateSlogan
          : actor.character.ultimateSlogan;
        addLog(
          `🌟🔥【必殺技】${actor.character.name}は${skillName}を放った！ ${slogan}`,
          isActorPlayer ? 'ULTIMATE_PLAYER' : 'ULTIMATE_ENEMY',
          turn
        );
        addLog(
          `💥 ${target.character.name}に ${finalDamage} の超絶ダメージ！`,
          isActorPlayer ? 'ULTIMATE_PLAYER' : 'ULTIMATE_ENEMY',
          turn
        );

        const newTargetHp = Math.max(0, target.currentHp - finalDamage);
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

        await sleep(1300 / speed);
        updateState(prev => ({ ...prev, visualEffect: null }));

        if (newTargetHp <= 0) return false;
        return true;
      }
    }

    return true;
  };

  const finalizeBattle = (winnerIsPlayer: boolean) => {
    saveBattleResult(winnerIsPlayer);
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
      isAnimating: false,
    }));
  };

  const onActionSelected = useCallback(async (
    playerAction: BattleAction,
    ultimateVariant?: 'ALL_GODS' | 'RUIN' | 'OMNIPOTENCE'
  ) => {
    if (stateRef.current.phase !== 'SELECT_ACTION') return;

    // Check prerequisites
    if (playerAction === 'SPECIAL' && stateRef.current.player.specialCooldownRemaining > 0) return;
    if (playerAction === 'ULTIMATE' && stateRef.current.player.ultimateGauge < 3) return;
    // Irena's Buff command was removed from the player UI; reject stale shortcuts/programmatic calls too.
    if (playerAction === 'BUFF' && stateRef.current.player.character.id === 'irena') return;

    updateState(prev => ({ ...prev, phase: 'EXECUTING_TURNS', isAnimating: true, visualEffect: null }));
    const speed = stateRef.current.battleSpeedMultiplier;
    const currentTurn = stateRef.current.turnNumber;

    const cpu = stateRef.current.enemy;
    const player = stateRef.current.player;

    // The CPU intent was selected at the end of the previous round and is now the
    // telegraphed action the player has been allowed to react to.
    const cpuAction = stateRef.current.cpuIntent;

    addLog(`--- 第${currentTurn}ターン 開始 ---`, 'SYSTEM', currentTurn);

    // Set evading stances
    updateState(prev => ({
      ...prev,
      player: { ...prev.player, isEvading: playerAction === 'EVADE' },
      enemy: { ...prev.enemy, isEvading: cpuAction === 'EVADE' },
    }));

    // Determine Turn Order based on effectiveSpeed
    const playerSpeed = getEffectiveSpeed(stateRef.current.player);
    const cpuSpeed = getEffectiveSpeed(stateRef.current.enemy);
    const playerGoesFirst = playerSpeed >= cpuSpeed;

    const firstIsPlayer = playerGoesFirst;
    const firstAction = firstIsPlayer ? playerAction : cpuAction;
    const secondAction = firstIsPlayer ? cpuAction : playerAction;

    try {
      // Step 1: First Battler Turn
      const continue1 = await executeFighterTurn(
        firstIsPlayer,
        firstAction,
        true,
        speed,
        currentTurn,
        firstIsPlayer && playerAction === 'ULTIMATE' ? ultimateVariant : undefined
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
        !firstIsPlayer && playerAction === 'ULTIMATE' ? ultimateVariant : undefined
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
      recentPlayerActionsRef.current = [...recentPlayerActionsRef.current.slice(-5), playerAction];
      recentCpuActionsRef.current = [...recentCpuActionsRef.current.slice(-5), cpuAction];

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
      const nextCpuIntent = CpuAi.decideAction(
        nextEnemy,
        nextPlayer,
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
        isAnimating: false,
      }));
    } catch (err) {
      console.error('Battle execution error occurred, recovering state:', err);
      updateState(prev => ({
        ...prev,
        visualEffect: null,
        isAnimating: false,
        phase: prev.phase === 'BATTLE_FINISHED' ? 'BATTLE_FINISHED' : 'SELECT_ACTION',
      }));
    } finally {
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
    toggleSound,
    toggleSpeed,
    setCpuDifficulty,
  };
}
