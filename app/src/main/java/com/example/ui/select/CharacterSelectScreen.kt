package com.example.ui.select

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.ui.draw.alpha
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.SportsKabaddi
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
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
import com.example.data.OverallStats
import com.example.model.CharacterDef
import com.example.model.CharacterRegistry
import com.example.model.CpuDifficulty

@Composable
fun CharacterSelectScreen(
  overallStats: OverallStats,
  currentDifficulty: CpuDifficulty,
  onStartBattle: (playerChar: CharacterDef, enemyChar: CharacterDef, difficulty: CpuDifficulty) -> Unit,
  modifier: Modifier = Modifier
) {
  var selectedPlayerChar by remember { mutableStateOf(CharacterRegistry.IRENA) }
  var selectedCpuDifficulty by remember { mutableStateOf(currentDifficulty) }

  val cpuChar = if (selectedPlayerChar.id == CharacterRegistry.IRENA.id) {
    CharacterRegistry.KAISER
  } else {
    CharacterRegistry.IRENA
  }

  Box(
    modifier = modifier
      .fillMaxSize()
      .background(Color(0xFF0C0E17))
  ) {
    // Subtle background arena overlay at native sharpness
    Image(
      painter = painterResource(id = R.drawable.img_arena_bg),
      contentDescription = null,
      alpha = 0.18f,
      modifier = Modifier.fillMaxSize(),
      contentScale = ContentScale.Crop
    )

    Column(
      modifier = Modifier
        .fillMaxSize()
        .verticalScroll(rememberScrollState())
        .padding(horizontal = 16.dp, vertical = 20.dp)
        .widthIn(max = 680.dp)
        .align(Alignment.TopCenter),
      horizontalAlignment = Alignment.CenterHorizontally
    ) {
      // Header Title Banner
      Row(
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
      ) {
        Icon(
          imageVector = Icons.Default.SportsKabaddi,
          contentDescription = null,
          tint = Color(0xFFFFB300),
          modifier = Modifier.size(32.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
          text = "デュエルアリーナ",
          style = MaterialTheme.typography.headlineMedium,
          fontWeight = FontWeight.ExtraBold,
          color = Color.White
        )
      }

      Text(
        text = "1対1 ターン制キャラクターバトル",
        style = MaterialTheme.typography.bodyMedium,
        color = Color(0xFF90CAF9),
        modifier = Modifier.padding(top = 4.dp, bottom = 12.dp)
      )

      // Overall Battle Stats Badge
      Card(
        modifier = Modifier
          .fillMaxWidth()
          .testTag("stats_summary_card"),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF161B29)),
        border = BorderStroke(1.dp, Color(0xFF28334E))
      ) {
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 10.dp),
          horizontalArrangement = Arrangement.SpaceAround,
          verticalAlignment = Alignment.CenterVertically
        ) {
          StatChip(title = "対戦数", value = "${overallStats.totalBattles}戦")
          StatChip(title = "勝利", value = "${overallStats.wins}勝", color = Color(0xFF81C784))
          StatChip(title = "敗北", value = "${overallStats.losses}敗", color = Color(0xFFE57373))
          StatChip(title = "勝率", value = "${overallStats.winRatePercent}%", color = Color(0xFFFFD54F))
        }
      }

      Spacer(modifier = Modifier.height(16.dp))

      Text(
        text = "使用するキャラクターを選択してください",
        style = MaterialTheme.typography.titleSmall,
        fontWeight = FontWeight.Bold,
        color = Color.White,
        modifier = Modifier
          .fillMaxWidth()
          .padding(bottom = 8.dp)
      )

      // Character Cards
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
      ) {
        CharacterRegistry.ALL_CHARACTERS.forEach { char ->
          val isSelected = char.id == selectedPlayerChar.id
          CharacterSelectionCard(
            character = char,
            isSelected = isSelected,
            onClick = { selectedPlayerChar = char },
            modifier = Modifier.weight(1f)
          )
        }
      }

      Spacer(modifier = Modifier.height(16.dp))

      // Matchup Preview
      Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFF131722)),
        border = BorderStroke(1.dp, Color(0xFF242E44))
      ) {
        Column(modifier = Modifier.padding(14.dp)) {
          Text(
            text = "⚔️ 対戦カード",
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.Bold,
            color = Color(0xFFFFB74D)
          )
          Spacer(modifier = Modifier.height(8.dp))
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Text(
              text = "あなた: ${selectedPlayerChar.name} (素早さ ${selectedPlayerChar.speed})",
              style = MaterialTheme.typography.bodyMedium,
              fontWeight = FontWeight.SemiBold,
              color = Color(0xFF90CAF9)
            )
            Text(
              text = "VS",
              style = MaterialTheme.typography.titleMedium,
              fontWeight = FontWeight.Black,
              color = Color(0xFFFF5252)
            )
            Text(
              text = "CPU: ${cpuChar.name} (素早さ ${cpuChar.speed})",
              style = MaterialTheme.typography.bodyMedium,
              fontWeight = FontWeight.SemiBold,
              color = Color(0xFFFFCC80)
            )
          }

          Spacer(modifier = Modifier.height(6.dp))
          val speedDiffText = if (selectedPlayerChar.speed > cpuChar.speed) {
            "⚡ あなたの素早さが高いため、毎ターン先手で行動できます！"
          } else {
            "🌀 相手の素早さが高いため、相手が先手で行動します。回避や強化を上手く活用しましょう！"
          }
          Text(
            text = speedDiffText,
            style = MaterialTheme.typography.bodySmall,
            fontSize = 11.sp,
            color = Color(0xFFB0BEC5)
          )
        }
      }

      Spacer(modifier = Modifier.height(16.dp))

      // CPU Difficulty Selector
      Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.Start
      ) {
        Text(
          text = "CPU 難易度",
          style = MaterialTheme.typography.labelLarge,
          fontWeight = FontWeight.Bold,
          color = Color.White
        )
        Spacer(modifier = Modifier.height(6.dp))
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
          CpuDifficulty.values().forEach { diff ->
            val isChosen = diff == selectedCpuDifficulty
            FilterChip(
              selected = isChosen,
              onClick = { selectedCpuDifficulty = diff },
              label = {
                Text(
                  text = "${diff.title} (${diff.description})",
                  fontSize = 12.sp,
                  fontWeight = if (isChosen) FontWeight.Bold else FontWeight.Normal
                )
              },
              colors = FilterChipDefaults.filterChipColors(
                selectedContainerColor = Color(0xFF1E3A8A),
                selectedLabelColor = Color.White,
                containerColor = Color(0xFF161B26),
                labelColor = Color(0xFFB0BEC5)
              ),
              border = FilterChipDefaults.filterChipBorder(
                borderColor = Color(0xFF333F58),
                selectedBorderColor = Color(0xFF60A5FA),
                enabled = true,
                selected = isChosen
              ),
              modifier = Modifier.testTag("difficulty_${diff.name.lowercase()}")
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(24.dp))

      // Battle Start Button
      Button(
        onClick = {
          onStartBattle(selectedPlayerChar, cpuChar, selectedCpuDifficulty)
        },
        modifier = Modifier
          .fillMaxWidth()
          .height(56.dp)
          .testTag("start_battle_button"),
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
          containerColor = Color(0xFFE65100),
          contentColor = Color.White
        ),
        border = BorderStroke(1.5.dp, Color(0xFFFFB74D))
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Icon(
            imageVector = Icons.Default.PlayArrow,
            contentDescription = null,
            modifier = Modifier.size(24.dp)
          )
          Spacer(modifier = Modifier.width(6.dp))
          Text(
            text = "バトル開始！",
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.ExtraBold,
            fontSize = 18.sp
          )
        }
      }

      Spacer(modifier = Modifier.height(20.dp))
    }
  }
}

