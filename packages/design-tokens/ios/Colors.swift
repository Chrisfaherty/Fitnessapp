// Auto-generated from design-tokens/tokens.json
// Do not edit directly — run `pnpm tokens:generate`

import SwiftUI

public extension Color {
    // MARK: - Semantic (adapts to light/dark mode)
    static let appBackground      = Color("AppBackground")
    static let appSurface         = Color("AppSurface")
    static let appSurfaceElevated = Color("AppSurfaceElevated")
    static let appText            = Color("AppText")
    static let appTextSecondary   = Color("AppTextSecondary")
    static let appMuted           = Color("AppMuted")
    static let appBorder          = Color("AppBorder")

    // MARK: - Accent
    static let accent         = Color("Accent")           // #A3FF12
    static let accentFG       = Color("AccentForeground") // #0B0C10
    static let accentMuted    = Color("AccentMuted")

    // MARK: - System states
    static let systemSuccess  = Color("SystemSuccess")
    static let systemWarning  = Color("SystemWarning")
    static let systemDanger   = Color("SystemDanger")
}

// MARK: - Raw hex values (for cases where Asset Catalog colors aren't applicable)
public extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }

    // Hard-coded accent for code paths that need it at compile time
    static let accentHex = Color(hex: "#A3FF12")
}
