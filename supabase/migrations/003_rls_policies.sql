-- ============================================================
-- Migration 003: Row Level Security Policies
-- ============================================================
-- Core rule:
--   A client's rows are visible only to:
--     1. the client themselves
--     2. linked trainer(s) via trainer_clients
--     3. admin role
-- ============================================================

-- ============================================================
-- HELPER: check if current user is admin
-- ============================================================
create or replace function public.is_admin()
returns boolean language sql stable security definer as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- ============================================================
-- HELPER: check if requester is a trainer linked to target client
-- ============================================================
create or replace function public.is_linked_trainer(p_client_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.trainer_clients
    where trainer_id = auth.uid()
      and client_id  = p_client_id
      and active = true
  );
$$;

-- ============================================================
-- ENABLE RLS
-- ============================================================
alter table public.profiles               enable row level security;
alter table public.trainer_clients        enable row level security;
alter table public.health_daily           enable row level security;
alter table public.health_workouts        enable row level security;
alter table public.diary_entries          enable row level security;
alter table public.check_ins              enable row level security;
alter table public.meal_plans             enable row level security;
alter table public.meal_plan_days         enable row level security;
alter table public.conversations          enable row level security;
alter table public.messages               enable row level security;
alter table public.weekly_summaries       enable row level security;
alter table public.exercises              enable row level security;
alter table public.workout_templates      enable row level security;
alter table public.workout_template_exercises enable row level security;
alter table public.workout_assignments    enable row level security;
alter table public.workout_sessions       enable row level security;
alter table public.workout_session_sets   enable row level security;

-- ============================================================
-- PROFILES
-- ============================================================
-- Anyone authenticated can read their own profile
create policy "profiles: self read"
  on public.profiles for select
  using (id = auth.uid());

-- Trainers can read their clients' profiles
create policy "profiles: trainer reads client"
  on public.profiles for select
  using (public.is_linked_trainer(id));

-- Admins can read all
create policy "profiles: admin read all"
  on public.profiles for select
  using (public.is_admin());

-- Users update only their own
create policy "profiles: self update"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- TRAINER_CLIENTS
-- ============================================================
create policy "trainer_clients: trainer sees own"
  on public.trainer_clients for select
  using (trainer_id = auth.uid() or client_id = auth.uid() or public.is_admin());

create policy "trainer_clients: trainer inserts"
  on public.trainer_clients for insert
  with check (
    trainer_id = auth.uid()
    and (select role from public.profiles where id = auth.uid()) in ('trainer', 'admin')
  );

create policy "trainer_clients: trainer updates"
  on public.trainer_clients for update
  using (trainer_id = auth.uid() or public.is_admin());

-- ============================================================
-- HEALTH_DAILY
-- ============================================================
create policy "health_daily: client read own"
  on public.health_daily for select
  using (user_id = auth.uid());

create policy "health_daily: trainer reads client"
  on public.health_daily for select
  using (public.is_linked_trainer(user_id));

create policy "health_daily: admin read all"
  on public.health_daily for select
  using (public.is_admin());

create policy "health_daily: client upsert own"
  on public.health_daily for insert
  with check (user_id = auth.uid());

create policy "health_daily: client update own"
  on public.health_daily for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- HEALTH_WORKOUTS
-- ============================================================
create policy "health_workouts: client read own"
  on public.health_workouts for select
  using (user_id = auth.uid());

create policy "health_workouts: trainer reads client"
  on public.health_workouts for select
  using (public.is_linked_trainer(user_id));

create policy "health_workouts: admin read all"
  on public.health_workouts for select
  using (public.is_admin());

create policy "health_workouts: client insert own"
  on public.health_workouts for insert
  with check (user_id = auth.uid());

-- ============================================================
-- DIARY_ENTRIES
-- ============================================================
create policy "diary: client read own"
  on public.diary_entries for select
  using (user_id = auth.uid());

create policy "diary: trainer reads client"
  on public.diary_entries for select
  using (public.is_linked_trainer(user_id));

create policy "diary: admin read all"
  on public.diary_entries for select
  using (public.is_admin());

create policy "diary: client upsert own"
  on public.diary_entries for insert
  with check (user_id = auth.uid());

