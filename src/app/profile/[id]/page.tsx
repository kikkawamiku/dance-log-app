"use client"

import { use, useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { profileRowToUser, ProfileRow } from "@/lib/supabase/db-types"
import { fetchUserPosts } from "@/lib/supabase/posts"
import { User, Post } from "@/lib/types"
import { useCurrentUser } from "@/contexts/UserContext"
import AuthGate from "@/components/AuthGate"
import Avatar from "@/components/Avatar"
import PostCard from "@/components/PostCard"
import EditProfileModal from "@/components/EditProfileModal"

export default function ProfileUserPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  return (
    <AuthGate>
      <ProfileContent userId={id} />
    </AuthGate>
  )
}

function ProfileContent({ userId }: { userId: string }) {
  const router = useRouter()
  const currentUser = useCurrentUser()
  const supabase = useRef(createClient()).current
  const isOwnProfile = currentUser.id === userId

  const [profile, setProfile] = useState<User | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  useEffect(() => {
    setLoading(true)
    const profilePromise = supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single()
      .then(({ data, error }: { data: ProfileRow | null; error: { message: string } | null }) => {
        if (!error && data) setProfile(profileRowToUser(data))
      })

    const postsPromise = fetchUserPosts(supabase, userId, currentUser.id)
      .then(setPosts)
      .catch((err: unknown) => console.error("[ProfileUserPage] posts:", err))

    const followPromise = isOwnProfile
      ? Promise.resolve()
      : supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", currentUser.id)
          .eq("following_id", userId)
          .maybeSingle()
          .then(({ data }: { data: unknown }) => setIsFollowing(!!data))

    Promise.all([profilePromise, postsPromise, followPromise]).finally(() =>
      setLoading(false)
    )
  }, [userId, currentUser.id, isOwnProfile, supabase])

  async function handleToggleFollow() {
    if (followLoading) return
    setFollowLoading(true)
    const prev = isFollowing
    setIsFollowing(!prev)
    try {
      if (prev) {
        await supabase
          .from("follows")
          .delete()
          .eq("follower_id", currentUser.id)
          .eq("following_id", userId)
      } else {
        await supabase
          .from("follows")
          .insert({ follower_id: currentUser.id, following_id: userId })
      }
    } catch {
      setIsFollowing(prev)
    } finally {
      setFollowLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="w-6 h-6 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-gray-50">
        <p className="text-gray-400 text-sm">ユーザーが見つかりません</p>
        <button
          onClick={() => router.back()}
          className="text-rose-500 text-sm font-medium"
        >
          ← 戻る
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-gray-500 p-1 -ml-1 flex-shrink-0"
          >
            <BackIcon />
          </button>
          <span className="text-base font-bold text-gray-900 flex-1 truncate">
            @{profile.username}
          </span>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-16">
        {/* Profile card */}
        <div className="bg-white px-4 py-8 flex flex-col items-center gap-3 border-b border-gray-100">
          <Avatar user={profile} size="lg" />

          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <p className="font-bold text-gray-900 text-lg">{profile.name}</p>
              {profile.isPrivate && (
                <span className="inline-flex items-center gap-0.5 bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full">
                  <LockIcon />
                  非公開
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm">@{profile.username}</p>
            {profile.bio && (
              <p className="text-gray-700 text-sm mt-2 leading-relaxed max-w-xs">
                {profile.bio}
              </p>
            )}
          </div>

          <div className="flex gap-10 pt-1">
            <div className="text-center">
              <p className="font-bold text-gray-900 text-base">{posts.length}</p>
              <p className="text-gray-400 text-xs">投稿</p>
            </div>
          </div>

          {isOwnProfile ? (
            <button
              onClick={() => setShowEdit(true)}
              className="border border-gray-200 text-gray-700 text-xs font-semibold px-6 py-2 rounded-full mt-1"
            >
              プロフィールを編集
            </button>
          ) : (
            <button
              onClick={handleToggleFollow}
              disabled={followLoading}
              className={`text-xs font-semibold px-6 py-2 rounded-full mt-1 transition-colors disabled:opacity-50 ${
                isFollowing
                  ? "border border-gray-200 text-gray-600 bg-white"
                  : "bg-rose-500 text-white"
              }`}
            >
              {isFollowing ? "フォロー中" : "フォローする"}
            </button>
          )}
        </div>

        {/* Posts */}
        {posts.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            <p className="text-3xl mb-3">💃</p>
            <p>まだ投稿がありません</p>
          </div>
        ) : (
          <div className="bg-white">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </main>

      {showEdit && <EditProfileModal onClose={() => setShowEdit(false)} />}
    </div>
  )
}

function BackIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
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
