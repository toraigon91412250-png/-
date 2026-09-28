package com.example.ui.battle

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.keyframes
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.FastForward
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.VolumeOff
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.R
import com.example.model.BattleAction
import com.example.model.BattlePhase
import com.example.model.BattleUiState
import com.example.model.EffectType
import kotlin.math.roundToInt

@Composable
fun BattleScreen(
  viewModel: BattleViewModel,
  onBackToSelect: () -> Unit,
  modifier: Modifier = Modifier
) {
  val state by viewModel.uiState.collectAsStateWithLifecycle()
  val focusRequester = remember { FocusRequester() }

  LaunchedEffect(Unit) {
    focusRequester.requestFocus()
  }

  // Handle keyboard shortcuts for PC play
  val isActionEnabled = state.phase == BattlePhase.SELECT_ACTION

  // Screen shake animation on impactful hits
  val screenShakeX = remember { Animatable(0f) }
  LaunchedEffect(state.visualEffect?.effectId) {
    val effect = state.visualEffect
    if (effect != null && effect.damage > 0) {
      val intensity = when {
        effect.isUltimate -> 18f
        effect.isCritical -> 12f
        effect.effectType == EffectType.SPECIAL_SMASH -> 9f
        effect.effectType == EffectType.SPECIAL_FEATHER -> 7f
        else -> 5f
      }
      screenShakeX.snapTo(0f)
      screenShakeX.animateTo(
        targetValue = 0f,
        animationSpec = keyframes {
          durationMillis = if (effect.isUltimate) 420 else 220
          0f at 0
          -intensity at 30
          intensity at 60
          -(intensity * 0.7f) at 100
          (intensity * 0.5f) at 140
          -(intensity * 0.25f) at 180
          0f at (if (effect.isUltimate) 420 else 220)
        }
      )
    }
  }

  Box(
    modifier = modifier
      .fillMaxSize()
      .focusRequester(focusRequester)
      .focusable()
      .onKeyEvent { event ->
        if (event.type == KeyEventType.KeyUp) {
          when (event.key) {
            Key.One, Key.NumPad1 -> {
              if (isActionEnabled) {
                viewModel.onActionSelected(BattleAction.ATTACK)
                true
              } else false
            }
            Key.Two, Key.NumPad2 -> {
              if (isActionEnabled) {
                viewModel.onActionSelected(BattleAction.EVADE)
                true
              } else false
            }
            Key.Three, Key.NumPad3 -> {
              if (isActionEnabled) {
                viewModel.onActionSelected(BattleAction.BUFF)
                true
              } else false
            }
            Key.Four, Key.NumPad4 -> {
              if (isActionEnabled && state.player.isSpecialReady) {
                viewModel.onActionSelected(BattleAction.SPECIAL)
                true
              } else false
            }
            Key.Five, Key.NumPad5 -> {
              if (isActionEnabled && state.player.isUltimateReady) {
                viewModel.onActionSelected(BattleAction.ULTIMATE)
                true
              } else false
            }
            Key.R -> {
              if (state.phase == BattlePhase.BATTLE_FINISHED) {
                viewModel.restartBattle()
                true
              } else false
            }
            else -> false
          }
        } else false
      }
      .background(Color(0xFF0A0D16))
  ) {
    // Battle Arena Background at high sharpness
    Image(
      painter = painterResource(id = R.drawable.img_arena_bg),
      contentDescription = null,
      alpha = 0.22f,
      modifier = Modifier.fillMaxSize(),
      contentScale = ContentScale.Crop
    )

    // Dark gradient overlay
    Box(
      modifier = Modifier
        .fillMaxSize()
        .background(
          Brush.verticalGradient(
            colors = listOf(
              Color(0xEE0A0D16),
              Color(0xCC0D101C),
              Color(0xF50A0D16)
            )
          )
        )
    )

    Scaffold(
      containerColor = Color.Transparent,
      topBar = {
        BattleTopBar(
          turnNumber = state.turnNumber,
          speedMultiplier = state.battleSpeedMultiplier,
          isSoundEnabled = state.isSoundEnabled,
          difficultyTitle = state.cpuDifficulty.title,
          onBack = onBackToSelect,
          onToggleSpeed = { viewModel.toggleSpeedMultiplier() },
          onToggleSound = { viewModel.toggleSound() }
        )
      }
    ) { innerPadding ->
      Box(
        modifier = Modifier
          .fillMaxSize()
          .padding(innerPadding)
          .offset { IntOffset(screenShakeX.value.roundToInt(), (screenShakeX.value * 0.35f).roundToInt()) }
      ) {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
          if (maxWidth < 650.dp) {
            // Mobile Layout (Compact, vertical stack)
            MobileBattleContent(
              state = state,
              isActionEnabled = isActionEnabled,
              onAction = { viewModel.onActionSelected(it) }
            )
          } else {
            // PC / Tablet Layout (Wide screen, dual pane)
            WideBattleContent(
              state = state,
              isActionEnabled = isActionEnabled,
              onAction = { viewModel.onActionSelected(it) }
            )
          }
        }

        // High-Impact Battle Visual FX Overlay (Hit sparks, slashes, ultimate cut-in, damage popups, buffs, evades)
        BattleVisualFxOverlay(
          effect = state.visualEffect,
          modifier = Modifier.fillMaxSize()
        )
      }
    }

    // Battle Result Dialog
    if (state.phase == BattlePhase.BATTLE_FINISHED && state.winnerIsPlayer != null) {
      BattleResultDialog(
        state = state,
        onRematch = { viewModel.restartBattle() },
        onBackToSelect = onBackToSelect
      )
    }
  }
}

