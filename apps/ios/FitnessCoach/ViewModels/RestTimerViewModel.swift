import Foundation
import SwiftUI
import Combine

// MARK: - RestTimerViewModel
// State machine for rest timer between sets.
// States: idle → running ↔ paused → finished → idle

@MainActor
final class RestTimerViewModel: ObservableObject {

    @Published private(set) var state: RestTimerState = .idle

    private var timerTask: Task<Void, Never>?
    private let tickInterval: TimeInterval = 0.1
    var onFinished: (() -> Void)?

    // MARK: - Commands

    /// Start a new countdown from `seconds`.
    func start(seconds: TimeInterval) {
        cancel()
        state = .running(remaining: seconds, total: seconds)
        scheduleTimer()
    }

    func pause() {
        guard case .running(let r, let t) = state else { return }
        timerTask?.cancel()
        timerTask = nil
        state = .paused(remaining: r, total: t)
    }

    func resume() {
        guard case .paused(let r, let t) = state else { return }
        state = .running(remaining: r, total: t)
        scheduleTimer()
    }

    func addTime(_ delta: TimeInterval) {
        switch state {
        case .running(let r, let t):
            let newRemaining = max(1, r + delta)
            let newTotal = newRemaining > t ? newRemaining : t
            state = .running(remaining: newRemaining, total: newTotal)
        case .paused(let r, let t):
            let newRemaining = max(1, r + delta)
            let newTotal = newRemaining > t ? newRemaining : t
            state = .paused(remaining: newRemaining, total: newTotal)
        default: break
        }
    }

    func skip() {
        cancel()
        state = .idle
    }

    func cancel() {
        timerTask?.cancel()
        timerTask = nil
        state = .idle
    }

    // MARK: - Internal

    private func scheduleTimer() {
        timerTask = Task { [weak self] in
            while !Task.isCancelled {
                guard let self else { return }
                try? await Task.sleep(nanoseconds: UInt64(tickInterval * 1_000_000_000))
                if Task.isCancelled { return }

                await MainActor.run {
                    guard case .running(let remaining, let total) = self.state else {
                        self.timerTask?.cancel()
                        return
                    }
                    let next = remaining - self.tickInterval
                    if next <= 0 {
                        self.state = .finished
                        self.timerTask?.cancel()
                        self.triggerHaptic()
                        self.onFinished?()
                    } else {
                        self.state = .running(remaining: next, total: total)
                    }
                }
            }
        }
    }

    private func triggerHaptic() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }
}
