package com.example.raidboss.ui.battle

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.CutCornerShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.raidboss.engine.RaidBattleEngine
import com.example.raidboss.model.*
import com.example.raidboss.ui.components.BattleEffectsCanvas
import com.example.raidboss.ui.components.FloatingNumbersLayer
import com.example.raidboss.ui.components.Phase2AwakeningOverlay
import com.example.raidboss.ui.components.UltimateCutInOverlay

@Composable
fun BattleScreen(
    engine: RaidBattleEngine,
    onRetire: () -> Unit,
    modifier: Modifier = Modifier
) {
    val bossState by engine.bossState.collectAsState()
    val playerState by engine.playerState.collectAsState()
    val turnNumber by engine.turnNumber.collectAsState()
    val turnState by engine.turnState.collectAsState()
    val battleLogs by engine.battleLogs.collectAsState()
    val floatingTexts by engine.floatingTexts.collectAsState()
    val visualEvent by engine.currentVisualEvent.collectAsState()
    val ultimateCutInActive by engine.ultimateCutInActive.collectAsState()
    val phase2CutInActive by engine.phase2CutInActive.collectAsState()

    var showLogSheet by remember { mutableStateOf(false) }

    // ボスの呼吸・浮遊アニメーション
    val infiniteTransition = rememberInfiniteTransition(label = "boss_idle")
    val bossFloatY by infiniteTransition.animateFloat(
        initialValue = -6f,
        targetValue = 6f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "boss_float"
    )

    // ボス被弾時の揺れアニメーション
    val hitShake = remember { Animatable(0f) }
    LaunchedEffect(visualEvent?.id) {
        if (visualEvent != null) {
            hitShake.animateTo(
                targetValue = 1f,
                animationSpec = tween(150, easing = LinearEasing)
            )
            hitShake.animateTo(0f, animationSpec = tween(100))
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        // 背景画像 (レイドアリーナ)
        Image(
            painter = painterResource(id = R.drawable.raid_arena_bg),
            contentDescription = "Raid Arena Background",
            contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize()
        )

        // 背景暗転グラデーション
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color.Black.copy(alpha = 0.65f),
                            Color.Black.copy(alpha = 0.25f),
                            Color.Black.copy(alpha = 0.85f)
                        )
                    )
                )
        )

        // メインコンテンツ
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            // ヘッダーバー (ターン数、ログボタン、撤退)
            BattleHeaderBar(
                turnNumber = turnNumber,
                bossPhase = bossState.phase,
                onToggleLog = { showLogSheet = true },
                onRetire = onRetire
            )

            // ボスステータスバー (多重HPゲージ、ブレイクゲージ、行動予告)
            BossStatusBar(bossState = bossState)

            // ボス2D表示エリア
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                contentAlignment = Alignment.Center
            ) {
                // ボススプライト
                BossSpriteView(
                    bossState = bossState,
                    floatOffsetY = bossFloatY,
                    shakeProgress = hitShake.value
                )

                // 2Dエフェクト描画レイヤー (斬撃、爆発、氷結等)
                BattleEffectsCanvas(visualEvent = visualEvent)

                // ダメージ数値ポップアップレイヤー
                FloatingNumbersLayer(
                    floatingTexts = floatingTexts,
                    onFinished = { id -> engine.removeFloatingText(id) }
                )
            }

            // プレイヤーステータスバー (HP/MP/TP/シールド)
            PlayerStatusBar(playerState = playerState)

            Spacer(modifier = Modifier.height(4.dp))

            // プレイヤーアクションパネル (コマンド・スキル・必殺技)
            PlayerActionPanel(
                playerState = playerState,
                bossState = bossState,
                isInputEnabled = turnState == BattleTurnState.PLAYER_INPUT,
                onActionSelected = { action, skill ->
                    engine.executePlayerAction(action, skill)
                },
                onForcePhase2Test = {
                    engine.triggerPhase2Transition()
                }
            )
        }

        // 必殺技カットインオーバーレイ
        UltimateCutInOverlay(isActive = ultimateCutInActive)

        // 第2形態覚醒カットインオーバーレイ
        Phase2AwakeningOverlay(isActive = phase2CutInActive)

        // 戦闘ログシート
        if (showLogSheet) {
            BattleLogSheet(
                logs = battleLogs,
                onDismiss = { showLogSheet = false }
            )
        }
    }
}

/**
 * ヘッダーバー
 */
