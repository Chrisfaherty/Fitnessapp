import SwiftUI

struct WorkoutListView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    @StateObject private var vm: WorkoutViewModel

    init() {
        _vm = StateObject(wrappedValue: WorkoutViewModel(userId: ""))
    }

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading {
                    ProgressView("Loading workouts…")
                } else if vm.assignments.isEmpty {
                    ContentUnavailableView("No Workouts Assigned",
                        systemImage: "dumbbell",
                        description: Text("Your trainer hasn't assigned any workouts yet."))
                } else {
                    List(vm.assignments) { assignment in
                        if let template = assignment.template {
                            NavigationLink {
                                WorkoutSessionView(
                                    assignment: assignment,
                                    template: template,
                                    workoutVM: vm
                                )
                            } label: {
                                AssignmentRow(assignment: assignment, template: template)
                            }
                            .listRowBackground(Color.appSurfaceFallback)
                        }
                    }
                    .listStyle(.insetGrouped)
                    .scrollContentBackground(.hidden)
                    .background(Color.appBackgroundFallback)
                }
            }
            .navigationTitle("Workouts")
            .task {
                await vm.fetchAssignments()
            }
        }
    }
}

struct AssignmentRow: View {
    let assignment: WorkoutAssignment
    let template: WorkoutTemplate

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.accent.opacity(0.15))
                    .frame(width: 48, height: 48)
                Image(systemName: "dumbbell.fill")
                    .foregroundColor(.accent)
            }
            VStack(alignment: .leading, spacing: 4) {
                Text(template.title).font(.headline).foregroundColor(.appTextFallback)
                Text("\(template.exercises.count) exercises")
                    .font(.caption).foregroundColor(.appTextSecondaryFallback)
            }
            Spacer()
            if let date = assignment.scheduledDate {
                Text(date).font(.caption2).foregroundColor(.appTextSecondaryFallback)
            }
        }
        .padding(.vertical, 6)
    }
}

// MARK: - WorkoutSessionView
struct WorkoutSessionView: View {
    let assignment: WorkoutAssignment
    let template: WorkoutTemplate
    @ObservedObject var workoutVM: WorkoutViewModel

    @StateObject private var timerVM = RestTimerViewModel()
    @State private var session: WorkoutSession?
    @State private var loggedSets: [String: [LoggedSet]] = [:]
    @State private var currentExerciseIdx = 0
    @State private var isTimerExpanded = false
    @State private var isFinishing = false
    @State private var startTime = Date()
    @Environment(\.dismiss) private var dismiss

    private var exercises: [WorkoutTemplateExercise] { template.exercises.sorted(by: { $0.sortOrder < $1.sortOrder }) }
    private var currentExercise: WorkoutTemplateExercise? {
        exercises.indices.contains(currentExerciseIdx) ? exercises[currentExerciseIdx] : nil
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.appBackgroundFallback.ignoresSafeArea()

            VStack(spacing: 0) {
                // Exercise progress header
                if !exercises.isEmpty {
                    HStack {
                        Text("Exercise \(currentExerciseIdx + 1) of \(exercises.count)")
                            .font(.caption).foregroundColor(.appTextSecondaryFallback)
                        Spacer()
                        // Progress bar
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule().fill(Color.appBorderFallback).frame(height: 4)
                                Capsule().fill(Color.accent)
                                    .frame(width: geo.size.width * Double(currentExerciseIdx + 1) / Double(exercises.count), height: 4)
                                    .animation(.spring(), value: currentExerciseIdx)
                            }
                        }
                        .frame(width: 120, height: 4)
                    }
                    .padding(.horizontal).padding(.top, 8)
                }

