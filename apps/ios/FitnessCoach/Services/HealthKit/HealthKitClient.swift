import Foundation
import HealthKit

// MARK: - HealthKitClient
// Real implementation that reads from HealthKit

final class HealthKitClient: HealthDataClient {

    private let healthStore = HKHealthStore()
    private let dateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.timeZone = .current
        return f
    }()

    // Types we read
    private var readTypes: Set<HKObjectType> {
        var types: Set<HKObjectType> = []
        let quantityTypes: [HKQuantityTypeIdentifier] = [
            .stepCount,
            .activeEnergyBurned,
            .bodyMass,
            .dietaryEnergyConsumed,
            .dietaryProtein,
            .dietaryCarbohydrates,
            .dietaryFatTotal,
        ]
        for id in quantityTypes {
            if let t = HKQuantityType.quantityType(forIdentifier: id) {
                types.insert(t)
            }
        }
        types.insert(HKObjectType.workoutType())
        return types
    }

    func requestAuthorization() async throws {
        guard HKHealthStore.isHealthDataAvailable() else { throw HealthDataError.notAvailable }
        try await healthStore.requestAuthorization(toShare: [], read: readTypes)
    }

    var isAuthorized: Bool {
        get async {
            guard HKHealthStore.isHealthDataAvailable() else { return false }
            let status = healthStore.authorizationStatus(for: HKObjectType.workoutType())
            return status == .sharingAuthorized
        }
    }

    // MARK: - Daily Metrics
    func fetchDailyMetrics(from start: Date, to end: Date) async throws -> [DailyMetrics] {
        async let stepsMap       = fetchDailyQuantity(.stepCount,              unit: .count(),           from: start, to: end, options: .cumulativeSum)
        async let energyMap      = fetchDailyQuantity(.activeEnergyBurned,     unit: .kilocalorie(),     from: start, to: end, options: .cumulativeSum)
        async let weightMap      = fetchDailyQuantity(.bodyMass,               unit: .gramUnit(with: .kilo), from: start, to: end, options: .discreteAverage)
        async let kcalMap        = fetchDailyQuantity(.dietaryEnergyConsumed,  unit: .kilocalorie(),     from: start, to: end, options: .cumulativeSum)
        async let proteinMap     = fetchDailyQuantity(.dietaryProtein,         unit: .gram(),            from: start, to: end, options: .cumulativeSum)
        async let carbsMap       = fetchDailyQuantity(.dietaryCarbohydrates,   unit: .gram(),            from: start, to: end, options: .cumulativeSum)
        async let fatMap         = fetchDailyQuantity(.dietaryFatTotal,        unit: .gram(),            from: start, to: end, options: .cumulativeSum)

        let (steps, energy, weight, kcal, protein, carbs, fat) = try await (stepsMap, energyMap, weightMap, kcalMap, proteinMap, carbsMap, fatMap)

        var results: [DailyMetrics] = []
        var current = Calendar.current.startOfDay(for: start)

        while current < end {
            let dateStr = dateFormatter.string(from: current)
            let metrics = DailyMetrics(
                userId: "",   // filled by SyncService
                date: dateStr,
                steps: steps[dateStr].map(Int.init),
                activeEnergyKcal: energy[dateStr],
                weightKg: weight[dateStr],
                nutritionKcal: kcal[dateStr],
                proteinG: protein[dateStr],
                carbsG: carbs[dateStr],
                fatG: fat[dateStr],
                sources: ["HealthKit"]
            )
            results.append(metrics)
            current = Calendar.current.date(byAdding: .day, value: 1, to: current)!
        }

        return results
    }

    // MARK: - Workouts
    func fetchWorkouts(from start: Date, to end: Date) async throws -> [WorkoutEvent] {
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)
        let descriptor = HKQueryDescriptor(sampleType: HKObjectType.workoutType(), predicate: predicate)
        let results = try await healthStore.samples(matching: descriptor, resultsLimit: 500)

        return results.compactMap { sample -> WorkoutEvent? in
            guard let workout = sample as? HKWorkout else { return nil }

            let sourceApp = workout.sourceRevision.source.name
            let sourceBundle = workout.sourceRevision.source.bundleIdentifier

            return WorkoutEvent(
                userId: "",  // filled by SyncService
                externalId: workout.uuid.uuidString,
                workoutType: workout.workoutActivityType.commonName,
                startAt: workout.startDate,
                endAt: workout.endDate,
                kcal: workout.totalEnergyBurned?.doubleValue(for: .kilocalorie()),
                sourceApp: sourceApp,
                sourceBundle: sourceBundle
            )
        }
    }

    // MARK: - Private: Statistics query helper
    private func fetchDailyQuantity(
        _ identifier: HKQuantityTypeIdentifier,
        unit: HKUnit,
        from start: Date,
        to end: Date,
        options: HKStatisticsOptions
    ) async throws -> [String: Double] {

        guard let quantityType = HKQuantityType.quantityType(forIdentifier: identifier) else {
            return [:]
        }

        let interval = DateComponents(day: 1)
        let anchorDate = Calendar.current.startOfDay(for: start)
        let predicate = HKQuery.predicateForSamples(withStart: start, end: end, options: .strictStartDate)

        return try await withCheckedThrowingContinuation { continuation in
            let query = HKStatisticsCollectionQuery(
                quantityType: quantityType,
                quantitySamplePredicate: predicate,
                options: options,
                anchorDate: anchorDate,
                intervalComponents: interval
            )

            query.initialResultsHandler = { [weak self] _, collection, error in
                guard let self else { return }
                if let error {
                    continuation.resume(throwing: HealthDataError.queryFailed(underlying: error))
                    return
                }
                var result: [String: Double] = [:]
                collection?.enumerateStatistics(from: start, to: end) { stats, _ in
                    let key = self.dateFormatter.string(from: stats.startDate)
                    let value: Double?
                    switch options {
                    case .cumulativeSum:  value = stats.sumQuantity()?.doubleValue(for: unit)
                    case .discreteAverage: value = stats.averageQuantity()?.doubleValue(for: unit)
                    default:              value = stats.sumQuantity()?.doubleValue(for: unit)
                    }
                    if let v = value { result[key] = v }
                }
                continuation.resume(returning: result)
            }

            healthStore.execute(query)
        }
    }
}

// MARK: - HKWorkoutActivityType extension
extension HKWorkoutActivityType {
    var commonName: String {
        switch self {
        case .running:            return "Running"
        case .cycling:            return "Cycling"
        case .swimming:           return "Swimming"
        case .walking:            return "Walking"
        case .functionalStrengthTraining, .traditionalStrengthTraining: return "Strength Training"
        case .yoga:               return "Yoga"
        case .highIntensityIntervalTraining: return "HIIT"
        case .crossTraining:      return "Cross Training"
        default:                  return "Workout"
        }
    }
}
