import { Post, User } from "@/lib/types"

// ── DB row shapes (snake_case from Supabase) ──────────────────

export interface ProfileRow {
  id: string
  username: string
  full_name: string
  bio: string | null
  avatar_url: string | null
  is_public: boolean
  created_at: string
}

export interface PostRow {
  id: string
  user_id: string
  content: string
  image_url: string | null
  video_url: string | null
  video_source: "youtube" | "storage" | null
  practice_time: number | null
  genre: string | null
  is_public: boolean
  created_at: string
  // joined
  profiles: Pick<ProfileRow, "id" | "full_name" | "username" | "avatar_url" | "is_public">
}

// ── Transformers ──────────────────────────────────────────────

export function profileRowToUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.full_name,
    username: row.username,
    bio: row.bio ?? undefined,
    avatarUrl: row.avatar_url ?? undefined,
    isPrivate: !row.is_public,
  }
}

export function postRowToPost(row: PostRow): Post {
  const user: User = {
    id: row.profiles.id,
    name: row.profiles.full_name,
    username: row.profiles.username,
    avatarUrl: row.profiles.avatar_url ?? undefined,
    isPrivate: !row.profiles.is_public,
  }

  return {
    id: row.id,
    user,
    text: row.content,
    mediaUrls: row.image_url ? [row.image_url] : undefined,
    videoUrl: row.video_url ?? undefined,
    practiceMinutes: row.practice_time ?? undefined,
    genre: row.genre ?? undefined,
    createdAt: row.created_at,
    likes: 0,   // TODO: join likes count
    isLiked: false, // TODO: join user like status
  }
}
