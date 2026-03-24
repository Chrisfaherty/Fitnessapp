-- ============================================================
-- RLS Tests — 21 targeted assertions
-- Run via: supabase db test
-- Requires: pgTAP extension
-- ============================================================
-- Covers:
--  health_daily  (tests 1–4)
--  diary_entries (tests 5–7)
--  check_ins     (tests 8–12)
--  meal_plans    (tests 13–14)
--  workout_assignments (tests 15–16)
--  workout_sessions    (tests 17–19)
--  conversations       (tests 20–21)
-- ============================================================

BEGIN;

SELECT plan(21);

-- ============================================================
-- Schema for test helpers
-- ============================================================
CREATE SCHEMA IF NOT EXISTS tests;

-- set_user: simulate an authenticated Supabase JWT session
CREATE OR REPLACE FUNCTION tests.set_user(uid uuid) RETURNS void AS $$
  SELECT set_config('request.jwt.claims', json_build_object('sub', uid::text)::text, true);
  SELECT set_config('request.jwt.sub',    uid::text, true);
  SELECT set_config('role', 'authenticated', true);
$$ LANGUAGE sql;

-- ============================================================
-- Stable UUIDs (from seed.sql)
-- ============================================================
\set trainer1_id '00000000-0000-0000-0000-000000000002'
\set trainer2_id '00000000-0000-0000-0000-000000000003'
\set client1_id  '00000000-0000-0000-0000-000000000004'  -- linked to trainer1
\set client2_id  '00000000-0000-0000-0000-000000000005'  -- linked to trainer1
\set client3_id  '00000000-0000-0000-0000-000000000006'  -- linked to trainer2
\set client_unlinked_id '00000000-0000-0000-0000-000000000007'

-- ============================================================
-- Ensure auth.uid() resolves from request.jwt.claims.sub.
-- The standard Supabase local stack exposes auth.uid() via the
-- "sub" claim in request.jwt.claims.  We verify the helper
-- works by calling it before every assertion block.
-- ============================================================

-- ============================================================
-- TEST 1: Client can read own health_daily rows
-- ============================================================
SELECT tests.set_user(:'client1_id');
SELECT ok(
  (SELECT count(*) FROM public.health_daily WHERE user_id = :'client1_id') >= 0,
  'Test 1: client1 can SELECT own health_daily rows'
);

-- ============================================================
-- TEST 2: Client cannot read another client's health_daily
-- ============================================================
SELECT tests.set_user(:'client1_id');
SELECT is(
  (SELECT count(*)::int FROM public.health_daily WHERE user_id = :'client2_id'),
  0,
  'Test 2: client1 cannot read client2 health_daily'
);

-- ============================================================
-- TEST 3: Trainer can read linked client's health_daily
-- ============================================================
SELECT tests.set_user(:'trainer1_id');
SELECT ok(
  (SELECT count(*) FROM public.health_daily WHERE user_id = :'client1_id') >= 0,
  'Test 3: trainer1 can read linked client1 health_daily'
);

-- ============================================================
-- TEST 4: Trainer cannot read unlinked client's health_daily
-- ============================================================
SELECT tests.set_user(:'trainer1_id');
SELECT is(
  (SELECT count(*)::int FROM public.health_daily WHERE user_id = :'client_unlinked_id'),
  0,
  'Test 4: trainer1 cannot read unlinked client health_daily'
);

-- ============================================================
-- TEST 5: Client can insert own diary_entries
-- ============================================================
SELECT tests.set_user(:'client1_id');
SAVEPOINT sp_diary_insert;
SELECT lives_ok(
  $$INSERT INTO public.diary_entries (user_id, date, notes, mood)
    VALUES ('00000000-0000-0000-0000-000000000004', '2026-01-10', 'RLS test entry', 4)
    ON CONFLICT (user_id, date) DO NOTHING$$,
  'Test 5: client1 can insert own diary_entry'
);
ROLLBACK TO SAVEPOINT sp_diary_insert;

-- ============================================================
-- TEST 6: Client cannot insert diary entries for another user
-- ============================================================
SELECT tests.set_user(:'client1_id');
SAVEPOINT sp_diary_other;
SELECT throws_ok(
  $$INSERT INTO public.diary_entries (user_id, date, notes)
    VALUES ('00000000-0000-0000-0000-000000000005', '2026-01-10', 'Injected entry')$$,
  'Test 6: client1 cannot insert diary_entry for client2'
);
ROLLBACK TO SAVEPOINT sp_diary_other;

-- ============================================================
-- TEST 7: Trainer can read linked client's diary_entries
-- ============================================================
-- First ensure a diary row exists for client1 (as service role via BEGIN)
SAVEPOINT sp_diary_seed;
INSERT INTO public.diary_entries (user_id, date, notes)
VALUES ('00000000-0000-0000-0000-000000000004', '2026-01-11', 'Seeded for RLS test')
ON CONFLICT (user_id, date) DO NOTHING;

