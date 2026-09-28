package com.example.ui.battle

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.keyframes
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.DirectionsRun
import androidx.compose.material.icons.filled.HourglassBottom
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.SportsKabaddi
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.BattleAction
import com.example.model.BattleFighter
import com.example.model.BattleLog
import com.example.model.EffectType
import com.example.model.LogType
import com.example.model.StatusAilmentType
import com.example.model.VisualEffect
import com.example.ui.theme.CriticalOrange
import com.example.ui.theme.HpGreen
import com.example.ui.theme.HpRed
import com.example.ui.theme.HpYellow
import com.example.ui.theme.SpecialPurple
import kotlin.math.cos
import kotlin.math.roundToInt
import kotlin.math.sin

@Composable
fun HpGaugeBar(
  currentHp: Int,
  maxHp: Int,
  modifier: Modifier = Modifier
) {
  val targetRatio = (currentHp.toFloat() / maxHp.toFloat()).coerceIn(0f, 1f)
  val animatedRatio by animateFloatAsState(
    targetValue = targetRatio,
    animationSpec = tween(durationMillis = 350, easing = FastOutSlowInEasing),
    label = "hp_ratio"
  )

  val barColor by animateColorAsState(
    targetValue = when {
      targetRatio > 0.50f -> HpGreen
      targetRatio > 0.25f -> HpYellow
      else -> HpRed
    },
    animationSpec = tween(250),
    label = "hp_color"
  )

  Column(modifier = modifier) {
    Row(
      modifier = Modifier.fillMaxWidth(),
      horizontalArrangement = Arrangement.SpaceBetween,
      verticalAlignment = Alignment.CenterVertically
    ) {
      Text(
        text = "HP",
        style = MaterialTheme.typography.labelSmall,
        fontSize = 11.sp,
        fontWeight = FontWeight.Black,
        color = barColor
      )
      Text(
        text = "$currentHp / $maxHp (${(targetRatio * 100).toInt()}%)",
        style = MaterialTheme.typography.labelSmall,
        fontSize = 11.sp,
        fontWeight = FontWeight.Bold,
        color = Color.White
      )
    }

    Spacer(modifier = Modifier.height(3.dp))

    // Gauge track with sharp 1dp pixel-aligned border
    Box(
      modifier = Modifier
        .fillMaxWidth()
        .height(13.dp)
        .clip(RoundedCornerShape(6.dp))
        .background(Color(0xFF161B28))
        .border(1.dp, Color(0xFF3B4868), RoundedCornerShape(6.dp))
    ) {
      // Animated Fill
      Box(
        modifier = Modifier
          .fillMaxWidth(animatedRatio)
          .fillMaxSize()
          .background(
            Brush.horizontalGradient(
              colors = listOf(
                barColor.copy(alpha = 0.85f),
                barColor
              )
            )
          )
      )
    }
  }
}