@Composable
private fun CharacterSelectionCard(
  character: CharacterDef,
  isSelected: Boolean,
  onClick: () -> Unit,
  modifier: Modifier = Modifier
) {
  val themeColor = Color(character.primaryColorHex)

  Card(
    modifier = modifier
      .clickable(onClick = onClick)
      .testTag("select_char_${character.id}"),
    shape = RoundedCornerShape(16.dp),
    colors = CardDefaults.cardColors(
      containerColor = if (isSelected) Color(0xFF1E2436) else Color(0xFF121520)
    ),
    border = BorderStroke(
      width = if (isSelected) 2.5.dp else 1.dp,
      color = if (isSelected) themeColor else Color(0xFF2B3347)
    )
  ) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(10.dp),
      horizontalAlignment = Alignment.CenterHorizontally
    ) {
      // Selection Indicator
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Surface(
          shape = RoundedCornerShape(4.dp),
          color = themeColor.copy(alpha = 0.25f)
        ) {
          Text(
            text = character.title,
            style = MaterialTheme.typography.labelSmall,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold,
            color = themeColor,
            modifier = Modifier.padding(horizontal = 4.dp, vertical = 2.dp)
          )
        }

        if (isSelected) {
          Icon(
            imageVector = Icons.Default.CheckCircle,
            contentDescription = "選択中",
            tint = Color(0xFF64FFDA),
            modifier = Modifier.size(18.dp)
          )
        }
      }

      Spacer(modifier = Modifier.height(6.dp))

      // Character Portrait
      Box(
        modifier = Modifier
          .fillMaxWidth()
          .height(130.dp)
          .clip(RoundedCornerShape(10.dp))
          .border(1.dp, themeColor.copy(alpha = 0.5f), RoundedCornerShape(10.dp))
      ) {
        Image(
          painter = painterResource(id = character.portraitRes),
          contentDescription = character.name,
          modifier = Modifier.fillMaxSize(),
          contentScale = ContentScale.Crop
        )
      }

      Spacer(modifier = Modifier.height(8.dp))

      Text(
        text = character.name,
        style = MaterialTheme.typography.titleMedium,
        fontWeight = FontWeight.ExtraBold,
        color = Color.White
      )

      Spacer(modifier = Modifier.height(6.dp))

      // Stat bars
      StatRow("HP", character.maxHp.toString(), character.maxHp / 1200f, Color(0xFF66BB6A))
      StatRow("攻撃力", character.attack.toString(), character.attack / 200f, Color(0xFFEF5350))
      StatRow("防御力", character.defense.toString(), character.defense / 200f, Color(0xFF42A5F5))
      StatRow("素早さ", character.speed.toString(), character.speed / 150f, Color(0xFFFFCA28))
      StatRow("回避率", "${(character.evasionRate * 100).toInt()}%", character.evasionRate / 0.30f, Color(0xFF26C6DA))

      Spacer(modifier = Modifier.height(6.dp))

      // Passive ability card
      Surface(
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFF1E1C2B),
        border = BorderStroke(1.dp, Color(0xFF4A3B69)),
        modifier = Modifier.fillMaxWidth()
      ) {
        Column(modifier = Modifier.padding(5.dp)) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
              imageVector = Icons.Default.AutoAwesome,
              contentDescription = null,
              tint = Color(0xFFB39DDB),
              modifier = Modifier.size(13.dp)
            )
            Spacer(modifier = Modifier.width(3.dp))
            Text(
              text = "固有能力「${character.passiveName}」",
              style = MaterialTheme.typography.labelSmall,
              fontSize = 10.sp,
              fontWeight = FontWeight.Bold,
              color = Color(0xFFD1C4E9)
            )
          }
          Spacer(modifier = Modifier.height(2.dp))
          Text(
            text = character.passiveDescription,
            style = MaterialTheme.typography.bodySmall,
            fontSize = 8.5.sp,
            color = Color(0xFFB0BEC5),
            lineHeight = 11.sp
          )
        }
      }

      Spacer(modifier = Modifier.height(4.dp))

      // Special skill description card
      Surface(
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFF161A28),
        border = BorderStroke(1.dp, Color(0xFF2C354E)),
        modifier = Modifier.fillMaxWidth()
      ) {
        Column(modifier = Modifier.padding(5.dp)) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
              imageVector = Icons.Default.Bolt,
              contentDescription = null,
              tint = Color(0xFFE040FB),
              modifier = Modifier.size(13.dp)
            )
            Spacer(modifier = Modifier.width(3.dp))
            Text(
              text = "特殊技「${character.specialSkillName}」",
              style = MaterialTheme.typography.labelSmall,
              fontSize = 10.sp,
              fontWeight = FontWeight.Bold,
              color = Color(0xFFEA80FC)
            )
          }
          Spacer(modifier = Modifier.height(2.dp))
          Text(
            text = character.specialSkillDescription,
            style = MaterialTheme.typography.bodySmall,
            fontSize = 8.5.sp,
            color = Color(0xFFCFD8DC),
            lineHeight = 11.sp
          )
        }
      }

      Spacer(modifier = Modifier.height(4.dp))

      // Status Ailment description card
      Surface(
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFF241424),
        border = BorderStroke(1.dp, Color(0xFF5D245D)),
        modifier = Modifier.fillMaxWidth()
      ) {
        Column(modifier = Modifier.padding(5.dp)) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
              imageVector = Icons.Default.AutoAwesome,
              contentDescription = null,
              tint = Color(0xFFCE93D8),
              modifier = Modifier.size(13.dp)
            )
            Spacer(modifier = Modifier.width(3.dp))
            Text(
              text = "状態異常「${character.statusAilmentName}」",
              style = MaterialTheme.typography.labelSmall,
              fontSize = 10.sp,
              fontWeight = FontWeight.Bold,
              color = Color(0xFFE1BEE7)
            )
          }
          Spacer(modifier = Modifier.height(2.dp))
          Text(
            text = character.statusAilmentDescription,
            style = MaterialTheme.typography.bodySmall,
            fontSize = 8.5.sp,
            color = Color(0xFFE0E0E0),
            lineHeight = 11.sp
          )
        }
      }

      Spacer(modifier = Modifier.height(4.dp))

      // Ultimate skill description card
      Surface(
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFF2A1B16),
        border = BorderStroke(1.dp, Color(0xFF6E3219)),
        modifier = Modifier.fillMaxWidth()
      ) {
        Column(modifier = Modifier.padding(5.dp)) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
              imageVector = Icons.Default.Whatshot,
              contentDescription = null,
              tint = Color(0xFFFFB74D),
              modifier = Modifier.size(13.dp)
            )
            Spacer(modifier = Modifier.width(3.dp))
            Text(
              text = "必殺技「${character.ultimateSkillName}」",
              style = MaterialTheme.typography.labelSmall,
              fontSize = 10.sp,
              fontWeight = FontWeight.Bold,
              color = Color(0xFFFFCC80)
            )
          }
          Spacer(modifier = Modifier.height(2.dp))
          Text(
            text = character.ultimateSkillDescription,
            style = MaterialTheme.typography.bodySmall,
            fontSize = 8.5.sp,
            color = Color(0xFFFFE0B2),
            lineHeight = 11.sp
          )
        }
      }
    }
  }
}

