import SwiftUI
import Supabase
import Realtime
import AVKit

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

    var isVideo: Bool {
        guard let path = videoStoragePath else { return false }
        return !path.isEmpty
    }
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

// MARK: – Signed URL response

private struct SignedURLResponse: Decodable {
    let signedUrl: String
    let expiresAt: String?

    enum CodingKeys: String, CodingKey {
        case signedUrl = "signed_url"
        case expiresAt = "expires_at"
    }
}

// MARK: – ViewModel

@MainActor
final class MessagingViewModel: ObservableObject {
    @Published var messages: [ChatMessage] = []
    @Published var isLoading = false
    @Published var error: String?
    @Published var inputText = ""

    // Video playback
    @Published var videoPlayer: AVPlayer?
    @Published var isLoadingVideo = false
    @Published var videoError: String?

    private let supabase = SupabaseService.shared.client
    private var conversationId: UUID?
    private var currentUserId: UUID?
    private var realtimeChannel: RealtimeChannelV2?

    // MARK: Conversation loading

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

    // MARK: – Video playback

    /// Fetches a short-lived signed URL from the `signedMediaUrl` edge function,
    /// then sets `videoPlayer` ready for presentation.
    func fetchSignedVideoURL(storagePath: String) async throws -> URL {
        let session = try await supabase.auth.session
        let accessToken = session.accessToken

        let supabaseURLString = Bundle.main.infoDictionary?["SUPABASE_URL"] as? String ?? ""
        guard let functionURL = URL(string: "\(supabaseURLString)/functions/v1/signedMediaUrl") else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: functionURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")

        let body = try JSONEncoder().encode(["storage_path": storagePath])
        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200..<300).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        let decoded = try JSONDecoder().decode(SignedURLResponse.self, from: data)
        guard let url = URL(string: decoded.signedUrl) else {
            throw URLError(.badURL)
        }
        return url
    }

    func playVideo(storagePath: String) async {
        isLoadingVideo = true
        videoError = nil
        defer { isLoadingVideo = false }
        do {
            let url = try await fetchSignedVideoURL(storagePath: storagePath)
            videoPlayer = AVPlayer(url: url)
        } catch {
            videoError = error.localizedDescription
        }
    }
}

// MARK: – View

struct MessagingView: View {
    @StateObject private var vm = MessagingViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Message list
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 8) {
                            ForEach(vm.messages) { msg in
                                MessageBubble(message: msg) { storagePath in
                                    Task { await vm.playVideo(storagePath: storagePath) }
                                }
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
            // Video player sheet
            .fullScreenCover(item: Binding(
                get: { vm.videoPlayer },
                set: { if $0 == nil { vm.videoPlayer = nil } }
            )) { player in
                VideoPlayerSheet(player: player) {
                    vm.videoPlayer = nil
                }
            }
            // Video loading overlay
            .overlay {
                if vm.isLoadingVideo {
                    ZStack {
                        Color.black.opacity(0.45).ignoresSafeArea()
                        ProgressView("Loading video…")
                            .progressViewStyle(.circular)
                            .tint(.white)
                            .foregroundStyle(.white)
                    }
                }
            }
            // Network / server errors
            .alert("Error", isPresented: Binding(
                get: { vm.error != nil },
                set: { if !$0 { vm.error = nil } }
            )) {
                Button("OK") { vm.error = nil }
            } message: {
                Text(vm.error ?? "")
            }
            // Video fetch errors
            .alert("Video Error", isPresented: Binding(
                get: { vm.videoError != nil },
                set: { if !$0 { vm.videoError = nil } }
            )) {
                Button("OK") { vm.videoError = nil }
            } message: {
                Text(vm.videoError ?? "")
            }
        }
        .task { await vm.loadConversation() }
    }
}

// MARK: – AVPlayer Identifiable wrapper

extension AVPlayer: @retroactive Identifiable {
    public var id: ObjectIdentifier { ObjectIdentifier(self) }
}

// MARK: – Video player sheet

private struct VideoPlayerSheet: View {
    let player: AVPlayer
    let onDismiss: () -> Void

    var body: some View {
        ZStack(alignment: .topTrailing) {
            Color.black.ignoresSafeArea()
            VideoPlayer(player: player)
                .ignoresSafeArea()
                .onAppear { player.play() }

            Button {
                player.pause()
                onDismiss()
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(.white)
                    .shadow(radius: 4)
            }
            .padding(.top, 52)
            .padding(.trailing, 20)
        }
    }
}

// MARK: – Bubble

private struct MessageBubble: View {
    let message: ChatMessage
    let onPlayVideo: (String) -> Void

    @AppStorage("currentUserId") private var storedUserId = ""

    private var mine: Bool {
        message.senderId.uuidString.lowercased() == storedUserId.lowercased()
    }

    var body: some View {
        HStack {
            if mine { Spacer(minLength: 60) }

            VStack(alignment: mine ? .trailing : .leading, spacing: 4) {
                Group {
                    if message.isVideo, let path = message.videoStoragePath {
                        // Text body (if any) above the video button
                        if let body = message.body, !body.isEmpty {
                            Text(body)
                                .padding(.horizontal, 12)
                                .padding(.top, 8)
                                .padding(.bottom, 2)
                        }

                        // Video play button
                        Button {
                            onPlayVideo(path)
                        } label: {
                            Label("Play video", systemImage: "play.fill")
                                .font(.subheadline.weight(.semibold))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                        }
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