@Composable
private fun BattleHeaderBar(
    turnNumber: Int,
    bossPhase: BossPhaseType,
    onToggleLog: () -> Unit,
    onRetire: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(
                onClick = onRetire,
                modifier = Modifier
                    .size(36.dp)
                    .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                    .testTag("battle_retire_button")
            ) {
                Icon(
                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                    contentDescription = "撤退",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            // ターン数バッジ
            Box(
                modifier = Modifier
                    .background(Color(0xFF261942), RoundedCornerShape(8.dp))
                    .border(1.dp, Color(0xFFFFD700), RoundedCornerShape(8.dp))
                    .padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Text(
                    text = "TURN $turnNumber",
                    color = Color(0xFFFFD700),
                    fontSize = 12.sp,
                    fontWeight = FontWeight.Black
                )
            }
        }

        // 形態表示
        Box(
            modifier = Modifier
                .background(
                    if (bossPhase == BossPhaseType.PHASE_1) Color(0xFFFF9100) else Color(0xFFFF1744),
                    RoundedCornerShape(6.dp)
                )
                .padding(horizontal = 10.dp, vertical = 4.dp)
        ) {
            Text(
                text = if (bossPhase == BossPhaseType.PHASE_1) "第1形態：封印重装甲" else "🔥 第2形態：覚醒暴走",
                color = if (bossPhase == BossPhaseType.PHASE_1) Color.Black else Color.White,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold
            )
        }

        // ログ展開ボタン
        IconButton(
            onClick = onToggleLog,
            modifier = Modifier
                .size(36.dp)
                .background(Color.Black.copy(alpha = 0.5f), CircleShape)
                .testTag("battle_log_button")
        ) {
            Icon(
                imageVector = Icons.Default.List,
                contentDescription = "戦闘ログ",
                tint = Color.White,
                modifier = Modifier.size(20.dp)
            )
        }
    }
}

/**
 * ボスステータスバー (多重HPゲージ、ブレイクゲージ、行動予告)
 */
@Composable
private fun BossStatusBar(bossState: BossState) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 2.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF150A24).copy(alpha = 0.88f)),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFF3B1D56))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp)
        ) {
            // ボス名と残りHP数値
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = bossState.phase.title,
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Black
                    )
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = "${String.format("%,d", bossState.currentHp)} / ${String.format("%,d", bossState.maxHp)}",
                        color = Color(0xFFFF8A80),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    // 多重ゲージ残本数バッジ
                    val barsLeft = bossState.currentBarIndex + 1
                    Box(
                        modifier = Modifier
                            .background(Color(0xFFD50000), RoundedCornerShape(4.dp))
                            .padding(horizontal = 5.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "x$barsLeft",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(6.dp))

            // 多層HPバー
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(14.dp)
                    .clip(RoundedCornerShape(7.dp))
                    .background(Color(0xFF261230))
            ) {
                // 背景の下層ゲージ（多重表現）
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color(0xFF880E4F).copy(alpha = 0.4f))
                )
                // 現在のHPバー
                val hpPercent = bossState.hpPercentage
                val hpColor = when {
                    bossState.phase == BossPhaseType.PHASE_2 -> Color(0xFFFF1744)
                    hpPercent > 0.5f -> Color(0xFFFF5252)
                    hpPercent > 0.2f -> Color(0xFFFF9100)
                    else -> Color(0xFFFF1744)
                }
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(hpPercent)
                        .background(
                            Brush.horizontalGradient(
                                listOf(hpColor, Color(0xFFFFD54F))
                            )
                        )
                )
            }

            Spacer(modifier = Modifier.height(6.dp))

            // ブレイクゲージ & ボス状態
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "BREAK",
                    color = Color(0xFF00E5FF),
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Black
                )
                Spacer(modifier = Modifier.width(6.dp))
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(7.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(Color(0xFF102A43))
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(bossState.breakGauge / 100f)
                            .background(
                                Brush.horizontalGradient(
                                    listOf(Color(0xFF00B0FF), Color(0xFF00E5FF))
                                )
                            )
                    )
                }

                Spacer(modifier = Modifier.width(8.dp))

                // スタン・デバフ表示
                if (bossState.isStunned) {
                    Box(
                        modifier = Modifier
                            .background(Color(0xFF00E5FF), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "💥 BREAK (1.5倍)",
                            color = Color.Black,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                } else if (bossState.defenseDownTurns > 0) {
                    Box(
                        modifier = Modifier
                            .background(Color(0xFF7C4DFF), RoundedCornerShape(4.dp))
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = "防低下: ${bossState.defenseDownTurns}T",
                            color = Color.White,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            // 次のボスターン行動予告バナー
            if (bossState.nextSkill != null) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(
                            if (bossState.nextSkill.isChargeAttack) Color(0xFF5B0E1E) else Color(0xFF201335),
                            RoundedCornerShape(6.dp)
                        )
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "NEXT: ",
                        color = Color(0xFFFFD700),
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Black
                    )
                    Text(
                        text = bossState.nextSkill.name,
                        color = if (bossState.nextSkill.isChargeAttack) Color(0xFFFF8A80) else Color(0xFFE0E0E0),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                    if (bossState.nextSkill.isChargeAttack) {
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "⚠️ 大技チャージ中！",
                            color = Color(0xFFFF5252),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Black
                        )
                    }
                }
            }
        }
    }
}

