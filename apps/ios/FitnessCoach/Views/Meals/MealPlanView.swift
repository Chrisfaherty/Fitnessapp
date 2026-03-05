import SwiftUI
import Supabase

// MARK: – Models

struct MealPlan: Identifiable, Decodable {
    let id: UUID
    let title: String
    let notes: String?
    let startDate: String?
    let endDate: String?

    enum CodingKeys: String, CodingKey {
        case id, title, notes
        case startDate = "start_date"
        case endDate   = "end_date"
    }
}

struct MealPlanDay: Identifiable, Decodable {
    let id: UUID
    let mealPlanId: UUID
    let dayLabel: String
    let meals: String?
    let totalCalories: Int?
    let proteinG: Int?
    let carbsG: Int?
    let fatG: Int?

    enum CodingKeys: String, CodingKey {
        case id, meals
        case mealPlanId    = "meal_plan_id"
        case dayLabel      = "day_label"
        case totalCalories = "total_calories"
        case proteinG      = "protein_g"
        case carbsG        = "carbs_g"
        case fatG          = "fat_g"
    }
}

struct MealPlanWithDays: Identifiable {
    let plan: MealPlan
    let days: [MealPlanDay]
    var id: UUID { plan.id }
}

// MARK: – ViewModel

@MainActor
final class MealPlanViewModel: ObservableObject {
    @Published var plansWithDays: [MealPlanWithDays] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var expandedPlanId: UUID?

    private let supabase = SupabaseService.shared.client

    func loadMealPlans() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let userId = try await supabase.auth.session.user.id.uuidString
            let plans: [MealPlan] = try await supabase
                .from("meal_plans")
                .select()
                .eq("client_id", value: userId)
                .order("created_at", ascending: false)
                .execute()
                .value

            var result: [MealPlanWithDays] = []
            for plan in plans {
                let days: [MealPlanDay] = try await supabase
                    .from("meal_plan_days")
                    .select()
                    .eq("meal_plan_id", value: plan.id.uuidString)
                    .order("day_label", ascending: true)
                    .execute()
                    .value
                result.append(MealPlanWithDays(plan: plan, days: days))
            }
            plansWithDays = result
        } catch {
            self.error = error.localizedDescription
        }
    }

    func toggleExpand(_ planId: UUID) {
        expandedPlanId = expandedPlanId == planId ? nil : planId
    }
}

// MARK: – View

struct MealPlanView: View {
    @StateObject private var vm = MealPlanViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading && vm.plansWithDays.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if vm.plansWithDays.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "fork.knife")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        Text("No meal plans yet")
                            .font(.headline)
                        Text("Your trainer will add your meal plan here")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(vm.plansWithDays) { item in
                            MealPlanSection(
                                item: item,
                                isExpanded: vm.expandedPlanId == item.id,
                                onToggle: { vm.toggleExpand(item.id) }
                            )
                        }
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Meal Plans")
            .refreshable { await vm.loadMealPlans() }
            .alert("Error", isPresented: Binding(
                get: { vm.error != nil },
                set: { if !$0 { vm.error = nil } }
            )) {
                Button("OK") { vm.error = nil }
            } message: {
                Text(vm.error ?? "")
            }
        }
        .task { await vm.loadMealPlans() }
    }
}

// MARK: – Plan Section

private struct MealPlanSection: View {
    let item: MealPlanWithDays
    let isExpanded: Bool
    let onToggle: () -> Void

    var body: some View {
        Section {
            // Header tap target
            Button(action: onToggle) {
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.plan.title)
                            .font(.headline)
                            .foregroundStyle(.primary)
                        if let start = item.plan.startDate {
                            let range = item.plan.endDate.map { " → \($0)" } ?? ""
                            Text("\(start)\(range)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        if let notes = item.plan.notes {
                            Text(notes)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                                .lineLimit(2)
                        }
                    }
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)

            // Days (when expanded)
            if isExpanded {
                ForEach(item.days) { day in
                    MealDayRow(day: day)
                }
            }
        }
    }
}

// MARK: – Day Row

private struct MealDayRow: View {
    let day: MealPlanDay

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(day.dayLabel)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(FitnessColors.accent)

            if let meals = day.meals, !meals.isEmpty {
                Text(meals)
                    .font(.body)
            }

            let macros: [String] = [
                day.totalCalories.map { "\($0) kcal" },
                day.proteinG.map { "P \($0)g" },
                day.carbsG.map { "C \($0)g" },
                day.fatG.map { "F \($0)g" }
            ].compactMap { $0 }

            if !macros.isEmpty {
                Text(macros.joined(separator: " · "))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}