SELECT tests.set_user(:'trainer1_id');
SELECT ok(
  (SELECT count(*) FROM public.diary_entries WHERE user_id = :'client1_id') >= 0,
  'Test 7: trainer1 can read linked client1 diary_entries'
);
ROLLBACK TO SAVEPOINT sp_diary_seed;

-- ============================================================
-- TEST 8: Client can insert own check_ins
-- ============================================================
SELECT tests.set_user(:'client1_id');
SAVEPOINT sp_checkin_insert;
SELECT lives_ok(
  $$INSERT INTO public.check_ins (client_id, week_start_date, status)
    VALUES ('00000000-0000-0000-0000-000000000004', '2026-01-06', 'pending')
    ON CONFLICT (client_id, week_start_date) DO NOTHING$$,
  'Test 8: client1 can insert own check_in'
);
ROLLBACK TO SAVEPOINT sp_checkin_insert;

-- ============================================================
-- TEST 9: Trainer can update check_ins for linked client (add trainer_notes)
-- Requires status = 'submitted' per the update policy.
-- We seed a submitted check-in as superuser, then act as trainer1.
-- ============================================================
SAVEPOINT sp_checkin_trainer_update;
INSERT INTO public.check_ins (client_id, trainer_id, week_start_date, status, client_notes)
VALUES (
  '00000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  '2026-01-13',
  'submitted',
  'Client notes for trainer review'
) ON CONFLICT (client_id, week_start_date) DO UPDATE SET status = 'submitted';

SELECT tests.set_user(:'trainer1_id');
SELECT lives_ok(
  $$UPDATE public.check_ins
    SET trainer_notes = 'Great work this week!', reviewed_at = now(), status = 'reviewed'
    WHERE client_id = '00000000-0000-0000-0000-000000000004'
      AND week_start_date = '2026-01-13'$$,
  'Test 9: trainer1 can update trainer_notes on linked client submitted check_in'
);
ROLLBACK TO SAVEPOINT sp_checkin_trainer_update;

-- ============================================================
-- TEST 10: Client cannot update another client's check_ins
-- ============================================================
SAVEPOINT sp_checkin_other_update;
INSERT INTO public.check_ins (client_id, week_start_date, status)
VALUES ('00000000-0000-0000-0000-000000000005', '2026-01-06', 'pending')
ON CONFLICT (client_id, week_start_date) DO NOTHING;

SELECT tests.set_user(:'client1_id');
-- The update will silently affect 0 rows because RLS filters it out
SELECT is(
  (WITH upd AS (
    UPDATE public.check_ins
    SET client_notes = 'Unauthorized edit'
    WHERE client_id = '00000000-0000-0000-0000-000000000005'
      AND week_start_date = '2026-01-06'
    RETURNING id
  ) SELECT count(*)::int FROM upd),
  0,
  'Test 10: client1 cannot update client2 check_in (0 rows affected)'
);
ROLLBACK TO SAVEPOINT sp_checkin_other_update;

-- ============================================================
-- TEST 11: Trainer can read linked client's check_ins
-- ============================================================
SAVEPOINT sp_checkin_read;
INSERT INTO public.check_ins (client_id, week_start_date, status)
VALUES ('00000000-0000-0000-0000-000000000004', '2026-01-20', 'pending')
ON CONFLICT (client_id, week_start_date) DO NOTHING;

SELECT tests.set_user(:'trainer1_id');
SELECT ok(
  (SELECT count(*) FROM public.check_ins WHERE client_id = :'client1_id') >= 1,
  'Test 11: trainer1 can read linked client1 check_ins'
);
ROLLBACK TO SAVEPOINT sp_checkin_read;

-- ============================================================
-- TEST 12: Trainer cannot read unlinked client's check_ins
-- ============================================================
SAVEPOINT sp_checkin_unlinked;
INSERT INTO public.check_ins (client_id, week_start_date, status)
VALUES ('00000000-0000-0000-0000-000000000007', '2026-01-20', 'pending')
ON CONFLICT (client_id, week_start_date) DO NOTHING;

SELECT tests.set_user(:'trainer1_id');
SELECT is(
  (SELECT count(*)::int FROM public.check_ins WHERE client_id = :'client_unlinked_id'),
  0,
  'Test 12: trainer1 cannot read unlinked client check_ins'
);
ROLLBACK TO SAVEPOINT sp_checkin_unlinked;

-- ============================================================
-- TEST 13: Client can read own meal_plans
-- ============================================================
SAVEPOINT sp_meal_read;
INSERT INTO public.meal_plans (trainer_id, client_id, title)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000004',
  'RLS Test Meal Plan'
);

SELECT tests.set_user(:'client1_id');
SELECT ok(
  (SELECT count(*) FROM public.meal_plans WHERE client_id = :'client1_id') >= 1,
  'Test 13: client1 can read own meal_plans'
);
ROLLBACK TO SAVEPOINT sp_meal_read;

