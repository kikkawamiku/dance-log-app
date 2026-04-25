"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { User } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { profileRowToUser, ProfileRow, PROFILE_SELECT } from "@/lib/supabase/db-types"
import { useCurrentUser } from "@/contexts/UserContext"
import Avatar from "@/components/Avatar"

interface Props {
  following: Set<string>
  onToggleFollow: (userId: string) => void
}

export default function SearchPage({ following, onToggleFollow }: Props) {
  const currentUser = useCurrentUser()
  const supabase = createClient()
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  const search = useCallback(async (q: string) => {
    setLoading(true)
    try {
      let req = supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .neq("id", currentUser.id)
        .eq("is_public", true)
        .limit(30)

      if (q.trim()) {
        req = req.or(`full_name.ilike.%${q}%,username.ilike.%${q}%`)
      }

      const { data, error } = await req
      if (error) {
        console.error("[SearchPage] profiles fetch error:", error)
        setResults([])
      } else {
        setResults((data as ProfileRow[]).map(profileRowToUser))
      }
    } finally {
      setLoading(false)
    }
  }, [currentUser.id, supabase])

  useEffect(() => {
    const timer = setTimeout(() => search(query), query ? 300 : 0)
    return () => clearTimeout(timer)
  }, [query, search])

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900 mb-3">検索</h1>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </div>
            <input
              type="search"
              placeholder="名前やアカウント名で検索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-gray-100 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 outline-none placeholder-gray-400 focus:bg-gray-50"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                <XIcon />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-24">
        {!query && (
          <p className="px-4 pt-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            ダンサーを探す
          </p>
        )}

        {loading && (
          <div className="text-center py-16 text-gray-400 text-sm">
            読み込み中...
          </div>
        )}

        {!loading && query && results.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            <p className="text-3xl mb-3">🔍</p>
            <p>「{query}」に一致するユーザーが見つかりません</p>
          </div>
        )}

        {!loading && !query && results.length === 0 && (
          <div className="text-center py-16 text-gray-400 text-sm">
            まだユーザーがいません
          </div>
        )}

        {!loading && (
          <div className="bg-white">
            {results.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                isFollowing={following.has(user.id)}
                onToggle={() => onToggleFollow(user.id)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  )
}

function UserRow({
  user,
  isFollowing,
  onToggle,
}: {
  user: User
  isFollowing: boolean
  onToggle: () => void
}) {
  const router = useRouter()
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-50">
      <Link
        href={`/profile/${user.id}`}
        className="flex items-center gap-3 flex-1 min-w-0"
        onMouseEnter={() => router.prefetch(`/profile/${user.id}`)}
      >
        <Avatar user={user} />
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight">{user.name}</p>
          <p className="text-gray-400 text-xs">@{user.username}</p>
          {user.bio && (
            <p className="text-gray-500 text-xs mt-0.5 truncate">{user.bio}</p>
          )}
        </div>
      </Link>
      <button
        onClick={onToggle}
        className={`flex-shrink-0 text-xs font-semibold px-4 py-1.5 rounded-full transition-colors ${
          isFollowing
            ? "border border-gray-200 text-gray-600 bg-white"
            : "bg-rose-500 text-white"
        }`}
      >
        {isFollowing ? "フォロー中" : "フォローする"}
      </button>
    </div>
  )
}

function SearchIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function XIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