@Composable
private fun BattleTopBar(
  turnNumber: Int,
  speedMultiplier: Float,
  isSoundEnabled: Boolean,
  difficultyTitle: String,
  onBack: () -> Unit,
  onToggleSpeed: () -> Unit,
  onToggleSound: () -> Unit
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
        onClick = onBack,
        modifier = Modifier.testTag("top_bar_back_button")
      ) {
        Icon(
          imageVector = Icons.AutoMirrored.Filled.ArrowBack,
          contentDescription = "戻る",
          tint = Color.White
        )
      }
      Spacer(modifier = Modifier.width(4.dp))
      Surface(
        shape = RoundedCornerShape(8.dp),
        color = Color(0xFF1E283D),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF334568))
      ) {
        Text(
          text = "第 $turnNumber ターン",
          style = MaterialTheme.typography.titleSmall,
          fontWeight = FontWeight.Bold,
          color = Color(0xFFFFD54F),
          modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
        )
      }
    }

    Row(verticalAlignment = Alignment.CenterVertically) {
      // Sound toggle button (ON / OFF)
      Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (isSoundEnabled) Color(0xFF162E4A) else Color(0xFF212530),
        border = androidx.compose.foundation.BorderStroke(
          1.dp,
          if (isSoundEnabled) Color(0xFF42A5F5) else Color(0xFF455A64)
        ),
        modifier = Modifier.testTag("sound_toggle_button")
      ) {
        Row(
          modifier = Modifier
            .clickable(onClick = onToggleSound)
            .padding(horizontal = 8.dp, vertical = 4.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Icon(
            imageVector = if (isSoundEnabled) Icons.Default.VolumeUp else Icons.Default.VolumeOff,
            contentDescription = if (isSoundEnabled) "効果音ON" else "効果音OFF",
            tint = if (isSoundEnabled) Color(0xFF90CAF9) else Color(0xFF78909C),
            modifier = Modifier.size(16.dp)
          )
          Spacer(modifier = Modifier.width(3.dp))
          Text(
            text = if (isSoundEnabled) "音ON" else "音OFF",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = if (isSoundEnabled) Color.White else Color(0xFF9E9E9E)
          )
        }
      }

      Spacer(modifier = Modifier.width(6.dp))

      // Speed multiplier toggle (1.0x / 1.8x)
      Surface(
        shape = RoundedCornerShape(8.dp),
        color = if (speedMultiplier > 1f) Color(0xFF311B92) else Color(0xFF1F2937),
        border = androidx.compose.foundation.BorderStroke(
          1.dp,
          if (speedMultiplier > 1f) Color(0xFF7C4DFF) else Color(0xFF374151)
        ),
        modifier = Modifier.testTag("speed_toggle_button")
      ) {
        Row(
          modifier = Modifier
            .clickable(onClick = onToggleSpeed)
            .padding(horizontal = 8.dp, vertical = 4.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Icon(
            imageVector = Icons.Default.FastForward,
            contentDescription = "戦闘速度",
            tint = if (speedMultiplier > 1f) Color(0xFFB388FF) else Color(0xFF9CA3AF),
            modifier = Modifier.size(16.dp)
          )
          Spacer(modifier = Modifier.width(3.dp))
          Text(
            text = if (speedMultiplier > 1f) "2x" else "1x",
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.Bold,
            color = if (speedMultiplier > 1f) Color.White else Color(0xFFD1D5DB)
          )
        }
      }
    }
  }
}