/**
 * ボス2D表示スプライト
 */
@Composable
private fun BossSpriteView(
    bossState: BossState,
    floatOffsetY: Float,
    shakeProgress: Float
) {
    val shakeX = if (shakeProgress > 0f) (shakeProgress * 14f * (if (System.currentTimeMillis() % 2 == 0L) 1 else -1)) else 0f

    Box(
        modifier = Modifier
            .offset(x = shakeX.dp, y = floatOffsetY.dp)
            .size(240.dp),
        contentAlignment = Alignment.Center
    ) {
        // 第2形態用の紅蓮オーラエフェクト
        if (bossState.phase == BossPhaseType.PHASE_2) {
            Box(
                modifier = Modifier
                    .size(260.dp)
                    .background(
                        Brush.radialGradient(
                            listOf(Color(0xFFFF1744).copy(alpha = 0.45f), Color(0xFF651FFF).copy(alpha = 0.2f), Color.Transparent)
                        ),
                        CircleShape
                    )
            )
        }

        // ボス画像
        Image(
            painter = painterResource(
                id = if (bossState.phase == BossPhaseType.PHASE_1) R.drawable.boss_phase1 else R.drawable.boss_phase2
            ),
            contentDescription = bossState.phase.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .size(220.dp)
                .clip(CutCornerShape(16.dp))
                .border(
                    width = 2.5.dp,
                    brush = Brush.linearGradient(
                        if (bossState.phase == BossPhaseType.PHASE_1)
                            listOf(Color(0xFFFF9100), Color(0xFFD50000))
                        else
                            listOf(Color(0xFFFF1744), Color(0xFF7C4DFF))
                    ),
                    shape = CutCornerShape(16.dp)
                )
        )

        // スタン時のエフェクトバナー
        if (bossState.isStunned) {
            Box(
                modifier = Modifier
                    .background(Color.Black.copy(alpha = 0.75f), RoundedCornerShape(8.dp))
                    .border(2.dp, Color(0xFF00E5FF), RoundedCornerShape(8.dp))
                    .padding(horizontal = 14.dp, vertical = 6.dp)
            ) {
                Text(
                    text = "STUNNED / 隙だらけ！",
                    color = Color(0xFF00E5FF),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Black
                )
            }
        }
    }
}

/**
 * プレイヤーステータスバー
 */
@Composable
private fun PlayerStatusBar(playerState: PlayerState) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF140D24).copy(alpha = 0.92f)),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFF2E1C4B))
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // プレイヤーアバター
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .border(1.5.dp, Color(0xFFFFD700), RoundedCornerShape(8.dp))
            ) {
                Image(
                    painter = painterResource(id = R.drawable.player_hero),
                    contentDescription = playerState.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
                // 名前とシールド状態
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = playerState.name,
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                    if (playerState.shield > 0) {
                        Box(
                            modifier = Modifier
                                .background(Color(0xFFFFD700), RoundedCornerShape(4.dp))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(
                                text = "🛡️ 障壁 ${playerState.shield}",
                                color = Color.Black,
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Black
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(4.dp))

                // HPバー
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "HP", color = Color(0xFF81C784), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.width(4.dp))
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color(0xFF1B3B22))
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(playerState.hpPercentage)
                                .background(Color(0xFF00E676))
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${playerState.currentHp}/${playerState.maxHp}",
                        color = Color.White,
                        fontSize = 10.sp
                    )
                }

                Spacer(modifier = Modifier.height(3.dp))

                // MPバー
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "MP", color = Color(0xFF40C4FF), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.width(4.dp))
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(Color(0xFF0D2538))
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(playerState.mpPercentage)
                                .background(Color(0xFF00B0FF))
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${playerState.currentMp}/${playerState.maxMp}",
                        color = Color(0xFFB0BEC5),
                        fontSize = 9.sp
                    )
                }

                Spacer(modifier = Modifier.height(3.dp))

                // TPゲージ (必殺技ゲージ)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(text = "TP", color = Color(0xFFFFD700), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.width(4.dp))
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp))
                            .background(Color(0xFF382A00))
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxHeight()
                                .fillMaxWidth(playerState.tpPercentage)
                                .background(
                                    Brush.horizontalGradient(
                                        listOf(Color(0xFFFF9100), Color(0xFFFFD700))
                                    )
                                )
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "${playerState.tp}%",
                        color = if (playerState.tp >= 100) Color(0xFFFFD700) else Color(0xFFB0BEC5),
                        fontSize = 9.sp,
                        fontWeight = if (playerState.tp >= 100) FontWeight.Black else FontWeight.Normal
                    )
                }
            }
        }
    }
}

