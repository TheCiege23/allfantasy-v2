/**
 * Phase 6F — DiscoveryRail (UI).
 *
 * Horizontal-scroll rail of `RecommendedLeagueCard`s with a sticky
 * header. Mobile-first: snaps on touch devices, never overflows the
 * viewport, falls back to grid on >= md screens for desktop tidiness.
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import type { DiscoveryRail as DiscoveryRailDTO } from "@/lib/matchmaking"
import { RecommendedLeagueCard, RecommendedLeagueCardSkeleton } from "./RecommendedLeagueCard"

export function DiscoveryRail({
  rail,
  className,
  buildHref,
}: {
  rail: DiscoveryRailDTO
  className?: string
  /** Optional builder for the league join/detail URL. */
  buildHref?: (leagueId: string) => string
}) {
  if (rail.items.length === 0) return null
  return (
    <section
      data-testid={`discovery-rail-${rail.kind}`}
      className={cn("w-full", className)}
      aria-labelledby={`rail-${rail.kind}-title`}
    >
      <header className="px-1 mb-2 sm:mb-3">
        <h2
          id={`rail-${rail.kind}-title`}
          className="text-base sm:text-lg font-bold tracking-tight"
          style={{ color: "var(--text)" }}
        >
          {rail.title}
        </h2>
        <p className="text-[11px] sm:text-xs font-medium" style={{ color: "var(--muted2)" }}>
          {rail.description}
        </p>
      </header>

      {/* Mobile: horizontal snap. Desktop (md+): grid. */}
      <div
        className={cn(
          "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1",
          "md:grid md:grid-cols-2 md:overflow-visible md:snap-none md:mx-0 md:px-0 md:pb-0",
          "lg:grid-cols-3"
        )}
      >
        {rail.items.map((rec) => (
          <div
            key={rec.league.leagueId}
            className="min-w-[85%] max-w-[85%] sm:min-w-[60%] sm:max-w-[60%] md:min-w-0 md:max-w-none snap-start"
          >
            <RecommendedLeagueCard
              rec={rec}
              href={buildHref ? buildHref(rec.league.leagueId) : undefined}
            />
          </div>
        ))}
      </div>
    </section>
  )
}

export function DiscoveryRailSkeleton({ className }: { className?: string }) {
  return (
    <section
      className={cn("w-full", className)}
      aria-busy
      aria-live="polite"
    >
      <div className="px-1 mb-2 sm:mb-3 space-y-1">
        <div className="h-4 w-40 rounded bg-[color:var(--subtle-bg)]" />
        <div className="h-3 w-64 rounded bg-[color:var(--subtle-bg)]" />
      </div>
      <div className="flex gap-3 overflow-hidden pb-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="min-w-[85%] sm:min-w-[60%] md:min-w-[33%]">
            <RecommendedLeagueCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  )
}
