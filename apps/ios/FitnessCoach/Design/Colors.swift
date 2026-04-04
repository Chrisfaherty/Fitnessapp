import SwiftUI

// MARK: - FitCoach Design Tokens

extension Color {

  // MARK: Backgrounds
  static let appBackground      = Color(hex: "#090A0C")
  static let appSurface         = Color(hex: "#111318")
  static let appSurfaceElevated = Color(hex: "#181B22")
  static let appSurfaceOverlay  = Color(hex: "#181B22").opacity(0.88)

  // MARK: Borders
  static let appBorder          = Color.white.opacity(0.08)
  static let appBorderStrong    = Color.white.opacity(0.14)
  static let appBorderHover     = Color.white.opacity(0.18)

  // MARK: Text
  static let appTextPrimary     = Color(hex: "#F5F7FA")
  static let appTextSecondary   = Color(hex: "#F5F7FA").opacity(0.68)
  static let appTextTertiary    = Color(hex: "#F5F7FA").opacity(0.42)
  static let appTextDisabled    = Color(hex: "#F5F7FA").opacity(0.26)

  // MARK: Accent
  static let appAccent          = Color(hex: "#A3FF12")
  static let appAccentMuted     = Color(hex: "#A3FF12").opacity(0.14)
  static let appAccentStrong    = Color(hex: "#B7FF45")
  static let appAccentForeground = Color(hex: "#090A0C")

  // MARK: Status
  static let appSuccess         = Color(hex: "#30D158")
  static let appSuccessMuted    = Color(hex: "#30D158").opacity(0.16)
  static let appWarning         = Color(hex: "#FFB020")
  static let appWarningMuted    = Color(hex: "#FFB020").opacity(0.16)
  static let appDanger          = Color(hex: "#FF453A")
  static let appDangerMuted     = Color(hex: "#FF453A").opacity(0.16)
  static let appIndigo          = Color(hex: "#4F6EF7")
  static let appIndigoMuted     = Color(hex: "#4F6EF7").opacity(0.16)
}

// MARK: - Spacing

enum FitCoachSpacing {
  static let xs:  CGFloat = 4
  static let sm:  CGFloat = 8
  static let md:  CGFloat = 12
  static let base: CGFloat = 16
  static let lg:  CGFloat = 20
  static let xl:  CGFloat = 24
  static let xl2: CGFloat = 32
  static let xl3: CGFloat = 40
  static let xl4: CGFloat = 48
  static let xl5: CGFloat = 64
}

// MARK: - Corner Radius

enum FitCoachRadius {
  static let sm:   CGFloat = 10
  static let md:   CGFloat = 14
  static let lg:   CGFloat = 18
  static let xl:   CGFloat = 20
  static let xl2:  CGFloat = 24
  static let pill: CGFloat = 999
}

// MARK: - Typography

enum FitCoachTextStyle {
  // Syne font (display)
  static func display() -> Font { .custom("Syne-Bold", size: 48) }
  static func h1() -> Font      { .custom("Syne-Bold", size: 32) }
  static func h2() -> Font      { .custom("Syne-SemiBold", size: 24) }
  static func h3() -> Font      { .custom("Syne-SemiBold", size: 20) }
  static func h4() -> Font      { .custom("Syne-SemiBold", size: 16) }

  // DM Sans font (body)
  static func bodyLg() -> Font  { .custom("DMSans-Medium", size: 16) }
  static func body() -> Font    { .custom("DMSans-Medium", size: 14) }
  static func bodySm() -> Font  { .custom("DMSans-Medium", size: 13) }
  static func caption() -> Font { .custom("DMSans-Medium", size: 12) }
  static func label() -> Font   { .custom("DMSans-Bold", size: 11) }
}

// MARK: - Hex Color Extension

extension Color {
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
}