                if let exercise = currentExercise {
                    ScrollView {
                        VStack(alignment: .leading, spacing: 20) {
                            // Exercise header
                            VStack(alignment: .leading, spacing: 6) {
                                if let ex = exercise.exercise {
                                    NavigationLink {
                                        ExerciseDetailView(exercise: ex)
                                    } label: {
                                        HStack {
                                            Text(ex.name).font(.title2).bold().foregroundColor(.appTextFallback)
                                            Image(systemName: "info.circle").font(.body).foregroundColor(.appTextSecondaryFallback)
                                        }
                                    }
                                    Text("\(exercise.targetSets) sets · \(exercise.repMin)–\(exercise.repMax) reps · \(exercise.restSeconds)s rest")
                                        .font(.subheadline).foregroundColor(.appTextSecondaryFallback)
                                }
                            }
                            .padding(.horizontal)

                            // Last session reference
                            if let last = workoutVM.lastSessionSets[exercise.exerciseId] {
                                LastSessionBanner(lastSession: last)
                                    .padding(.horizontal)
                            }

                            // Sets
                            VStack(spacing: 10) {
                                let sets = loggedSets[exercise.exerciseId] ?? defaultSets(for: exercise)
                                ForEach(sets) { set in
                                    SetLogRow(
                                        set: binding(for: exercise.exerciseId, setId: set.id),
                                        lastSet: workoutVM.lastSessionSets[exercise.exerciseId]?.sets.first(where: { $0.setNumber == set.setNumber }),
                                        onComplete: { completedSet in
                                            Task { await handleSetComplete(exercise: exercise, set: completedSet) }
                                        }
                                    )
                                }
                            }
                            .padding(.horizontal)

                            // Next / Finish
                            Button {
                                withAnimation {
                                    if currentExerciseIdx < exercises.count - 1 {
                                        currentExerciseIdx += 1
                                    } else {
                                        Task { await finishWorkout() }
                                    }
                                }
                            } label: {
                                Text(currentExerciseIdx < exercises.count - 1 ? "Next Exercise →" : "Finish Workout")
                                    .fontWeight(.semibold)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 52)
                                    .background(Color.accent)
                                    .foregroundColor(.accentFG)
                                    .cornerRadius(14)
                            }
                            .padding(.horizontal)
                            .padding(.bottom, 100)
                        }
                        .padding(.top, 16)
                    }
                }
            }

            // Persistent rest timer bar
            VStack(spacing: 0) {
                RestTimerBar(timerVM: timerVM, isExpanded: $isTimerExpanded)
                    .padding(.bottom, 8)

                if isTimerExpanded, let ex = currentExercise?.exercise {
                    RestTimerView(timerVM: timerVM, exerciseName: ex.name)
                        .padding(.bottom, 20)
                }
            }
        }
        .navigationTitle(template.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Button("Cancel") { dismiss() }
                    .foregroundColor(.systemDanger)
            }
        }
        .task {
            session = await workoutVM.startSession(assignment: assignment)
            startTime = Date()
        }
    }

    private func defaultSets(for exercise: WorkoutTemplateExercise) -> [LoggedSet] {
        let prefillWeight = workoutVM.lastSessionSets[exercise.exerciseId]?.lastSet?.weightKg
        let prefillReps   = workoutVM.lastSessionSets[exercise.exerciseId]?.lastSet?.reps ?? exercise.repMax

        return (1...exercise.targetSets).map { n in
            LoggedSet(setNumber: n, reps: prefillReps, weightKg: prefillWeight)
        }
    }

    private func binding(for exerciseId: String, setId: UUID) -> Binding<LoggedSet> {
        Binding {
            loggedSets[exerciseId]?.first(where: { $0.id == setId }) ?? LoggedSet(setNumber: 0, reps: 0)
        } set: { newVal in
            if var sets = loggedSets[exerciseId], let idx = sets.firstIndex(where: { $0.id == setId }) {
                sets[idx] = newVal
                loggedSets[exerciseId] = sets
            }
        }
    }

    private func handleSetComplete(exercise: WorkoutTemplateExercise, set: LoggedSet) async {
        guard let sessionId = session?.id else { return }
        _ = await workoutVM.logSet(
            sessionId: sessionId,
            exerciseId: exercise.exerciseId,
            setNumber: set.setNumber,
            reps: set.reps,
            weightKg: set.weightKg,
            rpe: set.rpe,
            restSeconds: exercise.restSeconds
        )
        timerVM.start(seconds: TimeInterval(exercise.restSeconds))
    }

    private func finishWorkout() async {
        guard let sessionId = session?.id else { return }
        let duration = Int(Date().timeIntervalSince(startTime))
        await workoutVM.finishSession(sessionId: sessionId, durationSeconds: duration, notes: nil)
        dismiss()
    }
}

