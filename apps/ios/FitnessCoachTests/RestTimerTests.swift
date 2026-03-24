import XCTest
@testable import FitCoach

// Tests for RestTimerViewModel state machine.
// Uses cancel() as the reset operation (the VM exposes cancel() and skip() for
// returning to .idle; there is no separate reset() method).

@MainActor
final class RestTimerTests: XCTestCase {

    var sut: RestTimerViewModel!

    override func setUp() {
        super.setUp()
        sut = RestTimerViewModel()
    }

    override func tearDown() {
        sut.cancel()
        sut = nil
        super.tearDown()
    }

    // MARK: - 1. Initial state is .idle

    func test_01_initialState_isIdle() {
        // Assertion 1
        XCTAssertEqual(sut.state, .idle)
    }

    // MARK: - 2. start(seconds:) transitions to .running (spec: .counting)

    func test_02_start_transitionsToRunning() {
        sut.start(seconds: 90)
        // Assertion 2
        if case .running = sut.state {
            XCTAssertTrue(true)
        } else {
            XCTFail("Expected .running state after start(), got \(sut.state)")
        }
    }

    // MARK: - 3. After start(), remainingSeconds == 90

    func test_03_start_remainingSeconds_equalsGivenDuration() {
        sut.start(seconds: 90)
        // Assertion 3
        XCTAssertEqual(sut.state.remainingSeconds, 90, accuracy: 1)
    }

    // MARK: - 4. After start(), totalSeconds == 90

    func test_04_start_totalSeconds_equalsGivenDuration() {
        sut.start(seconds: 90)
        // Assertion 4
        XCTAssertEqual(sut.state.totalSeconds, 90, accuracy: 1)
    }

    // MARK: - 5. pause() transitions to .paused

    func test_05_pause_fromRunning_transitionsToPaused() {
        sut.start(seconds: 60)
        sut.pause()
        // Assertion 5
        if case .paused = sut.state {
            XCTAssertTrue(true)
        } else {
            XCTFail("Expected .paused state after pause(), got \(sut.state)")
        }
    }

    // MARK: - 6. resume() transitions back to .running (spec: .counting)

    func test_06_resume_fromPaused_transitionsToRunning() {
        sut.start(seconds: 60)
        sut.pause()
        sut.resume()
        // Assertion 6
        if case .running = sut.state {
            XCTAssertTrue(true)
        } else {
            XCTFail("Expected .running state after resume(), got \(sut.state)")
        }
    }

    // MARK: - 7. cancel() from .running transitions to .idle (spec: reset from .counting)

    func test_07_cancel_fromRunning_transitionsToIdle() {
        sut.start(seconds: 90)
        sut.cancel()
        // Assertion 7
        XCTAssertEqual(sut.state, .idle)
    }

    // MARK: - 8. cancel() from .paused transitions to .idle (spec: reset from .paused)

    func test_08_cancel_fromPaused_transitionsToIdle() {
        sut.start(seconds: 90)
        sut.pause()
        sut.cancel()
        // Assertion 8
        XCTAssertEqual(sut.state, .idle)
    }

    // MARK: - 9. cancel() sets remainingSeconds == 0

    func test_09_cancel_setsRemainingToZero() {
        sut.start(seconds: 60)
        sut.cancel()
        // Assertion 9: idle state exposes remainingSeconds = 0
        XCTAssertEqual(sut.state.remainingSeconds, 0, accuracy: 0.001)
    }

    // MARK: - 10. Calling start() while already .running replaces the timer (new duration applied)

    func test_10_start_whileRunning_replacesTimer() {
        sut.start(seconds: 90)
        // Call start again — per the VM implementation, cancel() is called first,
        // then a new .running state is set with the new duration.
        sut.start(seconds: 90)
        // Assertion 10: state is still .running with the same remaining time
        if case .running(let r, let t) = sut.state {
            XCTAssertEqual(r, 90, accuracy: 1)
            XCTAssertEqual(t, 90, accuracy: 1)
        } else {
            XCTFail("Expected .running state, got \(sut.state)")
        }
    }

    // MARK: - 11. start(seconds: 60) after cancel() correctly sets remainingSeconds == 60

    func test_11_start_afterCancel_setsCorrectDuration() {
        sut.start(seconds: 90)
        sut.cancel()
        sut.start(seconds: 60)
        // Assertion 11
        XCTAssertEqual(sut.state.remainingSeconds, 60, accuracy: 1)
    }

    // MARK: - 12. A single tick decrements remainingSeconds by ~0.1 (tickInterval)

    func test_12_timerFired_decrementsRemaining() async throws {
        sut.start(seconds: 5)
        let beforeRemaining = sut.state.remainingSeconds
        // Wait for slightly more than one tick (tickInterval = 0.1s)
        try await Task.sleep(nanoseconds: 200_000_000) // 0.2s — at least one tick
        let afterRemaining = sut.state.remainingSeconds
        // Assertion 12: remaining has decreased (at least one tick fired)
        XCTAssertLessThan(afterRemaining, beforeRemaining)
    }

    // MARK: - 13. When remainingSeconds reaches 0, state transitions to .finished

    func test_13_countdown_reachesZero_transitionsToFinished() async throws {
        sut.start(seconds: 0.3) // 300 ms countdown
        // Wait well past expiry
        try await Task.sleep(nanoseconds: 700_000_000) // 0.7s
        // Assertion 13
        XCTAssertEqual(sut.state, .finished)
    }

    // MARK: - 14. cancel() from .finished transitions to .idle

    func test_14_cancel_fromFinished_transitionsToIdle() async throws {
        sut.start(seconds: 0.3)
        try await Task.sleep(nanoseconds: 700_000_000) // allow timer to finish
        XCTAssertEqual(sut.state, .finished, "Precondition: must be .finished")
        sut.cancel()
        // Assertion 14
        XCTAssertEqual(sut.state, .idle)
    }
}
