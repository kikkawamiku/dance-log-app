"use client"

import { Post } from "@/lib/types"
import { useCurrentUser } from "@/contexts/UserContext"
import { useUserPostsInfinite } from "@/hooks/useUserPosts"
import Avatar from "@/components/Avatar"
import Feed from "@/components/Feed"
import { PostCardSkeletonList } from "@/components/Skeleton"

interface Props {
  newPosts: Post[]
  following: Set<string>
  onOpenEdit: () => void
  onSignOut: () => void
}

export default function ProfilePage({ newPosts, following, onOpenEdit, onSignOut }: Props) {
  const user = useCurrentUser()
  const { posts, hasMore, initialLoading, loadingMore, loadMore } = useUserPostsInfinite(
    user.id,
    user.id
  )

  // Merge session posts with cached DB posts, dedup by id
  const sessionIds = new Set(newPosts.map(p => p.id))
  const allPosts = [...newPosts, ...posts.filter(p => !sessionIds.has(p.id))]

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">プロフィール</h1>
          <div className="flex gap-2">
            <button
              onClick={onOpenEdit}
              className="border border-gray-200 text-gray-700 text-xs font-semibold px-4 py-1.5 rounded-full"
            >
              編集
            </button>
            <button
              onClick={onSignOut}
              className="border border-gray-200 text-gray-400 text-xs font-medium px-3 py-1.5 rounded-full"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-24">
        {/* ── Profile header — instant from context ── */}
        <div className="bg-white px-4 py-8 flex flex-col items-center gap-3 border-b border-gray-100">
          <Avatar user={user} size="lg" />

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <p className="font-bold text-gray-900 text-lg">{user.name}</p>
              {user.isPrivate && (
                <span className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">
                  <LockIcon />
                  非公開
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm">@{user.username}</p>
            {user.bio && (
              <p className="text-gray-700 text-sm mt-2 leading-relaxed max-w-xs">{user.bio}</p>
            )}
          </div>

          <div className="flex gap-10 pt-1">
            <Stat value={initialLoading ? "-" : String(allPosts.length)} label="投稿" />
            <Stat value={String(following.size)} label="フォロー中" />
          </div>
        </div>

        {/* ── Posts ── */}
        {initialLoading ? (
          <PostCardSkeletonList count={3} />
        ) : allPosts.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            <p className="text-3xl mb-3">💃</p>
            <p>まだ投稿がありません</p>
            <p className="mt-1">練習を記録してみよう</p>
          </div>
        ) : (
          <Feed posts={allPosts} hasMore={hasMore} loading={loadingMore} onLoadMore={loadMore} />
        )}
      </main>
    </>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="font-bold text-gray-900 text-base">{value}</p>
      <p className="text-gray-400 text-xs">{label}</p>
    </div>
  )
}

function LockIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
