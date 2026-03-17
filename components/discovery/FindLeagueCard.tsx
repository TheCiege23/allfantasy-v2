"use client"

import Link from "next/link"
import { Calendar, User, Sparkles } from "lucide-react"
import type { DiscoveryCard } from "@/lib/public-discovery/types"

export interface FindLeagueCardProps {
  league: DiscoveryCard
}

function formatDraftDate(iso: string | null): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    return d.toLocaleDateString(undefined, { dateStyle: "medium" })
  } catch {
    return "—"
  }
}

export function FindLeagueCard({ league }: FindLeagueCardProps) {
  const isFull = league.maxMembers > 0 && league.memberCount >= league.maxMembers
  const leagueTypeLabel = league.leagueType === "bracket" ? "Bracket" : "Creator league"
  const draftTypeLabel = league.draftType ?? "—"

  return (
    <article
      className="rounded-xl border overflow-hidden flex flex-col h-full transition hover:opacity-95"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--panel) 60%, transparent)",
      }}
    >
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-semibold text-base truncate flex-1"
            style={{ color: "var(--text)" }}
          >
            {league.name}
          </h3>
          <span
            className="text-xs shrink-0 rounded px-2 py-0.5 capitalize"
            style={{ background: "var(--panel2)", color: "var(--muted)" }}
          >
            {leagueTypeLabel}
          </span>
        </div>
        <p className="text-sm truncate" style={{ color: "var(--muted)" }}>
          {league.sport}
          {league.tournamentName ? ` · ${league.tournamentName}` : ""}
          {league.season != null ? ` · ${league.season}` : ""}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: "var(--muted)" }}>
          <span>Draft type: {draftTypeLabel}</span>
          <span>
            Teams: {league.memberCount}
            {league.teamCount > 0 ? ` / ${league.teamCount}` : ""}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {formatDraftDate(league.draftDate)}
          </span>
          {league.commissionerName && (
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {league.commissionerName}
            </span>
          )}
        </div>
        {league.maxMembers > 0 && (
          <div className="mt-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--panel2)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, league.fillPct)}%`,
                background: isFull ? "var(--muted)" : "var(--accent)",
              }}
            />
          </div>
        )}
        {league.aiFeatures && league.aiFeatures.length > 0 && (
          <p className="text-xs flex items-center gap-1 mt-1" style={{ color: "var(--muted)" }}>
            <Sparkles className="h-3.5 w-3.5" />
            AI: {league.aiFeatures.join(", ")}
          </p>
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
        {/* Join URL is always set by the API; button only links when league is joinable (no dead join buttons). */}
        {isFull ? (
          <span
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: "var(--panel2)", color: "var(--muted)" }}
          >
            Full
          </span>
        ) : (
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
            Creator
          </Link>
        )}
      </div>
    </article>
  )
}
