import SwiftUI
import Charts

struct ExerciseProgressView: View {
    let exerciseId: String
    let exerciseName: String

    @State private var dataPoints: [VolumePoint] = []
    @State private var isLoading = true
    @State private var bestWeight: Double = 0
    @State private var totalSets: Int = 0

    struct VolumePoint: Identifiable {
        let id = UUID()
        let weekLabel: String
        let maxWeight: Double
    }

    var body: some View {
        NavigationView {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    if isLoading {
                        ProgressView()
                            .tint(Color.appAccent)
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else if dataPoints.isEmpty {
                        VStack(spacing: 12) {
                            Image(systemName: "chart.line.uptrend.xyaxis")
                                .font(.system(size: 40))
                                .foregroundColor(Color.appTextSecondary)
                            Text("No sets logged for this exercise yet")
                                .font(.subheadline)
                                .foregroundColor(Color.appTextSecondary)
                        }
                        .frame(maxWidth: .infinity, minHeight: 200)
                    } else {
                        // Stats row
                        HStack(spacing: 16) {
                            StatPill(label: "Best Weight", value: "\(Int(bestWeight)) kg")
                            StatPill(label: "Total Sets", value: "\(totalSets)")
                        }
                        .padding(.horizontal)

                        // Swift Charts line chart
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Max Weight Over Time")
                                .font(.caption)
                                .foregroundColor(Color.appTextSecondary)
                                .padding(.horizontal)

                            Chart(dataPoints) { point in
                                LineMark(
                                    x: .value("Week", point.weekLabel),
                                    y: .value("Weight (kg)", point.maxWeight)
                                )
                                .foregroundStyle(Color.appAccent)
                                .interpolationMethod(.catmullRom)

                                PointMark(
                                    x: .value("Week", point.weekLabel),
                                    y: .value("Weight (kg)", point.maxWeight)
                                )
                                .foregroundStyle(Color.appAccent)
                                .symbolSize(30)
                            }
                            .chartXAxis {
                                AxisMarks(values: .stride(by: .custom(max(1, dataPoints.count / 4)))) { _ in
                                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                                        .foregroundStyle(Color.appTextSecondary.opacity(0.3))
                                    AxisValueLabel()
                                        .foregroundStyle(Color.appTextSecondary)
                                }
                            }
                            .chartYAxis {
                                AxisMarks { _ in
                                    AxisGridLine(stroke: StrokeStyle(lineWidth: 0.5))
                                        .foregroundStyle(Color.appTextSecondary.opacity(0.3))
                                    AxisValueLabel()
                                        .foregroundStyle(Color.appTextSecondary)
                                }
                            }
                            .frame(height: 220)
                            .padding()
                            .background(Color.appSurface)
                            .cornerRadius(16)
                            .padding(.horizontal)
                        }
                    }
                }
                .padding(.vertical)
            }
            .background(Color.appBackground.ignoresSafeArea())
            .navigationTitle(exerciseName)
            .navigationBarTitleDisplayMode(.inline)
            .onAppear { fetchData() }
        }
    }

    private func fetchData() {
        Task {
            do {
                let rows = try await SupabaseService.shared.client
                    .rpc("get_exercise_volume_trend", params: [
                        "p_client_id": SupabaseService.shared.client.auth.currentUser?.id.uuidString ?? "",
                        "p_exercise_id": exerciseId,
                        "p_days": "90",
                    ])
                    .execute()
                    .value as [[String: Any]]

                await MainActor.run {
                    self.dataPoints = rows.compactMap { row in
                        guard
                            let label = row["week_label"] as? String,
                            let maxW = row["max_weight"] as? Double
                        else { return nil }
                        return VolumePoint(weekLabel: label, maxWeight: maxW)
                    }
                    self.bestWeight = dataPoints.map(\.maxWeight).max() ?? 0
                    self.totalSets = rows.compactMap { $0["session_count"] as? Int }.reduce(0, +)
                    self.isLoading = false
                }
            } catch {
                await MainActor.run { self.isLoading = false }
            }
        }
    }

    struct StatPill: View {
        let label: String
        let value: String
        var body: some View {
            VStack(spacing: 4) {
                Text(value)
                    .font(.title2.bold())
                    .foregroundColor(Color.appTextPrimary)
                Text(label)
                    .font(.caption)
                    .foregroundColor(Color.appTextSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.appSurface)
            .cornerRadius(12)
        }
    }
}
