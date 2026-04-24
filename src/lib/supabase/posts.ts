import { SupabaseClient } from "@supabase/supabase-js"
import { Post } from "@/lib/types"
import { PostRow, postRowToPost } from "./db-types"

export const FEED_PAGE_SIZE = 8

const POST_SELECT = `
  id, user_id, content, image_url, video_url, video_source,
  practice_time, genre, is_public, created_at,
  profiles!user_id ( id, full_name, username, avatar_url, is_public )
` as const

// ── Feed ─────────────────────────────────────────────────────

/**
 * Fetch the first page of the home feed (own posts + followed users).
 * Returns posts ordered newest-first.
 */
export async function fetchFeedPage(
  supabase: SupabaseClient,
  userId: string,
  cursor?: string // created_at of the last loaded post (for pagination)
): Promise<{ posts: Post[]; hasMore: boolean }> {
  // 1. Resolve following IDs (gracefully handle missing follows table)
  const { data: followRows, error: followsError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)

  if (followsError) {
    // 404 = follows table not yet created; treat as no follows (own posts only)
    console.warn("[fetchFeedPage] follows query failed — showing own posts only:", followsError.message)
  }
  const followingIds = followRows?.map((r: { following_id: string }) => r.following_id) ?? []
  const authorIds = [userId, ...followingIds]

  // 2. Query posts with cursor-based pagination
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .in("user_id", authorIds)
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE_SIZE)

  if (cursor) {
    query = query.lt("created_at", cursor)
  }

  const { data, error } = await query

  if (error) {
    console.error("[fetchFeedPage] Supabase error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    throw error
  }

  const rows = (data ?? []) as unknown as PostRow[]
  return {
    posts: rows.map(postRowToPost),
    hasMore: rows.length === FEED_PAGE_SIZE,
  }
}

// ── Create ────────────────────────────────────────────────────

export interface CreatePostInput {
  text: string
  imageUrl?: string
  videoUrl?: string
  /** 'youtube' or 'storage'; inferred automatically if not provided */
  videoSource?: "youtube" | "storage"
  practiceMinutes?: number
  genre?: string
}

export async function createPost(
  supabase: SupabaseClient,
  userId: string,
  input: CreatePostInput
): Promise<Post> {
  const videoSource =
    input.videoSource ??
    (input.videoUrl ? inferVideoSource(input.videoUrl) : null)

  const { data, error } = await supabase
    .from("posts")
    .insert({
      user_id: userId,
      content: input.text,
      image_url: input.imageUrl ?? null,
      video_url: input.videoUrl ?? null,
      video_source: videoSource,
      practice_time: input.practiceMinutes ?? null,
      genre: input.genre ?? null,
    })
    .select(POST_SELECT)
    .single()

  if (error) throw error

  return postRowToPost(data as unknown as PostRow)
}

// ── Helpers ───────────────────────────────────────────────────

function inferVideoSource(url: string): "youtube" | "storage" {
  if (/youtu(\.be|be\.com)/i.test(url)) return "youtube"
  // Supabase Storage URLs contain /storage/v1/object/
  if (url.includes("/storage/v1/object/")) return "storage"
  return "youtube" // safe default for any external URL
}
