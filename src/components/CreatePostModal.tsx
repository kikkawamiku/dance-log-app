"use client"

import { useState, useRef, useEffect, ChangeEvent } from "react"
import { Post, User } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { createPost } from "@/lib/supabase/posts"
import { uploadPostImage, StorageError } from "@/lib/supabase/storage"
import Avatar from "./Avatar"

interface MediaFile {
  file: File
  preview: string  // object URL for immediate display
  type: "image" | "video"
}

interface Props {
  currentUser: User
  onClose: () => void
  onSubmit: (post: Post) => void
}

export default function CreatePostModal({ currentUser, onClose, onSubmit }: Props) {
  const [text, setText] = useState("")
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([])
  const [url, setUrl] = useState("")
  const [practiceMinutes, setPracticeMinutes] = useState("")
  const [showDetails, setShowDetails] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)

  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Revoke object URLs on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      mediaFiles.forEach((f) => URL.revokeObjectURL(f.preview))
    }
  }, [mediaFiles])

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    // Spec: 1 image; accept only the first image file, skip videos for now
    const imageFiles = files.filter((f) => f.type.startsWith("image/")).slice(0, 1)
    const newEntries: MediaFile[] = imageFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      type: "image",
    }))
    // Replace existing selection (1 image max)
    setMediaFiles(newEntries)
    e.target.value = ""
  }

  function removeMedia(index: number) {
    setMediaFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit() {
    if (!text.trim() && mediaFiles.length === 0) return
    setSubmitting(true)
    setUploadStatus(null)

    try {
      // 1. Upload image to Supabase Storage (if any)
      let imageUrl: string | undefined
      if (mediaFiles.length > 0 && mediaFiles[0].type === "image") {
        setUploadStatus("画像をアップロード中…")
        imageUrl = await uploadPostImage(supabase, currentUser.id, mediaFiles[0].file)
      }

      // 2. Insert post record
      setUploadStatus("投稿を保存中…")
      const post = await createPost(supabase, currentUser.id, {
        text: text.trim(),
        imageUrl,
        videoUrl: url.trim() || undefined,
        practiceMinutes: practiceMinutes ? parseInt(practiceMinutes) : undefined,
      })

      onSubmit(post)
      onClose()
    } catch (err) {
      console.error("[CreatePostModal] handleSubmit error:", err)

      let msg: string
      if (err instanceof StorageError) {
        msg = `画像のアップロードに失敗しました: ${err.message}`
      } else if (err instanceof Error) {
        if (err.message.includes("violates row-level security") || err.message.includes("RLS")) {
          msg = "投稿の保存が拒否されました（RLSポリシーを確認してください）"
        } else if (err.message.includes("network") || err.message.includes("fetch")) {
          msg = "ネットワークエラーが発生しました。接続を確認して再試行してください。"
        } else {
          msg = `投稿に失敗しました: ${err.message}`
        }
      } else {
        msg = "投稿に失敗しました。もう一度お試しください。"
      }

      setUploadStatus(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = !submitting && (text.trim().length > 0 || mediaFiles.length > 0)

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={onClose} className="p-1 text-gray-500">
          <XIcon />
        </button>
        <h2 className="font-semibold text-gray-900 text-sm">練習を記録する</h2>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="bg-rose-500 disabled:bg-rose-200 text-white text-sm font-bold px-5 py-2 rounded-full transition-colors"
        >
          {submitting ? "投稿中…" : "投稿する"}
        </button>
      </div>

      {/* Upload status / error banner */}
      {uploadStatus && (
        <div className={`px-4 py-2 text-xs text-center ${
          uploadStatus.includes("失敗") ? "bg-red-50 text-red-600" : "bg-rose-50 text-rose-600"
        }`}>
          {uploadStatus}
        </div>
      )}

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">

        {/* Text area */}
        <div className="flex gap-3 px-4 pt-4 pb-3">
          <Avatar user={currentUser} />
          <textarea
            className="flex-1 text-gray-900 text-sm leading-relaxed resize-none outline-none placeholder-gray-300 min-h-[120px]"
            placeholder="コメントを入力..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
          />
        </div>

        {/* ── Media preview ── */}
        {mediaFiles.length > 0 && (
          <div className={`px-4 pb-3 grid gap-1 ${
            mediaFiles.length === 1 ? "grid-cols-1" : "grid-cols-3"
          }`}>
            {mediaFiles.map((file, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-gray-100">
                {file.type === "video" ? (
                  <video
                    src={file.preview}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.preview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
                <button
                  onClick={() => removeMedia(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                {file.type === "video" && (
                  <div className="absolute bottom-1 left-1 bg-black/50 rounded px-1 py-0.5">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Media add button ── */}
        <div className="px-4 pb-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 w-full border border-dashed border-gray-200 rounded-xl px-4 py-3 text-gray-500 text-sm hover:border-rose-300 hover:text-rose-400 transition-colors"
          >
            <MediaIcon />
            {mediaFiles.length > 0 ? "さらに追加（最大9枚）" : "写真・動画を追加"}
          </button>
        </div>

        <Divider />

        {/* ── URL ── */}
        <div className="px-4 py-3">
          <label className="flex items-center gap-2 text-gray-500 text-sm font-medium mb-2">
            <LinkIcon />
            YouTubeなどのURL
          </label>
          <input
            type="url"
            placeholder="https://youtube.com/watch?v=..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-rose-400"
          />
        </div>

        <Divider />

        {/* ── Practice details (collapsible) ── */}
        <button
          onClick={() => setShowDetails((v) => !v)}
          className="flex items-center justify-between w-full px-4 py-3"
        >
          <span className="flex items-center gap-2 text-gray-500 text-sm font-medium">
            <CalendarIcon />
            練習詳細を追加
          </span>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${showDetails ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showDetails && (
          <div className="px-4 pb-4">
            <label className="block text-xs font-medium text-gray-500 mb-1">練習時間（分）</label>
            <input
              type="number"
              min="1"
              max="999"
              placeholder="例：60"
              value={practiceMinutes}
              onChange={(e) => setPracticeMinutes(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-rose-400"
            />
          </div>
        )}

        <div className="h-8" />
      </div>
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-gray-100 mx-4" />
}

function XIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

function MediaIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
