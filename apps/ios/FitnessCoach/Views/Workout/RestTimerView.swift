import SwiftUI

// MARK: - RestTimerView (full-screen overlay when shown)
struct RestTimerView: View {
    @ObservedObject var timerVM: RestTimerViewModel
    let exerciseName: String

    var body: some View {
        VStack(spacing: 28) {
            Text("Rest Timer")
                .font(.headline)
                .foregroundColor(.appTextSecondaryFallback)

            // Circular countdown
            ZStack {
                Circle()
                    .stroke(Color.appBorderFallback, lineWidth: 10)
                    .frame(width: 180, height: 180)

                Circle()
                    .trim(from: 0, to: timerVM.state.progress)
                    .stroke(Color.accent, style: StrokeStyle(lineWidth: 10, lineCap: .round))
                    .frame(width: 180, height: 180)
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 0.1), value: timerVM.state.progress)

                VStack(spacing: 4) {
                    Text(formattedTime)
                        .font(.system(size: 48, weight: .bold, design: .rounded))
                        .foregroundColor(.appTextFallback)
                        .monospacedDigit()

                    if case .paused = timerVM.state {
                        Text("PAUSED")
                            .font(.caption).fontWeight(.semibold)
                            .foregroundColor(.appTextSecondaryFallback)
                            .tracking(1)
                    }
                }
            }

            Text("After \(exerciseName)")
                .font(.subheadline)
                .foregroundColor(.appTextSecondaryFallback)

            // Adjust buttons
            HStack(spacing: 16) {
                AdjustButton(label: "−10s") { timerVM.addTime(-10) }
                AdjustButton(label: "+10s") { timerVM.addTime(10) }
            }

            // Main controls
            HStack(spacing: 20) {
                // Pause / Resume
                Button {
                    if case .running = timerVM.state { timerVM.pause() }
                    else if case .paused = timerVM.state { timerVM.resume() }
                } label: {
                    Image(systemName: (timerVM.state == .running(remaining: timerVM.state.remainingSeconds, total: timerVM.state.totalSeconds)) ? "pause.fill" : "play.fill")
                        .font(.title2)
                        .frame(width: 56, height: 56)
                        .background(Color.appSurfaceFallback)
                        .cornerRadius(28)
                }
                .foregroundColor(.appTextFallback)

                // Skip
                Button {
                    timerVM.skip()
                } label: {
                    Text("Skip")
                        .fontWeight(.semibold)
                        .frame(height: 56)
                        .frame(maxWidth: .infinity)
                        .background(Color.accent)
                        .foregroundColor(.accentFG)
                        .cornerRadius(28)
                }
            }
            .padding(.horizontal)
        }
        .padding(32)
        .background(Color.appSurfaceFallback)
        .cornerRadius(28)
        .shadow(radius: 20)
        .padding(.horizontal, 24)
    }

    private var formattedTime: String {
        let s = Int(timerVM.state.remainingSeconds)
        return String(format: "%d:%02d", s / 60, s % 60)
    }
}

// MARK: - Mini Rest Timer Bar (persists at bottom of screen)
struct RestTimerBar: View {
    @ObservedObject var timerVM: RestTimerViewModel
    @Binding var isExpanded: Bool

    var body: some View {
        if timerVM.state.isActive || timerVM.state == .finished {
            HStack(spacing: 12) {
                // Mini progress ring
                ZStack {
                    Circle().stroke(Color.appBorderFallback, lineWidth: 3).frame(width: 32, height: 32)
                    Circle().trim(from: 0, to: timerVM.state.progress)
                        .stroke(Color.accent, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                        .frame(width: 32, height: 32)
                        .rotationEffect(.degrees(-90))
                        .animation(.linear(duration: 0.1), value: timerVM.state.progress)
                    Text(timerVM.state == .finished ? "✓" : shortTime)
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundColor(timerVM.state == .finished ? .systemSuccess : .appTextFallback)
                }

                Text(timerVM.state == .finished ? "Rest complete — next set!" : "Resting…")
                    .font(.subheadline).fontWeight(.medium)
                    .foregroundColor(.appTextFallback)

                Spacer()

                Button {
                    withAnimation { isExpanded.toggle() }
                } label: {
                    Image(systemName: isExpanded ? "chevron.down" : "chevron.up")
                        .font(.caption).fontWeight(.semibold)
                        .foregroundColor(.appTextSecondaryFallback)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(.ultraThinMaterial)
            .cornerRadius(14)
            .padding(.horizontal)
            .shadow(color: .black.opacity(0.1), radius: 8, y: -2)
            .transition(.move(edge: .bottom).combined(with: .opacity))
            .animation(.spring(response: 0.35), value: timerVM.state.isActive)
        }
    }

    private var shortTime: String {
        let s = Int(timerVM.state.remainingSeconds)
        return s >= 60 ? "\(s/60):\(String(format: "%02d", s%60))" : "\(s)s"
    }
}

struct AdjustButton: View {
    let label: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline).fontWeight(.semibold)
                .frame(width: 72, height: 40)
                .background(Color.appSurfaceFallback)
                .foregroundColor(.appTextFallback)
                .cornerRadius(10)
                .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.appBorderFallback, lineWidth: 1))
        }
    }
}
