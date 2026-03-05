-- ============================================================
-- Seed Data
-- Creates demo users: 1 admin, 2 trainers, 4 clients
-- Links trainers to clients; inserts sample exercises,
-- templates, and health data.
-- Run AFTER migrations. Uses auth.users + profiles.
-- ============================================================

-- NOTE: In local dev, Supabase auto-creates auth users via
-- `supabase db seed` or you can use the admin API.
-- The UUIDs below are stable for reproducible seeds.

-- ============================================================
-- AUTH USERS (using supabase's internal helper)
-- ============================================================
-- Admin
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000001',
  'admin@fitnessapp.dev',
  crypt('Admin1234!', gen_salt('bf')),
  now(),
  '{"full_name":"Admin User","role":"admin"}'::jsonb
) on conflict (id) do nothing;

-- Trainer 1
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000002',
  'trainer1@fitnessapp.dev',
  crypt('Trainer1234!', gen_salt('bf')),
  now(),
  '{"full_name":"Alex Trainer","role":"trainer"}'::jsonb
) on conflict (id) do nothing;

-- Trainer 2
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000003',
  'trainer2@fitnessapp.dev',
  crypt('Trainer1234!', gen_salt('bf')),
  now(),
  '{"full_name":"Sam Trainer","role":"trainer"}'::jsonb
) on conflict (id) do nothing;

-- Client 1 (linked to trainer1)
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000004',
  'client1@fitnessapp.dev',
  crypt('Client1234!', gen_salt('bf')),
  now(),
  '{"full_name":"Jordan Client","role":"client"}'::jsonb
) on conflict (id) do nothing;

-- Client 2 (linked to trainer1)
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000005',
  'client2@fitnessapp.dev',
  crypt('Client1234!', gen_salt('bf')),
  now(),
  '{"full_name":"Morgan Client","role":"client"}'::jsonb
) on conflict (id) do nothing;

-- Client 3 (linked to trainer2)
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000006',
  'client3@fitnessapp.dev',
  crypt('Client1234!', gen_salt('bf')),
  now(),
  '{"full_name":"Casey Client","role":"client"}'::jsonb
) on conflict (id) do nothing;

-- Client 4 (unlinked — for isolation tests)
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values (
  '00000000-0000-0000-0000-000000000007',
  'client4@fitnessapp.dev',
  crypt('Client1234!', gen_salt('bf')),
  now(),
  '{"full_name":"Riley Isolated","role":"client"}'::jsonb
) on conflict (id) do nothing;

-- ============================================================
-- TRAINER-CLIENT LINKS
-- ============================================================
insert into public.trainer_clients (trainer_id, client_id, active)
values
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000004', true),
  ('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000005', true),
  ('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000006', true)
on conflict (trainer_id, client_id) do nothing;

-- ============================================================
-- SAMPLE EXERCISES (30-exercise subset)
-- ============================================================
insert into public.exercises (id, name, force, level, mechanic, equipment, category, primary_muscles, secondary_muscles, instructions, image_paths, source) values
('barbell-bench-press', 'Barbell Bench Press', 'push', 'intermediate', 'compound', 'barbell', 'strength',
  array['chest'], array['shoulders','triceps'],
  array['Lie flat on a bench gripping the barbell slightly wider than shoulder-width.',
        'Unrack the bar and lower it to your mid-chest under control.',
        'Press the bar back up to the starting position, fully extending your arms.'],
  array[], 'free-exercise-db'),

('barbell-squat', 'Barbell Back Squat', 'push', 'intermediate', 'compound', 'barbell', 'strength',
  array['quadriceps'], array['glutes','hamstrings','lower back'],
  array['Stand with the barbell across your upper back, feet shoulder-width apart.',
        'Descend by pushing your hips back and bending your knees until thighs are parallel to floor.',
        'Drive through your heels to return to the starting position.'],
  array[], 'free-exercise-db'),

('deadlift', 'Conventional Deadlift', 'pull', 'intermediate', 'compound', 'barbell', 'strength',
  array['lower back','hamstrings'], array['glutes','quadriceps','traps','forearms'],
  array['Stand with feet hip-width apart, barbell over mid-foot.',
        'Hinge at the hips and grip the bar just outside your legs.',
        'Drive your feet into the floor and extend hips and knees to lift the bar.'],
  array[], 'free-exercise-db'),

