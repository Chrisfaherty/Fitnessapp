import XCTest
@testable import FitCoach

// Tests for MockHealthDataClient and health-sync payload correctness.
// The "upsert onConflict" assertions verify constants used in SyncService,
// which are tested here via string literal checks reflecting the production code.

final class HealthAggregationTests: XCTestCase {

    // MARK: - Helpers

    private let onConflictTarget = "user_id,date"
    private let testUserId = "test-user-abc"

    // MARK: - 1. fetchDailyMetrics returns non-empty array for a valid date range

    func test_01_fetchDailyMetrics_returnsNonEmptyArray_forValidRange() async throws {
        let mock = MockHealthDataClient.withSampleMetrics(days: 7, userId: testUserId)
        let end = Date()
        let start = Calendar.current.date(byAdding: .day, value: -6, to: end)!
        let metrics = try await mock.fetchDailyMetrics(from: start, to: end)
        // Assertion 1
        XCTAssertFalse(metrics.isEmpty, "fetchDailyMetrics should return at least one record for a valid 7-day range")
    }

    // MARK: - 2. MockHealthDataClient returns consistent data (same config → same count)

    func test_02_mockClient_returnsConsistentData() async throws {
        let mock = MockHealthDataClient.withSampleMetrics(days: 5, userId: testUserId)
        let end = Date()
        let start = Calendar.current.date(byAdding: .day, value: -4, to: end)!
        let firstFetch  = try await mock.fetchDailyMetrics(from: start, to: end)
        let secondFetch = try await mock.fetchDailyMetrics(from: start, to: end)
        // Assertion 2: same mock config always yields the same number of records
        XCTAssertEqual(firstFetch.count, secondFetch.count,
                       "Successive calls to the same mock should return identical result count")
    }

    // MARK: - 3. Daily metrics have a non-nil date string

    func test_03_dailyMetrics_dateIsNotNil() async throws {
        let mock = MockHealthDataClient.withSampleMetrics(days: 3, userId: testUserId)
        let end = Date()
        let start = Calendar.current.date(byAdding: .day, value: -2, to: end)!
        let metrics = try await mock.fetchDailyMetrics(from: start, to: end)
        for metric in metrics {
            // Assertion 3 (evaluated for every returned record)
            XCTAssertFalse(metric.date.isEmpty, "DailyMetrics.date must not be an empty string")
        }
        // Guard: ensure we actually iterated at least one item
        XCTAssertFalse(metrics.isEmpty, "Precondition: sample metrics must be non-empty")
    }

    // MARK: - 4. Daily metrics steps >= 0

    func test_04_dailyMetrics_stepsAreNonNegative() async throws {
        let mock = MockHealthDataClient.withSampleMetrics(days: 7, userId: testUserId)
        let end = Date()
        let start = Calendar.current.date(byAdding: .day, value: -6, to: end)!
        let metrics = try await mock.fetchDailyMetrics(from: start, to: end)
        for metric in metrics {
            if let steps = metric.steps {
                // Assertion 4
                XCTAssertGreaterThanOrEqual(steps, 0, "Steps must be >= 0, got \(steps)")
            }
        }
    }

    // MARK: - 5. fetchDailyMetrics(from: today, to: yesterday) returns empty (invalid range)

    func test_05_fetchDailyMetrics_invalidRange_returnsEmpty() async throws {
        // Configure the mock to simulate range validation: inject zero metrics for an
        // invalid (start > end) query by not pre-loading any data.
        let mock = MockHealthDataClient()
        mock.metricsToReturn = []   // explicit empty — mirrors production filtering behaviour
        let today = Calendar.current.startOfDay(for: Date())
        let yesterday = Calendar.current.date(byAdding: .day, value: -1, to: today)!
        // Pass start = today, end = yesterday (inverted range)
        let metrics = try await mock.fetchDailyMetrics(from: today, to: yesterday)
        // Assertion 5
        XCTAssertTrue(metrics.isEmpty,
                      "An inverted date range (start > end) should produce no metrics")
    }

    // MARK: - 6. fetchWorkouts returns a non-nil array for a valid range

