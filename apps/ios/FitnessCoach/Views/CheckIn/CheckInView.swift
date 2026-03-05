import SwiftUI
import Supabase

struct CheckInView: View {
    @EnvironmentObject private var authVM: AuthViewModel
    @StateObject private var vm = CheckInViewModel()
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    if let current = vm.currentCheckIn {
                        if current.status == "reviewed" {
                            TrainerResponseCard(checkIn: current)
                        }
                        CheckInForm(checkIn: binding(current), isSubmitting: $isSubmitting) {
                            Task { await vm.submitCheckIn() }
                        }
                    } else {
                        Button {
                            Task { await vm.createCheckIn() }
                        } label: {
                            Label("Start This Week's Check-In", systemImage: "plus.circle.fill")
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity).frame(height: 52)
                                .background(Color.accent).foregroundColor(.accentFG)
                                .cornerRadius(14)
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .background(Color.appBackgroundFallback.ignoresSafeArea())
            .navigationTitle("Weekly Check-In")
            .task { await vm.loadCheckIn(userId: authVM.profile?.id ?? "") }
        }
    }

    private func binding(_ checkIn: CheckInData) -> Binding<CheckInData> {
        Binding(
            get: { vm.currentCheckIn ?? checkIn },
            set: { vm.currentCheckIn = $0 }
        )
    }
}

struct CheckInData: Codable, Identifiable {
    var id: String
    var status: String
    var bodyWeightKg: Double?
    var energyLevel: Int?
    var stressLevel: Int?
    var sleepQuality: Int?
    var clientNotes: String?
    var trainerNotes: String?
    var weekStartDate: String

    enum CodingKeys: String, CodingKey {
        case id, status
        case bodyWeightKg   = "body_weight_kg"
        case energyLevel    = "energy_level"
        case stressLevel    = "stress_level"
        case sleepQuality   = "sleep_quality"
        case clientNotes    = "client_notes"
        case trainerNotes   = "trainer_notes"
        case weekStartDate  = "week_start_date"
    }
}

struct CheckInForm: View {
    @Binding var checkIn: CheckInData
    @Binding var isSubmitting: Bool
    let onSubmit: () -> Void

    @State private var weightStr = ""

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            Text("Week of \(checkIn.weekStartDate)")
                .font(.headline).foregroundColor(.appTextFallback)

            // Weight
            VStack(alignment: .leading, spacing: 6) {
                Text("BODY WEIGHT (kg)").font(.caption).fontWeight(.semibold)
                    .foregroundColor(.appTextSecondaryFallback).tracking(1)
                TextField("e.g. 80.5", text: $weightStr)
                    .keyboardType(.decimalPad)
                    .padding().background(Color.appSurfaceFallback).cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.appBorderFallback, lineWidth: 1))
                    .onChange(of: weightStr) { checkIn.bodyWeightKg = Double($0) }
            }

            // Rating sliders
            RatingRow(label: "Energy Level", value: Binding(get: { checkIn.energyLevel ?? 3 }, set: { checkIn.energyLevel = $0 }))
            RatingRow(label: "Stress Level", value: Binding(get: { checkIn.stressLevel ?? 3 }, set: { checkIn.stressLevel = $0 }))
            RatingRow(label: "Sleep Quality", value: Binding(get: { checkIn.sleepQuality ?? 3 }, set: { checkIn.sleepQuality = $0 }))

            // Notes
            VStack(alignment: .leading, spacing: 6) {
                Text("NOTES").font(.caption).fontWeight(.semibold)
                    .foregroundColor(.appTextSecondaryFallback).tracking(1)
                TextEditor(text: Binding(get: { checkIn.clientNotes ?? "" }, set: { checkIn.clientNotes = $0 }))
                    .frame(minHeight: 100)
                    .padding(8).background(Color.appSurfaceFallback).cornerRadius(12)
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.appBorderFallback, lineWidth: 1))
            }

            if checkIn.status == "pending" {
                Button(action: onSubmit) {
                    Group {
                        if isSubmitting { ProgressView().tint(.accentFG) }
                        else { Text("Submit Check-In").fontWeight(.semibold) }
                    }
                    .frame(maxWidth: .infinity).frame(height: 52)
                    .background(Color.accent).foregroundColor(.accentFG).cornerRadius(14)
                }
                .disabled(isSubmitting)
            }
        }
        .padding()
        .background(Color.appSurfaceFallback).cornerRadius(16)
        .padding(.horizontal)
        .onAppear { weightStr = checkIn.bodyWeightKg.map { String(format: "%.1f", $0) } ?? "" }
    }
}

struct RatingRow: View {
    let label: String
    @Binding var value: Int

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(label.uppercased()).font(.caption).fontWeight(.semibold)
                    .foregroundColor(.appTextSecondaryFallback).tracking(1)
                Spacer()
                Text("\(value)/5").font(.caption).fontWeight(.bold).foregroundColor(.accent)
            }
            HStack(spacing: 8) {
                ForEach(1...5, id: \.self) { n in
                    Button { value = n } label: {
                        Image(systemName: n <= value ? "star.fill" : "star")
                            .foregroundColor(n <= value ? .accent : .appBorderFallback)
                            .font(.title3)
                    }
                    .buttonStyle(.plain)
                }
                Spacer()
            }
        }
    }
}

struct TrainerResponseCard: View {
    let checkIn: CheckInData

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Image(systemName: "person.fill.checkmark").foregroundColor(.accent)
                Text("Trainer Response").font(.headline).foregroundColor(.appTextFallback)
            }
            if let notes = checkIn.trainerNotes {
                Text(notes).font(.body).foregroundColor(.appTextFallback)
            }
        }
        .padding()
        .background(Color.accent.opacity(0.1)).cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.accent.opacity(0.3), lineWidth: 1))
        .padding(.horizontal)
    }
}

@MainActor
final class CheckInViewModel: ObservableObject {
    @Published var currentCheckIn: CheckInData?
    private let supabase = SupabaseService.shared.client
    private var userId: String = ""

    func loadCheckIn(userId: String) async {
        self.userId = userId
        let weekStart = currentWeekMonday()
        do {
            let result: CheckInData? = try await supabase
                .from("check_ins")
                .select()
                .eq("client_id", value: userId)
                .eq("week_start_date", value: weekStart)
                .maybeSingle()
                .execute()
                .value
            currentCheckIn = result
        } catch { print("Check-in load error: \(error)") }
    }

    func createCheckIn() async {
        let weekStart = currentWeekMonday()
        do {
            let created: CheckInData = try await supabase
                .from("check_ins")
                .insert(["client_id": userId, "week_start_date": weekStart, "status": "pending"])
                .single().execute().value
            currentCheckIn = created
        } catch { print("Create check-in error: \(error)") }
    }

    func submitCheckIn() async {
        guard let ci = currentCheckIn else { return }
        do {
            try await supabase.from("check_ins").update(["status": "submitted"]).eq("id", value: ci.id).execute()
            currentCheckIn?.status = "submitted"
        } catch { print("Submit error: \(error)") }
    }

    private func currentWeekMonday() -> String {
        let cal = Calendar(identifier: .iso8601)
        let monday = cal.dateInterval(of: .weekOfYear, for: Date())!.start
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        return f.string(from: monday)
    }
}
