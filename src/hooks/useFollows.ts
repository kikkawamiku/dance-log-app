"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"

export function useFollows(currentUserId: string) {
  const supabase = useRef(createClient()).current
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [followVersion, setFollowVersion] = useState(0)

  useEffect(() => {
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentUserId)
      .then((result: { data: { following_id: string }[] | null; error: { message: string } | null }) => {
        if (result.error) {
          console.error("[useFollows] fetch error:", result.error)
          return
        }
        setFollowing(new Set(result.data?.map(r => r.following_id) ?? []))
      })
  }, [currentUserId, supabase])

  const toggleFollow = useCallback(async (userId: string) => {
    const wasFollowing = following.has(userId)

    // Optimistic update
    setFollowing(prev => {
      const next = new Set(prev)
      wasFollowing ? next.delete(userId) : next.add(userId)
      return next
    })
    setFollowVersion(v => v + 1)

    if (wasFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", userId)
      if (error) {
        console.error("[useFollows] unfollow error:", error)
        setFollowing(prev => new Set([...prev, userId]))
        setFollowVersion(v => v - 1)
      }
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({ follower_id: currentUserId, following_id: userId })
      if (error) {
        console.error("[useFollows] follow error:", error)
        setFollowing(prev => { const s = new Set(prev); s.delete(userId); return s })
        setFollowVersion(v => v - 1)
      }
    }
  }, [following, currentUserId, supabase])

  return { following, followVersion, toggleFollow }
}