@Composable
private fun MobileBattleContent(
  state: BattleUiState,
  isActionEnabled: Boolean,
  onAction: (BattleAction) -> Unit
) {
  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(horizontal = 12.dp)
  ) {
    // 1. Enemy Fighter Card (Top)
    FighterCard(
      fighter = state.enemy,
      isTargetOfEffect = state.visualEffect?.targetIsPlayer == false,
      visualEffect = state.visualEffect,
      modifier = Modifier.fillMaxWidth()
    )

    Spacer(modifier = Modifier.height(6.dp))

    // 2. Central Clash / Effect area
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .height(34.dp),
      contentAlignment = Alignment.Center
    ) {
      FloatingEffectBanner(effect = state.visualEffect)
    }

    Spacer(modifier = Modifier.height(6.dp))

    // 3. Battle Log View
    BattleLogView(
      logs = state.logs,
      modifier = Modifier
        .fillMaxWidth()
        .weight(1f)
    )

    Spacer(modifier = Modifier.height(8.dp))

    // 4. Player Fighter Card
    FighterCard(
      fighter = state.player,
      isTargetOfEffect = state.visualEffect?.targetIsPlayer == true,
      visualEffect = state.visualEffect,
      modifier = Modifier.fillMaxWidth()
    )

    Spacer(modifier = Modifier.height(8.dp))

    // 5. Action Command Dock (Bottom)
    ActionDock(
      player = state.player,
      enemy = state.enemy,
      isEnabled = isActionEnabled,
      onAction = onAction,
      modifier = Modifier.fillMaxWidth()
    )

    Spacer(modifier = Modifier.height(10.dp))
  }
}

@Composable
private fun WideBattleContent(
  state: BattleUiState,
  isActionEnabled: Boolean,
  onAction: (BattleAction) -> Unit
) {
  Row(
    modifier = Modifier
      .fillMaxSize()
      .padding(horizontal = 16.dp, vertical = 8.dp),
    horizontalArrangement = Arrangement.spacedBy(16.dp)
  ) {
    // Left Pane: Player Card & Command Dock & PC Hints
    Column(
      modifier = Modifier
        .weight(1f)
        .fillMaxHeight(),
      verticalArrangement = Arrangement.SpaceBetween
    ) {
      Column {
        Text(
          text = "👤 プレイヤー陣営",
          style = MaterialTheme.typography.labelLarge,
          fontWeight = FontWeight.Bold,
          color = Color(0xFF90CAF9),
          modifier = Modifier.padding(bottom = 6.dp)
        )

        FighterCard(
          fighter = state.player,
          isTargetOfEffect = state.visualEffect?.targetIsPlayer == true,
          visualEffect = state.visualEffect,
          modifier = Modifier.fillMaxWidth()
        )

        Spacer(modifier = Modifier.height(12.dp))

        // PC Keyboard Shortcuts Help
        Card(
          modifier = Modifier.fillMaxWidth(),
          shape = RoundedCornerShape(10.dp),
          colors = CardDefaults.cardColors(containerColor = Color(0xFF141926)),
          border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFF263248))
        ) {
          Row(
            modifier = Modifier
              .fillMaxWidth()
              .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Text(
              text = "⌨️ PCショートカット:",
              style = MaterialTheme.typography.labelSmall,
              color = Color(0xFFB0BEC5)
            )
            Text(
              text = "[1]攻撃 [2]回避 [3]強化 [4]特殊技 [5]必殺技",
              style = MaterialTheme.typography.labelSmall,
              fontWeight = FontWeight.Bold,
              color = Color(0xFF64FFDA)
            )
          }
        }
      }

      // Action Dock
      ActionDock(
        player = state.player,
        enemy = state.enemy,
        isEnabled = isActionEnabled,
        onAction = onAction,
        modifier = Modifier.fillMaxWidth()
      )
    }

    // Right Pane: Enemy Card, Visual Clash, Battle Log
    Column(
      modifier = Modifier
        .weight(1f)
        .fillMaxHeight()
    ) {
      Text(
        text = "🤖 CPU 対戦相手",
        style = MaterialTheme.typography.labelLarge,
        fontWeight = FontWeight.Bold,
        color = Color(0xFFFFCC80),
        modifier = Modifier.padding(bottom = 6.dp)
      )

      FighterCard(
        fighter = state.enemy,
        isTargetOfEffect = state.visualEffect?.targetIsPlayer == false,
        visualEffect = state.visualEffect,
        modifier = Modifier.fillMaxWidth()
      )

      Spacer(modifier = Modifier.height(8.dp))

      // Center clash banner
      Box(
        modifier = Modifier
          .fillMaxWidth()
          .height(36.dp),
        contentAlignment = Alignment.Center
      ) {
        FloatingEffectBanner(effect = state.visualEffect)
      }

      Spacer(modifier = Modifier.height(8.dp))

      // Battle Log
      BattleLogView(
        logs = state.logs,
        modifier = Modifier
          .fillMaxWidth()
          .weight(1f)
      )
    }
  }
}