@Composable
fun FighterCard(
  fighter: BattleFighter,
  isTargetOfEffect: Boolean,
  visualEffect: VisualEffect?,
  modifier: Modifier = Modifier
) {
  // Hit reaction animation on the card
  val cardShake = remember { Animatable(0f) }
  LaunchedEffect(isTargetOfEffect, visualEffect?.effectId) {
    if (isTargetOfEffect && visualEffect != null && visualEffect.damage > 0) {
      val intensity = when {
        visualEffect.isUltimate -> 14f
        visualEffect.isCritical -> 10f
        else -> 6f
      }
      cardShake.snapTo(0f)
      cardShake.animateTo(
        targetValue = 0f,
        animationSpec = keyframes {
          durationMillis = 280
          0f at 0
          -intensity at 35
          intensity at 70
          -(intensity * 0.6f) at 120
          (intensity * 0.6f) at 170
          -(intensity * 0.3f) at 220
          0f at 280
        }
      )
    }
  }

  val primaryCharColor = Color(fighter.character.primaryColorHex)

  Card(
    modifier = modifier
      .offset { IntOffset(cardShake.value.roundToInt(), 0) }
      .testTag(if (fighter.isPlayer) "player_fighter_card" else "enemy_fighter_card"),
    shape = RoundedCornerShape(14.dp),
    colors = CardDefaults.cardColors(containerColor = Color(0xFF131724)),
    border = BorderStroke(
      width = if (fighter.isBuffed || fighter.isEvading) 2.dp else 1.dp,
      color = when {
        fighter.isBuffed -> Color(0xFFFFB300)
        fighter.isEvading -> Color(0xFF00E5FF)
        else -> primaryCharColor.copy(alpha = 0.8f)
      }
    )
  ) {
    Column(modifier = Modifier.padding(10.dp)) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
      ) {
        // Character Portrait in high resolution (loaded from drawable-nodpi)
        Box(
          modifier = Modifier
            .size(68.dp)
            .clip(RoundedCornerShape(12.dp))
            .border(2.dp, primaryCharColor, RoundedCornerShape(12.dp))
        ) {
          Image(
            painter = painterResource(id = fighter.character.portraitRes),
            contentDescription = fighter.character.name,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop
          )

          // Buff aura overlay
          if (fighter.isBuffed) {
            Box(
              modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFFFFB300).copy(alpha = 0.35f)),
              contentAlignment = Alignment.TopEnd
            ) {
              Surface(
                shape = CircleShape,
                color = Color(0xFFFF8F00),
                modifier = Modifier.padding(3.dp)
              ) {
                Icon(
                  imageVector = Icons.Default.AutoAwesome,
                  contentDescription = "強化中",
                  tint = Color.White,
                  modifier = Modifier.size(16.dp).padding(2.dp)
                )
              }
            }
          }

          // Evading stance overlay
          if (fighter.isEvading) {
            Box(
              modifier = Modifier
                .fillMaxSize()
                .background(Color(0xFF00B0FF).copy(alpha = 0.45f)),
              contentAlignment = Alignment.Center
            ) {
              Icon(
                imageVector = Icons.Default.DirectionsRun,
                contentDescription = "回避構え",
                tint = Color(0xFFE0F7FA),
                modifier = Modifier.size(34.dp)
              )
            }
          }
        }

        Spacer(modifier = Modifier.width(10.dp))

        // Stats & HP
        Column(modifier = Modifier.weight(1f)) {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Row(verticalAlignment = Alignment.CenterVertically) {
              Text(
                text = fighter.character.name,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Black,
                fontSize = 15.sp,
                color = Color.White
              )
              Spacer(modifier = Modifier.width(6.dp))
              Surface(
                shape = RoundedCornerShape(4.dp),
                color = if (fighter.isPlayer) Color(0xFF1E3A8A) else Color(0xFF881337)
              ) {
                Text(
                  text = if (fighter.isPlayer) "PLAYER" else "CPU",
                  style = MaterialTheme.typography.labelSmall,
                  fontSize = 10.sp,
                  fontWeight = FontWeight.ExtraBold,
                  color = Color.White,
                  modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
                )
              }
            }

            // Speed & Evasion badge
            Row(verticalAlignment = Alignment.CenterVertically) {
              Surface(
                shape = RoundedCornerShape(6.dp),
                color = Color(0xFF1E2836),
                border = BorderStroke(1.dp, Color(0xFF334568)),
                modifier = Modifier.padding(end = 4.dp)
              ) {
                Row(
                  verticalAlignment = Alignment.CenterVertically,
                  modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                  Icon(
                    imageVector = Icons.Default.Speed,
                    contentDescription = "素早さ",
                    tint = Color(0xFF4FC3F7),
                    modifier = Modifier.size(13.dp)
                  )
                  Spacer(modifier = Modifier.width(3.dp))
                  Text(
                    text = "${fighter.effectiveSpeed}",
                    style = MaterialTheme.typography.labelSmall,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (fighter.effectiveSpeed < fighter.character.speed) Color(0xFFFF8A80) else Color(0xFFE0F7FA)
                  )
                }
              }

              Surface(
                shape = RoundedCornerShape(6.dp),
                color = Color(0xFF103630),
                border = BorderStroke(1.dp, Color(0xFF00BFA5))
              ) {
                Text(
                  text = "回避${(fighter.character.evasionRate * 100).toInt()}%",
                  style = MaterialTheme.typography.labelSmall,
                  fontSize = 11.sp,
                  fontWeight = FontWeight.Bold,
                  color = Color(0xFF64FFDA),
                  modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                )
              }
            }
          }

          Spacer(modifier = Modifier.height(4.dp))

          // HP Gauge
          HpGaugeBar(
            currentHp = fighter.currentHp,
            maxHp = fighter.maxHp
          )
        }
      }

      Spacer(modifier = Modifier.height(6.dp))

      // Middle status row: Active Ailments + Buff Status
      if (fighter.isBuffed || fighter.activeAilments.isNotEmpty()) {
        Row(
          modifier = Modifier
            .fillMaxWidth()
            .padding(bottom = 4.dp),
          horizontalArrangement = Arrangement.spacedBy(6.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          // Buff chip
          if (fighter.isBuffed) {
            Surface(
              shape = RoundedCornerShape(5.dp),
              color = Color(0xFFE65100).copy(alpha = 0.40f),
              border = BorderStroke(1.dp, Color(0xFFFFB300))
            ) {
              Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
              ) {
                Icon(
                  imageVector = Icons.Default.AutoAwesome,
                  contentDescription = null,
                  tint = Color(0xFFFFD54F),
                  modifier = Modifier.size(12.dp)
                )
                Spacer(modifier = Modifier.width(3.dp))
                Text(
                  text = "強化中(+50)",
                  style = MaterialTheme.typography.labelSmall,
                  fontSize = 10.sp,
                  fontWeight = FontWeight.Bold,
                  color = Color(0xFFFFE082)
                )
              }
            }
          }

          // Active Status Ailments
          fighter.activeAilments.forEach { ailment ->
            val (chipColor, borderColor, textColor) = if (ailment.type == StatusAilmentType.BLEED) {
              Triple(Color(0xFFB71C1C).copy(alpha = 0.40f), Color(0xFFEF5350), Color(0xFFFFCDD2))
            } else {
              Triple(Color(0xFF4A148C).copy(alpha = 0.40f), Color(0xFFAB47BC), Color(0xFFF3E5F5))
            }
            Surface(
              shape = RoundedCornerShape(5.dp),
              color = chipColor,
              border = BorderStroke(1.dp, borderColor)
            ) {
              Text(
                text = "${ailment.type.displayName}(${ailment.remainingTurns}T)",
                style = MaterialTheme.typography.labelSmall,
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = textColor,
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
              )
            }
          }
        }
      }

      // Bottom info row: Stats + Passive badge + Ultimate Gauge + Skill CD
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        // Passive ability badge
        Surface(
          shape = RoundedCornerShape(5.dp),
          color = Color(0xFF261D33),
          border = BorderStroke(1.dp, Color(0xFF7E57C2).copy(alpha = 0.6f))
        ) {
          Text(
            text = "固有: ${fighter.character.passiveName}",
            style = MaterialTheme.typography.labelSmall,
            fontSize = 10.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color(0xFFD1C4E9),
            modifier = Modifier.padding(horizontal = 5.dp, vertical = 2.dp)
          )
        }

        // Special Cooldown
        val isSpecialReady = fighter.isSpecialReady
        Surface(
          shape = RoundedCornerShape(5.dp),
          color = if (isSpecialReady) SpecialPurple.copy(alpha = 0.30f) else Color(0xFF232936),
          border = BorderStroke(1.dp, if (isSpecialReady) SpecialPurple else Color(0xFF475569))
        ) {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
          ) {
            Icon(
              imageVector = if (isSpecialReady) Icons.Default.Bolt else Icons.Default.HourglassBottom,
              contentDescription = null,
              tint = if (isSpecialReady) Color(0xFFE040FB) else Color(0xFF94A3B8),
              modifier = Modifier.size(12.dp)
            )
            Spacer(modifier = Modifier.width(3.dp))
            Text(
              text = if (isSpecialReady) "技:READY" else "技:CD${fighter.specialCooldownRemaining}T",
              style = MaterialTheme.typography.labelSmall,
              fontSize = 10.sp,
              fontWeight = FontWeight.Bold,
              color = if (isSpecialReady) Color(0xFFEA80FC) else Color(0xFFCBD5E1)
            )
          }
        }

        // Ultimate Gauge (0/3 ~ 3/3)
        val isUltReady = fighter.isUltimateReady
        Surface(
          shape = RoundedCornerShape(5.dp),
          color = if (isUltReady) Color(0xFFFF6F00).copy(alpha = 0.40f) else Color(0xFF1E2433),
          border = BorderStroke(
            1.dp,
            if (isUltReady) Color(0xFFFFD54F) else Color(0xFF475569)
          )
        ) {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
          ) {
            Icon(
              imageVector = Icons.Default.Whatshot,
              contentDescription = null,
              tint = if (isUltReady) Color(0xFFFFD54F) else Color(0xFF94A3B8),
              modifier = Modifier.size(13.dp)
            )
            Spacer(modifier = Modifier.width(3.dp))
            Text(
              text = if (isUltReady) "必殺:3/3 MAX!" else "必殺:${fighter.ultimateGauge}/3",
              style = MaterialTheme.typography.labelSmall,
              fontSize = 10.sp,
              fontWeight = FontWeight.ExtraBold,
              color = if (isUltReady) Color(0xFFFFE082) else Color(0xFFCBD5E1)
            )
          }
        }
      }
    }
  }
}

