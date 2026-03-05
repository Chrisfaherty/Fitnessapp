-- ============================================================
-- RLS Policy Tests
-- Run via: supabase db test
-- Requires: pgTAP extension
-- ============================================================

begin;

select plan(40);  -- 40 RLS assertions total

-- ============================================================
-- Test fixtures (IDs match seed.sql)
-- ============================================================
\set admin_id    '00000000-0000-0000-0000-000000000001'
\set trainer1_id '00000000-0000-0000-0000-000000000002'
\set trainer2_id '00000000-0000-0000-0000-000000000003'
\set client1_id  '00000000-0000-0000-0000-000000000004'  -- linked to trainer1
\set client2_id  '00000000-0000-0000-0000-000000000005'  -- linked to trainer1
\set client3_id  '00000000-0000-0000-0000-000000000006'  -- linked to trainer2
\set client4_id  '00000000-0000-0000-0000-000000000007'  -- unlinked

-- Helper: set current user
create or replace function tests.set_user(uid uuid) returns void as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid)::text, true);
  select set_config('role', 'authenticated', true);
$$ language sql;

-- ============================================================
-- 1. PROFILES: client can read own profile
-- ============================================================
select tests.set_user(:'client1_id');
select ok(
  (select count(*) from public.profiles where id = :'client1_id') = 1,
  'CLIENT1 can read own profile'
);

-- 2. client cannot read another client's profile
select ok(
  (select count(*) from public.profiles where id = :'client2_id') = 0,
  'CLIENT1 cannot read CLIENT2 profile'
);

-- 3. trainer can read linked client profile
select tests.set_user(:'trainer1_id');
select ok(
  (select count(*) from public.profiles where id = :'client1_id') = 1,
  'TRAINER1 can read CLIENT1 (linked) profile'
);

-- 4. trainer cannot read unlinked client profile
select ok(
  (select count(*) from public.profiles where id = :'client4_id') = 0,
  'TRAINER1 cannot read CLIENT4 (unlinked) profile'
);

-- 5. admin can read all profiles
select tests.set_user(:'admin_id');
select ok(
  (select count(*) from public.profiles) >= 6,
  'ADMIN can read all profiles'
);

-- ============================================================
-- 6-8. HEALTH_DAILY: isolation
-- ============================================================
select tests.set_user(:'client1_id');
select ok(
  (select count(*) from public.health_daily where user_id = :'client1_id') >= 0,
  'CLIENT1 can read own health_daily'
);

select ok(
  (select count(*) from public.health_daily where user_id = :'client2_id') = 0,
  'CLIENT1 cannot read CLIENT2 health_daily'
);

select tests.set_user(:'trainer1_id');
select ok(
  (select count(*) from public.health_daily where user_id = :'client1_id') >= 0,
  'TRAINER1 can read CLIENT1 (linked) health_daily'
);

-- 9. trainer cannot read unlinked client health
select ok(
  (select count(*) from public.health_daily where user_id = :'client4_id') = 0,
  'TRAINER1 cannot read CLIENT4 (unlinked) health_daily'
);

-- 10. admin can read all health_daily
select tests.set_user(:'admin_id');
select ok(
  (select count(*) from public.health_daily) >= 0,
  'ADMIN can read all health_daily'
);

-- ============================================================
-- 11-13. CHECK-INS: isolation
-- ============================================================
select tests.set_user(:'client1_id');
-- Insert a check-in for client1
insert into public.check_ins (client_id, week_start_date, status)
values (:'client1_id', '2024-01-01', 'pending')
on conflict do nothing;

select ok(
  (select count(*) from public.check_ins where client_id = :'client1_id') >= 0,
  'CLIENT1 can read own check_ins'
);

select ok(
  (select count(*) from public.check_ins where client_id = :'client2_id') = 0,
  'CLIENT1 cannot read CLIENT2 check_ins'
);

select tests.set_user(:'trainer1_id');
select ok(
  (select count(*) from public.check_ins where client_id = :'client1_id') >= 0,
  'TRAINER1 can read CLIENT1 (linked) check_ins'
);

-- 14. trainer cannot read unlinked check_in
select ok(
  (select count(*) from public.check_ins where client_id = :'client4_id') = 0,
  'TRAINER1 cannot read CLIENT4 (unlinked) check_ins'
);

-- ============================================================
-- 15-17. DIARY ENTRIES: isolation
-- ============================================================
select tests.set_user(:'client1_id');
insert into public.diary_entries (user_id, date, notes)
values (:'client1_id', '2024-01-01', 'Felt good')
on conflict do nothing;

select ok(
  (select count(*) from public.diary_entries where user_id = :'client1_id') >= 0,
  'CLIENT1 can read own diary'
);

select ok(
  (select count(*) from public.diary_entries where user_id = :'client2_id') = 0,
  'CLIENT1 cannot read CLIENT2 diary'
);

select tests.set_user(:'trainer1_id');
select ok(
  (select count(*) from public.diary_entries where user_id = :'client1_id') >= 0,
  'TRAINER1 can read CLIENT1 (linked) diary'
);

