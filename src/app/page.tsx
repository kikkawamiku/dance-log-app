"use client"

import { useState } from "react"
import { Post } from "@/lib/types"
import { followingIds as initialFollowingIds } from "@/lib/mockData"
import { useCurrentUser, useUser } from "@/contexts/UserContext"
import AuthGate from "@/components/AuthGate"
import BottomNav, { Tab } from "@/components/BottomNav"
import CreatePostModal from "@/components/CreatePostModal"
import EditProfileModal from "@/components/EditProfileModal"
import FeedPage from "@/components/pages/FeedPage"
import ReportPage from "@/components/pages/ReportPage"
import SearchPage from "@/components/pages/SearchPage"
import ProfilePage from "@/components/pages/ProfilePage"

// Home is the entry point — delegates all auth logic to AuthGate.
export default function Home() {
  return (
    <AuthGate>
      <AppContent />
    </AuthGate>
  )
}

/**
 * AppContent mounts ONLY after AuthGate confirms both session and user profile
 * are loaded. useCurrentUser() is therefore always safe to call here.
 */
function AppContent() {
  const user = useCurrentUser()   // non-null guaranteed by AuthGate
  const { signOut } = useUser()

  const [tab, setTab] = useState<Tab>("feed")
  const [showCreate, setShowCreate] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [newPosts, setNewPosts] = useState<Post[]>([])
  const [following, setFollowing] = useState<Set<string>>(new Set(initialFollowingIds))

  function handleNewPost(post: Post) {
    setNewPosts((prev) => [post, ...prev])
    setTab("feed")
  }

  function toggleFollow(userId: string) {
    setFollowing((prev) => {
      const next = new Set(prev)
      next.has(userId) ? next.delete(userId) : next.add(userId)
      return next
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {tab === "feed" && (
        <FeedPage newPosts={newPosts} onOpenCreate={() => setShowCreate(true)} />
      )}

      {tab === "report" && <ReportPage userPosts={newPosts} />}

      {tab === "search" && (
        <SearchPage following={following} onToggleFollow={toggleFollow} />
      )}

      {tab === "profile" && (
        <ProfilePage
          userPosts={newPosts}
          following={following}
          onOpenEdit={() => setShowEdit(true)}
          onSignOut={signOut}
        />
      )}

      <BottomNav active={tab} onChange={setTab} />

      {showCreate && (
        <CreatePostModal
          currentUser={user}
          onClose={() => setShowCreate(false)}
          onSubmit={handleNewPost}
        />
      )}

      {showEdit && <EditProfileModal onClose={() => setShowEdit(false)} />}
    </div>
  )
}
