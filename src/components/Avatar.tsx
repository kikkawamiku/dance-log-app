"use client"

import { useState } from "react"
import Image from "next/image"
import { User } from "@/lib/types"

const COLORS = [
  "bg-rose-400",
  "bg-violet-400",
  "bg-sky-400",
  "bg-amber-400",
  "bg-emerald-400",
  "bg-orange-400",
  "bg-pink-400",
]

type Size = "sm" | "md" | "lg"

const SIZE_CLASSES: Record<Size, string> = {
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-14 h-14 text-xl",
}

const SIZE_PX: Record<Size, number> = {
  sm: 32,
  md: 40,
  lg: 56,
}

export default function Avatar({ user, size = "md" }: { user: User; size?: Size }) {
  const [imgError, setImgError] = useState(false)
  const color = COLORS[user.id.charCodeAt(user.id.length - 1) % COLORS.length]
  const sizeClass = SIZE_CLASSES[size]
  const px = SIZE_PX[size]

  if (user.avatarUrl && !imgError) {
    // data: URLs are legacy (old implementation stored base64) — skip to initials
    if (!user.avatarUrl.startsWith("data:")) {
      // blob: URLs are local previews; bypass next/image optimization
      if (user.avatarUrl.startsWith("blob:")) {
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt={user.name}
            className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
            onError={() => setImgError(true)}
          />
        )
      }
      return (
        <Image
          src={user.avatarUrl}
          alt={user.name}
          width={px}
          height={px}
          sizes={`${px}px`}
          className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
          onError={() => setImgError(true)}
        />
      )
    }
  }

  return (
    <div
      className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 select-none`}
    >
      {user.name.charAt(0)}
    </div>
  )
}
