"use client"

import { useState } from "react"
import { Post } from "@/lib/types"
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

function formatDate(dateStr: string): string {
  const [, m, d] = dateStr.split("-")
  return `${parseInt(m)}/${parseInt(d)}`
}

function formatMinutes(mins: number): string {
  if (mins < 60) return `${mins}分`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}時間` : `${h}時間${m}分`
}

export default function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(post.isLiked)
  const [likeCount, setLikeCount] = useState(post.likes)
  const [liking, setLiking] = useState(false)
  const ytId = post.videoUrl ? getYouTubeId(post.videoUrl) : null

  async function toggleLike() {
    if (liking) return
    setLiking(true)
    try {
      // Optimistic update — separate calls avoid the Strict Mode double-invoke
      // bug that occurs when setLikeCount is nested inside setLiked's updater.
      const newLiked = !liked
      setLiked(newLiked)
      setLikeCount((c) => (newLiked ? c + 1 : c - 1))
      // TODO: persist to likes table
    } finally {
      setLiking(false)
    }
  }

  return (
    <article className="bg-white border-b border-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3">
        <Avatar user={post.user} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm leading-tight">{post.user.name}</p>
          <p className="text-gray-400 text-xs">@{post.user.username}</p>
        </div>
        <span className="text-gray-400 text-xs flex-shrink-0">
          {formatRelativeTime(post.createdAt)}
        </span>
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

      {/* Text */}
      {post.text && (
        <p className="px-4 pb-3 text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
          {post.text}
        </p>
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
          onClick={toggleLike}
          disabled={liking}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-50 ${
            liked
              ? "text-rose-500 bg-rose-50"
              : "text-gray-400 hover:bg-gray-50"
          }`}
        >
          <HeartIcon filled={liked} />
          <span>{likeCount}</span>
        </button>
      </div>
    </article>
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