('pull-up', 'Pull-Up', 'pull', 'intermediate', 'compound', 'body only', 'strength',
  array['lats'], array['biceps','middle back'],
  array['Hang from a pull-up bar with hands shoulder-width apart, palms facing away.',
        'Pull your body up until your chin clears the bar.',
        'Lower yourself fully under control.'],
  array[], 'free-exercise-db'),

('overhead-press', 'Barbell Overhead Press', 'push', 'intermediate', 'compound', 'barbell', 'strength',
  array['shoulders'], array['triceps','traps'],
  array['Grip the barbell at shoulder width, resting it on your front deltoids.',
        'Press the bar straight overhead until arms are fully extended.',
        'Lower the bar back to the starting position.'],
  array[], 'free-exercise-db'),

('dumbbell-row', 'Dumbbell Bent-Over Row', 'pull', 'beginner', 'compound', 'dumbbell', 'strength',
  array['middle back'], array['lats','biceps','shoulders'],
  array['Place one knee and hand on a bench for support.',
        'Hold a dumbbell in the opposite hand, letting it hang.',
        'Pull the dumbbell toward your hip, squeezing your back at the top.'],
  array[], 'free-exercise-db'),

('romanian-deadlift', 'Romanian Deadlift', 'pull', 'intermediate', 'compound', 'barbell', 'strength',
  array['hamstrings'], array['glutes','lower back'],
  array['Stand holding a barbell at hip level.',
        'Push hips back while lowering the bar along your legs.',
        'Return to standing by driving hips forward.'],
  array[], 'free-exercise-db'),

('incline-dumbbell-press', 'Incline Dumbbell Press', 'push', 'intermediate', 'compound', 'dumbbell', 'strength',
  array['chest'], array['shoulders','triceps'],
  array['Set the bench to 30-45 degrees.',
        'Hold dumbbells above your chest, arms extended.',
        'Lower them to chest level and press back up.'],
  array[], 'free-exercise-db'),

('leg-press', 'Leg Press', 'push', 'beginner', 'compound', 'machine', 'strength',
  array['quadriceps'], array['glutes','hamstrings','calves'],
  array['Sit in the leg press machine with feet shoulder-width on the platform.',
        'Release the safety and lower the platform until knees reach 90 degrees.',
        'Press through your heels to extend your legs.'],
  array[], 'free-exercise-db'),

('cable-lateral-raise', 'Cable Lateral Raise', 'push', 'beginner', 'isolation', 'cable', 'strength',
  array['shoulders'], array[],
  array['Stand beside a cable machine with the handle at the lowest position.',
        'Lift your arm out to the side to shoulder height.',
        'Lower slowly under control.'],
  array[], 'free-exercise-db'),

('tricep-pushdown', 'Tricep Pushdown', 'push', 'beginner', 'isolation', 'cable', 'strength',
  array['triceps'], array[],
  array['Attach a bar or rope to the high pulley.',
        'Keep elbows at your sides and push the handle down until arms are fully extended.',
        'Return slowly.'],
  array[], 'free-exercise-db'),

('barbell-curl', 'Barbell Curl', 'pull', 'beginner', 'isolation', 'barbell', 'strength',
  array['biceps'], array['forearms'],
  array['Stand holding a barbell with an underhand grip, arms extended.',
        'Curl the bar up to shoulder level, squeezing the biceps.',
        'Lower under control.'],
  array[], 'free-exercise-db'),

('plank', 'Plank', 'static', 'beginner', 'compound', 'body only', 'strength',
  array['abdominals'], array['shoulders','glutes'],
  array['Get into a push-up position resting on your forearms.',
        'Keep your body in a straight line from head to heels.',
        'Hold the position for the desired time.'],
  array[], 'free-exercise-db'),

('hip-thrust', 'Barbell Hip Thrust', 'push', 'intermediate', 'isolation', 'barbell', 'strength',
  array['glutes'], array['hamstrings','quadriceps'],
  array['Sit with upper back against a bench, barbell across your hips.',
        'Drive hips up until your body forms a straight line from knees to shoulders.',
        'Lower under control.'],
  array[], 'free-exercise-db'),