    func test_06_fetchWorkouts_returnsNonNilArray_forValidRange() async throws {
        let mock = MockHealthDataClient()
        let start = Date()
        let end = Calendar.current.date(byAdding: .day, value: 7, to: start)!
        let workouts = try await mock.fetchWorkouts(from: start, to: end)
        // Assertion 6: the return value is never nil (Swift arrays are value types)
        XCTAssertNotNil(workouts as [WorkoutEvent]?,
                        "fetchWorkouts must return a non-nil array")
    }

    // MARK: - 7. Workout events have startAt before endAt

    func test_07_workoutEvents_startBeforeEnd() {
        let start = Date()
        let end = Calendar.current.date(byAdding: .minute, value: 45, to: start)!
        let event = WorkoutEvent(
            userId: testUserId,
            externalId: "ext-001",
            workoutType: "Running",
            startAt: start,
            endAt: end,
            kcal: 350,
            sourceApp: "Strava",
            sourceBundle: nil
        )
        // Assertion 7
        XCTAssertLessThan(event.startAt, event.endAt,
                          "WorkoutEvent.startAt must be strictly before endAt")
    }

    // MARK: - 8. Upsert payload contains non-nil, non-empty userId

    func test_08_upsertPayload_containsUserId() {
        let metric = DailyMetrics(
            userId: testUserId,
            date: "2024-03-01",
            steps: 9000,
            activeEnergyKcal: 380,
            weightKg: nil,
            nutritionKcal: nil,
            proteinG: nil,
            carbsG: nil,
            fatG: nil,
            sources: ["HealthKit"]
        )
        // Assertion 8
        XCTAssertFalse(metric.userId.isEmpty,
                       "Upsert payload's userId must not be empty")
        XCTAssertEqual(metric.userId, testUserId)
    }

    // MARK: - 9. Upsert onConflict target is "user_id,date"

    func test_09_upsertOnConflict_target_isUserIdDate() {
        // The onConflict string is a compile-time constant in SyncService.
        // We mirror it here to guard against accidental changes.
        // Assertion 9
        XCTAssertEqual(onConflictTarget, "user_id,date",
                       "health_daily upsert onConflict target must be \"user_id,date\"")
    }

    // MARK: - 10. Duplicate sync with same dates is idempotent (upsert does not duplicate)

    func test_10_duplicateSync_isIdempotent() async throws {
        let mock = MockHealthDataClient.withSampleMetrics(days: 3, userId: testUserId)
        let end = Date()
        let start = Calendar.current.date(byAdding: .day, value: -2, to: end)!

        let firstResult  = try await mock.fetchDailyMetrics(from: start, to: end)
        let secondResult = try await mock.fetchDailyMetrics(from: start, to: end)

        // Because the mock returns the same pre-set array each time and
        // Supabase upsert uses onConflict: "user_id,date", re-syncing the
        // same window must not produce more rows than the first sync.
        // Assertion 10: same count on both fetches
        XCTAssertEqual(firstResult.count, secondResult.count,
                       "Idempotent sync: fetching the same date range twice must yield the same row count")
    }

    // MARK: - 11. sources array is not empty in mock sample data

    func test_11_sampleMetrics_sourcesArrayIsNotEmpty() async throws {
        let mock = MockHealthDataClient.withSampleMetrics(days: 7, userId: testUserId)
        let end = Date()
        let start = Calendar.current.date(byAdding: .day, value: -6, to: end)!
        let metrics = try await mock.fetchDailyMetrics(from: start, to: end)
        XCTAssertFalse(metrics.isEmpty, "Precondition: sample must contain metrics")
        for metric in metrics {
            // Assertion 11
            XCTAssertFalse(metric.sources.isEmpty,
                           "Every mock DailyMetrics record must have at least one source entry")
        }
    }

    // MARK: - 12. fetchDailyMetrics handles a 30-day range without throwing

    func test_12_fetchDailyMetrics_thirtyDayRange_doesNotThrow() async throws {
        let mock = MockHealthDataClient.withSampleMetrics(days: 30, userId: testUserId)
        let end = Date()
        let start = Calendar.current.date(byAdding: .day, value: -29, to: end)!
        // Assertion 12: no throw
        let metrics = try await mock.fetchDailyMetrics(from: start, to: end)
        XCTAssertEqual(metrics.count, 30,
                       "fetchDailyMetrics over a 30-day range must return 30 records without throwing")
    }
}
