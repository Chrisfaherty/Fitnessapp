package com.fitcoach.app.designtokens

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// ── Colour tokens ──────────────────────────────────────────────────────────────

object FitCoachColors {
  // Backgrounds
  val Background      = Color(0xFF090A0C)
  val Surface         = Color(0xFF111318)
  val SurfaceElevated = Color(0xFF181B22)

  // Borders
  val Border          = Color(0x14FFFFFF)   // rgba(255,255,255,0.08)
  val BorderStrong    = Color(0x24FFFFFF)   // rgba(255,255,255,0.14)
  val BorderHover     = Color(0x2DFFFFFF)   // rgba(255,255,255,0.18)

  // Text
  val TextPrimary     = Color(0xFFF5F7FA)
  val TextSecondary   = Color(0xADF5F7FA)   // 0.68 opacity
  val TextTertiary    = Color(0x6BF5F7FA)   // 0.42 opacity
  val TextDisabled    = Color(0x42F5F7FA)   // 0.26 opacity

  // Accent
  val Accent          = Color(0xFFA3FF12)
  val AccentMuted     = Color(0x24A3FF12)   // 0.14 opacity
  val AccentStrong    = Color(0xFFB7FF45)
  val AccentForeground = Color(0xFF090A0C)

  // Status
  val Success         = Color(0xFF30D158)
  val SuccessMuted    = Color(0x2930D158)   // 0.16 opacity
  val Warning         = Color(0xFFFFB020)
  val WarningMuted    = Color(0x29FFB020)
  val Danger          = Color(0xFFFF453A)
  val DangerMuted     = Color(0x29FF453A)
  val Indigo          = Color(0xFF4F6EF7)
  val IndigoMuted     = Color(0x294F6EF7)
}

// ── Spacing ────────────────────────────────────────────────────────────────────

object FitCoachSpacing {
  val xs:   Dp = 4.dp
  val sm:   Dp = 8.dp
  val md:   Dp = 12.dp
  val base: Dp = 16.dp
  val lg:   Dp = 20.dp
  val xl:   Dp = 24.dp
  val xl2:  Dp = 32.dp
  val xl3:  Dp = 40.dp
  val xl4:  Dp = 48.dp
  val xl5:  Dp = 64.dp
}

// ── Corner radius ──────────────────────────────────────────────────────────────

object FitCoachRadius {
  val sm:   Dp = 10.dp
  val md:   Dp = 14.dp
  val lg:   Dp = 18.dp
  val xl:   Dp = 20.dp
  val xl2:  Dp = 24.dp
}

// ── Typography ─────────────────────────────────────────────────────────────────
// Syne (display) + DM Sans (body) — both must be added to res/font/

// Note: register Syne and DM Sans in your font resources.
// Fallback to default if not registered yet.

// ── Material 3 theme ──────────────────────────────────────────────────────────

private val FitCoachDarkColorScheme = darkColorScheme(
  background       = FitCoachColors.Background,
  surface          = FitCoachColors.Surface,
  surfaceVariant   = FitCoachColors.SurfaceElevated,
  primary          = FitCoachColors.Accent,
  onPrimary        = FitCoachColors.AccentForeground,
  secondary        = FitCoachColors.Indigo,
  onSecondary      = Color.White,
  error            = FitCoachColors.Danger,
  onError          = Color.White,
  onBackground     = FitCoachColors.TextPrimary,
  onSurface        = FitCoachColors.TextPrimary,
  onSurfaceVariant = FitCoachColors.TextSecondary,
  outline          = FitCoachColors.Border,
  outlineVariant   = FitCoachColors.BorderStrong,
)

@Composable
fun FitCoachTheme(content: @Composable () -> Unit) {
  MaterialTheme(
    colorScheme = FitCoachDarkColorScheme,
    content = content,
  )
}
