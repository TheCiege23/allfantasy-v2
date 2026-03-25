"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Trophy, Users, Loader2 } from "lucide-react"
import { VerifiedCreatorBadge } from "@/components/creator/VerifiedCreatorBadge"

type Creator = {
  userId: string
  handle: string
  displayName: string | null
  avatarUrl: string | null
  verified: boolean
  verificationBadge?: string | null
  leagueCount: number
  totalMembers: number
  rank: number
}

export default function CreatorsLeaderboardClient() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<"members" | "leagues">("members")

  useEffect(() => {
    setLoading(true)
    fetch(`/api/creators?limit=25&sort=${sort}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.creators)) setCreators(data.creators)
        else setCreators([])
      })
      .catch(() => setCreators([]))
      .finally(() => setLoading(false))
  }, [sort])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--muted)" }} />
      </div>
    )
  }

  if (creators.length === 0) {
    return (
      <div className="rounded-2xl border p-12 text-center" style={{ borderColor: "var(--border)" }}>
        <Trophy className="h-12 w-12 mx-auto mb-3" style={{ color: "var(--muted)" }} />
        <p className="font-medium" style={{ color: "var(--text)" }}>No creators yet</p>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Verified creator leagues will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-sm" style={{ color: "var(--muted)" }}>Sort by</span>
        <button
          type="button"
          onClick={() => setSort("members")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${sort === "members" ? "opacity-100" : "opacity-60"}`}
          style={{
            background: sort === "members" ? "var(--accent)" : "var(--panel)",
            color: sort === "members" ? "var(--bg)" : "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          Members
        </button>
        <button
          type="button"
          onClick={() => setSort("leagues")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${sort === "leagues" ? "opacity-100" : "opacity-60"}`}
          style={{
            background: sort === "leagues" ? "var(--accent)" : "var(--panel)",
            color: sort === "leagues" ? "var(--bg)" : "var(--text)",
            border: "1px solid var(--border)",
          }}
        >
          Leagues
        </button>
      </div>
      <ul className="rounded-xl border divide-y" style={{ borderColor: "var(--border)" }}>
        {creators.map((c) => (
          <li key={c.userId}>
            <Link
              href={`/creators/${encodeURIComponent(c.handle)}`}
              data-testid={`creator-leaderboard-profile-link-${c.handle}`}
              className="flex items-center gap-4 px-4 py-3 transition hover:opacity-90"
              style={{ color: "var(--text)" }}
            >
              <span className="w-8 text-center text-sm font-bold" style={{ color: "var(--muted)" }}>
                {c.rank}
              </span>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--panel2)" }}>
                {c.avatarUrl ? (
                  <img src={c.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-semibold" style={{ color: "var(--muted)" }}>
                    {(c.displayName || c.handle).slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{c.displayName || c.handle}</span>
                  {c.verified && (
                    <VerifiedCreatorBadge
                      handle={c.handle}
                      badge={c.verificationBadge}
                      showLabel={true}
                      linkToProfile={false}
                      size="sm"
                    />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                  <span className="inline-flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5" />
                    {c.leagueCount} league{c.leagueCount !== 1 ? "s" : ""}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {c.totalMembers} members
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