/**
 * Enhanced High-Impact Battle Visual FX Overlay:
 * Renders:
 * 1. Normal Attack: Sharp hit spark burst, impact lines, clear floating damage number
 * 2. Critical Hit: Radiant golden cross-slashes, screen impact flash, "CRITICAL HIT!" badge, bold golden damage counter
 * 3. Special Skills:
 *    - Irena's 羽弾: Piercing feather energy bolts & burst explosion with Bleed tag
 *    - Kaiser's 重撃: Seismic ground shockwaves with Pressure tag
 * 4. Ultimate Skills (羽嵐 / 超重撃): Full-screen darkening, cinematic cut-in banner, flash, nova blast ring, massive damage counter
 * 5. Evade (回避): Wind dash lines, bright cyan "MISS! 回避成功" popup
 * 6. Buff (強化): Rising golden energy aura burst & power-up spark rings
 */
@Composable
fun BattleVisualFxOverlay(
  effect: VisualEffect?,
  modifier: Modifier = Modifier
) {
  if (effect == null) return

  val progress = remember { Animatable(0f) }
  LaunchedEffect(effect.effectId) {
    progress.snapTo(0f)
    progress.animateTo(
      targetValue = 1f,
      animationSpec = tween(
        durationMillis = if (effect.isUltimate) 700 else 450,
        easing = LinearEasing
      )
    )
  }

  val t = progress.value

  Box(
    modifier = modifier.fillMaxSize(),
    contentAlignment = Alignment.Center
  ) {
    // 1. Ultimate Screen Dim & Flash
    if (effect.isUltimate) {
      val dimAlpha = if (t < 0.2f) (t / 0.2f) * 0.70f else (1f - t) * 0.70f
      Box(
        modifier = Modifier
          .fillMaxSize()
          .background(Color.Black.copy(alpha = dimAlpha.coerceIn(0f, 0.70f)))
      )

      // Screen flash at peak impact
      if (t in 0.15f..0.35f) {
        val flashAlpha = 1f - (Math.abs(t - 0.25f) / 0.10f)
        Box(
          modifier = Modifier
            .fillMaxSize()
            .background(Color.White.copy(alpha = (flashAlpha * 0.40f).coerceIn(0f, 0.40f)))
        )
      }

      // Grand Ultimate Cut-In Banner
      if (t in 0.05f..0.85f) {
        Column(
          horizontalAlignment = Alignment.CenterHorizontally,
          modifier = Modifier
            .offset(y = (-50).dp)
            .scale(if (t < 0.25f) 0.85f + t * 0.6f else 1.0f)
            .alpha(if (t > 0.65f) (0.85f - t) / 0.2f else 1f)
        ) {
          Surface(
            shape = RoundedCornerShape(14.dp),
            color = Color(0xFF1E0E08),
            border = BorderStroke(2.dp, Color(0xFFFFD54F))
          ) {
            Column(
              horizontalAlignment = Alignment.CenterHorizontally,
              modifier = Modifier.padding(horizontal = 24.dp, vertical = 10.dp)
            ) {
              Text(
                text = "🌟 ULTIMATE SKILL 🌟",
                fontSize = 11.sp,
                fontWeight = FontWeight.Black,
                color = Color(0xFFFFD54F),
                letterSpacing = 2.sp
              )
              Text(
                text = "必殺技『${effect.skillName}』",
                fontSize = 22.sp,
                fontWeight = FontWeight.Black,
                color = Color.White
              )
            }
          }
        }
      }
    }

    // 2. Critical Hit Impact Flash
    if (effect.isCritical && t in 0.08f..0.24f) {
      val critFlash = 1f - (Math.abs(t - 0.16f) / 0.08f)
      Box(
        modifier = Modifier
          .fillMaxSize()
          .background(Color(0xFFFFD54F).copy(alpha = (critFlash * 0.25f).coerceIn(0f, 0.25f)))
      )
    }

    // 3. Dynamic Canvas Particle & Combat FX
    Canvas(modifier = Modifier.fillMaxSize()) {
      val w = size.width
      val h = size.height
      val targetCenter = if (effect.targetIsPlayer) Offset(w * 0.5f, h * 0.68f) else Offset(w * 0.5f, h * 0.26f)
      val actorCenter = if (effect.targetIsPlayer) Offset(w * 0.5f, h * 0.26f) else Offset(w * 0.5f, h * 0.68f)

      when {
        // Buff Power-Up Aura Effect
        effect.isBuff -> {
          val buffT = t
          val radius = buffT * 110f
          val alpha = (1f - buffT).coerceIn(0f, 1f)
          drawCircle(
            brush = Brush.radialGradient(
              colors = listOf(Color(0xFFFFD54F), Color(0xFFFF8F00), Color.Transparent),
              center = targetCenter,
              radius = radius.coerceAtLeast(10f)
            ),
            radius = radius,
            center = targetCenter,
            alpha = alpha * 0.8f
          )
          drawCircle(
            color = Color(0xFFFFE082),
            radius = radius * 0.85f,
            center = targetCenter,
            alpha = alpha,
            style = Stroke(width = 5f)
          )
          // Rising energy spark lines
          for (i in -3..3) {
            val sparkX = targetCenter.x + i * 22f
            val startY = targetCenter.y + 40f - buffT * 90f
            val endY = startY - 30f
            drawLine(
              color = Color(0xFFFFD54F),
              start = Offset(sparkX, startY),
              end = Offset(sparkX, endY),
              strokeWidth = 3f,
              cap = StrokeCap.Round,
              alpha = alpha
            )
          }
        }

        // Evade Dodge Wind Motion Effect
        effect.isEvade -> {
          val evadeT = t
          val alpha = (1f - evadeT).coerceIn(0f, 1f)
          val lineLen = 140f * evadeT
          for (i in -2..2) {
            val offsetY = targetCenter.y + i * 24f
            drawLine(
              color = Color(0xFF00E5FF),
              start = Offset(targetCenter.x - lineLen + i * 15f, offsetY),
              end = Offset(targetCenter.x + lineLen + i * 15f, offsetY),
              strokeWidth = 4f,
              cap = StrokeCap.Round,
              alpha = alpha * 0.85f
            )
          }
          drawCircle(
            color = Color(0xFF64FFDA),
            radius = 60f * evadeT,
            center = targetCenter,
            alpha = alpha * 0.6f,
            style = Stroke(width = 4f)
          )
        }

        // Ultimate Nova Blast
        effect.isUltimate -> {
          val radius = (t * w * 0.65f)
          val alpha = (1f - t).coerceIn(0f, 1f)
          drawCircle(
            brush = Brush.radialGradient(
              colors = listOf(Color(0xFFFFF9C4), Color(0xFFFF6F00), Color(0xFFD84315), Color.Transparent),
              center = targetCenter,
              radius = radius.coerceAtLeast(10f)
            ),
            radius = radius,
            center = targetCenter,
            alpha = alpha
          )
          drawCircle(
            color = Color(0xFFFFD54F),
            radius = radius * 0.9f,
            center = targetCenter,
            alpha = alpha * 0.8f,
            style = Stroke(width = 6f)
          )
        }

        // Irena Feather Projectile & Burst (羽弾)
        effect.effectType == EffectType.SPECIAL_FEATHER -> {
          if (t < 0.45f) {
            val projT = t / 0.45f
            val currPos = Offset(
              actorCenter.x + (targetCenter.x - actorCenter.x) * projT,
              actorCenter.y + (targetCenter.y - actorCenter.y) * projT
            )
            for (i in -2..2) {
              val offsetPos = Offset(currPos.x + i * 16f, currPos.y - i * 12f)
              drawCircle(
                color = Color(0xFF64FFDA),
                radius = 12f,
                center = offsetPos,
                alpha = 0.9f
              )
              drawCircle(
                color = Color(0xFFE040FB),
                radius = 7f,
                center = offsetPos,
                alpha = 1.0f
              )
            }
          } else {
            val impactT = (t - 0.45f) / 0.55f
            val radius = impactT * 120f
            val alpha = (1f - impactT).coerceIn(0f, 1f)
            drawCircle(
              brush = Brush.radialGradient(
                colors = listOf(Color(0xFFE040FB), Color(0xFF00E5FF), Color.Transparent),
                center = targetCenter,
                radius = radius.coerceAtLeast(10f)
              ),
              radius = radius,
              center = targetCenter,
              alpha = alpha
            )
          }
        }

        // Kaiser Seismic Smash (重撃)
        effect.effectType == EffectType.SPECIAL_SMASH -> {
          val radius = t * 140f
          val alpha = (1f - t).coerceIn(0f, 1f)
          drawCircle(
            color = Color(0xFFFF8F00),
            radius = radius,
            center = targetCenter,
            alpha = alpha * 0.9f,
            style = Stroke(width = 8f)
          )
          drawCircle(
            color = Color(0xFFFF3D00),
            radius = radius * 0.65f,
            center = targetCenter,
            alpha = alpha * 0.8f,
            style = Stroke(width = 12f)
          )
        }

        // Critical Hit (Dual Golden Slash + Spark Rings)
        effect.isCritical -> {
          val slashLen = 160f * t
          val alpha = (1f - t * 0.8f).coerceIn(0f, 1f)
          // Slash 1: Top-Left to Bottom-Right
          drawLine(
            color = Color(0xFFFFD54F),
            start = Offset(targetCenter.x - slashLen, targetCenter.y - slashLen * 0.7f),
            end = Offset(targetCenter.x + slashLen, targetCenter.y + slashLen * 0.7f),
            strokeWidth = 9f,
            cap = StrokeCap.Round,
            alpha = alpha
          )
          // Slash 2: Bottom-Left to Top-Right
          drawLine(
            color = Color(0xFFFF6F00),
            start = Offset(targetCenter.x - slashLen, targetCenter.y + slashLen * 0.7f),
            end = Offset(targetCenter.x + slashLen, targetCenter.y - slashLen * 0.7f),
            strokeWidth = 9f,
            cap = StrokeCap.Round,
            alpha = alpha
          )
          // Center burst
          drawCircle(
            color = Color(0xFFFFF9C4),
            radius = 35f * t,
            center = targetCenter,
            alpha = alpha
          )
        }

        // Normal Hit (Single Sharp Slash + Impact Spark)
        effect.effectType == EffectType.NORMAL_HIT -> {
          val slashLen = 120f * t
          val alpha = (1f - t).coerceIn(0f, 1f)
          drawLine(
            color = Color.White,
            start = Offset(targetCenter.x - slashLen, targetCenter.y - slashLen * 0.5f),
            end = Offset(targetCenter.x + slashLen, targetCenter.y + slashLen * 0.5f),
            strokeWidth = 6f,
            cap = StrokeCap.Round,
            alpha = alpha
          )
          drawLine(
            color = Color(0xFF90CAF9),
            start = Offset(targetCenter.x - slashLen * 0.8f, targetCenter.y - slashLen * 0.4f),
            end = Offset(targetCenter.x + slashLen * 0.8f, targetCenter.y + slashLen * 0.4f),
            strokeWidth = 3f,
            cap = StrokeCap.Round,
            alpha = alpha
          )
          drawCircle(
            color = Color(0xFFE2E8F0),
            radius = 20f * t,
            center = targetCenter,
            alpha = alpha * 0.9f
          )
        }
      }
    }

    // 4. Evade Pop-Up Badge (MISS! 回避成功！)
    if (effect.isEvade) {
      val evadeAlpha = if (t > 0.7f) (1f - t) / 0.3f else 1f
      Surface(
        shape = RoundedCornerShape(10.dp),
        color = Color(0xFF003847).copy(alpha = 0.95f),
        border = BorderStroke(2.dp, Color(0xFF00E5FF)),
        modifier = Modifier
          .offset(y = (-30).dp)
          .scale(if (t < 0.2f) (t / 0.2f) * 1.2f else 1.0f)
          .alpha(evadeAlpha.coerceIn(0f, 1f))
      ) {
        Column(
          horizontalAlignment = Alignment.CenterHorizontally,
          modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
        ) {
          Text(
            text = "💨 MISS!! 回避成功！",
            fontSize = 18.sp,
            fontWeight = FontWeight.Black,
            color = Color(0xFF80D8FF)
          )
          Text(
            text = "ダメージ無効＆必殺技ゲージ+1",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFFE0F7FA)
          )
        }
      }
    }

    // 5. Buff Pop-Up Badge (POWER UP!)
    if (effect.isBuff) {
      val buffAlpha = if (t > 0.7f) (1f - t) / 0.3f else 1f
      Surface(
        shape = RoundedCornerShape(10.dp),
        color = Color(0xFF3E1E05).copy(alpha = 0.95f),
        border = BorderStroke(2.dp, Color(0xFFFFB300)),
        modifier = Modifier
          .offset(y = (-30).dp)
          .scale(if (t < 0.2f) (t / 0.2f) * 1.2f else 1.0f)
          .alpha(buffAlpha.coerceIn(0f, 1f))
      ) {
        Column(
          horizontalAlignment = Alignment.CenterHorizontally,
          modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
        ) {
          Text(
            text = "⚡ POWER UP!! 強化完了！",
            fontSize = 16.sp,
            fontWeight = FontWeight.Black,
            color = Color(0xFFFFD54F)
          )
          Text(
            text = "次の攻撃行動のダメージ +50",
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            color = Color(0xFFFFF9C4)
          )
        }
      }
    }

    // 6. Damage Number & Status Ailment Badge Popup
    if (effect.damage > 0) {
      val popScale = if (t < 0.2f) (t / 0.2f) * 1.3f else if (t < 0.4f) 1.3f - (t - 0.2f) * 0.8f else 1.0f
      val popAlpha = if (t > 0.75f) (1f - t) / 0.25f else 1f
      val yOffset = (-30 - t * 45).dp

      Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
          .offset(y = yOffset)
          .scale(popScale)
          .alpha(popAlpha.coerceIn(0f, 1f))
      ) {
        // Critical Tag
        if (effect.isCritical) {
          Surface(
            shape = RoundedCornerShape(6.dp),
            color = Color(0xFFD84315),
            border = BorderStroke(1.5.dp, Color(0xFFFFD54F)),
            modifier = Modifier.padding(bottom = 3.dp)
          ) {
            Text(
              text = "⚡ CRITICAL HIT! ⚡",
              fontSize = 12.sp,
              fontWeight = FontWeight.Black,
              color = Color(0xFFFFF9C4),
              modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
            )
          }
        }

        // Status Ailment Tag on Special
        if (effect.statusAilmentName.isNotEmpty()) {
          val (badgeBg, badgeBorder, badgeText) = if (effect.statusAilmentName == "出血") {
            Triple(Color(0xFFB71C1C), Color(0xFFFF8A80), "🩸 出血付与！ (毎T -50)")
          } else {
            Triple(Color(0xFF4A148C), Color(0xFFE1BEE7), "🌀 重圧付与！ (速度/攻撃-25)")
          }
          Surface(
            shape = RoundedCornerShape(6.dp),
            color = badgeBg,
            border = BorderStroke(1.5.dp, badgeBorder),
            modifier = Modifier.padding(bottom = 3.dp)
          ) {
            Text(
              text = badgeText,
              fontSize = 11.sp,
              fontWeight = FontWeight.Bold,
              color = Color.White,
              modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
            )
          }
        }

        // Damage Number Surface with sharp outline
        val (numBg, numBorder, numColor, fontSize) = when {
          effect.isUltimate -> Quadruple(
            Color(0xFF3E1205),
            Color(0xFFFFD54F),
            Color(0xFFFFEB3B),
            32.sp
          )
          effect.isCritical -> Quadruple(
            Color(0xFF381206),
            Color(0xFFFF9800),
            Color(0xFFFFD54F),
            28.sp
          )
          effect.effectType == EffectType.SPECIAL_FEATHER -> Quadruple(
            Color(0xFF260D38),
            Color(0xFFEA80FC),
            Color(0xFFF48FB1),
            26.sp
          )
          effect.effectType == EffectType.SPECIAL_SMASH -> Quadruple(
            Color(0xFF2E1906),
            Color(0xFFFFAB91),
            Color(0xFFFFCC80),
            26.sp
          )
          else -> Quadruple(
            Color(0xFF1E2433),
            Color(0xFF64B5F6),
            Color.White,
            22.sp
          )
        }

        Surface(
          shape = RoundedCornerShape(10.dp),
          color = numBg.copy(alpha = 0.95f),
          border = BorderStroke(2.dp, numBorder)
        ) {
          Text(
            text = "-${effect.damage} DMG",
            fontSize = fontSize,
            fontWeight = FontWeight.Black,
            color = numColor,
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 4.dp)
          )
        }
      }
    }
  }
}

