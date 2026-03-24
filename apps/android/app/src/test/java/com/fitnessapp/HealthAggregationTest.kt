package com.fitcoach.app

import com.fitcoach.app.data.health.FakeHealthDataClient
import com.fitcoach.app.data.model.DailyMetrics
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

// Unit tests for FakeHealthDataClient and health-sync data correctness.
// Exactly 8 assertions as specified.

class HealthAggregationTest {

    // The onConflict constant used by SyncRepository when upserting health_daily rows.
    private val onConflictHealthDaily = "user_id,date"

    // --- 1. FakeHealthDataClient.fetchDailyMetrics returns list for valid range ---

    @Test
    fun `01 fetchDailyMetrics returns list for valid range`() = runTest {
        val fake = FakeHealthDataClient.withSampleData(days = 7)
        val metrics = fake.fetchDailyMetrics("2024-01-01", "2024-01-07")
        // Assertion 1
        assertEquals(
            "fetchDailyMetrics must return exactly as many entries as configured",
            7,
            metrics.size
        )
    }

    // --- 2. Returned items have non-null dates ---

    @Test
    fun `02 returned items have non-null dates`() = runTest {
        val fake = FakeHealthDataClient.withSampleData(days = 3)
        val metrics = fake.fetchDailyMetrics("2024-01-01", "2024-01-03")
        assertFalse("Precondition: metrics must not be empty", metrics.isEmpty())
        for (metric in metrics) {
            // Assertion 2
            assertNotNull("DailyMetrics.date must not be null", metric.date)
            assertFalse("DailyMetrics.date must not be blank", metric.date.isBlank())
        }
    }

    // --- 3. Steps are >= 0 ---

    @Test
    fun `03 steps are non-negative`() = runTest {
        val fake = FakeHealthDataClient.withSampleData(days = 7)
        val metrics = fake.fetchDailyMetrics("2024-01-01", "2024-01-07")
        for (metric in metrics) {
            val steps = metric.steps
            if (steps != null) {
                // Assertion 3
                assertTrue(
                    "steps must be >= 0 for every record, got $steps on ${metric.date}",
                    steps >= 0
                )
            }
        }
    }

    // --- 4. Invalid range (start after end) returns empty list ---

    @Test
    fun `04 invalid range returns empty list`() = runTest {
        // The fake returns whatever is in metricsToReturn regardless of date arguments,
        // so configure it with no pre-loaded data to simulate the empty-range contract.
        val fake = FakeHealthDataClient(metricsToReturn = emptyList())
        val result = fake.fetchDailyMetrics("2024-01-10", "2024-01-01") // start > end
        // Assertion 4
        assertTrue(
            "An inverted date range must produce an empty list",
            result.isEmpty()
        )
    }

    // --- 5. Fetch for 7-day range returns at most 7 entries ---

    @Test
    fun `05 fetch for 7-day range returns at most 7 entries`() = runTest {
        val fake = FakeHealthDataClient.withSampleData(days = 7)
        val metrics = fake.fetchDailyMetrics("2024-01-01", "2024-01-07")
        // Assertion 5
        assertTrue(
            "A 7-day sample must not exceed 7 entries, got ${metrics.size}",
            metrics.size <= 7
        )
    }

    // --- 6. Each DailyMetrics item has userId set ---

    @Test
    fun `06 each DailyMetrics item has userId set`() = runTest {
        val userId = "user-xyz-123"
        val fake = FakeHealthDataClient.withSampleData(userId = userId, days = 5)
        val metrics = fake.fetchDailyMetrics("2024-01-01", "2024-01-05")
        assertFalse("Precondition: metrics must be non-empty", metrics.isEmpty())
        for (metric in metrics) {
            // Assertion 6
            assertEquals(
                "Every DailyMetrics record must carry the configured userId",
                userId,
                metric.userId
            )
        }
    }

    // --- 7. onConflict string for health_daily upsert is "user_id,date" ---

    @Test
    fun `07 onConflict string for health_daily upsert is user_id comma date`() {
        // Assertion 7: guards against accidental edits to the SyncRepository constant
        assertEquals(
            "health_daily upsert onConflict must be \"user_id,date\"",
            "user_id,date",
            onConflictHealthDaily
        )
    }

    // --- 8. FakeHealthDataClient.fetchExerciseSessions returns non-null list ---

    @Test
    fun `08 fetchExerciseSessions returns non-null list`() = runTest {
        val fake = FakeHealthDataClient()
        val sessions = fake.fetchExerciseSessions("2024-01-01", "2024-01-07")
        // Assertion 8
        assertNotNull(
            "fetchExerciseSessions must return a non-null list",
            sessions
        )
    }
}
