-- Migration 001: Allow authenticated users to create their own profile row.
--
-- This policy is needed for the client-side auto-create fallback in UserContext
-- (when the on_auth_user_created trigger didn't fire, e.g. for users created
-- before the schema was applied, or if the trigger failed silently).
--
-- Run this in: Supabase Dashboard → SQL Editor

create policy "Users can insert their own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- If you already ran schema.sql and the trigger exists but failed for existing
-- users, you can also manually back-fill missing profiles with:
--
-- insert into public.profiles (id, username, name)
-- select
--   au.id,
--   regexp_replace(split_part(au.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g'),
--   split_part(au.email, '@', 1)
-- from auth.users au
-- left join public.profiles p on p.id = au.id
-- where p.id is null;
