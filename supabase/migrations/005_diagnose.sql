-- ============================================================
--  DIAGNOSE: run these queries one by one in SQL Editor to
--  understand where time is being spent.
-- ============================================================

-- ── 1. Check for long-running or blocking queries ─────────────
-- (Run this immediately after rolling back 004 to see if any lock remains)
select
  pid,
  now() - pg_stat_activity.query_start as duration,
  query,
  state,
  wait_event_type,
  wait_event
from pg_stat_activity
where state != 'idle'
  and query not ilike '%pg_stat_activity%'
order by duration desc;

-- ── 2. Current indexes on posts and likes ────────────────────
select
  indexname,
  indexdef
from pg_indexes
where tablename in ('posts', 'likes', 'profiles')
  and schemaname = 'public'
order by tablename, indexname;

-- ── 3. EXPLAIN: the exact feed query ─────────────────────────
-- Replace the two UUIDs with your actual user IDs.
-- Look for "Seq Scan on likes" — that is the bottleneck.
explain (analyze, buffers, format text)
select
  p.id,
  p.user_id,
  p.created_at,
  (
    select json_agg(l)
    from likes l
    where l.post_id = p.id
  ) as likes_agg
from posts p
where p.user_id = any(array[
  'f6343211-c670-40cc-83ce-3cca1a3cc639'::uuid,
  '64d51935-be4c-4718-b253-b417c72ec81c'::uuid
])
order by p.created_at desc
limit 10;

-- ── 4. Row counts (helps gauge whether seq scans are expected) ─
select
  relname  as table_name,
  n_live_tup as live_rows
from pg_stat_user_tables
where relname in ('posts', 'likes', 'profiles')
order by live_rows desc;
