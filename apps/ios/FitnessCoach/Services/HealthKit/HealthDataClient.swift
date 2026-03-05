import Foundation

// MARK: - HealthDataClient Protocol
// Abstracting HealthKit behind this protocol enables MockHealthDataClient for tests

protocol HealthDataClient {
    /// Request HealthKit authorization for all required types.
    func requestAuthorization() async throws

    /// Check whether authorization has been granted.
    var isAuthorized: Bool { get async }

    /// Aggregate daily metrics for a date range.
    func fetchDailyMetrics(from start: Date, to end: Date) async throws -> [DailyMetrics]

    /// Fetch workout events for a date range.
    func fetchWorkouts(from start: Date, to end: Date) async throws -> [WorkoutEvent]
}

// MARK: - Errors
enum HealthDataError: LocalizedError {
    case notAvailable
    case authorizationDenied
    case queryFailed(underlying: Error)
    case encodingFailed

    var errorDescription: String? {
        switch self {
        case .notAvailable:
            return "Health data is not available on this device."
        case .authorizationDenied:
            return "Health data access was denied. Please enable it in Settings > Privacy > Health."
        case .queryFailed(let err):
            return "Health query failed: \(err.localizedDescription)"
        case .encodingFailed:
            return "Failed to encode health data."
        }
    }
}
