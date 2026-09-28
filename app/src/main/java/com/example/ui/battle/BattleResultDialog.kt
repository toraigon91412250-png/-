package com.example.ui.battle

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.EmojiEvents
import androidx.compose.material.icons.filled.MoodBad
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.SwitchAccount
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import com.example.model.BattleUiState

@Composable
fun BattleResultDialog(
  state: BattleUiState,
  onRematch: () -> Unit,
  onBackToSelect: () -> Unit
) {
  val playerWon = state.winnerIsPlayer == true
  val winner = if (playerWon) state.player else state.enemy
  val loser = if (playerWon) state.enemy else state.player

  Dialog(
    onDismissRequest = { /* Modal, requires action button */ },
    properties = DialogProperties(dismissOnBackPress = false, dismissOnClickOutside = false)
  ) {
    Card(
      modifier = Modifier
        .fillMaxWidth()
        .padding(16.dp)
        .testTag("battle_result_dialog"),
      shape = RoundedCornerShape(20.dp),
      colors = CardDefaults.cardColors(containerColor = Color(0xFF131724)),
      border = BorderStroke(
        width = 2.dp,
        brush = Brush.verticalGradient(
          colors = if (playerWon) {
            listOf(Color(0xFFFFD54F), Color(0xFFFF8F00))
          } else {
            listOf(Color(0xFFE57373), Color(0xFFB71C1C))
          }
        )
      )
    ) {
      Column(
        modifier = Modifier
          .fillMaxWidth()
          .padding(20.dp),
        horizontalAlignment = Alignment.CenterHorizontally
      ) {
        // Banner Header Icon
        Surface(
          shape = CircleShape,
          color = if (playerWon) Color(0xFFFFB300).copy(alpha = 0.2f) else Color(0xFFB71C1C).copy(alpha = 0.2f),
          border = BorderStroke(
            1.5.dp,
            if (playerWon) Color(0xFFFFB300) else Color(0xFFE57373)
          ),
          modifier = Modifier.size(68.dp)
        ) {
          Box(contentAlignment = Alignment.Center) {
            Icon(
              imageVector = if (playerWon) Icons.Default.EmojiEvents else Icons.Default.MoodBad,
              contentDescription = null,
              tint = if (playerWon) Color(0xFFFFD54F) else Color(0xFFE57373),
              modifier = Modifier.size(40.dp)
            )
          }
        }

        Spacer(modifier = Modifier.height(10.dp))

        // Result title
        Text(
          text = if (playerWon) "VICTORY!" else "DEFEAT...",
          style = MaterialTheme.typography.headlineMedium,
          fontWeight = FontWeight.Black,
          letterSpacing = 2.sp,
          color = if (playerWon) Color(0xFFFFD54F) else Color(0xFFFF8A80)
        )

        Text(
          text = if (playerWon) "お見事！勝利を収めました！" else "残念！敗北してしまいました...",
          style = MaterialTheme.typography.bodyMedium,
          color = Color(0xFFCFD8DC),
          modifier = Modifier.padding(top = 2.dp, bottom = 12.dp)
        )

        // Winner Avatar & Slogan
        Card(
          modifier = Modifier.fillMaxWidth(),
          shape = RoundedCornerShape(12.dp),
          colors = CardDefaults.cardColors(containerColor = Color(0xFF1B2132)),
          border = BorderStroke(1.dp, Color(0xFF2E3955))
        ) {
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Box(
              modifier = Modifier
                .size(54.dp)
                .clip(RoundedCornerShape(8.dp))
                .border(1.dp, Color(winner.character.primaryColorHex), RoundedCornerShape(8.dp))
            ) {
              Image(
                painter = painterResource(id = winner.character.portraitRes),
                contentDescription = winner.character.name,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
              )
            }

            Spacer(modifier = Modifier.width(10.dp))

            Column(modifier = Modifier.weight(1f)) {
              Text(
                text = "${winner.character.name} の勝利！",
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White
              )
              Spacer(modifier = Modifier.height(2.dp))
              Text(
                text = if (playerWon) winner.character.victorySlogan else loser.character.defeatSlogan,
                style = MaterialTheme.typography.bodySmall,
                fontSize = 11.sp,
                color = Color(0xFF90CAF9)
              )
            }
          }
        }

        Spacer(modifier = Modifier.height(14.dp))

        // Match Stats
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .background(Color(0xFF181C2A), RoundedCornerShape(10.dp))
            .padding(vertical = 10.dp, horizontal = 12.dp),
          horizontalArrangement = Arrangement.SpaceAround
        ) {
          StatColumn("決着ターン", "${state.turnNumber} ターン")
          StatColumn("あなたの残りHP", "${state.player.currentHp} / ${state.player.maxHp}")
          StatColumn("CPUの残りHP", "${state.enemy.currentHp} / ${state.enemy.maxHp}")
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Action Buttons
        Button(
          onClick = onRematch,
          modifier = Modifier
            .fillMaxWidth()
            .height(50.dp)
            .testTag("rematch_button"),
          shape = RoundedCornerShape(12.dp),
          colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFF1E3A8A),
            contentColor = Color.White
          ),
          border = BorderStroke(1.dp, Color(0xFF60A5FA))
        ) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(imageVector = Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
              text = "もう一度対戦する",
              fontWeight = FontWeight.Bold,
              fontSize = 15.sp
            )
          }
        }

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedButton(
          onClick = onBackToSelect,
          modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .testTag("back_to_select_button"),
          shape = RoundedCornerShape(12.dp),
          colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFB0BEC5)),
          border = BorderStroke(1.dp, Color(0xFF37474F))
        ) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(imageVector = Icons.Default.SwitchAccount, contentDescription = null, modifier = Modifier.size(18.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text(
              text = "キャラクター選択へ",
              fontSize = 14.sp
            )
          }
        }
      }
    }
  }
}

@Composable
private fun StatColumn(label: String, value: String) {
  Column(horizontalAlignment = Alignment.CenterHorizontally) {
    Text(
      text = label,
      style = MaterialTheme.typography.labelSmall,
      color = Color(0xFF90A4AE),
      fontSize = 10.sp
    )
    Spacer(modifier = Modifier.height(2.dp))
    Text(
      text = value,
      style = MaterialTheme.typography.bodyMedium,
      fontWeight = FontWeight.Bold,
      color = Color.White,
      fontSize = 12.sp
    )
  }
}