create policy "diary: client update own"
  on public.diary_entries for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ============================================================
-- CHECK_INS
-- ============================================================
create policy "check_ins: client read own"
  on public.check_ins for select
  using (client_id = auth.uid());

create policy "check_ins: trainer reads linked client"
  on public.check_ins for select
  using (public.is_linked_trainer(client_id));

create policy "check_ins: admin read all"
  on public.check_ins for select
  using (public.is_admin());

create policy "check_ins: client insert own"
  on public.check_ins for insert
  with check (client_id = auth.uid());

create policy "check_ins: client update own pending"
  on public.check_ins for update
  using (client_id = auth.uid() and status = 'pending')
  with check (client_id = auth.uid());

create policy "check_ins: trainer update response"
  on public.check_ins for update
  using (public.is_linked_trainer(client_id) and status = 'submitted')
  with check (public.is_linked_trainer(client_id));

-- ============================================================
-- MEAL_PLANS
-- ============================================================
create policy "meal_plans: client read own"
  on public.meal_plans for select
  using (client_id = auth.uid());

create policy "meal_plans: trainer reads own"
  on public.meal_plans for select
  using (trainer_id = auth.uid());

create policy "meal_plans: admin read all"
  on public.meal_plans for select
  using (public.is_admin());

create policy "meal_plans: trainer insert"
  on public.meal_plans for insert
  with check (
    trainer_id = auth.uid()
    and (select role from public.profiles where id = auth.uid()) in ('trainer', 'admin')
  );

create policy "meal_plans: trainer update own"
  on public.meal_plans for update
  using (trainer_id = auth.uid());

-- ============================================================
-- MEAL_PLAN_DAYS
-- ============================================================
create policy "meal_plan_days: read via meal_plan"
  on public.meal_plan_days for select
  using (
    exists (
      select 1 from public.meal_plans mp
      where mp.id = meal_plan_id
        and (mp.client_id = auth.uid() or mp.trainer_id = auth.uid() or public.is_admin())
    )
  );

create policy "meal_plan_days: trainer insert"
  on public.meal_plan_days for insert
  with check (
    exists (
      select 1 from public.meal_plans mp
      where mp.id = meal_plan_id and mp.trainer_id = auth.uid()
    )
  );

create policy "meal_plan_days: trainer update"
  on public.meal_plan_days for update
  using (
    exists (
      select 1 from public.meal_plans mp
      where mp.id = meal_plan_id and mp.trainer_id = auth.uid()
    )
  );

-- ============================================================
-- CONVERSATIONS
-- ============================================================
create policy "conversations: participants read"
  on public.conversations for select
  using (trainer_id = auth.uid() or client_id = auth.uid() or public.is_admin());

create policy "conversations: trainer insert"
  on public.conversations for insert
  with check (
    trainer_id = auth.uid()
    and (select role from public.profiles where id = auth.uid()) in ('trainer', 'admin')
  );

-- ============================================================
-- MESSAGES
-- ============================================================
create policy "messages: participants read"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.trainer_id = auth.uid() or c.client_id = auth.uid() or public.is_admin())
    )
  );

create policy "messages: participants insert"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.trainer_id = auth.uid() or c.client_id = auth.uid())
    )
  );

create policy "messages: sender update own"
  on public.messages for update
  using (sender_id = auth.uid());

-- ============================================================
-- WEEKLY_SUMMARIES
-- ============================================================
create policy "weekly_summaries: client read own"
  on public.weekly_summaries for select
  using (client_id = auth.uid());

create policy "weekly_summaries: trainer reads client"
  on public.weekly_summaries for select
  using (public.is_linked_trainer(client_id));

create policy "weekly_summaries: admin read all"
  on public.weekly_summaries for select
  using (public.is_admin());

-- Only edge functions (service role) can write summaries
-- Clients/trainers cannot insert/update

-- ============================================================
-- EXERCISES (public read for authenticated users, trainer/admin write)
-- ============================================================
create policy "exercises: authenticated read"
  on public.exercises for select
  to authenticated
  using (true);

create policy "exercises: admin insert"
  on public.exercises for insert
  with check (public.is_admin());

create policy "exercises: admin update"
  on public.exercises for update
  using (public.is_admin());

