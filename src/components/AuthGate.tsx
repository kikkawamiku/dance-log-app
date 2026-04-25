"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/contexts/UserContext"
import AuthModal from "@/components/auth/AuthModal"
import { PostCardSkeletonList } from "@/components/Skeleton"

/**
 * Render children only when both session AND user profile are ready.
 *
 * States handled:
 *   loading        → spinner (initial session + profile fetch in progress)
 *   profilePending → "プロフィール設定中..." (session exists, profile row being created)
 *   authError      → error message + force logout button
 *   !session       → AuthModal (not logged in)
 *   session && !user → AuthModal (profile creation failed; user should re-login)
 *   session && user  → children (fully authenticated)
 */
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, session, loading, profilePending, authError, signOut } = useUser()

  if (loading) return <AppShellSkeleton signOut={signOut} />

  // authError with user = fallback mode (DB timeout but auth metadata available).
  // Show a dismissible banner inside the app rather than blocking entirely.
  if (authError && !user) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-2xl font-bold text-gray-900 tracking-tight">
          dance<span className="text-rose-500">log</span>
        </p>
        <div className="w-full max-w-sm bg-red-50 rounded-2xl p-4">
          <p className="text-red-700 text-xs font-medium mb-1">エラーが発生しました</p>
          <p className="text-red-600 text-xs whitespace-pre-wrap leading-relaxed">{authError}</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="text-rose-500 text-xs font-medium underline underline-offset-2"
          >
            再読み込み
          </button>
          <button
            onClick={async () => { await signOut(); window.location.reload() }}
            className="text-gray-400 text-xs underline underline-offset-2"
          >
            ログアウトして最初からやり直す
          </button>
        </div>
      </div>
    )
  }

  // Session exists but profile row is being created (first login, missing trigger, etc.)
  if (session && profilePending) {
    return <Splash message="プロフィールを設定中..." signOut={signOut} />
  }

  if (!session || !user) return <AuthModal />

  return <>{children}</>
}

// Shown during the initial auth check — renders the app shell immediately
// so the screen never goes fully white on reload.
function AppShellSkeleton({ signOut }: { signOut: () => Promise<void> }) {
  const [showLogout, setShowLogout] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowLogout(true), 5_000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">
            dance<span className="text-rose-500">log</span>
          </h1>
          <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
        </div>
      </header>

      {/* Content skeleton */}
      <main className="max-w-md mx-auto bg-white min-h-screen pb-24">
        <PostCardSkeletonList count={5} />
      </main>

      {/* Bottom nav skeleton */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 z-40">
        <div className="max-w-md mx-auto flex items-center justify-around px-2 py-2 pb-[env(safe-area-inset-bottom,8px)]">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex flex-col items-center gap-0.5 flex-1 py-1">
              <div className="w-5 h-5 bg-gray-100 rounded animate-pulse" />
              <div className="w-8 h-2 bg-gray-100 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </nav>

      {/* Escape hatch after 5s */}
      {showLogout && (
        <div className="fixed bottom-20 inset-x-0 flex justify-center z-50">
          <div className="flex gap-4 bg-white/90 backdrop-blur-sm rounded-full px-5 py-2.5 shadow-sm border border-gray-100">
            <button
              onClick={() => window.location.reload()}
              className="text-rose-500 text-xs font-medium"
            >
              再読み込み
            </button>
            <button
              onClick={async () => { await signOut(); window.location.reload() }}
              className="text-gray-400 text-xs"
            >
              ログアウト
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Splash({
  message,
  signOut,
}: {
  message: string
  signOut: () => Promise<void>
}) {
  const [showLogout, setShowLogout] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShowLogout(true), 5_000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center gap-4">
      <p className="text-2xl font-bold text-gray-900 tracking-tight">
        dance<span className="text-rose-500">log</span>
      </p>
      <div className="flex flex-col items-center gap-2">
        <div className="w-5 h-5 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
        <p className="text-gray-400 text-xs">{message}</p>
      </div>
      {showLogout && (
        <div className="flex flex-col items-center gap-1 mt-2">
          <button
            onClick={() => window.location.reload()}
            className="text-rose-500 text-xs font-medium underline underline-offset-2"
          >
            再読み込み
          </button>
          <button
            onClick={async () => { await signOut(); window.location.reload() }}
            className="text-gray-400 text-xs underline underline-offset-2"
          >
            ログアウトして最初からやり直す
          </button>
        </div>
      )}
    </div>
  )
}
