"use client"

import { Post } from "@/lib/types"
import PostCard from "./PostCard"
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll"

interface Props {
  posts: Post[]
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
}

export default function Feed({ posts, hasMore, loading, onLoadMore }: Props) {
  const sentinelRef = useInfiniteScroll(onLoadMore, hasMore && !loading)

  return (
    <div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}

      <div ref={sentinelRef} className="flex justify-center py-8">
        {loading && (
          <div className="w-6 h-6 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
        )}
        {!hasMore && !loading && posts.length > 0 && (
          <p className="text-gray-400 text-sm">すべての投稿を読み込みました</p>
        )}
      </div>
    </div>
  )
}
