import SwiftUI
import Supabase

@main
struct FitnessCoachApp: App {
    @StateObject private var authVM = AuthViewModel()
    @StateObject private var syncService = SyncService.shared

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authVM)
                .environmentObject(syncService)
                .preferredColorScheme(nil) // system
        }
    }
}

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
    }
}

struct SplashView: View {
    var body: some View {
        ZStack {
            Color.appBackground.ignoresSafeArea()
            VStack(spacing: 16) {
                Image(systemName: "bolt.heart.fill")
                    .font(.system(size: 48))
                    .foregroundColor(.accent)
                Text("FitnessCoach")
                    .font(.largeTitle).bold()
                    .foregroundColor(.appText)
            }
        }
    }
}
