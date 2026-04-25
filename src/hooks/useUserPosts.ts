"use client"

import { useRef } from "react"
import useSWR from "swr"
import useSWRInfinite from "swr/infinite"
import { createClient } from "@/lib/supabase/client"
import { fetchUserPostsPage, fetchUserPosts } from "@/lib/supabase/posts"
import { Post } from "@/lib/types"

interface UserPostsPage {
  posts: Post[]
  hasMore: boolean
}

type PageKey = readonly [
  type: "userPostsPage",
  userId: string,
  currentUserId: string,
  cursor: string
]

// ── Paginated (infinite scroll) — for Profile and /profile/[id] ──

export function useUserPostsInfinite(userId: string, currentUserId?: string) {
  const supabase = useRef(createClient()).current
  const cuid = currentUserId ?? ""

  const getKey = (pageIndex: number, prev: UserPostsPage | null): PageKey | null => {
    if (prev && !prev.hasMore) return null
    const cursor = pageIndex === 0 ? "" : (prev?.posts.at(-1)?.createdAt ?? "")
    return ["userPostsPage", userId, cuid, cursor] as const
  }

  const fetcher = ([, uid, currentUid, cursor]: PageKey): Promise<UserPostsPage> =>
    fetchUserPostsPage(supabase, uid, currentUid || undefined, cursor || undefined)

  const { data, size, setSize, isLoading, error } = useSWRInfinite<UserPostsPage>(
    getKey,
    fetcher,
    { revalidateOnFocus: false, revalidateFirstPage: false }
  )

  const posts = data?.flatMap(p => p.posts) ?? []
  const hasMore = data ? (data.at(-1)?.hasMore ?? false) : true
  const initialLoading = !data && isLoading
  const loadingMore = isLoading && size > 1

  return {
    posts,
    hasMore,
    initialLoading,
    loadingMore,
    error: error as Error | null,
    loadMore: () => setSize(s => s + 1),
  }
}

// ── All posts (non-paginated, cached) — for Report ───────────

export function useAllUserPosts(userId: string) {
  const supabase = useRef(createClient()).current

  const { data, isLoading, error } = useSWR<Post[]>(
    userId ? ["allUserPosts", userId] : null,
    () => fetchUserPosts(supabase, userId, userId),
    { revalidateOnFocus: false, keepPreviousData: true }
  )

  return {
    posts: data ?? [],
    loading: isLoading && !data,
    error: error as Error | null,
  }
}