private data class Quadruple<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)

@Composable
fun FloatingEffectBanner(
  effect: VisualEffect?,
  modifier: Modifier = Modifier
) {
  AnimatedVisibility(
    visible = effect != null,
    enter = fadeIn(tween(150)) + scaleIn(tween(200)),
    exit = fadeOut(tween(200)),
    modifier = modifier
  ) {
    if (effect == null) return@AnimatedVisibility

    val (bgColors, borderColor, textColor) = when {
      effect.isBuff -> Triple(
        listOf(Color(0xFFFF8F00), Color(0xFFE65100)),
        Color(0xFFFFD54F),
        Color(0xFFFFFDE7)
      )
      effect.isEvade -> Triple(
        listOf(Color(0xFF00B0FF), Color(0xFF006064)),
        Color(0xFF80D8FF),
        Color(0xFFE0F7FA)
      )
      effect.isUltimate -> Triple(
        listOf(Color(0xFFFF3D00), Color(0xFFFFAB00)),
        Color(0xFFFFEA00),
        Color(0xFFFFFDE7)
      )
      effect.isCritical -> Triple(
        listOf(Color(0xFFFF6F00), Color(0xFFBF360C)),
        Color(0xFFFFD54F),
        Color(0xFFFFF9C4)
      )
      effect.effectType == EffectType.BLEED_TICK -> Triple(
        listOf(Color(0xFFB71C1C), Color(0xFF4A0007)),
        Color(0xFFEF5350),
        Color(0xFFFFCDD2)
      )
      effect.effectType == EffectType.SPECIAL_FEATHER -> Triple(
        listOf(SpecialPurple, Color(0xFF4A148C)),
        Color(0xFFEA80FC),
        Color.White
      )
      effect.effectType == EffectType.SPECIAL_SMASH -> Triple(
        listOf(CriticalOrange, Color(0xFFBF360C)),
        Color(0xFFFFAB91),
        Color.White
      )
      else -> Triple(
        listOf(Color(0xFFD32F2F), Color(0xFF880E4F)),
        Color.White.copy(alpha = 0.85f),
        Color.White
      )
    }

    Box(
      modifier = Modifier
        .background(
          brush = Brush.radialGradient(colors = bgColors),
          shape = RoundedCornerShape(12.dp)
        )
        .border(2.dp, borderColor, RoundedCornerShape(12.dp))
        .padding(horizontal = 14.dp, vertical = 6.dp),
      contentAlignment = Alignment.Center
    ) {
      Text(
        text = effect.bannerText,
        fontSize = 13.sp,
        fontWeight = FontWeight.Black,
        color = textColor,
        textAlign = TextAlign.Center,
        maxLines = 1,
        softWrap = false
      )
    }
  }
}

