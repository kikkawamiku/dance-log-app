"use client"

import { useState, useEffect, useCallback } from "react"
import { Post } from "@/lib/types"
import { useCurrentUser } from "@/contexts/UserContext"
import { createClient } from "@/lib/supabase/client"
import { fetchFeedPage } from "@/lib/supabase/posts"
import Feed from "@/components/Feed"
import Fab from "@/components/Fab"

interface Props {
  newPosts: Post[]
  onOpenCreate: () => void
  followVersion: number
}

export default function FeedPage({ newPosts, onOpenCreate, followVersion }: Props) {
  const user = useCurrentUser()
  const [posts, setPosts] = useState<Post[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [cursor, setCursor] = useState<string | undefined>(undefined)

  const supabase = createClient()

  const loadPage = useCallback(
    async (curCursor?: string) => {
      if (!user) return
      setLoading(true)
      try {
        const { posts: page, hasMore: more } = await fetchFeedPage(
          supabase,
          user.id,
          curCursor
        )
        setLoadError(null)
        setPosts((prev) => (curCursor ? [...prev, ...page] : page))
        setHasMore(more)
        if (page.length > 0) setCursor(page[page.length - 1].createdAt)
      } catch (err) {
        const msg = err instanceof Error
          ? err.message
          : JSON.stringify(err)
        console.error("[FeedPage] Feed load error:", msg, err)
        setLoadError(msg)
      } finally {
        setLoading(false)
        setInitialLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id, followVersion]
  )

  useEffect(() => {
    loadPage()
  }, [loadPage])

  const allPosts = [...newPosts, ...posts]

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">
            dance<span className="text-rose-500">log</span>
          </h1>
          <span className="text-xs text-gray-400 font-medium">フォロー中のみ</span>
        </div>
      </header>

      <main className="max-w-md mx-auto bg-white min-h-screen pb-24">
        {initialLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
          </div>
        ) : loadError ? (
          <div className="text-center py-16 px-6">
            <p className="text-2xl mb-3">⚠️</p>
            <p className="text-gray-500 text-sm font-medium mb-1">投稿の読み込みに失敗しました</p>
            <p className="text-gray-400 text-xs break-all">{loadError}</p>
            <button
              onClick={() => { setLoadError(null); setInitialLoading(true); loadPage() }}
              className="mt-4 text-rose-500 text-xs font-medium underline underline-offset-2"
            >
              再試行
            </button>
          </div>
        ) : allPosts.length === 0 ? (
          <div className="text-center py-24 text-gray-400 text-sm">
            <p className="text-4xl mb-4">💃</p>
            <p className="font-medium text-gray-500">最初の投稿をしてみよう！</p>
            <p className="mt-1">右下のボタンから練習を記録できます</p>
          </div>
        ) : (
          <Feed
            posts={allPosts}
            hasMore={hasMore}
            loading={loading}
            onLoadMore={() => loadPage(cursor)}
          />
        )}
      </main>

      <Fab onClick={onOpenCreate} />
    </>
  )
}