/**
 * プレイヤーアクションパネル (コマンド・スキル・必殺技)
 */
@Composable
private fun PlayerActionPanel(
    playerState: PlayerState,
    bossState: BossState,
    isInputEnabled: Boolean,
    onActionSelected: (ActionType, PlayerSkill?) -> Unit,
    onForcePhase2Test: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color(0xFF10081E),
        border = BorderStroke(1.dp, Color(0xFF281842))
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // 必殺技ボタン (TP 100%時のみ発動可能、豪華に光る)
            val isUltimateReady = playerState.tp >= 100 && isInputEnabled
            val infiniteTransition = rememberInfiniteTransition(label = "ultimate_ready")
            val ultimateGlowAlpha by infiniteTransition.animateFloat(
                initialValue = 0.5f,
                targetValue = 1.0f,
                animationSpec = infiniteRepeatable(
                    animation = tween(400, easing = LinearEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "glow"
            )

            Button(
                onClick = { onActionSelected(ActionType.ULTIMATE, RaidSkillCatalog.PLAYER_ULTIMATE) },
                enabled = isUltimateReady,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(46.dp)
                    .testTag("action_ultimate_button"),
                shape = RoundedCornerShape(10.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (isUltimateReady) Color(0xFFFF8F00) else Color(0xFF2D2316),
                    disabledContainerColor = Color(0xFF1E1710),
                    disabledContentColor = Color.Gray
                ),
                border = if (isUltimateReady) BorderStroke(2.dp, Color(0xFFFFD700).copy(alpha = ultimateGlowAlpha)) else null
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(
                        imageVector = Icons.Default.FlashOn,
                        contentDescription = null,
                        tint = if (isUltimateReady) Color.Black else Color.Gray,
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isUltimateReady) "★ 必殺技発動！『神技・崩天覇皇滅殺刃』(TP MAX)" else "必殺技ゲージ蓄積中 (${playerState.tp}% / 100%)",
                        color = if (isUltimateReady) Color.Black else Color(0xFF8D7B68),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Black
                    )
                }
            }

            // スキル選択グリッド (通常攻撃、氷竜波、聖光天破断、鉄壁)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                // 通常攻撃
                ActionButtonItem(
                    title = "烈風滅斬",
                    subtitle = "通常 (TP+22)",
                    mpCost = 0,
                    enabled = isInputEnabled,
                    badgeColor = Color(0xFF81C784),
                    tag = "action_normal_attack",
                    modifier = Modifier.weight(1f),
                    onClick = { onActionSelected(ActionType.NORMAL_ATTACK, RaidSkillCatalog.PLAYER_NORMAL_ATTACK) }
                )

                // 氷竜波 (第1形態弱点)
                ActionButtonItem(
                    title = "極光氷竜波",
                    subtitle = if (bossState.phase == BossPhaseType.PHASE_1) "弱点! 2.2倍" else "氷属性",
                    mpCost = 25,
                    enabled = isInputEnabled && playerState.currentMp >= 25,
                    badgeColor = Color(0xFF00E5FF),
                    tag = "action_ice_skill",
                    modifier = Modifier.weight(1f),
                    onClick = { onActionSelected(ActionType.SKILL, RaidSkillCatalog.PLAYER_SKILL_ICE) }
                )

                // 聖光天破断 (第2形態弱点 & 防低下)
                ActionButtonItem(
                    title = "聖光天破断",
                    subtitle = if (bossState.phase == BossPhaseType.PHASE_2) "弱点! 防低下" else "防低下",
                    mpCost = 30,
                    enabled = isInputEnabled && playerState.currentMp >= 30,
                    badgeColor = Color(0xFFFFD700),
                    tag = "action_holy_skill",
                    modifier = Modifier.weight(1f),
                    onClick = { onActionSelected(ActionType.SKILL, RaidSkillCatalog.PLAYER_SKILL_HOLY) }
                )

                // 神聖の鉄壁
                ActionButtonItem(
                    title = "神聖の鉄壁",
                    subtitle = "防壁+治癒",
                    mpCost = 15,
                    enabled = isInputEnabled && playerState.currentMp >= 15,
                    badgeColor = Color(0xFFAB47BC),
                    tag = "action_guard_skill",
                    modifier = Modifier.weight(1f),
                    onClick = { onActionSelected(ActionType.SKILL, RaidSkillCatalog.PLAYER_SKILL_GUARD) }
                )
            }

            // サブアクションバー (回復薬、第2形態直接移行テスト)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // 特級回復薬
                OutlinedButton(
                    onClick = { onActionSelected(ActionType.POTION_HEAL, null) },
                    enabled = isInputEnabled && playerState.potionsRemaining > 0,
                    modifier = Modifier
                        .weight(1f)
                        .height(38.dp)
                        .testTag("action_potion_button"),
                    shape = RoundedCornerShape(8.dp),
                    border = BorderStroke(1.dp, Color(0xFF00E676)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF69F0AE))
                ) {
                    Text(
                        text = "🧪 回復薬 (残${playerState.potionsRemaining})",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold
                    )
                }

                // 第2形態強制テストボタン (Phase 1の場合のみ表示)
                if (bossState.phase == BossPhaseType.PHASE_1) {
                    OutlinedButton(
                        onClick = onForcePhase2Test,
                        enabled = isInputEnabled,
                        modifier = Modifier
                            .weight(1f)
                            .height(38.dp)
                            .testTag("action_force_phase2_button"),
                        shape = RoundedCornerShape(8.dp),
                        border = BorderStroke(1.dp, Color(0xFFFF5252)),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFFF8A80))
                    ) {
                        Text(
                            text = "⚡ 第2形態へ覚醒移行",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ActionButtonItem(
    title: String,
    subtitle: String,
    mpCost: Int,
    enabled: Boolean,
    badgeColor: Color,
    tag: String,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier
            .height(68.dp)
            .testTag(tag),
        shape = RoundedCornerShape(8.dp),
        colors = CardDefaults.cardColors(
            containerColor = if (enabled) Color(0xFF22163B) else Color(0xFF161026),
            disabledContainerColor = Color(0xFF130E20)
        ),
        border = BorderStroke(1.dp, if (enabled) badgeColor.copy(alpha = 0.6f) else Color(0xFF2A1C44))
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 4.dp, vertical = 6.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = title,
                color = if (enabled) Color.White else Color.Gray,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                maxLines = 1
            )
            Text(
                text = subtitle,
                color = if (enabled) badgeColor else Color.DarkGray,
                fontSize = 9.sp,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                maxLines = 1
            )
            Text(
                text = if (mpCost > 0) "MP $mpCost" else "消費 0",
                color = if (enabled) Color(0xFF90A4AE) else Color.DarkGray,
                fontSize = 8.sp
            )
        }
    }
}

