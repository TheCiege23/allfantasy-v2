"use client"

import Link from "next/link"
import { Trophy } from "lucide-react"

type LeagueCard = {
  id: string
  name: string
  joinCode: string
  joinUrl: string
  tournamentName: string
  season: number
  sport: string
  memberCount: number
  maxManagers: number
  isPrivate: boolean
  scoringMode: string
}

export default function CreatorLeaguesClient({
  initialLeagues,
  creatorHandle,
}: {
  initialLeagues: LeagueCard[]
  creatorHandle: string
}) {
  if (initialLeagues.length === 0) {
    return (
      <div className="rounded-xl border p-8 text-center" style={{ borderColor: "var(--border)" }}>
        <Trophy className="h-10 w-10 mx-auto mb-2" style={{ color: "var(--muted)" }} />
        <p className="text-sm" style={{ color: "var(--muted)" }}>No public leagues yet.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-3">
      {initialLeagues.map((league) => (
        <li
          key={league.id}
          className="rounded-xl border p-4 flex items-center justify-between gap-4"
          style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel) 50%, transparent)" }}
        >
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold truncate" style={{ color: "var(--text)" }}>{league.name}</h3>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {league.tournamentName}
              {league.season ? ` · ${league.season}` : ""} · {league.sport}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
              {league.memberCount} / {league.maxManagers} members
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`/brackets/leagues/${league.id}`}
              className="rounded-lg border px-3 py-1.5 text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--text)" }}
            >
              View
            </Link>
            <a
              href={league.joinUrl}
              className="rounded-lg px-3 py-1.5 text-sm font-medium"
              style={{ background: "var(--accent)", color: "var(--bg)" }}
            >
              Join league
            </a>
          </div>
        </li>
      ))}
    </ul>
  )
}
