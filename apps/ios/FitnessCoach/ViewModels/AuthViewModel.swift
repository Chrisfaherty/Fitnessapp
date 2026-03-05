import Foundation
import Supabase
import Combine

enum AuthState: Equatable {
    case loading
    case unauthenticated
    case authenticated
}

@MainActor
final class AuthViewModel: ObservableObject {
    @Published private(set) var state: AuthState = .loading
    @Published private(set) var profile: UserProfile?
    @Published var errorMessage: String?

    private let supabase = SupabaseService.shared.client

    init() {
        Task { await checkSession() }
    }

    func checkSession() async {
        do {
            let session = try await supabase.auth.session
            if session.user.id != UUID() {
                await loadProfile(userId: session.user.id.uuidString)
                state = .authenticated
            } else {
                state = .unauthenticated
            }
        } catch {
            state = .unauthenticated
        }
    }

    func signIn(email: String, password: String) async {
        state = .loading
        errorMessage = nil
        do {
            let session = try await supabase.auth.signIn(email: email, password: password)
            await loadProfile(userId: session.user.id.uuidString)
            state = .authenticated
        } catch {
            errorMessage = error.localizedDescription
            state = .unauthenticated
        }
    }

    func signOut() async {
        do {
            try await supabase.auth.signOut()
        } catch {}
        profile = nil
        state = .unauthenticated
    }

    private func loadProfile(userId: String) async {
        do {
            let p: UserProfile = try await supabase
                .from("profiles")
                .select()
                .eq("id", value: userId)
                .single()
                .execute()
                .value
            profile = p
        } catch {
            print("Failed to load profile: \(error)")
        }
    }
}

struct UserProfile: Codable, Identifiable {
    let id: String
    let role: String
    let fullName: String
    let avatarUrl: String?
    let timezone: String

    enum CodingKeys: String, CodingKey {
        case id, role, timezone
        case fullName  = "full_name"
        case avatarUrl = "avatar_url"
    }

    var isTrainer: Bool { role == "trainer" || role == "admin" }
}
