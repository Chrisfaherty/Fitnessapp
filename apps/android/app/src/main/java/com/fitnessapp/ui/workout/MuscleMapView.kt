package com.fitcoach.app.ui.workout

import android.graphics.Color
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView

/**
 * Renders an inline SVG muscle diagram in a WebView and highlights the
 * given muscles using #A3FF12 (the FitCoach accent colour).
 *
 * On every recomposition where [highlightedMuscles] changes, the existing
 * WebView is updated via evaluateJavascript — no full reload required.
 */
@Composable
fun MuscleMapView(
    highlightedMuscles: List<String>,
    modifier: Modifier = Modifier
) {
    // Keep a stable reference so we can push JS updates after initial load.
    val webViewRef = remember { mutableStateOf<WebView?>(null) }

    // Track whether the page has finished loading so we can safely inject JS.
    val pageReady = remember { mutableStateOf(false) }

    // Rebuild the HTML whenever the highlighted set changes.
    val html = remember(highlightedMuscles) { buildMuscleMapHtml(highlightedMuscles) }

    AndroidView(
        factory = { context ->
            WebView(context).apply {
                setBackgroundColor(Color.parseColor("#0B0C10"))
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView, url: String) {
                        pageReady.value = true
                    }
                }
                loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
                webViewRef.value = this
            }
        },
        update = { webView ->
            // On recomposition with new highlights, push a JS update instead
            // of reloading the full HTML document.
            if (pageReady.value) {
                webView.evaluateJavascript(buildUpdateJs(highlightedMuscles), null)
            } else {
                // Page not ready yet — reload with fresh HTML (e.g. first render
                // or after the view is recycled by the Compose runtime).
                pageReady.value = false
                webView.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
            }
        },
        modifier = modifier
    )
}

// ---------------------------------------------------------------------------
// HTML / SVG helpers
// ---------------------------------------------------------------------------

private val ALL_MUSCLES = listOf(
    "chest", "shoulders", "biceps", "triceps", "abs",
    "quads", "hamstrings", "glutes", "calves", "lats", "traps", "lower_back"
)

private fun buildMuscleMapHtml(highlighted: List<String>): String {
    val highlightedSet = highlighted.toSet()

    // Build per-muscle style rules.
    val styleRules = ALL_MUSCLES.joinToString("\n") { muscle ->
        val fill = if (muscle in highlightedSet) "#A3FF12" else "#1C1D26"
        "#$muscle { fill: $fill; transition: fill 0.3s ease; }"
    }

    // Simple schematic SVG — each region is a labelled path with its id
    // matching the muscle name used in the API.
    return """
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  html, body {
    margin: 0; padding: 0;
    background: #0B0C10;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    overflow: hidden;
  }
  svg {
    width: 100%;
    max-width: 340px;
    height: auto;
  }
  $styleRules
  text {
    fill: #8A8A9A;
    font-family: sans-serif;
    font-size: 11px;
    pointer-events: none;
    user-select: none;
  }
</style>
</head>
<body>
<svg viewBox="0 0 200 420" xmlns="http://www.w3.org/2000/svg">

  <!-- TRAPS -->
  <path id="traps"
    d="M70,30 Q100,20 130,30 L125,55 Q100,45 75,55 Z"/>
  <text x="100" y="43" text-anchor="middle">traps</text>

  <!-- SHOULDERS -->
  <path id="shoulders"
    d="M55,55 Q70,45 75,65 L65,85 Q52,75 50,65 Z
       M145,55 Q130,45 125,65 L135,85 Q148,75 150,65 Z"/>
  <text x="42" y="72" text-anchor="middle">delts</text>

  <!-- CHEST -->
  <path id="chest"
    d="M75,65 Q100,58 125,65 L122,100 Q100,108 78,100 Z"/>
  <text x="100" y="87" text-anchor="middle">chest</text>

  <!-- BICEPS -->
  <path id="biceps"
    d="M55,85 Q63,80 65,100 L60,120 Q52,115 50,100 Z
       M145,85 Q137,80 135,100 L140,120 Q148,115 150,100 Z"/>
  <text x="42" y="105" text-anchor="middle">biceps</text>

  <!-- TRICEPS (back-of-arm schematic shown on side) -->
  <path id="triceps"
    d="M50,100 Q45,115 48,130 L56,125 Q55,112 58,100 Z
       M150,100 Q155,115 152,130 L144,125 Q145,112 142,100 Z"/>
  <text x="158" y="118" text-anchor="middle">tris</text>

  <!-- ABS -->
  <path id="abs"
    d="M78,100 Q100,108 122,100 L120,160 Q100,168 80,160 Z"/>
  <text x="100" y="135" text-anchor="middle">abs</text>

  <!-- LATS -->
  <path id="lats"
    d="M63,85 Q75,95 78,130 L68,145 Q55,130 55,110 Z
       M137,85 Q125,95 122,130 L132,145 Q145,130 145,110 Z"/>
  <text x="44" y="118" text-anchor="middle">lats</text>

  <!-- LOWER BACK -->
  <path id="lower_back"
    d="M80,160 Q100,168 120,160 L118,185 Q100,192 82,185 Z"/>
  <text x="100" y="176" text-anchor="middle">lower back</text>

  <!-- GLUTES -->
  <path id="glutes"
    d="M82,185 Q100,192 118,185 L115,215 Q100,222 85,215 Z"/>
  <text x="100" y="203" text-anchor="middle">glutes</text>

  <!-- QUADS -->
  <path id="quads"
    d="M82,215 Q90,210 98,215 L96,280 Q90,285 82,280 Z
       M118,215 Q110,210 102,215 L104,280 Q110,285 118,280 Z"/>
  <text x="100" y="250" text-anchor="middle">quads</text>

  <!-- HAMSTRINGS -->
  <path id="hamstrings"
    d="M82,280 Q88,278 96,280 L95,340 Q88,345 82,340 Z
       M118,280 Q112,278 104,280 L105,340 Q112,345 118,340 Z"/>
  <text x="100" y="312" text-anchor="middle">hams</text>

  <!-- CALVES -->
  <path id="calves"
    d="M82,340 Q88,338 95,340 L94,390 Q88,395 82,390 Z
       M118,340 Q112,338 105,340 L106,390 Q112,395 118,390 Z"/>
  <text x="100" y="368" text-anchor="middle">calves</text>

</svg>
</body>
</html>
""".trimIndent()
}

/** JavaScript snippet that updates muscle fills without a page reload. */
private fun buildUpdateJs(highlighted: List<String>): String {
    val allMusclesJson = ALL_MUSCLES.joinToString(",") { "\"$it\"" }
    val highlightedJson = highlighted.joinToString(",") { "\"$it\"" }
    return """
(function() {
    var all = [$allMusclesJson];
    var highlighted = [$highlightedJson];
    all.forEach(function(muscle) {
        var el = document.getElementById(muscle);
        if (!el) return;
        el.style.fill = highlighted.indexOf(muscle) !== -1 ? '#A3FF12' : '#1C1D26';
    });
})();
""".trimIndent()
}
