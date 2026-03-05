# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Supabase (BaaS)                             │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Postgres │  │   Auth   │  │ Storage  │  │  Edge Functions    │ │
│  │  + RLS   │  │  (JWT)   │  │ (S3-like)│  │  (Deno/TS)        │ │
│  └──────────┘  └──────────┘  └──────────┘  └────────────────────┘ │
│       ↑              ↑             ↑                ↑              │
└───────┼──────────────┼─────────────┼────────────────┼──────────────┘
        │              │             │                │
   ┌────┴────┐    ┌────┴───┐   ┌────┴───┐      ┌─────┴──────┐
   │ Next.js │    │iOS App │   │Android │      │  Realtime  │
   │ (Web)   │    │(Swift) │   │(Kotlin)│      │ Subscriptions│
   └─────────┘    └────────┘   └────────┘      └────────────┘
```

## Data Flow

### Health Sync (iOS / Android)
```
HealthKit/Health Connect
  → Platform SDK (HealthKitClient / HealthConnectClient)
  → SyncService / SyncRepository
  → Supabase health_daily (upsert, conflict on user_id+date)
  → Supabase health_workouts (upsert, conflict on user_id+external_id)
```

### Workout Session
```
Trainer creates template (Web)
  → workout_templates + workout_template_exercises
  → workout_assignments (trainer assigns to client)

Client opens app (iOS/Android)
  → WorkoutViewModel.loadAssignments()
  → Starts session → workout_sessions row
  → Logs sets → workout_session_sets rows
  → Finishes → session duration saved, assignment marked complete
```

### Messaging
```
Trainer sends video (Web)
  → Upload to Supabase Storage (message-videos bucket)
  → signedMediaUrl edge function validates participant
  → Returns 1-hour signed URL for playback

Realtime chat (iOS/Android/Web)
  → Supabase Realtime postgres_changes on messages table
  → INSERT events streamed to subscribers in conversation
```

### Weekly Summary (Automated)
```
Supabase Cron (Sunday 23:00 UTC)
  → weeklySummary edge function
  → Aggregates health_daily for past 7 days per client
  → Upserts weekly_summaries table
  → Available in trainer dashboard next Monday
```

## Platform Clients

### Web (apps/web)
- **Framework:** Next.js 14 App Router (React Server Components default)
- **Auth:** `@supabase/ssr` server/client/middleware triple-client pattern
- **Routing:** Route groups `(auth)` and `(dashboard)` for layout separation
- **Data:** Server components fetch via `createServerSupabaseClient()` using cookie-based auth
- **Realtime:** Client components subscribe to Supabase Realtime channels

### iOS (apps/ios/FitnessCoach)
- **Pattern:** MVVM + `@MainActor` async/await ViewModels
- **Health:** `HealthDataClient` protocol with real (`HealthKitClient`) and mock implementations
- **DI:** `@EnvironmentObject` for cross-view state sharing
- **Sync:** `SyncService` calls HealthKit → upserts to Supabase on foreground launch

### Android (apps/android)
- **Pattern:** MVVM + `StateFlow` + Hilt DI
- **Health:** `HealthDataClient` interface with `HealthConnectHealthDataClient` / `FakeHealthDataClient`
- **DI:** Hilt `@HiltViewModel` + `@Singleton` modules
- **Sync:** `SyncRepository` called from `DashboardViewModel.init`

## Security Model
See [rls-policies.md](./rls-policies.md) for full RLS breakdown.

Key rules:
- Every table has RLS enabled
- Clients see only their own rows
- Trainers see linked clients' rows via `is_linked_trainer(client_id)`
- Admins see all rows via `is_admin()`
- Service role (Edge Functions only) bypasses RLS for aggregations
