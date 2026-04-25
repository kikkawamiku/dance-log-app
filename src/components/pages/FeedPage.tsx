"use client"

import { Post } from "@/lib/types"
import { useCurrentUser } from "@/contexts/UserContext"
import { useFeed } from "@/hooks/useFeed"
import Feed from "@/components/Feed"
import Fab from "@/components/Fab"
import { PostCardSkeletonList } from "@/components/Skeleton"

interface Props {
  newPosts: Post[]
  onOpenCreate: () => void
  followVersion: number
}

export default function FeedPage({ newPosts, onOpenCreate, followVersion }: Props) {
  const user = useCurrentUser()
  const { posts, hasMore, initialLoading, loadingMore, error, loadMore } = useFeed(
    user.id,
    followVersion
  )

  // Merge session posts (immediately visible) with cached/fetched posts, dedup by id
  const sessionIds = new Set(newPosts.map(p => p.id))
  const allPosts = [...newPosts, ...posts.filter(p => !sessionIds.has(p.id))]

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
          <PostCardSkeletonList count={5} />
        ) : error ? (
          <div className="text-center py-16 px-6">
            <p className="text-2xl mb-3">⚠️</p>
            <p className="text-gray-500 text-sm font-medium mb-1">投稿の読み込みに失敗しました</p>
            <p className="text-gray-400 text-xs break-all">{error.message}</p>
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
            loading={loadingMore}
            onLoadMore={loadMore}
          />
        )}
      </main>

      <Fab onClick={onOpenCreate} />
    </>
  )
}
