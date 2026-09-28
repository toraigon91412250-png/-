package com.example.ui.battle

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.example.audio.SoundManager
import com.example.battle.CpuAi
import com.example.data.BattleStatsRepository
import com.example.model.ActiveStatusAilment
import com.example.model.BattleAction
import com.example.model.BattleFighter
import com.example.model.BattleLog
import com.example.model.BattlePhase
import com.example.model.BattleUiState
import com.example.model.CharacterDef
import com.example.model.CharacterRegistry
import com.example.model.CpuDifficulty
import com.example.model.EffectType
import com.example.model.LogType
import com.example.model.StatusAilmentType
import com.example.model.VisualEffect
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlin.math.roundToInt
import kotlin.random.Random

class BattleViewModel(
  private val statsRepository: BattleStatsRepository,
  playerChar: CharacterDef = CharacterRegistry.IRENA,
  enemyChar: CharacterDef = CharacterRegistry.KAISER
) : ViewModel() {

  private var logCounter: Long = 0
  val soundManager = SoundManager()

  private val _uiState = MutableStateFlow(
    BattleUiState(
      turnNumber = 1,
      player = BattleFighter(
        character = playerChar,
        currentHp = playerChar.maxHp,
        ultimateGauge = 0,
        isPlayer = true
      ),
      enemy = BattleFighter(
        character = enemyChar,
        currentHp = enemyChar.maxHp,
        ultimateGauge = 0,
        isPlayer = false
      ),
      logs = listOf(
        BattleLog(
          id = ++logCounter,
          turn = 1,
          text = "【バトル開始】${playerChar.name} VS ${enemyChar.name}！",
          type = LogType.SYSTEM
        ),
        BattleLog(
          id = ++logCounter,
          turn = 1,
          text = "固有能力: ${playerChar.name}【${playerChar.passiveName}】 / ${enemyChar.name}【${enemyChar.passiveName}】",
          type = LogType.SYSTEM
        )
      )
    )
  )
  val uiState: StateFlow<BattleUiState> = _uiState.asStateFlow()

  val stats = statsRepository.stats

  fun restartBattle(
    playerChar: CharacterDef = _uiState.value.player.character,
    enemyChar: CharacterDef = _uiState.value.enemy.character
  ) {
    logCounter = 0
    _uiState.value = BattleUiState(
      turnNumber = 1,
      player = BattleFighter(
        character = playerChar,
        currentHp = playerChar.maxHp,
        ultimateGauge = 0,
        isPlayer = true
      ),
      enemy = BattleFighter(
        character = enemyChar,
        currentHp = enemyChar.maxHp,
        ultimateGauge = 0,
        isPlayer = false
      ),
      cpuDifficulty = _uiState.value.cpuDifficulty,
      battleSpeedMultiplier = _uiState.value.battleSpeedMultiplier,
      isSoundEnabled = _uiState.value.isSoundEnabled,
      logs = listOf(
        BattleLog(
          id = ++logCounter,
          turn = 1,
          text = "【バトル開始】${playerChar.name} VS ${enemyChar.name}！",
          type = LogType.SYSTEM
        ),
        BattleLog(
          id = ++logCounter,
          turn = 1,
          text = "固有能力: ${playerChar.name}【${playerChar.passiveName}】 / ${enemyChar.name}【${enemyChar.passiveName}】",
          type = LogType.SYSTEM
        )
      )
    )
  }

  fun toggleSound() {
    _uiState.update {
      val next = !it.isSoundEnabled
      soundManager.isSoundEnabled = next
      it.copy(isSoundEnabled = next)
    }
  }

  fun setCpuDifficulty(difficulty: CpuDifficulty) {
    _uiState.update { it.copy(cpuDifficulty = difficulty) }
  }

  fun toggleSpeedMultiplier() {
    _uiState.update {
      val next = if (it.battleSpeedMultiplier == 1.0f) 1.8f else 1.0f
      it.copy(battleSpeedMultiplier = next)
    }
  }

  fun onActionSelected(playerAction: BattleAction) {
    val state = _uiState.value
    if (state.phase != BattlePhase.SELECT_ACTION) return

    // Verify special skill cooldown
    if (playerAction == BattleAction.SPECIAL && !state.player.isSpecialReady) {
      addLog(
        text = "特殊技はクールダウン中です（残り${state.player.specialCooldownRemaining}ターン）",
        type = LogType.SYSTEM
      )
      return
    }

    // Verify ultimate skill gauge
    if (playerAction == BattleAction.ULTIMATE && !state.player.isUltimateReady) {
      addLog(
        text = "必殺技ゲージが不足しています（現在 ${state.player.ultimateGauge}/3）",
        type = LogType.SYSTEM
      )
      return
    }

    viewModelScope.launch {
      executeTurnRound(playerAction)
    }
  }

  private suspend fun executeTurnRound(playerAction: BattleAction) {
    _uiState.update { it.copy(phase = BattlePhase.EXECUTING_TURNS) }
    val speed = _uiState.value.battleSpeedMultiplier

    val currentTurn = _uiState.value.turnNumber
    val cpu = _uiState.value.enemy
    val player = _uiState.value.player

    // CPU decides its action
    val cpuAction = CpuAi.decideAction(cpu, player, _uiState.value.cpuDifficulty)

    addLog(
      text = "--- 第${currentTurn}ターン 開始 ---",
      type = LogType.SYSTEM
    )

    // Set evading stances
    _uiState.update { s ->
      s.copy(
        player = s.player.copy(isEvading = (playerAction == BattleAction.EVADE)),
        enemy = s.enemy.copy(isEvading = (cpuAction == BattleAction.EVADE))
      )
    }

    // Determine Turn Order based on effective speed (factoring status ailments)
    val playerSpeed = _uiState.value.player.effectiveSpeed
    val cpuSpeed = _uiState.value.enemy.effectiveSpeed

    val playerGoesFirst = playerSpeed >= cpuSpeed

    val firstIsPlayer = playerGoesFirst
    val firstAction = if (firstIsPlayer) playerAction else cpuAction
    val secondAction = if (firstIsPlayer) cpuAction else playerAction

    // Step 1: First Battler Turn
    val continueBattle = executeFighterTurn(
      isActorPlayer = firstIsPlayer,
      action = firstAction,
      isActingFirst = true,
      speed = speed
    )

    if (!continueBattle) {
      finalizeBattle()
      return
    }

    delay((500 / speed).toLong())

    // Step 2: Second Battler Turn (if not defeated)
    val battleStillOngoing = executeFighterTurn(
      isActorPlayer = !firstIsPlayer,
      action = secondAction,
      isActingFirst = false,
      speed = speed
    )

    if (!battleStillOngoing) {
      finalizeBattle()
      return
    }

    delay((400 / speed).toLong())

    // End of Round: update cooldowns & reset evade stances
    _uiState.update { s ->
      val newPlayerCd = maxOf(0, s.player.specialCooldownRemaining - 1)
      val newEnemyCd = maxOf(0, s.enemy.specialCooldownRemaining - 1)

      s.copy(
        turnNumber = s.turnNumber + 1,
        phase = BattlePhase.SELECT_ACTION,
        player = s.player.copy(
          isEvading = false,
          specialCooldownRemaining = newPlayerCd
        ),
        enemy = s.enemy.copy(
          isEvading = false,
          specialCooldownRemaining = newEnemyCd
        ),
        visualEffect = null
      )
    }
  }

  /**
   * Executes a single fighter's turn.
   * 1. Processes start-of-turn DoT (Bleed 50 damage)
   * 2. Checks if defeated by DoT
   * 3. Decrements ailment durations (reverting stats if expired)
   * 4. Executes chosen action
   */
  private suspend fun executeFighterTurn(
    isActorPlayer: Boolean,
    action: BattleAction,
    isActingFirst: Boolean,
    speed: Float
  ): Boolean {
    var state = _uiState.value
    var actor = if (isActorPlayer) state.player else state.enemy
    var target = if (isActorPlayer) state.enemy else state.player

    if (actor.isDefeated || target.isDefeated) return false

    // 1. Process Start-of-Turn DoT (Bleed 50 damage)
    val bleedAilment = actor.activeAilments.firstOrNull { it.type == StatusAilmentType.BLEED }
    if (bleedAilment != null) {
      val bleedDamage = bleedAilment.type.dotDamage
      val newHp = maxOf(0, actor.currentHp - bleedDamage)
      addLog(
        text = "🩸【出血ダメージ】${actor.character.name}は出血により ${bleedDamage} の継続ダメージを受けた！",
        type = LogType.AILMENT_DOT
      )

      _uiState.update { s ->
        if (isActorPlayer) {
          s.copy(player = s.player.copy(currentHp = newHp))
        } else {
          s.copy(enemy = s.enemy.copy(currentHp = newHp))
        }
      }

      _uiState.update {
        it.copy(
          visualEffect = VisualEffect(
            targetIsPlayer = isActorPlayer,
            damage = bleedDamage,
            effectType = EffectType.BLEED_TICK,
            bannerText = "🩸 出血 -${bleedDamage} DMG"
          )
        )
      }
      delay((650 / speed).toLong())
      _uiState.update { it.copy(visualEffect = null) }

      // Check if DoT caused defeat
      if (newHp <= 0) {
        return false
      }
    }

    // 2. Decrement Ailments on Actor and handle expirations
    _uiState.update { s ->
      val currentFighter = if (isActorPlayer) s.player else s.enemy
      val updatedAilments = mutableListOf<ActiveStatusAilment>()

      for (ailment in currentFighter.activeAilments) {
        val remaining = ailment.remainingTurns - 1
        if (remaining > 0) {
          updatedAilments.add(ailment.copy(remainingTurns = remaining))
        } else {
          addLog(
            text = "✨【状態異常回復】${currentFighter.character.name}の「${ailment.type.displayName}」効果が切れた！（ステータス回復）",
            type = LogType.AILMENT_EXPIRED
          )
        }
      }

      if (isActorPlayer) {
        s.copy(player = s.player.copy(activeAilments = updatedAilments))
      } else {
        s.copy(enemy = s.enemy.copy(activeAilments = updatedAilments))
      }
    }

    state = _uiState.value
    actor = if (isActorPlayer) state.player else state.enemy
    target = if (isActorPlayer) state.enemy else state.player

    if (actor.isDefeated || target.isDefeated) return false

    // 3. Execute Chosen Action
    when (action) {
      BattleAction.BUFF -> {
        // 強化コマンド: 次に行う自分の攻撃系行動ダメージを+50
        soundManager.playDefend()
        if (actor.isBuffed) {
          addLog(
            text = "⚡ ${actor.character.name}は再び【強化】を選択したが、既に強化中のため効果を維持した！",
            type = if (isActorPlayer) LogType.BUFF_PLAYER else LogType.BUFF_ENEMY
          )
        } else {
          _uiState.update { s ->
            if (isActorPlayer) {
              s.copy(player = s.player.copy(isBuffed = true))
            } else {
              s.copy(enemy = s.enemy.copy(isBuffed = true))
            }
          }
          addLog(
            text = "⚡【強化発動】${actor.character.name}は闘気を滾らせた！次に行う攻撃系行動のダメージ+50！",
            type = if (isActorPlayer) LogType.BUFF_PLAYER else LogType.BUFF_ENEMY
          )
        }

        _uiState.update {
          it.copy(
            visualEffect = VisualEffect(
              targetIsPlayer = isActorPlayer,
              damage = 0,
              effectType = EffectType.BUFF_POWER,
              isBuff = true,
              bannerText = "⚡ 攻撃強化 (+50)！"
            )
          )
        }
        delay((650 / speed).toLong())
        _uiState.update { it.copy(visualEffect = null) }
        return true
      }

      BattleAction.EVADE -> {
        val evadePercent = (actor.character.evasionRate * 100).toInt()
        addLog(
          text = "🌀 ${actor.character.name}は身構えて回避態勢に入った！（固有回避率: ${evadePercent}%）",
          type = if (isActorPlayer) LogType.PLAYER_ACTION else LogType.ENEMY_ACTION
        )
        _uiState.update {
          it.copy(
            visualEffect = VisualEffect(
              targetIsPlayer = isActorPlayer,
              damage = 0,
              effectType = EffectType.EVADE_DODGE,
              isEvade = true,
              bannerText = "回避の構え(${evadePercent}%)！"
            )
          )
        }
        delay((600 / speed).toLong())
        _uiState.update { it.copy(visualEffect = null) }
        return true
      }

      BattleAction.ATTACK -> {
        val hadBuff = actor.isBuffed
        // Consume buff on attack-type action
        if (hadBuff) {
          consumeBuff(isActorPlayer)
        }

        // Check opponent evasion
        if (target.isEvading) {
          val isEvaded = checkEvadeSuccess(target)
          if (isEvaded) {
            handleEvadeSuccess(actor, target, isActorPlayer, speed)
            return true
          } else {
            handleEvadeFailure(target, isActorPlayer)
          }
        }

        // Calculate attack damage
        val rawDamage = actor.effectiveAttack - target.effectiveDefense
        var baseDamage = maxOf(15, rawDamage)

        // 【いれーな：先読み】相手より先に行動するターン、通常攻撃ダメージ+20
        val isIrenaPrecognition = actor.character.id == "irena" && isActingFirst
        if (isIrenaPrecognition) {
          baseDamage += 20
          addLog(
            text = "🔮【先読み発動】いれーなは先手を制し通常攻撃ダメージ+20！（基礎: ${baseDamage}）",
            type = LogType.PASSIVE_TRIGGER
          )
        }

        // 強化ボーナス (+50)
        if (hadBuff) {
          baseDamage += 50
          addLog(
            text = "⚡【強化消費】強化の効果でダメージ+50！（基礎: ${baseDamage}）",
            type = LogType.BUFF_PLAYER
          )
        }

        // 通常攻撃のみ20%でクリティカル（+20や+50加算後に1.5倍）
        val isCritical = Random.nextFloat() < 0.20f
        val attackDamage = if (isCritical) {
          (baseDamage * 1.5f).roundToInt()
        } else {
          baseDamage
        }

        // 【カイザー：重装】通常攻撃を受けたとき、最終ダメージを20軽減（20未満なら0）
        var finalDamage = attackDamage
        var heavyArmorTriggered = false
        if (target.character.id == "kaiser") {
          heavyArmorTriggered = true
          finalDamage = maxOf(0, finalDamage - 20)
        }

        // サウンド再生
        if (isCritical) {
          soundManager.playCritical()
        } else {
          soundManager.playAttack()
        }

        val armorNote = if (heavyArmorTriggered) "（カイザーの【重装】により20軽減！）" else ""
        if (isCritical) {
          addLog(
            text = "💥【会心の一撃】クリティカル！ ${actor.character.name}の猛撃！ ${target.character.name}に ${finalDamage} の大ダメージ！$armorNote",
            type = if (isActorPlayer) LogType.CRITICAL_PLAYER else LogType.CRITICAL_ENEMY
          )
        } else {
          addLog(
            text = "⚔️ ${actor.character.name}の攻撃！ ${target.character.name}に ${finalDamage} のダメージ！$armorNote",
            type = if (isActorPlayer) LogType.PLAYER_ACTION else LogType.ENEMY_ACTION
          )
        }

        // Visual hit effect
        _uiState.update {
          it.copy(
            visualEffect = VisualEffect(
              targetIsPlayer = !isActorPlayer,
              damage = finalDamage,
              effectType = EffectType.NORMAL_HIT,
              isCritical = isCritical,
              actorName = actor.character.name,
              skillName = "通常攻撃",
              bannerText = if (isCritical) "💥 クリティカル！ -${finalDamage} DMG" else "-${finalDamage} DMG"
            )
          )
        }

        // Apply HP damage
        val newTargetHp = maxOf(0, target.currentHp - finalDamage)
        _uiState.update { s ->
          if (isActorPlayer) {
            s.copy(enemy = s.enemy.copy(currentHp = newTargetHp))
          } else {
            s.copy(player = s.player.copy(currentHp = newTargetHp))
          }
        }

        delay((850 / speed).toLong())
        _uiState.update { it.copy(visualEffect = null) }

        if (newTargetHp <= 0) {
          return false
        }
        return true
      }

      BattleAction.SPECIAL -> {
        val hadBuff = actor.isBuffed
        if (hadBuff) {
          consumeBuff(isActorPlayer)
        }

        val skillName = actor.character.specialSkillName
        var baseDamage = actor.character.specialSkillDamage // 350 for Irena, 300 for Kaiser
        if (hadBuff) {
          baseDamage += 50
          addLog(
            text = "⚡【強化消費】強化の効果で『$skillName』のダメージ+50！（計: ${baseDamage}）",
            type = LogType.BUFF_PLAYER
          )
        }

        // 1. 特殊技使用による必殺技ゲージ+1
        gainUltimateGauge(isPlayer = isActorPlayer, actorName = actor.character.name, source = "特殊技『$skillName』使用")

        // Set cooldown on actor
        setSpecialCooldown(isActorPlayer, actor.character.specialSkillCooldown)

        // Check opponent evasion
        if (target.isEvading) {
          val isEvaded = checkEvadeSuccess(target)
          if (isEvaded) {
            handleEvadeSuccess(actor, target, isActorPlayer, speed)
            return true
          } else {
            handleEvadeFailure(target, isActorPlayer)
          }
        }

        val finalDamage = baseDamage

        // Sound
        if (actor.character.id == "irena") {
          soundManager.playFeatherShot()
        } else {
          soundManager.playHeavyStrike()
        }

        addLog(
          text = "✨ ${actor.character.name}の特殊技『${skillName}』発動！ ${target.character.name}に ${finalDamage} の大ダメージ！",
          type = if (isActorPlayer) LogType.SPECIAL_PLAYER else LogType.SPECIAL_ENEMY
        )

        // Apply 100% Status Ailment upon hit
        applySpecialStatusAilment(attacker = actor, defenderIsPlayer = !isActorPlayer)

        val effectType = if (actor.character.id == "irena") {
          EffectType.SPECIAL_FEATHER
        } else {
          EffectType.SPECIAL_SMASH
        }

        // Show visual skill effect
        _uiState.update {
          it.copy(
            visualEffect = VisualEffect(
              targetIsPlayer = !isActorPlayer,
              damage = finalDamage,
              effectType = effectType,
              isCritical = false,
              actorName = actor.character.name,
              skillName = skillName,
              statusAilmentName = if (actor.character.id == "irena") "出血" else "重圧",
              bannerText = "『$skillName』-${finalDamage}!"
            )
          )
        }

        // Apply HP damage
        val newTargetHp = maxOf(0, target.currentHp - finalDamage)
        _uiState.update { s ->
          if (isActorPlayer) {
            s.copy(enemy = s.enemy.copy(currentHp = newTargetHp))
          } else {
            s.copy(player = s.player.copy(currentHp = newTargetHp))
          }
        }

        delay((1100 / speed).toLong())
        _uiState.update { it.copy(visualEffect = null) }

        if (newTargetHp <= 0) {
          return false
        }
        return true
      }

      BattleAction.ULTIMATE -> {
        val hadBuff = actor.isBuffed
        if (hadBuff) {
          consumeBuff(isActorPlayer)
        }

        val skillName = actor.character.ultimateSkillName
        var baseDamage = actor.character.ultimateSkillDamage // 500
        if (hadBuff) {
          baseDamage += 50
          addLog(
            text = "⚡【強化消費】強化の効果で必殺技『$skillName』のダメージ+50！（計: ${baseDamage}）",
            type = LogType.BUFF_PLAYER
          )
        }

        // 必殺技を使用した瞬間、ゲージは0/3に戻す
        _uiState.update { s ->
          if (isActorPlayer) {
            s.copy(player = s.player.copy(ultimateGauge = 0))
          } else {
            s.copy(enemy = s.enemy.copy(ultimateGauge = 0))
          }
        }

        addLog(
          text = "🔥 ${actor.character.name}は必殺技ゲージを全て解放した！（ゲージ 0/3）",
          type = LogType.GAUGE_CHANGE
        )

        // Check opponent evasion
        if (target.isEvading) {
          val isEvaded = checkEvadeSuccess(target)
          if (isEvaded) {
            handleEvadeSuccess(actor, target, isActorPlayer, speed)
            return true
          } else {
            handleEvadeFailure(target, isActorPlayer)
          }
        }

        val finalDamage = baseDamage

        // Sound
        soundManager.playCritical()
        if (actor.character.id == "irena") {
          soundManager.playFeatherShot()
        } else {
          soundManager.playHeavyStrike()
        }

        // Dedicated log
        val slogan = actor.character.ultimateSlogan
        addLog(
          text = "🌟🔥【必殺技】${actor.character.name}は${skillName}を放った！ $slogan",
          type = if (isActorPlayer) LogType.ULTIMATE_PLAYER else LogType.ULTIMATE_ENEMY
        )
        addLog(
          text = "💥 ${target.character.name}に ${finalDamage} の超絶ダメージ！",
          type = if (isActorPlayer) LogType.ULTIMATE_PLAYER else LogType.ULTIMATE_ENEMY
        )

        // Show visual ultimate effect
        _uiState.update {
          it.copy(
            visualEffect = VisualEffect(
              targetIsPlayer = !isActorPlayer,
              damage = finalDamage,
              effectType = EffectType.ULTIMATE_BLAST,
              isCritical = false,
              isUltimate = true,
              actorName = actor.character.name,
              skillName = skillName,
              bannerText = "🌟『$skillName』-${finalDamage}!"
            )
          )
        }

        // Apply HP damage
        val newTargetHp = maxOf(0, target.currentHp - finalDamage)
        _uiState.update { s ->
          if (isActorPlayer) {
            s.copy(enemy = s.enemy.copy(currentHp = newTargetHp))
          } else {
            s.copy(player = s.player.copy(currentHp = newTargetHp))
          }
        }

        delay((1300 / speed).toLong())
        _uiState.update { it.copy(visualEffect = null) }

        if (newTargetHp <= 0) {
          return false
        }
        return true
      }
    }
  }

  private fun consumeBuff(isPlayer: Boolean) {
    _uiState.update { s ->
      if (isPlayer) {
        s.copy(player = s.player.copy(isBuffed = false))
      } else {
        s.copy(enemy = s.enemy.copy(isBuffed = false))
      }
    }
  }

  /**
   * Apply Status Ailment upon Special Skill Hit:
   * Irena's 羽弾 -> 100% 出血 (Bleed: 3 turns, 50 DoT/turn, speed -20, def -20)
   * Kaiser's 重撃 -> 100% 重圧 (Pressure: 2 turns, speed -25, atk -25)
   */
  private fun applySpecialStatusAilment(attacker: BattleFighter, defenderIsPlayer: Boolean) {
    val ailmentType = if (attacker.character.id == "irena") {
      StatusAilmentType.BLEED
    } else {
      StatusAilmentType.PRESSURE
    }

    _uiState.update { s ->
      val target = if (defenderIsPlayer) s.player else s.enemy
      // Does not stack. If hit again, reset duration.
      val filtered = target.activeAilments.filter { it.type != ailmentType }
      val updated = filtered + ActiveStatusAilment(ailmentType, ailmentType.defaultDuration)

      if (defenderIsPlayer) {
        s.copy(player = s.player.copy(activeAilments = updated))
      } else {
        s.copy(enemy = s.enemy.copy(activeAilments = updated))
      }
    }

    val defender = if (defenderIsPlayer) _uiState.value.player else _uiState.value.enemy
    addLog(
      text = "⚠️【状態異常付与】${defender.character.name}に「${ailmentType.displayName}」が付与された！（${ailmentType.defaultDuration}ターン: ${ailmentType.description}）",
      type = LogType.AILMENT_APPLIED
    )
  }

  private fun checkEvadeSuccess(target: BattleFighter): Boolean {
    val roll = Random.nextFloat()
    return roll < target.character.evasionRate
  }

  private suspend fun handleEvadeSuccess(
    actor: BattleFighter,
    target: BattleFighter,
    isActorPlayer: Boolean,
    speed: Float
  ) {
    soundManager.playDefend()
    addLog(
      text = "💨【回避成功！】${target.character.name}は身をかわし、${actor.character.name}の攻撃を完全に回避した！",
      type = if (!isActorPlayer) LogType.EVADE_SUCCESS_PLAYER else LogType.EVADE_SUCCESS_ENEMY
    )

    // 回避成功時、必殺技ゲージ+1
    gainUltimateGauge(
      isPlayer = !isActorPlayer,
      actorName = target.character.name,
      source = "回避成功"
    )

    _uiState.update {
      it.copy(
        visualEffect = VisualEffect(
          targetIsPlayer = !isActorPlayer,
          damage = 0,
          effectType = EffectType.EVADE_DODGE,
          isEvade = true,
          bannerText = "💨 回避成功！ 0 DMG"
        )
      )
    }

    delay((850 / speed).toLong())
    _uiState.update { it.copy(visualEffect = null) }
  }

  private fun handleEvadeFailure(target: BattleFighter, isActorPlayer: Boolean) {
    addLog(
      text = "⚠️【回避失敗！】${target.character.name}は回避を試みたが間に合わず、攻撃を受けた！",
      type = if (!isActorPlayer) LogType.EVADE_FAIL_PLAYER else LogType.EVADE_FAIL_ENEMY
    )
  }

  private fun gainUltimateGauge(isPlayer: Boolean, actorName: String, source: String) {
    _uiState.update { s ->
      val fighter = if (isPlayer) s.player else s.enemy
      val currentGauge = fighter.ultimateGauge
      if (currentGauge >= 3) {
        s
      } else {
        val nextGauge = minOf(3, currentGauge + 1)
        if (isPlayer) {
          s.copy(player = s.player.copy(ultimateGauge = nextGauge))
        } else {
          s.copy(enemy = s.enemy.copy(ultimateGauge = nextGauge))
        }
      }
    }

    val updatedFighter = if (isPlayer) _uiState.value.player else _uiState.value.enemy
    val newGauge = updatedFighter.ultimateGauge
    addLog(
      text = "⚡ ${actorName}は${source}により必殺技ゲージ+1！（現在: ${newGauge}/3）",
      type = LogType.GAUGE_CHANGE
    )

    if (newGauge >= 3) {
      addLog(
        text = "🔥【必殺技解放！】${actorName}の必殺技ゲージが最大(3/3)に到達！必殺技が使用可能！",
        type = LogType.GAUGE_CHANGE
      )
    }
  }

  private fun setSpecialCooldown(isActorPlayer: Boolean, cd: Int) {
    _uiState.update { s ->
      if (isActorPlayer) {
        s.copy(player = s.player.copy(specialCooldownRemaining = cd))
      } else {
        s.copy(enemy = s.enemy.copy(specialCooldownRemaining = cd))
      }
    }
  }

  private fun finalizeBattle() {
    val state = _uiState.value
    val playerWon = state.enemy.currentHp <= 0
    val winnerIsPlayer = playerWon

    val winnerName = if (playerWon) state.player.character.name else state.enemy.character.name
    val loserName = if (playerWon) state.enemy.character.name else state.player.character.name
    val slogan = if (playerWon) state.player.character.victorySlogan else state.enemy.character.victorySlogan

    if (playerWon) {
      soundManager.playVictory()
    } else {
      soundManager.playDefeat()
    }

    addLog(
      text = "🏆 ${loserName}のHPが0になった！ ${winnerName}の完全勝利！",
      type = if (playerWon) LogType.VICTORY else LogType.DEFEAT
    )
    addLog(
      text = "${winnerName}: $slogan",
      type = LogType.SYSTEM
    )

    statsRepository.recordBattleResult(
      playerWon = playerWon,
      characterId = state.player.character.id
    )

    _uiState.update {
      it.copy(
        phase = BattlePhase.BATTLE_FINISHED,
        winnerIsPlayer = winnerIsPlayer,
        visualEffect = null
      )
    }
  }

  private fun addLog(text: String, type: LogType) {
    _uiState.update { s ->
      s.copy(
        logs = s.logs + BattleLog(
          id = ++logCounter,
          turn = s.turnNumber,
          text = text,
          type = type
        )
      )
    }
  }
}
