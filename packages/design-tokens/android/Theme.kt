// Auto-generated from design-tokens/tokens.json
// Do not edit directly — run `pnpm tokens:generate`
package com.fitcoach.app.designtokens

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// ============================================================
// FitCoach brand tokens — always dark, no light mode
// ============================================================
object FitCoachColors {
    // Accent / brand
    val Accent            = Color(0xFFA3FF12)
    val AccentForeground  = Color(0xFF0B0C10)
    val AccentMuted       = Color(0x26A3FF12)
    val AccentHover       = Color(0xFF8EE60F)

    // Dark palette (only palette — app is always dark)
    val Background        = Color(0xFF0B0C10)
    val Surface           = Color(0xFF12131A)
    val SurfaceElevated   = Color(0xFF1C1D26)
    val TextPrimary       = Color(0xFFF0F0F0)
    val TextSecondary     = Color(0x8CF0F0F0)  // 55% opacity
    val TextInverse       = Color(0xFF0B0C10)
    val Border            = Color(0x14FFFFFF)  // 8% white

    // System states
    val Success           = Color(0xFF22C55E)
    val Warning           = Color(0xFFF59E0B)
    val Danger            = Color(0xFFEF4444)
}

// ============================================================
// Color scheme — dark only
// ============================================================
private val FitCoachColorScheme = darkColorScheme(
    primary          = FitCoachColors.Accent,
    onPrimary        = FitCoachColors.AccentForeground,
    primaryContainer = FitCoachColors.AccentMuted,
    background       = FitCoachColors.Background,
    surface          = FitCoachColors.Surface,
    onBackground     = FitCoachColors.TextPrimary,
    onSurface        = FitCoachColors.TextPrimary,
    surfaceVariant   = FitCoachColors.SurfaceElevated,
    onSurfaceVariant = FitCoachColors.TextSecondary,
    outline          = FitCoachColors.Border,
    error            = FitCoachColors.Danger,
    onError          = Color.White,
)

// ============================================================
// App theme composable
// ============================================================
@Composable
fun FitCoachTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = FitCoachColorScheme,
        content = content
    )
}
