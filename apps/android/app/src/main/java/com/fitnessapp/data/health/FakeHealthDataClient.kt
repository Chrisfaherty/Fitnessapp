package com.fitnessapp.data.health

import com.fitnessapp.data.model.DailyMetrics
import com.fitnessapp.data.model.WorkoutEvent
import java.time.LocalDate
import java.time.format.DateTimeFormatter

/** Fake implementation for unit tests and previews. */
class FakeHealthDataClient(
    private val available: Boolean = true,
    private val hasPerms: Boolean = true,
    private val metricsToReturn: List<DailyMetrics> = emptyList(),
    private val workoutsToReturn: List<WorkoutEvent> = emptyList()
) : HealthDataClient {

    var fetchMetricsCallCount = 0
    var fetchWorkoutsCallCount = 0
    var fetchStepsCallCount = 0

    override suspend fun isAvailable() = available
    override suspend fun hasPermissions() = hasPerms
    override fun requiredPermissions() = emptySet<String>()

    override suspend fun fetchDailySteps(startDate: String, endDate: String): Map<String, Long> {
        fetchStepsCallCount++
        return metricsToReturn.associate { it.date to (it.steps?.toLong() ?: 0L) }
    }

    override suspend fun fetchDailyWeight(startDate: String, endDate: String): Map<String, Double> =
        metricsToReturn.associate { it.date to (it.weightKg ?: 0.0) }

    override suspend fun fetchExerciseSessions(startDate: String, endDate: String): List<WorkoutEvent> {
        fetchWorkoutsCallCount++
        return workoutsToReturn
    }

    override suspend fun fetchDailyNutrition(startDate: String, endDate: String): Map<String, NutritionTotals> =
        metricsToReturn.associate { m ->
            m.date to NutritionTotals(m.nutritionKcal, m.proteinG, m.carbsG, m.fatG)
        }

    override suspend fun fetchDailyMetrics(startDate: String, endDate: String): List<DailyMetrics> {
        fetchMetricsCallCount++
        return metricsToReturn
    }

    companion object {
        fun withSampleData(userId: String = "test-user", days: Int = 7): FakeHealthDataClient {
            val fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd")
            val today = LocalDate.now()
            val metrics = (0 until days).map { offset ->
                val date = today.minusDays(offset.toLong()).format(fmt)
                DailyMetrics(
                    userId = userId,
                    date = date,
                    steps = (7000..12000).random(),
                    weightKg = 79.0 + (0..20).random() / 10.0,
                    nutritionKcal = (1800..2500).random().toDouble(),
                    proteinG = (140..200).random().toDouble(),
                    carbsG = (180..250).random().toDouble(),
                    fatG = (55..85).random().toDouble(),
                    sources = listOf("Health Connect", "MyFitnessPal")
                )
            }
            return FakeHealthDataClient(metricsToReturn = metrics)
        }
    }
}