('face-pull', 'Cable Face Pull', 'pull', 'beginner', 'compound', 'cable', 'strength',
  array['shoulders'], array['traps','middle back'],
  array['Set the cable pulley at upper chest height.',
        'Pull the rope toward your face, flaring elbows out.',
        'Return slowly.'],
  array[], 'free-exercise-db'),

('lat-pulldown', 'Lat Pulldown', 'pull', 'beginner', 'compound', 'machine', 'strength',
  array['lats'], array['biceps','middle back'],
  array['Sit at a lat pulldown machine and grip the bar wide.',
        'Pull the bar to your upper chest, squeezing your lats.',
        'Return under control.'],
  array[], 'free-exercise-db'),

('goblet-squat', 'Goblet Squat', 'push', 'beginner', 'compound', 'dumbbell', 'strength',
  array['quadriceps'], array['glutes','hamstrings','calves'],
  array['Hold a dumbbell vertically at your chest.',
        'Squat until your elbows touch your knees.',
        'Drive through heels to stand.'],
  array[], 'free-exercise-db'),

('push-up', 'Push-Up', 'push', 'beginner', 'compound', 'body only', 'strength',
  array['chest'], array['shoulders','triceps','abdominals'],
  array['Start in a high plank with hands shoulder-width apart.',
        'Lower your chest to just above the floor.',
        'Push back to the starting position.'],
  array[], 'free-exercise-db'),

('dumbbell-lunges', 'Dumbbell Walking Lunges', 'push', 'beginner', 'compound', 'dumbbell', 'strength',
  array['quadriceps','glutes'], array['hamstrings','calves'],
  array['Hold dumbbells at your sides.',
        'Step forward and lower your back knee toward the floor.',
        'Drive off the front foot and repeat on the other leg.'],
  array[], 'free-exercise-db'),

('seated-calf-raise', 'Seated Calf Raise', 'push', 'beginner', 'isolation', 'machine', 'strength',
  array['calves'], array[],
  array['Sit on a calf raise machine with the pad on your thighs.',
        'Lower your heels as far as possible.',
        'Rise up on your toes as high as possible.'],
  array[], 'free-exercise-db'),

('dumbbell-shoulder-press', 'Dumbbell Shoulder Press', 'push', 'intermediate', 'compound', 'dumbbell', 'strength',
  array['shoulders'], array['triceps','traps'],
  array['Sit or stand holding dumbbells at shoulder height.',
        'Press the dumbbells overhead until arms are fully extended.',
        'Lower back to shoulder height.'],
  array[], 'free-exercise-db'),

('chest-fly', 'Dumbbell Chest Fly', 'push', 'beginner', 'isolation', 'dumbbell', 'strength',
  array['chest'], array['shoulders'],
  array['Lie on a flat bench holding dumbbells above your chest.',
        'Lower them in a wide arc until you feel a stretch in your chest.',
        'Bring them back together at the top.'],
  array[], 'free-exercise-db'),

('hammer-curl', 'Hammer Curl', 'pull', 'beginner', 'isolation', 'dumbbell', 'strength',
  array['biceps'], array['forearms'],
  array['Hold dumbbells with a neutral grip (palms facing each other).',
        'Curl the weights up to shoulder height.',
        'Lower under control.'],
  array[], 'free-exercise-db'),

('skull-crusher', 'Skull Crusher', 'push', 'intermediate', 'isolation', 'barbell', 'strength',
  array['triceps'], array[],
  array['Lie on a bench holding an EZ-bar over your chest.',
        'Lower the bar toward your forehead by bending your elbows.',
        'Extend back to the starting position.'],
  array[], 'free-exercise-db'),

('calf-raise', 'Standing Calf Raise', 'push', 'beginner', 'isolation', 'body only', 'strength',
  array['calves'], array[],
  array['Stand on the edge of a step with your heels off.',
        'Rise up on your toes as high as possible.',
        'Lower your heels below the step for a full stretch.'],
  array[], 'free-exercise-db'),

('bent-over-row', 'Barbell Bent-Over Row', 'pull', 'intermediate', 'compound', 'barbell', 'strength',
  array['middle back'], array['lats','biceps','shoulders','lower back'],
  array['Hold the barbell with an overhand grip, hinge at the hips.',
        'Pull the bar to your lower chest.',
        'Lower under control.'],
  array[], 'free-exercise-db'),

