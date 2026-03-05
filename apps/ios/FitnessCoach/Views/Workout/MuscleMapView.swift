import SwiftUI
import WebKit

// MARK: - MuscleMapView
// Renders front/back muscle SVGs from the assets bundle,
// highlighting primary (accent) and secondary (muted accent) muscles.

struct MuscleMapView: View {
    let primaryMuscles: [String]
    let secondaryMuscles: [String]

    @State private var showBack = false

    private var currentMuscleMap: [String: String] {
        // Front/back classification
        let frontMuscles: Set<String> = [
            "chest", "shoulders", "biceps", "forearms", "quadriceps",
            "abdominals", "hip flexors", "neck"
        ]
        return showBack ? [:] : [:]  // resolved dynamically via JS
    }

    var body: some View {
        VStack(spacing: 0) {
            // Front/Back toggle
            Picker("View", selection: $showBack) {
                Text("Front").tag(false)
                Text("Back").tag(true)
            }
            .pickerStyle(.segmented)
            .padding(.horizontal)
            .padding(.bottom, 8)

            // SVG WebView
            MuscleMapWebView(
                svgName: showBack ? "muscle_map_back" : "muscle_map_front",
                primaryMuscles: primaryMuscles,
                secondaryMuscles: secondaryMuscles
            )
            .animation(.easeInOut(duration: 0.2), value: showBack)
        }
    }
}

// MARK: - WKWebView wrapper
struct MuscleMapWebView: UIViewRepresentable {
    let svgName: String
    let primaryMuscles: [String]
    let secondaryMuscles: [String]

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "allowFileAccessFromFileURLs")
        let webView = WKWebView(frame: .zero, configuration: config)
        webView.isOpaque = false
        webView.backgroundColor = .clear
        webView.scrollView.isScrollEnabled = false
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        guard let url = Bundle.main.url(forResource: svgName, withExtension: "svg") else {
            // Fallback: render placeholder
            loadPlaceholder(webView)
            return
        }

        let primary    = primaryMuscles.map { "\"\($0.lowercased())\"" }.joined(separator: ",")
        let secondary  = secondaryMuscles.map { "\"\($0.lowercased())\"" }.joined(separator: ",")

        let html = """
        <!DOCTYPE html>
        <html>
        <head>
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <style>
          body { margin: 0; background: transparent; display: flex; justify-content: center; }
          svg { max-width: 100%; height: auto; }
        </style>
        </head>
        <body>
        <div id="map"></div>
        <script>
          const primary = [\(primary)];
          const secondary = [\(secondary)];
          fetch('\(url.absoluteString)')
            .then(r => r.text())
            .then(svg => {
              document.getElementById('map').innerHTML = svg;
              const svgEl = document.querySelector('svg');
              if (!svgEl) return;
              primary.forEach(m => {
                svgEl.querySelectorAll('[data-muscle="' + m + '"]').forEach(el => {
                  el.style.fill = '#A3FF12';
                  el.style.opacity = '1';
                });
              });
              secondary.forEach(m => {
                svgEl.querySelectorAll('[data-muscle="' + m + '"]').forEach(el => {
                  if (!primary.includes(m)) {
                    el.style.fill = '#A3FF12';
                    el.style.opacity = '0.4';
                  }
                });
              });
            });
        </script>
        </body>
        </html>
        """
        webView.loadHTMLString(html, baseURL: url.deletingLastPathComponent())
    }

    private func loadPlaceholder(_ webView: WKWebView) {
        let html = """
        <html><body style="background:transparent;display:flex;align-items:center;justify-content:center;height:100vh;">
        <p style="color:#9CA3AF;font-family:system-ui;font-size:14px;">Muscle map unavailable</p>
        </body></html>
        """
        webView.loadHTMLString(html, baseURL: nil)
    }
}
