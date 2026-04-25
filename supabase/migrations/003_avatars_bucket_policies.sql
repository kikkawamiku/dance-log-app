-- ============================================================
--  Storage policies for the `avatars` bucket
--  The bucket itself must already exist and be set to public=true.
--  Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- Anyone can view avatars (bucket is public)
create policy "Avatar images viewable by everyone"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Authenticated users can upload/update their own avatar
-- Files are stored at {userId}/avatar.webp
create policy "Authenticated users can upload their own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
