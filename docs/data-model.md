# Data Model

All tables live in the `public` schema. Every mutable table has `created_at` and `updated_at` timestamps managed by the `handle_updated_at()` trigger.

## Core Tables

### `profiles`
Auto-created on `auth.users` insert via `handle_new_user()` trigger.

| Column     | Type        | Notes                           |
|------------|-------------|---------------------------------|
| id         | uuid (PK)   | Matches `auth.users.id`         |
| full_name  | text        | Display name                    |
| email      | text        | Unique                          |
| role       | user_role   | `client` \| `trainer` \| `admin`|
| avatar_url | text        | Public storage URL              |
| created_at | timestamptz |                                 |
| updated_at | timestamptz |                                 |

### `trainer_clients`
Many-to-many link between trainers and clients.

| Column     | Type        | Notes                 |
|------------|-------------|-----------------------|
| id         | uuid (PK)   |                       |
| trainer_id | uuid (FK)   | → profiles.id         |
| client_id  | uuid (FK)   | → profiles.id         |
| active     | bool        | Soft-deactivate link  |
| created_at | timestamptz |                       |

UNIQUE(trainer_id, client_id)

## Health Tables

### `health_daily`
One row per client per calendar date. Upserted by mobile apps.

| Column          | Type        | Notes                        |
|-----------------|-------------|------------------------------|
| id              | uuid (PK)   |                              |
| user_id         | uuid (FK)   | → profiles.id                |
| date            | date        |                              |
| steps           | bigint      |                              |
| calories_out    | numeric     | Active calories (kcal)       |
| weight_kg       | numeric     |                              |
| protein_g       | numeric     |                              |
| carbs_g         | numeric     |                              |
| fat_g           | numeric     |                              |
| water_ml        | numeric     |                              |
| sleep_seconds   | bigint      |                              |
| created_at      | timestamptz |                              |
| updated_at      | timestamptz |                              |

UNIQUE(user_id, date)

### `health_workouts`
Raw workout sessions synced from HealthKit / Health Connect.

| Column       | Type        | Notes                       |
|--------------|-------------|-----------------------------|
| id           | uuid (PK)   |                             |
| user_id      | uuid (FK)   | → profiles.id               |
| external_id  | text        | Platform workout UUID       |
| started_at   | timestamptz |                             |
| ended_at     | timestamptz |                             |
| type         | text        | e.g. "Running", "Strength"  |
| calories_out | numeric     |                             |
| source       | text        | App bundle ID / package     |
| created_at   | timestamptz |                             |

UNIQUE(user_id, external_id)

## Coaching Tables

### `diary_entries`
Daily wellbeing log by client.

| Column       | Type        |
|--------------|-------------|
| id           | uuid (PK)   |
| user_id      | uuid (FK)   |
| date         | date        |
| mood         | int (1–10)  |
| energy_level | int (1–10)  |
| sleep_hours  | numeric     |
| notes        | text        |
| created_at   | timestamptz |
| updated_at   | timestamptz |

UNIQUE(user_id, date)

### `check_ins`
Weekly check-in submissions.

| Column           | Type        | Notes                        |
|------------------|-------------|------------------------------|
| id               | uuid (PK)   |                              |
| client_id        | uuid (FK)   | → profiles.id                |
| week_start       | date        | Monday of week               |
| status           | text        | `submitted` \| `reviewed`    |
| bodyweight_kg    | numeric     |                              |
| notes            | text        | Client's free-text           |
| trainer_feedback | text        | Trainer response             |
| created_at       | timestamptz |                              |
| updated_at       | timestamptz |                              |

### `meal_plans` + `meal_plan_days`
Trainer-authored meal plan with day breakdown.

`meal_plans`: id, client_id, trainer_id, title, notes, start_date, end_date
`meal_plan_days`: id, meal_plan_id, day_label, meals (text), total_calories, protein_g, carbs_g, fat_g

### `conversations` + `messages`
Trainer ↔ client messaging.

`conversations`: id, trainer_id, client_id
`messages`: id, conversation_id, sender_id, body (text), video_storage_path, sent_at

### `weekly_summaries`
Aggregated by the `weeklySummary` edge function each week.

| Column          | Type  |
|-----------------|-------|
| user_id         | uuid  |
| week_start      | date  |
| avg_steps       | numeric|
| avg_calories    | numeric|
| avg_protein_g   | numeric|
| avg_weight_kg   | numeric|
| workout_count   | int   |

UNIQUE(user_id, week_start)

## Workout Tables

### `exercises`
Seeded from free-exercise-db. ~800 exercises.

| Column           | Type       | Notes                    |
|------------------|------------|--------------------------|
| id               | uuid (PK)  |                          |
| name             | text       | GIN trigram index        |
| category         | text       | Strength, Cardio, etc.   |
| level            | text       | beginner/intermediate/expert|
| primary_muscles  | text[]     | GIN array index          |
| secondary_muscles| text[]     |                          |
| equipment        | text       |                          |
| instructions     | text[]     |                          |
| images           | text[]     | Storage paths / URLs     |
| created_at       | timestamptz|                          |

### `workout_templates` + `workout_template_exercises`
Trainer-authored templates.

`workout_templates`: id, trainer_id, title, description
`workout_template_exercises`: id, template_id, exercise_id, sort_order, target_sets, rep_min, rep_max, rest_seconds, notes

UNIQUE(template_id, sort_order)

### `workout_assignments`
Links a template to a client with status tracking.

| Column       | Type  | Notes                              |
|--------------|-------|------------------------------------|
| id           | uuid  |                                    |
| template_id  | uuid  |                                    |
| client_id    | uuid  |                                    |
| trainer_id   | uuid  |                                    |
| status       | text  | `assigned` \| `completed` \| `skipped`|
| assigned_at  | timestamptz |                             |
| due_date     | date  |                                    |

### `workout_sessions` + `workout_session_sets`
Client's completed sessions with per-set data.

`workout_sessions`: id, client_id, template_id, assignment_id, performed_at, duration_seconds
`workout_session_sets`: id, session_id, exercise_id, set_number, reps, weight_kg, rpe, notes, completed_at

## SQL Functions

| Function                                      | Returns       | Purpose                             |
|-----------------------------------------------|---------------|-------------------------------------|
| `get_last_session_sets(client_id, exercise_id)`| setof record  | Prefill previous session's sets     |
| `get_exercise_volume_trend(client_id, exercise_id, days)`| setof record | Chart data for volume trend |
| `is_admin()`                                  | bool          | RLS helper — checks role = 'admin'  |
| `is_linked_trainer(p_client_id uuid)`         | bool          | RLS helper — checks trainer_clients |
