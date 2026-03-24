import SwiftUI

// MARK: - FitCoach Design Tokens
// Canonical values from packages/design-tokens — always dark, no light mode.

extension Color {
    // Primary brand colors
    static let appAccent          = Color(hex: "#A3FF12")
    static let appBackground      = Color(hex: "#0B0C10")
    static let appSurface         = Color(hex: "#12131A")
    static let appSurfaceElevated = Color(hex: "#1C1D26")
    static let appTextPrimary     = Color(hex: "#F0F0F0")
    static let appTextSecondary   = Color(hex: "#F0F0F0").opacity(0.55)
    static let appTextInverse     = Color(hex: "#0B0C10")
    static let appBorder          = Color(white: 1, opacity: 0.08)

    // Semantic aliases used throughout views
    static let accent             = Color(hex: "#A3FF12")
    static let accentFG           = Color(hex: "#0B0C10")
    static let accentMuted        = Color(hex: "#A3FF12").opacity(0.15)

    // System states
    static let systemSuccess      = Color(hex: "#22C55E")
    static let systemWarning      = Color(hex: "#F59E0B")
    static let systemDanger       = Color(hex: "#EF4444")

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
