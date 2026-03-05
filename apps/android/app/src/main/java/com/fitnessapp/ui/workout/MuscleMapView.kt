package com.fitnessapp.ui.workout

import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView

/**
 * Renders a front or back muscle-map SVG in a WebView and highlights
 * the given muscles using data-muscle attributes.
 *
 * SVGs loaded from assets/muscle_map_front.svg / assets/muscle_map_back.svg
 * (copied into the android assets folder by the build system).
 */
@Composable
fun MuscleMapView(
    primaryMuscles: List<String>,
    secondaryMuscles: List<String>,
    modifier: Modifier = Modifier
) {
    var showFront by remember { mutableStateOf(true) }
    val view = remember { mutableStateOf<WebView?>(null) }

    Column(modifier = modifier) {
        // Front / Back toggle
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 8.dp),
            horizontalArrangement = Arrangement.Center
        ) {
            FilterChip(
                selected = showFront,
                onClick = { showFront = true },
                label = { Text("Front") },
                modifier = Modifier.padding(end = 8.dp)
            )
            FilterChip(
                selected = !showFront,
                onClick = { showFront = false },
                label = { Text("Back") }
            )
        }

        AndroidView(
            factory = { context ->
                WebView(context).apply {
                    settings.javaScriptEnabled = true
                    webViewClient = object : WebViewClient() {
                        override fun onPageFinished(wv: WebView, url: String) {
                            injectHighlights(wv, primaryMuscles, secondaryMuscles)
                        }
                    }
                    view.value = this
                }
            },
            update = { wv ->
                val file = if (showFront) "muscle_map_front.svg" else "muscle_map_back.svg"
                wv.loadUrl("file:///android_asset/$file")
            },
            modifier = Modifier
                .fillMaxWidth()
                .height(320.dp)
        )
    }

    // Re-inject when toggle changes after initial load
    LaunchedEffect(showFront) {
        view.value?.let { wv ->
            val file = if (showFront) "muscle_map_front.svg" else "muscle_map_back.svg"
            wv.loadUrl("file:///android_asset/$file")
        }
    }
}

private fun injectHighlights(
    webView: WebView,
    primary: List<String>,
    secondary: List<String>
) {
    val primaryJson = primary.joinToString(",") { "\"$it\"" }
    val secondaryJson = secondary.joinToString(",") { "\"$it\"" }
    val js = """
        (function() {
            var primary = [$primaryJson];
            var secondary = [$secondaryJson];
            document.querySelectorAll('[data-muscle]').forEach(function(el) {
                var m = el.getAttribute('data-muscle');
                if (primary.includes(m)) {
                    el.style.fill = '#A3FF12';
                    el.style.opacity = '1.0';
                } else if (secondary.includes(m)) {
                    el.style.fill = '#A3FF12';
                    el.style.opacity = '0.4';
                } else {
                    el.style.fill = '';
                    el.style.opacity = '';
                }
            });
        })();
    """.trimIndent()
    webView.evaluateJavascript(js, null)
}
