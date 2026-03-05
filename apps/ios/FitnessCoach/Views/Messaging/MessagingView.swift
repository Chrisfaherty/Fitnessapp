import SwiftUI
import Supabase
import Realtime

// MARK: – Model

struct ChatMessage: Identifiable, Decodable {
    let id: UUID
    let conversationId: UUID
    let senderId: UUID
    let body: String?
    let videoStoragePath: String?
    let sentAt: String

    enum CodingKeys: String, CodingKey {
        case id, body
        case conversationId   = "conversation_id"
        case senderId         = "sender_id"
        case videoStoragePath = "video_storage_path"
        case sentAt           = "sent_at"
    }

    var isVideo: Bool { videoStoragePath != nil }
}

struct Conversation: Decodable {
    let id: UUID
    let clientId: UUID
    let trainerId: UUID
    enum CodingKeys: String, CodingKey {
        case id
        case clientId  = "client_id"
        case trainerId = "trainer_id"
    }
}

// MARK: – ViewModel

@MainActor
final class MessagingViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var inputText = ""

    private let supabase = SupabaseService.shared.client
    private var conversationId: UUID?
    private var currentUserId: UUID?
    private var realtimeChannel: RealtimeChannelV2?

    func loadConversation() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let user = try await supabase.auth.session.user
            currentUserId = user.id

            let convos: [Conversation] = try await supabase
                .from("conversations")
                .select()
                .eq("client_id", value: user.id.uuidString)
                .limit(1)
                .execute()
                .value

            guard let convo = convos.first else {
                error = "No conversation found. Contact your trainer."
                return
            }
            conversationId = convo.id
            await loadMessages(convoId: convo.id)
            subscribeRealtime(convoId: convo.id, userId: user.id)
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func loadMessages(convoId: UUID) async {
        do {
            messages = try await supabase
                .from("messages")
                .select()
                .eq("conversation_id", value: convoId.uuidString)
                .order("sent_at", ascending: true)
                .limit(100)
                .execute()
                .value
        } catch {
            self.error = error.localizedDescription
        }
    }

    func sendMessage() async {
        guard let convoId = conversationId,
              let userId = currentUserId,
              !inputText.trimmingCharacters(in: .whitespaces).isEmpty else { return }

        let text = inputText.trimmingCharacters(in: .whitespaces)
        inputText = ""
        do {
            try await supabase
                .from("messages")
                .insert([
                    "conversation_id": convoId.uuidString,
                    "sender_id":       userId.uuidString,
                    "body":            text
                ])
                .execute()
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func subscribeRealtime(convoId: UUID, userId: UUID) {
        let channel = supabase.channel("messages-\(convoId.uuidString)")
        Task {
            for await insertion in channel.postgresChange(
                InsertAction.self,
                schema: "public",
                table: "messages",
                filter: "conversation_id=eq.\(convoId.uuidString)"
            ) {
                if let newMsg = try? insertion.decodeRecord(as: ChatMessage.self) {
                    if !messages.contains(where: { $0.id == newMsg.id }) {
                        messages.append(newMsg)
                    }
                }
            }
        }
        Task { await channel.subscribe() }
        realtimeChannel = channel
    }
}

// MARK: – View

struct MessagingView: View {
    @StateObject private var vm = MessagingViewModel()
    @Namespace private var bottomID

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Message list
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            ForEach(vm.messages) { msg in
                                MessageBubble(
                                    message: msg,
                                    isOwn: msg.senderId == (vm as AnyObject as? MessagingViewModel)
                                        .flatMap { _ in vm.messages.first }
                                        .map { _ in false } ?? false
                                )
                            }
                            Color.clear.frame(height: 1).id("bottom")
                        }
                        .padding(.horizontal)
                        .padding(.top, 12)
                    }
                    .onChange(of: vm.messages.count) { _ in
                        withAnimation {
                            proxy.scrollTo("bottom", anchor: .bottom)
                        }
                    }
                }

                Divider()

                // Input bar
                HStack(spacing: 10) {
                    TextField("Message…", text: $vm.inputText, axis: .vertical)
                        .lineLimit(1...4)
                        .textFieldStyle(.roundedBorder)

                    Button {
                        Task { await vm.sendMessage() }
                    } label: {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 32))
                            .foregroundStyle(
                                vm.inputText.trimmingCharacters(in: .whitespaces).isEmpty
                                ? Color.secondary
                                : FitnessColors.accent
                            )
                    }
                    .disabled(vm.inputText.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding(.horizontal)
                .padding(.vertical, 8)
                .background(.background)
            }
            .navigationTitle("Messages")
            .alert("Error", isPresented: Binding(
                get: { vm.error != nil },
                set: { if !$0 { vm.error = nil } }
            )) {
                Button("OK") { vm.error = nil }
            } message: {
                Text(vm.error ?? "")
            }
        }
        .task { await vm.loadConversation() }
    }
}

// MARK: – Bubble

private struct MessageBubble: View {
    let message: ChatMessage
    let isOwn: Bool

    // Derive isOwn from senderId stored in AppStorage or UserDefaults
    @AppStorage("currentUserId") private var storedUserId = ""

    private var mine: Bool {
        message.senderId.uuidString.lowercased() == storedUserId.lowercased()
    }

    var body: some View {
        HStack {
            if mine { Spacer(minLength: 60) }

            VStack(alignment: mine ? .trailing : .leading, spacing: 2) {
                Group {
                    if message.isVideo {
                        Label("Video message", systemImage: "video.fill")
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                    } else {
                        Text(message.body ?? "")
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                    }
                }
                .background(mine ? FitnessColors.accent : Color(.secondarySystemBackground))
                .foregroundStyle(mine ? Color.black : Color.primary)
                .clipShape(RoundedRectangle(cornerRadius: 16))

                Text(formattedTime(message.sentAt))
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 4)
            }

            if !mine { Spacer(minLength: 60) }
        }
    }

    private func formattedTime(_ iso: String) -> String {
        String(iso.prefix(16)).replacingOccurrences(of: "T", with: " ")
    }
}
