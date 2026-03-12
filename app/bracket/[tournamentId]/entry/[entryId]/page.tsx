import { prisma } from "@/lib/prisma"
import { BracketTreeView } from "@/components/bracket/BracketTreeView"
import { Leaderboard } from "@/components/bracket/Leaderboard"
import { PickAssistCard } from "@/components/bracket/PickAssistCard"
import BracketShell from "@/components/bracket/BracketShell"
import BracketEntryActionsCard from "@/components/bracket/BracketEntryActionsCard"
import { LiveBracketIntelPanel } from "@/components/bracket/LiveBracketIntelPanel"
import { HeadToHeadCard } from "@/components/bracket/HeadToHeadCard"
import { BracketSubmitBar } from "@/components/bracket/BracketSubmitBar"
import Link from "next/link"
import { requireVerifiedSession } from "@/lib/require-verified"
import { getEntryBracketData } from "@/lib/brackets/getEntryBracketData"
import { ArrowLeft, CheckCircle2 } from "lucide-react"

export default async function EntryBracketPage({
  params,
}: {
  params: { tournamentId: string; entryId: string }
}) {
  const { userId } = await requireVerifiedSession()

  const entry = await prisma.bracketEntry.findUnique({
    where: { id: params.entryId },
    select: {
      id: true,
      userId: true,
      leagueId: true,
      name: true,
      status: true,
      lockedAt: true,
      league: {
        select: {
          tournamentId: true,
          tournament: { select: { lockAt: true } },
        },
      },
    },
  })

  if (!entry || entry.userId !== userId)
    return <div className="p-6 mode-muted">Bracket entry not found.</div>
  if (entry.league.tournamentId !== params.tournamentId)
    return <div className="p-6 mode-muted">Wrong tournament.</div>

  const { nodesWithGame, pickMap } = await getEntryBracketData(params.tournamentId, entry.id)
  const totalPicks = Object.values(pickMap || {}).filter(Boolean).length
  const totalGames = (nodesWithGame || []).filter((n: any) => Number(n?.round || 0) >= 1).length
  const completionPct = totalGames > 0 ? Math.round((totalPicks / totalGames) * 100) : 0

  const leagueLockAt = (entry as any).league?.tournament?.lockAt as Date | null | undefined
  const isLocked =
    entry.status === "LOCKED" ||
    entry.status === "SCORED" ||
    !!entry.lockedAt ||
    !!(leagueLockAt && new Date(leagueLockAt) <= new Date())

  return (
    <div className="mode-surface mode-readable min-h-screen pb-20">
      <BracketShell>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/brackets/leagues/${entry.leagueId}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full transition"
              style={{ background: "color-mix(in srgb, var(--panel2) 88%, transparent)", color: "var(--muted)" }}
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex flex-col gap-1">
              <h1 className="text-lg font-bold leading-tight">
                {entry.name || "My Bracket"}
              </h1>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="mode-muted">Build your NCAA bracket with live context and AI assist.</span>
              </div>
            </div>
          </div>

          {isLocked && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-semibold">Bracket locked</span>
                <span className="text-emerald-100/80">
                  Your picks are now read-only. You can still track standings and run analysis.
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <Link
                  href={`/bracket-intelligence?entryId=${entry.id}`}
                  className="rounded-full border border-emerald-400/60 px-3 py-1 font-semibold hover:bg-emerald-400/15 transition"
                >
                  Open Bracket Intelligence
                </Link>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="mode-panel rounded-xl p-3">
              <div className="text-xs text-white/55">Picks Made</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {totalPicks}/{totalGames || 0}
              </div>
            </div>
            <div className="mode-panel rounded-xl p-3">
              <div className="text-xs text-white/55">Completion</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {completionPct}%
              </div>
            </div>
            <div className="mode-panel rounded-xl p-3">
              <div className="text-xs text-white/55">Status</div>
              <div className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1" style={{
                background: isLocked ? "rgba(22,163,74,0.15)" : "rgba(234,179,8,0.08)",
                color: isLocked ? "#4ade80" : "#eab308",
                border: isLocked ? "1px solid rgba(22,163,74,0.5)" : "1px solid rgba(234,179,8,0.4)",
              }}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{isLocked ? "Locked" : entry.status === "DRAFT" ? "Draft" : "Submitted"}</span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <BracketTreeView
              tournamentId={params.tournamentId}
              leagueId={entry.leagueId}
              entryId={entry.id}
              nodes={nodesWithGame as any}
              initialPicks={pickMap}
              readOnly={isLocked}
              insuranceAllowedRounds={[1, 3, 4, 5, 6]}
            />

            <div className="space-y-4">
              <BracketEntryActionsCard
                leagueId={entry.leagueId}
                tournamentId={params.tournamentId}
                entryId={entry.id}
              />
              <HeadToHeadCard leagueId={entry.leagueId} entryId={entry.id} />
              <LiveBracketIntelPanel entryId={entry.id} />
              <Leaderboard tournamentId={params.tournamentId} leagueId={entry.leagueId} />
              <PickAssistCard entryId={entry.id} />
            </div>
          </div>
        </div>
      </BracketShell>

      <BracketSubmitBar
        entryId={entry.id}
        status={entry.status}
        totalPicks={totalPicks}
        totalGames={totalGames}
        lockAtIso={leagueLockAt ? leagueLockAt.toISOString() : null}
        isLocked={isLocked}
      />
    </div>
  )
}


