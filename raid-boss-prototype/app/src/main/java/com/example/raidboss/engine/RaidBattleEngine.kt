package com.example.raidboss.engine

import androidx.compose.ui.graphics.Color
import com.example.raidboss.model.*
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlin.math.max
import kotlin.random.Random

/**
 * 完全独立したレイドボス戦闘エンジン
 * UIフレームワークに依存せず、別ゲームへの移植やロジック単体テストが容易な設計
 */
class RaidBattleEngine(
    private val scope: CoroutineScope = CoroutineScope(Dispatchers.Default + SupervisorJob())
) {
    private val _bossState = MutableStateFlow(BossState())
    val bossState: StateFlow<BossState> = _bossState.asStateFlow()

    private val _playerState = MutableStateFlow(PlayerState())
    val playerState: StateFlow<PlayerState> = _playerState.asStateFlow()

    private val _turnNumber = MutableStateFlow(1)
    val turnNumber: StateFlow<Int> = _turnNumber.asStateFlow()

    private val _turnState = MutableStateFlow(BattleTurnState.PLAYER_INPUT)
    val turnState: StateFlow<BattleTurnState> = _turnState.asStateFlow()

    private val _battleLogs = MutableStateFlow<List<String>>(emptyList())
    val battleLogs: StateFlow<List<String>> = _battleLogs.asStateFlow()

    private val _floatingTexts = MutableStateFlow<List<FloatingText>>(emptyList())
    val floatingTexts: StateFlow<List<FloatingText>> = _floatingTexts.asStateFlow()

    private val _currentVisualEvent = MutableStateFlow<BattleVisualEvent?>(null)
    val currentVisualEvent: StateFlow<BattleVisualEvent?> = _currentVisualEvent.asStateFlow()

    // 必殺技演出用カットイン状態
    private val _ultimateCutInActive = MutableStateFlow(false)
    val ultimateCutInActive: StateFlow<Boolean> = _ultimateCutInActive.asStateFlow()

    // 第2形態移行演出カットイン状態
    private val _phase2CutInActive = MutableStateFlow(false)
    val phase2CutInActive: StateFlow<Boolean> = _phase2CutInActive.asStateFlow()

    private val _battleResult = MutableStateFlow<RaidBattleResult?>(null)
    val battleResult: StateFlow<RaidBattleResult?> = _battleResult.asStateFlow()

    private var currentDifficulty: RaidDifficulty = RaidDifficulty.NORMAL
    private var totalDamageDealt: Long = 0L
    private var maxSingleDamage: Long = 0L
    private var totalDamageTaken: Long = 0L

    /**
     * バトル初期化
     */
    fun startBattle(difficulty: RaidDifficulty = RaidDifficulty.NORMAL, startAtPhase2: Boolean = false) {
        currentDifficulty = difficulty
        totalDamageDealt = 0L
        maxSingleDamage = 0L
        totalDamageTaken = 0L
        _turnNumber.value = 1
        _battleResult.value = null
        _battleLogs.value = emptyList()
        _floatingTexts.value = emptyList()
        _currentVisualEvent.value = null
        _ultimateCutInActive.value = false
        _phase2CutInActive.value = false

        val initialPlayer = PlayerState(
            currentHp = 3800,
            maxHp = 3800,
            currentMp = 100,
            maxMp = 100,
            tp = 20,
            shield = 0,
            potionsRemaining = 3
        )
        _playerState.value = initialPlayer

        if (startAtPhase2) {
            val p2Hp = (180_000L * difficulty.hpMultiplier).toLong()
            _bossState.value = BossState(
                phase = BossPhaseType.PHASE_2,
                currentHp = p2Hp,
                maxHp = p2Hp,
                baseAtk = (580 * difficulty.atkMultiplier).toInt(),
                baseDef = 90,
                breakGauge = 0f,
                nextSkill = RaidSkillCatalog.BOSS_P2_CLAW
            )
            addLog("【緊急突入】覚醒真冥王 ヴォルケリオン（第2形態）との決戦が開始された！")
        } else {
            val p1Hp = (120_000L * difficulty.hpMultiplier).toLong()
            _bossState.value = BossState(
                phase = BossPhaseType.PHASE_1,
                currentHp = p1Hp,
                maxHp = p1Hp,
                baseAtk = (420 * difficulty.atkMultiplier).toInt(),
                baseDef = 140,
                breakGauge = 0f,
                nextSkill = RaidSkillCatalog.BOSS_P1_CLEAVE
            )
            addLog("レイドボス討伐戦開始！難易度: ${difficulty.displayName}")
            addLog("【第1形態】古代巨兵 冥王イグニドールが威圧を放っている！")
        }

        _turnState.value = BattleTurnState.PLAYER_INPUT
    }

    /**
     * プレイヤーの行動を実行
     */
    fun executePlayerAction(actionType: ActionType, skill: PlayerSkill? = null) {
        if (_turnState.value != BattleTurnState.PLAYER_INPUT) return

        scope.launch {
            _turnState.value = BattleTurnState.ACTION_EXECUTING

            when (actionType) {
                ActionType.NORMAL_ATTACK -> {
                    performPlayerAttack(RaidSkillCatalog.PLAYER_NORMAL_ATTACK)
                }
                ActionType.SKILL -> {
                    val targetSkill = skill ?: RaidSkillCatalog.PLAYER_SKILL_ICE
                    if (_playerState.value.currentMp < targetSkill.mpCost) {
                        addLog("MPが不足しています！")
                        _turnState.value = BattleTurnState.PLAYER_INPUT
                        return@launch
                    }
                    // MP消費 & 実行
                    _playerState.value = _playerState.value.copy(
                        currentMp = _playerState.value.currentMp - targetSkill.mpCost
                    )
                    if (targetSkill.effectType == EffectType.GUARD_SHIELD) {
                        performPlayerGuard()
                    } else {
                        performPlayerAttack(targetSkill)
                    }
                }
                ActionType.ULTIMATE -> {
                    if (_playerState.value.tp < 100) {
                        addLog("TPが100%に達していません！")
                        _turnState.value = BattleTurnState.PLAYER_INPUT
                        return@launch
                    }
                    // TP全消費
                    _playerState.value = _playerState.value.copy(tp = 0)
                    performPlayerUltimate()
                }
                ActionType.DEFEND_GUARD -> {
                    performPlayerGuard()
                }
                ActionType.POTION_HEAL -> {
                    performPlayerPotion()
                }
            }

            delay(600)

            // ボス撃破判定 or 第2形態移行判定
            if (_bossState.value.currentHp <= 0) {
                if (_bossState.value.phase == BossPhaseType.PHASE_1) {
                    triggerPhase2Transition()
                    return@launch
                } else {
                    // 第2形態撃破！勝利！
                    triggerVictory()
                    return@launch
                }
            }

            // ボスのターン
            delay(500)
            executeBossTurn()
        }
    }

    /**
     * 通常攻撃・スキル攻撃処理
     */
    private suspend fun performPlayerAttack(skill: PlayerSkill) {
        val player = _playerState.value
        val boss = _bossState.value

        addLog("${player.name}の『${skill.name}』！")

        // 弱点判定
        val isWeakness = when {
            boss.phase == BossPhaseType.PHASE_1 && skill.effectType == EffectType.ICE_STRIKE -> true
            boss.phase == BossPhaseType.PHASE_2 && skill.effectType == EffectType.HOLY_LIGHT -> true
            else -> false
        }

        // クリティカル判定 (20%)
        val isCrit = Random.nextFloat() < 0.22f
        val critMult = if (isCrit) 1.5f else 1.0f
        val weaknessMult = if (isWeakness) 1.6f else 1.0f
        val stunMult = if (boss.isStunned) 1.5f else 1.0f
        val defDownMult = if (boss.defenseDownTurns > 0) 1.25f else 1.0f
        val playerBuffMult = if (player.attackBuffTurns > 0) 1.3f else 1.0f

        // ダメージ計算
        val baseAtk = 2600
        val variance = Random.nextDouble(0.92, 1.08)
        val calculatedDmg = (baseAtk * skill.baseDamageMultiplier * critMult * weaknessMult * stunMult * defDownMult * playerBuffMult * variance).toLong()

        // 演出イベント発火
        _currentVisualEvent.value = BattleVisualEvent(
            effectType = skill.effectType,
            textMessage = skill.name,
            isCritical = isCrit
        )

        delay(350)

        // ダメージ適用
        applyDamageToBoss(calculatedDmg, isCrit, isWeakness)

        // TP蓄積
        val newTp = (player.tp + skill.tpGain).coerceAtMost(100)
        _playerState.value = player.copy(tp = newTp)

        // ブレイクゲージ加算
        var newBreak = boss.breakGauge + skill.breakGaugeBonus * (if (isWeakness) 1.5f else 1.0f)
        var bossStunned = boss.isStunned
        if (newBreak >= 100f && !boss.isStunned) {
            newBreak = 0f
            bossStunned = true
            addLog("💥【BREAK!!】ボスの体勢を崩した！1ターン行動不能＆被ダメージ1.5倍！")
            showFloatingText("BREAK!!", Color(0xFF00E5FF), isCrit = true, 0f, -0.2f)
        }

        // デバフ適用 (聖光天破断)
        val newDefDown = if (skill.id == RaidSkillCatalog.PLAYER_SKILL_HOLY.id) 2 else boss.defenseDownTurns

        _bossState.value = _bossState.value.copy(
            breakGauge = newBreak.coerceIn(0f, 100f),
            isStunned = bossStunned,
            defenseDownTurns = newDefDown
        )
    }

    /**
     * 必殺技演出＆連続ダメージ
     */
    private suspend fun performPlayerUltimate() {
        addLog("⚡【究極覚醒奥義】${_playerState.value.name}が全魔力を解放した！")

        // カットイン表示
        _ultimateCutInActive.value = true
        delay(1300)
        _ultimateCutInActive.value = false

        // 7連撃の連続ダメージ演出
        val hitCount = 7
        val boss = _bossState.value
        val stunMult = if (boss.isStunned) 1.5f else 1.0f

        for (i in 1..hitCount) {
            val isFinalHit = (i == hitCount)
            val hitPower = if (isFinalHit) 12000L else 4200L
            val variance = Random.nextDouble(0.9, 1.1)
            val hitDamage = (hitPower * stunMult * variance).toLong()

            _currentVisualEvent.value = BattleVisualEvent(
                effectType = if (isFinalHit) EffectType.PLAYER_ULTIMATE_BURST else EffectType.HEAVY_SLASH,
                textMessage = if (isFinalHit) "滅殺極撃！" else "連撃 $i/7",
                isCritical = isFinalHit,
                durationMs = 250L
            )

            applyDamageToBoss(hitDamage, isCrit = isFinalHit, isWeakness = true)
            delay(160)
        }

        // ボスを確実にブレイク状態にする
        _bossState.value = _bossState.value.copy(
            isStunned = true,
            breakGauge = 0f
        )
        addLog("💥 必殺技の猛攻によりボスは完全に沈黙した！")
    }

    /**
     * 防御・シールド展開
     */
    private suspend fun performPlayerGuard() {
        val player = _playerState.value
        val shieldAmount = 1400
        val healAmount = 600
        val newHp = (player.currentHp + healAmount).coerceAtMost(player.maxHp)
        val newTp = (player.tp + 18).coerceAtMost(100)

        _playerState.value = player.copy(
            currentHp = newHp,
            shield = player.shield + shieldAmount,
            tp = newTp,
            isGuarding = true
        )

        _currentVisualEvent.value = BattleVisualEvent(
            effectType = EffectType.GUARD_SHIELD,
            textMessage = "神聖の鉄壁展開！"
        )

        showFloatingText("+$healAmount HP", Color(0xFF00E676), false, 0f, 0.2f)
        showFloatingText("+$shieldAmount SHIELD", Color(0xFFFFD700), false, 0f, 0.35f)
        addLog("【防護】神聖障壁を展開！シールド+$shieldAmount / HP+$healAmount / 被ダメージ半減！")
        delay(400)
    }

    /**
     * ポーション回復
     */
    private suspend fun performPlayerPotion() {
        val player = _playerState.value
        if (player.potionsRemaining <= 0) {
            addLog("回復薬が残っていません！")
            _turnState.value = BattleTurnState.PLAYER_INPUT
            return
        }

        val healAmount = 1800
        val mpRecover = 40
        val newHp = (player.currentHp + healAmount).coerceAtMost(player.maxHp)
        val newMp = (player.currentMp + mpRecover).coerceAtMost(player.maxMp)

        _playerState.value = player.copy(
            currentHp = newHp,
            currentMp = newMp,
            potionsRemaining = player.potionsRemaining - 1
        )

        _currentVisualEvent.value = BattleVisualEvent(
            effectType = EffectType.HEAL_SPARKLE,
            textMessage = "特級回復薬使用！"
        )

        showFloatingText("+$healAmount HP", Color(0xFF00E676), false, 0f, 0.2f)
        showFloatingText("+$mpRecover MP", Color(0xFF40C4FF), false, 0f, 0.35f)
        addLog("【回復】特級霊薬を服用！HP+$healAmount, MP+$mpRecover (残り: ${_playerState.value.potionsRemaining}個)")
        delay(400)
    }

    /**
     * ボスへのダメージ適用
     */
    private fun applyDamageToBoss(damage: Long, isCrit: Boolean, isWeakness: Boolean) {
        val current = _bossState.value.currentHp
        val nextHp = max(0L, current - damage)
        _bossState.value = _bossState.value.copy(currentHp = nextHp)

        totalDamageDealt += damage
        if (damage > maxSingleDamage) maxSingleDamage = damage

        val color = when {
            isCrit -> Color(0xFFFFD700) // Gold
            isWeakness -> Color(0xFFFF5252) // Red/Orange
            else -> Color(0xFFFFFFFF)
        }
        val textPrefix = when {
            isCrit && isWeakness -> "CRITICAL WEAKNESS! "
            isCrit -> "CRITICAL! "
            isWeakness -> "WEAKNESS! "
            else -> ""
        }
        val xRand = Random.nextFloat() * 0.4f - 0.2f
        val yRand = Random.nextFloat() * 0.3f - 0.2f
        showFloatingText("$textPrefix$damage", color, isCrit, xRand, yRand)
    }

    /**
     * ボスの行動実行
     */
    private suspend fun executeBossTurn() {
        _turnState.value = BattleTurnState.BOSS_TURN_EXECUTING
        val boss = _bossState.value
        val player = _playerState.value

        // スタン解除判定
        if (boss.isStunned) {
            addLog("ボスの体勢が復旧した！")
            _bossState.value = boss.copy(isStunned = false)
            delay(400)
            endTurnCycle()
            return
        }

        // 次に放つスキルを決定
        val skillToUse: BossSkill = boss.nextSkill ?: pickNextBossSkill(boss)

        addLog("⚔️ ${boss.phase.title}の『${skillToUse.name}』！")

        // チャージ技の場合
        if (skillToUse.isChargeAttack) {
            addLog(skillToUse.warningMessage)
            _currentVisualEvent.value = BattleVisualEvent(
                effectType = EffectType.BOSS_BLAST,
                textMessage = "大技チャージ中！"
            )
            // 次のターンに大技
            val nextUltimateSkill = if (boss.phase == BossPhaseType.PHASE_1) {
                RaidSkillCatalog.BOSS_P1_MELTDOWN
            } else {
                RaidSkillCatalog.BOSS_P2_VOID_BEAM
            }
            _bossState.value = _bossState.value.copy(
                nextSkill = nextUltimateSkill,
                chargeTurnsRemaining = 1
            )
            delay(600)
            endTurnCycle()
            return
        }

        // 攻撃実行
        _currentVisualEvent.value = BattleVisualEvent(
            effectType = skillToUse.effectType,
            textMessage = skillToUse.name,
            isCritical = skillToUse.basePower > 2000
        )
        delay(400)

        // ダメージ計算
        val baseDamage = (skillToUse.basePower * boss.attackBuffMultiplier * Random.nextDouble(0.9, 1.1)).toInt()
        var actualDamage = baseDamage
        if (player.isGuarding) {
            actualDamage = (actualDamage * 0.5f).toInt()
            addLog("【防壁効果】ガードにより被ダメージを半減！")
        }

        // シールド消費
        var remainingDmg = actualDamage
        var newShield = player.shield
        if (newShield > 0) {
            if (newShield >= remainingDmg) {
                newShield -= remainingDmg
                remainingDmg = 0
                addLog("シールドが攻撃を吸収した！ (残シールド: $newShield)")
            } else {
                remainingDmg -= newShield
                newShield = 0
                addLog("シールドが粉砕された！突破ダメージ: $remainingDmg")
            }
        }

        // プレイヤーHP減少
        val newHp = max(0, player.currentHp - remainingDmg)
        totalDamageTaken += actualDamage
        _playerState.value = player.copy(
            currentHp = newHp,
            shield = newShield,
            isGuarding = false // ガード状態リセット
        )

        showFloatingText("-$actualDamage", Color(0xFFFF1744), isCrit = actualDamage > 1500, 0f, 0.25f)

        // プレイヤー敗北判定
        if (newHp <= 0) {
            delay(500)
            triggerDefeat()
            return
        }

        // 次ターンのボス行動を予約
        val nextSkill = pickNextBossSkill(_bossState.value)
        _bossState.value = _bossState.value.copy(
            nextSkill = nextSkill,
            chargeTurnsRemaining = 0
        )

        delay(500)
        endTurnCycle()
    }

    /**
     * ボスの次手を選択
     */
    private fun pickNextBossSkill(boss: BossState): BossSkill {
        val rand = Random.nextInt(100)
        return if (boss.phase == BossPhaseType.PHASE_1) {
            when {
                _turnNumber.value % 3 == 0 -> RaidSkillCatalog.BOSS_P1_OVERHEAT
                rand < 50 -> RaidSkillCatalog.BOSS_P1_CLEAVE
                else -> RaidSkillCatalog.BOSS_P1_SMOKE
            }
        } else {
            // 第2形態：攻撃頻度・破壊力が激化
            when {
                _turnNumber.value % 4 == 0 -> RaidSkillCatalog.BOSS_P2_VOID_CHARGE
                rand < 35 -> RaidSkillCatalog.BOSS_P2_CLAW
                rand < 70 -> RaidSkillCatalog.BOSS_P2_CATACLYSM
                else -> RaidSkillCatalog.BOSS_P2_ROAR
            }
        }
    }

    /**
     * ターン終了処理
     */
    private fun endTurnCycle() {
        // デバフターン減少
        val boss = _bossState.value
        val player = _playerState.value

        val newDefDown = max(0, boss.defenseDownTurns - 1)
        val newAtkBuff = max(0, player.attackBuffTurns - 1)
        // 自然MP回復 +10
        val newMp = (player.currentMp + 10).coerceAtMost(player.maxMp)

        _bossState.value = boss.copy(defenseDownTurns = newDefDown)
        _playerState.value = player.copy(
            attackBuffTurns = newAtkBuff,
            currentMp = newMp
        )

        _turnNumber.value = _turnNumber.value + 1
        _turnState.value = BattleTurnState.PLAYER_INPUT
    }

    /**
     * 第2形態への覚醒移行演出とステータス変化
     */
    fun triggerPhase2Transition() {
        scope.launch {
            _turnState.value = BattleTurnState.PHASE_TRANSITION_ANIMATING
            addLog("━━━━━━━━━━━━━━━━━━━━")
            addLog("⚠️【緊急警報】古代巨兵の装甲が砕け散る…！")
            addLog("地底のマグマが逆流し、真なる紅蓮魔竜が目を覚ます！")
            addLog("━━━━━━━━━━━━━━━━━━━━")

            // カットイン表示
            _phase2CutInActive.value = true
            delay(2400)
            _phase2CutInActive.value = false

            // 第2形態へステータス更新
            val p2MaxHp = (180_000L * currentDifficulty.hpMultiplier).toLong()
            _bossState.value = BossState(
                phase = BossPhaseType.PHASE_2,
                currentHp = p2MaxHp,
                maxHp = p2MaxHp,
                baseAtk = (580 * currentDifficulty.atkMultiplier).toInt(),
                baseDef = 90,
                breakGauge = 0f,
                isStunned = false,
                nextSkill = RaidSkillCatalog.BOSS_P2_ROAR
            )

            // プレイヤーの全魔力も一部回復
            _playerState.value = _playerState.value.copy(
                currentMp = _playerState.value.maxMp,
                tp = (_playerState.value.tp + 30).coerceAtMost(100)
            )

            addLog("🔥【第二形態 覚醒完了】覚醒真冥王 ヴォルケリオンが降臨した！")
            delay(500)
            _turnState.value = BattleTurnState.PLAYER_INPUT
        }
    }

    /**
     * 勝利
     */
    private fun triggerVictory() {
        _turnState.value = BattleTurnState.BATTLE_VICTORY
        addLog("🎉 覚醒真冥王 ヴォルケリオンの討伐に成功した！完全勝利！")

        val turns = _turnNumber.value
        val rank = when {
            turns <= 8 -> "S"
            turns <= 14 -> "A"
            turns <= 20 -> "B"
            else -> "C"
        }

        val rewards = listOf(
            "古代冥王の炉心核 × 1",
            "獄炎竜の紅蓮魔角 × 2",
            "冥界の黒曜装甲片 × 5",
            "レイド討伐メダル × 500"
        )

        _battleResult.value = RaidBattleResult(
            isVictory = true,
            totalTurns = turns,
            totalDamageDealt = totalDamageDealt,
            maxSingleDamage = maxSingleDamage,
            totalDamageTaken = totalDamageTaken,
            difficulty = currentDifficulty,
            rank = rank,
            rewards = rewards
        )
    }

    /**
     * 敗北
     */
    private fun triggerDefeat() {
        _turnState.value = BattleTurnState.BATTLE_DEFEAT
        addLog("💀 戦闘不能… レイドボス討伐に失敗した。")

        _battleResult.value = RaidBattleResult(
            isVictory = false,
            totalTurns = _turnNumber.value,
            totalDamageDealt = totalDamageDealt,
            maxSingleDamage = maxSingleDamage,
            totalDamageTaken = totalDamageTaken,
            difficulty = currentDifficulty,
            rank = "D",
            rewards = emptyList()
        )
    }

    /**
     * ダメージや回復ポップアップ
     */
    private fun showFloatingText(text: String, color: Color, isCrit: Boolean, xRatio: Float, yRatio: Float) {
        val item = FloatingText(
            id = System.nanoTime(),
            text = text,
            color = color,
            isCrit = isCrit,
            xOffsetRatio = xRatio,
            yOffsetRatio = yRatio
        )
        _floatingTexts.value = (_floatingTexts.value + item).takeLast(6)
    }

    /**
     * 画面タップや終了時のクリーンアップ
     */
    fun removeFloatingText(id: Long) {
        _floatingTexts.value = _floatingTexts.value.filter { it.id != id }
    }

    private fun addLog(message: String) {
        _battleLogs.value = (_battleLogs.value + message).takeLast(40)
    }
}
