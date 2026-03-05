package com.fitnessapp

import com.fitnessapp.data.health.FakeHealthDataClient
import com.fitnessapp.data.model.DailyMetrics
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Test

class HealthAggregationTest {

    @Test
    fun `FakeHealthDataClient returns injected metrics`() = runTest {
        val fake = FakeHealthDataClient.withSampleData(days = 7)
        val metrics = fake.fetchDailyMetrics("2024-01-01", "2024-01-07")
        assertEquals(7, metrics.size)
        assertEquals(1, fake.fetchMetricsCallCount)
    }

    @Test
    fun `FakeHealthDataClient isAvailable returns configured value`() = runTest {
        val unavailable = FakeHealthDataClient(available = false)
        assertFalse(unavailable.isAvailable())
        val available = FakeHealthDataClient(available = true)
        assertTrue(available.isAvailable())
    }

    @Test
    fun `DailyMetrics has correct fields mapped`() {
        val m = DailyMetrics(
            userId = "user-1",
            date = "2024-01-15",
            steps = 9500,
            weightKg = 80.2,
            nutritionKcal = 2150.0,
            proteinG = 165.0,
            carbsG = 215.0,
            fatG = 72.0,
            sources = listOf("Health Connect", "MyFitnessPal")
        )
        assertEquals("user-1", m.userId)
        assertEquals("2024-01-15", m.date)
        assertEquals(9500, m.steps)
        assertEquals(80.2, m.weightKg ?: 0.0, 0.01)
        assertEquals(2, m.sources.size)
    }

    @Test
    fun `fetchDailySteps returns map keyed by date`() = runTest {
        val metrics = listOf(
            DailyMetrics("u", "2024-01-01", steps = 8000),
            DailyMetrics("u", "2024-01-02", steps = 10000)
        )
        val fake = FakeHealthDataClient(metricsToReturn = metrics)
        val steps = fake.fetchDailySteps("2024-01-01", "2024-01-02")
        assertEquals(8000L, steps["2024-01-01"])
        assertEquals(10000L, steps["2024-01-02"])
    }

    @Test
    fun `fetchExerciseSessions tracks call count`() = runTest {
        val fake = FakeHealthDataClient()
        fake.fetchExerciseSessions("2024-01-01", "2024-01-07")
        fake.fetchExerciseSessions("2024-01-01", "2024-01-07")
        assertEquals(2, fake.fetchWorkoutsCallCount)
    }

    @Test
    fun `metrics with null values are handled gracefully`() = runTest {
        val metrics = listOf(
            DailyMetrics("u", "2024-01-01")  // all nulls
        )
        val fake = FakeHealthDataClient(metricsToReturn = metrics)
        val result = fake.fetchDailyMetrics("2024-01-01", "2024-01-01")
        assertEquals(1, result.size)
        assertNull(result[0].steps)
        assertNull(result[0].weightKg)
        assertNull(result[0].nutritionKcal)
    }
}