@Composable
fun BattleLogView(
  logs: List<BattleLog>,
  modifier: Modifier = Modifier
) {
  val listState = rememberLazyListState()

  LaunchedEffect(logs.size) {
    if (logs.isNotEmpty()) {
      listState.animateScrollToItem(logs.size - 1)
    }
  }

  Card(
    modifier = modifier.testTag("battle_log_card"),
    shape = RoundedCornerShape(14.dp),
    colors = CardDefaults.cardColors(containerColor = Color(0xFF10131E)),
    border = BorderStroke(1.dp, Color(0xFF282F45))
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(8.dp)
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text(
          text = "📜 戦闘ログ",
          style = MaterialTheme.typography.labelMedium,
          fontSize = 12.sp,
          fontWeight = FontWeight.Bold,
          color = Color(0xFF90CAF9)
        )
        Text(
          text = "計 ${logs.size} 件",
          style = MaterialTheme.typography.labelSmall,
          fontSize = 11.sp,
          color = Color(0xFF94A3B8)
        )
      }

      Spacer(modifier = Modifier.height(4.dp))

      LazyColumn(
        state = listState,
        modifier = Modifier
          .fillMaxSize()
          .testTag("battle_log_list"),
        verticalArrangement = Arrangement.spacedBy(4.dp)
      ) {
        items(logs, key = { it.id }) { log ->
          LogItemRow(log)
        }
      }
    }
  }
}

