-- ============================================================
-- Migration 007:
--   (a) Add notes column to workout_assignments (trainer notes
--       captured by the assignment wizard were being dropped).
--   (b) Add admin write policies that the admin UI assumes exist:
--       - profiles: admin update/delete
--       - trainer_clients: admin full CRUD
-- ============================================================

-- ----- (a) workout_assignments.notes ------------------------------------
ALTER TABLE public.workout_assignments
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN public.workout_assignments.notes IS
  'Optional trainer-authored instructions for this specific assignment.';

-- ----- (b) Admin write policies -----------------------------------------

-- profiles: admin update any
DROP POLICY IF EXISTS "profiles: admin update any" ON public.profiles;
CREATE POLICY "profiles: admin update any"
  ON public.profiles FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- profiles: admin delete any
DROP POLICY IF EXISTS "profiles: admin delete any" ON public.profiles;
CREATE POLICY "profiles: admin delete any"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- trainer_clients: admin full access
DROP POLICY IF EXISTS "trainer_clients: admin read all" ON public.trainer_clients;
CREATE POLICY "trainer_clients: admin read all"
  ON public.trainer_clients FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "trainer_clients: admin insert" ON public.trainer_clients;
CREATE POLICY "trainer_clients: admin insert"
  ON public.trainer_clients FOR INSERT
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "trainer_clients: admin update" ON public.trainer_clients;
CREATE POLICY "trainer_clients: admin update"
  ON public.trainer_clients FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "trainer_clients: admin delete" ON public.trainer_clients;
CREATE POLICY "trainer_clients: admin delete"
  ON public.trainer_clients FOR DELETE
  USING (public.is_admin());
