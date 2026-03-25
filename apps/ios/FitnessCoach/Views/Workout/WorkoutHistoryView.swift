import SwiftUI

struct WorkoutHistoryView: View {
    @State private var sessions: [WorkoutSession] = []
    @State private var isLoading = true
    @State private var expandedIds: Set<String> = []

    struct WorkoutSession: Identifiable {
        let id: String
        let templateTitle: String
        let performedAt: Date
        let durationSeconds: Int?
        let sets: [SessionSet]
    }

    struct SessionSet: Identifiable {
        let id: String
        let exerciseName: String
        let setNumber: Int
        let reps: Int?
        let weightKg: Double?
        let rpe: Int?
    }

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
                    .tint(Color.appAccent)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if sessions.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "dumbbell")
                        .font(.system(size: 40))
                        .foregroundColor(Color.appTextSecondary)
                    Text("No completed workouts yet")
                        .font(.headline)
                        .foregroundColor(Color.appTextSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                ScrollView {
                    LazyVStack(spacing: 12, pinnedViews: []) {
                        ForEach(sessions) { session in
                            SessionCard(
                                session: session,
                                isExpanded: expandedIds.contains(session.id),
                                onToggle: {
                                    if expandedIds.contains(session.id) {
                                        expandedIds.remove(session.id)
                                    } else {
                                        expandedIds.insert(session.id)
                                    }
                                }
                            )
                        }
                    }
                    .padding()
                }
            }
        }
        .background(Color.appBackground.ignoresSafeArea())
        .navigationTitle("Workout History")
        .onAppear { fetchSessions() }
    }

    private func fetchSessions() {
        Task {
            do {
                guard let userId = SupabaseService.shared.client.auth.currentUser?.id.uuidString else { return }
                let rows = try await SupabaseService.shared.client
                    .from("workout_sessions")
                    .select("""
                        id, performed_at, duration_seconds,
                        workout_templates(title),
                        workout_session_sets(exercise_id, set_number, reps, weight_kg, rpe, exercises(name))
                    """)
                    .eq("client_id", value: userId)
                    .not("performed_at", operator: .is, value: "null")
                    .order("performed_at", ascending: false)
                    .limit(10)
                    .execute()
                    .value as [[String: Any]]

                let formatter = ISO8601DateFormatter()
                await MainActor.run {
                    self.sessions = rows.compactMap { row in
                        guard
                            let id = row["id"] as? String,
                            let performedStr = row["performed_at"] as? String,
                            let performedAt = formatter.date(from: performedStr)
                        else { return nil }
                        let title = (row["workout_templates"] as? [String: Any])?["title"] as? String ?? "Workout"
                        let duration = row["duration_seconds"] as? Int
                        let rawSets = row["workout_session_sets"] as? [[String: Any]] ?? []
                        let sets = rawSets.compactMap { s -> SessionSet? in
                            guard let sid = s["id"] as? String else { return nil }
                            let exName = (s["exercises"] as? [String: Any])?["name"] as? String ?? (s["exercise_id"] as? String ?? "")
                            return SessionSet(
                                id: sid,
                                exerciseName: exName,
                                setNumber: s["set_number"] as? Int ?? 0,
                                reps: s["reps"] as? Int,
                                weightKg: s["weight_kg"] as? Double,
                                rpe: s["rpe"] as? Int
                            )
                        }
                        return WorkoutSession(id: id, templateTitle: title, performedAt: performedAt, durationSeconds: duration, sets: sets)
                    }
                    self.isLoading = false
                }
            } catch {
                await MainActor.run { self.isLoading = false }
            }
        }
    }

    struct SessionCard: View {
        let session: WorkoutSession
        let isExpanded: Bool
        let onToggle: () -> Void

        var body: some View {
            VStack(alignment: .leading, spacing: 0) {
                Button(action: onToggle) {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(session.templateTitle)
                                .font(.subheadline.bold())
                                .foregroundColor(Color.appTextPrimary)
                            HStack(spacing: 8) {
                                Text(session.performedAt, style: .date)
                                    .font(.caption)
                                    .foregroundColor(Color.appTextSecondary)
                                if let dur = session.durationSeconds {
                                    Text("· \(dur / 60) min")
                                        .font(.caption)
                                        .foregroundColor(Color.appTextSecondary)
                                }
                            }
                        }
                        Spacer()
                        Image(systemName: "chevron.down")
                            .font(.caption)
                            .foregroundColor(Color.appTextSecondary)
                            .rotationEffect(.degrees(isExpanded ? 180 : 0))
                            .animation(.easeInOut(duration: 0.2), value: isExpanded)
                    }
                    .padding()
                }
                .buttonStyle(.plain)

                if isExpanded {
                    Divider().background(Color.appTextSecondary.opacity(0.15))
                    VStack(alignment: .leading, spacing: 8) {
                        ForEach(session.sets) { set in
                            HStack {
                                Text("Set \(set.setNumber)")
                                    .font(.caption)
                                    .foregroundColor(Color.appTextSecondary)
                                    .frame(width: 44, alignment: .leading)
                                Text(set.exerciseName)
                                    .font(.caption)
                                    .foregroundColor(Color.appTextPrimary)
                                Spacer()
                                if let w = set.weightKg, let r = set.reps {
                                    Text("\(Int(w))kg × \(r)")
                                        .font(.caption.monospacedDigit())
                                        .foregroundColor(Color.appTextSecondary)
                                }
                            }
                        }
                    }
                    .padding()
                }
            }
            .background(Color.appSurface)
            .cornerRadius(16)
        }
    }
}