@Composable
private fun LogItemRow(log: BattleLog) {
  val (bgColor, textColor, icon) = when (log.type) {
    LogType.SYSTEM -> Triple(Color(0xFF1E2433), Color(0xFFB0BEC5), "🔹")
    LogType.PLAYER_ACTION -> Triple(Color(0xFF1B3A5A), Color(0xFF90CAF9), "🗡️")
    LogType.ENEMY_ACTION -> Triple(Color(0xFF4A1A2C), Color(0xFFFFAB91), "💥")
    LogType.CRITICAL_PLAYER -> Triple(Color(0xFF5A1C06), Color(0xFFFFD54F), "⚡💥")
    LogType.CRITICAL_ENEMY -> Triple(Color(0xFF6B0E1D), Color(0xFFFF8A80), "⚠️💥")
    LogType.EVADE_SUCCESS_PLAYER -> Triple(Color(0xFF004D40), Color(0xFF80E8DD), "💨")
    LogType.EVADE_SUCCESS_ENEMY -> Triple(Color(0xFF003847), Color(0xFF80D8FF), "💨")
    LogType.EVADE_FAIL_PLAYER -> Triple(Color(0xFF3E2723), Color(0xFFFFCCBC), "⚠️")
    LogType.EVADE_FAIL_ENEMY -> Triple(Color(0xFF3E2723), Color(0xFFFFCCBC), "⚠️")
    LogType.BUFF_PLAYER -> Triple(Color(0xFF4E342E), Color(0xFFFFCC80), "⚡")
    LogType.BUFF_ENEMY -> Triple(Color(0xFF3E2723), Color(0xFFFFB74D), "⚡")
    LogType.SPECIAL_PLAYER -> Triple(Color(0xFF4A148C).copy(alpha = 0.7f), Color(0xFFEA80FC), "✨")
    LogType.SPECIAL_ENEMY -> Triple(Color(0xFFB71C1C).copy(alpha = 0.7f), Color(0xFFFF8A80), "🔥")
    LogType.ULTIMATE_PLAYER -> Triple(Color(0xFFE65100).copy(alpha = 0.8f), Color(0xFFFFE082), "🌟🔥")
    LogType.ULTIMATE_ENEMY -> Triple(Color(0xFFBF360C).copy(alpha = 0.8f), Color(0xFFFFCC80), "🌟💥")
    LogType.GAUGE_CHANGE -> Triple(Color(0xFF311B92).copy(alpha = 0.65f), Color(0xFFD1C4E9), "⚡")
    LogType.PASSIVE_TRIGGER -> Triple(Color(0xFF004D40).copy(alpha = 0.6f), Color(0xFF80CBC4), "🔮")
    LogType.AILMENT_APPLIED -> Triple(Color(0xFF4A148C).copy(alpha = 0.6f), Color(0xFFCE93D8), "⚠️")
    LogType.AILMENT_DOT -> Triple(Color(0xFF5D101D), Color(0xFFFF8A80), "🩸")
    LogType.AILMENT_EXPIRED -> Triple(Color(0xFF1B3A36), Color(0xFF80CBC4), "✨")
    LogType.VICTORY -> Triple(Color(0xFF1B5E20), Color(0xFFA5D6A7), "👑")
    LogType.DEFEAT -> Triple(Color(0xFFB71C1C), Color(0xFFFFCDD2), "💀")
    else -> Triple(Color(0xFF1A1F2C), Color.White, "▫️")
  }

  Surface(
    shape = RoundedCornerShape(8.dp),
    color = bgColor,
    border = BorderStroke(1.dp, Color(0xFF2B3347)),
    modifier = Modifier.fillMaxWidth()
  ) {
    Row(
      modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Text(
        text = icon,
        fontSize = 11.sp,
        modifier = Modifier.padding(end = 5.dp)
      )
      Text(
        text = log.text,
        style = MaterialTheme.typography.bodySmall,
        fontSize = 12.sp,
        fontWeight = when (log.type) {
          LogType.VICTORY, LogType.DEFEAT, LogType.ULTIMATE_PLAYER, LogType.ULTIMATE_ENEMY, LogType.CRITICAL_PLAYER -> FontWeight.Bold
          else -> FontWeight.Normal
        },
        color = textColor
      )
    }
  }
}

