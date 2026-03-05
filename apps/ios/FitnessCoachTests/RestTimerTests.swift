import XCTest
@testable import FitnessCoach

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

    // MARK: - Initial state

    func test_initialState_isIdle() {
        XCTAssertEqual(sut.state, .idle)
    }

    // MARK: - Start

    func test_start_transitionsToRunning() {
        sut.start(seconds: 90)
        if case .running(let r, let t) = sut.state {
            XCTAssertEqual(r, 90, accuracy: 1)
            XCTAssertEqual(t, 90, accuracy: 1)
        } else {
            XCTFail("Expected running state, got \(sut.state)")
        }
    }

    func test_start_replacesExistingTimer() {
        sut.start(seconds: 60)
        sut.start(seconds: 120)
        if case .running(_, let t) = sut.state {
            XCTAssertEqual(t, 120, accuracy: 1)
        } else {
            XCTFail("Expected running state")
        }
    }

    // MARK: - Pause / Resume

    func test_pause_fromRunning_transitions() {
        sut.start(seconds: 60)
        sut.pause()
        if case .paused(let r, let t) = sut.state {
            XCTAssertEqual(t, 60, accuracy: 1)
            XCTAssertEqual(r, 60, accuracy: 1)
        } else {
            XCTFail("Expected paused state")
        }
    }

    func test_resume_fromPaused_transitionsToRunning() {
        sut.start(seconds: 60)
        sut.pause()
        sut.resume()
        if case .running = sut.state {
            XCTAssertTrue(true)
        } else {
            XCTFail("Expected running state")
        }
    }

    func test_pause_fromIdle_noEffect() {
        sut.pause()
        XCTAssertEqual(sut.state, .idle)
    }

    // MARK: - Add time

    func test_addPositiveTime_increasesRemaining() {
        sut.start(seconds: 60)
        sut.addTime(10)
        XCTAssertEqual(sut.state.remainingSeconds, 70, accuracy: 1)
    }

    func test_addNegativeTime_decreasesRemaining() {
        sut.start(seconds: 60)
        sut.addTime(-10)
        XCTAssertEqual(sut.state.remainingSeconds, 50, accuracy: 1)
    }

    func test_addNegativeTime_doesNotGoBelowOne() {
        sut.start(seconds: 5)
        sut.addTime(-100)
        XCTAssertGreaterThanOrEqual(sut.state.remainingSeconds, 1)
    }

    func test_addTime_whilePaused_works() {
        sut.start(seconds: 60)
        sut.pause()
        sut.addTime(15)
        if case .paused(let r, _) = sut.state {
            XCTAssertEqual(r, 75, accuracy: 1)
        } else {
            XCTFail("Expected paused")
        }
    }

    // MARK: - Skip

    func test_skip_fromRunning_returnsToIdle() {
        sut.start(seconds: 90)
        sut.skip()
        XCTAssertEqual(sut.state, .idle)
    }

    func test_skip_fromPaused_returnsToIdle() {
        sut.start(seconds: 90)
        sut.pause()
        sut.skip()
        XCTAssertEqual(sut.state, .idle)
    }

    // MARK: - Cancel

    func test_cancel_resetsToIdle() {
        sut.start(seconds: 90)
        sut.cancel()
        XCTAssertEqual(sut.state, .idle)
    }

    // MARK: - Progress

    func test_progress_atStart_isZero() {
        sut.start(seconds: 100)
        XCTAssertEqual(sut.state.progress, 0, accuracy: 0.05)
    }

    func test_progress_afterHalfElapsed() async throws {
        sut.start(seconds: 2)
        try await Task.sleep(nanoseconds: 1_100_000_000)  // 1.1s
        XCTAssertGreaterThan(sut.state.progress, 0.4)
    }

    // MARK: - Finished callback

    func test_finishCallback_calledWhenTimerExpires() async throws {
        var callbackCalled = false
        sut.onFinished = { callbackCalled = true }
        sut.start(seconds: 0.3)
        try await Task.sleep(nanoseconds: 600_000_000)
        XCTAssertTrue(callbackCalled)
        XCTAssertEqual(sut.state, .finished)
    }
}
