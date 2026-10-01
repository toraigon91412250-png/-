package com.example.raidboss.model

import androidx.compose.ui.graphics.Color

/**
 * 難易度設定
 */
enum class RaidDifficulty(val displayName: String, val hpMultiplier: Double, val atkMultiplier: Double, val rewardBonus: String) {
    NORMAL("Normal", 1.0, 1.0, "報酬 100%"),
    HARD("Hard", 1.4, 1.35, "報酬 150%"),
    HELL("Hell", 2.0, 1.7, "報酬 250% + 限定称号")
}

/**
 * ボスの形態 (Phase)
 */
enum class BossPhaseType(
    val phaseNumber: Int,
    val title: String,
    val subtitle: String,
    val description: String,
    val weakness: String,
    val resistance: String
) {
    PHASE_1(
        phaseNumber = 1,
        title = "古代巨兵 冥王イグニドール",
        subtitle = "【第1形態：封印重装甲】",
        description = "古代遺跡の最奥で目覚めた超巨大重装甲ゴーレム。黒曜石装甲と深紅の過熱炉心で侵入者を拒絶する。",
        weakness = "氷・水属性 (Ice / Hydro)",
        resistance = "物理・火炎耐性 (Slash / Fire Res 25%)"
    ),
    PHASE_2(
        phaseNumber = 2,
        title = "覚醒真冥王 ヴォルケリオン",
        subtitle = "【第2形態：真・暴走覚醒】",
        description = "装甲が崩壊し、封印されていた地獄の紅蓮魔竜が真の姿で覚醒。怒り狂う劫火と紫電で全てを灰燼に帰す。",
        weakness = "聖光・冷気属性 (Holy / Frost)",
        resistance = "火炎吸収・混沌耐性 (Fire Absorb / Chaos Res)"
    )
}

/**
 * ボスのスキル定義
 */
data class BossSkill(
    val id: String,
    val name: String,
    val description: String,
    val basePower: Int,
    val isChargeAttack: Boolean = false,
    val chargeTurns: Int = 0,
    val effectType: EffectType = EffectType.BOSS_CLAW,
    val warningMessage: String = ""
)

/**
 * プレイヤーのアクション種別
 */
enum class ActionType {
    NORMAL_ATTACK,
    SKILL,
    ULTIMATE,
    DEFEND_GUARD,
    POTION_HEAL
}

/**
 * プレイヤースキル定義
 */
data class PlayerSkill(
    val id: String,
    val name: String,
    val shortName: String,
    val description: String,
    val mpCost: Int,
    val tpGain: Int,
    val baseDamageMultiplier: Float,
    val breakGaugeBonus: Float,
    val effectType: EffectType,
    val cooldownTurns: Int = 0,
    var currentCooldown: Int = 0,
    val isUltimate: Boolean = false
)

/**
 * エフェクト種別
 */
enum class EffectType {
    SLASH,
    HEAVY_SLASH,
    ICE_STRIKE,
    HOLY_LIGHT,
    GUARD_SHIELD,
    HEAL_SPARKLE,
    BOSS_CLAW,
    BOSS_BLAST,
    BOSS_ULTIMATE_CATACLYSM,
    PLAYER_ULTIMATE_BURST
}

/**
 * 画面上のダメージ・回復ポップアップ
 */
data class FloatingText(
    val id: Long,
    val text: String,
    val color: Color,
    val isCrit: Boolean = false,
    val isWeakness: Boolean = false,
    val xOffsetRatio: Float = 0f,
    val yOffsetRatio: Float = 0f,
    val createdAt: Long = System.currentTimeMillis()
)

/**
 * 画面演出イベント
 */
data class BattleVisualEvent(
    val id: Long = System.currentTimeMillis(),
    val effectType: EffectType,
    val textMessage: String? = null,
    val isCritical: Boolean = false,
    val durationMs: Long = 700L
)

/**
 * ボス情報
 */
data class BossState(
    val phase: BossPhaseType = BossPhaseType.PHASE_1,
    val currentHp: Long = 120_000L,
    val maxHp: Long = 120_000L,
    val baseAtk: Int = 420,
    val baseDef: Int = 140,
    val breakGauge: Float = 0f, // 0..100
    val isStunned: Boolean = false,
    val chargeTurnsRemaining: Int = 0,
    val nextSkill: BossSkill? = null,
    val attackBuffMultiplier: Float = 1.0f,
    val defenseDownTurns: Int = 0
) {
    val hpPercentage: Float
        get() = (currentHp.toFloat() / maxHp.toFloat()).coerceIn(0f, 1f)

    val currentBarIndex: Int
        get() {
            // マルチゲージ表示（Phase 1: 3本, Phase 2: 4本）
            val totalBars = if (phase == BossPhaseType.PHASE_1) 3 else 4
            val hpPerBar = maxHp / totalBars
            val index = (currentHp / hpPerBar).toInt()
            return index.coerceIn(0, totalBars - 1)
        }
}

/**
 * プレイヤー情報
 */
data class PlayerState(
    val name: String = "英雄アルス",
    val title: String = "聖竜の聖騎士",
    val currentHp: Int = 3800,
    val maxHp: Int = 3800,
    val currentMp: Int = 100,
    val maxMp: Int = 100,
    val tp: Int = 20, // 0..100 (必殺技ゲージ)
    val shield: Int = 0,
    val potionsRemaining: Int = 3,
    val isGuarding: Boolean = false,
    val attackBuffTurns: Int = 0
) {
    val hpPercentage: Float
        get() = (currentHp.toFloat() / maxHp.toFloat()).coerceIn(0f, 1f)
    val mpPercentage: Float
        get() = (currentMp.toFloat() / maxMp.toFloat()).coerceIn(0f, 1f)
    val tpPercentage: Float
        get() = (tp.toFloat() / 100f).coerceIn(0f, 1f)
}

/**
 * バトル戦闘進行フェーズ
 */
enum class BattleTurnState {
    PLAYER_INPUT,
    ACTION_EXECUTING,
    BOSS_TURN_EXECUTING,
    PHASE_TRANSITION_ANIMATING,
    BATTLE_VICTORY,
    BATTLE_DEFEAT
}

/**
 * 戦闘結果データ
 */
data class RaidBattleResult(
    val isVictory: Boolean,
    val totalTurns: Int,
    val totalDamageDealt: Long,
    val maxSingleDamage: Long,
    val totalDamageTaken: Long,
    val difficulty: RaidDifficulty,
    val rank: String, // S, A, B, C
    val rewards: List<String>
)
