import SwiftUI

// MARK: - Design Token Colors
// Matches packages/design-tokens/tokens.json

extension Color {
    // Semantic adaptive colors (light/dark via Asset Catalog or adaptive init)
    static let appBackground      = Color("AppBackground",      bundle: .main)
    static let appSurface         = Color("AppSurface",         bundle: .main)
    static let appSurfaceElevated = Color("AppSurfaceElevated", bundle: .main)
    static let appText            = Color("AppText",            bundle: .main)
    static let appTextSecondary   = Color("AppTextSecondary",   bundle: .main)
    static let appBorder          = Color("AppBorder",          bundle: .main)

    // Accent
    static let accent         = Color(hex: "#A3FF12")
    static let accentFG       = Color(hex: "#0B0C10")
    static let accentMuted    = Color(hex: "#A3FF12").opacity(0.35)

    // System states
    static let systemSuccess  = Color(hex: "#22C55E")
    static let systemWarning  = Color(hex: "#F59E0B")
    static let systemDanger   = Color(hex: "#EF4444")

    // MARK: - Hex init
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: .init(charactersIn: "#"))
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b, a: Double
        switch hex.count {
        case 6:
            (r, g, b, a) = (Double((int >> 16) & 0xFF)/255,
                            Double((int >> 8)  & 0xFF)/255,
                            Double( int        & 0xFF)/255, 1)
        case 8:
            (r, g, b, a) = (Double((int >> 24) & 0xFF)/255,
                            Double((int >> 16) & 0xFF)/255,
                            Double((int >> 8)  & 0xFF)/255,
                            Double( int        & 0xFF)/255)
        default:
            (r, g, b, a) = (0, 0, 0, 1)
        }
        self.init(.sRGB, red: r, green: g, blue: b, opacity: a)
    }
}

// MARK: - Fallbacks (if Asset Catalog colors not set up yet)
extension Color {
    static func adaptive(light: String, dark: String) -> Color {
        Color(UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(Color(hex: dark))
                : UIColor(Color(hex: light))
        })
    }

    static let appBackgroundFallback      = adaptive(light: "#F7F7FA", dark: "#0B0C10")
    static let appSurfaceFallback         = adaptive(light: "#FFFFFF", dark: "#12131A")
    static let appSurfaceElevatedFallback = adaptive(light: "#FFFFFF", dark: "#1C1D26")
    static let appTextFallback            = adaptive(light: "#0B0C10", dark: "#F4F5F7")
    static let appTextSecondaryFallback   = adaptive(light: "#6B7280", dark: "#9CA3AF")
    static let appBorderFallback          = adaptive(light: "#E5E7EB", dark: "#23242E")
}
