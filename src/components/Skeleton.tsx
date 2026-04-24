// Reusable skeleton building blocks — all animate-pulse

function Bone({
  className,
  style,
}: {
  className: string
  style?: React.CSSProperties
}) {
  return (
    <div
      className={`bg-gray-200 animate-pulse rounded ${className}`}
      style={style}
    />
  )
}

// ── PostCard skeleton ─────────────────────────────────────────

export function PostCardSkeleton() {
  return (
    <div className="bg-white border-b border-gray-100 px-4 pt-4 pb-4">
      {/* Header row */}
      <div className="flex items-center gap-3 pb-3">
        <Bone className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Bone className="h-3.5 w-28 rounded-full" />
          <Bone className="h-3 w-20 rounded-full" />
        </div>
        <Bone className="h-3 w-10 rounded-full" />
      </div>

      {/* Text lines */}
      <div className="space-y-2 pb-3">
        <Bone className="h-3.5 w-full rounded-full" />
        <Bone className="h-3.5 w-5/6 rounded-full" />
        <Bone className="h-3.5 w-2/3 rounded-full" />
      </div>

      {/* Like button placeholder */}
      <Bone className="h-8 w-14 rounded-full" />
    </div>
  )
}

export function PostCardSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <PostCardSkeleton key={i} />
      ))}
    </>
  )
}

// ── Profile header skeleton ───────────────────────────────────

export function ProfileHeaderSkeleton() {
  return (
    <div className="bg-white px-4 py-8 flex flex-col items-center gap-3 border-b border-gray-100">
      <Bone className="w-14 h-14 rounded-full" />
      <div className="flex flex-col items-center gap-2 w-full">
        <Bone className="h-5 w-36 rounded-full" />
        <Bone className="h-3.5 w-24 rounded-full" />
        <Bone className="h-3 w-48 rounded-full mt-1" />
        <Bone className="h-3 w-40 rounded-full" />
      </div>
      <div className="flex gap-10 pt-1">
        <div className="flex flex-col items-center gap-1">
          <Bone className="h-5 w-8 rounded-full" />
          <Bone className="h-3 w-6 rounded-full" />
        </div>
      </div>
      <Bone className="h-8 w-36 rounded-full mt-1" />
    </div>
  )
}

// ── Report skeleton ───────────────────────────────────────────

const BAR_HEIGHTS = [
  "35%", "65%", "45%", "80%", "55%",
  "70%", "30%", "90%", "50%", "60%",
  "40%", "75%", "55%", "85%",
]

export function ReportSkeleton() {
  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 px-4 pt-4 pb-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-gray-50 rounded-2xl p-3 flex flex-col items-center gap-2">
            <Bone className="h-7 w-10 rounded-full" />
            <Bone className="h-2.5 w-6 rounded-full" />
            <Bone className="h-2.5 w-14 rounded-full" />
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="bg-white mx-4 mt-3 rounded-2xl border border-gray-100 p-4">
        <Bone className="h-4 w-40 rounded-full mb-4" />
        <div className="flex items-end gap-1" style={{ height: "96px" }}>
          {BAR_HEIGHTS.map((h, i) => (
            <Bone
              key={i}
              className="flex-1 rounded-t-sm"
              style={{ height: h }}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <Bone className="h-2.5 w-12 rounded-full" />
          <Bone className="h-2.5 w-10 rounded-full" />
        </div>
      </div>

      {/* Practice log */}
      <div className="mx-4 mt-3 rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-white px-4 py-3 border-b border-gray-50">
          <Bone className="h-4 w-20 rounded-full" />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-white px-4 py-3 border-b border-gray-50 flex items-center justify-between"
          >
            <div className="flex-1 space-y-1.5">
              <Bone className="h-3.5 w-3/4 rounded-full" />
              <Bone className="h-3 w-24 rounded-full" />
            </div>
            <Bone className="h-7 w-12 rounded-full ml-2 flex-shrink-0" />
          </div>
        ))}
      </div>
    </>
  )
}
