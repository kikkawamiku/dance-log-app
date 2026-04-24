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

export default function Avatar({ user, size = "md" }: { user: User; size?: Size }) {
  const color = COLORS[user.id.charCodeAt(user.id.length - 1) % COLORS.length]
  const sizeClass = SIZE_CLASSES[size]

  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt={user.name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
        onError={(e) => {
          // Fall back to initials on broken URL
          const el = e.currentTarget
          el.style.display = "none"
          el.nextElementSibling?.removeAttribute("hidden")
        }}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} ${color} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 select-none`}
    >
      {user.name.charAt(0)}
    </div>
  )
}
