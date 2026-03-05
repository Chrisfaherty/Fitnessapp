import Foundation
import Supabase

// MARK: - SyncService
// Orchestrates HealthKit → Supabase sync.
// Backfill: last 30 days. Incremental: last 7 days daily, last 14 days workouts.

@MainActor
final class SyncService: ObservableObject {
    static let shared = SyncService()

    @Published private(set) var isSyncing = false
    @Published private(set) var lastSyncDate: Date?
    @Published var error: Error?

    private let supabase = SupabaseService.shared.client
    private let healthClient: HealthDataClient

    private init(healthClient: HealthDataClient = HealthKitClient()) {
        self.healthClient = healthClient
    }

    // MARK: - Initial Backfill (called after login + HealthKit auth)
    func performInitialBackfill(userId: String) async {
        guard !isSyncing else { return }
        isSyncing = true
        defer { isSyncing = false }

        let end = Date()
        let start = Calendar.current.date(byAdding: .day, value: -30, to: end)!

        do {
            try await healthClient.requestAuthorization()
            async let metricsTask = healthClient.fetchDailyMetrics(from: start, to: end)
            async let workoutsTask = healthClient.fetchWorkouts(from: start, to: end)
            let (metrics, workouts) = try await (metricsTask, workoutsTask)

            try await upsertDailyMetrics(metrics, userId: userId)
            try await upsertWorkouts(workouts, userId: userId)
            lastSyncDate = Date()
        } catch {
            self.error = error
        }
    }

    // MARK: - Incremental Sync
    func performIncrementalSync(userId: String) async {
        guard !isSyncing else { return }
        isSyncing = true
        defer { isSyncing = false }

        let end = Date()
        let dailyStart    = Calendar.current.date(byAdding: .day, value: -7,  to: end)!
        let workoutStart  = Calendar.current.date(byAdding: .day, value: -14, to: end)!

        do {
            async let metricsTask = healthClient.fetchDailyMetrics(from: dailyStart, to: end)
            async let workoutsTask = healthClient.fetchWorkouts(from: workoutStart, to: end)
            let (metrics, workouts) = try await (metricsTask, workoutsTask)

            try await upsertDailyMetrics(metrics, userId: userId)
            try await upsertWorkouts(workouts, userId: userId)
            lastSyncDate = Date()
        } catch {
            self.error = error
        }
    }

    // MARK: - Private upsert helpers
    private func upsertDailyMetrics(_ metrics: [DailyMetrics], userId: String) async throws {
        let rows = metrics.map { m in
            HealthDailyRow(
                userId: userId,
                date: m.date,
                steps: m.steps,
                activeEnergyKcal: m.activeEnergyKcal,
                weightKg: m.weightKg,
                nutritionKcal: m.nutritionKcal,
                proteinG: m.proteinG,
                carbsG: m.carbsG,
                fatG: m.fatG,
                sources: m.sources
            )
        }.filter { !$0.isEmpty }

        guard !rows.isEmpty else { return }

        try await supabase
            .from("health_daily")
            .upsert(rows, onConflict: "user_id,date")
            .execute()
    }

    private func upsertWorkouts(_ workouts: [WorkoutEvent], userId: String) async throws {
        let rows = workouts.map { w in
            HealthWorkoutRow(
                userId: userId,
                externalId: w.externalId,
                workoutType: w.workoutType,
                startAt: ISO8601DateFormatter().string(from: w.startAt),
                endAt: ISO8601DateFormatter().string(from: w.endAt),
                kcal: w.kcal,
                sourceApp: w.sourceApp,
                sourceBundle: w.sourceBundle
            )
        }

        guard !rows.isEmpty else { return }

        try await supabase
            .from("health_workouts")
            .upsert(rows, onConflict: "user_id,external_id")
            .execute()
    }
}

// MARK: - Codable rows for upsert
private struct HealthDailyRow: Codable {
    let userId: String
    let date: String
    let steps: Int?
    let activeEnergyKcal: Double?
    let weightKg: Double?
    let nutritionKcal: Double?
    let proteinG: Double?
    let carbsG: Double?
    let fatG: Double?
    let sources: [String]

    var isEmpty: Bool {
        steps == nil && activeEnergyKcal == nil && weightKg == nil && nutritionKcal == nil
    }

    enum CodingKeys: String, CodingKey {
        case date, steps, sources
        case userId          = "user_id"
        case activeEnergyKcal = "active_energy_kcal"
        case weightKg        = "weight_kg"
        case nutritionKcal   = "nutrition_kcal"
        case proteinG        = "protein_g"
        case carbsG          = "carbs_g"
        case fatG            = "fat_g"
    }
}

private struct HealthWorkoutRow: Codable {
    let userId: String
    let externalId: String
    let workoutType: String
    let startAt: String
    let endAt: String
    let kcal: Double?
    let sourceApp: String?
    let sourceBundle: String?

    enum CodingKeys: String, CodingKey {
        case kcal
        case userId      = "user_id"
        case externalId  = "external_id"
        case workoutType = "workout_type"
        case startAt     = "start_at"
        case endAt       = "end_at"
        case sourceApp   = "source_app"
        case sourceBundle = "source_bundle"
    }
}
