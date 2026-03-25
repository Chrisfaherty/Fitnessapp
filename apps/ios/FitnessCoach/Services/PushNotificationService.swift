import Foundation
import UserNotifications
import UIKit
import Supabase

@MainActor
final class PushNotificationService: NSObject {
    static let shared = PushNotificationService()

    private override init() {
        super.init()
    }

    // MARK: - Request Permission + Register

    func requestAuthorizationAndRegister() async {
        let center = UNUserNotificationCenter.current()
        center.delegate = self

        do {
            let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
            guard granted else {
                print("[PushNotificationService] Permission denied")
                return
            }
            await MainActor.run {
                UIApplication.shared.registerForRemoteNotifications()
            }
        } catch {
            print("[PushNotificationService] requestAuthorization error: \(error)")
        }
    }

    // MARK: - Save Token

    func saveDeviceToken(_ tokenData: Data, userId: String) async {
        let token = tokenData.map { String(format: "%02x", $0) }.joined()
        do {
            try await SupabaseService.shared.client
                .from("push_tokens")
                .upsert(
                    [
                        "user_id": userId,
                        "token": token,
                        "platform": "ios",
                    ],
                    onConflict: "user_id,platform"
                )
                .execute()
            print("[PushNotificationService] Token saved: \(token.prefix(12))…")
        } catch {
            print("[PushNotificationService] Failed to save token: \(error)")
        }
    }

    // MARK: - Handle Notification Tap

    func handleNotificationResponse(_ response: UNNotificationResponse) {
        let userInfo = response.notification.request.content.userInfo
        guard let deepLink = userInfo["deepLink"] as? String,
              let url = URL(string: deepLink) else { return }
        // Post notification for the app to handle navigation
        NotificationCenter.default.post(
            name: .fitCoachDeepLink,
            object: nil,
            userInfo: ["url": url]
        )
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension PushNotificationService: UNUserNotificationCenterDelegate {
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .badge, .sound])
    }

    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        Task { @MainActor in
            self.handleNotificationResponse(response)
        }
        completionHandler()
    }
}

// MARK: - Notification Name

extension Notification.Name {
    static let fitCoachDeepLink = Notification.Name("fitCoachDeepLink")
}
