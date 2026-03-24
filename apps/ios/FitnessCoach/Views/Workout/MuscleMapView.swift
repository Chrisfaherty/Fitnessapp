import SwiftUI
import WebKit

// MARK: - MuscleMapSide

enum MuscleMapSide {
    case front
    case back
}

// MARK: - MuscleMapView

struct MuscleMapView: View {
    let highlightedMuscles: [String]
    var side: MuscleMapSide = .front

    @State private var activeSide: MuscleMapSide
    @State private var webViewRef: WKWebView?

    init(highlightedMuscles: [String], side: MuscleMapSide = .front) {
        self.highlightedMuscles = highlightedMuscles
        self.side = side
        _activeSide = State(initialValue: side)
    }

    var body: some View {
        VStack(spacing: 0) {
            MuscleMapWebView(
                side: activeSide,
                highlightedMuscles: highlightedMuscles,
                onWebViewCreated: { wv in webViewRef = wv }
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Color(hex: "#0B0C10"))

            // Front / Back toggle
            HStack(spacing: 0) {
                toggleButton(label: "Front", targetSide: .front)
                toggleButton(label: "Back",  targetSide: .back)
            }
            .padding(.horizontal, 24)
            .padding(.vertical, 12)
            .background(Color(hex: "#12131A"))
        }
        .background(Color(hex: "#0B0C10"))
    }

