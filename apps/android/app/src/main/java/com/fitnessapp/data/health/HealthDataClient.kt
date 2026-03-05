package com.fitnessapp.data.health

import com.fitnessapp.data.model.DailyMetrics
import com.fitnessapp.data.model.WorkoutEvent

// ============================================================
// HealthDataClient interface
// Abstracting Health Connect behind this interface enables
// FakeHealthDataClient for unit tests.
// ============================================================

interface HealthDataClient {

    /** Returns true if Health Connect is available on this device. */
    suspend fun isAvailable(): Boolean

    /** Returns true if all required permissions are granted. */
    suspend fun hasPermissions(): Boolean

    /**
     * Returns a list of Health Connect permission strings required by this client.
     * The caller (Activity) must launch the permission request.
     */
    fun requiredPermissions(): Set<String>

    /** Aggregate steps for each day in the range. */
    suspend fun fetchDailySteps(startDate: String, endDate: String): Map<String, Long>

    /** Latest body weight record per day. */
    suspend fun fetchDailyWeight(startDate: String, endDate: String): Map<String, Double>

    /** Exercise sessions in the date range. */
    suspend fun fetchExerciseSessions(startDate: String, endDate: String): List<WorkoutEvent>

    /** Daily nutrition totals (may be empty if no nutrition app present). */
    suspend fun fetchDailyNutrition(startDate: String, endDate: String): Map<String, NutritionTotals>

    /** Aggregate all daily metrics into domain model. */
    suspend fun fetchDailyMetrics(startDate: String, endDate: String): List<DailyMetrics>
}

data class NutritionTotals(
    val kcal: Double? = null,
    val proteinG: Double? = null,
    val carbsG: Double? = null,
    val fatG: Double? = null,
    val source: String? = null
)
