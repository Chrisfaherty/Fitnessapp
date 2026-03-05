package com.fitnessapp.ui.workout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.gotrue.gotrue
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import javax.inject.Inject

// ─── Domain Models ───────────────────────────────────────────────────────────

data class ExerciseInTemplate(
    val id: String,        // exercise_id
    val name: String,
    val sortOrder: Int,
    val targetSets: Int,
    val repMin: Int,
    val repMax: Int,
    val restSeconds: Int,
    val notes: String?,
    val primaryMuscles: List<String>,
    val equipment: String?
)

data class ActiveAssignment(
    val assignmentId: String,
    val templateId: String,
    val templateTitle: String,
    val exercises: List<ExerciseInTemplate>
)

data class LoggedSet(
    val setNumber: Int,
    var reps: Int,
    var weightKg: Double?,
    var rpe: Double?,
    var completed: Boolean = false
)

data class PrefillSet(
    val setNumber: Int,
    val reps: Int,
    val weightKg: Double?
)

// Sealed state for the workout list screen
sealed class WorkoutListState {
    object Loading : WorkoutListState()
    data class Success(val assignments: List<ActiveAssignment>) : WorkoutListState()
    data class Error(val message: String) : WorkoutListState()
}

// Sealed state for the active session
sealed class SessionState {
    object Idle : SessionState()
    data class Active(
        val assignment: ActiveAssignment,
        val sessionId: String,
        val currentExerciseIndex: Int = 0,
        val sets: Map<String, List<LoggedSet>> = emptyMap(),   // exerciseId → sets
        val prefill: Map<String, List<PrefillSet>> = emptyMap(),
        val startedAt: Long = System.currentTimeMillis()
    ) : SessionState()
    object Saving : SessionState()
    data class Finished(val durationSeconds: Int) : SessionState()
    data class Error(val message: String) : SessionState()
}

// ─── ViewModel ───────────────────────────────────────────────────────────────

