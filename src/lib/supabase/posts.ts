import { SupabaseClient } from "@supabase/supabase-js"
import { Post } from "@/lib/types"
import { PostRow, postRowToPost } from "./db-types"

export const FEED_PAGE_SIZE = 8

const POST_SELECT = `
  id, user_id, content, image_url, video_url, video_source,
  practice_time, genre, is_public, created_at,
  profiles!user_id ( id, full_name, username, avatar_url, is_public ),
  likes ( user_id )
` as const

// ── Feed ─────────────────────────────────────────────────────

export async function fetchFeedPage(
  supabase: SupabaseClient,
  userId: string,
  cursor?: string
): Promise<{ posts: Post[]; hasMore: boolean }> {
  const { data: followRows, error: followsError } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)

  if (followsError) {
    console.warn("[fetchFeedPage] follows query failed — showing own posts only:", followsError.message)
  }
  const followingIds = followRows?.map((r: { following_id: string }) => r.following_id) ?? []
  const authorIds = [userId, ...followingIds]

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
    posts: rows.map(row => postRowToPost(row, userId)),
    hasMore: rows.length === FEED_PAGE_SIZE,
  }
}

// ── User posts ───────────────────────────────────────────────

export async function fetchUserPosts(
  supabase: SupabaseClient,
  userId: string,
  currentUserId?: string
): Promise<Post[]> {
  const { data, error } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("[fetchUserPosts] error:", error)
    throw error
  }

  return ((data ?? []) as unknown as PostRow[]).map(row => postRowToPost(row, currentUserId))
}

// ── Create ────────────────────────────────────────────────────

export interface CreatePostInput {
  text: string
  imageUrl?: string
  videoUrl?: string
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

  return postRowToPost(data as unknown as PostRow, userId)
}

// ── Update / Delete ───────────────────────────────────────────

export async function updatePost(
  supabase: SupabaseClient,
  postId: string,
  userId: string,
  text: string
): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .update({ content: text })
    .eq("id", postId)
    .eq("user_id", userId)
  if (error) throw error
}

export async function deletePost(
  supabase: SupabaseClient,
  postId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", userId)
  if (error) throw error
}

// ── Likes ─────────────────────────────────────────────────────

export async function toggleLike(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  isCurrentlyLiked: boolean
): Promise<void> {
  if (isCurrentlyLiked) {
    const { error } = await supabase
      .from("likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", userId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from("likes")
      .insert({ post_id: postId, user_id: userId })
    if (error) throw error
  }
}

// ── Helpers ───────────────────────────────────────────────────

function inferVideoSource(url: string): "youtube" | "storage" {
  if (/youtu(\.be|be\.com)/i.test(url)) return "youtube"
  if (url.includes("/storage/v1/object/")) return "storage"
  return "youtube"
}
