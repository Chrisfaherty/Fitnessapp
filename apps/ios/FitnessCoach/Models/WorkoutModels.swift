import Foundation

// MARK: - Exercise
struct Exercise: Identifiable, Codable, Hashable {
    let id: String
    let name: String
    let force: String?
    let level: String
    let mechanic: String?
    let equipment: String?
    let category: String
    let primaryMuscles: [String]
    let secondaryMuscles: [String]
    let instructions: [String]
    let imagePaths: [String]
    let source: String

    enum CodingKeys: String, CodingKey {
        case id, name, force, level, mechanic, equipment, category, source
        case primaryMuscles   = "primary_muscles"
        case secondaryMuscles = "secondary_muscles"
        case instructions
        case imagePaths       = "image_paths"
    }
}

// MARK: - Workout Template
struct WorkoutTemplate: Identifiable, Codable {
    let id: String
    let trainerId: String
    let title: String
    let description: String?
    let createdAt: Date
    var exercises: [WorkoutTemplateExercise] = []

    enum CodingKeys: String, CodingKey {
        case id, title, description
        case trainerId  = "trainer_id"
        case createdAt  = "created_at"
    }
}

struct WorkoutTemplateExercise: Identifiable, Codable {
    let id: String
    let templateId: String
    let exerciseId: String
    let sortOrder: Int
    let targetSets: Int
    let repMin: Int
    let repMax: Int
    let restSeconds: Int
    let notes: String?
    var exercise: Exercise?

    enum CodingKeys: String, CodingKey {
        case id, notes
        case templateId  = "template_id"
        case exerciseId  = "exercise_id"
        case sortOrder   = "sort_order"
        case targetSets  = "target_sets"
        case repMin      = "rep_min"
        case repMax      = "rep_max"
        case restSeconds = "rest_seconds"
    }
}

// MARK: - Workout Assignment
struct WorkoutAssignment: Identifiable, Codable {
    let id: String
    let clientId: String
    let templateId: String
    let trainerId: String?
    let scheduledDate: String?
    let status: String
    var template: WorkoutTemplate?

    enum CodingKeys: String, CodingKey {
        case id, status
        case clientId      = "client_id"
        case templateId    = "template_id"
        case trainerId     = "trainer_id"
        case scheduledDate = "scheduled_date"
    }
}

// MARK: - Workout Session
struct WorkoutSession: Identifiable, Codable {
    let id: String
    let clientId: String
    let templateId: String?
    let assignmentId: String?
    var performedAt: Date
    var durationSeconds: Int?
    var notes: String?
    var sets: [WorkoutSessionSet] = []

    enum CodingKeys: String, CodingKey {
        case id, notes
        case clientId       = "client_id"
        case templateId     = "template_id"
        case assignmentId   = "assignment_id"
        case performedAt    = "performed_at"
        case durationSeconds = "duration_seconds"
    }
}

// MARK: - Workout Session Set
struct WorkoutSessionSet: Identifiable, Codable {
    let id: String
    let sessionId: String
    let exerciseId: String
    var setNumber: Int
    var reps: Int
    var weightKg: Double?
    var rpe: Double?
    var restSeconds: Int?
    let completedAt: Date

    enum CodingKeys: String, CodingKey {
        case id, reps, rpe
        case sessionId   = "session_id"
        case exerciseId  = "exercise_id"
        case setNumber   = "set_number"
        case weightKg    = "weight_kg"
        case restSeconds = "rest_seconds"
        case completedAt = "completed_at"
    }
}

// MARK: - Last Session Info (for prefill)
struct LastSessionSets {
    let exerciseId: String
    let sets: [SetInfo]
    let performedAt: Date

    struct SetInfo {
        let setNumber: Int
        let reps: Int
        let weightKg: Double?
        let rpe: Double?
    }

    var lastSet: SetInfo? { sets.last }
}

// MARK: - Active workout state (in-memory during logging)
struct ActiveWorkoutState {
    var sessionId: String?
    var templateExercises: [WorkoutTemplateExercise]
    var currentExerciseIndex: Int = 0
    var loggedSets: [String: [LoggedSet]] = [:]  // exerciseId -> sets
    var startedAt: Date = Date()

    var currentExercise: WorkoutTemplateExercise? {
        guard currentExerciseIndex < templateExercises.count else { return nil }
        return templateExercises[currentExerciseIndex]
    }

    var isComplete: Bool {
        currentExerciseIndex >= templateExercises.count
    }
}

struct LoggedSet: Identifiable {
    let id = UUID()
    var setNumber: Int
    var reps: Int
    var weightKg: Double?
    var rpe: Double?
    var isComplete: Bool = false
}

// MARK: - Rest Timer State Machine
enum RestTimerState: Equatable {
    case idle
    case running(remaining: TimeInterval, total: TimeInterval)
    case paused(remaining: TimeInterval, total: TimeInterval)
    case finished

    var isActive: Bool {
        switch self {
        case .running, .paused: return true
        default: return false
        }
    }

    var remainingSeconds: TimeInterval {
        switch self {
        case .running(let r, _), .paused(let r, _): return r
        default: return 0
        }
    }

    var totalSeconds: TimeInterval {
        switch self {
        case .running(_, let t), .paused(_, let t): return t
        default: return 0
        }
    }

    var progress: Double {
        guard totalSeconds > 0 else { return 0 }
        return 1.0 - (remainingSeconds / totalSeconds)
    }
}
