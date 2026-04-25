-- ============================================================
--  Performance indexes
--  Run in Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- likes.post_id
-- The PK is (user_id, post_id), so lookups by post_id alone (used when
-- Supabase joins likes onto each post to count/check likes) hit a seq scan.
-- This index makes the per-post like aggregation ~10x faster.
create index if not exists likes_post_id_idx
  on public.likes(post_id);

-- pg_trgm: enables fast ILIKE '%term%' search on profile columns.
-- Without this, the search query in SearchPage does a full table scan.
create extension if not exists pg_trgm;

create index if not exists profiles_full_name_trgm_idx
  on public.profiles using gin(full_name gin_trgm_ops);

create index if not exists profiles_username_trgm_idx
  on public.profiles using gin(username gin_trgm_ops);
