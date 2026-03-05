package com.fitnessapp.ui.workout

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fitnessapp.ui.theme.FitnessColors

@Composable
fun RestTimerBar(
    timerVM: RestTimerViewModel,
    onExpand: () -> Unit
) {
    val state by timerVM.state.collectAsStateWithLifecycle()

    Surface(
        modifier = Modifier.fillMaxWidth(),
        tonalElevation = 8.dp,
        shadowElevation = 8.dp
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Mini circular progress
            Box(Modifier.size(36.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(
                    progress = { state.progress },
                    modifier = Modifier.fillMaxSize(),
                    color = FitnessColors.Accent,
                    strokeWidth = 3.dp,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
                Text(
                    text = if (state is TimerState.Finished) "✓"
                           else formatTime(state.remainingSeconds),
                    style = MaterialTheme.typography.labelSmall,
                    color = if (state is TimerState.Finished)
                        MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurface
                )
            }

            Text(
                text = when (state) {
                    is TimerState.Finished -> "Rest complete!"
                    is TimerState.Paused   -> "Paused"
                    else                   -> "Resting…"
                },
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.bodyMedium
            )

            IconButton(onClick = onExpand, modifier = Modifier.size(32.dp)) {
                Icon(Icons.Default.KeyboardArrowUp, contentDescription = "Expand")
            }
        }
    }
}

@Composable
fun RestTimerCard(timerVM: RestTimerViewModel) {
    val state by timerVM.state.collectAsStateWithLifecycle()

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 8.dp)
    ) {
        Column(
            modifier = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(20.dp)
        ) {
            Text("Rest Timer", style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant)

            // Large countdown ring
            Box(Modifier.size(160.dp), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(
                    progress = { state.progress },
                    modifier = Modifier.fillMaxSize(),
                    color = FitnessColors.Accent,
                    strokeWidth = 10.dp,
                    trackColor = MaterialTheme.colorScheme.surfaceVariant
                )
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(
                        text = if (state is TimerState.Finished) "Done!"
                               else "${state.remainingSeconds / 60}:${String.format("%02d", state.remainingSeconds % 60)}",
                        style = MaterialTheme.typography.displaySmall
                    )
                    if (state is TimerState.Paused) {
                        Text("PAUSED", style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }

            // Adjust buttons
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedButton(onClick = { timerVM.addTime(-10) }) { Text("−10s") }
                OutlinedButton(onClick = { timerVM.addTime(10) })  { Text("+10s") }
            }

            // Controls
            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                // Pause/Resume
                IconButton(
                    onClick = {
                        when (state) {
                            is TimerState.Running -> timerVM.pause()
                            is TimerState.Paused  -> timerVM.resume()
                            else -> Unit
                        }
                    },
                    modifier = Modifier
                        .size(52.dp)
                        .align(Alignment.CenterVertically)
                ) {
                    Icon(
                        if (state is TimerState.Running) Icons.Default.Pause else Icons.Default.PlayArrow,
                        contentDescription = null,
                        modifier = Modifier.size(28.dp)
                    )
                }

                Button(
                    onClick = { timerVM.skip() },
                    modifier = Modifier.weight(1f).height(52.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = FitnessColors.Accent,
                        contentColor = FitnessColors.AccentForeground
                    )
                ) {
                    Text("Skip")
                }
            }
        }
    }
}

private fun formatTime(seconds: Int): String =
    if (seconds >= 60) "${seconds / 60}:${String.format("%02d", seconds % 60)}"
    else "${seconds}s"
