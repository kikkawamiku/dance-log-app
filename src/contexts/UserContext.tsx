"use client"

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react"
import { AuthChangeEvent, Session } from "@supabase/supabase-js"
import { User } from "@/lib/types"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { ProfileRow, profileRowToUser } from "@/lib/supabase/db-types"

export interface UserProfile extends User {
  bio: string
  isPrivate: boolean
}

interface UserContextValue {
  user: UserProfile | null
  session: Session | null
  loading: boolean
  profilePending: boolean
  authError: string | null
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: string }>
  updatePassword: (newPassword: string) => Promise<{ error?: string }>
  checkPassword: (password: string) => Promise<boolean>
  signOut: () => Promise<void>
}

const UserContext = createContext<UserContextValue | null>(null)

const FETCH_TIMEOUT_MS = 8_000

export function UserProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()

  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profilePending, setProfilePending] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // fetchingRef: prevents concurrent fetchProfile calls
  const fetchingRef = useRef(false)
  // loadedUserIdRef: set at the TOP of fetchProfile (before any await) so that
  // TOKEN_REFRESHED / duplicate events never re-enter the function.
  const loadedUserIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    // onAuthStateChange is the single trigger for fetchProfile.
    // createBrowserClient fires INITIAL_SESSION immediately with the
    // cookie-stored session — no separate getSession() call needed.
    // Removing getSession() eliminates the race that caused double-calls.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, newSession: Session | null) => {
        setSession(newSession)
        if (newSession) {
          setAuthError(null)
          fetchProfile(newSession)
        } else {
          setUser(null)
          loadedUserIdRef.current = null
          fetchingRef.current = false
          setProfilePending(false)
          setAuthError(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Profile fetch ─────────────────────────────────────────────

  async function fetchProfile(currentSession: Session) {
    const userId = currentSession.user.id

    if (fetchingRef.current) return
    if (loadedUserIdRef.current === userId) return

    // Set both guards BEFORE any await — this is what prevents loops.
    fetchingRef.current = true
    loadedUserIdRef.current = userId

    console.info("[UserContext] fetchProfile start —", userId)

    try {
      // ── Phase 1: JWT data (no network, instant) ───────────────
      // session.user is decoded from the local JWT — zero network calls.
      // This clears the loading screen immediately.
      const meta = currentSession.user.user_metadata ?? {}
      const email = currentSession.user.email
      const name = (
        (meta.full_name as string | undefined) ||
        (meta.name as string | undefined) ||
        email?.split("@")[0] ||
        "dancer"
      ).slice(0, 30)
      const username = (
        (meta.username as string | undefined) ||
        name.toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 20) ||
        "dancer"
      )
      setUser(prev => prev?.id === userId ? prev : { id: userId, name, username, bio: "", isPrivate: false })
      setLoading(false)

      // ── Phase 2: load full profile from DB (best-effort) ─────
      const t0 = Date.now()
      try {
        const result = await Promise.race([
          supabase.from("profiles").select("*").eq("id", userId).single(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("TIMEOUT")), FETCH_TIMEOUT_MS)
          ),
        ])

        const { data, error } = result
        console.info(`[UserContext] profiles query ${Date.now() - t0}ms`)

        if (data) {
          applyProfileRow(data as ProfileRow)
          return
        }

        if (error?.code === "PGRST116") {
          setProfilePending(true)
          await autoCreateProfile(currentSession)
          return
        }

        console.error("[UserContext] profiles error:", {
          code: error?.code, message: error?.message,
        })

      } catch (err) {
        if (err instanceof Error && err.message === "TIMEOUT") {
          console.warn(`[UserContext] profiles timed out after ${Date.now() - t0}ms — JWT data in use`)
        } else {
          console.error("[UserContext] fetchProfile exception:", err)
        }
        // User is already in the app from Phase 1. No action needed.
      }

    } finally {
      setLoading(false)
      setProfilePending(false)
      fetchingRef.current = false
      // loadedUserIdRef stays set — prevents TOKEN_REFRESHED from re-running
    }
  }

  function applyProfileRow(row: ProfileRow) {
    setUser({
      ...profileRowToUser(row),
      bio: row.bio ?? "",
      isPrivate: !row.is_public,
    })
  }

  // ── Auto-create missing profile ───────────────────────────────

  async function autoCreateProfile(currentSession: Session) {
    // Uses the passed session — no supabase.auth calls that could trigger events.
    const meta = currentSession.user.user_metadata ?? {}
    const email = currentSession.user.email

    const rawName = (
      (meta.full_name as string | undefined) ||
      (meta.name as string | undefined) ||
      email?.split("@")[0] ||
      "dancer"
    ).slice(0, 30)

    const baseUsername = rawName
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 15) || "dancer"

    const userId = currentSession.user.id

    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        const username = attempt === 0 ? baseUsername : `${baseUsername}_${attempt}`

        const { data, error } = await supabase
          .from("profiles")
          .insert({ id: userId, full_name: rawName, username })
          .select("*")
          .single()

        if (data) {
          applyProfileRow(data as ProfileRow)
          console.info("[UserContext] profile auto-created:", username)
          return
        }

        const isUnique =
          error?.code === "23505" ||
          error?.message?.toLowerCase().includes("unique") ||
          error?.message?.toLowerCase().includes("duplicate")

        if (!isUnique) {
          console.error("[UserContext] autoCreateProfile failed:", error)
          setAuthError(
            `プロフィールの作成に失敗しました (${error?.code ?? "?"}): ${error?.message}`
          )
          break
        }
      }
      // In-memory fallback
      setUser({ id: userId, name: rawName, username: baseUsername, bio: "", isPrivate: false })
    } catch (err) {
      console.error("[UserContext] autoCreateProfile exception:", err)
    }
  }

  // ── Actions ───────────────────────────────────────────────────

  async function updateProfile(updates: Partial<UserProfile>): Promise<{ error?: string }> {
    if (!session) return { error: "未ログイン" }

    const dbUpdates: Partial<Record<string, unknown>> = {}
    if (updates.name      !== undefined) dbUpdates.full_name  = updates.name
    if (updates.username  !== undefined) dbUpdates.username   = updates.username
    if (updates.bio       !== undefined) dbUpdates.bio        = updates.bio
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl
    if (updates.isPrivate !== undefined) dbUpdates.is_public  = !updates.isPrivate

    const { error } = await supabase
      .from("profiles")
      .update(dbUpdates)
      .eq("id", session.user.id)

    if (error) return { error: error.message }
    setUser(prev => prev ? { ...prev, ...updates } : null)
    return {}
  }

  async function updatePassword(newPassword: string): Promise<{ error?: string }> {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return error ? { error: error.message } : {}
  }

  async function checkPassword(password: string): Promise<boolean> {
    if (!session?.user?.email) return false
    const { error } = await supabase.auth.signInWithPassword({
      email: session.user.email,
      password,
    })
    return !error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <UserContext.Provider
      value={{
        user, session, loading, profilePending, authError,
        updateProfile, updatePassword, checkPassword, signOut,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext)
  if (!ctx) throw new Error("useUser must be used within UserProvider")
  return ctx
}

export function useCurrentUser(): UserProfile {
  const { user } = useUser()
  if (!user) throw new Error("useCurrentUser called outside auth gate")
  return user
}