/**
 * Command UI Dock:
 * - Clean 1-line display for all 4 basic commands: 攻撃, 回避, 強化, 特殊
 * - Perfectly centered labels and uniform button dimensions
 * - Distinct, prominent 必殺技 command that never wraps awkwardly
 * - Highly readable, responsive, and sharp on all screen aspect ratios
 */
@Composable
fun ActionDock(
  player: BattleFighter,
  enemy: BattleFighter,
  isEnabled: Boolean,
  onAction: (BattleAction) -> Unit,
  modifier: Modifier = Modifier
) {
  val estimatedAttackDamage = maxOf(15, player.effectiveAttack - enemy.effectiveDefense) + (if (player.isBuffed) 50 else 0)
  val isSpecialReady = player.isSpecialReady
  val isUltimateReady = player.isUltimateReady

  Card(
    modifier = modifier.testTag("action_dock_card"),
    shape = RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp),
    colors = CardDefaults.cardColors(containerColor = Color(0xFF0F121C)),
    border = BorderStroke(1.dp, Color(0xFF2C354D))
  ) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .padding(horizontal = 8.dp, vertical = 7.dp)
    ) {
      // Header: Command Prompt + Buff Status + Ultimate Gauge Status
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Text(
            text = "🎯 コマンド選択",
            fontSize = 13.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White
          )
          if (player.isBuffed) {
            Spacer(modifier = Modifier.width(6.dp))
            Surface(
              shape = RoundedCornerShape(4.dp),
              color = Color(0xFFFF8F00).copy(alpha = 0.30f),
              border = BorderStroke(1.dp, Color(0xFFFFB300))
            ) {
              Text(
                text = "⚡【強化中】攻撃+50",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                color = Color(0xFFFFD54F),
                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
              )
            }
          }
        }

        // Ultimate Gauge indicator (0/3, 1/3, 2/3, 3/3)
        Surface(
          shape = RoundedCornerShape(6.dp),
          color = if (isUltimateReady) Color(0xFFFF6F00).copy(alpha = 0.40f) else Color(0xFF1E2332),
          border = BorderStroke(
            1.dp,
            if (isUltimateReady) Color(0xFFFFD54F) else Color(0xFF3E4C66)
          )
        ) {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
          ) {
            Text(
              text = "必殺技ゲージ: ",
              fontSize = 11.sp,
              color = Color(0xFFB0BEC5)
            )
            Text(
              text = "${player.ultimateGauge}/3",
              fontSize = 11.sp,
              fontWeight = FontWeight.ExtraBold,
              color = if (isUltimateReady) Color(0xFFFFD54F) else Color.White
            )
            if (isUltimateReady) {
              Spacer(modifier = Modifier.width(2.dp))
              Text(
                text = " [発動可!]",
                fontSize = 10.sp,
                fontWeight = FontWeight.ExtraBold,
                color = Color(0xFFFFE082)
              )
            }
          }
        }
      }

      Spacer(modifier = Modifier.height(6.dp))

      // Row 1: The 4 Normal Combat Commands (攻撃, 回避, 強化, 特殊)
      // Exactly 1 line for command titles, perfectly centered, uniform width/height/padding
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(5.dp)
      ) {
        // 1. 攻撃 Button
        Button(
          onClick = { onAction(BattleAction.ATTACK) },
          enabled = isEnabled,
          modifier = Modifier
            .weight(1f)
            .height(56.dp)
            .testTag("action_attack_button"),
          contentPadding = PaddingValues(horizontal = 2.dp, vertical = 4.dp),
          shape = RoundedCornerShape(10.dp),
          colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFF1E3A5F),
            contentColor = Color.White,
            disabledContainerColor = Color(0xFF1A222F),
            disabledContentColor = Color(0xFF5A6678)
          ),
          border = BorderStroke(1.dp, Color(0xFF3B6496))
        ) {
          Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
          ) {
            Text(
              text = "攻撃",
              fontSize = 14.sp,
              fontWeight = FontWeight.ExtraBold,
              maxLines = 1,
              softWrap = false,
              textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
              text = "約${estimatedAttackDamage}ダメ",
              fontSize = 10.sp,
              fontWeight = FontWeight.Bold,
              color = Color(0xFF90CAF9),
              maxLines = 1,
              softWrap = false,
              textAlign = TextAlign.Center
            )
          }
        }

        // 2. 回避 Button
        val evadeRateText = "${(player.character.evasionRate * 100).toInt()}%"
        Button(
          onClick = { onAction(BattleAction.EVADE) },
          enabled = isEnabled,
          modifier = Modifier
            .weight(1f)
            .height(56.dp)
            .testTag("action_evade_button"),
          contentPadding = PaddingValues(horizontal = 2.dp, vertical = 4.dp),
          shape = RoundedCornerShape(10.dp),
          colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFF0277BD),
            contentColor = Color.White,
            disabledContainerColor = Color(0xFF12232E),
            disabledContentColor = Color(0xFF5A6678)
          ),
          border = BorderStroke(1.dp, Color(0xFF039BE5))
        ) {
          Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
          ) {
            Text(
              text = "回避",
              fontSize = 14.sp,
              fontWeight = FontWeight.ExtraBold,
              maxLines = 1,
              softWrap = false,
              textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
              text = "率:$evadeRateText",
              fontSize = 10.sp,
              fontWeight = FontWeight.Bold,
              color = Color(0xFF80D8FF),
              maxLines = 1,
              softWrap = false,
              textAlign = TextAlign.Center
            )
          }
        }

        // 3. 強化 Button
        Button(
          onClick = { onAction(BattleAction.BUFF) },
          enabled = isEnabled,
          modifier = Modifier
            .weight(1f)
            .height(56.dp)
            .testTag("action_buff_button"),
          contentPadding = PaddingValues(horizontal = 2.dp, vertical = 4.dp),
          shape = RoundedCornerShape(10.dp),
          colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFFC0392B),
            contentColor = Color.White,
            disabledContainerColor = Color(0xFF261917),
            disabledContentColor = Color(0xFF6E5652)
          ),
          border = BorderStroke(1.dp, if (player.isBuffed) Color(0xFFFFB300) else Color(0xFFE74C3C))
        ) {
          Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
          ) {
            Text(
              text = "強化",
              fontSize = 14.sp,
              fontWeight = FontWeight.ExtraBold,
              maxLines = 1,
              softWrap = false,
              textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
              text = if (player.isBuffed) "付与中" else "攻+50",
              fontSize = 10.sp,
              fontWeight = FontWeight.Bold,
              color = Color(0xFFFFCC80),
              maxLines = 1,
              softWrap = false,
              textAlign = TextAlign.Center
            )
          }
        }

        // 4. 特殊 Button
        Button(
          onClick = { onAction(BattleAction.SPECIAL) },
          enabled = isEnabled && isSpecialReady,
          modifier = Modifier
            .weight(1f)
            .height(56.dp)
            .testTag("action_special_button"),
          contentPadding = PaddingValues(horizontal = 2.dp, vertical = 4.dp),
          shape = RoundedCornerShape(10.dp),
          colors = ButtonDefaults.buttonColors(
            containerColor = Color(0xFF7B1FA2),
            contentColor = Color.White,
            disabledContainerColor = Color(0xFF281C30),
            disabledContentColor = Color(0xFF7E7288)
          ),
          border = BorderStroke(1.dp, if (isSpecialReady && isEnabled) Color(0xFFEA80FC) else Color(0xFF4A2A57))
        ) {
          val specialDamagePreview = player.character.specialSkillDamage + (if (player.isBuffed) 50 else 0)
          Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
          ) {
            Text(
              text = "特殊",
              fontSize = 14.sp,
              fontWeight = FontWeight.ExtraBold,
              maxLines = 1,
              softWrap = false,
              textAlign = TextAlign.Center
            )
            Spacer(modifier = Modifier.height(2.dp))
            Text(
              text = if (isSpecialReady) "${specialDamagePreview}ダメ" else "CD:${player.specialCooldownRemaining}T",
              fontSize = 10.sp,
              fontWeight = FontWeight.Bold,
              color = if (isSpecialReady) Color(0xFFFFE082) else Color(0xFF94A3B8),
              maxLines = 1,
              softWrap = false,
              textAlign = TextAlign.Center
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(6.dp))

      // Row 2: Special Command Section (5. 必殺技)
      // Clean 1-line layout, centered and prominent, immune to awkward wrapping
      val ultimateDamagePreview = player.character.ultimateSkillDamage + (if (player.isBuffed) 50 else 0)
      Button(
        onClick = { onAction(BattleAction.ULTIMATE) },
        enabled = isEnabled && isUltimateReady,
        modifier = Modifier
          .fillMaxWidth()
          .height(50.dp)
          .testTag("action_ultimate_button"),
        contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(
          containerColor = if (isUltimateReady) Color(0xFFD84315) else Color(0xFF251A1C),
          contentColor = Color.White,
          disabledContainerColor = Color(0xFF1E1719),
          disabledContentColor = Color(0xFF6B575A)
        ),
        border = BorderStroke(
          1.5.dp,
          if (isUltimateReady && isEnabled) Color(0xFFFFD54F) else Color(0xFF3E2D30)
        )
      ) {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
              imageVector = Icons.Default.Whatshot,
              contentDescription = null,
              tint = if (isUltimateReady) Color(0xFFFFD54F) else Color(0xFF8D6E63),
              modifier = Modifier.size(18.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
              text = "必殺技",
              fontWeight = FontWeight.Black,
              fontSize = 14.sp,
              color = Color.White,
              maxLines = 1,
              softWrap = false
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
              text = "【${player.character.ultimateSkillName}】",
              fontWeight = FontWeight.Bold,
              fontSize = 12.sp,
              color = if (isUltimateReady) Color(0xFFFFE082) else Color(0xFFB0BEC5),
              maxLines = 1,
              softWrap = false
            )
          }

          Surface(
            shape = RoundedCornerShape(6.dp),
            color = if (isUltimateReady) Color(0xFFFFD54F) else Color(0xFF2B2124),
            border = BorderStroke(1.dp, if (isUltimateReady) Color(0xFFFFE082) else Color(0xFF4A373A))
          ) {
            Text(
              text = if (isUltimateReady) "${ultimateDamagePreview}ダメ [発動可能!]" else "ゲージ ${player.ultimateGauge}/3",
              fontSize = 11.sp,
              fontWeight = FontWeight.ExtraBold,
              color = if (isUltimateReady) Color(0xFF210E04) else Color(0xFFB0BEC5),
              maxLines = 1,
              softWrap = false,
              modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp)
            )
          }
        }
      }
    }
  }
}
