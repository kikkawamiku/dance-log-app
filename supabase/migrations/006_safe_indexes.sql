-- ============================================================
--  SAFE INDEXES — run AFTER confirming 004 rollback succeeded
--  and the app is working again.
--
--  Rules applied here:
--   • CREATE INDEX CONCURRENTLY — never locks the table
--   • Only 1 index per statement (CONCURRENTLY cannot be batched)
--   • No pg_trgm / GIN — those caused the lock; search works fine
--     with a B-tree index on username for prefix lookups
--   • IF NOT EXISTS — safe to re-run
--
--  Run each statement SEPARATELY in SQL Editor.
-- ============================================================

-- ── Statement 1 ──────────────────────────────────────────────
-- likes.post_id: the most critical index.
-- PostgREST resolves "likes(user_id)" as a subquery per post:
--   SELECT user_id FROM likes WHERE post_id = $1
-- Without this index, that subquery does a full table scan for every
-- post in the result set (10 scans per page load).
create index concurrently if not exists likes_post_id_idx
  on public.likes(post_id);

-- ── Statement 2 (optional, run separately) ───────────────────
-- profiles.username prefix search: supports "username ILIKE 'term%'"
-- (prefix match, not substring) without pg_trgm overhead.
-- Only add this if search speed is still slow after Statement 1.
-- create index concurrently if not exists profiles_username_idx
--   on public.profiles(username text_pattern_ops);

-- ── Statement 3 (avatars bucket policies) ────────────────────
-- Re-apply the storage policies from 003 (they were rolled back above).

create policy "Avatar images viewable by everyone"
  on storage.objects for select
  using (bucket_id = 'avatars');

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