@HiltViewModel
class WorkoutViewModel @Inject constructor(
    private val supabase: SupabaseClient
) : ViewModel() {

    private val _listState = MutableStateFlow<WorkoutListState>(WorkoutListState.Loading)
    val listState: StateFlow<WorkoutListState> = _listState.asStateFlow()

    private val _sessionState = MutableStateFlow<SessionState>(SessionState.Idle)
    val sessionState: StateFlow<SessionState> = _sessionState.asStateFlow()

    init { loadAssignments() }

    fun loadAssignments() {
        viewModelScope.launch {
            _listState.value = WorkoutListState.Loading
            try {
                val userId = supabase.gotrue.currentUserOrNull()?.id
                    ?: throw IllegalStateException("Not authenticated")

                val rows = supabase.postgrest["workout_assignments"]
                    .select {
                        filter {
                            eq("client_id", userId)
                            eq("status", "assigned")
                        }
                    }
                    .decodeList<AssignmentRow>()

                // For each assignment, fetch template + exercises
                val assignments = rows.map { row ->
                    val exercises = supabase.postgrest["workout_template_exercises"]
                        .select {
                            filter { eq("template_id", row.template_id) }
                            order("sort_order")
                        }
                        .decodeList<WteRow>()

                    val exerciseDetails = exercises.map { wte ->
                        val ex = supabase.postgrest["exercises"]
                            .select { filter { eq("id", wte.exercise_id) } }
                            .decodeSingle<ExerciseRow>()
                        ExerciseInTemplate(
                            id = wte.exercise_id,
                            name = ex.name,
                            sortOrder = wte.sort_order,
                            targetSets = wte.target_sets,
                            repMin = wte.rep_min,
                            repMax = wte.rep_max,
                            restSeconds = wte.rest_seconds,
                            notes = wte.notes,
                            primaryMuscles = ex.primary_muscles,
                            equipment = ex.equipment
                        )
                    }

                    val template = supabase.postgrest["workout_templates"]
                        .select { filter { eq("id", row.template_id) } }
                        .decodeSingle<TemplateRow>()

                    ActiveAssignment(
                        assignmentId = row.id,
                        templateId = row.template_id,
                        templateTitle = template.title,
                        exercises = exerciseDetails
                    )
                }

                _listState.value = WorkoutListState.Success(assignments)
            } catch (e: Exception) {
                _listState.value = WorkoutListState.Error(e.message ?: "Failed to load workouts")
            }
        }
    }

    fun startSession(assignment: ActiveAssignment) {
        viewModelScope.launch {
            try {
                val userId = supabase.gotrue.currentUserOrNull()?.id ?: return@launch

                // Create session row
                val session = supabase.postgrest["workout_sessions"]
                    .insert(
                        mapOf(
                            "client_id"     to userId,
                            "template_id"   to assignment.templateId,
                            "assignment_id" to assignment.assignmentId,
                            "performed_at"  to Clock.System.now().toString()
                        )
                    )
                    .decodeSingle<SessionRow>()

                // Build initial empty sets and prefill
                val initialSets = assignment.exercises.associate { ex ->
                    ex.id to (1..ex.targetSets).map { n ->
                        LoggedSet(setNumber = n, reps = ex.repMin, weightKg = null, rpe = null)
                    }
                }

                val prefillMap = assignment.exercises.associate { ex ->
                    ex.id to fetchPrefill(userId, ex.id)
                }

                _sessionState.value = SessionState.Active(
                    assignment = assignment,
                    sessionId = session.id,
                    sets = initialSets,
                    prefill = prefillMap
                )
            } catch (e: Exception) {
                _sessionState.value = SessionState.Error(e.message ?: "Failed to start session")
            }
        }
    }

    private suspend fun fetchPrefill(userId: String, exerciseId: String): List<PrefillSet> = try {
        supabase.postgrest.rpc(
            "get_last_session_sets",
            mapOf("p_client_id" to userId, "p_exercise_id" to exerciseId)
        ).decodeList<PrefillRow>().map {
            PrefillSet(setNumber = it.set_number, reps = it.reps, weightKg = it.weight_kg)
        }
    } catch (_: Exception) {
        emptyList()
    }

    fun updateSet(exerciseId: String, setIndex: Int, reps: Int, weightKg: Double?, rpe: Double?) {
        val current = _sessionState.value as? SessionState.Active ?: return
        val updatedSets = current.sets.toMutableMap()
        val exSets = updatedSets[exerciseId]?.toMutableList() ?: return
        exSets[setIndex] = exSets[setIndex].copy(reps = reps, weightKg = weightKg, rpe = rpe)
        updatedSets[exerciseId] = exSets
        _sessionState.value = current.copy(sets = updatedSets)
    }

    fun completeSet(exerciseId: String, setIndex: Int) {
        val current = _sessionState.value as? SessionState.Active ?: return
        val updatedSets = current.sets.toMutableMap()
        val exSets = updatedSets[exerciseId]?.toMutableList() ?: return
        exSets[setIndex] = exSets[setIndex].copy(completed = true)
        updatedSets[exerciseId] = exSets
        _sessionState.value = current.copy(sets = updatedSets)
    }

    fun nextExercise() {
        val current = _sessionState.value as? SessionState.Active ?: return
        val next = current.currentExerciseIndex + 1
        if (next < current.assignment.exercises.size) {
            _sessionState.value = current.copy(currentExerciseIndex = next)
        }
    }

    fun prevExercise() {
        val current = _sessionState.value as? SessionState.Active ?: return
        val prev = (current.currentExerciseIndex - 1).coerceAtLeast(0)
        _sessionState.value = current.copy(currentExerciseIndex = prev)
    }

    fun finishSession() {
        val current = _sessionState.value as? SessionState.Active ?: return
        viewModelScope.launch {
            _sessionState.value = SessionState.Saving
            try {
                val durationSeconds = ((System.currentTimeMillis() - current.startedAt) / 1000).toInt()

                // Persist all completed sets
                current.sets.forEach { (exerciseId, sets) ->
                    val rows = sets.filter { it.completed }.map { s ->
                        mapOf(
                            "session_id"   to current.sessionId,
                            "exercise_id"  to exerciseId,
                            "set_number"   to s.setNumber,
                            "reps"         to s.reps,
                            "weight_kg"    to s.weightKg,
                            "rpe"          to s.rpe,
                            "completed_at" to Clock.System.now().toString()
                        ).filterValues { it != null }
                    }
                    if (rows.isNotEmpty()) {
                        supabase.postgrest["workout_session_sets"].insert(rows)
                    }
                }

                // Update session duration
                supabase.postgrest["workout_sessions"]
                    .update(mapOf("duration_seconds" to durationSeconds)) {
                        filter { eq("id", current.sessionId) }
                    }

                // Mark assignment complete
                supabase.postgrest["workout_assignments"]
                    .update(mapOf("status" to "completed")) {
                        filter { eq("id", current.assignment.assignmentId) }
                    }

                _sessionState.value = SessionState.Finished(durationSeconds)
                loadAssignments()
            } catch (e: Exception) {
                _sessionState.value = SessionState.Error(e.message ?: "Failed to save session")
            }
        }
    }

    fun dismissSession() {
        _sessionState.value = SessionState.Idle
    }
}

// ─── Serialization DTOs ──────────────────────────────────────────────────────

@Serializable
private data class AssignmentRow(
    val id: String,
    val template_id: String,
    val client_id: String,
    val status: String
)

@Serializable
private data class TemplateRow(
    val id: String,
    val title: String,
    val description: String? = null
)

@Serializable
private data class WteRow(
    val id: String,
    val template_id: String,
    val exercise_id: String,
    val sort_order: Int,
    val target_sets: Int,
    val rep_min: Int,
    val rep_max: Int,
    val rest_seconds: Int,
    val notes: String? = null
)

@Serializable
private data class ExerciseRow(
    val id: String,
    val name: String,
    val primary_muscles: List<String>,
    val secondary_muscles: List<String>,
    val equipment: String? = null,
    val category: String,
    val level: String
)

@Serializable
private data class SessionRow(
    val id: String,
    val client_id: String
)

@Serializable
private data class PrefillRow(
    val set_number: Int,
    val reps: Int,
    val weight_kg: Double? = null,
    val rpe: Double? = null
)
