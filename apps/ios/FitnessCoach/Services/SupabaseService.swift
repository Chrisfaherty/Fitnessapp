import Foundation
import Supabase

// MARK: - SupabaseService Singleton
final class SupabaseService {
    static let shared = SupabaseService()

    let client: SupabaseClient

    private init() {
        let url = URL(string: Bundle.main.infoDictionary?["SUPABASE_URL"] as? String ?? "")!
        let key = Bundle.main.infoDictionary?["SUPABASE_ANON_KEY"] as? String ?? ""
        client = SupabaseClient(supabaseURL: url, supabaseKey: key)
    }
}
