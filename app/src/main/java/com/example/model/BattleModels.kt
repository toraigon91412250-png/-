package com.example.model

enum class BattleAction(val displayName: String, val description: String) {
  ATTACK("攻撃", "通常攻撃を繰り出す（攻撃力-防御力）"),
  EVADE("回避", "相手の攻撃を回避判定（成功時0ダメ＆ゲージ+1）"),
  BUFF("強化", "次に行う自分の攻撃系行動のダメージを+50する"),
  SPECIAL("特殊技", "固有の技を放つ（クールダウンあり、ゲージ+1）"),
  ULTIMATE("必殺技", "ゲージ3/3を消費して放つ超強力な必殺技")
}

enum class StatusAilmentType(
  val displayName: String,
  val defaultDuration: Int,
  val dotDamage: Int,
  val speedMod: Int,
  val defenseMod: Int,
  val attackMod: Int,
  val description: String
) {
  BLEED(
    displayName = "出血",
    defaultDuration = 3,
    dotDamage = 50,
    speedMod = -20,
    defenseMod = -20,
    attackMod = 0,
    description = "各ターン開始時に50ダメージ、速度-20、防御-20"
  ),
  PRESSURE(
    displayName = "重圧",
    defaultDuration = 2,
    dotDamage = 0,
    speedMod = -25,
    defenseMod = 0,
    attackMod = -25,
    description = "速度-25、攻撃力-25"
  )
}

data class ActiveStatusAilment(
  val type: StatusAilmentType,
  val remainingTurns: Int
)

data class BattleFighter(
  val character: CharacterDef,
  val currentHp: Int,
  val specialCooldownRemaining: Int = 0,
  val ultimateGauge: Int = 0, // 最大3、初期値0
  val isBuffed: Boolean = false, // 強化中（次の攻撃系行動ダメージ+50）
  val isEvading: Boolean = false,
  val isPlayer: Boolean,
  val activeAilments: List<ActiveStatusAilment> = emptyList()
) {
  val maxHp: Int get() = character.maxHp
  val hpPercentage: Float get() = (currentHp.toFloat() / maxHp.toFloat()).coerceIn(0f, 1f)
  val isSpecialReady: Boolean get() = specialCooldownRemaining <= 0
  val isUltimateReady: Boolean get() = ultimateGauge >= 3
  val isDefeated: Boolean get() = currentHp <= 0

  // Effective stats factoring in status ailments (future-proofed for speed/stat systems)
  val effectiveSpeed: Int get() {
    val mod = activeAilments.sumOf { it.type.speedMod }
    return maxOf(1, character.speed + mod)
  }

  val effectiveAttack: Int get() {
    val mod = activeAilments.sumOf { it.type.attackMod }
    return maxOf(1, character.attack + mod)
  }

  val effectiveDefense: Int get() {
    val mod = activeAilments.sumOf { it.type.defenseMod }
    return maxOf(0, character.defense + mod)
  }

  val isBleeding: Boolean get() = activeAilments.any { it.type == StatusAilmentType.BLEED }
  val isPressured: Boolean get() = activeAilments.any { it.type == StatusAilmentType.PRESSURE }
}

enum class LogType {
  SYSTEM,
  PLAYER_ACTION,
  ENEMY_ACTION,
  CRITICAL_PLAYER,
  CRITICAL_ENEMY,
  DAMAGE_PLAYER,
  DAMAGE_ENEMY,
  EVADE_SUCCESS_PLAYER,
  EVADE_SUCCESS_ENEMY,
  EVADE_FAIL_PLAYER,
  EVADE_FAIL_ENEMY,
  BUFF_PLAYER,
  BUFF_ENEMY,
  SPECIAL_PLAYER,
  SPECIAL_ENEMY,
  ULTIMATE_PLAYER,
  ULTIMATE_ENEMY,
  GAUGE_CHANGE,
  PASSIVE_TRIGGER,
  AILMENT_APPLIED,
  AILMENT_DOT,
  AILMENT_EXPIRED,
  VICTORY,
  DEFEAT
}

data class BattleLog(
  val id: Long,
  val turn: Int,
  val text: String,
  val type: LogType,
  val timestamp: Long = System.currentTimeMillis()
)

enum class EffectType {
  NONE,
  NORMAL_HIT,
  EVADE_DODGE,
  BUFF_POWER,
  SPECIAL_FEATHER,
  SPECIAL_SMASH,
  ULTIMATE_BLAST,
  BLEED_TICK,
  PRESSURE_DEBUFF
}

data class VisualEffect(
  val targetIsPlayer: Boolean,
  val damage: Int = 0,
  val effectType: EffectType = EffectType.NONE,
  val isCritical: Boolean = false,
  val isEvade: Boolean = false,
  val isBuff: Boolean = false,
  val isUltimate: Boolean = false,
  val actorName: String = "",
  val skillName: String = "",
  val statusAilmentName: String = "",
  val bannerText: String = "",
  val effectId: Long = System.currentTimeMillis()
)

enum class CpuDifficulty(val title: String, val description: String) {
  NORMAL("ノーマル", "状況を見てバランスよく行動"),
  EXPERT("エキスパート", "先読みと回避・強化を駆使する戦略派")
}

enum class BattlePhase {
  SELECT_ACTION,      // Waiting for player input
  EXECUTING_TURNS,    // Playing battle animations and turn steps
  BATTLE_FINISHED     // Victor decided
}

data class BattleUiState(
  val turnNumber: Int = 1,
  val player: BattleFighter,
  val enemy: BattleFighter,
  val logs: List<BattleLog> = emptyList(),
  val phase: BattlePhase = BattlePhase.SELECT_ACTION,
  val visualEffect: VisualEffect? = null,
  val winnerIsPlayer: Boolean? = null,
  val cpuDifficulty: CpuDifficulty = CpuDifficulty.NORMAL,
  val battleSpeedMultiplier: Float = 1.0f,
  val isSoundEnabled: Boolean = true,
  val isAnimating: Boolean = false
)
