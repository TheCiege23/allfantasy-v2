"use client"

import type { WorldCupScoringValues } from "@/lib/world-cup/types"
import { buildWorldCupRoundBreakdownRows } from "@/lib/world-cup/worldCupLeaderboardService"

export default function WorldCupRoundBreakdown({
  roundBreakdown,
  scoring,
  includeThirdPlace,
}: {
  roundBreakdown: Record<string, number>
  scoring: WorldCupScoringValues
  includeThirdPlace: boolean
}) {
  const rows = buildWorldCupRoundBreakdownRows(roundBreakdown, scoring, {
    includeThirdPlace,
  })
  const bonus = scoring.championBonusPoints ?? 0

  return (
    <div
      data-testid="world-cup-round-breakdown"
      className="mx-4 mb-4 rounded-xl border border-white/10 bg-black/25 px-3 py-3"
    >
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-white/45">
        Round scoring
      </div>
      <div className="space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.round}
            data-testid={`wc-round-row-${row.round}`}
            className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-white/[0.03] px-2.5 py-1.5 text-[11px]"
          >
            <span className="text-white/55">{row.label}</span>
            <span className="tabular-nums font-bold text-white/90">
              <span data-testid={`wc-round-earned-${row.round}`}>{row.pointsEarned}</span>
              <span className="text-white/35"> / </span>
              <span className="text-white/40">{row.pointsPerCorrect} pts</span>
              <span className="ml-1 text-[10px] font-normal text-white/30">per win</span>
            </span>
          </div>
        ))}
      </div>
      {bonus > 0 && (
        <div
          data-testid="wc-round-champion-bonus"
          className="mt-2 rounded-lg border border-amber-400/20 bg-amber-500/10 px-2.5 py-2 text-[10px] text-amber-100/90"
        >
          Champion bonus enabled: <span className="font-black">{bonus} pts</span> when your champion
          wins the final (policy — confirm challenge rules).
        </div>
      )}
    </div>
  )
}
