package com.fitnessapp.ui.workout

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.fitnessapp.ui.theme.FitnessColors

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExerciseDetailScreen(
    exercise: ExerciseInTemplate,
    onBack: () -> Unit
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(exercise.name) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier.padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Muscle map
            item {
                MuscleMapView(
                    primaryMuscles = exercise.primaryMuscles,
                    secondaryMuscles = emptyList(),
                    modifier = Modifier.fillMaxWidth()
                )
            }

            // Meta badges
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    exercise.equipment?.let {
                        MetaBadge(it)
                    }
                    MetaBadge("${exercise.repMin}–${exercise.repMax} reps")
                    MetaBadge("${exercise.targetSets} sets")
                    MetaBadge("Rest ${exercise.restSeconds}s")
                }
            }

            // Notes
            exercise.notes?.let { notes ->
                item {
                    Card {
                        Column(Modifier.padding(12.dp)) {
                            Text("Trainer Notes", style = MaterialTheme.typography.labelMedium,
                                color = FitnessColors.Accent)
                            Spacer(Modifier.height(4.dp))
                            Text(notes, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }

            // Primary muscles
            if (exercise.primaryMuscles.isNotEmpty()) {
                item {
                    Text("Primary Muscles", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(4.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        exercise.primaryMuscles.forEach { muscle ->
                            MuscleChip(muscle, primary = true)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun MetaBadge(text: String) {
    Surface(
        shape = MaterialTheme.shapes.small,
        color = MaterialTheme.colorScheme.surfaceVariant,
        tonalElevation = 1.dp
    ) {
        Text(
            text,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun MuscleChip(muscle: String, primary: Boolean) {
    val label = muscle.replaceFirstChar { it.uppercase() }
    AssistChip(
        onClick = {},
        label = { Text(label) },
        colors = AssistChipDefaults.assistChipColors(
            containerColor = if (primary)
                FitnessColors.Accent.copy(alpha = 0.15f)
            else
                MaterialTheme.colorScheme.surfaceVariant,
            labelColor = if (primary) FitnessColors.Accent
            else MaterialTheme.colorScheme.onSurfaceVariant
        )
    )
}
