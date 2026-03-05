import SwiftUI
import Supabase

// MARK: – Model

struct DiaryEntry: Identifiable, Decodable {
    let id: UUID
    let date: String
    let mood: Int?
    let energyLevel: Int?
    let sleepHours: Double?
    let notes: String?
    let createdAt: String

    enum CodingKeys: String, CodingKey {
        case id, date, mood, notes
        case energyLevel  = "energy_level"
        case sleepHours   = "sleep_hours"
        case createdAt    = "created_at"
    }
}

// MARK: – ViewModel

@MainActor
final class DiaryViewModel: ObservableObject {
    @Published var entries: [DiaryEntry] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var showAddSheet = false

    private let supabase = SupabaseService.shared.client

    func loadEntries() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let userId = try await supabase.auth.session.user.id.uuidString
            entries = try await supabase
                .from("diary_entries")
                .select()
                .eq("user_id", value: userId)
                .order("date", ascending: false)
                .limit(30)
                .execute()
                .value
        } catch {
            self.error = error.localizedDescription
        }
    }

    func saveEntry(mood: Int?, energy: Int?, sleep: Double?, notes: String) async {
        do {
            let userId = try await supabase.auth.session.user.id.uuidString
            let today = ISO8601DateFormatter.localDateString()
            try await supabase
                .from("diary_entries")
                .upsert([
                    "user_id":      userId,
                    "date":         today,
                    "mood":         mood.map { String($0) } ?? "",
                    "energy_level": energy.map { String($0) } ?? "",
                    "sleep_hours":  sleep.map { String($0) } ?? "",
                    "notes":        notes.isEmpty ? "" : notes
                ].compactMapValues { $0.isEmpty ? nil : $0 })
                .execute()
            showAddSheet = false
            await loadEntries()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

private extension ISO8601DateFormatter {
    static func localDateString() -> String {
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        return fmt.string(from: Date())
    }
}

// MARK: – View

struct DiaryView: View {
    @StateObject private var vm = DiaryViewModel()

    var body: some View {
        NavigationStack {
            Group {
                if vm.isLoading && vm.entries.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if vm.entries.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "book.closed")
                            .font(.system(size: 48))
                            .foregroundStyle(.secondary)
                        Text("No diary entries yet")
                            .font(.headline)
                        Text("Tap + to log today's entry")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(vm.entries) { entry in
                        DiaryEntryRow(entry: entry)
                    }
                    .listStyle(.insetGrouped)
                }
            }
            .navigationTitle("Daily Diary")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { vm.showAddSheet = true } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $vm.showAddSheet) {
                AddDiaryEntrySheet(vm: vm)
            }
            .alert("Error", isPresented: Binding(
                get: { vm.error != nil },
                set: { if !$0 { vm.error = nil } }
            )) {
                Button("OK") { vm.error = nil }
            } message: {
                Text(vm.error ?? "")
            }
        }
        .task { await vm.loadEntries() }
    }
}

// MARK: – Row

private struct DiaryEntryRow: View {
    let entry: DiaryEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(entry.date)
                    .font(.headline)
                Spacer()
            }
            HStack(spacing: 16) {
                if let mood = entry.mood {
                    Label("\(mood)/10", systemImage: "heart.fill")
                        .font(.caption)
                        .foregroundStyle(moodColor(mood))
                }
                if let energy = entry.energyLevel {
                    Label("\(energy)/10", systemImage: "bolt.fill")
                        .font(.caption)
                        .foregroundStyle(FitnessColors.accent)
                }
                if let sleep = entry.sleepHours {
                    Label(String(format: "%.1fh", sleep), systemImage: "moon.fill")
                        .font(.caption)
                        .foregroundStyle(.indigo)
                }
            }
            if let notes = entry.notes, !notes.isEmpty {
                Text(notes)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 4)
    }

    private func moodColor(_ value: Int) -> Color {
        switch value {
        case 8...: return .green
        case 5...: return .orange
        default:   return .red
        }
    }
}

// MARK: – Add Sheet

private struct AddDiaryEntrySheet: View {
    @ObservedObject var vm: DiaryViewModel
    @State private var mood    = ""
    @State private var energy  = ""
    @State private var sleep   = ""
    @State private var notes   = ""
    @FocusState private var focusedField: Field?

    enum Field { case mood, energy, sleep, notes }

    var body: some View {
        NavigationStack {
            Form {
                Section("Wellbeing") {
                    TextField("Mood (1–10)", text: $mood)
                        .keyboardType(.numberPad)
                        .focused($focusedField, equals: .mood)
                    TextField("Energy (1–10)", text: $energy)
                        .keyboardType(.numberPad)
                        .focused($focusedField, equals: .energy)
                    TextField("Sleep hours", text: $sleep)
                        .keyboardType(.decimalPad)
                        .focused($focusedField, equals: .sleep)
                }
                Section("Notes") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 100)
                        .focused($focusedField, equals: .notes)
                }
            }
            .navigationTitle("Today's Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { vm.showAddSheet = false }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await vm.saveEntry(
                                mood:   Int(mood),
                                energy: Int(energy),
                                sleep:  Double(sleep),
                                notes:  notes
                            )
                        }
                    }
                }
                ToolbarItem(placement: .keyboard) {
                    Button("Done") { focusedField = nil }
                }
            }
        }
    }
}
