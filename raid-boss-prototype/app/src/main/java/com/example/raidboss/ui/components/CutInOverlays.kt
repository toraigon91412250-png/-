package com.example.raidboss.ui.components

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CutCornerShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R

/**
 * 必殺技発動時の全画面カットイン演出
 */
@Composable
fun UltimateCutInOverlay(
    isActive: Boolean,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = isActive,
        enter = fadeIn(animationSpec = tween(150)) + scaleIn(initialScale = 0.8f),
        exit = fadeOut(animationSpec = tween(200)),
        modifier = modifier.fillMaxSize()
    ) {
        val infiniteTransition = rememberInfiniteTransition(label = "ultimate_cutin")
        val pulseScale by infiniteTransition.animateFloat(
            initialValue = 1.0f,
            targetValue = 1.05f,
            animationSpec = infiniteRepeatable(
                animation = tween(250, easing = FastOutSlowInEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "pulse"
        )
        val flashAlpha by infiniteTransition.animateFloat(
            initialValue = 0.2f,
            targetValue = 0.7f,
            animationSpec = infiniteRepeatable(
                animation = tween(150, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "flash"
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.85f)),
            contentAlignment = Alignment.Center
        ) {
            // 背景の放射状スピードライン（グラデーションで表現）
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(280.dp)
                    .background(
                        Brush.linearGradient(
                            listOf(
                                Color(0xFFFFD700).copy(alpha = flashAlpha * 0.4f),
                                Color(0xFFFF3D00).copy(alpha = flashAlpha * 0.6f),
                                Color(0xFFFFD700).copy(alpha = flashAlpha * 0.4f)
                            )
                        )
                    )
            )

            // 斜めカットインバナー
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(220.dp)
                    .rotate(-4f)
                    .scale(pulseScale)
                    .background(
                        Brush.horizontalGradient(
                            listOf(
                                Color(0xFF1A0A00),
                                Color(0xFF3E1400),
                                Color(0xFF6B1D00),
                                Color(0xFF3E1400),
                                Color(0xFF1A0A00)
                            )
                        )
                    )
                    .border(
                        width = 3.dp,
                        brush = Brush.horizontalGradient(
                            listOf(Color(0xFFFFD700), Color.White, Color(0xFFFF9100), Color(0xFFFFD700))
                        ),
                        shape = RoundedCornerShape(4.dp)
                    )
                    .padding(horizontal = 16.dp, vertical = 8.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxSize(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // 英雄キャラクターポートレート
                    Box(
                        modifier = Modifier
                            .size(170.dp)
                            .clip(CutCornerShape(16.dp))
                            .border(2.dp, Color(0xFFFFD700), CutCornerShape(16.dp))
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.player_hero),
                            contentDescription = "Hero Portrait",
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize()
                        )
                    }

                    Spacer(modifier = Modifier.width(16.dp))

                    // テキスト演出
                    Column(
                        modifier = Modifier.weight(1f),
                        horizontalAlignment = Alignment.End
                    ) {
                        Text(
                            text = "ULTIMATE BURST",
                            color = Color(0xFFFFD700),
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 4.sp
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "神技・崩天覇皇",
                            color = Color.White,
                            fontSize = 24.sp,
                            fontWeight = FontWeight.Black
                        )
                        Text(
                            text = "滅殺刃",
                            color = Color(0xFFFF3D00),
                            fontSize = 32.sp,
                            fontWeight = FontWeight.Black
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            text = "全魔力解放 7連閃撃！",
                            color = Color(0xFFFFE082),
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

/**
 * 第2形態移行時の全画面覚醒カットイン演出
 */
@Composable
fun Phase2AwakeningOverlay(
    isActive: Boolean,
    modifier: Modifier = Modifier
) {
    AnimatedVisibility(
        visible = isActive,
        enter = fadeIn(animationSpec = tween(200)) + scaleIn(initialScale = 1.15f),
        exit = fadeOut(animationSpec = tween(300)),
        modifier = modifier.fillMaxSize()
    ) {
        val infiniteTransition = rememberInfiniteTransition(label = "phase2_cutin")
        val shakeOffset by infiniteTransition.animateFloat(
            initialValue = -8f,
            targetValue = 8f,
            animationSpec = infiniteRepeatable(
                animation = tween(60, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "shake"
        )
        val flashRed by infiniteTransition.animateFloat(
            initialValue = 0.5f,
            targetValue = 0.95f,
            animationSpec = infiniteRepeatable(
                animation = tween(120, easing = LinearEasing),
                repeatMode = RepeatMode.Reverse
            ),
            label = "flashRed"
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.9f))
                .offset(x = shakeOffset.dp),
            contentAlignment = Alignment.Center
        ) {
            // 背景の深紅と紫のエネルギー
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                Color(0xFFFF1744).copy(alpha = flashRed * 0.45f),
                                Color(0xFF4A148C).copy(alpha = flashRed * 0.7f),
                                Color.Black
                            )
                        )
                    )
            )

            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(24.dp)
            ) {
                // WARNINGヘッダー
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier
                        .background(Color(0xFFFF1744), RoundedCornerShape(4.dp))
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Warning,
                        contentDescription = "Warning",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "WARNING: PHASE TRANSITION",
                        color = Color.White,
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Black,
                        letterSpacing = 2.sp
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                // ボス覚醒画像
                Box(
                    modifier = Modifier
                        .size(200.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .border(
                            width = 4.dp,
                            brush = Brush.linearGradient(
                                listOf(Color(0xFFFF1744), Color(0xFFFFD700), Color(0xFF7C4DFF))
                            ),
                            shape = RoundedCornerShape(16.dp)
                        )
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.boss_phase2),
                        contentDescription = "Boss Phase 2 Awakened",
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Text(
                    text = "【 第二形態：冥王真覚醒 】",
                    color = Color(0xFFFFD700),
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 3.sp
                )

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    text = "覚醒真冥王 ヴォルケリオン",
                    color = Color.White,
                    fontSize = 28.sp,
                    fontWeight = FontWeight.Black,
                    textAlign = TextAlign.Center
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text(
                    text = "古代装甲が粉砕され、地獄の業火を纏う真の魔竜が解き放たれた！\n攻撃力激増 / 新たな破滅奥義を解放！",
                    color = Color(0xFFFFCDD2),
                    fontSize = 13.sp,
                    textAlign = TextAlign.Center,
                    lineHeight = 18.sp
                )
            }
        }
    }
}
