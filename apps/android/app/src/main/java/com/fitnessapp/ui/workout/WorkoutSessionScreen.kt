package com.fitnessapp.ui.workout

import androidx.compose.animation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.navigation.NavController
import com.fitnessapp.data.model.LoggedSet
import com.fitnessapp.data.model.WorkoutTemplateExercise
import com.fitnessapp.ui.theme.FitnessColors

@Composable
fun WorkoutSessionScreen(
    assignmentId: String,
    navController: NavController,
    workoutVM: WorkoutViewModel = hiltViewModel(),
    timerVM: RestTimerViewModel = hiltViewModel()
) {
    val sessionState by workoutVM.sessionState.collectAsStateWithLifecycle()
    val timerState by timerVM.state.collectAsStateWithLifecycle()
    var showTimer by remember { mutableStateOf(false) }
    var currentExerciseIdx by remember { mutableIntStateOf(0) }

    LaunchedEffect(assignmentId) {
        workoutVM.startSession(assignmentId)
    }

    timerVM.onFinished = {
        // Auto-hide timer, trigger haptic
    }

    Box(modifier = Modifier.fillMaxSize()) {
        when (val state = sessionState) {
            is SessionState.Loading -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = FitnessColors.Accent)
                }
            }
            is SessionState.Active -> {
                val exercises = state.templateExercises
                val exercise = exercises.getOrNull(currentExerciseIdx)

                Column(modifier = Modifier.fillMaxSize()) {
                    // Progress header
                    LinearProgressIndicator(
                        progress = { (currentExerciseIdx + 1f) / exercises.size },
                        modifier = Modifier.fillMaxWidth().height(4.dp),
                        color = FitnessColors.Accent,
                        trackColor = MaterialTheme.colorScheme.surfaceVariant
                    )

                    exercise?.let { ex ->
                        LazyColumn(
                            modifier = Modifier.weight(1f),
                            contentPadding = PaddingValues(16.dp),
                            verticalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            item {
                                ExerciseHeader(
                                    templateExercise = ex,
                                    exerciseIndex = currentExerciseIdx,
                                    totalExercises = exercises.size
                                )
                            }

                            // Last session banner
                            val lastSession = state.lastSessionData[ex.exerciseId]
                            if (lastSession != null) {
                                item {
                                    LastSessionBanner(lastSession = lastSession)
                                }
                            }

                            // Sets
                            val sets = state.loggedSets[ex.exerciseId] ?: emptyList()
                            items(sets, key = { it.setNumber }) { set ->
                                SetLogRow(
                                    set = set,
                                    lastSet = lastSession?.sets?.getOrNull(set.setNumber - 1),
                                    onComplete = { completedSet ->
                                        workoutVM.logSet(ex.exerciseId, completedSet)
                                        timerVM.start(ex.restSeconds)
                                        showTimer = true
                                    }
                                )
                            }

                            item {
                                Spacer(Modifier.height(80.dp))  // space for timer bar
                            }
                        }

                        // Next / Finish
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp)
                                .padding(bottom = if (timerState.isActive) 80.dp else 0.dp),
                            contentAlignment = Alignment.BottomCenter
                        ) {
                            Button(
                                onClick = {
                                    if (currentExerciseIdx < exercises.size - 1) {
                                        currentExerciseIdx++
                                    } else {
                                        workoutVM.finishSession()
                                        navController.popBackStack()
                                    }
                                },
                                modifier = Modifier.fillMaxWidth().height(52.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = FitnessColors.Accent,
                                    contentColor = FitnessColors.AccentForeground
                                )
                            ) {
                                Text(
                                    if (currentExerciseIdx < exercises.size - 1) "Next Exercise →" else "Finish Workout",
                                    style = MaterialTheme.typography.labelLarge
                                )
                            }
                        }
                    }
                }
            }
            is SessionState.Error -> {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text(state.message, color = MaterialTheme.colorScheme.error)
                }
            }
            else -> Unit
        }

        // Persistent rest timer bar at bottom
        AnimatedVisibility(
            visible = timerState.isActive || timerState is TimerState.Finished,
            modifier = Modifier.align(Alignment.BottomCenter),
            enter = slideInVertically { it },
            exit = slideOutVertically { it }
        ) {
            RestTimerBar(
                timerVM = timerVM,
                onExpand = { showTimer = !showTimer }
            )
        }

        // Expanded timer overlay
        if (showTimer && (timerState.isActive || timerState is TimerState.Finished)) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(bottom = 120.dp),
                contentAlignment = Alignment.BottomCenter
            ) {
                RestTimerCard(timerVM = timerVM)
            }
        }
    }
}

