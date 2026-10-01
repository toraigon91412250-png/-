package com.example.raidboss.ui.prebattle

import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CutCornerShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
import com.example.raidboss.model.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PreBattleScreen(
    onStartBattle: (difficulty: RaidDifficulty, startAtPhase2: Boolean) -> Unit,
    modifier: Modifier = Modifier
) {
    var selectedDifficulty by remember { mutableStateOf(RaidDifficulty.NORMAL) }
    var previewPhase by remember { mutableStateOf(BossPhaseType.PHASE_1) }
    var selectedTab by remember { mutableIntStateOf(0) } // 0: ボス情報, 1: プレイヤースキル, 2: 報酬情報

    val infiniteTransition = rememberInfiniteTransition(label = "pulse_button")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1.0f,
        targetValue = 1.03f,
        animationSpec = infiniteRepeatable(
            animation = tween(900, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = "RAID BOSS",
                            color = Color(0xFFFFD700),
                            fontSize = 18.sp,
                            fontWeight = FontWeight.Black,
                            letterSpacing = 2.sp
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = "試作戦闘シミュレータ",
                            color = Color(0xFFB0BEC5),
                            fontSize = 14.sp
                        )
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = Color(0xFF100B1D)
                )
            )
        },
        containerColor = Color(0xFF0C0717),
        bottomBar = {
            // 最下部：挑戦開始バー
            Surface(
                color = Color(0xFF130C22),
                tonalElevation = 8.dp,
                shadowElevation = 12.dp,
                border = BorderStroke(1.dp, Color(0xFF2A1B46))
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        // 第2形態直接テスト開始ボタン
                        OutlinedButton(
                            onClick = { onStartBattle(selectedDifficulty, true) },
                            modifier = Modifier
                                .weight(0.42f)
                                .height(52.dp)
                                .testTag("start_phase2_direct_button"),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.5.dp, Color(0xFFFF5252)),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = Color(0xFFFF8A80)
                            )
                        ) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                Text(text = "⚡ 第2形態テスト", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Text(text = "直接覚醒スタート", fontSize = 9.sp, color = Color(0xFFFFAB91))
                            }
                        }

                        // 通常のレイドボス挑戦開始ボタン
                        Button(
                            onClick = { onStartBattle(selectedDifficulty, false) },
                            modifier = Modifier
                                .weight(0.58f)
                                .height(52.dp)
                                .scale(pulseScale)
                                .testTag("start_raid_battle_button"),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color(0xFFFF9100)
                            ),
                            elevation = ButtonDefaults.buttonElevation(defaultElevation = 6.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.PlayArrow,
                                    contentDescription = null,
                                    tint = Color.Black,
                                    modifier = Modifier.size(24.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = "挑戦する",
                                    color = Color.Black,
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }
                    }
                }
            }
        }
    ) { innerPadding ->
        LazyColumn(
            modifier = modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Spacer(modifier = Modifier.height(4.dp))
                // ボスプレビューカード
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(18.dp))
                        .border(
                            width = 2.dp,
                            brush = Brush.linearGradient(
                                if (previewPhase == BossPhaseType.PHASE_1)
                                    listOf(Color(0xFFFF9100), Color(0xFFD50000))
                                else
                                    listOf(Color(0xFFFF1744), Color(0xFF7C4DFF))
                            ),
                            shape = RoundedCornerShape(18.dp)
                        ),
                    colors = CardDefaults.cardColors(containerColor = Color(0xFF19102C))
                ) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        // 形態切り替えスイッチ
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF120A22))
                                .padding(8.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "形態プレビュー切替:",
                                color = Color(0xFFB0BEC5),
                                fontSize = 12.sp,
                                modifier = Modifier.padding(start = 6.dp)
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                FilterChip(
                                    selected = previewPhase == BossPhaseType.PHASE_1,
                                    onClick = { previewPhase = BossPhaseType.PHASE_1 },
                                    label = { Text("第1形態", fontSize = 11.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = Color(0xFFFF9100),
                                        selectedLabelColor = Color.Black
                                    )
                                )
                                FilterChip(
                                    selected = previewPhase == BossPhaseType.PHASE_2,
                                    onClick = { previewPhase = BossPhaseType.PHASE_2 },
                                    label = { Text("第2形態(覚醒)", fontSize = 11.sp) },
                                    colors = FilterChipDefaults.filterChipColors(
                                        selectedContainerColor = Color(0xFFFF1744),
                                        selectedLabelColor = Color.White
                                    )
                                )
                            }
                        }

                        // ボス画像
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(220.dp)
                        ) {
                            Image(
                                painter = painterResource(
                                    id = if (previewPhase == BossPhaseType.PHASE_1) R.drawable.boss_phase1 else R.drawable.boss_phase2
                                ),
                                contentDescription = previewPhase.title,
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )

                            // 下部グラデーション
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(90.dp)
                                    .align(Alignment.BottomCenter)
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(Color.Transparent, Color(0xFF19102C))
                                        )
                                    )
                            )

                            // 形態バッジ
                            Box(
                                modifier = Modifier
                                    .padding(12.dp)
                                    .align(Alignment.TopStart)
                                    .background(
                                        if (previewPhase == BossPhaseType.PHASE_1) Color(0xFFFF9100) else Color(0xFFFF1744),
                                        RoundedCornerShape(6.dp)
                                    )
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = if (previewPhase == BossPhaseType.PHASE_1) "PHASE 1" else "PHASE 2 AWAKENED",
                                    color = if (previewPhase == BossPhaseType.PHASE_1) Color.Black else Color.White,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Black
                                )
                            }
                        }

                        // ボス名と概要
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                        ) {
                            Text(
                                text = previewPhase.subtitle,
                                color = if (previewPhase == BossPhaseType.PHASE_1) Color(0xFFFFB74D) else Color(0xFFFF8A80),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(2.dp))
                            Text(
                                text = previewPhase.title,
                                color = Color.White,
                                fontSize = 21.sp,
                                fontWeight = FontWeight.Black
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = previewPhase.description,
                                color = Color(0xFFCFD8DC),
                                fontSize = 12.sp,
                                lineHeight = 17.sp
                            )

                            Spacer(modifier = Modifier.height(14.dp))

                            // ステータスと弱点・耐性
                            val targetHp = if (previewPhase == BossPhaseType.PHASE_1) {
                                (120_000L * selectedDifficulty.hpMultiplier).toLong()
                            } else {
                                (180_000L * selectedDifficulty.hpMultiplier).toLong()
                            }
                            val targetAtk = if (previewPhase == BossPhaseType.PHASE_1) {
                                (420 * selectedDifficulty.atkMultiplier).toInt()
                            } else {
                                (580 * selectedDifficulty.atkMultiplier).toInt()
                            }
                            val targetDef = if (previewPhase == BossPhaseType.PHASE_1) 140 else 90

                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .background(Color(0xFF10091E), RoundedCornerShape(10.dp))
                                    .padding(10.dp),
                                horizontalArrangement = Arrangement.SpaceAround
                            ) {
                                BossMiniStat("推定HP", String.format("%,d", targetHp), Color(0xFFFF5252))
                                BossMiniStat("基礎攻撃力", targetAtk.toString(), Color(0xFFFFB74D))
                                BossMiniStat("装甲防御力", targetDef.toString(), Color(0xFF40C4FF))
                            }

                            Spacer(modifier = Modifier.height(10.dp))

                            // 弱点＆耐性
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                AttributeBadge(
                                    label = "弱点",
                                    value = previewPhase.weakness,
                                    bgColor = Color(0xFF003366),
                                    textColor = Color(0xFF80D8FF),
                                    modifier = Modifier.weight(1f)
                                )
                                AttributeBadge(
                                    label = "耐性",
                                    value = previewPhase.resistance,
                                    bgColor = Color(0xFF3E1414),
                                    textColor = Color(0xFFFF8A80),
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }
            }

            // 難易度選択セクション
            item {
                Text(
                    text = "難易度を選択",
                    color = Color(0xFFFFD700),
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    RaidDifficulty.entries.forEach { diff ->
                        val isSelected = selectedDifficulty == diff
                        Card(
                            onClick = { selectedDifficulty = diff },
                            modifier = Modifier
                                .weight(1f)
                                .clip(RoundedCornerShape(12.dp))
                                .border(
                                    width = if (isSelected) 2.dp else 1.dp,
                                    color = if (isSelected) Color(0xFFFFD700) else Color(0xFF2C1F48),
                                    shape = RoundedCornerShape(12.dp)
                                ),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isSelected) Color(0xFF271A46) else Color(0xFF140D24)
                            )
                        ) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(10.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = diff.displayName,
                                    color = if (isSelected) Color(0xFFFFD700) else Color.White,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Black
                                )
                                Spacer(modifier = Modifier.height(2.dp))
                                Text(
                                    text = "HP x${diff.hpMultiplier}",
                                    color = Color(0xFFB0BEC5),
                                    fontSize = 10.sp
                                )
                                Text(
                                    text = diff.rewardBonus,
                                    color = Color(0xFF80CBC4),
                                    fontSize = 9.sp
                                )
                            }
                        }
                    }
                }
            }

            // 情報タブ (ボス行動 / プレイヤースキル / 報酬)
            item {
                TabRow(
                    selectedTabIndex = selectedTab,
                    containerColor = Color(0xFF150E26),
                    contentColor = Color(0xFFFFD700)
                ) {
                    Tab(
                        selected = selectedTab == 0,
                        onClick = { selectedTab = 0 },
                        text = { Text("ボス行動予兆", fontSize = 12.sp) }
                    )
                    Tab(
                        selected = selectedTab == 1,
                        onClick = { selectedTab = 1 },
                        text = { Text("編成・スキル", fontSize = 12.sp) }
                    )
                    Tab(
                        selected = selectedTab == 2,
                        onClick = { selectedTab = 2 },
                        text = { Text("第2形態警告", fontSize = 12.sp) }
                    )
                }
            }

            item {
                when (selectedTab) {
                    0 -> BossSkillsTabContent(previewPhase)
                    1 -> PlayerSkillsTabContent()
                    2 -> Phase2WarningTabContent()
                }
            }

            item {
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun BossMiniStat(label: String, value: String, color: Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = label, color = Color(0xFF90A4AE), fontSize = 11.sp)
        Spacer(modifier = Modifier.height(2.dp))
        Text(text = value, color = color, fontSize = 14.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun AttributeBadge(label: String, value: String, bgColor: Color, textColor: Color, modifier: Modifier = Modifier) {
    Column(
        modifier = modifier
            .background(bgColor, RoundedCornerShape(8.dp))
            .padding(horizontal = 10.dp, vertical = 6.dp)
    ) {
        Text(text = label, color = Color.White.copy(alpha = 0.7f), fontSize = 10.sp)
        Text(text = value, color = textColor, fontSize = 11.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun BossSkillsTabContent(phase: BossPhaseType) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF160E28), RoundedCornerShape(12.dp))
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Text(
            text = if (phase == BossPhaseType.PHASE_1) "【第1形態 主な使用技】" else "【第2形態 主な使用技】",
            color = Color(0xFFFFD700),
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold
        )

        val skills = if (phase == BossPhaseType.PHASE_1) {
            listOf(
                RaidSkillCatalog.BOSS_P1_CLEAVE,
                RaidSkillCatalog.BOSS_P1_SMOKE,
                RaidSkillCatalog.BOSS_P1_OVERHEAT
            )
        } else {
            listOf(
                RaidSkillCatalog.BOSS_P2_CLAW,
                RaidSkillCatalog.BOSS_P2_CATACLYSM,
                RaidSkillCatalog.BOSS_P2_VOID_CHARGE
            )
        }

        skills.forEach { skill ->
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF201639), RoundedCornerShape(8.dp))
                    .padding(10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = skill.name,
                        color = if (skill.isChargeAttack) Color(0xFFFF5252) else Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold
                    )
                    if (skill.isChargeAttack) {
                        Text(
                            text = "⚠️ チャージ大技",
                            color = Color(0xFFFF5252),
                            fontSize = 10.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = skill.description,
                    color = Color(0xFFB0BEC5),
                    fontSize = 11.sp
                )
            }
        }
    }
}

