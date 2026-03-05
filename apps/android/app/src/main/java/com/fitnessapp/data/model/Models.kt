package com.fitnessapp.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// ============================================================
// Core domain models — match Supabase schema
// ============================================================

@Serializable
data class Profile(
    val id: String,
    val role: String,
    @SerialName("full_name") val fullName: String,
    @SerialName("avatar_url") val avatarUrl: String? = null,
    val timezone: String = "UTC"
) {
    val isTrainer get() = role == "trainer" || role == "admin"
}

@Serializable
data class DailyMetrics(
    @SerialName("user_id") val userId: String,
    val date: String,                           // "YYYY-MM-DD"
    val steps: Int? = null,
    @SerialName("active_energy_kcal") val activeEnergyKcal: Double? = null,
    @SerialName("weight_kg") val weightKg: Double? = null,
    @SerialName("nutrition_kcal") val nutritionKcal: Double? = null,
    @SerialName("protein_g") val proteinG: Double? = null,
    @SerialName("carbs_g") val carbsG: Double? = null,
    @SerialName("fat_g") val fatG: Double? = null,
    val sources: List<String> = emptyList()
)

@Serializable
data class WorkoutEvent(
    @SerialName("user_id") val userId: String,
    @SerialName("external_id") val externalId: String,
    @SerialName("workout_type") val workoutType: String,
    @SerialName("start_at") val startAt: String,    // ISO-8601
    @SerialName("end_at") val endAt: String,
    val kcal: Double? = null,
    @SerialName("source_app") val sourceApp: String? = null,
    @SerialName("source_bundle") val sourceBundle: String? = null
)

@Serializable
data class Exercise(
    val id: String,
    val name: String,
    val force: String? = null,
    val level: String,
    val mechanic: String? = null,
    val equipment: String? = null,
    val category: String,
    @SerialName("primary_muscles") val primaryMuscles: List<String> = emptyList(),
    @SerialName("secondary_muscles") val secondaryMuscles: List<String> = emptyList(),
    val instructions: List<String> = emptyList(),
    @SerialName("image_paths") val imagePaths: List<String> = emptyList(),
    val source: String = "free-exercise-db"
)

@Serializable
data class WorkoutTemplate(
    val id: String,
    @SerialName("trainer_id") val trainerId: String,
    val title: String,
    val description: String? = null,
    @SerialName("created_at") val createdAt: String = "",
    val exercises: List<WorkoutTemplateExercise> = emptyList()
)

@Serializable
data class WorkoutTemplateExercise(
    val id: String,
    @SerialName("template_id") val templateId: String,
    @SerialName("exercise_id") val exerciseId: String,
    @SerialName("sort_order") val sortOrder: Int = 0,
    @SerialName("target_sets") val targetSets: Int = 3,
    @SerialName("rep_min") val repMin: Int = 8,
    @SerialName("rep_max") val repMax: Int = 12,
    @SerialName("rest_seconds") val restSeconds: Int = 90,
    val notes: String? = null,
    val exercise: Exercise? = null
)

@Serializable
data class WorkoutAssignment(
    val id: String,
    @SerialName("client_id") val clientId: String,
    @SerialName("template_id") val templateId: String,
    @SerialName("trainer_id") val trainerId: String? = null,
    @SerialName("scheduled_date") val scheduledDate: String? = null,
    val status: String,
    val template: WorkoutTemplate? = null
)

@Serializable
data class WorkoutSession(
    val id: String,
    @SerialName("client_id") val clientId: String,
    @SerialName("template_id") val templateId: String? = null,
    @SerialName("assignment_id") val assignmentId: String? = null,
    @SerialName("performed_at") val performedAt: String,
    @SerialName("duration_seconds") val durationSeconds: Int? = null,
    val notes: String? = null
)

@Serializable
data class WorkoutSessionSet(
    val id: String,
    @SerialName("session_id") val sessionId: String,
    @SerialName("exercise_id") val exerciseId: String,
    @SerialName("set_number") val setNumber: Int,
    val reps: Int,
    @SerialName("weight_kg") val weightKg: Double? = null,
    val rpe: Double? = null,
    @SerialName("rest_seconds") val restSeconds: Int? = null
)

// In-memory logged set (UI state)
data class LoggedSet(
    val setNumber: Int,
    var reps: Int,
    var weightKg: Double? = null,
    var rpe: Double? = null,
    var isComplete: Boolean = false
)

// Prefill data from last session
data class LastSessionInfo(
    val exerciseId: String,
    val sets: List<LastSetInfo>,
    val performedAt: String
) {
    val lastSet: LastSetInfo? get() = sets.lastOrNull()
}

data class LastSetInfo(
    val setNumber: Int,
    val reps: Int,
    val weightKg: Double? = null,
    val rpe: Double? = null
)

// Result wrapper
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String, val cause: Throwable? = null) : Result<Nothing>()
    object Loading : Result<Nothing>()
}