@Composable
private fun ExerciseHeader(
    templateExercise: WorkoutTemplateExercise,
    exerciseIndex: Int,
    totalExercises: Int
) {
    Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
        Text(
            "Exercise ${exerciseIndex + 1} of $totalExercises",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Text(
            templateExercise.exercise?.name ?: templateExercise.exerciseId,
            style = MaterialTheme.typography.headlineSmall
        )
        Text(
            "${templateExercise.targetSets} sets · ${templateExercise.repMin}–${templateExercise.repMax} reps · ${templateExercise.restSeconds}s rest",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun LastSessionBanner(lastSession: com.fitnessapp.data.model.LastSessionInfo) {
    Surface(
        color = FitnessColors.Accent.copy(alpha = 0.12f),
        shape = MaterialTheme.shapes.small
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Icon(Icons.Default.History, null, Modifier.size(14.dp), tint = FitnessColors.Accent)
            Text(
                text = lastSession.lastSet?.let {
                    "Last: ×${it.reps} @ ${it.weightKg ?: 0}kg"
                } ?: "No previous data",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun SetLogRow(
    set: LoggedSet,
    lastSet: com.fitnessapp.data.model.LastSetInfo?,
    onComplete: (LoggedSet) -> Unit
) {
    var repsStr by remember(set.setNumber) { mutableStateOf(set.reps.toString()) }
    var weightStr by remember(set.setNumber) { mutableStateOf(set.weightKg?.toString() ?: "") }

    Surface(
        shape = MaterialTheme.shapes.medium,
        color = if (set.isComplete)
            FitnessColors.Accent.copy(alpha = 0.08f)
        else
            MaterialTheme.colorScheme.surfaceVariant,
        border = if (set.isComplete)
            androidx.compose.foundation.BorderStroke(1.dp, FitnessColors.Accent.copy(alpha = 0.3f))
        else null
    ) {
        Row(
            modifier = Modifier.padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // Set badge
            Surface(
                shape = MaterialTheme.shapes.small,
                color = if (set.isComplete) FitnessColors.Accent else MaterialTheme.colorScheme.surface,
                modifier = Modifier.size(36.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Text(
                        "${set.setNumber}",
                        style = MaterialTheme.typography.labelMedium,
                        color = if (set.isComplete) FitnessColors.AccentForeground
                                else MaterialTheme.colorScheme.onSurface
                    )
                }
            }

            // Weight input
            OutlinedTextField(
                value = weightStr,
                onValueChange = { weightStr = it },
                label = { Text("kg") },
                placeholder = { Text(lastSet?.weightKg?.toString() ?: "0") },
                modifier = Modifier.weight(1f),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal)
            )

            // Reps input
            OutlinedTextField(
                value = repsStr,
                onValueChange = { repsStr = it },
                label = { Text("reps") },
                modifier = Modifier.weight(1f),
                singleLine = true,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number)
            )

            // Done button
            IconButton(
                onClick = {
                    onComplete(
                        set.copy(
                            weightKg = weightStr.toDoubleOrNull() ?: set.weightKg,
                            reps = repsStr.toIntOrNull() ?: set.reps,
                            isComplete = true
                        )
                    )
                },
                enabled = !set.isComplete
            ) {
                Icon(
                    if (set.isComplete) Icons.Default.CheckCircle else Icons.Default.RadioButtonUnchecked,
                    contentDescription = "Complete set",
                    tint = if (set.isComplete) FitnessColors.Accent
                           else MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
    }
}
