"use client"

import { Crown, Medal, RefreshCw, Trophy } from "lucide-react"
import Image from "next/image"
import type { WorldCupChallengeView } from "@/lib/world-cup/types"
import { WORLD_CUP_ROUND_LABELS } from "@/lib/world-cup/types"

function Avatar({ name, url }: { name: string; url?: string | null }) {
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={36}
        height={36}
        className="h-9 w-9 rounded-lg object-cover"
      />
    )
  }
  return (
    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-sm font-black text-white/60">
      {name.slice(0, 2).toUpperCase()}
    </span>
  )
}

export default function WorldCupLeaderboard({
  view,
  onRecalculate,
  busy,
}: {
  view: WorldCupChallengeView
  onRecalculate?: () => void
  busy?: boolean
}) {
  const highlightEntryId = view.activeEntry?.id ?? null

  return (
    <div className="mx-auto max-w-4xl px-4 py-5 pb-28 sm:pb-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-white">Leaderboard</h2>
          <p className="text-xs text-white/45">
            Scores are calculated from completed matches only.
            {view.challenge.lastSyncedAt
              ? ` Last updated ${new Date(view.challenge.lastSyncedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.`
              : " Not yet synced."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!(view.isOwner || view.isAdmin) && (
            <button
              type="button"
              onClick={onRecalculate}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-bold text-white/40 hover:text-white/60 disabled:opacity-30"
            >
              <RefreshCw className={`h-3 w-3 ${busy ? "animate-spin" : ""}`} />
              Refresh
            </button>
          )}
          {(view.isOwner || view.isAdmin) && (
            <button
              type="button"
              onClick={onRecalculate}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold text-white/70"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} />
              Recalculate
            </button>
          )}
        </div>
      </div>

      {view.leaderboard.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] py-12 text-center">
          <Trophy className="h-8 w-8 text-white/15" />
          <div>
            <p className="text-sm font-bold text-white/45">Leaderboard updates after matches begin.</p>
            <p className="mt-1 text-xs text-white/30">
              Make your picks now — scoring starts with the first completed match.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {view.leaderboard.map((row) => {
            const breakdown = Object.entries(row.roundBreakdown ?? {})
            const updatedLabel = row.updatedAt
              ? new Date(row.updatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
              : null

            return (
              <div
                key={row.entryId}
                className={`rounded-lg border p-3 transition ${
                  highlightEntryId && row.entryId === highlightEntryId
                    ? "sticky bottom-20 z-10 border-cyan-300/40 bg-cyan-300/[0.07] sm:static"
                    : "border-white/10 bg-white/[0.03]"
                }`}
              >
                <div className="grid grid-cols-[2.5rem_1fr_auto] items-start gap-3">
                  {/* Rank / medal */}
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/30 text-sm font-black text-white">
                    {row.rank === 1 ? (
                      <Crown className="h-4 w-4 text-amber-200" />
                    ) : row.rank <= 3 ? (
                      <Medal className="h-4 w-4 text-white/70" />
                    ) : (
                      row.rank
                    )}
                  </div>

                  {/* Identity + meta */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Avatar name={row.displayName} url={row.avatarUrl} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black text-white">{row.displayName}</div>
                        <div className="truncate text-[11px] text-white/40">{row.entryName}</div>
                      </div>
                    </div>

                    {/* Champion pick */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
                        <Trophy className="h-3 w-3" />
                        {row.championPickName ?? "No champion pick"}
                        {row.championPickName && (
                          <span
                            className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                              row.championStillAlive
                                ? "bg-emerald-400/15 text-emerald-300"
                                : "bg-rose-400/15 text-rose-300"
                            }`}
                          >
                            {row.championStillAlive ? "Still in" : "Eliminated"}
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-white/40">
                        ✓ {row.correctPicks} · ✗ {row.incorrectPicks}
                      </span>
                    </div>

                    {/* Round breakdown pills */}
                    {breakdown.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {breakdown.map(([round, pts]) => (
                          <span
                            key={round}
                            className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] text-white/35"
                          >
                            {(WORLD_CUP_ROUND_LABELS as Record<string, string>)[round] ?? round}: {pts}pts
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Updated time */}
                    {updatedLabel && (
                      <div className="mt-1 text-[9px] text-white/20">
                        Updated {updatedLabel}
                      </div>
                    )}
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <div className="text-xl font-black text-white">{row.totalScore}</div>
                    <div className="text-[10px] text-white/35">max {row.maxPossibleScore}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

