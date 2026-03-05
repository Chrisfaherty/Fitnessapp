# Design System

## Design Tokens

Source of truth: `packages/design-tokens/tokens.json`

Outputs:
- **Tailwind:** `packages/design-tokens/tailwind.config.ts`
- **iOS Swift:** `packages/design-tokens/ios/Colors.swift`
- **Android Compose:** `packages/design-tokens/android/Theme.kt`

## Color Palette

| Token            | Light             | Dark              | Usage                     |
|------------------|-------------------|-------------------|---------------------------|
| `accent`         | `#A3FF12`         | `#A3FF12`         | Primary CTAs, highlights  |
| `accent-fg`      | `#0B0C10`         | `#0B0C10`         | Text on accent surfaces   |
| `background`     | `#F7F7FA`         | `#0B0C10`         | Page background           |
| `surface`        | `#FFFFFF`         | `#12131A`         | Cards, modals             |
| `surface-alt`    | `#EDEDF0`         | `#1C1D26`         | Chips, badges             |
| `foreground`     | `#0B0C10`         | `#F7F7FA`         | Primary text              |
| `border`         | `#D9D9E0`         | `#2A2B36`         | Dividers, outlines        |
| `success`        | `#22C55E`         | `#22C55E`         | Completion states         |
| `warning`        | `#F59E0B`         | `#F59E0B`         | Caution states            |
| `danger`         | `#EF4444`         | `#EF4444`         | Errors, destructive       |

## Typography

All type styles defined as Tailwind `@layer components` classes:

| Class              | Size    | Weight  | Usage                      |
|--------------------|---------|---------|----------------------------|
| `.text-display`    | 2rem    | 700     | Page titles                |
| `.text-heading`    | 1.25rem | 600     | Section headings           |
| `.text-subheadline`| 1rem    | 500     | Sub-section labels         |
| `.text-body`       | 0.9375rem | 400   | Body copy                  |
| `.text-caption`    | 0.75rem | 400     | Supporting text, timestamps|
| `.text-label`      | 0.875rem| 500     | Form labels, nav items     |

## Component Classes (Tailwind)

### Cards
```css
.card        /* rounded-xl border bg-surface p-5 shadow-sm */
.card-compact /* rounded-lg border bg-surface p-4 shadow-sm */
```

### Buttons
```css
.btn          /* base: flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition */
.btn-primary  /* bg-accent text-accent-fg */
.btn-secondary /* bg-surface-alt text-foreground border */
.btn-ghost    /* bg-transparent text-foreground hover:bg-surface-alt */
.btn-danger   /* bg-danger text-white */
.btn-icon     /* p-2 rounded-lg (square icon button) */
```

### Inputs
```css
.input        /* rounded-lg border bg-surface px-3 py-2 text-body focus:ring-accent */
.input-error  /* .input + border-danger focus:ring-danger */
```

### Badges
```css
.badge        /* inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium */
```

## Platform Implementations

### iOS
```swift
// packages/design-tokens/ios/Colors.swift
extension Color {
    static let accent    = Color(hex: "#A3FF12")
    static let background = Color(hex: "#F7F7FA")   // light
    // etc.
}

// Usage
.foregroundStyle(FitnessColors.accent)
.background(FitnessColors.accent)
```

### Android
```kotlin
// packages/design-tokens/android/Theme.kt
object FitnessColors {
    val Accent         = Color(0xFFA3FF12)
    val AccentForeground = Color(0xFF0B0C10)
    val Background     = Color(0xFFF7F7FA)
    // etc.
}

@Composable
fun FitnessAppTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit)
```

## Dark Mode

All three platforms auto-switch based on system preference:

- **Web:** CSS custom properties in `:root` (light) and `.dark` (activated by `class="dark"` on `<html>`)
- **iOS:** `@Environment(\.colorScheme)` or Color assets with light/dark variants
- **Android:** `isSystemInDarkTheme()` in `FitnessAppTheme` composable, with separate `DarkColorScheme`

## Accent Color Usage Guidelines

- ✅ Primary action buttons
- ✅ Active navigation indicators
- ✅ Completed set checkmarks
- ✅ Rest timer progress arc
- ✅ Primary muscle highlights on SVG maps
- ✅ Metric highlights in dashboard
- ❌ Do not use on text larger than body size (contrast on white may fail WCAG AA)
- ❌ Do not use as background behind white text (use `accent-fg` = `#0B0C10` instead)
