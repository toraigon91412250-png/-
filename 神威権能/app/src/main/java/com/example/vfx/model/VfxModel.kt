package com.example.vfx.model

import androidx.compose.ui.graphics.Color

/**
 * Types of ultimate authority skills available.
 */
enum class AuthorityType(
    val title: String,
    val subTitle: String,
    val typeName: String,
    val primaryColor: Color,
    val accentColor: Color
) {
    NONE(
        title = "待機状態",
        subTitle = "権能を選択してください",
        typeName = "STANDBY",
        primaryColor = Color(0xFF888888),
        accentColor = Color(0xFFCCCCCC)
    ),
    ALL_GODS(
        title = "全神の権能",
        subTitle = "神威増幅・光羽落剣",
        typeName = "強化系 (BUFF)",
        primaryColor = Color(0xFFFFD700),
        accentColor = Color(0xFFFFF8DC)
    ),
    RUIN(
        title = "破滅の権能",
        subTitle = "暗黒霧散・真紅爆轟",
        typeName = "攻撃系 (ATTACK)",
        primaryColor = Color(0xFFFF1E40),
        accentColor = Color(0xFF1A050A)
    ),
    FUSION_CATACLYSM(
        title = "全能の一撃",
        subTitle = "神威創世×終末特異点 混沌融合",
        typeName = "秘奥義 (CHAOS)",
        primaryColor = Color(0xFFFF9100),
        accentColor = Color(0xFF7C4DFF)
    )
}

/**
 * Background arena environment.
 */
enum class ArenaStage(val displayName: String, val bgTop: Color, val bgBottom: Color) {
    DIVINE_SANCTUARY("神域の神殿", Color(0xFF0F172A), Color(0xFF020617)),
    VOID_ABYSS("虚無の深淵", Color(0xFF14081E), Color(0xFF05010B)),
    CRIMSON_RUINS("終末の古戦場", Color(0xFF1C0A0E), Color(0xFF070002)),
    CYBER_GRID("無辺の空間", Color(0xFF0A0F1D), Color(0xFF030712))
}

/**
 * Playback and rendering settings.
 */
data class VfxSettings(
    val playbackSpeed: Float = 1.0f,
    val cameraShakeIntensity: Float = 1.0f,
    val soundEnabled: Boolean = true,
    val hapticsEnabled: Boolean = true,
    val showHud: Boolean = true,
    val showInfoOverlay: Boolean = false
)
