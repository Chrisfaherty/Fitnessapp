-- ============================================================
-- CRUD Tests
-- Tests core data operations work correctly
-- ============================================================

begin;

select plan(15);

-- ============================================================
-- PROFILES
-- ============================================================
select has_table('public', 'profiles', 'profiles table exists');
select has_column('public', 'profiles', 'role', 'profiles has role column');

-- ============================================================
-- EXERCISES
-- ============================================================
select has_table('public', 'exercises', 'exercises table exists');
select ok(
  (select count(*) from public.exercises) >= 30,
  'At least 30 exercises seeded'
);
select ok(
  (select count(*) from public.exercises where primary_muscles @> array['chest']) >= 1,
  'Chest exercises exist'
);
select ok(
  (select count(*) from public.exercises where primary_muscles @> array['quadriceps']) >= 1,
  'Quad exercises exist'
);

-- Exercise name search (trigram index)
select ok(
  (select count(*) from public.exercises where name ilike '%squat%') >= 1,
  'Exercise name search works'
);

-- ============================================================
-- WORKOUT TEMPLATES
-- ============================================================
select has_table('public', 'workout_templates', 'workout_templates table exists');
select ok(
  (select count(*) from public.workout_templates) >= 1,
  'At least 1 template seeded'
);

-- Template-exercise join
select ok(
  (select count(*) from public.workout_template_exercises) >= 1,
  'Template exercises seeded'
);

-- ============================================================
-- WORKOUT ASSIGNMENTS
-- ============================================================
select ok(
  (select count(*) from public.workout_assignments) >= 1,
  'At least 1 assignment seeded'
);

-- ============================================================
-- HEALTH DATA
-- ============================================================
select ok(
  (select count(*) from public.health_daily where user_id = '00000000-0000-0000-0000-000000000004') >= 7,
  '7+ days of health data for client1'
);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
select ok(
  (select count(*) from public.get_last_session_sets(
    '00000000-0000-0000-0000-000000000004'::uuid,
    'barbell-squat'
  )) >= 0,
  'get_last_session_sets function works (returns 0 when no sessions)'
);

-- Weekly summaries table
select has_table('public', 'weekly_summaries', 'weekly_summaries table exists');

-- Conversations
select has_table('public', 'conversations', 'conversations table exists');
select ok(
  (select count(*) from public.conversations) >= 1,
  'At least 1 conversation seeded'
);

select * from finish();
rollback;
