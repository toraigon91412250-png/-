package com.example.raidboss.ui.components

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.raidboss.model.BattleVisualEvent
import com.example.raidboss.model.EffectType
import com.example.raidboss.model.FloatingText
import kotlin.random.Random

/**
 * 2D戦闘エフェクト描画キャンバス
 * 斬撃、魔法衝撃波、神聖閃光、爆発などのパーティクルと軌跡を動的に描画
 */
@Composable
fun BattleEffectsCanvas(
    visualEvent: BattleVisualEvent?,
    modifier: Modifier = Modifier
) {
    if (visualEvent == null) return

    val progress = remember(visualEvent.id) { Animatable(0f) }

    LaunchedEffect(visualEvent.id) {
        progress.animateTo(
            targetValue = 1f,
            animationSpec = tween(
                durationMillis = visualEvent.durationMs.toInt(),
                easing = FastOutSlowInEasing
            )
        )
    }

    val currentProgress = progress.value

    Canvas(modifier = modifier.fillMaxSize()) {
        val centerX = size.width / 2f
        val centerY = size.height * 0.42f // ボス中央付近

        when (visualEvent.effectType) {
            EffectType.SLASH, EffectType.HEAVY_SLASH -> {
                // 斬撃エフェクト (鋭い白光・深紅の軌跡)
                val slashLength = size.width * 0.7f * currentProgress
                val slashColor = if (visualEvent.isCritical) Color(0xFFFFD700) else Color(0xFFFF5252)
                val alpha = (1f - currentProgress).coerceIn(0f, 1f)

                // メインの斬撃線
                drawLine(
                    color = Color.White.copy(alpha = alpha),
                    start = Offset(centerX - slashLength / 2, centerY - slashLength * 0.35f),
                    end = Offset(centerX + slashLength / 2, centerY + slashLength * 0.35f),
                    strokeWidth = 12f * (1f - currentProgress * 0.5f),
                    cap = StrokeCap.Round
                )
                // 外側の光彩
                drawLine(
                    color = slashColor.copy(alpha = alpha * 0.8f),
                    start = Offset(centerX - slashLength / 2, centerY - slashLength * 0.35f),
                    end = Offset(centerX + slashLength / 2, centerY + slashLength * 0.35f),
                    strokeWidth = 24f * (1f - currentProgress * 0.5f),
                    cap = StrokeCap.Round
                )
                // 交差する第二の太刀筋
                if (visualEvent.effectType == EffectType.HEAVY_SLASH || visualEvent.isCritical) {
                    drawLine(
                        color = Color.White.copy(alpha = alpha),
                        start = Offset(centerX + slashLength * 0.4f, centerY - slashLength * 0.35f),
                        end = Offset(centerX - slashLength * 0.4f, centerY + slashLength * 0.35f),
                        strokeWidth = 10f * (1f - currentProgress * 0.5f),
                        cap = StrokeCap.Round
                    )
                }
            }

            EffectType.ICE_STRIKE -> {
                // 氷竜閃 (氷柱と冷気の拡散サークル)
                val radius = size.width * 0.45f * currentProgress
                val alpha = (1f - currentProgress).coerceIn(0f, 1f)

                drawCircle(
                    color = Color(0xFF00E5FF).copy(alpha = alpha * 0.6f),
                    radius = radius,
                    center = Offset(centerX, centerY),
                    style = Stroke(width = 8f)
                )
                drawCircle(
                    color = Color(0xFF80D8FF).copy(alpha = alpha * 0.4f),
                    radius = radius * 0.6f,
                    center = Offset(centerX, centerY)
                )

                // 氷の結晶トゲ
                for (i in 0..7) {
                    val angle = (i * 45f) * (Math.PI / 180.0)
                    val r = radius * 1.1f
                    val px = centerX + (Math.cos(angle) * r).toFloat()
                    val py = centerY + (Math.sin(angle) * r).toFloat()
                    drawLine(
                        color = Color.White.copy(alpha = alpha),
                        start = Offset(centerX, centerY),
                        end = Offset(px, py),
                        strokeWidth = 6f,
                        cap = StrokeCap.Round
                    )
                }
            }

            EffectType.HOLY_LIGHT -> {
                // 聖光天破断 (天から降り注ぐ金色の聖光柱)
                val beamWidth = size.width * 0.35f * (1f - currentProgress * 0.6f)
                val alpha = (1f - currentProgress).coerceIn(0f, 1f)

                drawRect(
                    brush = Brush.horizontalGradient(
                        colors = listOf(
                            Color.Transparent,
                            Color(0xFFFFD700).copy(alpha = alpha * 0.7f),
                            Color.White.copy(alpha = alpha),
                            Color(0xFFFFD700).copy(alpha = alpha * 0.7f),
                            Color.Transparent
                        ),
                        startX = centerX - beamWidth / 2,
                        endX = centerX + beamWidth / 2
                    ),
                    topLeft = Offset(centerX - beamWidth / 2, 0f),
                    size = androidx.compose.ui.geometry.Size(beamWidth, size.height)
                )
            }

            EffectType.GUARD_SHIELD -> {
                // 神聖の鉄壁 (プレイヤー側の黄金障壁)
                val shieldY = size.height * 0.75f
                val shieldRadius = size.width * 0.38f * (0.6f + currentProgress * 0.4f)
                val alpha = (1f - currentProgress).coerceIn(0f, 1f)

                drawCircle(
                    color = Color(0xFFFFD700).copy(alpha = alpha * 0.5f),
                    radius = shieldRadius,
                    center = Offset(centerX, shieldY),
                    style = Stroke(width = 10f)
                )
                drawCircle(
                    color = Color(0xFFFFF9C4).copy(alpha = alpha * 0.25f),
                    radius = shieldRadius * 0.9f,
                    center = Offset(centerX, shieldY)
                )
            }

            EffectType.HEAL_SPARKLE -> {
                // 回復エフェクト (緑と白の光の粒子上昇)
                val playerY = size.height * 0.78f
                val alpha = (1f - currentProgress).coerceIn(0f, 1f)

                for (i in 0..12) {
                    val offsetX = (i - 6) * 22f
                    val offsetY = -currentProgress * 140f - (i * 12f)
                    drawCircle(
                        color = Color(0xFF00E676).copy(alpha = alpha),
                        radius = 8f * (1f - currentProgress * 0.4f),
                        center = Offset(centerX + offsetX, playerY + offsetY)
                    )
                }
            }

            EffectType.BOSS_CLAW -> {
                // ボスの爪痕
                val clawY = size.height * 0.72f
                val alpha = (1f - currentProgress).coerceIn(0f, 1f)
                val offsetSpread = 40f

                for (i in -1..1) {
                    drawLine(
                        color = Color(0xFFFF1744).copy(alpha = alpha),
                        start = Offset(centerX + (i * offsetSpread) - 100f, clawY - 80f),
                        end = Offset(centerX + (i * offsetSpread) + 100f, clawY + 80f),
                        strokeWidth = 14f,
                        cap = StrokeCap.Round
                    )
                }
            }

            EffectType.BOSS_BLAST, EffectType.BOSS_ULTIMATE_CATACLYSM -> {
                // 画面全体の紅蓮衝撃波
                val radius = size.width * 0.8f * currentProgress
                val alpha = (1f - currentProgress).coerceIn(0f, 1f)
                val color = if (visualEvent.effectType == EffectType.BOSS_ULTIMATE_CATACLYSM) {
                    Color(0xFFD50000)
                } else {
                    Color(0xFFFF6D00)
                }

                drawCircle(
                    color = color.copy(alpha = alpha * 0.6f),
                    radius = radius,
                    center = Offset(centerX, centerY),
                    style = Stroke(width = 16f)
                )
                drawCircle(
                    color = Color(0xFF4A148C).copy(alpha = alpha * 0.3f),
                    radius = radius * 0.85f,
                    center = Offset(centerX, centerY)
                )
            }

            EffectType.PLAYER_ULTIMATE_BURST -> {
                // 必殺技フィニッシュ大爆発
                val radius = size.width * 0.95f * currentProgress
                val alpha = (1f - currentProgress).coerceIn(0f, 1f)

                drawCircle(
                    brush = Brush.radialGradient(
                        colors = listOf(Color.White, Color(0xFFFFD700), Color(0xFFFF3D00), Color.Transparent),
                        center = Offset(centerX, centerY),
                        radius = radius
                    ),
                    radius = radius,
                    center = Offset(centerX, centerY)
                )
            }
        }
    }
}

