"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, Trophy } from "lucide-react"

interface LeaderboardEntry {
  rank: number
  userId: string
  displayName: string | null
  username: string
  avatarUrl: string | null
  isCreator: boolean
  signups: number
  clicks: number
  redeemedRewards: number
  tier: string
}

export function ReferralLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<"signups" | "clicks" | "rewards">("signups")

  const fetchLeaderboard = useCallback(() => {
    setLoading(true)
    fetch(`/api/referral/leaderboard?sortBy=${sortBy}&limit=25`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && Array.isArray(d.leaderboard)) setEntries(d.leaderboard)
        else setEntries([])
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [sortBy])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  if (loading) {
    return (
      <div className="rounded-xl border p-6 flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--muted)" }} />
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: "var(--border)" }}>
      <div className="flex items-center justify-between gap-2 p-4 border-b" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <Trophy className="h-5 w-5" style={{ color: "var(--muted)" }} />
          Referral leaderboard
        </h2>
        <div className="flex gap-1">
          {(["signups", "clicks", "rewards"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSortBy(s)}
              className={`rounded-lg px-2 py-1 text-xs font-medium ${sortBy === s ? "opacity-100" : "opacity-60"}`}
              style={{
                background: sortBy === s ? "var(--accent)" : "transparent",
                color: sortBy === s ? "var(--bg)" : "var(--text)",
                border: "1px solid var(--border)",
              }}
            >
              {s === "signups" ? "Signups" : s === "clicks" ? "Clicks" : "Rewards"}
            </button>
          ))}
        </div>
      </div>
      {entries.length === 0 ? (
        <div className="p-6 text-center text-sm" style={{ color: "var(--muted)" }}>
          No referrals yet. Be the first to share your link!
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
          {entries.map((e) => (
            <li
              key={e.userId}
              className="flex items-center gap-3 px-4 py-3"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="w-6 text-center text-sm font-bold" style={{ color: "var(--muted)" }}>
                {e.rank}
              </span>
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 overflow-hidden" style={{ background: "var(--panel2)" }}>
                {e.avatarUrl ? (
                  <img src={e.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                    {(e.displayName || e.username).slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-medium truncate block" style={{ color: "var(--text)" }}>
                  {e.displayName || e.username}
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {e.tier}
                  {e.isCreator ? " · Creator" : ""}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {sortBy === "signups" ? e.signups : sortBy === "clicks" ? e.clicks : e.redeemedRewards}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
