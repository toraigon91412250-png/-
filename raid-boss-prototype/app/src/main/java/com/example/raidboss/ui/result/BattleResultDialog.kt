package com.example.raidboss.ui.result

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.raidboss.model.RaidBattleResult

@Composable
fun BattleResultDialog(
    result: RaidBattleResult,
    onRetry: () -> Unit,
    onReturnToPreBattle: () -> Unit,
    modifier: Modifier = Modifier
) {
    Dialog(
        onDismissRequest = {},
        properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
    ) {
        Card(
            modifier = modifier
                .fillMaxWidth()
                .padding(16.dp)
                .clip(RoundedCornerShape(20.dp))
                .border(
                    width = 2.dp,
                    brush = Brush.linearGradient(
                        if (result.isVictory) listOf(Color(0xFFFFD700), Color(0xFFFF9100))
                        else listOf(Color(0xFFFF1744), Color(0xFFB71C1C))
                    ),
                    shape = RoundedCornerShape(20.dp)
                ),
            colors = CardDefaults.cardColors(containerColor = Color(0xFF140D24))
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(20.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // タイトルバナー
                val titleColor = if (result.isVictory) Color(0xFFFFD700) else Color(0xFFFF5252)
                val titleText = if (result.isVictory) "VICTORY!! 討伐完了" else "DEFEAT... 敗北"

                Text(
                    text = titleText,
                    color = titleColor,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.Black,
                    letterSpacing = 2.sp
                )

                Spacer(modifier = Modifier.height(12.dp))

                // 討伐ランク
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.Center,
                    modifier = Modifier
                        .background(
                            Brush.horizontalGradient(
                                if (result.isVictory) listOf(Color(0xFF3E2723), Color(0xFFD84315), Color(0xFF3E2723))
                                else listOf(Color(0xFF263238), Color(0xFF37474F), Color(0xFF263238))
                            ),
                            RoundedCornerShape(12.dp)
                        )
                        .padding(horizontal = 24.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = "CLEAR RANK",
                        color = Color(0xFFEEEEEE),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        text = result.rank,
                        color = if (result.isVictory) Color(0xFFFFD700) else Color(0xFFB0BEC5),
                        fontSize = 32.sp,
                        fontWeight = FontWeight.Black
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // 戦績統計
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFF1E1535), RoundedCornerShape(12.dp))
                        .padding(12.dp)
                ) {
                    ResultStatRow("難易度", result.difficulty.displayName)
                    ResultStatRow("経過ターン数", "${result.totalTurns} ターン")
                    ResultStatRow("総与ダメージ", String.format("%,d", result.totalDamageDealt))
                    ResultStatRow("最大単発ダメージ", String.format("%,d", result.maxSingleDamage))
                    ResultStatRow("被ダメージ総量", String.format("%,d", result.totalDamageTaken))
                }

                if (result.isVictory && result.rewards.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        text = "獲得ドロップ報酬",
                        color = Color(0xFFFFD700),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier.align(Alignment.Start)
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0xFF1E1535), RoundedCornerShape(12.dp))
                            .padding(10.dp)
                    ) {
                        result.rewards.forEach { reward ->
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(vertical = 3.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.CheckCircle,
                                    contentDescription = null,
                                    tint = Color(0xFF00E676),
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = reward,
                                    color = Color.White,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                // ボタンアクション
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedButton(
                        onClick = onReturnToPreBattle,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .testTag("result_back_button"),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.White)
                    ) {
                        Text("事前画面へ", fontSize = 13.sp)
                    }

                    Button(
                        onClick = onRetry,
                        modifier = Modifier
                            .weight(1f)
                            .height(48.dp)
                            .testTag("result_retry_button"),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (result.isVictory) Color(0xFFFF9100) else Color(0xFFFF1744)
                        )
                    ) {
                        Text("再挑戦する", fontSize = 13.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun ResultStatRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(text = label, color = Color(0xFFB39DDB), fontSize = 12.sp)
        Text(text = value, color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
    }
}