// MARK: - SetLogRow
struct SetLogRow: View {
    @Binding var set: LoggedSet
    let lastSet: LastSessionSets.SetInfo?
    let onComplete: (LoggedSet) -> Void

    @State private var weightStr = ""
    @State private var repsStr = ""

    var body: some View {
        HStack(spacing: 12) {
            // Set number badge
            ZStack {
                Circle().fill(set.isComplete ? Color.accent : Color.appSurfaceFallback)
                    .frame(width: 36, height: 36)
                    .overlay(Circle().stroke(set.isComplete ? Color.clear : Color.appBorderFallback, lineWidth: 1))
                Text("\(set.setNumber)")
                    .font(.subheadline).fontWeight(.semibold)
                    .foregroundColor(set.isComplete ? .accentFG : .appTextFallback)
            }
            .animation(.spring(response: 0.3), value: set.isComplete)

            // Weight input
            VStack(alignment: .leading, spacing: 2) {
                Text("KG").font(.system(size: 9)).fontWeight(.semibold).foregroundColor(.appTextSecondaryFallback).tracking(1)
                TextField(lastSet.flatMap { $0.weightKg }.map { String(format: "%.1f", $0) } ?? "0.0", text: $weightStr)
                    .keyboardType(.decimalPad)
                    .font(.title3).fontWeight(.semibold)
                    .foregroundColor(.appTextFallback)
                    .frame(width: 70)
                    .multilineTextAlignment(.center)
                    .padding(.vertical, 8)
                    .background(Color.appSurfaceFallback)
                    .cornerRadius(8)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.appBorderFallback, lineWidth: 1))
            }

            // Reps input
            VStack(alignment: .leading, spacing: 2) {
                Text("REPS").font(.system(size: 9)).fontWeight(.semibold).foregroundColor(.appTextSecondaryFallback).tracking(1)
                TextField(lastSet.map { "\($0.reps)" } ?? "\(set.reps)", text: $repsStr)
                    .keyboardType(.numberPad)
                    .font(.title3).fontWeight(.semibold)
                    .foregroundColor(.appTextFallback)
                    .frame(width: 60)
                    .multilineTextAlignment(.center)
                    .padding(.vertical, 8)
                    .background(Color.appSurfaceFallback)
                    .cornerRadius(8)
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Color.appBorderFallback, lineWidth: 1))
            }

            Spacer()

            // Done button
            Button {
                var updated = set
                updated.weightKg = Double(weightStr) ?? set.weightKg
                updated.reps     = Int(repsStr) ?? set.reps
                updated.isComplete = true
                set = updated
                onComplete(updated)
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            } label: {
                Image(systemName: set.isComplete ? "checkmark.circle.fill" : "checkmark.circle")
                    .font(.title2)
                    .foregroundColor(set.isComplete ? .accent : .appBorderFallback)
            }
        }
        .padding()
        .background(Color.appSurfaceFallback)
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(
            set.isComplete ? Color.accent.opacity(0.4) : Color.appBorderFallback, lineWidth: 1))
        .onAppear {
            if let w = set.weightKg { weightStr = String(format: "%.1f", w) }
            repsStr = "\(set.reps)"
        }
    }
}

struct LastSessionBanner: View {
    let lastSession: LastSessionSets

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "clock.arrow.circlepath").font(.caption).foregroundColor(.accent)
            Text("Last session: " + (lastSession.lastSet.map { "×\($0.reps) @ \(String(format: "%.1f", $0.weightKg ?? 0))kg" } ?? "no data"))
                .font(.caption).foregroundColor(.appTextSecondaryFallback)
        }
        .padding(.horizontal, 12).padding(.vertical, 8)
        .background(Color.accent.opacity(0.1))
        .cornerRadius(8)
    }
}
