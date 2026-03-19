"use client"

import Link from "next/link"
import { Users, Sparkles, Zap } from "lucide-react"
import { trackDiscoveryJoinClick } from "@/lib/discovery-analytics/client"
import type { DiscoveryCard } from "@/lib/public-discovery/types"

export interface LeagueDiscoveryCardProps {
  league: DiscoveryCard
}

function isNew(createdAt: string): boolean {
  try {
    const d = new Date(createdAt)
    return Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export function LeagueDiscoveryCard({ league }: LeagueDiscoveryCardProps) {
  const isFull = league.maxMembers > 0 && league.memberCount >= league.maxMembers
  const fillingFast =
    !isFull && league.maxMembers > 0 && league.fillPct >= 50
  const showNew = isNew(league.createdAt)
  const hasAI = Array.isArray(league.aiFeatures) && league.aiFeatures.length > 0

  return (
    <article
      className="group rounded-2xl border overflow-hidden flex flex-col h-full transition-all duration-200 hover:border-[var(--accent)]/30 hover:shadow-lg"
      style={{
        borderColor: "var(--border)",
        background: "var(--panel)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-semibold text-base leading-tight truncate flex-1 min-w-0"
            style={{ color: "var(--text)" }}
          >
            {league.name}
          </h3>
        </div>

        {/* League badges */}
        <div className="flex flex-wrap gap-1.5">
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
            style={{
              background: "var(--panel2)",
              color: "var(--text)",
            }}
          >
            {league.sport}
          </span>
          <span
            className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium capitalize"
            style={{
              background: league.source === "bracket" ? "rgba(59, 130, 246, 0.15)" : "rgba(168, 85, 247, 0.15)",
              color: league.source === "bracket" ? "rgb(96, 165, 250)" : "rgb(216, 180, 254)",
            }}
          >
            {league.source === "bracket" ? "Bracket" : "Creator"}
          </span>
          {league.isPaid ? (
            <span
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
              style={{ background: "rgba(234, 179, 8, 0.15)", color: "rgb(250, 204, 21)" }}
            >
              Paid
            </span>
          ) : (
            <span
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
              style={{ background: "rgba(34, 197, 94, 0.12)", color: "rgb(74, 222, 128)" }}
            >
              Free
            </span>
          )}
          {fillingFast && (
            <span
              className="inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs font-medium"
              style={{ background: "rgba(34, 211, 238, 0.12)", color: "rgb(34, 211, 238)" }}
            >
              <Zap className="h-3 w-3" />
              Filling fast
            </span>
          )}
          {showNew && (
            <span
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
              style={{ background: "rgba(251, 146, 60, 0.15)", color: "rgb(251, 146, 60)" }}
            >
              New
            </span>
          )}
          {hasAI && (
            <span
              className="inline-flex items-center gap-0.5 rounded-md px-2 py-0.5 text-xs font-medium"
              style={{ background: "rgba(167, 139, 250, 0.15)", color: "rgb(196, 181, 253)" }}
            >
              <Sparkles className="h-3 w-3" />
              {league.aiFeatures.length <= 2
                ? league.aiFeatures.join(", ")
                : "AI-enabled"}
            </span>
          )}
          {league.inviteOnlyByTier && (
            <span
              className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
              title="Tier policy: you can browse leagues in your tier, one above, or one below. Other tiers require an invite code."
              aria-label="Invite only by tier policy"
              style={{ background: "rgba(251, 146, 60, 0.16)", color: "rgb(251, 146, 60)" }}
            >
              Invite only
            </span>
          )}
        </div>

        {/* Subtitle */}
        {league.tournamentName && (
          <p className="text-sm truncate" style={{ color: "var(--muted)" }}>
            {league.tournamentName}
            {league.season ? ` · ${league.season}` : ""}
          </p>
        )}
        {league.creatorName && league.source === "creator" && (
          <p className="text-sm truncate" style={{ color: "var(--muted)" }}>
            by {league.creatorName}
            {league.isCreatorVerified && (
              <span className="ml-1 inline-block text-[10px] opacity-80" title="Verified">
                ✓
              </span>
            )}
          </p>
        )}

        {/* Meta + progress */}
        <div className="flex items-center gap-2 text-xs mt-auto" style={{ color: "var(--muted)" }}>
          <Users className="h-3.5 w-3.5 shrink-0" />
          <span>
            {league.memberCount}
            {league.maxMembers > 0 ? ` / ${league.maxMembers}` : ""} spots
          </span>
        </div>
        {league.maxMembers > 0 && (
          <div
            className="h-1.5 rounded-full overflow-hidden"
            style={{ background: "var(--panel2)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.min(100, league.fillPct)}%`,
                background: isFull ? "var(--muted)" : "var(--accent)",
              }}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className="p-4 pt-0 flex flex-wrap items-center gap-2 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <Link
          href={league.detailUrl}
          className="rounded-lg border px-3 py-2.5 min-h-[44px] inline-flex items-center justify-center text-sm font-medium transition-colors hover:bg-white/5 touch-manipulation"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          View
        </Link>
        {!isFull && !league.inviteOnlyByTier ? (
          <Link
            href={league.joinUrl}
            className="min-h-[44px] inline-flex items-center justify-center touch-manipulation rounded-lg px-3 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
            onClick={() =>
              trackDiscoveryJoinClick({
                leagueId: league.id,
                source: league.source,
                leagueName: league.name,
                sport: league.sport,
                joinUrl: league.joinUrl,
              })
            }
            style={{ background: "var(--accent)", color: "var(--bg)" }}
          >
            Join
          </Link>
        ) : league.inviteOnlyByTier ? (
          <span
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: "rgba(251, 146, 60, 0.14)", color: "rgb(251, 146, 60)" }}
          >
            Invite code required
          </span>
        ) : (
          <span
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: "var(--panel2)", color: "var(--muted)" }}
          >
            Full
          </span>
        )}
        {league.creatorSlug && (
          <Link
            href={`/creators/${encodeURIComponent(league.creatorSlug)}`}
            className="text-sm font-medium ml-auto"
            style={{ color: "var(--accent)" }}
          >
            Creator
          </Link>
        )}
      </div>
    </article>
  )
}
