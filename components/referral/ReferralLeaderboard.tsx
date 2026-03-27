"use client"

import { useCallback, useEffect, useState } from "react"
import { Loader2, Trophy } from "lucide-react"
import type { LeaderboardSort, ReferralLeaderboardEntry } from "@/lib/referral"

interface ReferralLeaderboardProps {
  entries?: ReferralLeaderboardEntry[]
  initialSortBy?: LeaderboardSort
}

export function ReferralLeaderboard({
  entries: providedEntries,
  initialSortBy = "signups",
}: ReferralLeaderboardProps) {
  const [entries, setEntries] = useState<ReferralLeaderboardEntry[]>(providedEntries ?? [])
  const [loading, setLoading] = useState(!providedEntries)
  const [sortBy, setSortBy] = useState<LeaderboardSort>(initialSortBy)

  const fetchLeaderboard = useCallback(() => {
    if (providedEntries) return
    setLoading(true)
    fetch(`/api/referral/leaderboard?sortBy=${sortBy}&limit=25`)
      .then((response) => response.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.leaderboard)) setEntries(data.leaderboard)
        else setEntries([])
      })
      .catch(() => setEntries([]))
      .finally(() => setLoading(false))
  }, [providedEntries, sortBy])

  useEffect(() => {
    if (providedEntries) {
      setEntries(providedEntries)
      setLoading(false)
      return
    }
    fetchLeaderboard()
  }, [fetchLeaderboard, providedEntries])

  if (loading) {
    return (
      <div className="rounded-2xl border p-6 flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--muted)" }} />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)" }}>
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b p-4"
        style={{ borderColor: "var(--border)", background: "var(--panel2)" }}
      >
        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: "var(--text)" }}>
          <Trophy className="h-5 w-5" style={{ color: "var(--muted)" }} />
          Referral leaderboard
        </h2>
        {!providedEntries ? (
          <div className="flex gap-1">
            {(["signups", "clicks", "rewards", "onboarded"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSortBy(value)}
                className={`rounded-lg px-2 py-1 text-xs font-medium ${sortBy === value ? "opacity-100" : "opacity-60"}`}
                style={{
                  background: sortBy === value ? "var(--accent)" : "transparent",
                  color: sortBy === value ? "var(--bg)" : "var(--text)",
                  border: "1px solid var(--border)",
                }}
              >
                {value === "signups"
                  ? "Signups"
                  : value === "clicks"
                    ? "Clicks"
                    : value === "rewards"
                      ? "Rewards"
                      : "Onboarded"}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {entries.length === 0 ? (
        <div className="p-6 text-center text-sm" style={{ color: "var(--muted)" }}>
          No referral data yet. Share your code to be first on the board.
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
          {entries.map((entry) => (
            <li key={entry.userId} className="flex items-center gap-3 px-4 py-3">
              <span className="w-6 text-center text-sm font-bold" style={{ color: "var(--muted)" }}>
                {entry.rank}
              </span>
              <div
                className="h-9 w-9 shrink-0 overflow-hidden rounded-full flex items-center justify-center"
                style={{ background: "var(--panel2)" }}
              >
                {entry.avatarUrl ? (
                  <img src={entry.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>
                    {(entry.displayName || entry.username).slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block truncate font-medium" style={{ color: "var(--text)" }}>
                  {entry.displayName || entry.username}
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {entry.tier}
                  {entry.isCreator ? " • Creator" : ""}
                </span>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
                  {entry.signups} signups
                </p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {entry.onboarded} onboarded • {entry.redeemedRewards} claimed
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