/**
 * ダメージ・回復数値のポップアップアニメーション
 */
@Composable
fun FloatingNumbersLayer(
    floatingTexts: List<FloatingText>,
    onFinished: (Long) -> Unit,
    modifier: Modifier = Modifier
) {
    Box(modifier = modifier.fillMaxSize()) {
        floatingTexts.forEach { item ->
            KeyedFloatingTextItem(item = item, onFinished = { onFinished(item.id) })
        }
    }
}

@Composable
private fun BoxScope.KeyedFloatingTextItem(
    item: FloatingText,
    onFinished: () -> Unit
) {
    val transitionProgress = remember(item.id) { Animatable(0f) }

    LaunchedEffect(item.id) {
        transitionProgress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 850, easing = LinearOutSlowInEasing)
        )
        onFinished()
    }

    val progress = transitionProgress.value
    val verticalOffset = -progress * 80f
    val scale = if (item.isCrit) {
        if (progress < 0.2f) 1.5f + (progress * 2.5f) else 1.3f - ((progress - 0.2f) * 0.3f)
    } else {
        if (progress < 0.15f) 1.2f else 1.0f
    }
    val alpha = (1f - (progress - 0.5f).coerceAtLeast(0f) * 2f).coerceIn(0f, 1f)

    Box(
        modifier = Modifier
            .align(Alignment.Center)
            .offset(
                x = (item.xOffsetRatio * 200).dp,
                y = ((item.yOffsetRatio * 200) + verticalOffset).dp
            )
    ) {
        // アウトライン演出
        Text(
            text = item.text,
            color = Color.Black.copy(alpha = alpha * 0.9f),
            fontSize = if (item.isCrit) 30.sp else 22.sp,
            fontWeight = FontWeight.Black,
            modifier = Modifier.offset(x = 2.dp, y = 2.dp)
        )
        Text(
            text = item.text,
            color = item.color.copy(alpha = alpha),
            fontSize = if (item.isCrit) 30.sp else 22.sp,
            fontWeight = FontWeight.ExtraBold
        )
    }
}