    @ViewBuilder
    private func toggleButton(label: String, targetSide: MuscleMapSide) -> some View {
        let isActive = activeSide == targetSide
        Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                activeSide = targetSide
            }
        } label: {
            Text(label)
                .font(.subheadline.weight(.semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(isActive ? Color(hex: "#A3FF12") : Color.clear)
                .foregroundColor(isActive ? Color(hex: "#0B0C10") : Color(hex: "#F0F0F0").opacity(0.6))
                .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .animation(.easeInOut(duration: 0.2), value: activeSide)
    }
}

// MARK: - WKWebView UIViewRepresentable

struct MuscleMapWebView: UIViewRepresentable {
    let side: MuscleMapSide
    let highlightedMuscles: [String]
    var onWebViewCreated: ((WKWebView) -> Void)?

    // Colour constants
    private let accentHex   = "#A3FF12"
    private let defaultHex  = "#1C1D26"
    private let bgHex       = "#0B0C10"
    private let labelHex    = "#F0F0F0"

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.043, green: 0.047, blue: 0.063, alpha: 1)
        webView.scrollView.isScrollEnabled = false
        webView.scrollView.bounces = false
        onWebViewCreated?(webView)
        webView.loadHTMLString(buildHTML(side: side, highlighted: highlightedMuscles), baseURL: nil)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        // Re-load when side changes; re-highlight when muscles change
        webView.loadHTMLString(buildHTML(side: side, highlighted: highlightedMuscles), baseURL: nil)
    }

    // MARK: - HTML builder

    private func buildHTML(side: MuscleMapSide, highlighted: [String]) -> String {
        let svg = side == .front ? frontSVG() : backSVG()
        let highlightedJSON = highlighted
            .map { "\"\($0.lowercased())\"" }
            .joined(separator: ",")

        return """
        <!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          html, body {
            width: 100%; height: 100%;
            background: \(bgHex);
            display: flex; align-items: center; justify-content: center;
            overflow: hidden;
          }
          svg { width: 90%; max-height: 90vh; }
          .muscle-group { transition: fill 0.25s ease; cursor: default; }
          .muscle-label {
            font-family: -apple-system, sans-serif;
            font-size: 9px;
            fill: \(labelHex);
            pointer-events: none;
            user-select: none;
          }
        </style>
        </head>
        <body>
        \(svg)
        <script>
        (function() {
          var highlighted = [\(highlightedJSON)];
          var accent  = "\(accentHex)";
          var def     = "\(defaultHex)";

          document.querySelectorAll(".muscle-group").forEach(function(el) {
            var muscle = el.getAttribute("data-muscle");
            el.style.fill = highlighted.includes(muscle) ? accent : def;
          });
        })();
        </script>
        </body>
        </html>
        """
    }

    // MARK: - Front SVG

    // Diagrammatic representation — 12 muscle groups laid out as labelled shapes.
    // All paths carry data-muscle attributes matching the public muscle name strings.
    private func frontSVG() -> String {
        """
        <svg viewBox="0 0 160 340" xmlns="http://www.w3.org/2000/svg">
          <!-- Traps (upper) -->
          <rect class="muscle-group" data-muscle="traps"
                x="56" y="28" width="48" height="16" rx="4"/>
          <text class="muscle-label" x="80" y="39" text-anchor="middle">Traps</text>

          <!-- Shoulders -->
          <rect class="muscle-group" data-muscle="shoulders"
                x="26" y="42" width="22" height="22" rx="6"/>
          <text class="muscle-label" x="37" y="56" text-anchor="middle">Delt</text>

          <rect class="muscle-group" data-muscle="shoulders"
                x="112" y="42" width="22" height="22" rx="6"/>
          <text class="muscle-label" x="123" y="56" text-anchor="middle">Delt</text>

          <!-- Chest -->
          <rect class="muscle-group" data-muscle="chest"
                x="52" y="44" width="56" height="32" rx="6"/>
          <text class="muscle-label" x="80" y="63" text-anchor="middle">Chest</text>

          <!-- Biceps -->
          <rect class="muscle-group" data-muscle="biceps"
                x="26" y="68" width="18" height="38" rx="6"/>
          <text class="muscle-label" x="35" y="90" text-anchor="middle">Bi</text>

          <rect class="muscle-group" data-muscle="biceps"
                x="116" y="68" width="18" height="38" rx="6"/>
          <text class="muscle-label" x="125" y="90" text-anchor="middle">Bi</text>

          <!-- Abs -->
          <rect class="muscle-group" data-muscle="abs"
                x="58" y="80" width="44" height="48" rx="5"/>
          <text class="muscle-label" x="80" y="107" text-anchor="middle">Abs</text>

          <!-- Forearms (front, lower arm) -->
          <rect class="muscle-group" data-muscle="forearms"
                x="22" y="110" width="18" height="30" rx="5"/>
          <text class="muscle-label" x="31" y="128" text-anchor="middle">FA</text>

          <rect class="muscle-group" data-muscle="forearms"
                x="120" y="110" width="18" height="30" rx="5"/>
          <text class="muscle-label" x="129" y="128" text-anchor="middle">FA</text>

          <!-- Hip flexors / Hip -->
          <rect class="muscle-group" data-muscle="hip flexors"
                x="58" y="132" width="44" height="18" rx="4"/>
          <text class="muscle-label" x="80" y="144" text-anchor="middle">Hip Flex</text>

          <!-- Quads -->
          <rect class="muscle-group" data-muscle="quads"
                x="54" y="154" width="20" height="70" rx="6"/>
          <text class="muscle-label" x="64" y="192" text-anchor="middle">Quad</text>

          <rect class="muscle-group" data-muscle="quads"
                x="86" y="154" width="20" height="70" rx="6"/>
          <text class="muscle-label" x="96" y="192" text-anchor="middle">Quad</text>

          <!-- Calves (front view — tibialis) -->
          <rect class="muscle-group" data-muscle="calves"
                x="56" y="230" width="18" height="50" rx="5"/>
          <text class="muscle-label" x="65" y="258" text-anchor="middle">Calf</text>

          <rect class="muscle-group" data-muscle="calves"
                x="86" y="230" width="18" height="50" rx="5"/>
          <text class="muscle-label" x="95" y="258" text-anchor="middle">Calf</text>

          <!-- Body outline silhouette (non-interactive) -->
          <ellipse cx="80" cy="16" rx="14" ry="14"
                   fill="#222330" stroke="#2E3044" stroke-width="1"/>
          <text class="muscle-label" x="80" y="20" text-anchor="middle">Head</text>
        </svg>
        """
    }

    // MARK: - Back SVG

    private func backSVG() -> String {
        """
        <svg viewBox="0 0 160 340" xmlns="http://www.w3.org/2000/svg">
          <!-- Traps -->
          <rect class="muscle-group" data-muscle="traps"
                x="56" y="28" width="48" height="22" rx="4"/>
          <text class="muscle-label" x="80" y="42" text-anchor="middle">Traps</text>

          <!-- Rear Delts / Shoulders -->
          <rect class="muscle-group" data-muscle="shoulders"
                x="26" y="42" width="22" height="22" rx="6"/>
          <text class="muscle-label" x="37" y="56" text-anchor="middle">Delt</text>

          <rect class="muscle-group" data-muscle="shoulders"
                x="112" y="42" width="22" height="22" rx="6"/>
          <text class="muscle-label" x="123" y="56" text-anchor="middle">Delt</text>

          <!-- Lats -->
          <rect class="muscle-group" data-muscle="lats"
                x="48" y="54" width="24" height="50" rx="6"/>
          <text class="muscle-label" x="60" y="81" text-anchor="middle">Lat</text>

          <rect class="muscle-group" data-muscle="lats"
                x="88" y="54" width="24" height="50" rx="6"/>
          <text class="muscle-label" x="100" y="81" text-anchor="middle">Lat</text>

          <!-- Triceps -->
          <rect class="muscle-group" data-muscle="triceps"
                x="26" y="68" width="18" height="38" rx="6"/>
          <text class="muscle-label" x="35" y="90" text-anchor="middle">Tri</text>

          <rect class="muscle-group" data-muscle="triceps"
                x="116" y="68" width="18" height="38" rx="6"/>
          <text class="muscle-label" x="125" y="90" text-anchor="middle">Tri</text>

          <!-- Lower Back -->
          <rect class="muscle-group" data-muscle="lower back"
                x="60" y="108" width="40" height="28" rx="5"/>
          <text class="muscle-label" x="80" y="125" text-anchor="middle">Lower Back</text>

          <!-- Glutes -->
          <rect class="muscle-group" data-muscle="glutes"
                x="54" y="140" width="20" height="32" rx="6"/>
          <text class="muscle-label" x="64" y="159" text-anchor="middle">Glute</text>

          <rect class="muscle-group" data-muscle="glutes"
                x="86" y="140" width="20" height="32" rx="6"/>
          <text class="muscle-label" x="96" y="159" text-anchor="middle">Glute</text>

          <!-- Hamstrings -->
          <rect class="muscle-group" data-muscle="hamstrings"
                x="54" y="176" width="20" height="50" rx="6"/>
          <text class="muscle-label" x="64" y="203" text-anchor="middle">Ham</text>

          <rect class="muscle-group" data-muscle="hamstrings"
                x="86" y="176" width="20" height="50" rx="6"/>
          <text class="muscle-label" x="96" y="203" text-anchor="middle">Ham</text>

          <!-- Calves -->
          <rect class="muscle-group" data-muscle="calves"
                x="56" y="230" width="18" height="50" rx="5"/>
          <text class="muscle-label" x="65" y="258" text-anchor="middle">Calf</text>

          <rect class="muscle-group" data-muscle="calves"
                x="86" y="230" width="18" height="50" rx="5"/>
          <text class="muscle-label" x="95" y="258" text-anchor="middle">Calf</text>

          <!-- Head -->
          <ellipse cx="80" cy="16" rx="14" ry="14"
                   fill="#222330" stroke="#2E3044" stroke-width="1"/>
          <text class="muscle-label" x="80" y="20" text-anchor="middle">Head</text>
        </svg>
        """
    }
}
