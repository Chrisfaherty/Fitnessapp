import Foundation

// MARK: - Daily Metrics (domain model matching DB schema)
struct DailyMetrics: Codable, Equatable {
    let userId: String
    let date: String          // ISO date "YYYY-MM-DD"
    var steps: Int?
    var activeEnergyKcal: Double?
    var weightKg: Double?
    var nutritionKcal: Double?
    var proteinG: Double?
    var carbsG: Double?
    var fatG: Double?
    var sources: [String]

    enum CodingKeys: String, CodingKey {
        case date, sources
        case userId          = "user_id"
        case steps
        case activeEnergyKcal = "active_energy_kcal"
        case weightKg        = "weight_kg"
        case nutritionKcal   = "nutrition_kcal"
        case proteinG        = "protein_g"
        case carbsG          = "carbs_g"
        case fatG            = "fat_g"
    }

    // Merge a newer record in, keeping non-nil values from both, preferring newer
    func merging(_ newer: DailyMetrics) -> DailyMetrics {
        DailyMetrics(
            userId: userId,
            date: date,
            steps: newer.steps ?? steps,
            activeEnergyKcal: newer.activeEnergyKcal ?? activeEnergyKcal,
            weightKg: newer.weightKg ?? weightKg,
            nutritionKcal: newer.nutritionKcal ?? nutritionKcal,
            proteinG: newer.proteinG ?? proteinG,
            carbsG: newer.carbsG ?? carbsG,
            fatG: newer.fatG ?? fatG,
            sources: Array(Set(sources + newer.sources))
        )
    }
}

// MARK: - Workout Event (from OS health hub)
struct WorkoutEvent: Codable, Equatable {
    let userId: String
    let externalId: String
    let workoutType: String
    let startAt: Date
    let endAt: Date
    var kcal: Double?
    var sourceApp: String?
    var sourceBundle: String?

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

    var durationMinutes: Int {
        Int(endAt.timeIntervalSince(startAt) / 60)
    }
}

// MARK: - Aggregated stats (for dashboard display)
struct WeeklyStats {
    let weekStart: Date
    let avgSteps: Double?
    let avgCalories: Double?
    let avgProteinG: Double?
    let avgWeightKg: Double?
    let workoutsCount: Int
    let days: [DailyMetrics]

    static func from(days: [DailyMetrics], workoutsCount: Int, weekStart: Date) -> WeeklyStats {
        func avg(_ values: [Double?]) -> Double? {
            let valid = values.compactMap { $0 }
            guard !valid.isEmpty else { return nil }
            return valid.reduce(0, +) / Double(valid.count)
        }
        return WeeklyStats(
            weekStart: weekStart,
            avgSteps: avg(days.map { $0.steps.map(Double.init) }),
            avgCalories: avg(days.map { $0.nutritionKcal }),
            avgProteinG: avg(days.map { $0.proteinG }),
            avgWeightKg: avg(days.map { $0.weightKg }),
            workoutsCount: workoutsCount,
            days: days
        )
    }
}
