import SwiftUI
import Supabase
import BackgroundTasks

@main
struct FitCoachApp: App {
    @StateObject private var authVM = AuthViewModel()
    @StateObject private var syncService = SyncService.shared

    init() {
        registerBackgroundTasks()
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authVM)
                .environmentObject(syncService)
                .preferredColorScheme(.dark)
                .onAppear {
                    scheduleHealthSync()
                }
        }
    }

    // MARK: - Background Task Registration

    private func registerBackgroundTasks() {
        BGTaskScheduler.shared.register(
            forTaskWithIdentifier: "com.fitcoach.app.healthsync",
            using: nil
        ) { task in
            Task {
                await SyncService.shared.performBackgroundSync(
                    task: task as! BGProcessingTask
                )
            }
        }
    }

    // MARK: - Schedule Next Sync

    /// Schedules a BGProcessingTask that requires network connectivity.
    /// Call on app launch and after every background sync completes.
    static func scheduleHealthSync() {
        let request = BGProcessingTaskRequest(
            identifier: "com.fitcoach.app.healthsync"
        )
        request.requiresNetworkConnectivity = true
        request.requiresExternalPower = false

        do {
            try BGTaskScheduler.shared.submit(request)
        } catch {
            // BGTaskScheduler throws if the identifier is not registered or the
            // device does not allow background tasks. Log and continue.
            print("[BGTask] Failed to schedule health sync: \(error)")
        }
    }
}

// MARK: - Convenience wrapper called from RootView.onAppear

func scheduleHealthSync() {
    FitCoachApp.scheduleHealthSync()
}

// MARK: - RootView

struct RootView: View {
    @EnvironmentObject private var authVM: AuthViewModel

    var body: some View {
        Group {
            switch authVM.state {
            case .unauthenticated:
                LoginView()
            case .authenticated:
                MainTabView()
            case .loading:
                SplashView()
            }
        }
        .animation(.easeInOut(duration: 0.25), value: authVM.state)
        .onAppear {
            scheduleHealthSync()
        }
    }
}

// MARK: - SplashView

struct SplashView: View {
    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()
            VStack(spacing: 16) {
                Image(systemName: "bolt.heart.fill")
                    .font(.system(size: 48))
                    .foregroundColor(.accent)
                Text("FitCoach")
                    .font(.largeTitle).bold()
                    .foregroundColor(.appText)
            }
        }
    }
}
