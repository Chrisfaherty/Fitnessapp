import Foundation

// MARK: - MockHealthDataClient (for unit tests)
final class MockHealthDataClient: HealthDataClient {
    var authorizedResult: Bool = true
    var authorizationError: Error? = nil
    var metricsToReturn: [DailyMetrics] = []
    var workoutsToReturn: [WorkoutEvent] = []

    var requestAuthorizationCallCount = 0
    var fetchMetricsCallCount = 0
    var fetchWorkoutsCallCount = 0

    func requestAuthorization() async throws {
        requestAuthorizationCallCount += 1
        if let error = authorizationError { throw error }
    }

    var isAuthorized: Bool {
        get async { authorizedResult }
    }

    func fetchDailyMetrics(from start: Date, to end: Date) async throws -> [DailyMetrics] {
        fetchMetricsCallCount += 1
        return metricsToReturn
    }

    func fetchWorkouts(from start: Date, to end: Date) async throws -> [WorkoutEvent] {
        fetchWorkoutsCallCount += 1
        return workoutsToReturn
    }

    // MARK: - Test helpers
    static func withSampleMetrics(days: Int = 7, userId: String = "test-user") -> MockHealthDataClient {
        let client = MockHealthDataClient()
        let cal = Calendar.current
        let today = cal.startOfDay(for: Date())
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        client.metricsToReturn = (0..<days).map { offset in
            let date = cal.date(byAdding: .day, value: -offset, to: today)!
            return DailyMetrics(
                userId: userId,
                date: formatter.string(from: date),
                steps: 8000 + Int.random(in: -2000...3000),
                activeEnergyKcal: 350 + Double.random(in: -100...150),
                weightKg: 80 + Double.random(in: -1...1),
                nutritionKcal: 2200 + Double.random(in: -400...400),
                proteinG: 160 + Double.random(in: -30...30),
                carbsG: 200 + Double.random(in: -50...50),
                fatG: 70 + Double.random(in: -20...20),
                sources: ["HealthKit", "MyFitnessPal via HealthKit"]
            )
        }
        return client
    }
}
