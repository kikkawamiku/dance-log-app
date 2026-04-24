-- ============================================================
--  dance-log-app  Supabase Schema
--  Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- ── Tables ──────────────────────────────────────────────────

create table public.profiles (
  id          uuid        primary key references auth.users on delete cascade,
  username    text        unique not null,
  name        text        not null,
  bio         text,
  avatar_url  text,
  is_private  boolean     not null default false,
  created_at  timestamptz not null default now(),

  constraint username_format check (username ~ '^[a-zA-Z0-9_]{3,20}$')
);
comment on table public.profiles is 'One row per auth user; extended profile data.';

create table public.posts (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null references public.profiles(id) on delete cascade,
  text             text        not null default '',
  -- Uploaded media: single image stored in Supabase Storage
  image_url        text,
  -- Video: YouTube URL today; 'storage' source when direct upload is added
  video_url        text,
  video_source     text        check (video_source in ('youtube', 'storage')),
  practice_minutes integer     check (practice_minutes is null or practice_minutes > 0),
  practice_date    date,
  created_at       timestamptz not null default now()
);
comment on column public.posts.video_source
  is 'Extensibility hook: youtube = YouTube embed, storage = Supabase Storage direct upload (future).';

create table public.follows (
  follower_id  uuid        not null references public.profiles(id) on delete cascade,
  following_id uuid        not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

create table public.likes (
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  post_id    uuid        not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- ── Indexes ──────────────────────────────────────────────────

create index posts_user_id_created_at_idx on public.posts(user_id, created_at desc);
create index posts_created_at_idx         on public.posts(created_at desc);
create index follows_follower_id_idx      on public.follows(follower_id);
create index follows_following_id_idx     on public.follows(following_id);

-- ── Row Level Security ────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.posts     enable row level security;
alter table public.follows   enable row level security;
alter table public.likes     enable row level security;

-- profiles
create policy "Profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- posts: visibility respects is_private
create policy "Visible posts"
  on public.posts for select using (
    -- own posts always visible
    auth.uid() = user_id
    -- or author has public profile
    or exists (
      select 1 from public.profiles p
      where p.id = posts.user_id and not p.is_private
    )
    -- or caller follows the author
    or exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.following_id = posts.user_id
    )
  );

create policy "Authenticated users can create posts"
  on public.posts for insert with check (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete using (auth.uid() = user_id);

-- follows
create policy "Follows are viewable by everyone"
  on public.follows for select using (true);

create policy "Users can manage their own follows"
  on public.follows for all using (auth.uid() = follower_id);

-- likes
create policy "Likes are viewable by everyone"
  on public.likes for select using (true);

create policy "Users can manage their own likes"
  on public.likes for all using (auth.uid() = user_id);

-- ── Trigger: auto-create profile on sign-up ──────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, name)
  values (
    new.id,
    -- prefer metadata passed from the client; fall back to email local-part
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g')
    ),
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'name'), ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Storage ───────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;

create policy "Post images viewable by everyone"
  on storage.objects for select
  using (bucket_id = 'post-images');

create policy "Authenticated users can upload post images"
  on storage.objects for insert
  with check (
    bucket_id = 'post-images'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own post images"
  on storage.objects for delete
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
