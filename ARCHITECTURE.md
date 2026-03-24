# FitnessCoach — Architecture & Project Document

**Version:** 1.0 · **Date:** March 2026 · **Prepared for:** Architect Review

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Database Schema](#3-database-schema)
4. [Row Level Security (RLS)](#4-row-level-security-rls)
5. [Storage Buckets](#5-storage-buckets)
6. [Edge Functions (Serverless)](#6-edge-functions-serverless)
7. [Web App (Next.js)](#7-web-app-nextjs)
8. [iOS App (SwiftUI)](#8-ios-app-swiftui)
9. [Android App (Jetpack Compose)](#9-android-app-jetpack-compose)
10. [Data Flow Diagrams](#10-data-flow-diagrams)
11. [Design System](#11-design-system)
12. [Authentication & Security](#12-authentication--security)
13. [Infrastructure & Deployment](#13-infrastructure--deployment)
14. [What Is Built](#14-what-is-built)
15. [What Remains To Complete](#15-what-remains-to-complete)

---

## 1. Project Overview

**FitnessCoach** is a full-stack fitness coaching platform connecting personal trainers with their clients across web, iOS, and Android. The platform enables:

- **Trainers** to create workout templates, assign workouts, review weekly check-ins, view client health data, and communicate via real-time messaging with video feedback.
- **Clients** to log daily diaries, submit weekly check-ins, track assigned workouts, view meal plans, and sync health data automatically from their device.

### Core Principles

| Principle | Implementation |
|-----------|---------------|
| **Mobile-first health data** | iOS uses HealthKit; Android uses Health Connect. Google Fit is never used. |
| **Idempotent health sync** | All health data uses upsert with unique (user_id, date) constraint — safe to re-sync. |
| **Least privilege access** | All mobile writes use the anon key + RLS. Service role only for edge functions. |
| **Multi-tenant security** | RLS policies enforce trainer↔client relationships at the database layer. |

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                               │
│                                                                     │
│  ┌───────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  Next.js Web App  │  │  iOS (SwiftUI)  │  │ Android (Compose)│  │
│  │  (Vercel)         │  │  HealthKit      │  │ Health Connect   │  │
│  └─────────┬─────────┘  └───────┬─────────┘  └────────┬─────────┘  │
└────────────┼───────────────────┼──────────────────────┼────────────┘
             │                   │                      │
             │         JWT (anon key + RLS)             │
             ▼                   ▼                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SUPABASE BACKEND                             │
│                                                                     │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────┐    │
│  │  Supabase Auth │  │   PostgreSQL   │  │  Supabase Storage  │    │
│  │  (JWT, email)  │  │  16 tables     │  │  3 buckets         │    │
│  └────────────────┘  │  + RLS         │  │  (media, avatars,  │    │
│                      │  + Functions   │  │   exercise images) │    │
│  ┌────────────────┐  └────────────────┘  └────────────────────┘    │
│  │ Realtime       │                                                 │
│  │ (WebSocket     │  ┌────────────────────────────────────────┐     │
│  │  subscriptions)│  │         Edge Functions (Deno)          │     │
│  └────────────────┘  │  - weeklySummary (cron)                │     │
│                      │  - signedMediaUrl (video auth proxy)   │     │
│                      └────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

### Technology Choices

| Layer | Technology | Reason |
|-------|-----------|--------|
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) | Managed, batteries-included, strong RLS support |
| Web | Next.js 14 (App Router, React 18) | Server components, RSC, Vercel-native |
| iOS | SwiftUI + HealthKit | Native, only permitted health API on iOS |
| Android | Jetpack Compose + Health Connect | Native, Google's recommended health API |
| Styling | Tailwind CSS + CSS custom properties | Token-based design system |
| Animation | Framer Motion | Production-grade animation on web |

---

## 3. Database Schema

**16 total tables** across 2 migrations.

---

### 3.1 Identity & Relationships

#### `profiles`
Extended user profile beyond Supabase Auth. Created on user signup via trigger.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | References `auth.users(id)` on delete cascade |
| `role` | enum | `client` \| `trainer` \| `admin` |
| `full_name` | text | Required |
| `avatar_url` | text | Path in `avatars` bucket |
| `timezone` | text | Default `'UTC'` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

#### `trainer_clients`
N:N link table between trainers and clients. Soft-deletable via `active` flag.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `trainer_id` | UUID (FK → profiles) | |
| `client_id` | UUID (FK → profiles) | |
| `active` | boolean | Default `true`. Set `false` to unlink without deleting. |
| `created_at` | timestamptz | |

**Unique constraint:** `(trainer_id, client_id)`

---

### 3.2 Health Data

#### `health_daily`
Daily aggregated health metrics. Synced from HealthKit (iOS) or Health Connect (Android). Always upserted — never inserted blindly.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `user_id` | UUID (FK → profiles) | |
| `date` | date | |
| `steps` | integer | |
| `active_energy_kcal` | numeric(8,2) | Active calories burned |
| `weight_kg` | numeric(5,2) | Morning body weight |
| `nutrition_kcal` | numeric(8,2) | Total dietary calories |
| `protein_g` | numeric(7,2) | |
| `carbs_g` | numeric(7,2) | |
| `fat_g` | numeric(7,2) | |
| `sources` | text[] | e.g. `['HealthKit']`, `['HealthConnect']` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique constraint:** `(user_id, date)` — enables idempotent upsert
**Index:** `(user_id, date DESC)`

#### `health_workouts`
Workout events from the OS health hub. Deduplicated by `external_id`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `user_id` | UUID (FK → profiles) | |
| `external_id` | text | HKWorkout UUID or Health Connect session ID |
| `workout_type` | text | e.g. `HKWorkoutTypeRunning` |
| `start_at`, `end_at` | timestamptz | |
| `kcal` | numeric(8,2) | Calories burned |
| `source_app` | text | e.g. Strava, MyFitnessPal |
| `source_bundle` | text | iOS bundle ID or Android package name |
| `raw_data` | jsonb | Original OS payload |
| `created_at` | timestamptz | |

**Unique constraint:** `(user_id, external_id)`
**Index:** `(user_id, start_at DESC)`

---

### 3.3 Client Engagement

#### `diary_entries`
Daily text notes from clients. Mood (1-5), sleep hours, free-form notes. One entry per client per day.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `user_id` | UUID (FK → profiles) | |
| `date` | date | |
| `notes` | text | |
| `mood` | smallint | Check: 1–5 |
| `sleep_hours` | numeric(4,1) | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique constraint:** `(user_id, date)`

#### `check_ins`
Weekly structured submissions from clients. Trainers can add notes, video URL, and mark reviewed.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `client_id` | UUID (FK → profiles) | |
| `trainer_id` | UUID (FK → profiles, nullable) | |
| `week_start_date` | date | Monday of the week |
| `status` | enum | `pending` \| `submitted` \| `reviewed` |
| `body_weight_kg` | numeric | Client's weight that week |
| `energy_level` | smallint | 1–5 |
| `stress_level` | smallint | 1–5 |
| `sleep_quality` | smallint | 1–5 |
| `client_notes` | text | Free text from client |
| `trainer_notes` | text | Trainer response text |
| `trainer_video_url` | text | URL to video feedback |
| `reviewed_at` | timestamptz | When trainer marked as reviewed |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Unique constraint:** `(client_id, week_start_date)`
**Indexes:** `(client_id, week_start_date DESC)`, `(trainer_id, status)`

#### `weekly_summaries`
Auto-generated weekly aggregates. Created only by the `weeklySummary` edge function (service role). Clients and trainers read-only.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `client_id` | UUID (FK → profiles) | |
| `week_start_date` | date | |
| `avg_steps` | numeric | Weekly average daily steps |
| `avg_calories` | numeric | Weekly average daily calories |
| `avg_protein_g` | numeric | Weekly average daily protein |
| `avg_weight_kg` | numeric | Weekly average body weight |
| `workouts_count` | integer | Health Connect/HealthKit workouts logged |
| `check_in_id` | UUID (FK → check_ins, nullable) | Associated check-in if exists |
| `generated_at` | timestamptz | |

**Unique constraint:** `(client_id, week_start_date)`

---

### 3.4 Nutrition

#### `meal_plans`
Trainer-created plans, assigned to a specific client, optionally starting on a date.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `trainer_id` | UUID (FK → profiles) | |
| `client_id` | UUID (FK → profiles) | |
| `title` | text | |
| `description` | text | |
| `week_start` | date (nullable) | Start date of this plan |
| `active` | boolean | Default `true` |
| `created_at`, `updated_at` | timestamptz | |

#### `meal_plan_days`
Individual meals within a plan. One row per meal per day-of-week.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `meal_plan_id` | UUID (FK → meal_plans) | |
| `day_of_week` | smallint | 0 (Sun) – 6 (Sat) |
| `meal_name` | text | e.g. Breakfast, Lunch, Dinner, Snack |
| `description` | text | |
| `calories` | numeric | |
| `protein_g` | numeric | |
| `carbs_g` | numeric | |
| `fat_g` | numeric | |
| `sort_order` | integer | Display order within day |

---

### 3.5 Messaging

#### `conversations`
One conversation thread per trainer↔client pair.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `trainer_id` | UUID (FK → profiles) | |
| `client_id` | UUID (FK → profiles) | |
| `created_at` | timestamptz | |

**Unique constraint:** `(trainer_id, client_id)`

#### `messages`
Individual messages within a conversation. Supports text and video.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `conversation_id` | UUID (FK → conversations) | |
| `sender_id` | UUID (FK → profiles) | |
| `sender_role` | enum | `trainer` \| `client` |
| `body` | text (nullable) | Text content |
| `video_storage_path` | text (nullable) | Path in `message-videos` bucket |
| `video_thumbnail` | text (nullable) | Thumbnail URL |
| `read_at` | timestamptz (nullable) | When recipient read the message |
| `created_at` | timestamptz | |

**Indexes:** `(conversation_id, created_at DESC)`, `sender_id`

---

### 3.6 Exercise Library & Workout System

#### `exercises`
Imported from `free-exercise-db` via the import tool. Read-only for clients and trainers; admin-managed.

| Column | Type | Notes |
|--------|------|-------|
| `id` | text (PK) | Stable string ID from source dataset |
| `name` | text | |
| `force` | text | push \| pull \| static |
| `level` | text | beginner \| intermediate \| expert |
| `mechanic` | text | compound \| isolation |
| `equipment` | text | barbell, dumbbell, machine, bodyweight, etc. |
| `category` | text | strength, stretching, plyometrics, etc. |
| `primary_muscles` | text[] | e.g. `['chest', 'triceps']` |
| `secondary_muscles` | text[] | |
| `instructions` | text[] | Step-by-step instructions |
| `image_paths` | text[] | Storage or CDN URLs |
| `source` | text | Default `'free-exercise-db'` |
| `created_at` | timestamptz | |

**Indexes:** `name` (trigram GIN for search), `primary_muscles` (GIN), `secondary_muscles` (GIN), `equipment`, `category`, `level`

#### `workout_templates`
Trainer-authored workout blueprints. Reusable across multiple client assignments.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `trainer_id` | UUID (FK → profiles) | |
| `title` | text | |
| `description` | text | |
| `created_at`, `updated_at` | timestamptz | |

#### `workout_template_exercises`
Ordered list of exercises within a template, with targets.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `template_id` | UUID (FK → workout_templates) | |
| `exercise_id` | text (FK → exercises) | |
| `sort_order` | integer | Display order in template |
| `target_sets` | integer | Default 3 |
| `rep_min`, `rep_max` | integer | Default 8, 12 |
| `rest_seconds` | integer | Default 90 |
| `notes` | text | Coaching notes for this exercise |

**Index:** `(template_id, sort_order)`

#### `workout_assignments`
Trainer assigns a template to a client for a specific date.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `client_id` | UUID (FK → profiles) | |
| `template_id` | UUID (FK → workout_templates) | |
| `trainer_id` | UUID (FK → profiles, nullable) | |
| `scheduled_date` | date | |
| `status` | enum | `assigned` \| `completed` \| `skipped` |
| `created_at`, `updated_at` | timestamptz | |

**Indexes:** `(client_id, scheduled_date DESC)`, `trainer_id`, `template_id`

#### `workout_sessions`
A client's actual completed workout log.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `client_id` | UUID (FK → profiles) | |
| `template_id` | UUID (FK → workout_templates, nullable) | Template followed |
| `assignment_id` | UUID (FK → workout_assignments, nullable) | Assignment fulfilled |
| `performed_at` | timestamptz | |
| `duration_seconds` | integer | |
| `notes` | text | |
| `health_external_id` | text | For syncing back to HealthKit/Health Connect |
| `created_at` | timestamptz | |

**Index:** `(client_id, performed_at DESC)`

#### `workout_session_sets`
Individual sets logged within a session.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID (PK) | |
| `session_id` | UUID (FK → workout_sessions) | |
| `exercise_id` | text (FK → exercises) | |
| `set_number` | integer | |
| `reps` | integer | |
| `weight_kg` | numeric(6,2) | |
| `rpe` | numeric(3,1) | Rate of perceived exertion, 1–10 |
| `rest_seconds` | integer | |
| `completed_at` | timestamptz | |

**Indexes:** `session_id`, `exercise_id`

---

### 3.7 Stored Functions

| Function | Purpose |
|----------|---------|
| `get_last_session_sets(p_client_id, p_exercise_id)` | Returns sets from the most recent session for an exercise. Used by mobile to prefill "last session" on the set-logging screen. |
| `get_exercise_volume_trend(p_client_id, p_exercise_id, p_days=90)` | Returns weekly total volume (reps × weight), max weight, and set count for charting progress over time. |
| `is_admin()` | RLS helper — checks `profiles.role = 'admin'` for the current user. |
| `is_linked_trainer(p_client_id)` | RLS helper — checks `trainer_clients` for an active link between `auth.uid()` and `p_client_id`. |

---

## 4. Row Level Security (RLS)

All tables have RLS enabled. The access pattern is:

```
Client → reads/writes only own data
Trainer → reads/writes own data + reads linked clients' data
Admin → reads all, writes all
Edge Functions → service role bypasses RLS entirely
```

### Policy Summary

| Table | Client Can | Trainer Can | Admin Can |
|-------|-----------|-------------|-----------|
| `profiles` | Read/update own | Read own + linked clients | Read/write all |
| `trainer_clients` | Read own links | Read own + insert own | Read/write all |
| `health_daily` | Read/insert/update own | Read linked clients | Read all |
| `health_workouts` | Read/insert own | Read linked clients | Read all |
| `diary_entries` | Read/insert/update own | Read linked clients | Read all |
| `check_ins` | Read own, insert own, update when pending | Read linked, update when submitted | Read all |
| `meal_plans` | Read own | Read/insert/update own | Read all |
| `meal_plan_days` | Read via plan | Manage via plan | Read all |
| `conversations` | Read own | Read/insert own | Read all |
| `messages` | Insert/read own conversation | Insert/read own conversation | Read all |
| `weekly_summaries` | Read own | Read linked clients | Read all |
| `exercises` | Read all | Read all | Insert/update |
| `workout_templates` | Read if assigned | Read/insert/update own | Read/write all |
| `workout_assignments` | Read own, update status | Read own + insert | Read/write all |
| `workout_sessions` | Read/insert/update own | Read linked clients | Read all |
| `workout_session_sets` | Read/insert/delete own | Read linked clients | Read all |

> **Note:** `weekly_summaries` has no client/trainer write policy — only the `weeklySummary` edge function (running as service role) can write to this table.

---

## 5. Storage Buckets

| Bucket | Visibility | Size Limit | Contents | Path Format |
|--------|-----------|-----------|----------|-------------|
| `exercise-media` | Public | 50 MB | Exercise images (JPEG, PNG, WebP, GIF) | `{exercise_id}/0.jpg` etc. |
| `message-videos` | Private | 500 MB | Video feedback messages (MP4, MOV, WebM) | `{conversation_id}/{message_id}.mp4` |
| `avatars` | Public | 5 MB | User profile pictures (JPEG, PNG, WebP) | `{user_id}/avatar.jpg` |

### Access Rules

- **exercise-media:** Public read. Admin-only insert (via import tool with service key).
- **message-videos:** No public access. Read and write require the requester to be a participant in the conversation (checked via RLS + signedMediaUrl function).
- **avatars:** Public read. Owner can insert/update their own avatar.

---

## 6. Edge Functions (Serverless)

Both functions run on Deno via Supabase Edge Functions.

### `weeklySummary`
**Trigger:** Cron (runs weekly on Monday) or manual POST
**Auth:** Service role key — bypasses RLS
**Endpoint:** `POST /functions/v1/weeklySummary`

**What it does:**
1. Determines the target week start (last Monday by default)
2. Fetches all users with `role = 'client'`
3. For each client:
   - Aggregates `health_daily` → avg steps, calories, protein, weight for the week
   - Counts `health_workouts` in the week
   - Looks up `check_ins` row for that week (if submitted)
   - Upserts `weekly_summaries` with computed values
4. Returns `{ success, week_start, succeeded, failed }`

---

### `signedMediaUrl`
**Trigger:** On-demand POST from web/mobile
**Auth:** User JWT (required)
**Endpoint:** `POST /functions/v1/signedMediaUrl`

**What it does:**
1. Receives `{ storage_path: "conversationId/messageId.mp4" }`
2. Extracts `conversation_id` from path prefix
3. Fetches the `conversations` row
4. Verifies the caller is the `trainer_id` or `client_id` of that conversation (or an admin)
5. If unauthorised → returns `403 Forbidden`
6. Generates a 1-hour Supabase signed URL for the private object
7. Returns `{ signed_url, expires_at }`

**Security note:** This prevents any authenticated user from accessing videos from conversations they weren't part of. The private bucket alone doesn't enforce this — the function does.

---

## 7. Web App (Next.js)

### 7.1 Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| Next.js | 14.2.4 | Framework (App Router, Server Components) |
| React | 18.3.1 | UI |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 3.4.4 | Utility styling |
| @supabase/supabase-js | 2.43.4 | Supabase client (pinned — v2.98+ has breaking generic changes) |
| @supabase/ssr | 0.4.0 | Server-side Supabase auth cookie handling |
| Framer Motion | — | Page/component animations |
| @tanstack/react-query | 5.40.0 | Client-side server state management |
| Recharts | — | Data charts (sparklines, bar charts) |
| @hello-pangea/dnd | — | Drag-and-drop (template builder) |
| Lucide React | — | Icons |
| Zod | — | Schema validation |
| Sonner | — | Toast notifications |
| Vitest | — | Unit testing |
| Playwright | — | End-to-end testing |

---

### 7.2 Route Map

#### Auth Routes

| Route | Type | Purpose |
|-------|------|---------|
| `/login` | Server RSC | Email/password login. Includes branding and feature list. Redirects to role-appropriate dashboard on success. |

#### Trainer Routes (requires `role = 'trainer'`)

| Route | Type | Purpose |
|-------|------|---------|
| `/trainer` | Server RSC | Dashboard overview: total clients, pending check-ins, quick-action cards for templates and messaging |
| `/trainer/clients` | Server RSC | Grid of all linked clients with avatar, name, link to detail |
| `/trainer/clients/[clientId]` | Server RSC | Full client profile: health summary, recent check-ins, workouts, diary, messaging link. Tabbed layout. |
| `/trainer/templates` | Server RSC | List of all workout templates with exercise count, edit/delete actions |
| `/trainer/templates/new` | Client | Split-pane template builder: left panel = exercise picker with search/filter; right panel = draggable exercise list with set/rep/rest targets |
| `/trainer/exercises` | Client | Full exercise library with search (by name), filter (by muscle group, equipment, category, level), exercise cards with image |
| `/trainer/messaging` | Client | Real-time messaging: conversation list (left), message thread (right) with text input and video upload |

#### Client Routes (requires `role = 'client'`)

| Route | Type | Purpose |
|-------|------|---------|
| `/client` | Server RSC | Client home: sparkline cards (steps, weight, calories), activity heatmap (14 weeks of workouts), quick links to diary, check-ins, workouts |
| `/client/workouts` | Server RSC | Upcoming and past assigned workouts, grouped by status (assigned / completed / skipped) |
| `/client/diary` | Client | Daily diary: mood slider (1–5 with emoji), sleep hours input, free-text notes. Upserts once per day. |
| `/client/check-ins` | Client | 3-step wizard check-in: Step 1 body metrics (weight, energy, stress, sleep), Step 2 notes, Step 3 confirmation. Shows history of past check-ins. |
| `/client/meals` | Server RSC | Active meal plan view: daily tabs (Mon–Sun), meal cards with macro breakdown per meal |

---

### 7.3 Component Architecture

```
src/components/
├── ui/
│   ├── dashboard-layout.tsx    Sidebar nav, mobile drawer, auth state, logout
│   ├── sparkline-card.tsx      Metric card with Recharts mini chart + trend %
│   └── activity-heatmap.tsx    14-week workout calendar heatmap
├── auth/
│   └── login-form.tsx          Email/password form, Supabase signInWithPassword
├── trainer/
│   ├── trainer-dashboard.tsx   Overview: client count, pending check-ins list, stat cards
│   ├── template-builder.tsx    Drag-drop builder, exercise targets, save template
│   ├── exercise-library.tsx    Search + filter exercise grid
│   ├── exercise-picker-modal.tsx  Modal for selecting exercises to add to template
│   └── trainer-messaging-client.tsx  Real-time chat with Supabase Realtime subscription
└── client/
    ├── client-diary-client.tsx      Daily diary form (mood, sleep, notes)
    └── client-check-in-client.tsx   3-step check-in wizard with animation
```

---

### 7.4 Supabase Client Strategy

| File | Type | Used In |
|------|------|---------|
| `lib/supabase/server.ts` | `createServerSupabaseClient()` | Server Components (page.tsx, layout.tsx) — reads cookies from request |
| `lib/supabase/client.ts` | `createBrowserSupabaseClient()` | Client Components (`"use client"`) — reads/writes cookies in browser |
| `lib/supabase/middleware.ts` | Session refresh | Middleware — auto-refreshes JWT on every request |

**Rule:** Server components use server client, client components use browser client. Never mix.

---

### 7.5 Rendering Strategy

```
layout.tsx (server) → auth check → redirect if not logged in
  └── page.tsx (server) → DB fetch → pass data as props
        └── XyzClient.tsx (client) → interactivity, subscriptions, form state
```

Server components do all the data fetching. Client components handle interactivity and real-time updates.

---

## 8. iOS App (SwiftUI)

### 8.1 Tech Stack

| Technology | Purpose |
|-----------|---------|
| Swift 5.9+ | Language |
| SwiftUI 4.0+ | Declarative UI |
| Combine | Reactive state (publishers, @Published) |
| HealthKit | Health data access (requires permissions dialog) |
| Supabase Swift SDK | Auth, database, realtime, storage |
| @MainActor | All ViewModels thread-safe on main actor |

---

### 8.2 Architecture

```
Views (SwiftUI)
    ↓  observes
ViewModels (@MainActor, @Observable)
    ↓  calls
Services (SupabaseService, SyncService)
    ↓  calls
Data Clients (HealthDataClient protocol)
    ↓
HealthKitClient (real) / MockHealthDataClient (tests)
```

---

### 8.3 Services

#### `HealthDataClient` (Protocol — testable interface)
```swift
protocol HealthDataClient {
    func requestAuthorization() async throws
    var isAuthorized: Bool { get async }
    func fetchDailyMetrics(from: Date, to: Date) async throws -> [DailyMetrics]
    func fetchWorkouts(from: Date, to: Date) async throws -> [WorkoutEvent]
}
```

#### `HealthKitClient` — Real HealthKit implementation
- Reads: steps (HKQuantityTypeIdentifierStepCount), active energy, body mass, dietary energy, protein, carbs, fat
- Aggregates by day using `HKStatisticsCollectionQuery`
- Reads workouts using `HKWorkoutType`
- Does not work in iOS Simulator — `MockHealthDataClient` used instead

#### `MockHealthDataClient` — Unit test stub
- Returns deterministic synthetic data

#### `SyncService`
- Called on app foreground and periodic background task
- Flow: `requestAuthorization()` → `fetchDailyMetrics()` → `supabase.from("health_daily").upsert()`
- Idempotent: upsert on `(user_id, date)` unique constraint

#### `SupabaseService` — Singleton Supabase client wrapper

---

### 8.4 ViewModels

| ViewModel | Responsibility |
|-----------|---------------|
| `AuthViewModel` | Auth state machine: loading → unauthenticated → authenticated. `signIn()`, `signOut()`, `checkSession()` on app launch. |
| `DashboardViewModel` | Fetches 7-day health summary, calculates sparkline data and trend percentages. |
| `WorkoutViewModel` | Fetches assignments, starts sessions, logs sets (calling `get_last_session_sets` RPC for prefill), finishes sessions. |
| `RestTimerViewModel` | Countdown timer with haptic feedback (UIImpactFeedbackGenerator) and local notification on completion. |

---

### 8.5 Views

| View | Feature | Purpose |
|------|---------|---------|
| `LoginView` | Auth | Email/password form |
| `DashboardView` | Home | Metric cards, sparklines, heatmap, shortcuts |
| `WorkoutSessionView` | Workout | In-session exercise list → set logging |
| `ExerciseDetailView` | Workout | Exercise instructions + last session prefill |
| `RestTimerView` | Workout | Animated countdown timer |
| `MuscleMapView` | Workout | Visual muscle group diagram |
| `CheckInView` | Check-ins | Weekly submission form |
| `DiaryView` | Diary | Daily mood/sleep/notes |
| `MealPlanView` | Meals | Week plan + macro breakdown |
| `MessagingView` | Messaging | Trainer chat, video record/playback |

---

## 9. Android App (Jetpack Compose)

### 9.1 Tech Stack

| Technology | Purpose |
|-----------|---------|
| Kotlin 1.9+ | Language |
| Jetpack Compose | Declarative UI |
| Hilt | Dependency injection |
| StateFlow | ViewModel state |
| Health Connect | Health data (androidx.health:health-connect-client) |
| Supabase Kotlin SDK | Auth, database, realtime, storage |
| WorkManager | Background sync (planned) |

> **Note:** Health Connect requires Android 8.0+ and the Health Connect app installed on the device.

---

### 9.2 Architecture

```
Composable Screens
    ↓  observes StateFlow
ViewModels (Hilt-injected)
    ↓  calls
SyncRepository / SupabaseClient
    ↓  calls
HealthDataClient (interface)
    ↓
HealthConnectClient (real) / FakeHealthDataClient (tests)
```

---

### 9.3 Data Layer

#### `HealthDataClient` (Interface — testable)
```kotlin
interface HealthDataClient {
    fun isAvailable(): Boolean
    suspend fun hasPermissions(): Boolean
    fun requiredPermissions(): Set<String>
    suspend fun fetchDailyMetrics(startDate: String, endDate: String): List<DailyMetrics>
    suspend fun fetchDailySteps(): Map<String, Long>
    suspend fun fetchDailyWeight(): Map<String, Double>
    suspend fun fetchExerciseSessions(): List<ExerciseSession>
    suspend fun fetchDailyNutrition(): Map<String, NutritionTotals>
}
```

#### `HealthConnectClient` — Real implementation
- Reads: `StepsRecord`, `WeightRecord`, `ExerciseSessionRecord`, `NutritionRecord`
- Aggregates daily; uses `readRecords` with time range filters
- Gracefully handles missing permission or missing data

#### `FakeHealthDataClient` — Unit test stub

#### `SyncRepository`
- Checks permissions → fetches Health Connect data → upserts to `health_daily` via Supabase
- Retry on network error; idempotent

#### `SupabaseClient` — Singleton Supabase client
> Uses `10.0.2.2` not `localhost` when running on Android emulator

---

### 9.4 ViewModels

| ViewModel | Responsibility |
|-----------|---------------|
| `AuthViewModel` | Auth state machine, sign-in/out, session restore |
| `DashboardViewModel` | Fetch health summary, trends → expose `StateFlow<DashboardState>` |
| `WorkoutViewModel` | Fetch assignments, start session, log sets, finish session |
| `RestTimerViewModel` | Countdown state with vibration and notification |

---

### 9.5 Screens

| Screen | Feature | Purpose |
|--------|---------|---------|
| `LoginScreen` | Auth | Email/password form |
| `DashboardScreen` | Home | Health metrics, heatmap, shortcuts |
| `WorkoutSessionScreen` | Workout | Log sets in active session |
| `ExerciseDetailScreen` | Workout | Exercise info + last set prefill |
| `RestTimerBar` | Workout | Timer countdown bar |
| `MuscleMapView` | Workout | Muscle visualisation |
| `CheckInScreen` | Check-ins | Weekly submission form |
| `DiaryScreen` | Diary | Daily notes |
| `MealPlanScreen` | Meals | Meal plan view |
| `MessagingScreen` | Messaging | Chat + video |

Navigation is managed by `AppNavigation.kt` using Compose NavGraph:
`LoginScreen → DashboardScreen → (WorkoutSession / CheckIn / Diary / Meals / Messaging)`

### 9.6 Testing

| Test Class | What It Tests |
|-----------|--------------|
| `RestTimerViewModelTest` | Timer countdown, pause, reset logic |
| `HealthAggregationTest` | Daily aggregation of Health Connect data |
| `WorkoutViewModelTest` | Assignment fetch, session lifecycle |
| `WorkoutFlowTest` (integration) | Full user flow from assignment → session → sets → complete |

---

## 10. Data Flow Diagrams

### Health Sync Flow

```
iOS/Android Device
    │
    ▼ HealthKit / Health Connect API
    │  (steps, weight, energy, nutrition, workouts)
    │
    ▼ HealthDataClient.fetchDailyMetrics()
    │
    ▼ SyncService / SyncRepository
    │  builds upsert payload[]
    │
    ▼ Supabase: health_daily.upsert(onConflict: 'user_id,date')
               health_workouts.upsert(onConflict: 'user_id,external_id')
```

### Workout Assignment & Logging Flow

```
Trainer creates template (workout_templates + workout_template_exercises)
    │
    ▼ Trainer assigns to client (workout_assignments, status='assigned')
    │
    ▼ Client opens assignment on mobile
    │  ← get_last_session_sets() RPC fetches previous data
    │
    ▼ Client starts session (insert workout_sessions)
    │
    ▼ Client logs each set (insert workout_session_sets)
    │
    ▼ Client finishes (update workout_sessions.duration_seconds)
       update workout_assignments.status = 'completed'
```

### Check-In Flow

```
Client submits check-in (client/check-ins page)
    │  insert check_ins (status='submitted')
    │
    ▼ Trainer sees badge on dashboard (pending count)
    │  reads check_ins WHERE status='submitted' AND is_linked_trainer()
    │
    ▼ Trainer reviews: adds trainer_notes, optional trainer_video_url
       update check_ins SET status='reviewed', reviewed_at=now()
```

### Messaging & Video Flow

```
Trainer or client sends text:
    insert messages (body, sender_role, conversation_id)

Trainer sends video feedback:
    upload MP4 → Supabase Storage: message-videos/{convo_id}/{msg_id}.mp4
    insert messages (video_storage_path = path, body = null)

Client plays video:
    POST /functions/v1/signedMediaUrl { storage_path }
    ← 1-hour signed URL (permission checked in function)
    play video from signed URL

Real-time (both parties):
    supabase.channel('messages:{convoId}')
        .on('postgres_changes', INSERT on messages)
        .subscribe() → append to UI
```

### Weekly Summary Generation

```
Cron trigger (every Monday)
    │
    ▼ weeklySummary edge function (service role)
    │
    ▼ fetch all profiles WHERE role='client'
    │
    ▼ for each client:
    │   SELECT avg(steps), avg(active_energy_kcal), ... FROM health_daily
    │     WHERE user_id = client.id AND date BETWEEN week_start AND week_end
    │   SELECT count(*) FROM health_workouts WHERE same week
    │   SELECT id FROM check_ins WHERE client_id AND week_start_date
    │
    ▼ upsert weekly_summaries (unique: client_id, week_start_date)
```

---

## 11. Design System

### 11.1 Colour Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--color-accent` | `#A3FF12` | Primary actions, hover states, badges |
| `--color-background` (dark) | `#080809` | Page background (void palette) |
| `--color-background` (light) | `#F5F5F7` | Page background (light mode) |
| `--color-surface` (dark) | `#111113` | Card backgrounds |
| `--color-surface` (light) | `#FFFFFF` | Card backgrounds |
| `--color-surface-elevated` (dark) | `#1C1C1F` | Input backgrounds, overlays |
| `--color-border` | `rgba(255,255,255,0.10)` dark | Borders, dividers |

### 11.2 Typography (Geist Font)

| Class | Size | Weight | Use |
|-------|------|--------|-----|
| `.text-display` | 4xl | 800 | Hero headings |
| `.text-heading` | 2xl | 700 | Page titles |
| `.text-subheading` | lg | 600 | Section titles |
| `.text-body` | base | 400 | Body copy |
| `.text-caption` | sm | 400 | Labels, secondary |
| `.text-metric` | 2rem (mono) | 700 | Numbers, metrics |
| `.text-label` | xs | 500 | Field labels, overlines |

### 11.3 Component Classes

| Class | Description |
|-------|-------------|
| `.card` | Bordered surface card, rounded-xl |
| `.card-compact` | Smaller padding variant |
| `.stat-card` | Metric display card |
| `.btn-primary` | Accent background, scale on hover/active |
| `.btn-secondary` | Surface background with border |
| `.btn-ghost` | Transparent, hover surface |
| `.btn-danger` | Red tint, destructive actions |
| `.btn-icon` | Square icon-only button |
| `.input` | Elevated surface, accent focus ring |
| `.badge-accent` | Lime green badge |
| `.badge-warning` | Amber badge |
| `.badge-success` | Green badge |
| `.badge-neutral` | Grey badge |
| `.section-header` | Row with title + action link |
| `.empty-state` | Centered card with icon + message |
| `.data-table` | Striped table |

### 11.4 Platform Design Tokens

| Platform | Token | Value |
|----------|-------|-------|
| iOS Swift | `FitnessColors.accent` | `#A3FF12` |
| Android Compose | `FitnessColors.Accent` | `#A3FF12` |
| Web CSS | `text-accent` / `bg-accent` | via Tailwind config |

---

## 12. Authentication & Security

### Auth Flow

```
1. User submits email + password
2. Supabase Auth issues JWT (access + refresh tokens)
3. Web: tokens stored in HTTP-only cookies via @supabase/ssr
   Mobile: tokens stored in secure device storage
4. Middleware (web) refreshes JWT on every request
5. Server Components create client with cookie context
6. RLS policies evaluate auth.uid() from JWT for every DB operation
```

### Security Layers

| Layer | Mechanism |
|-------|-----------|
| Authentication | Supabase Auth (JWT) — all API calls require valid token |
| Authorisation | PostgreSQL RLS — enforced at DB level, not application level |
| Trainer↔Client isolation | `is_linked_trainer()` function checked in every cross-user policy |
| Video access | `signedMediaUrl` edge function checks conversation membership before issuing URL |
| Service role | Only used in edge functions — never exposed to clients |
| Environment | `.env.local` git-ignored; service key never in frontend code |

### Key Security Rules

- **Anon key** is safe to ship in mobile apps and frontend — RLS limits what it can do
- **Service role key** bypasses RLS entirely — only used server-side in edge functions
- **Never** use `supabase.auth.admin` from client-side code
- All writes from mobile clients are validated by RLS before hitting the database

---

## 13. Infrastructure & Deployment

### Local Development Stack

```
Docker
  └── Supabase CLI (supabase start)
        ├── PostgreSQL (localhost:54322)
        ├── Auth (localhost:54321/auth)
        ├── Storage (localhost:54321/storage)
        ├── Realtime (localhost:54321/realtime)
        └── Edge Functions (Deno, localhost:54321/functions)

Next.js Dev Server (localhost:3000)
```

### Key Commands

| Command | Purpose |
|---------|---------|
| `supabase start` | Start local Supabase stack (requires Docker) |
| `supabase db reset` | Wipe + reapply migrations + seed data |
| `supabase db push` | Push local migrations to remote Supabase project |
| `supabase functions deploy` | Deploy edge functions to production |
| `supabase gen types typescript --local > apps/web/src/types/database.ts` | Regenerate TypeScript DB types |
| `pnpm --filter web dev` | Start Next.js dev server |
| `pnpm --filter web build` | Production build |
| `pnpm --filter web test` | Run Vitest unit tests |
| `pnpm --filter web test:e2e` | Run Playwright E2E tests |
| `pnpm db:test` | Run pgTAP database tests |

### CI/CD Pipeline (GitHub Actions)

```
Push to main
    ├── tsc --noEmit       (TypeScript type check)
    ├── next lint          (ESLint)
    └── vitest run         (unit tests)

On CI pass → Vercel auto-deploys web app to production
```

### Monorepo Structure

```
fitnessapp/
├── apps/
│   ├── web/               Next.js web app
│   ├── ios/               SwiftUI iOS app (Xcode project)
│   └── android/           Jetpack Compose Android app (Gradle project)
├── supabase/
│   ├── migrations/        SQL migration files
│   ├── functions/         Edge functions (Deno/TypeScript)
│   ├── seed.sql           Demo data
│   └── config.toml        Supabase local config
├── tools/
│   └── import-exercises/  Script to bulk-import exercise library
├── tests/
│   └── db/                pgTAP database tests
├── pnpm-workspace.yaml
└── CLAUDE.md              Agent instructions (this project)
```

---

## 14. What Is Built

### ✅ Complete & Working

#### Backend / Database
- All 16 database tables with correct schema and constraints
- All RLS policies (client, trainer, admin, cross-user)
- All 3 storage buckets with access policies
- 2 edge functions (weeklySummary, signedMediaUrl)
- 2 stored functions (last session sets, volume trend)
- Seed data with 7 demo users across all roles
- pgTAP test scaffold

#### Web App
- Login page with brand design
- Trainer dashboard (client count, pending check-ins, quick-action cards)
- Trainer client list
- Trainer client detail page (tabbed: health, check-ins, workouts, diary)
- Template list page
- Split-pane template builder with drag-and-drop exercise ordering
- Full exercise library (search, filter by muscle/equipment/category/level)
- Real-time messaging (text, conversation list, Supabase Realtime subscription)
- Client dashboard (sparkline cards, activity heatmap)
- Client diary (mood, sleep, notes — daily upsert)
- Client check-in wizard (3-step animated form)
- Client workout assignments list
- Client meal plan view
- Dashboard layout with sidebar nav (responsive, mobile drawer)
- Dark/light mode support (void palette dark mode)
- Consistent design system (design tokens, component classes, Geist font)
- CI pipeline (TypeScript, ESLint, Vitest)

#### iOS App
- HealthKit integration (protocol + real implementation + mock)
- Auth ViewModel (sign in, sign out, session restore)
- Dashboard ViewModel + View (health metrics)
- Workout ViewModel (assignments, session lifecycle, set logging, last-session prefill)
- Rest timer (countdown, haptics, notifications)
- Check-in form
- Diary form
- Meal plan view
- Messaging (text + video)
- All Views structured and connected to ViewModels

#### Android App
- Health Connect integration (protocol + real implementation + fake)
- Auth ViewModel
- Dashboard ViewModel + Composable
- Workout ViewModel (assignments, sessions, sets, prefill)
- Rest timer ViewModel
- Check-in screen
- Diary screen
- Meal plan screen
- Messaging screen
- AppNavigation NavGraph
- Unit + integration tests

---

## 15. What Remains To Complete

### High Priority (Needed for Production Launch)

| # | Item | Platform | Notes |
|---|------|----------|-------|
| 1 | **Workout session logging on web** | Web | Clients can view assignments on `/client/workouts` but cannot start a session or log sets via browser. Need session start flow + set logging UI. |
| 2 | **Trainer check-in review UI** | Web | Trainer can see pending check-ins on the dashboard, but there is no dedicated page to open a check-in and add `trainer_notes` / `trainer_video_url` / mark as reviewed. |
| 3 | **Trainer meal plan creation** | Web | No UI exists for trainers to create or edit meal plans. The DB tables and RLS are ready. Need a meal plan builder (similar pattern to template builder). |
| 4 | **Video message upload (web)** | Web | Messaging UI sends text messages. The `message-videos` bucket and `signedMediaUrl` function are ready, but the web upload + playback flow is not wired up. |
| 5 | **Client assignment detail page (web)** | Web | `/client/workouts` lists assignments but does not open the template to show exercises before starting. Need a detail view. |
| 6 | **Trainer assign workout to client (web)** | Web | Trainers can build templates but cannot assign them to clients from the web. Need an assignment UI (select client, select template, pick date). |

### Medium Priority (Polish & Completeness)

| # | Item | Platform | Notes |
|---|------|----------|-------|
| 7 | **Admin panel** | Web | `is_admin()` helper exists, admin user in seed data, but no `/admin` route or UI exists. Needed for user management, data oversight, exercise library management. |
| 8 | **Push notifications** | iOS / Android | No push notification setup. Useful for: new message received, check-in reviewed by trainer, workout assigned. Supabase supports APNS/FCM via Edge Functions. |
| 9 | **Avatar upload** | Web / Mobile | The `avatars` bucket exists with correct policies, but no UI to upload or crop a profile photo. |
| 10 | **Exercise image display (web)** | Web | Exercise library shows `image_paths` data but images from the bucket may not render without correct CDN/URL handling. Verify and fix image loading. |
| 11 | **Trainer video URL in check-in review** | Web | When trainer marks a check-in as reviewed, the `trainer_video_url` field needs a proper video embed or link display on the client's check-in history. |
| 12 | **Realtime for check-in status** | Web / Mobile | When a trainer reviews a check-in, the client's UI does not update in real-time. A Supabase Realtime subscription on `check_ins` would enable this. |
| 13 | **Background health sync (Android)** | Android | `SyncRepository` is ready but WorkManager scheduling is noted as "planned". Health sync only runs when app is open. |
| 14 | **weeklySummary cron configuration** | Supabase | The function exists but the cron schedule needs to be configured in `supabase/config.toml` or set up on the remote project. Verify it runs automatically. |
| 15 | **Progress charts on client detail (web)** | Web | `get_exercise_volume_trend()` RPC exists but no chart component uses it yet. Trainer client detail could show volume/weight progress over time. |

### Lower Priority (Future Enhancements)

| # | Item | Notes |
|---|------|-------|
| 16 | **Client workout history** | Summary of all completed sessions (sets, weights, volume) — useful for progress tracking. Data exists, no display UI. |
| 17 | **Nutrition logging on mobile** | Health Connect / HealthKit sync brings in nutrition from third-party apps (MyFitnessPal etc.) but there is no in-app manual nutrition entry. |
| 18 | **Trainer analytics dashboard** | Aggregate view across all clients: who completed their workouts, average check-in scores, engagement metrics. |
| 19 | **Template duplication / editing** | No edit flow for existing templates — only create new. Add edit functionality. |
| 20 | **Onboarding flow** | New user (trainer or client) sees an empty state. A guided setup flow (link trainer, complete first check-in, first workout) would improve activation. |
| 21 | **E2E tests (Playwright)** | Playwright is configured but no E2E test files exist under `tests/e2e/`. The framework is ready. |
| 22 | **pgTAP database tests** | pgTAP framework referenced in commands but test files not confirmed. RLS policies should have coverage. |

---

## Appendix: Demo Credentials

| Role | Email | Password | Linked To |
|------|-------|----------|-----------|
| Admin | `admin@fitnessapp.dev` | `Admin1234!` | — |
| Trainer 1 | `trainer1@fitnessapp.dev` | `Trainer1234!` | client1, client2 |
| Trainer 2 | `trainer2@fitnessapp.dev` | `Trainer1234!` | client3 |
| Client 1 | `client1@fitnessapp.dev` | `Client1234!` | trainer1 |
| Client 2 | `client2@fitnessapp.dev` | `Client1234!` | trainer1 |
| Client 3 | `client3@fitnessapp.dev` | `Client1234!` | trainer2 |
| Client (unlinked) | `client_unlinked@fitnessapp.dev` | `Client1234!` | none |

---

*Document generated March 2026. For questions about this codebase, see `CLAUDE.md` for agent instructions.*
