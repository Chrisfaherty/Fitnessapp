# FitnessCoach — Agent Instructions

This file contains everything an AI agent needs to understand and work with this codebase.

## Project Overview

Full-stack fitness coaching platform. Monorepo with Supabase backend, Next.js web app, SwiftUI iOS app, and Kotlin Android app.

## Critical Rules

- **NEVER use Google Fit** — iOS uses HealthKit, Android uses Health Connect
- **NEVER commit `.env.local`** — it is in `.gitignore`
- **NEVER run `git push --force` on main** without explicit user confirmation
- **ALWAYS run `supabase db reset` after adding migrations** to test them locally
- **ALWAYS upsert health data** — never insert-only, health sync must be idempotent
- All Supabase writes from mobile go through the anon key with RLS. Service role is ONLY for edge functions and the import tool.

## Local Dev Setup (in order)

```bash
# 1. Install dependencies
pnpm install

# 2. Start local Supabase (requires Docker)
supabase start

# 3. Apply migrations + seed
supabase db reset

# 4. Copy env file
cp .env.example apps/web/.env.local
# Fill in values from `supabase start` output

# 5. Run web app
pnpm --filter web dev

# 6. (Optional) Import exercises
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_KEY=<service-key> \
pnpm --filter import-exercises run import
```

## Key Commands

| Command | What it does |
|---------|-------------|
| `supabase start` | Start local Supabase stack |
| `supabase db reset` | Wipe + re-apply migrations + seed |
| `supabase db push` | Push migrations to remote project |
| `supabase functions deploy` | Deploy edge functions to remote |
| `pnpm --filter web dev` | Start Next.js dev server |
| `pnpm --filter web build` | Build Next.js for production |
| `pnpm --filter web test` | Run vitest unit tests |
| `pnpm --filter web test:e2e` | Run Playwright E2E tests |
| `supabase gen types typescript --local > apps/web/src/types/database.ts` | Regenerate DB types |
| `pnpm db:test` | Run pgTAP database tests |

## Architecture — Quick Reference

```
User → Supabase Auth (JWT) → RLS policies → Postgres tables
                                          → Storage buckets
                                          → Edge Functions (Deno)
                                          → Realtime subscriptions
```

**RLS helpers:**
- `is_admin()` — checks `profiles.role = 'admin'`
- `is_linked_trainer(p_client_id)` — checks `trainer_clients.active = true`

## Directory Map

```
supabase/migrations/
  001_initial_schema.sql    # profiles, trainer_clients, health_*, diary_entries,
                            # check_ins, meal_plans, conversations, messages, weekly_summaries
  002_exercises_and_workouts.sql  # exercises, workout_templates, sessions, sets
  003_rls_policies.sql      # All RLS policies
  004_storage.sql           # Storage buckets + policies

apps/web/src/
  app/(auth)/               # Login page
  app/(dashboard)/
    trainer/                # Trainer-only pages
      clients/              # Client list + detail
      templates/            # Template list + builder
      exercises/            # Exercise library
      messaging/            # Real-time messaging
    client/                 # Client-only pages
      workouts/diary/check-ins/meals/
  lib/supabase/
    server.ts               # createServerSupabaseClient() for RSC
    client.ts               # createBrowserSupabaseClient() for client components
    middleware.ts           # Session refresh middleware
  types/database.ts         # Auto-generated Supabase types (regenerate with supabase gen types)

apps/ios/FitnessCoach/
  Services/HealthKit/
    HealthDataClient.swift  # Protocol (testable interface)
    HealthKitClient.swift   # Real implementation
    MockHealthDataClient.swift  # For unit tests
  ViewModels/               # @MainActor MVVM classes
  Views/                    # SwiftUI views organized by feature

apps/android/app/src/main/java/com/fitnessapp/
  data/health/
    HealthDataClient.kt     # Interface (testable)
    HealthConnectClient.kt  # Real implementation
    FakeHealthDataClient.kt # For unit tests
    SyncRepository.kt       # Orchestrates sync
  ui/                       # MVVM ViewModels + Compose screens by feature
```

## Supabase Tables (all 16)

`profiles`, `trainer_clients`, `health_daily`, `health_workouts`, `diary_entries`,
`check_ins`, `meal_plans`, `meal_plan_days`, `conversations`, `messages`,
`weekly_summaries`, `exercises`, `workout_templates`, `workout_template_exercises`,
`workout_assignments`, `workout_sessions`, `workout_session_sets`

## Adding a New Feature — Checklist

1. **DB schema:** Add migration in `supabase/migrations/00X_name.sql`
2. **RLS:** Add policies to `003_rls_policies.sql` or new migration
3. **Types:** Regenerate with `supabase gen types typescript --local`
4. **Web:** Add server page → client component pattern
5. **iOS:** Add Model → ViewModel (@MainActor) → View
6. **Android:** Add ViewModel (Hilt) → Screen (Composable)
7. **Tests:** Add pgTAP assertions in `tests/db/`

## Design Tokens

- Accent: `#A3FF12` — `FitnessColors.accent` (iOS), `FitnessColors.Accent` (Android), `text-accent`/`bg-accent` (web)
- Light bg: `#F7F7FA` | Dark bg: `#0B0C10`
- Light surface: `#FFFFFF` | Dark surface: `#12131A`

## Demo Credentials (seed.sql)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@fitnessapp.dev` | `Admin1234!` |
| Trainer 1 | `trainer1@fitnessapp.dev` | `Trainer1234!` |
| Trainer 2 | `trainer2@fitnessapp.dev` | `Trainer1234!` |
| Client 1 (linked to trainer1) | `client1@fitnessapp.dev` | `Client1234!` |
| Client 2 (linked to trainer1) | `client2@fitnessapp.dev` | `Client1234!` |
| Client 3 (linked to trainer2) | `client3@fitnessapp.dev` | `Client1234!` |
| Client (unlinked — for RLS tests) | `client_unlinked@fitnessapp.dev` | `Client1234!` |

## Common Pitfalls

1. **`supabase start` fails:** Ensure Docker is running. Run `docker ps` to verify.
2. **Android emulator can't reach Supabase:** Use `10.0.2.2` not `127.0.0.1`
3. **iOS HealthKit permissions in simulator:** HK doesn't work in simulator — use `MockHealthDataClient` for tests
4. **`supabase gen types` gives empty file:** Local Supabase must be running (`supabase start`)
5. **Realtime not working:** Check that `supabase/config.toml` has `[realtime]` enabled
6. **RLS blocking reads:** Check you're calling with the correct user's session. Service role bypasses RLS.
