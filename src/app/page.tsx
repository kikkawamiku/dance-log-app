"use client"

import { useState } from "react"
import { Post } from "@/lib/types"
import { useCurrentUser, useUser } from "@/contexts/UserContext"
import { useFollows } from "@/hooks/useFollows"
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
  const { following, followVersion, toggleFollow } = useFollows(user.id)

  function handleNewPost(post: Post) {
    setNewPosts((prev) => [post, ...prev])
    setTab("feed")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {tab === "feed" && (
        <FeedPage newPosts={newPosts} onOpenCreate={() => setShowCreate(true)} followVersion={followVersion} />
      )}

      {tab === "report" && <ReportPage userPosts={newPosts} />}

      {tab === "search" && (
        <SearchPage following={following} onToggleFollow={toggleFollow} />
      )}

      {tab === "profile" && (
        <ProfilePage
          newPosts={newPosts}
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
