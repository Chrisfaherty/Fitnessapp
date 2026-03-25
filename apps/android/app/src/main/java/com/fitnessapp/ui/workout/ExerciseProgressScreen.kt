package com.fitcoach.app.ui.workout

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.jan.supabase.postgrest.rpc
import kotlinx.coroutines.launch
import kotlinx.serialization.Serializable
import kotlinx.serialization.SerialName

@Serializable
data class VolumePoint(
    @SerialName("week_label") val weekLabel: String,
    @SerialName("max_weight") val maxWeight: Double,
    @SerialName("total_volume") val totalVolume: Double,
    @SerialName("session_count") val sessionCount: Int,
)

@Composable
fun ExerciseProgressScreen(
    exerciseId: String,
    exerciseName: String,
    clientId: String,
    onBack: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var points by remember { mutableStateOf<List<VolumePoint>>(emptyList()) }
    var isLoading by remember { mutableStateOf(true) }
    val accent = Color(0xFFA3FF12)
    val surface = Color(0xFF12131A)
    val textSecondary = Color(0x8CF0F0F0)

    LaunchedEffect(exerciseId) {
        scope.launch {
            try {
                points = SupabaseProvider.client
                    .rpc("get_exercise_volume_trend", mapOf(
                        "p_client_id" to clientId,
                        "p_exercise_id" to exerciseId,
                        "p_days" to 90,
                    ))
                    .decodeList<VolumePoint>()
            } catch (_: Exception) {}
            isLoading = false
        }
    }

    Scaffold(
        containerColor = Color(0xFF0B0C10),
        topBar = {
            TopAppBar(
                title = { Text(exerciseName, color = Color(0xFFF0F0F0)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Text("←", color = accent, fontSize = 20.sp)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF0B0C10))
            )
        }
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = accent)
            }
        } else if (points.isEmpty) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                Text("No sets logged for this exercise yet", color = textSecondary)
            }
        } else {
            Column(
                Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .verticalScroll(rememberScrollState())
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Stats row
                val bestWeight = points.maxOfOrNull { it.maxWeight } ?: 0.0
                val totalSessions = points.sumOf { it.sessionCount }

                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    StatCard("Best Weight", "${bestWeight.toInt()} kg", Modifier.weight(1f))
                    StatCard("Sessions", "$totalSessions", Modifier.weight(1f))
                }

                // Progress line chart
                Text("Max Weight Over Time", color = textSecondary, fontSize = 12.sp)
                ProgressLineChart(
                    points = points,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp),
                    lineColor = accent,
                    gridColor = textSecondary.copy(alpha = 0.2f),
                )
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        color = Color(0xFF12131A),
        shape = MaterialTheme.shapes.medium,
    ) {
        Column(
            Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Text(value, color = Color(0xFFF0F0F0), style = MaterialTheme.typography.headlineSmall)
            Text(label, color = Color(0x8CF0F0F0), style = MaterialTheme.typography.bodySmall)
        }
    }
}
