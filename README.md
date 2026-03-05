# FitnessCoach — All-in-One Fitness Coaching Platform

A full-stack monorepo that replaces Google Forms check-ins, Google Sheets diaries, and Trainerize workout tracking with a unified platform built on **Supabase**, **Next.js**, **SwiftUI**, and **Jetpack Compose**.

## ✨ Features

| Module | Description |
|--------|-------------|
| **Health Hub** | iOS HealthKit + Android Health Connect daily sync (steps, calories, weight, macros, sleep) |
| **Workout Tracking** | Exercise library (~800 exercises), trainer template builder, client session logging with sets/reps/weight/RPE |
| **Rest Timer** | Auto-start after each set, pause/resume/skip/haptics, animated progress arc |
| **Daily Diary** | Mood, energy, sleep, and notes — synced from web and mobile |
| **Weekly Check-In** | Client submits → trainer reviews + leaves feedback |
| **Meal Plans** | Trainer-authored plans with daily macro breakdown |
| **Messaging** | Real-time text messaging (Supabase Realtime) with video support |
| **Analytics** | Trainer dashboard with health trends, volume tracking, prefill-last-session |

## 🏗 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Supabase (Postgres + Auth + Storage + RLS + Edge Functions) |
| Web | Next.js 14 App Router, TypeScript, Tailwind CSS |
| iOS | SwiftUI, async/await, MVVM, HealthKit, supabase-swift |
| Android | Kotlin, Jetpack Compose, Material 3, Health Connect, Hilt |
| CI | GitHub Actions (4 workflows) |

## 📁 Repository Structure

```
fitnessapp/
├── supabase/
│   ├── migrations/         # 001–004 SQL migrations
│   ├── functions/          # weeklySummary + signedMediaUrl (Deno)
│   ├── seed.sql            # Dev seed data (7 users, 30 exercises, templates)
│   └── config.toml
├── packages/
│   └── design-tokens/      # Shared tokens → Tailwind + iOS + Android
├── apps/
│   ├── web/                # Next.js app
│   ├── ios/FitnessCoach/   # SwiftUI app (Xcode project)
│   └── android/            # Kotlin/Compose app
├── assets/
│   └── muscle-maps/        # SVG front/back muscle maps + JSON mapping
├── tools/
│   └── import_exercises/   # CLI to seed exercise library from free-exercise-db
├── tests/
│   └── db/                 # pgTAP SQL tests (40 RLS + 15 CRUD assertions)
├── docs/                   # Architecture, data model, RLS, health, workout, design-system
└── .github/workflows/      # backend.yml, web.yml, ios.yml, android.yml
```

## 🚀 Quick Start

### Prerequisites