/**
 * 戦闘ログシート
 */
@Composable
private fun BattleLogSheet(
    logs: List<String>,
    onDismiss: () -> Unit
) {
    val listState = rememberLazyListState()

    LaunchedEffect(logs.size) {
        if (logs.isNotEmpty()) {
            listState.animateScrollToItem(logs.size - 1)
        }
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = {
            Text(
                text = "戦闘履歴ログ",
                color = Color(0xFFFFD700),
                fontSize = 16.sp,
                fontWeight = FontWeight.Black
            )
        },
        text = {
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(300.dp)
                    .background(Color(0xFF0F081C), RoundedCornerShape(8.dp))
                    .padding(8.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp)
            ) {
                items(logs) { log ->
                    Text(
                        text = log,
                        color = when {
                            log.contains("CRITICAL") || log.contains("奥義") -> Color(0xFFFFD700)
                            log.contains("BREAK") -> Color(0xFF00E5FF)
                            log.contains("警告") || log.contains("覚醒") || log.contains("破滅") -> Color(0xFFFF5252)
                            log.contains("回復") || log.contains("防護") -> Color(0xFF69F0AE)
                            else -> Color(0xFFECEFF1)
                        },
                        fontSize = 11.sp,
                        lineHeight = 15.sp
                    )
                }
            }
        },
        confirmButton = {
            TextButton(onClick = onDismiss) {
                Text("閉じる", color = Color(0xFFFFD700))
            }
        },
        containerColor = Color(0xFF19102B)
    )
}
