import Foundation
import Supabase

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published private(set) var weeklyMetrics: [DailyMetrics] = []
    @Published private(set) var todayMetrics: DailyMetrics?
    @Published private(set) var isLoading = false

    private let supabase = SupabaseService.shared.client
    private let dateFormatter: DateFormatter = {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"; return f
    }()

    func fetchMetrics(userId: String) async {
        guard !userId.isEmpty else { return }
        isLoading = true
        defer { isLoading = false }

        let end = Date()
        let start = Calendar.current.date(byAdding: .day, value: -7, to: end)!

        do {
            let metrics: [DailyMetrics] = try await supabase
                .from("health_daily")
                .select()
                .eq("user_id", value: userId)
                .gte("date", value: dateFormatter.string(from: start))
                .lte("date", value: dateFormatter.string(from: end))
                .order("date", ascending: true)
                .execute()
                .value

            weeklyMetrics = metrics
            todayMetrics = metrics.last
        } catch {
            print("Dashboard metrics error: \(error)")
        }
    }
}
