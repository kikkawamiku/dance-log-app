-- ============================================================
--  ROLLBACK: undo all changes from 002 and 003
--  Run this FIRST to restore the working state.
--  Safe to run even if the objects don't exist (IF EXISTS guards).
-- ============================================================

-- ── 002: drop indexes ────────────────────────────────────────
drop index if exists public.likes_post_id_idx;
drop index if exists public.profiles_full_name_trgm_idx;
drop index if exists public.profiles_username_trgm_idx;

-- Leave pg_trgm extension in place; dropping it can break other things.
-- If you want to remove it too: DROP EXTENSION IF EXISTS pg_trgm CASCADE;

-- ── 003: drop avatars bucket storage policies ────────────────
drop policy if exists "Avatar images viewable by everyone"          on storage.objects;
drop policy if exists "Authenticated users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar"           on storage.objects;
drop policy if exists "Users can delete their own avatar"           on storage.objects;
