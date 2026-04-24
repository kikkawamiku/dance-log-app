import { ProfileHeaderSkeleton, PostCardSkeletonList } from "@/components/Skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <div className="w-5 h-5 bg-gray-200 rounded-full animate-pulse" />
          <div className="h-4 w-28 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </header>
      <main className="max-w-md mx-auto">
        <ProfileHeaderSkeleton />
        <PostCardSkeletonList count={3} />
      </main>
    </div>
  )
}