('box-jump', 'Box Jump', 'push', 'intermediate', 'compound', 'body only', 'plyometrics',
  array['quadriceps','glutes'], array['hamstrings','calves'],
  array['Stand facing a plyometric box.',
        'Bend your knees and swing your arms for momentum.',
        'Jump onto the box, landing softly in a squat position.'],
  array[], 'free-exercise-db'),

('battle-ropes', 'Battle Ropes', 'push', 'intermediate', 'compound', 'other', 'cardio',
  array['shoulders'], array['biceps','triceps','abdominals'],
  array['Hold one end of a rope in each hand.',
        'Create alternating or simultaneous waves by raising and lowering arms.',
        'Keep your core tight throughout.'],
  array[], 'free-exercise-db'),

('mountain-climber', 'Mountain Climbers', 'push', 'beginner', 'compound', 'body only', 'cardio',
  array['abdominals'], array['shoulders','quadriceps','hip flexors'],
  array['Start in a high plank position.',
        'Drive one knee toward your chest, then quickly switch legs.',
        'Maintain a flat back throughout.'],
  array[], 'free-exercise-db'),

('ab-crunch', 'Ab Crunch', 'pull', 'beginner', 'isolation', 'body only', 'strength',
  array['abdominals'], array[],
  array['Lie on your back with knees bent and feet flat.',
        'Place hands behind your head.',
        'Lift your shoulder blades off the floor by contracting your abs.'],
  array[], 'free-exercise-db')

on conflict (id) do nothing;

-- ============================================================
-- SAMPLE WORKOUT TEMPLATE (trainer1)
-- ============================================================
insert into public.workout_templates (id, trainer_id, title, description)
values (
  'aaaaaaaa-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  'Full Body Strength A',
  'Classic compound movements targeting all major muscle groups.'
) on conflict (id) do nothing;

insert into public.workout_template_exercises (template_id, exercise_id, sort_order, target_sets, rep_min, rep_max, rest_seconds, notes)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'barbell-squat',   0, 4, 5, 5, 180, 'Focus on depth'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'barbell-bench-press', 1, 4, 6, 10, 120, null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bent-over-row',   2, 4, 6, 10, 120, null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'overhead-press',  3, 3, 8, 12, 90,  null),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'romanian-deadlift', 4, 3, 8, 12, 90, 'Control the eccentric'),
  ('aaaaaaaa-0000-0000-0000-000000000001', 'plank',           5, 3, 1, 1, 60, '30–60s holds')
on conflict do nothing;

-- Assign to client1
insert into public.workout_assignments (client_id, template_id, trainer_id, scheduled_date, status)
values (
  '00000000-0000-0000-0000-000000000004',
  'aaaaaaaa-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  current_date + 1,
  'assigned'
) on conflict do nothing;

-- ============================================================
-- SAMPLE HEALTH DATA (client1, last 7 days)
-- ============================================================
insert into public.health_daily (user_id, date, steps, active_energy_kcal, weight_kg, nutrition_kcal, protein_g, carbs_g, fat_g, sources)
select
  '00000000-0000-0000-0000-000000000004'::uuid,
  current_date - s.n,
  (7000 + floor(random() * 5000))::int,
  (300 + random() * 200)::numeric(8,2),
  (80 + random() * 2)::numeric(5,2),
  (2000 + random() * 500)::numeric(8,2),
  (150 + random() * 50)::numeric(7,2),
  (200 + random() * 100)::numeric(7,2),
  (60 + random() * 30)::numeric(7,2),
  array['HealthKit', 'MyFitnessPal via HealthKit']
from generate_series(0, 6) as s(n)
on conflict (user_id, date) do nothing;

-- ============================================================
-- SAMPLE CONVERSATION + MESSAGES
-- ============================================================
insert into public.conversations (id, trainer_id, client_id)
values ('bbbbbbbb-0000-0000-0000-000000000001',
        '00000000-0000-0000-0000-000000000002',
        '00000000-0000-0000-0000-000000000004')
on conflict (trainer_id, client_id) do nothing;

insert into public.messages (conversation_id, sender_id, sender_role, body)
values
  ('bbbbbbbb-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000002',
   'trainer',
   'Welcome Jordan! Looking forward to working with you. Check your assigned workout for tomorrow.'),
  ('bbbbbbbb-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000004',
   'client',
   'Thank you! I saw the Full Body A workout. Should I go to failure on squats?')
on conflict do nothing;