@Composable
private fun StatRow(name: String, value: String, ratio: Float, barColor: Color) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .padding(vertical = 1.5.dp),
    verticalAlignment = Alignment.CenterVertically
  ) {
    Text(
      text = name,
      style = MaterialTheme.typography.labelSmall,
      fontSize = 9.sp,
      color = Color(0xFF90A4AE),
      modifier = Modifier.width(34.dp)
    )
    Box(
      modifier = Modifier
        .weight(1f)
        .height(6.dp)
        .clip(RoundedCornerShape(3.dp))
        .background(Color(0xFF202738))
    ) {
      Box(
        modifier = Modifier
          .fillMaxWidth(ratio.coerceIn(0f, 1f))
          .height(6.dp)
          .background(barColor)
      )
    }
    Spacer(modifier = Modifier.width(4.dp))
    Text(
      text = value,
      style = MaterialTheme.typography.labelSmall,
      fontSize = 9.sp,
      fontWeight = FontWeight.Bold,
      color = Color.White,
      modifier = Modifier.width(28.dp),
      textAlign = TextAlign.End
    )
  }
}

@Composable
private fun StatChip(title: String, value: String, color: Color = Color.White) {
  Column(horizontalAlignment = Alignment.CenterHorizontally) {
    Text(text = title, style = MaterialTheme.typography.labelSmall, color = Color(0xFF90A4AE))
    Text(text = value, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, color = color)
  }
}
