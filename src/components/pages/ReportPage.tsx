"use client"

import { useState, useEffect, useRef } from "react"
import { Post } from "@/lib/types"
import { useCurrentUser } from "@/contexts/UserContext"
import { createClient } from "@/lib/supabase/client"
import { fetchUserPosts } from "@/lib/supabase/posts"

function getLast14Days(): { dateStr: string; label: string }[] {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return {
      dateStr: d.toISOString().split("T")[0],
      label: `${d.getMonth() + 1}/${d.getDate()}`,
    }
  })
}

function sumByDate(posts: Post[]): Record<string, number> {
  const acc: Record<string, number> = {}
  for (const p of posts) {
    if (p.practiceMinutes) {
      const dateKey = p.createdAt.slice(0, 10)
      acc[dateKey] = (acc[dateKey] ?? 0) + p.practiceMinutes
    }
  }
  return acc
}

interface Props {
  userPosts: Post[] // session-created posts (for immediate display)
}

export default function ReportPage({ userPosts }: Props) {
  const currentUser = useCurrentUser()
  const supabase = useRef(createClient()).current
  const [dbPosts, setDbPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserPosts(supabase, currentUser.id, currentUser.id)
      .then(setDbPosts)
      .catch((err: unknown) => console.error("[ReportPage] fetch error:", err))
      .finally(() => setLoading(false))
  }, [currentUser.id, supabase])

  // Merge: session posts first, then DB posts (dedup by id)
  const sessionIds = new Set(userPosts.map(p => p.id))
  const allPosts = [...userPosts, ...dbPosts.filter(p => !sessionIds.has(p.id))]

  const byDate = sumByDate(allPosts)
  const days = getLast14Days()
  const chartData = days.map((d) => ({ ...d, minutes: byDate[d.dateStr] ?? 0 }))
  const maxMinutes = Math.max(...chartData.map((d) => d.minutes), 1)
  const totalMinutes = Object.values(byDate).reduce((a, b) => a + b, 0)
  const totalDays = Object.keys(byDate).length
  const longestSession = Math.max(...allPosts.map((p) => p.practiceMinutes ?? 0), 0)
  const todayStr = new Date().toISOString().split("T")[0]

  return (
    <>
      <header className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-md mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900">レポート</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-24">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-rose-300 border-t-rose-500 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── Stats cards ── */}
            <div className="grid grid-cols-3 gap-3 px-4 pt-4 pb-2">
              <StatCard label="練習日数" value={totalDays} unit="日" color="text-rose-500" bg="bg-rose-50" />
              <StatCard label="累計時間" value={Math.floor(totalMinutes / 60)} unit="時間" color="text-violet-500" bg="bg-violet-50" />
              <StatCard label="最長セッション" value={longestSession} unit="分" color="text-sky-500" bg="bg-sky-50" />
            </div>

            {/* ── Bar chart ── */}
            <section className="bg-white mx-4 mt-3 rounded-2xl border border-gray-100 p-4">
              <h2 className="text-sm font-semibold text-gray-800 mb-4">直近14日間の練習時間</h2>

              <div className="flex items-end gap-1 h-28">
                {chartData.map((d, i) => {
                  const isToday = d.dateStr === todayStr
                  const height = d.minutes > 0 ? Math.max((d.minutes / maxMinutes) * 100, 6) : 0
                  return (
                    <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                      <div className="w-full flex flex-col justify-end" style={{ height: "96px" }}>
                        {d.minutes > 0 ? (
                          <div
                            className={`w-full rounded-t-sm transition-all ${isToday ? "bg-rose-500" : "bg-rose-300"}`}
                            style={{ height: `${height}%` }}
                            title={`${d.minutes}分`}
                          />
                        ) : (
                          <div className="w-full h-1 bg-gray-100 rounded-sm" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center gap-1 mt-1">
                {chartData.map((d, i) => (
                  <div key={i} className="flex-1 min-w-0 text-center">
                    {i % 2 === 0 && (
                      <span className={`text-[9px] ${d.dateStr === todayStr ? "text-rose-500 font-bold" : "text-gray-400"}`}>
                        {d.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-3">
                <LegendDot color="bg-rose-500" label="今日" />
                <LegendDot color="bg-rose-300" label="過去" />
              </div>
            </section>

            {/* ── Practice log list ── */}
            <section className="mx-4 mt-3 rounded-2xl border border-gray-100 overflow-hidden">
              <div className="bg-white px-4 py-3 border-b border-gray-50">
                <h2 className="text-sm font-semibold text-gray-800">練習ログ</h2>
              </div>
              {allPosts.filter((p) => p.practiceMinutes).length === 0 ? (
                <div className="bg-white px-4 py-8 text-center text-gray-400 text-sm">
                  練習時間を記録した投稿がありません
                </div>
              ) : (
                allPosts
                  .filter((p) => p.practiceMinutes)
                  .slice(0, 10)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="bg-white px-4 py-3 border-b border-gray-50 flex items-center justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 line-clamp-1">{p.text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {p.createdAt.slice(0, 10).replace(/-/g, "/")}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-violet-600 bg-violet-50 px-2 py-1 rounded-full ml-2 flex-shrink-0">
                        {p.practiceMinutes}分
                      </span>
                    </div>
                  ))
              )}
            </section>

            <div className="h-4" />
          </>
        )}
      </main>
    </>
  )
}

function StatCard({ label, value, unit, color, bg }: {
  label: string; value: number; unit: string; color: string; bg: string
}) {
  return (
    <div className={`${bg} rounded-2xl p-3 text-center`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-gray-400 text-[10px] mt-0.5">{unit}</p>
      <p className="text-gray-600 text-[10px] font-medium">{label}</p>
    </div>
  )
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  )
}
