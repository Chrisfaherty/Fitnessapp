// Auto-generated from design-tokens/tokens.json
// Do not edit directly — run `pnpm tokens:generate`
package com.fitnessapp.designtokens

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import android.os.Build

// ============================================================
// Brand tokens
// ============================================================
object FitnessColors {
    // Accent / brand
    val Accent            = Color(0xFFA3FF12)
    val AccentForeground  = Color(0xFF0B0C10)
    val AccentMuted       = Color(0x59A3FF12)
    val AccentHover       = Color(0xFF8EE60F)

    // Light
    val BackgroundLight        = Color(0xFFF7F7FA)
    val SurfaceLight           = Color(0xFFFFFFFF)
    val SurfaceElevatedLight   = Color(0xFFFFFFFF)
    val TextLight              = Color(0xFF0B0C10)
    val TextSecondaryLight     = Color(0xFF6B7280)
    val BorderLight            = Color(0xFFE5E7EB)

    // Dark
    val BackgroundDark         = Color(0xFF0B0C10)
    val SurfaceDark            = Color(0xFF12131A)
    val SurfaceElevatedDark    = Color(0xFF1C1D26)
    val TextDark               = Color(0xFFF4F5F7)
    val TextSecondaryDark      = Color(0xFF9CA3AF)
    val BorderDark             = Color(0xFF23242E)

    // System states
    val Success                = Color(0xFF22C55E)
    val Warning                = Color(0xFFF59E0B)
    val Danger                 = Color(0xFFEF4444)
}

// ============================================================
// Color schemes
// ============================================================
private val LightColorScheme = lightColorScheme(
    primary          = FitnessColors.Accent,
    onPrimary        = FitnessColors.AccentForeground,
    primaryContainer = FitnessColors.AccentMuted,
    background       = FitnessColors.BackgroundLight,
    surface          = FitnessColors.SurfaceLight,
    onBackground     = FitnessColors.TextLight,
    onSurface        = FitnessColors.TextLight,
    surfaceVariant   = FitnessColors.SurfaceElevatedLight,
    onSurfaceVariant = FitnessColors.TextSecondaryLight,
    outline          = FitnessColors.BorderLight,
    error            = FitnessColors.Danger,
    onError          = Color.White,
)

private val DarkColorScheme = darkColorScheme(
    primary          = FitnessColors.Accent,
    onPrimary        = FitnessColors.AccentForeground,
    primaryContainer = FitnessColors.AccentMuted,
    background       = FitnessColors.BackgroundDark,
    surface          = FitnessColors.SurfaceDark,
    onBackground     = FitnessColors.TextDark,
    onSurface        = FitnessColors.TextDark,
    surfaceVariant   = FitnessColors.SurfaceElevatedDark,
    onSurfaceVariant = FitnessColors.TextSecondaryDark,
    outline          = FitnessColors.BorderDark,
    error            = FitnessColors.Danger,
    onError          = Color.White,
)

// ============================================================
// App theme composable
// ============================================================
@Composable
fun FitnessAppTheme(
    darkTheme: Boolean = false,
    dynamicColor: Boolean = true,
    content: @Composable () -> Unit
) {
    val colorScheme = when {
        dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
            val context = LocalContext.current
            if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
        }
        darkTheme -> DarkColorScheme
        else      -> LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        content = content
    )
}
