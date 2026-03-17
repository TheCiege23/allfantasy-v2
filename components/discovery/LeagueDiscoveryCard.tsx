"use client"

import Link from "next/link"
import { Users, Trophy } from "lucide-react"
import type { DiscoveryCard } from "@/lib/public-discovery/types"

export interface LeagueDiscoveryCardProps {
  league: DiscoveryCard
}

export function LeagueDiscoveryCard({ league }: LeagueDiscoveryCardProps) {
  const isFull = league.maxMembers > 0 && league.memberCount >= league.maxMembers

  return (
    <article
      className="rounded-xl border overflow-hidden flex flex-col h-full transition hover:opacity-95"
      style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel) 60%, transparent)" }}
    >
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-base truncate flex-1" style={{ color: "var(--text)" }}>
            {league.name}
          </h3>
          {league.source === "creator" && (
            <span className="text-xs shrink-0 rounded px-2 py-0.5" style={{ background: "var(--panel2)", color: "var(--muted)" }}>
              Creator
            </span>
          )}
        </div>
        {league.tournamentName && (
          <p className="text-sm mt-0.5 truncate" style={{ color: "var(--muted)" }}>
            {league.tournamentName}
            {league.season ? ` · ${league.season}` : ""}
          </p>
        )}
        {league.creatorName && league.source === "creator" && (
          <p className="text-sm mt-0.5 truncate" style={{ color: "var(--muted)" }}>
            by {league.creatorName}
          </p>
        )}
        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "var(--muted)" }}>
          <Users className="h-3.5 w-3.5" />
          {league.memberCount}
          {league.maxMembers > 0 ? ` / ${league.maxMembers}` : ""} · {league.sport}
        </p>
        {league.maxMembers > 0 && (
          <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--panel2)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, league.fillPct)}%`,
                background: isFull ? "var(--muted)" : "var(--accent)",
              }}
            />
          </div>
        )}
      </div>
      <div className="p-4 pt-0 flex flex-wrap items-center gap-2">
        <Link
          href={league.detailUrl}
          className="rounded-lg border px-3 py-2 text-sm font-medium"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          View
        </Link>
        {!isFull && (
          <Link
            href={league.joinUrl}
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            Join
          </Link>
        )}
        {league.creatorSlug && (
          <Link
            href={`/creators/${encodeURIComponent(league.creatorSlug)}`}
            className="text-sm font-medium"
            style={{ color: "var(--accent)" }}
          >
            Creator profile
          </Link>
        )}
      </div>
    </article>
  )
}