-- ============================================================
-- WORKOUT_TEMPLATES
-- ============================================================
create policy "workout_templates: trainer reads own"
  on public.workout_templates for select
  using (trainer_id = auth.uid() or public.is_admin());

create policy "workout_templates: client reads assigned"
  on public.workout_templates for select
  using (
    exists (
      select 1 from public.workout_assignments wa
      where wa.template_id = id and wa.client_id = auth.uid()
    )
  );

create policy "workout_templates: trainer insert"
  on public.workout_templates for insert
  with check (
    trainer_id = auth.uid()
    and (select role from public.profiles where id = auth.uid()) in ('trainer', 'admin')
  );

create policy "workout_templates: trainer update own"
  on public.workout_templates for update
  using (trainer_id = auth.uid() or public.is_admin());

-- ============================================================
-- WORKOUT_TEMPLATE_EXERCISES
-- ============================================================
create policy "wte: trainer reads via template"
  on public.workout_template_exercises for select
  using (
    exists (
      select 1 from public.workout_templates wt
      where wt.id = template_id and (wt.trainer_id = auth.uid() or public.is_admin())
    )
  );

create policy "wte: client reads via assignment"
  on public.workout_template_exercises for select
  using (
    exists (
      select 1 from public.workout_assignments wa
      join public.workout_templates wt on wt.id = wa.template_id
      where wt.id = template_id and wa.client_id = auth.uid()
    )
  );

create policy "wte: trainer insert"
  on public.workout_template_exercises for insert
  with check (
    exists (
      select 1 from public.workout_templates wt
      where wt.id = template_id and wt.trainer_id = auth.uid()
    )
  );

create policy "wte: trainer update"
  on public.workout_template_exercises for update
  using (
    exists (
      select 1 from public.workout_templates wt
      where wt.id = template_id and wt.trainer_id = auth.uid()
    )
  );

create policy "wte: trainer delete"
  on public.workout_template_exercises for delete
  using (
    exists (
      select 1 from public.workout_templates wt
      where wt.id = template_id and wt.trainer_id = auth.uid()
    )
  );

-- ============================================================
-- WORKOUT_ASSIGNMENTS
-- ============================================================
create policy "workout_assignments: client reads own"
  on public.workout_assignments for select
  using (client_id = auth.uid());

create policy "workout_assignments: trainer reads own"
  on public.workout_assignments for select
  using (trainer_id = auth.uid() or public.is_admin());

create policy "workout_assignments: trainer insert"
  on public.workout_assignments for insert
  with check (
    trainer_id = auth.uid()
    and (select role from public.profiles where id = auth.uid()) in ('trainer', 'admin')
  );

create policy "workout_assignments: trainer update"
  on public.workout_assignments for update
  using (trainer_id = auth.uid() or public.is_admin());

create policy "workout_assignments: client update status"
  on public.workout_assignments for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- ============================================================
-- WORKOUT_SESSIONS
-- ============================================================
create policy "workout_sessions: client reads own"
  on public.workout_sessions for select
  using (client_id = auth.uid());

create policy "workout_sessions: trainer reads linked client"
  on public.workout_sessions for select
  using (public.is_linked_trainer(client_id));

create policy "workout_sessions: admin read all"
  on public.workout_sessions for select
  using (public.is_admin());

create policy "workout_sessions: client insert own"
  on public.workout_sessions for insert
  with check (client_id = auth.uid());

create policy "workout_sessions: client update own"
  on public.workout_sessions for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- ============================================================
-- WORKOUT_SESSION_SETS
-- ============================================================
create policy "session_sets: client reads own"
  on public.workout_session_sets for select
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.client_id = auth.uid()
    )
  );

create policy "session_sets: trainer reads linked client"
  on public.workout_session_sets for select
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and public.is_linked_trainer(ws.client_id)
    )
  );

create policy "session_sets: admin read all"
  on public.workout_session_sets for select
  using (public.is_admin());

create policy "session_sets: client insert own"
  on public.workout_session_sets for insert
  with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.client_id = auth.uid()
    )
  );

create policy "session_sets: client delete own"
  on public.workout_session_sets for delete
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = session_id and ws.client_id = auth.uid()
    )
  );
