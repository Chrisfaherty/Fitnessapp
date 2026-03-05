import SwiftUI
import Charts

struct MainTabView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    @State private var selectedTab = 0

    var body: some View {
        TabView(selection: $selectedTab) {
            DashboardView()
                .tabItem { Label("Home", systemImage: "house.fill") }
                .tag(0)
            WorkoutListView()
                .tabItem { Label("Workouts", systemImage: "dumbbell.fill") }
                .tag(1)
            DiaryView()
                .tabItem { Label("Diary", systemImage: "note.text") }
                .tag(2)
            CheckInView()
                .tabItem { Label("Check-In", systemImage: "checkmark.circle.fill") }
                .tag(3)
            MessagingView()
                .tabItem { Label("Messages", systemImage: "bubble.left.and.bubble.right.fill") }
                .tag(4)
        }
        .tint(.accent)
    }
}

struct DashboardView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    @EnvironmentObject private var syncService: SyncService
    @StateObject private var vm = DashboardViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Greeting
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("Good \(greeting()),")
                                .font(.subheadline)
                                .foregroundColor(.appTextSecondaryFallback)
                            Text(authVM.profile?.fullName ?? "Athlete")
                                .font(.title2).bold()
                                .foregroundColor(.appTextFallback)
                        }
                        Spacer()
                        Button {
                            Task { await syncService.performIncrementalSync(userId: authVM.profile?.id ?? "") }
                        } label: {
                            Image(systemName: syncService.isSyncing ? "arrow.triangle.2.circlepath" : "arrow.clockwise")
                                .font(.title3)
                                .foregroundColor(.accent)
                                .rotationEffect(.degrees(syncService.isSyncing ? 360 : 0))
                                .animation(syncService.isSyncing ? .linear(duration: 1).repeatForever(autoreverses: false) : .default, value: syncService.isSyncing)
                        }
                    }
                    .padding(.horizontal)

                    // Today's stats
                    if let today = vm.todayMetrics {
                        TodayStatsGrid(metrics: today)
                            .padding(.horizontal)
                    }

                    // 7-day step chart
                    if !vm.weeklyMetrics.isEmpty {
                        WeeklyStepsChart(metrics: vm.weeklyMetrics)
                            .padding(.horizontal)
                    }

                    // Weight trend
                    if vm.weeklyMetrics.compactMap(\.weightKg).count >= 2 {
                        WeightTrendChart(metrics: vm.weeklyMetrics)
                            .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .background(Color.appBackgroundFallback.ignoresSafeArea())
            .navigationTitle("Dashboard")
            .navigationBarTitleDisplayMode(.large)
            .task {
                await vm.fetchMetrics(userId: authVM.profile?.id ?? "")
            }
        }
    }

    private func greeting() -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "morning"
        case 12..<17: return "afternoon"
        default: return "evening"
        }
    }
}

// MARK: - Today Stats Grid
struct TodayStatsGrid: View {
    let metrics: DailyMetrics

    var body: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            StatCard(title: "Steps", value: metrics.steps.map { "\($0.formatted())" } ?? "—",
                     icon: "figure.walk", color: .accent)
            StatCard(title: "Calories", value: metrics.nutritionKcal.map { "\(Int($0))" } ?? "—",
                     icon: "flame.fill", color: .systemWarning)
            StatCard(title: "Weight", value: metrics.weightKg.map { String(format: "%.1f kg", $0) } ?? "—",
                     icon: "scalemass.fill", color: .systemSuccess)
            StatCard(title: "Active kcal", value: metrics.activeEnergyKcal.map { "\(Int($0))" } ?? "—",
                     icon: "bolt.heart.fill", color: .systemDanger)
        }
    }
}

struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Image(systemName: icon).foregroundColor(color).font(.title3)
                Spacer()
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(value).font(.title2).bold().foregroundColor(.appTextFallback)
                Text(title).font(.caption).foregroundColor(.appTextSecondaryFallback)
            }
        }
        .padding()
        .background(Color.appSurfaceFallback)
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Charts
struct WeeklyStepsChart: View {
    let metrics: [DailyMetrics]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Steps This Week")
                .font(.subheadline).fontWeight(.semibold)
                .foregroundColor(.appTextFallback)

            Chart {
                ForEach(metrics.indices, id: \.self) { i in
                    let m = metrics[i]
                    if let steps = m.steps {
                        BarMark(
                            x: .value("Day", shortDate(m.date)),
                            y: .value("Steps", steps)
                        )
                        .foregroundStyle(Color.accent.gradient)
                        .cornerRadius(4)
                    }
                }
            }
            .frame(height: 140)
            .chartYAxis { AxisMarks(position: .leading) { _ in AxisGridLine().foregroundStyle(Color.appBorderFallback) } }
        }
        .padding()
        .background(Color.appSurfaceFallback)
        .cornerRadius(16)
    }

    private func shortDate(_ iso: String) -> String {
        let parts = iso.split(separator: "-")
        guard parts.count == 3 else { return iso }
        return "\(parts[1])/\(parts[2])"
    }
}

struct WeightTrendChart: View {
    let metrics: [DailyMetrics]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Weight Trend")
                .font(.subheadline).fontWeight(.semibold)
                .foregroundColor(.appTextFallback)

            Chart {
                ForEach(metrics.indices, id: \.self) { i in
                    let m = metrics[i]
                    if let w = m.weightKg {
                        LineMark(
                            x: .value("Day", shortDate(m.date)),
                            y: .value("kg", w)
                        )
                        .foregroundStyle(Color.accent)
                        .symbol(Circle().strokeBorder(lineWidth: 2))
                    }
                }
            }
            .frame(height: 120)
        }
        .padding()
        .background(Color.appSurfaceFallback)
        .cornerRadius(16)
    }

    private func shortDate(_ iso: String) -> String {
        let parts = iso.split(separator: "-")
        guard parts.count == 3 else { return iso }
        return "\(parts[1])/\(parts[2])"
    }
}