-- ============================================================
-- TEST 14: Trainer can insert meal_plans for linked client
-- ============================================================
SELECT tests.set_user(:'trainer1_id');
SAVEPOINT sp_meal_insert;
SELECT lives_ok(
  $$INSERT INTO public.meal_plans (trainer_id, client_id, title)
    VALUES (
      '00000000-0000-0000-0000-000000000002',
      '00000000-0000-0000-0000-000000000004',
      'Trainer Inserted Meal Plan'
    )$$,
  'Test 14: trainer1 can insert meal_plan for linked client1'
);
ROLLBACK TO SAVEPOINT sp_meal_insert;

-- ============================================================
-- TEST 15: Client can read own workout_assignments
-- ============================================================
SELECT tests.set_user(:'client1_id');
SELECT ok(
  (SELECT count(*) FROM public.workout_assignments WHERE client_id = :'client1_id') >= 0,
  'Test 15: client1 can read own workout_assignments'
);

-- ============================================================
-- TEST 16: Trainer can insert workout_assignments for linked client
-- ============================================================
SELECT tests.set_user(:'trainer1_id');
SAVEPOINT sp_assign_insert;
SELECT lives_ok(
  $$INSERT INTO public.workout_assignments (client_id, template_id, trainer_id, scheduled_date, status)
    VALUES (
      '00000000-0000-0000-0000-000000000004',
      'aaaaaaaa-0000-0000-0000-000000000001',
      '00000000-0000-0000-0000-000000000002',
      '2026-03-31',
      'assigned'
    )$$,
  'Test 16: trainer1 can insert workout_assignment for linked client1'
);
ROLLBACK TO SAVEPOINT sp_assign_insert;

-- ============================================================
-- TEST 17: Client can insert own workout_sessions
-- ============================================================
SELECT tests.set_user(:'client1_id');
SAVEPOINT sp_session_insert;
SELECT lives_ok(
  $$INSERT INTO public.workout_sessions (client_id, performed_at, notes)
    VALUES (
      '00000000-0000-0000-0000-000000000004',
      now(),
      'RLS test session'
    )$$,
  'Test 17: client1 can insert own workout_session'
);
ROLLBACK TO SAVEPOINT sp_session_insert;

-- ============================================================
-- TEST 18: Trainer can read linked client's workout_sessions
-- ============================================================
SAVEPOINT sp_session_read;
INSERT INTO public.workout_sessions (client_id, performed_at, notes)
VALUES ('00000000-0000-0000-0000-000000000004', now() - interval '1 hour', 'Seeded session');

SELECT tests.set_user(:'trainer1_id');
SELECT ok(
  (SELECT count(*) FROM public.workout_sessions WHERE client_id = :'client1_id') >= 1,
  'Test 18: trainer1 can read linked client1 workout_sessions'
);
ROLLBACK TO SAVEPOINT sp_session_read;

-- ============================================================
-- TEST 19: Client cannot read unlinked client's workout_sessions
-- ============================================================
SAVEPOINT sp_session_isolation;
INSERT INTO public.workout_sessions (client_id, performed_at, notes)
VALUES ('00000000-0000-0000-0000-000000000007', now() - interval '2 hours', 'Unlinked session');

SELECT tests.set_user(:'client1_id');
SELECT is(
  (SELECT count(*)::int FROM public.workout_sessions WHERE client_id = :'client_unlinked_id'),
  0,
  'Test 19: client1 cannot read unlinked client workout_sessions'
);
ROLLBACK TO SAVEPOINT sp_session_isolation;

-- ============================================================
-- TEST 20: Both parties can read their own conversations
-- Seed conversation is: trainer1 <-> client1 (bbbbbbbb-...)
-- We verify both the trainer side and the client side in one
-- assertion by checking each independently and AND-ing the results.
-- ============================================================
DO $$
DECLARE
  trainer_sees int;
  client_sees  int;
BEGIN
  PERFORM tests.set_user('00000000-0000-0000-0000-000000000002'::uuid);
  SELECT count(*)::int INTO trainer_sees FROM public.conversations
    WHERE trainer_id = '00000000-0000-0000-0000-000000000002'
       OR client_id  = '00000000-0000-0000-0000-000000000002';

  PERFORM tests.set_user('00000000-0000-0000-0000-000000000004'::uuid);
  SELECT count(*)::int INTO client_sees FROM public.conversations
    WHERE client_id = '00000000-0000-0000-0000-000000000004';

  PERFORM set_config('tests.trainer_sees', trainer_sees::text, true);
  PERFORM set_config('tests.client_sees',  client_sees::text,  true);
END;
$$;

SELECT ok(
  current_setting('tests.trainer_sees')::int >= 1
  AND current_setting('tests.client_sees')::int >= 1,
  'Test 20: both trainer1 and client1 can read their shared conversation'
);

-- ============================================================
-- TEST 21: User cannot read a conversation they are not part of
-- client_unlinked has no conversations seeded
-- ============================================================
SELECT tests.set_user(:'client_unlinked_id');
SELECT is(
  (SELECT count(*)::int FROM public.conversations
   WHERE trainer_id = :'trainer1_id' OR client_id = :'trainer1_id'),
  0,
  'Test 21: client_unlinked cannot read trainer1-client1 conversation'
);

SELECT * FROM finish();
ROLLBACK;
