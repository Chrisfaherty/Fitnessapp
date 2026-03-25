# FitCoach — Push Notification Setup

## Overview

Push notifications flow through:
```
DB event → Supabase Database Webhook → `sendPushNotification` Edge Function → APNS (iOS) / FCM (Android)
```

---

## 1. Environment Variables

Add these to your Supabase project's Edge Function secrets (Dashboard → Edge Functions → Manage secrets):

| Variable | Description |
|----------|-------------|
| `APNS_KEY_ID` | 10-character key ID from Apple Developer portal |
| `APNS_TEAM_ID` | 10-character team ID from Apple Developer portal |
| `APNS_PRIVATE_KEY` | Contents of `.p8` file, newlines replaced with `\n` |
| `APNS_BUNDLE_ID` | `com.fitcoach.app` |
| `FCM_PROJECT_ID` | Firebase project ID |
| `FCM_SERVICE_ACCOUNT_KEY` | Full service account JSON, stringified (one line) |

For local development, add these to `supabase/functions/.env` (gitignored):

```
APNS_KEY_ID=
APNS_TEAM_ID=
APNS_PRIVATE_KEY=
APNS_BUNDLE_ID=com.fitcoach.app
FCM_PROJECT_ID=
FCM_SERVICE_ACCOUNT_KEY=
```

---

## 2. Apple APNS Setup

1. Log in to [developer.apple.com](https://developer.apple.com)
2. Go to **Certificates, Identifiers & Profiles → Keys**
3. Create a new key, enable **Apple Push Notifications service (APNs)**
4. Download the `.p8` file — **you can only download this once**
5. Note your **Key ID** and **Team ID** (top right of the page)
6. Set `APNS_KEY_ID`, `APNS_TEAM_ID`, and `APNS_PRIVATE_KEY` in your secrets
   - For `APNS_PRIVATE_KEY`: copy the `.p8` contents and replace literal newlines with `\n`

### iOS App configuration

1. In Xcode → Signing & Capabilities → add **Push Notifications** capability
2. Add **Background Modes** capability → check **Remote notifications**
3. The `PushNotificationService.swift` handles registration and token upsert automatically

---

## 3. Android FCM Setup

1. Go to [Firebase Console](https://console.firebase.google.com) → your project
2. Project Settings → Service Accounts → **Generate new private key**
3. Download the JSON file and stringify it: `JSON.stringify(require('./service-account.json'))`
4. Set `FCM_PROJECT_ID` and `FCM_SERVICE_ACCOUNT_KEY` in your secrets

### Android App configuration

1. In Firebase Console → Project Settings → Your apps → Android
2. Download `google-services.json`
3. Place it at `apps/android/app/google-services.json` (gitignored)
4. The `FitCoachMessagingService` handles token registration automatically

---

## 4. Database Webhooks

Configure these in the Supabase Dashboard → **Database → Webhooks**:

### Webhook 1: New message notification
- **Name**: `notify_new_message`
- **Table**: `public.messages`
- **Events**: INSERT
- **URL**: `https://{YOUR_PROJECT_REF}.supabase.co/functions/v1/sendPushNotification`
- **HTTP Headers**:
  - `Authorization: Bearer {SERVICE_ROLE_KEY}`

### Webhook 2: Check-in reviewed notification
- **Name**: `notify_checkin_reviewed`
- **Table**: `public.check_ins`
- **Events**: UPDATE
- **URL**: `https://{YOUR_PROJECT_REF}.supabase.co/functions/v1/sendPushNotification`
- **HTTP Headers**:
  - `Authorization: Bearer {SERVICE_ROLE_KEY}`

### Webhook 3: Workout assigned notification
- **Name**: `notify_workout_assigned`
- **Table**: `public.workout_assignments`
- **Events**: INSERT
- **URL**: `https://{YOUR_PROJECT_REF}.supabase.co/functions/v1/sendPushNotification`
- **HTTP Headers**:
  - `Authorization: Bearer {SERVICE_ROLE_KEY}`

---

## 5. Local Testing

To test the function locally without real credentials:

```bash
supabase functions serve sendPushNotification --env-file supabase/functions/.env
```

When `APNS_KEY_ID` or `FCM_SERVICE_ACCOUNT_KEY` are not set, the function degrades gracefully and returns `{ sent: 0, failed: N }` without crashing.

---

## 6. Deep Links

The function sends a `deepLink` field in the notification payload. Configure URL schemes in the apps:

| Trigger | Deep link |
|---------|-----------|
| New message | `fitcoach://messaging` |
| Check-in reviewed | `fitcoach://check-ins` |
| Workout assigned | `fitcoach://workouts` |

**iOS**: Add `fitcoach` URL scheme to `Info.plist` under `CFBundleURLSchemes`.
**Android**: Add intent filter in `AndroidManifest.xml` for `fitcoach://` scheme.
