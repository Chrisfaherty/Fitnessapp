package com.fitnessapp.ui.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.fitnessapp.ui.theme.FitnessColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(viewModel: DashboardViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(topBar = {
        TopAppBar(title = { Text("Dashboard") })
    }) { padding ->
        when (val s = state) {
            is DashboardState.Loading -> Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = FitnessColors.Accent)
            }

            is DashboardState.Success -> LazyColumn(
                modifier = Modifier.padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Stats grid
                item {
                    Text("This Week", style = MaterialTheme.typography.titleMedium)
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        StatCard("Steps", s.avgSteps?.let { "${it.toInt()}" } ?: "—", Modifier.weight(1f))
                        StatCard("Calories", s.avgCalories?.let { "${it.toInt()}" } ?: "—", Modifier.weight(1f))
                    }
                    Spacer(Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        StatCard("Weight", s.latestWeight?.let { String.format("%.1f kg", it) } ?: "—", Modifier.weight(1f))
                        StatCard("Workouts", "${s.workoutsThisWeek}", Modifier.weight(1f), accent = true)
                    }
                }
            }

            is DashboardState.Error -> Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text(s.message, color = MaterialTheme.colorScheme.error)
            }
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier, accent: Boolean = false) {
    Card(modifier = modifier, colors = CardDefaults.cardColors(
        containerColor = if (accent) FitnessColors.Accent.copy(alpha = 0.1f)
                         else MaterialTheme.colorScheme.surfaceVariant
    )) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(value, style = MaterialTheme.typography.headlineSmall,
                color = if (accent) FitnessColors.Accent else MaterialTheme.colorScheme.onSurface)
            Text(label, style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}

sealed class DashboardState {
    object Loading : DashboardState()
    data class Success(
        val avgSteps: Double? = null,
        val avgCalories: Double? = null,
        val latestWeight: Double? = null,
        val workoutsThisWeek: Int = 0
    ) : DashboardState()
    data class Error(val message: String) : DashboardState()
}