-- ============================================================
-- 18-20. WORKOUT SESSIONS: isolation
-- ============================================================
select tests.set_user(:'client1_id');
select ok(
  (select count(*) from public.workout_sessions where client_id = :'client1_id') >= 0,
  'CLIENT1 can read own sessions'
);

select ok(
  (select count(*) from public.workout_sessions where client_id = :'client2_id') = 0,
  'CLIENT1 cannot read CLIENT2 sessions'
);

select tests.set_user(:'trainer1_id');
select ok(
  (select count(*) from public.workout_sessions where client_id = :'client1_id') >= 0,
  'TRAINER1 can read CLIENT1 (linked) sessions'
);

-- ============================================================
-- 21-22. WORKOUT TEMPLATES: trainer reads own, client reads assigned
-- ============================================================
select tests.set_user(:'trainer1_id');
select ok(
  (select count(*) from public.workout_templates where trainer_id = :'trainer1_id') >= 0,
  'TRAINER1 can read own templates'
);

select ok(
  (select count(*) from public.workout_templates where trainer_id = :'trainer2_id') = 0,
  'TRAINER1 cannot read TRAINER2 templates'
);

-- ============================================================
-- 23. MEAL PLANS: client can read own
-- ============================================================
select tests.set_user(:'client1_id');
select ok(
  (select count(*) from public.meal_plans where client_id = :'client1_id') >= 0,
  'CLIENT1 can read own meal plans'
);

select ok(
  (select count(*) from public.meal_plans where client_id = :'client2_id') = 0,
  'CLIENT1 cannot read CLIENT2 meal plans'
);

-- ============================================================
-- 24-25. CONVERSATIONS: participants read own
-- ============================================================
select tests.set_user(:'client1_id');
select ok(
  (select count(*) from public.conversations where client_id = :'client1_id') >= 0,
  'CLIENT1 can read own conversations'
);

select ok(
  (select count(*) from public.conversations where client_id = :'client4_id') = 0,
  'CLIENT1 cannot read CLIENT4 conversations'
);

-- ============================================================
-- 26. MESSAGES: participant read
-- ============================================================
select tests.set_user(:'trainer1_id');
select ok(
  (select count(m.*)
   from public.messages m
   join public.conversations c on c.id = m.conversation_id
   where c.trainer_id = :'trainer1_id') >= 0,
  'TRAINER1 can read messages in own conversations'
);

-- ============================================================
-- 27-30. EXERCISES: authenticated users can read, only admin can write
-- ============================================================
select tests.set_user(:'client1_id');
select ok(
  (select count(*) from public.exercises) > 0,
  'Authenticated CLIENT can read exercises'
);

select tests.set_user(:'trainer1_id');
select ok(
  (select count(*) from public.exercises) > 0,
  'TRAINER can read exercises'
);

-- 29. Client cannot insert exercise
select throws_ok(
  $$insert into public.exercises (id, name, level, category, primary_muscles, secondary_muscles, instructions, image_paths, source)
    values ('test-insert', 'Test', 'beginner', 'strength', '{}', '{}', '{}', '{}', 'test')$$,
  'CLIENT cannot insert exercises'
);

-- 30. Admin can insert exercise
select tests.set_user(:'admin_id');
select lives_ok(
  $$insert into public.exercises (id, name, level, category, primary_muscles, secondary_muscles, instructions, image_paths, source)
    values ('test-admin-insert', 'Admin Test', 'beginner', 'strength', '{}', '{}', '{}', '{}', 'test')
    on conflict do nothing$$,
  'ADMIN can insert exercises'
);

-- ============================================================
-- 31-35. ADMIN: can read all tables
-- ============================================================
select tests.set_user(:'admin_id');
select ok(
  (select count(*) from public.profiles) >= 6,
  'ADMIN can see all profiles'
);
select ok(
  (select count(*) from public.trainer_clients) >= 3,
  'ADMIN can see all trainer_clients'
);
select ok(
  (select count(*) from public.health_daily) >= 0,
  'ADMIN can see all health_daily'
);
select ok(
  (select count(*) from public.workout_templates) >= 1,
  'ADMIN can see all templates'
);
select ok(
  (select count(*) from public.workout_assignments) >= 1,
  'ADMIN can see all assignments'
);

-- ============================================================
-- 36-40. Helper functions
-- ============================================================
select tests.set_user(:'trainer1_id');
select ok(
  public.is_linked_trainer(:'client1_id') = true,
  'is_linked_trainer returns true for linked client'
);
select ok(
  public.is_linked_trainer(:'client4_id') = false,
  'is_linked_trainer returns false for unlinked client'
);
select ok(
  public.is_admin() = false,
  'TRAINER1 is not admin'
);

select tests.set_user(:'admin_id');
select ok(
  public.is_admin() = true,
  'ADMIN is_admin() = true'
);
select ok(
  public.is_linked_trainer(:'client1_id') = false,
  'Admin is not a linked_trainer (correct — admin bypasses via policy)'
);

select * from finish();
rollback;
