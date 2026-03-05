-- ============================================================
-- Migration 001: Initial Schema
-- Core tables: profiles, trainer_clients, messaging,
-- health ingestion, check-ins, meal plans, diary
-- ============================================================

-- Enable extensions
-- uuid-ossp not needed: gen_random_uuid() is built into Postgres 13+
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";     -- trigram search for exercises

-- ============================================================
-- ENUM TYPES
-- ============================================================
create type user_role as enum ('client', 'trainer', 'admin');
create type check_in_status as enum ('pending', 'submitted', 'reviewed');
create type assignment_status as enum ('assigned', 'completed', 'skipped');
create type message_sender_role as enum ('trainer', 'client');

-- ============================================================
-- PROFILES
-- Extended user data beyond auth.users
-- ============================================================
create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         user_role not null default 'client',
  full_name    text not null,
  avatar_url   text,
  timezone     text not null default 'UTC',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Extended profile data for every user.';

-- ============================================================
-- TRAINER ↔ CLIENT LINKING
-- ============================================================
create table public.trainer_clients (
  id           uuid primary key default gen_random_uuid(),
  trainer_id   uuid not null references public.profiles(id) on delete cascade,
  client_id    uuid not null references public.profiles(id) on delete cascade,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (trainer_id, client_id)
);

create index idx_trainer_clients_trainer on public.trainer_clients(trainer_id);
create index idx_trainer_clients_client  on public.trainer_clients(client_id);

-- ============================================================
-- HEALTH: DAILY METRICS
-- ============================================================
create table public.health_daily (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  date                date not null,
  steps               integer,
  active_energy_kcal  numeric(8,2),
  weight_kg           numeric(5,2),
  nutrition_kcal      numeric(8,2),
  protein_g           numeric(7,2),
  carbs_g             numeric(7,2),
  fat_g               numeric(7,2),
  sources             text[] not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, date)
);

create index idx_health_daily_user_date on public.health_daily(user_id, date desc);

-- ============================================================
-- HEALTH: WORKOUT EVENTS (from OS health hub)
-- ============================================================
create table public.health_workouts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  external_id     text not null,           -- HKWorkout.uuid or Health Connect sessionId
  workout_type    text not null,
  start_at        timestamptz not null,
  end_at          timestamptz not null,
  kcal            numeric(8,2),
  source_app      text,                    -- e.g. "MyFitnessPal", "Strava"
  source_bundle   text,                    -- iOS bundle ID / Android packageName
  raw_data        jsonb,
  created_at      timestamptz not null default now(),
  unique (user_id, external_id)
);

create index idx_health_workouts_user_start on public.health_workouts(user_id, start_at desc);

-- ============================================================
-- DIARY (daily client note)
-- ============================================================
create table public.diary_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  date         date not null,
  notes        text,
  mood         smallint check (mood between 1 and 5),
  sleep_hours  numeric(4,1),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, date)
);

create index idx_diary_user_date on public.diary_entries(user_id, date desc);

-- ============================================================
-- WEEKLY CHECK-INS
-- ============================================================
create table public.check_ins (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.profiles(id) on delete cascade,
  trainer_id      uuid references public.profiles(id) on delete set null,
  week_start_date date not null,
  status          check_in_status not null default 'pending',
  -- client fields
  body_weight_kg  numeric(5,2),
  energy_level    smallint check (energy_level between 1 and 5),
  stress_level    smallint check (stress_level between 1 and 5),
  sleep_quality   smallint check (sleep_quality between 1 and 5),
  client_notes    text,
  -- trainer response
  trainer_notes   text,
  trainer_video_url text,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (client_id, week_start_date)
);

create index idx_check_ins_client     on public.check_ins(client_id, week_start_date desc);
create index idx_check_ins_trainer    on public.check_ins(trainer_id, status);

-- ============================================================
-- MEAL PLANS
-- ============================================================
create table public.meal_plans (
  id           uuid primary key default gen_random_uuid(),
  trainer_id   uuid not null references public.profiles(id) on delete cascade,
  client_id    uuid not null references public.profiles(id) on delete cascade,
  title        text not null,
  description  text,
  week_start   date,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index idx_meal_plans_client  on public.meal_plans(client_id);
create index idx_meal_plans_trainer on public.meal_plans(trainer_id);

create table public.meal_plan_days (
  id            uuid primary key default gen_random_uuid(),
  meal_plan_id  uuid not null references public.meal_plans(id) on delete cascade,
  day_of_week   smallint not null check (day_of_week between 0 and 6), -- 0=Sun
  meal_name     text not null,   -- e.g. "Breakfast", "Lunch"
  description   text,
  calories      integer,
  protein_g     numeric(6,1),
  carbs_g       numeric(6,1),
  fat_g         numeric(6,1),
  sort_order    integer not null default 0
);

-- ============================================================
-- MESSAGING
-- ============================================================
create table public.conversations (
  id           uuid primary key default gen_random_uuid(),
  trainer_id   uuid not null references public.profiles(id) on delete cascade,
  client_id    uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (trainer_id, client_id)
);

create index idx_conversations_trainer on public.conversations(trainer_id);
create index idx_conversations_client  on public.conversations(client_id);

create table public.messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations(id) on delete cascade,
  sender_id         uuid not null references public.profiles(id) on delete cascade,
  sender_role       message_sender_role not null,
  body              text,
  video_storage_path text,         -- Supabase Storage path (private bucket)
  video_thumbnail   text,
  read_at           timestamptz,
  created_at        timestamptz not null default now()
);

create index idx_messages_conversation on public.messages(conversation_id, created_at desc);
create index idx_messages_sender       on public.messages(sender_id);

-- ============================================================
-- WEEKLY SUMMARIES (generated by edge function)
-- ============================================================
create table public.weekly_summaries (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references public.profiles(id) on delete cascade,
  week_start_date   date not null,
  avg_steps         numeric(8,0),
  avg_calories      numeric(8,2),
  avg_protein_g     numeric(7,2),
  avg_weight_kg     numeric(5,2),
  workouts_count    integer not null default 0,
  check_in_id       uuid references public.check_ins(id),
  generated_at      timestamptz not null default now(),
  unique (client_id, week_start_date)
);

-- ============================================================
-- UPDATED_AT trigger helper
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at       before update on public.profiles        for each row execute function public.handle_updated_at();
create trigger health_daily_updated_at   before update on public.health_daily     for each row execute function public.handle_updated_at();
create trigger diary_updated_at          before update on public.diary_entries    for each row execute function public.handle_updated_at();
create trigger check_ins_updated_at      before update on public.check_ins        for each row execute function public.handle_updated_at();
create trigger meal_plans_updated_at     before update on public.meal_plans       for each row execute function public.handle_updated_at();

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'client')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
