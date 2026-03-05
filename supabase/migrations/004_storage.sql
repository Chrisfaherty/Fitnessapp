-- ============================================================
-- Migration 004: Storage Buckets
-- ============================================================

-- Insert buckets (run after storage schema is ready)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('exercise-media',  'exercise-media',  true,  52428800,  array['image/jpeg','image/png','image/webp','image/gif']),
  ('message-videos',  'message-videos',  false, 524288000, array['video/mp4','video/quicktime','video/webm']),
  ('avatars',         'avatars',         true,  5242880,   array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- ============================================================
-- STORAGE RLS: exercise-media (public read, admin write)
-- ============================================================
create policy "exercise_media_public_read"
  on storage.objects for select
  using (bucket_id = 'exercise-media');

create policy "exercise_media_admin_insert"
  on storage.objects for insert
  with check (bucket_id = 'exercise-media' and public.is_admin());

-- ============================================================
-- STORAGE RLS: message-videos (private — participants only)
-- ============================================================
create policy "message_videos_participant_read"
  on storage.objects for select
  using (
    bucket_id = 'message-videos'
    and (
      -- path: {conversation_id}/{message_id}.mp4
      exists (
        select 1 from public.conversations c
        where c.id::text = split_part(name, '/', 1)
          and (c.trainer_id = auth.uid() or c.client_id = auth.uid())
      )
      or public.is_admin()
    )
  );

create policy "message_videos_participant_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'message-videos'
    and exists (
      select 1 from public.conversations c
      where c.id::text = split_part(name, '/', 1)
        and (c.trainer_id = auth.uid() or c.client_id = auth.uid())
    )
  );

-- ============================================================
-- STORAGE RLS: avatars (public read, owner write)
-- ============================================================
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_insert"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '/', 1));

create policy "avatars_owner_update"
  on storage.objects for update
  using (bucket_id = 'avatars' and auth.uid()::text = split_part(name, '/', 1));
