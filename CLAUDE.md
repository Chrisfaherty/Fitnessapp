# FitCoach — Agent Instructions

This file contains everything an AI agent needs to understand and work with this codebase.

## Project Identity

| Property | Value |
|----------|-------|
| Project name | **FitCoach** |
| Repo root | `fitnessapp/` |
| App name in UI | FitCoach |
| iOS bundle ID | `com.fitcoach.app` |
| Android package | `com.fitcoach.app` |
| Demo email domain | `@fitcoach.dev` |
| Demo password (all users) | `FitCoach123!` |

## Critical Rules

- **NEVER use Google Fit** — iOS uses HealthKit, Android uses Health Connect
- **NEVER commit `.env.local`** — it is in `.gitignore`
- **NEVER run `git push --force` on main** without explicit user confirmation
- **ALWAYS run `supabase db reset` after adding migrations** to test them locally
- **ALWAYS upsert health data** — never insert-only, health sync must be idempotent (`onConflict: 'user_id,date'`)
- All Supabase writes from mobile go through the anon key with RLS. Service role is ONLY for edge functions.
- **No light mode** — the app is always dark. Never add `dark:` class variants or `prefers-color-scheme: light` branches.
- **`@supabase/supabase-js` stays at `2.43.4`** — v2.98+ has breaking generic type changes.

## Design Tokens (canonical)

| Token | Value |
|-------|-------|
| `--color-background` | `#0B0C10` |
| `--color-surface` | `#12131A` |
| `--color-surface-elevated` | `#1C1D26` |
| `--color-border` | `rgba(255,255,255,0.08)` |
| `--color-text` | `#F0F0F0` |
| `--color-text-secondary` | `rgba(240,240,240,0.55)` |
| `accent` | `#A3FF12` |

Fonts: **Syne** (display/headings) + **DM Sans** (body). Both loaded via `next/font/google`.

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
  001_initial_schema.sql
  002_exercises_and_workouts.sql
  003_rls_policies.sql
  004_storage.sql

apps/web/src/
  app/auth/
    login/page.tsx          # /auth/login (canonical login route)
    callback/route.ts       # /auth/callback (OAuth)
  app/(dashboard)/
    trainer/
      page.tsx              # Dashboard
      clients/              # Client list + [clientId] detail
      check-ins/            # Check-in review with slide-over panel
      templates/            # Template list + new + [id]/edit
      exercises/            # Exercise library
      messaging/            # Real-time chat
      meal-plans/           # Meal plan list + new builder
      assign/               # Workout assignment wizard
    client/
      page.tsx              # Dashboard
      workouts/             # Assignment list + [assignmentId] detail
      diary/
      check-ins/
      meals/
  lib/supabase/
    server.ts               # createServerSupabaseClient()
    client.ts               # createClientSupabaseClient()
    middleware.ts           # Auth refresh (redirects to /auth/login)
  types/database.ts

apps/ios/FitnessCoach/
  App/FitCoachApp.swift     # App entry + BGTask registration
  Services/HealthKit/
  ViewModels/
  Views/

apps/android/app/src/main/java/com/fitnessapp/
  data/health/
    HealthSyncWorker.kt     # WorkManager 6-hour periodic sync
  ui/

tests/db/rls_tests.sql      # 21 pgTAP RLS assertions
apps/web/tests/e2e/
  fitcoach.spec.ts          # 7 Playwright describe blocks
```

## Supabase Tables (all 16)

`profiles`, `trainer_clients`, `health_daily`, `health_workouts`, `diary_entries`,
`check_ins`, `meal_plans`, `meal_plan_days`, `conversations`, `messages`,
`weekly_summaries`, `exercises`, `workout_templates`, `workout_template_exercises`,
`workout_assignments`, `workout_sessions`, `workout_session_sets`

## Complete Web Route Map

| Route | Type | Notes |
|-------|------|-------|
| `/` | Server | Redirect to `/auth/login` or role dashboard |
| `/auth/login` | Server | Login page |
| `/auth/callback` | Route handler | OAuth exchange |
| `/trainer` | Server | Dashboard |
| `/trainer/clients` | Server | Client grid |
| `/trainer/clients/[clientId]` | Server | Tabbed client detail |
| `/trainer/check-ins` | Server+Client | Review submitted check-ins, slide-over panel |
| `/trainer/templates` | Server | Template list |
| `/trainer/templates/new` | Client | Drag-drop builder |
| `/trainer/templates/[id]/edit` | Server+Client | Pre-populated builder |
| `/trainer/exercises` | Client | Exercise library |
| `/trainer/messaging` | Client | Real-time chat |
| `/trainer/meal-plans` | Server | Meal plan list |
| `/trainer/meal-plans/new` | Client | 3-step meal plan builder |
| `/trainer/assign` | Server+Client | Assignment wizard (`?clientId=` pre-fills) |
| `/client` | Server | Dashboard with sparklines + heatmap |
| `/client/workouts` | Server | Assignment list |
| `/client/workouts/[assignmentId]` | Server+Client | Detail + Start Workout |
| `/client/diary` | Client | Daily diary |
| `/client/check-ins` | Client | 3-step check-in wizard |
| `/client/meals` | Server | Active meal plan |

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@fitcoach.dev` | `FitCoach123!` |
| Trainer 1 | `trainer1@fitcoach.dev` | `FitCoach123!` |
| Trainer 2 | `trainer2@fitcoach.dev` | `FitCoach123!` |
| Client 1 (linked to trainer1) | `client1@fitcoach.dev` | `FitCoach123!` |
| Client 2 (linked to trainer1) | `client2@fitcoach.dev` | `FitCoach123!` |
| Client 3 (linked to trainer2) | `client3@fitcoach.dev` | `FitCoach123!` |
| Client (unlinked) | `client_unlinked@fitcoach.dev` | `FitCoach123!` |

## Common Pitfalls

1. **`supabase start` fails:** Ensure Docker is running.
2. **Android emulator can't reach Supabase:** Use `10.0.2.2` not `127.0.0.1`
3. **iOS HealthKit in simulator:** HK doesn't work in simulator — use `MockHealthDataClient`
4. **`supabase gen types` gives empty file:** Local Supabase must be running
5. **Realtime not working:** Check `supabase/config.toml` has `[realtime]` enabled
6. **RLS blocking reads:** Check you're using the correct user session
7. **Wrong fonts:** Project uses Syne + DM Sans — never import or reference Geist
8. **Wrong credentials:** All demo users use `@fitcoach.dev` / `FitCoach123!`
