import XCTest
@testable import FitnessCoach

final class WorkoutPrefillTests: XCTestCase {

    // MARK: - LastSessionSets

    func test_lastSet_returnsLastElement() {
        let sets = [
            LastSessionSets.SetInfo(setNumber: 1, reps: 8, weightKg: 60, rpe: nil),
            LastSessionSets.SetInfo(setNumber: 2, reps: 8, weightKg: 62.5, rpe: nil),
            LastSessionSets.SetInfo(setNumber: 3, reps: 7, weightKg: 62.5, rpe: 8),
        ]
        let session = LastSessionSets(exerciseId: "barbell-squat", sets: sets, performedAt: Date())
        XCTAssertEqual(session.lastSet?.setNumber, 3)
        XCTAssertEqual(session.lastSet?.weightKg, 62.5)
    }

    func test_lastSet_nilWhenEmpty() {
        let session = LastSessionSets(exerciseId: "barbell-squat", sets: [], performedAt: Date())
        XCTAssertNil(session.lastSet)
    }

    // MARK: - LoggedSet defaults

    func test_loggedSet_defaultsNotComplete() {
        let set = LoggedSet(setNumber: 1, reps: 10, weightKg: 80)
        XCTAssertFalse(set.isComplete)
    }

    func test_loggedSet_markedComplete() {
        var set = LoggedSet(setNumber: 1, reps: 10, weightKg: 80)
        set.isComplete = true
        XCTAssertTrue(set.isComplete)
    }

    // MARK: - RestTimerState

    func test_restTimerState_idleNotActive() {
        let state = RestTimerState.idle
        XCTAssertFalse(state.isActive)
        XCTAssertEqual(state.remainingSeconds, 0)
        XCTAssertEqual(state.totalSeconds, 0)
        XCTAssertEqual(state.progress, 0)
    }

    func test_restTimerState_runningIsActive() {
        let state = RestTimerState.running(remaining: 45, total: 90)
        XCTAssertTrue(state.isActive)
        XCTAssertEqual(state.remainingSeconds, 45)
        XCTAssertEqual(state.totalSeconds, 90)
        XCTAssertEqual(state.progress, 0.5, accuracy: 0.01)
    }

    func test_restTimerState_pausedIsActive() {
        let state = RestTimerState.paused(remaining: 30, total: 60)
        XCTAssertTrue(state.isActive)
    }

    func test_restTimerState_finishedNotActive() {
        let state = RestTimerState.finished
        XCTAssertFalse(state.isActive)
    }

    // MARK: - ActiveWorkoutState

    func test_activeWorkoutState_currentExercise() {
        let exercises = [
            makeTemplateExercise(id: "e1", order: 0),
            makeTemplateExercise(id: "e2", order: 1),
        ]
        var state = ActiveWorkoutState(templateExercises: exercises)
        XCTAssertEqual(state.currentExercise?.exerciseId, "e1")
        XCTAssertFalse(state.isComplete)

        state.currentExerciseIndex = 1
        XCTAssertEqual(state.currentExercise?.exerciseId, "e2")

        state.currentExerciseIndex = 2
        XCTAssertNil(state.currentExercise)
        XCTAssertTrue(state.isComplete)
    }

    // MARK: - Helpers

    private func makeTemplateExercise(id: String, order: Int) -> WorkoutTemplateExercise {
        WorkoutTemplateExercise(
            id: UUID().uuidString,
            templateId: "t1",
            exerciseId: id,
            sortOrder: order,
            targetSets: 3,
            repMin: 8,
            repMax: 12,
            restSeconds: 90,
            notes: nil,
            exercise: nil
        )
    }
}
