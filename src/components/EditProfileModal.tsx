"use client"

import { useState, useRef, useCallback, ChangeEvent } from "react"
import { useCurrentUser, useUser, UserProfile } from "@/contexts/UserContext"
import Avatar from "./Avatar"
import {
  validateName,
  validateUsername,
  validateAvatarUrl,
  checkPasswordStrength,
} from "@/lib/validation"

interface FormErrors {
  name?: string
  username?: string
  avatarUrl?: string
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

export default function EditProfileModal({ onClose }: { onClose: () => void }) {
  const user = useCurrentUser()
  const { updateProfile, updatePassword, checkPassword } = useUser()

  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState(user.username)
  const [bio, setBio] = useState(user.bio ?? "")
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "")
  const [avatarPreview, setAvatarPreview] = useState(user.avatarUrl ?? "")
  const [isPrivate, setIsPrivate] = useState(user.isPrivate ?? false)

  const [showPassword, setShowPassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)

  const [errors, setErrors] = useState<FormErrors>({})
  const [saving, setSaving] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const strength = checkPasswordStrength(newPassword)

  // ─── Avatar handling ──────────────────────────────────────────

  function handleUrlChange(url: string) {
    setAvatarUrl(url)
    setAvatarPreview(url)
  }

  function handleFileUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string
      setAvatarUrl(dataUrl)
      setAvatarPreview(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  // ─── Validation ───────────────────────────────────────────────

  // ─── Save (async — password check hits Supabase) ─────────────

  async function handleSave() {
    const errs: FormErrors = {}

    const nameErr = validateName(name)
    if (nameErr) errs.name = nameErr

    const usernameErr = validateUsername(username, user.username)
    if (usernameErr) errs.username = usernameErr

    if (avatarUrl && !avatarUrl.startsWith("data:")) {
      const urlErr = validateAvatarUrl(avatarUrl)
      if (urlErr) errs.avatarUrl = urlErr
    }

    if (showPassword) {
      if (!currentPassword) {
        errs.currentPassword = "現在のパスワードを入力してください"
      } else {
        setSaving(true)
        const ok = await checkPassword(currentPassword) // async Supabase call
        setSaving(false)
        if (!ok) errs.currentPassword = "パスワードが正しくありません"
      }

      if (!newPassword) {
        errs.newPassword = "新しいパスワードを入力してください"
      } else if (strength.score < 2) {
        errs.newPassword = `パスワードが弱すぎます。${strength.missing[0]}などを追加してください`
      }

      if (!confirmPassword) {
        errs.confirmPassword = "確認用パスワードを入力してください"
      } else if (newPassword !== confirmPassword) {
        errs.confirmPassword = "パスワードが一致しません"
      }
    }

    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setSaving(true)

    const updates: Partial<UserProfile> = {
      name: name.trim(),
      username: username.trim(),
      bio: bio.trim(),
      avatarUrl: avatarPreview || undefined,
      isPrivate,
    }

    const { error: profileErr } = await updateProfile(updates)
    if (profileErr) { setErrors({ name: profileErr }); setSaving(false); return }

    if (showPassword && newPassword) {
      const { error: pwErr } = await updatePassword(newPassword)
      if (pwErr) { setErrors({ newPassword: pwErr }); setSaving(false); return }
    }

    setSaving(false)
    onClose()
  }

  // ─── Helpers ──────────────────────────────────────────────────

  const previewUser = { ...user, name, username, avatarUrl: avatarPreview || user.avatarUrl }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={onClose} className="text-gray-500 text-sm font-medium px-1 py-1">
          キャンセル
        </button>
        <h2 className="font-semibold text-gray-900 text-sm">プロフィールを編集</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-rose-500 disabled:bg-rose-300 text-white text-sm font-semibold px-4 py-1.5 rounded-full transition-colors"
        >
          {saving ? "保存中…" : "保存"}
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Avatar ── */}
        <section className="flex flex-col items-center gap-4 px-4 py-6 border-b border-gray-100">
          <Avatar user={previewUser} size="lg" />
          <div className="flex gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-xs font-medium px-3 py-2 rounded-full"
            >
              <UploadIcon /> 画像をアップロード
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
          <div className="w-full">
            <label className="block text-xs font-medium text-gray-500 mb-1">
              または画像URLを入力
            </label>
            <input
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={avatarUrl.startsWith("data:") ? "" : avatarUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className={inputClass(!!errors.avatarUrl)}
            />
            {errors.avatarUrl && <p className="text-red-500 text-xs mt-1">{errors.avatarUrl}</p>}
          </div>
        </section>

        {/* ── 基本情報 ── */}
        <section className="px-4 py-5 border-b border-gray-100 space-y-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">基本情報</h3>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名前</label>
            <input
              type="text"
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
              className={inputClass(!!errors.name)}
            />
            <div className="flex justify-between mt-1">
              {errors.name
                ? <p className="text-red-500 text-xs">{errors.name}</p>
                : <span />}
              <p className="text-gray-400 text-xs">{name.length}/30</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">アカウント名</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
              <input
                type="text"
                value={username}
                maxLength={20}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-zA-Z0-9_]/g, ""))}
                className={`${inputClass(!!errors.username)} pl-7`}
              />
            </div>
            <div className="flex justify-between mt-1">
              {errors.username
                ? <p className="text-red-500 text-xs">{errors.username}</p>
                : <p className="text-gray-400 text-xs">英数字とアンダースコアのみ</p>}
              <p className="text-gray-400 text-xs">{username.length}/20</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">自己紹介</label>
            <textarea
              value={bio}
              maxLength={150}
              rows={3}
              onChange={(e) => setBio(e.target.value)}
              placeholder="ダンスのジャンルや目標など..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-rose-400 resize-none"
            />
            <p className="text-gray-400 text-xs text-right">{bio.length}/150</p>
          </div>
        </section>

        {/* ── 公開設定 ── */}
        <section className="px-4 py-5 border-b border-gray-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">公開設定</h3>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900">アカウントを非公開にする</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                {isPrivate
                  ? "フォロワーのみ投稿を見られます。新しいフォロワーには承認が必要です。"
                  : "誰でも投稿を見ることができます。"}
              </p>
            </div>
            <ToggleSwitch enabled={isPrivate} onChange={setIsPrivate} />
          </div>
          {isPrivate && (
            <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <p className="text-amber-700 text-xs leading-relaxed">
                非公開設定中：フォロワー以外のユーザーからはプロフィールと投稿が非表示になります。
                検索結果にも表示されません。
              </p>
            </div>
          )}
        </section>

        {/* ── パスワード変更 ── */}
        <section className="px-4 py-5 border-b border-gray-100">
          <button
            onClick={() => setShowPassword((v) => !v)}
            className="flex items-center justify-between w-full"
          >
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">パスワード変更</h3>
              {!showPassword && (
                <p className="text-xs text-gray-400 mt-0.5">タップして展開</p>
              )}
            </div>
            <ChevronIcon open={showPassword} />
          </button>

          {showPassword && (
            <div className="mt-4 space-y-4">
              {/* Current password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">現在のパスワード</label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={`${inputClass(!!errors.currentPassword)} pr-10`}
                    placeholder="現在のパスワード"
                  />
                  <EyeButton show={showCurrentPw} toggle={() => setShowCurrentPw(v => !v)} />
                </div>
                {errors.currentPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.currentPassword}</p>
                )}
              </div>

              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">新しいパスワード</label>
                <div className="relative">
                  <input
                    type={showNewPw ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${inputClass(!!errors.newPassword)} pr-10`}
                    placeholder="新しいパスワード"
                  />
                  <EyeButton show={showNewPw} toggle={() => setShowNewPw(v => !v)} />
                </div>

                {/* Strength bar */}
                {newPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3].map((seg) => (
                        <div
                          key={seg}
                          className={`h-1.5 flex-1 rounded-full transition-colors ${
                            strength.score >= seg ? strength.color : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium ${
                      strength.score === 3 ? "text-emerald-600"
                      : strength.score === 2 ? "text-amber-600"
                      : "text-red-500"
                    }`}>
                      強度：{strength.label}
                    </p>
                    {strength.missing.length > 0 && (
                      <ul className="text-xs text-gray-400 space-y-0.5">
                        {strength.missing.map((m) => (
                          <li key={m} className="flex items-center gap-1">
                            <span>•</span>{m}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {errors.newPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.newPassword}</p>
                )}
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  新しいパスワード（確認）
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputClass(!!errors.confirmPassword)}
                  placeholder="もう一度入力"
                />
                {errors.confirmPassword && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                )}
                {confirmPassword && confirmPassword === newPassword && !errors.confirmPassword && (
                  <p className="text-emerald-600 text-xs mt-1">✓ 一致しています</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  )
}

// ─── Sub-components ──────────────────────────────────────────────

function inputClass(hasError: boolean) {
  return `w-full border ${
    hasError ? "border-red-400" : "border-gray-200"
  } rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-rose-400 transition-colors`
}

function ToggleSwitch({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
        enabled ? "bg-rose-500" : "bg-gray-200"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
          enabled ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  )
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

function UploadIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function EyeButton({ show, toggle }: { show: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      onClick={toggle}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
    >
      {show ? (
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
      )}
    </button>
  )
}
