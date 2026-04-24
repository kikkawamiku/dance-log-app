"use client"

import { useEffect, useRef, useCallback } from "react"

export function useInfiniteScroll(onLoadMore: () => void, hasMore: boolean) {
  const observerRef = useRef<IntersectionObserver | null>(null)

  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      if (observerRef.current) observerRef.current.disconnect()
      if (!node || !hasMore) return

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) onLoadMore()
        },
        { rootMargin: "200px" }
      )
      observerRef.current.observe(node)
    },
    [onLoadMore, hasMore]
  )

  useEffect(() => {
    return () => observerRef.current?.disconnect()
  }, [])

  return sentinelRef
}
