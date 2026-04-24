"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { Post } from "@/lib/types"
import { useUser } from "@/contexts/UserContext"
import { createClient } from "@/lib/supabase/client"
import { updatePost, deletePost, toggleLike as persistLike } from "@/lib/supabase/posts"
import Avatar from "./Avatar"

function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?/]+)/,
    /youtube\.com\/embed\/([^?]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}分前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}時間前`
  const days = Math.floor(hours / 24)
  return `${days}日前`
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}分`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}時間` : `${h}時間${m}分`
}

export default function PostCard({ post }: { post: Post }) {
  const { user: currentUser } = useUser()
  const supabase = useRef(createClient()).current
  const isOwner = currentUser?.id === post.user.id

  // Like state
  const [liked, setLiked] = useState(post.isLiked)
  const [likeCount, setLikeCount] = useState(post.likes)
  const [liking, setLiking] = useState(false)

  // Menu / edit / delete state
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(post.text)
  const [currentText, setCurrentText] = useState(post.text)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleted, setDeleted] = useState(false)

  const ytId = post.videoUrl ? getYouTubeId(post.videoUrl) : null

  async function handleLike() {
    if (liking || !currentUser) return
    setLiking(true)
    const wasLiked = liked
    const newLiked = !wasLiked
    // Optimistic update
    setLiked(newLiked)
    setLikeCount((c) => (newLiked ? c + 1 : c - 1))
    try {
      await persistLike(supabase, currentUser.id, post.id, wasLiked)
    } catch (err) {
      console.error("[PostCard] toggleLike error:", err)
      // Rollback
      setLiked(wasLiked)
      setLikeCount((c) => (newLiked ? c - 1 : c + 1))
    } finally {
      setLiking(false)
    }
  }

  async function handleSaveEdit() {
    if (saving || !editText.trim()) return
    setSaving(true)
    try {
      await updatePost(supabase, post.id, currentUser!.id, editText.trim())
      setCurrentText(editText.trim())
      setEditing(false)
    } catch (err) {
      console.error("[PostCard] update error:", err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (deleting) return
    setDeleting(true)
    try {
      await deletePost(supabase, post.id, currentUser!.id)
      setDeleted(true)
    } catch (err) {
      console.error("[PostCard] delete error:", err)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  if (deleted) return null

  return (
    <article className="relative bg-white border-b border-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Link href={`/profile/${post.user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar user={post.user} />
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-tight">{post.user.name}</p>
            <p className="text-gray-400 text-xs">@{post.user.username}</p>
          </div>
        </Link>

        <span className="text-gray-400 text-xs flex-shrink-0">
          {formatRelativeTime(post.createdAt)}
        </span>

        {/* "..." menu — own posts only */}
        {isOwner && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50"
            >
              <DotsIcon />
            </button>

            {menuOpen && (
              <>
                {/* click-outside backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-7 z-20 w-28 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      setEditText(currentText)
                      setEditing(true)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    編集
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false)
                      setConfirmDelete(true)
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Metadata badges */}
      {(post.practiceMinutes || post.genre) && (
        <div className="flex gap-2 px-4 pb-3">
          {post.genre && (
            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 text-xs font-medium px-2.5 py-1 rounded-full">
              {post.genre}
            </span>
          )}
          {post.practiceMinutes && (
            <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-600 text-xs font-medium px-2.5 py-1 rounded-full">
              <ClockIcon />
              {formatMinutes(post.practiceMinutes)}
            </span>
          )}
        </div>
      )}

      {/* Text — edit mode or display mode */}
      {editing ? (
        <div className="px-4 pb-3">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 leading-relaxed resize-none outline-none focus:border-rose-300"
            autoFocus
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button
              onClick={() => { setEditing(false); setEditText(currentText) }}
              className="text-xs text-gray-400 px-3 py-1.5 rounded-full border border-gray-200"
            >
              キャンセル
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving || !editText.trim()}
              className="text-xs font-semibold text-white bg-rose-500 px-4 py-1.5 rounded-full disabled:opacity-50"
            >
              {saving ? "保存中..." : "保存"}
            </button>
          </div>
        </div>
      ) : (
        currentText && (
          <p className="px-4 pb-3 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
            {currentText}
          </p>
        )
      )}

      {/* Uploaded media grid */}
      {post.mediaUrls && post.mediaUrls.length > 0 && (
        <div className={`pb-3 grid gap-0.5 ${post.mediaUrls.length === 1 ? "grid-cols-1" : "grid-cols-3"}`}>
          {post.mediaUrls.map((url, i) =>
            url.startsWith("data:video") || url.startsWith("blob:") ? (
              <video
                key={i}
                src={url}
                controls
                playsInline
                className={`w-full object-cover bg-gray-100 ${post.mediaUrls!.length === 1 ? "max-h-96" : "aspect-square"}`}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={url}
                alt=""
                className={`w-full object-cover bg-gray-100 ${post.mediaUrls!.length === 1 ? "max-h-96" : "aspect-square"}`}
              />
            )
          )}
        </div>
      )}

      {/* External video (YouTube etc.) */}
      {post.videoUrl && (
        <div className="px-4 pb-3">
          {ytId ? (
            <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: "56.25%" }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${ytId}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="練習動画"
              />
            </div>
          ) : (
            <a
              href={post.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-rose-500 text-sm underline underline-offset-2"
            >
              <VideoIcon />
              動画を見る
            </a>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 pb-4">
        <button
          onClick={handleLike}
          disabled={liking}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${
            liked ? "text-rose-500 bg-rose-50" : "text-gray-400 hover:bg-gray-50"
          }`}
        >
          <HeartIcon filled={liked} />
          <span>{likeCount}</span>
        </button>
      </div>

      {/* Delete confirmation overlay */}
      {confirmDelete && (
        <div className="absolute inset-0 z-30 bg-white/95 flex flex-col items-center justify-center gap-4 rounded-none">
          <p className="text-sm font-semibold text-gray-800">この投稿を削除しますか？</p>
          <p className="text-xs text-gray-400">削除すると元に戻せません</p>
          <div className="flex gap-3">
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-gray-500 border border-gray-200 px-5 py-2 rounded-full"
            >
              キャンセル
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-xs font-semibold text-white bg-red-500 px-5 py-2 rounded-full disabled:opacity-50"
            >
              {deleting ? "削除中..." : "削除する"}
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function DotsIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="5" cy="12" r="2" />
      <circle cx="12" cy="12" r="2" />
      <circle cx="19" cy="12" r="2" />
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}

function HeartIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}
