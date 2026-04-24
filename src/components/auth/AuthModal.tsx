"use client"

import { useState, FormEvent } from "react"
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { validateUsername } from "@/lib/validation"

type Mode = "login" | "register"

export default function AuthModal() {
  // Show setup guide when env vars are not yet configured
  if (!isSupabaseConfigured) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6 text-center">
        <p className="text-4xl mb-4">🔧</p>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Supabase 未設定</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-4 max-w-xs">
          <code className="bg-gray-100 px-1 rounded">.env.local</code> に Supabase の URL と Anon Key を設定してください。
        </p>
        <div className="bg-gray-900 rounded-xl px-4 py-3 text-left text-xs font-mono text-gray-200 w-full max-w-xs">
          <p className="text-gray-400 mb-1"># .env.local</p>
          <p>NEXT_PUBLIC_SUPABASE_URL=...</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY=...</p>
        </div>
        <p className="text-gray-400 text-xs mt-3">
          設定後に <code className="bg-gray-100 px-1 rounded">npm run dev</code> を再起動してください
        </p>
      </div>
    )
  }

  const [mode, setMode] = useState<Mode>("login")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Login fields
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  // Register extra fields
  const [name, setName] = useState("")
  const [username, setUsername] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const [showPw, setShowPw] = useState(false)
  const supabase = createClient()

  function resetForm() {
    setError(null)
    setEmail("")
    setPassword("")
    setName("")
    setUsername("")
    setConfirmPassword("")
  }

  function switchMode(m: Mode) {
    resetForm()
    setMode(m)
  }

  // ── Login ────────────────────────────────────────────────────

  async function handleLogin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setLoading(false)
    if (error) {
      setError(
        error.message.includes("Invalid login")
          ? "メールアドレスまたはパスワードが正しくありません"
          : error.message
      )
    }
    // On success, onAuthStateChange in UserContext picks up the session automatically
  }

  // ── Register ─────────────────────────────────────────────────

  async function handleRegister(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const usernameErr = validateUsername(username.trim(), "")
    if (usernameErr) { setError(usernameErr); return }
    if (!name.trim()) { setError("名前を入力してください"); return }
    if (password.length < 8) { setError("パスワードは8文字以上にしてください"); return }
    if (password !== confirmPassword) { setError("パスワードが一致しません"); return }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name: name.trim(), username: username.trim() },
        emailRedirectTo: undefined, // disable email confirmation for dev
      },
    })

    setLoading(false)

    if (error) {
      setError(
        error.message.includes("already registered")
          ? "このメールアドレスはすでに使用されています"
          : error.message
      )
      return
    }

    setSuccess(true)
  }

  // ── Success state (after register) ───────────────────────────

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center px-6 text-center">
        <div className="text-5xl mb-4">💃</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">アカウントを作成しました</h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          確認メールを送信しました。<br />
          メールのリンクをクリックしてログインしてください。
        </p>
        <button
          onClick={() => { setSuccess(false); switchMode("login") }}
          className="bg-rose-500 text-white font-semibold px-8 py-2.5 rounded-full text-sm"
        >
          ログイン画面へ
        </button>
      </div>
    )
  }

  // ── Auth form ────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Header */}
      <div className="px-6 pt-16 pb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          dance<span className="text-rose-500">log</span>
        </h1>
        <p className="text-gray-400 text-sm mt-2">ダンサーのための練習記録</p>
      </div>

      {/* Tab switcher */}
      <div className="flex mx-6 bg-gray-100 rounded-xl p-1 mb-6">
        {(["login", "register"] as const).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
            }`}
          >
            {m === "login" ? "ログイン" : "新規登録"}
          </button>
        ))}
      </div>

      {/* Form */}
      <form
        onSubmit={mode === "login" ? handleLogin : handleRegister}
        className="flex-1 overflow-y-auto px-6 space-y-4"
      >
        {mode === "register" && (
          <>
            <Field label="名前">
              <input
                type="text"
                required
                placeholder="田中 葵"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputCls}
              />
            </Field>

            <Field label="アカウント名">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input
                  type="text"
                  required
                  placeholder="aoi_dance"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  className={`${inputCls} pl-7`}
                />
              </div>
              <p className="text-gray-400 text-xs mt-1">3〜20文字、英数字とアンダースコア(_)のみ</p>
            </Field>
          </>
        )}

        <Field label="メールアドレス">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            autoComplete="email"
          />
        </Field>

        <Field label="パスワード">
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              required
              placeholder={mode === "register" ? "8文字以上" : "パスワード"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputCls} pr-10`}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              <EyeIcon show={showPw} />
            </button>
          </div>
        </Field>

        {mode === "register" && (
          <Field label="パスワード（確認）">
            <input
              type="password"
              required
              placeholder="もう一度入力"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputCls}
              autoComplete="new-password"
            />
          </Field>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-red-600 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-rose-500 disabled:bg-rose-300 text-white font-bold py-3.5 rounded-xl text-sm transition-colors"
        >
          {loading
            ? "処理中…"
            : mode === "login"
            ? "ログイン"
            : "アカウントを作成"}
        </button>
      </form>

      <div className="px-6 py-6 text-center">
        {mode === "login" ? (
          <p className="text-gray-400 text-sm">
            アカウントをお持ちでない方は{" "}
            <button onClick={() => switchMode("register")} className="text-rose-500 font-medium">
              新規登録
            </button>
          </p>
        ) : (
          <p className="text-gray-400 text-sm">
            すでにアカウントをお持ちの方は{" "}
            <button onClick={() => switchMode("login")} className="text-rose-500 font-medium">
              ログイン
            </button>
          </p>
        )}
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

const inputCls =
  "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-rose-400 transition-colors"

function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
