"use client"

import { useRef, useEffect } from "react"
import useSWRInfinite from "swr/infinite"
import { preload } from "swr"
import { createClient } from "@/lib/supabase/client"
import { fetchFeedPage, FEED_PAGE_SIZE } from "@/lib/supabase/posts"
import { Post } from "@/lib/types"

interface FeedPage {
  posts: Post[]
  hasMore: boolean
}

type FeedKey = readonly [type: "feed", userId: string, followVersion: number, cursor: string]

export function useFeed(userId: string, followVersion: number) {
  const supabase = useRef(createClient()).current

  const getKey = (pageIndex: number, prev: FeedPage | null): FeedKey | null => {
    if (prev && !prev.hasMore) return null
    const cursor = pageIndex === 0 ? "" : (prev?.posts.at(-1)?.createdAt ?? "")
    return ["feed", userId, followVersion, cursor] as const
  }

  const fetcher = ([, , , cursor]: FeedKey): Promise<FeedPage> =>
    fetchFeedPage(supabase, userId, cursor || undefined)

  const { data, size, setSize, isLoading, error } = useSWRInfinite<FeedPage>(
    getKey,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateFirstPage: false,
      revalidateAll: false,
      // Keep last 3 pages in cache between mounts
      initialSize: 1,
    }
  )

  const posts = data?.flatMap(p => p.posts) ?? []
  const hasMore = data ? (data.at(-1)?.hasMore ?? false) : true
  const initialLoading = !data && isLoading
  const loadingMore = isLoading && size > 1

  // Preload next page into SWR cache as soon as the current last page is available
  useEffect(() => {
    if (!data || data.length === 0) return
    const lastPage = data.at(-1)
    if (!lastPage?.hasMore) return
    const lastPost = lastPage.posts.at(-1)
    if (!lastPost) return
    const nextKey: FeedKey = ["feed", userId, followVersion, lastPost.createdAt] as const
    preload(nextKey, ([, , , cursor]: FeedKey) =>
      fetchFeedPage(supabase, userId, cursor || undefined)
    )
  }, [data, userId, followVersion, supabase])

  return {
    posts,
    hasMore,
    initialLoading,
    loadingMore,
    error: error as Error | null,
    loadMore: () => setSize(s => s + 1),
  }
}

// Type helper for hasMore detection
export { FEED_PAGE_SIZE }
