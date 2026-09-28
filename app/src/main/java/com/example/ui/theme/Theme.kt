package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val GameDarkColorScheme = darkColorScheme(
  primary = PrimaryDark,
  onPrimary = Color(0xFF0A1828),
  primaryContainer = Color(0xFF1E3A5F),
  onPrimaryContainer = Color(0xFFD1E4FF),
  secondary = SecondaryDark,
  onSecondary = Color(0xFF2C103B),
  secondaryContainer = Color(0xFF4A285E),
  onSecondaryContainer = Color(0xFFF2DAFF),
  tertiary = TertiaryDark,
  onTertiary = Color(0xFF382400),
  background = ArenaDarkBg,
  onBackground = OnDark,
  surface = ArenaSurface,
  onSurface = OnDark,
  surfaceVariant = ArenaSurfaceVariant,
  onSurfaceVariant = OnDarkMuted,
  outline = ArenaBorder,
)

@Composable
fun MyApplicationTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  dynamicColor: Boolean = false, // Always preserve the immersive battle theme
  content: @Composable () -> Unit,
) {
  MaterialTheme(
    colorScheme = GameDarkColorScheme,
    typography = Typography,
    content = content
  )
}
