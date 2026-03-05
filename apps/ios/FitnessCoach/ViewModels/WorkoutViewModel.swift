import Foundation
import Supabase
import Combine

@MainActor
final class WorkoutViewModel: ObservableObject {
    @Published private(set) var assignments: [WorkoutAssignment] = []
    @Published private(set) var activeSession: WorkoutSession?
    @Published private(set) var lastSessionSets: [String: LastSessionSets] = [:]
    @Published private(set) var isLoading = false
    @Published var errorMessage: String?

    private let supabase = SupabaseService.shared.client
    private var userId: String

    init(userId: String) {
        self.userId = userId
    }

    // MARK: - Fetch Assignments
    func fetchAssignments() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let results: [WorkoutAssignment] = try await supabase
                .from("workout_assignments")
                .select("""
                    *,
                    template:workout_templates(
                        *,
                        exercises:workout_template_exercises(
                            *,
                            exercise:exercises(*)
                        )
                    )
                """)
                .eq("client_id", value: userId)
                .in("status", values: ["assigned"])
                .order("scheduled_date")
                .execute()
                .value
            assignments = results
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Start Workout Session
    func startSession(assignment: WorkoutAssignment) async -> WorkoutSession? {
        guard let template = assignment.template else { return nil }

        // Prefetch last session data for all exercises
        let exerciseIds = template.exercises.map(\.exerciseId)
        await withTaskGroup(of: Void.self) { group in
            for eid in exerciseIds {
                group.addTask { [weak self] in
                    await self?.fetchLastSessionSets(exerciseId: eid)
                }
            }
        }

        do {
            let session: WorkoutSession = try await supabase
                .from("workout_sessions")
                .insert([
                    "client_id": userId,
                    "template_id": template.id,
                    "assignment_id": assignment.id,
                    "performed_at": ISO8601DateFormatter().string(from: Date())
                ])
                .single()
                .execute()
                .value
            activeSession = session
            return session
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    // MARK: - Log a set
    func logSet(
        sessionId: String,
        exerciseId: String,
        setNumber: Int,
        reps: Int,
        weightKg: Double?,
        rpe: Double?,
        restSeconds: Int?
    ) async -> WorkoutSessionSet? {
        do {
            var body: [String: AnyJSON] = [
                "session_id":  AnyJSON.string(sessionId),
                "exercise_id": AnyJSON.string(exerciseId),
                "set_number":  AnyJSON.double(Double(setNumber)),
                "reps":        AnyJSON.double(Double(reps)),
            ]
            if let w = weightKg    { body["weight_kg"]    = .double(w) }
            if let r = rpe         { body["rpe"]          = .double(r) }
            if let rs = restSeconds { body["rest_seconds"] = .double(Double(rs)) }

            let set: WorkoutSessionSet = try await supabase
                .from("workout_session_sets")
                .insert(body)
                .single()
                .execute()
                .value
            return set
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }

    // MARK: - Finish session
    func finishSession(sessionId: String, durationSeconds: Int, notes: String?) async {
        do {
            try await supabase
                .from("workout_sessions")
                .update([
                    "duration_seconds": durationSeconds,
                    "notes": notes ?? ""
                ])
                .eq("id", value: sessionId)
                .execute()

            // Mark assignment complete
            if let assignment = assignments.first(where: { $0.template?.id == activeSession?.templateId }) {
                try await supabase
                    .from("workout_assignments")
                    .update(["status": "completed"])
                    .eq("id", value: assignment.id)
                    .execute()
            }

            activeSession = nil
            await fetchAssignments()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Prefill last session
    func fetchLastSessionSets(exerciseId: String) async {
        do {
            struct SetRow: Codable {
                let setNumber: Int
                let reps: Int
                let weightKg: Double?
                let rpe: Double?
                let performedAt: Date

                enum CodingKeys: String, CodingKey {
                    case reps, rpe
                    case setNumber   = "set_number"
                    case weightKg    = "weight_kg"
                    case performedAt = "performed_at"
                }
            }

            let rows: [SetRow] = try await supabase
                .rpc("get_last_session_sets", params: [
                    "p_client_id": userId,
                    "p_exercise_id": exerciseId
                ])
                .execute()
                .value

            guard !rows.isEmpty else { return }

            let sets = rows.map {
                LastSessionSets.SetInfo(
                    setNumber: $0.setNumber,
                    reps: $0.reps,
                    weightKg: $0.weightKg,
                    rpe: $0.rpe
                )
            }
            let lastDate = rows.first?.performedAt ?? Date()
            lastSessionSets[exerciseId] = LastSessionSets(
                exerciseId: exerciseId,
                sets: sets,
                performedAt: lastDate
            )
        } catch {
            // Non-fatal — first session will just have no prefill
        }
    }
}
