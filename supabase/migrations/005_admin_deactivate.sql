-- ============================================================
-- Migration 005: Admin — soft-delete column on profiles
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.profiles.deactivated_at IS
  'NULL = active. Non-null = soft-deactivated by admin.';
