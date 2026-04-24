"use client"

import { useEffect, useState } from "react"
import { useUser } from "@/contexts/UserContext"
import AuthModal from "@/components/auth/AuthModal"

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

  if (loading) return <Splash message="読み込み中..." signOut={signOut} />

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
