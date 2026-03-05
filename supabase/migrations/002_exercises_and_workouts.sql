-- ============================================================
-- Migration 002: Exercise Library + Workout Templates + Logging
-- Phase 2 schema
-- ============================================================

-- ============================================================
-- EXERCISE LIBRARY
-- ============================================================
create table public.exercises (
  id               text primary key,              -- stable string id from source dataset
  name             text not null,
  force            text,                          -- push | pull | static | null
  level            text not null,                 -- beginner | intermediate | expert
  mechanic         text,                          -- compound | isolation | null
  equipment        text,                          -- barbell | dumbbell | machine | bodyweight | etc
  category         text not null,                 -- strength | stretching | plyometrics | etc
  primary_muscles  text[] not null default '{}',
  secondary_muscles text[] not null default '{}',
  instructions     text[] not null default '{}',
  image_paths      text[] not null default '{}',  -- storage URLs or relative paths
  source           text not null default 'free-exercise-db',
  created_at       timestamptz not null default now()
);

-- Full-text / trigram search on name
create index idx_exercises_name_trgm      on public.exercises using gin(name gin_trgm_ops);
-- GIN for muscle array search
create index idx_exercises_primary_muscles on public.exercises using gin(primary_muscles);
create index idx_exercises_secondary_muscles on public.exercises using gin(secondary_muscles);
-- Scalar filters
create index idx_exercises_equipment      on public.exercises(equipment);
create index idx_exercises_category       on public.exercises(category);
create index idx_exercises_level          on public.exercises(level);

-- ============================================================
-- WORKOUT TEMPLATES (trainer-created)
-- ============================================================
create table public.workout_templates (
  id           uuid primary key default gen_random_uuid(),
  trainer_id   uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_workout_templates_trainer on public.workout_templates(trainer_id);

create trigger workout_templates_updated_at
  before update on public.workout_templates
  for each row execute function public.handle_updated_at();

-- ============================================================
-- WORKOUT TEMPLATE EXERCISES (ordered exercise list in a template)
-- ============================================================
create table public.workout_template_exercises (
  id              uuid primary key default gen_random_uuid(),
  template_id     uuid not null references public.workout_templates(id) on delete cascade,
  exercise_id     text not null references public.exercises(id) on delete restrict,
  sort_order      integer not null default 0,
  target_sets     integer not null default 3,
  rep_min         integer not null default 8,
  rep_max         integer not null default 12,
  rest_seconds    integer not null default 90,
  notes           text
);

create index idx_wte_template on public.workout_template_exercises(template_id, sort_order);

-- ============================================================
-- WORKOUT ASSIGNMENTS (trainer assigns template to client)
-- ============================================================
create table public.workout_assignments (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.profiles(id) on delete cascade,
  template_id      uuid not null references public.workout_templates(id) on delete cascade,
  trainer_id       uuid references public.profiles(id) on delete set null,
  scheduled_date   date,
  status           assignment_status not null default 'assigned',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index idx_workout_assignments_client   on public.workout_assignments(client_id, scheduled_date desc);
create index idx_workout_assignments_trainer  on public.workout_assignments(trainer_id);
create index idx_workout_assignments_template on public.workout_assignments(template_id);

create trigger workout_assignments_updated_at
  before update on public.workout_assignments
  for each row execute function public.handle_updated_at();

-- ============================================================
-- WORKOUT SESSIONS (logged by client)
-- ============================================================
create table public.workout_sessions (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.profiles(id) on delete cascade,
  template_id     uuid references public.workout_templates(id) on delete set null,
  assignment_id   uuid references public.workout_assignments(id) on delete set null,
  performed_at    timestamptz not null default now(),
  duration_seconds integer,
  notes           text,
  health_external_id text,   -- written back to HealthKit/Health Connect
  created_at      timestamptz not null default now()
);

create index idx_workout_sessions_client on public.workout_sessions(client_id, performed_at desc);

-- ============================================================
-- WORKOUT SESSION SETS (individual sets logged)
-- ============================================================
create table public.workout_session_sets (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.workout_sessions(id) on delete cascade,
  exercise_id  text not null references public.exercises(id) on delete restrict,
  set_number   integer not null,
  reps         integer not null,
  weight_kg    numeric(6,2),
  rpe          numeric(3,1) check (rpe between 1 and 10),
  rest_seconds integer,
  completed_at timestamptz not null default now()
);

create index idx_session_sets_session  on public.workout_session_sets(session_id);
create index idx_session_sets_exercise on public.workout_session_sets(exercise_id);

-- ============================================================
-- HELPER: last session sets per exercise per client
-- Used by "prefill last session" feature
-- ============================================================
create or replace function public.get_last_session_sets(
  p_client_id  uuid,
  p_exercise_id text
)
returns table (
  set_number   integer,
  reps         integer,
  weight_kg    numeric,
  rpe          numeric,
  performed_at timestamptz
)
language sql stable security definer as $$
  select
    wss.set_number,
    wss.reps,
    wss.weight_kg,
    wss.rpe,
    ws.performed_at
  from public.workout_session_sets wss
  join public.workout_sessions ws on ws.id = wss.session_id
  where ws.client_id = p_client_id
    and wss.exercise_id = p_exercise_id
    and ws.performed_at = (
      select max(ws2.performed_at)
      from public.workout_session_sets wss2
      join public.workout_sessions ws2 on ws2.id = wss2.session_id
      where ws2.client_id = p_client_id
        and wss2.exercise_id = p_exercise_id
    )
  order by wss.set_number;
$$;

-- ============================================================
-- HELPER: exercise volume trend (for analytics)
-- ============================================================
create or replace function public.get_exercise_volume_trend(
  p_client_id   uuid,
  p_exercise_id text,
  p_days        integer default 90
)
returns table (
  performed_at  timestamptz,
  total_volume  numeric,    -- sum(reps * weight_kg)
  max_weight_kg numeric,
  total_sets    integer,
  total_reps    integer
)
language sql stable security definer as $$
  select
    ws.performed_at,
    sum(wss.reps * coalesce(wss.weight_kg, 0))     as total_volume,
    max(coalesce(wss.weight_kg, 0))                as max_weight_kg,
    count(*)::integer                              as total_sets,
    sum(wss.reps)::integer                         as total_reps
  from public.workout_session_sets wss
  join public.workout_sessions ws on ws.id = wss.session_id
  where ws.client_id = p_client_id
    and wss.exercise_id = p_exercise_id
    and ws.performed_at >= now() - (p_days || ' days')::interval
  group by ws.performed_at
  order by ws.performed_at;
$$;