@Composable
private fun PlayerSkillsTabContent() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF160E28), RoundedCornerShape(12.dp))
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .clip(RoundedCornerShape(8.dp))
            ) {
                Image(
                    painter = painterResource(id = R.drawable.player_hero),
                    contentDescription = "Hero",
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(text = "出撃英雄：アルス (聖竜の聖騎士)", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                Text(text = "HP: 3,800 / MP: 100 / 特級回復薬: 3個所持", color = Color(0xFF80D8FF), fontSize = 11.sp)
            }
        }

        Divider(color = Color(0xFF2C1F48))

        val playerSkills = listOf(
            RaidSkillCatalog.PLAYER_NORMAL_ATTACK,
            RaidSkillCatalog.PLAYER_SKILL_ICE,
            RaidSkillCatalog.PLAYER_SKILL_HOLY,
            RaidSkillCatalog.PLAYER_SKILL_GUARD,
            RaidSkillCatalog.PLAYER_ULTIMATE
        )

        playerSkills.forEach { skill ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0xFF201639), RoundedCornerShape(8.dp))
                    .padding(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            text = skill.name,
                            color = if (skill.isUltimate) Color(0xFFFFD700) else Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        if (skill.mpCost > 0) {
                            Text(text = "MP ${skill.mpCost}", color = Color(0xFF40C4FF), fontSize = 10.sp)
                        } else if (skill.isUltimate) {
                            Text(text = "TP 100%", color = Color(0xFFFFD700), fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        } else {
                            Text(text = "MP 0", color = Color(0xFF81C784), fontSize = 10.sp)
                        }
                    }
                    Text(text = skill.description, color = Color(0xFF90A4AE), fontSize = 10.sp)
                }
            }
        }
    }
}

@Composable
private fun Phase2WarningTabContent() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF24101A), RoundedCornerShape(12.dp))
            .border(1.dp, Color(0xFFFF5252), RoundedCornerShape(12.dp))
            .padding(14.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(Icons.Default.Warning, contentDescription = null, tint = Color(0xFFFF5252))
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "レイドボス 第二形態への覚醒仕様",
                color = Color(0xFFFF8A80),
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold
            )
        }

        Text(
            text = "① 【移行条件】第1形態『古代巨兵 冥王イグニドール』のHPを0に削ると、戦闘は終了せず第二形態へ突入します。\n" +
                    "② 【装甲崩壊】外殻が砕け散り、真の姿『覚醒真冥王 ヴォルケリオン』へと姿・BGM演出・グラフィックが変化します。\n" +
                    "③ 【攻撃力急増】ボスの攻撃力が跳ね上がり、耐性・弱点属性が変化します（弱点: 聖光属性）。\n" +
                    "④ 【即死級チャージ技】強力な虚無光線『神滅の虚無閃』を発動するため、『神聖の鉄壁』によるシールドとダメージ半減防御が必須となります。",
            color = Color(0xFFFFCDD2),
            fontSize = 11.sp,
            lineHeight = 17.sp
        )
    }
}
