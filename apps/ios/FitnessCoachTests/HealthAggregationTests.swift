import XCTest
@testable import FitnessCoach

final class HealthAggregationTests: XCTestCase {

    // MARK: - DailyMetrics merging

    func test_merging_prefersnewer_nonNilValues() {
        let older = DailyMetrics(
            userId: "u1", date: "2024-01-01",
            steps: 5000, activeEnergyKcal: nil, weightKg: 80,
            nutritionKcal: nil, proteinG: nil, carbsG: nil, fatG: nil,
            sources: ["HealthKit"]
        )
        let newer = DailyMetrics(
            userId: "u1", date: "2024-01-01",
            steps: nil, activeEnergyKcal: 400, weightKg: 80.2,
            nutritionKcal: 2100, proteinG: 160, carbsG: 220, fatG: 70,
            sources: ["MyFitnessPal via HealthKit"]
        )
        let merged = older.merging(newer)
        XCTAssertEqual(merged.steps, 5000)              // older preserved
        XCTAssertEqual(merged.activeEnergyKcal, 400)    // newer added
        XCTAssertEqual(merged.weightKg, 80.2)           // newer wins
        XCTAssertEqual(merged.nutritionKcal, 2100)
        XCTAssertEqual(merged.sources.count, 2)
    }

    func test_merging_deduplicatesSources() {
        let a = DailyMetrics(userId: "u", date: "2024-01-01", steps: nil, activeEnergyKcal: nil, weightKg: nil, nutritionKcal: nil, proteinG: nil, carbsG: nil, fatG: nil, sources: ["HealthKit", "MyFitnessPal via HealthKit"])
        let b = DailyMetrics(userId: "u", date: "2024-01-01", steps: nil, activeEnergyKcal: nil, weightKg: nil, nutritionKcal: nil, proteinG: nil, carbsG: nil, fatG: nil, sources: ["HealthKit"])
        let merged = a.merging(b)
        XCTAssertEqual(Set(merged.sources).count, merged.sources.count, "Sources should be deduplicated")
    }

    // MARK: - WeeklyStats

    func test_weeklyStats_computesAverages() {
        let days: [DailyMetrics] = [
            DailyMetrics(userId: "u", date: "2024-01-01", steps: 8000, activeEnergyKcal: 300, weightKg: 80, nutritionKcal: 2000, proteinG: 150, carbsG: 200, fatG: 60, sources: []),
            DailyMetrics(userId: "u", date: "2024-01-02", steps: 10000, activeEnergyKcal: 400, weightKg: 79.5, nutritionKcal: 2200, proteinG: 170, carbsG: 220, fatG: 70, sources: []),
        ]
        let stats = WeeklyStats.from(days: days, workoutsCount: 3, weekStart: Date())
        XCTAssertEqual(stats.avgSteps ?? 0, 9000, accuracy: 1)
        XCTAssertEqual(stats.avgWeightKg ?? 0, 79.75, accuracy: 0.01)
        XCTAssertEqual(stats.workoutsCount, 3)
    }

    func test_weeklyStats_handlesAllNilMetrics() {
        let days: [DailyMetrics] = [
            DailyMetrics(userId: "u", date: "2024-01-01", steps: nil, activeEnergyKcal: nil, weightKg: nil, nutritionKcal: nil, proteinG: nil, carbsG: nil, fatG: nil, sources: [])
        ]
        let stats = WeeklyStats.from(days: days, workoutsCount: 0, weekStart: Date())
        XCTAssertNil(stats.avgSteps)
        XCTAssertNil(stats.avgWeightKg)
    }

    // MARK: - MockHealthDataClient

    func test_mockClient_returnsInjectedMetrics() async throws {
        let mock = MockHealthDataClient.withSampleMetrics(days: 7, userId: "test")
        let metrics = try await mock.fetchDailyMetrics(from: Date(), to: Date())
        XCTAssertEqual(metrics.count, 7)
        XCTAssertEqual(mock.fetchMetricsCallCount, 1)
    }

    func test_mockClient_authorizationError_throws() async {
        let mock = MockHealthDataClient()
        mock.authorizationError = HealthDataError.authorizationDenied
        do {
            try await mock.requestAuthorization()
            XCTFail("Should have thrown")
        } catch let err as HealthDataError {
            if case .authorizationDenied = err { /* pass */ } else { XCTFail("Wrong error") }
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }

    // MARK: - WorkoutEvent

    func test_workoutEvent_durationMinutes() {
        let start = Date()
        let end = Calendar.current.date(byAdding: .minute, value: 45, to: start)!
        let event = WorkoutEvent(userId: "u", externalId: "abc", workoutType: "Running",
                                  startAt: start, endAt: end, kcal: 350, sourceApp: "Strava", sourceBundle: nil)
        XCTAssertEqual(event.durationMinutes, 45)
    }
}
