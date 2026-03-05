package com.fitnessapp.ui.workout

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.FitnessCenter
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.fitnessapp.ui.theme.FitnessColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WorkoutListScreen(
    navController: NavController,
    viewModel: WorkoutViewModel = hiltViewModel()
) {
    val listState by viewModel.listState.collectAsStateWithLifecycle()
    val sessionState by viewModel.sessionState.collectAsStateWithLifecycle()

    // Navigate when session becomes active
    LaunchedEffect(sessionState) {
        if (sessionState is SessionState.Active) {
            val id = (sessionState as SessionState.Active).assignment.assignmentId
            navController.navigate("workout_session/$id")
        }
    }

    Scaffold(topBar = {
        TopAppBar(title = { Text("My Workouts") })
    }) { padding ->
        when (val s = listState) {
            is WorkoutListState.Loading -> Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                CircularProgressIndicator(color = FitnessColors.Accent)
            }

            is WorkoutListState.Success -> {
                if (s.assignments.isEmpty()) {
                    EmptyWorkoutsPlaceholder(Modifier.padding(padding))
                } else {
                    LazyColumn(
                        modifier = Modifier.padding(padding),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(s.assignments, key = { it.assignmentId }) { assignment ->
                            AssignmentCard(
                                assignment = assignment,
                                onStart = { viewModel.startSession(assignment) },
                                loading = sessionState is SessionState.Saving
                            )
                        }
                    }
                }
            }

            is WorkoutListState.Error -> Box(
                Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(s.message, color = MaterialTheme.colorScheme.error)
                    Spacer(Modifier.height(12.dp))
                    Button(onClick = { viewModel.loadAssignments() }) { Text("Retry") }
                }
            }
        }
    }
}

@Composable
private fun AssignmentCard(
    assignment: ActiveAssignment,
    onStart: () -> Unit,
    loading: Boolean
) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(
                    Icons.Default.FitnessCenter,
                    contentDescription = null,
                    tint = FitnessColors.Accent,
                    modifier = Modifier.size(24.dp)
                )
                Spacer(Modifier.width(8.dp))
                Text(assignment.templateTitle, style = MaterialTheme.typography.titleMedium)
            }
            Spacer(Modifier.height(8.dp))
            Text(
                "${assignment.exercises.size} exercises",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(4.dp))
            // Muscle summary
            val muscles = assignment.exercises
                .flatMap { it.primaryMuscles }
                .distinct()
                .take(4)
            if (muscles.isNotEmpty()) {
                Text(
                    muscles.joinToString(" · ") { it.replaceFirstChar { c -> c.uppercase() } },
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(Modifier.height(16.dp))
            Button(
                onClick = onStart,
                enabled = !loading,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = FitnessColors.Accent)
            ) {
                if (loading) {
                    CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                } else {
                    Text("Start Workout", color = MaterialTheme.colorScheme.background)
                }
            }
        }
    }
}

@Composable
private fun EmptyWorkoutsPlaceholder(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.Default.FitnessCenter,
                contentDescription = null,
                modifier = Modifier.size(64.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(Modifier.height(16.dp))
            Text("No workouts assigned yet", style = MaterialTheme.typography.titleMedium)
            Text(
                "Your trainer will assign workouts here",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