- [Node.js 20+](https://nodejs.org) + [pnpm](https://pnpm.io) (`npm i -g pnpm`)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`brew install supabase/tap/supabase`)
- [Docker](https://www.docker.com) (for local Supabase)
- [Xcode 15+](https://developer.apple.com/xcode/) (iOS)
- [Android Studio](https://developer.android.com/studio) (Android)

### 1. Clone and install

```bash
git clone https://github.com/Chrisfaherty/Fitnessapp.git
cd Fitnessapp
pnpm install
```

### 2. Start local Supabase

```bash
supabase start          # Starts Postgres + Auth + Storage + Edge Functions
supabase db reset       # Runs all migrations + seed.sql
```

This outputs your local credentials:
```
API URL:  http://127.0.0.1:54321
anon key: eyJ...
```

### 3. Configure environment variables

```bash
cp .env.example .env.local
# Fill in your local Supabase URL + anon key
```

**`apps/web/.env.local`:**
```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-local-anon-key>
```

### 4. Import the exercise library

```bash
# Dry run (no writes)
pnpm --filter import-exercises run dry-run

# Full import (~800 exercises)
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_KEY=<service-role-key> \
pnpm --filter import-exercises run import
```

### 5. Run the web app

```bash
pnpm --filter web dev
# Opens http://localhost:3000
```

**Demo accounts** (from seed.sql):
| Role | Email | Password |
|------|-------|----------|
| Trainer | `trainer1@fitnessapp.dev` | `Trainer1234!` |
| Client | `client1@fitnessapp.dev` | `Client1234!` |
| Admin | `admin@fitnessapp.dev` | `Admin1234!` |

### 6. Run iOS

```bash
open apps/ios/FitnessCoach.xcodeproj
# Or if using Swift Package Manager:
cd apps/ios && swift build
```

Update `apps/ios/FitnessCoach/Services/SupabaseService.swift`:
```swift
let client = SupabaseClient(
    supabaseURL: URL(string: "http://127.0.0.1:54321")!,
    supabaseKey: "YOUR_ANON_KEY"
)
```

### 7. Run Android

```bash
cd apps/android
./gradlew assembleDebug
```

Update `apps/android/app/build.gradle.kts`:
```kotlin
buildConfigField("String", "SUPABASE_URL", "\"http://10.0.2.2:54321\"")
buildConfigField("String", "SUPABASE_ANON_KEY", "\"YOUR_ANON_KEY\"")
```

> Note: Android emulator uses `10.0.2.2` to reach host machine's localhost.

## 🗄 Database

### Run tests

```bash
# Install pgTAP extension first
supabase db reset
pnpm db:test
```

### Reset and reseed

```bash
supabase db reset    # Drops and recreates from migrations + seed.sql
```

### Generate TypeScript types

```bash
supabase gen types typescript --local > apps/web/src/types/database.ts
```

## ☁️ Production Deployment

### Supabase (Backend)

1. Create a project at [supabase.com](https://supabase.com)
2. Push migrations: `supabase db push`
3. Deploy edge functions: `supabase functions deploy`
4. Note your `Project URL` and `anon` key

### Web (Vercel)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Chrisfaherty/Fitnessapp)

Or manually:
```bash
cd apps/web
npx vercel --prod
```

Set these environment variables in Vercel dashboard:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### iOS (App Store)

- Open in Xcode → update `SUPABASE_URL` + `SUPABASE_ANON_KEY` in `SupabaseService.swift`
- Set your bundle ID and signing team
- Archive → Distribute via TestFlight or App Store

### Android (Play Store)

- Update `buildConfigField` values in `app/build.gradle.kts`
- `./gradlew bundleRelease` → upload `.aab` to Play Console

## 🧪 Testing

```bash
# Web unit tests
pnpm --filter web test

# Web E2E (requires local Supabase running)
pnpm --filter web test:e2e

# iOS unit tests
cd apps/ios && swift test

# Android unit tests
cd apps/android && ./gradlew test

# Database RLS tests
pnpm db:test
```

## 🤖 CI/CD

Four GitHub Actions workflows run on every push:

| Workflow | Triggers | Steps |
|----------|----------|-------|
| `backend.yml` | push to `main`/`develop` | Supabase start → db reset → pgTAP tests |
| `web.yml` | push + PR | pnpm install → tsc → lint → vitest → Playwright E2E |
| `ios.yml` | push + PR | swift test on `macos-14` |
| `android.yml` | push + PR | gradlew test (+ emulator tests on `main`) |

## 📐 Design System

**Accent:** `#A3FF12` (electric lime)
**Light BG:** `#F7F7FA` | **Dark BG:** `#0B0C10`

See [`docs/design-system.md`](./docs/design-system.md) for full token reference and component classes.

## 📚 Documentation

| Doc | Description |
|-----|-------------|
| [`docs/architecture.md`](./docs/architecture.md) | System diagram, data flows, platform details |
| [`docs/data-model.md`](./docs/data-model.md) | All tables, columns, SQL functions |
| [`docs/rls-policies.md`](./docs/rls-policies.md) | RLS policy matrix, helper functions |
| [`docs/health-ingestion.md`](./docs/health-ingestion.md) | HealthKit + Health Connect pipeline |
| [`docs/workout-module.md`](./docs/workout-module.md) | Template builder, session lifecycle, muscle maps |
| [`docs/design-system.md`](./docs/design-system.md) | Tokens, components, dark mode |

## 🗺 Roadmap

- [ ] Stripe billing (trainer subscription tiers)
- [ ] Push notifications (workout reminders, check-in due)
- [ ] AI-generated weekly feedback (Claude API integration)
- [ ] Progress photos (Storage + comparison view)
- [ ] Apple Watch companion app

## License

MIT
