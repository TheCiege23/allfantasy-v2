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
import {
  getBracketViewState,
  getBracketProgressDisplay,
  getBracketLockStateMessage,
  SCORING_INFO_LABEL,
  getPoolLeaderboardUrl,
  resolveBracketChallengeLabel,
  resolveBracketSportUI,
} from "@/lib/bracket-challenge"

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
          scoringRules: true,
          tournament: { select: { lockAt: true, sport: true } },
        },
      },
    },
  })

  if (!entry || entry.userId !== userId)
    return <div className="p-6 mode-muted">Bracket entry not found.</div>
  if (entry.league.tournamentId !== params.tournamentId)
    return <div className="p-6 mode-muted">Wrong tournament.</div>

  const { nodesWithGame, pickMap } = await getEntryBracketData(params.tournamentId, entry.id)
  const totalGames = (nodesWithGame || []).filter((n: any) => Number(n?.round || 0) >= 1).length
  const progress = getBracketProgressDisplay(pickMap || {}, totalGames)

  const leagueLockAt = (entry as any).league?.tournament?.lockAt as Date | null | undefined
  const isLocked =
    entry.status === "LOCKED" ||
    entry.status === "SCORED" ||
    !!entry.lockedAt ||
    !!(leagueLockAt && new Date(leagueLockAt) <= new Date())
  const viewState = getBracketViewState(
    entry.status,
    leagueLockAt,
    entry.lockedAt,
    false,
    null,
  )
  const lockMessage = getBracketLockStateMessage(viewState)
  const leagueLeaderboardUrl = getPoolLeaderboardUrl(entry.leagueId)
  const sportUI = resolveBracketSportUI((entry as any).league?.tournament?.sport ?? null)
  const challengeLabel = resolveBracketChallengeLabel({
    bracketType: (entry as any).league?.scoringRules?.bracketType,
    challengeType: (entry as any).league?.scoringRules?.challengeType,
    sport: (entry as any).league?.tournament?.sport,
  })

  return (
    <div className="mode-surface mode-readable min-h-screen pb-20">
      <BracketShell>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/brackets/leagues/${entry.leagueId}`}
              className="inline-flex items-center justify-center w-8 h-8 rounded-full transition"
              style={{ background: "color-mix(in srgb, var(--panel2) 88%, transparent)", color: "var(--muted)" }}
              data-testid="bracket-entry-back-button"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="flex flex-col gap-1">
              <h1 className="text-lg font-bold leading-tight">
                {entry.name || "My Bracket"}
              </h1>
              <div className="inline-flex items-center gap-1.5 text-[11px] w-fit rounded-full px-2 py-0.5" style={{ background: "rgba(56,189,248,0.12)", color: "rgba(186,230,253,0.95)" }}>
                <span className="font-semibold">{sportUI.badge}</span>
                <span>{challengeLabel}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="mode-muted">
                  Build your {sportUI.label} challenge with live context and AI assist.
                </span>
                <span className="inline-flex items-center gap-2">
                  <Link href={leagueLeaderboardUrl} className="mode-muted underline" data-testid="bracket-entry-leaderboard-link">
                    Leaderboard
                  </Link>
                  <Link
                    href={`${leagueLeaderboardUrl}#settings-rules`}
                    className="mode-muted underline"
                    data-testid="bracket-entry-scoring-info-link"
                  >
                    {SCORING_INFO_LABEL}
                  </Link>
                </span>
              </div>
            </div>
          </div>

          {isLocked && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-semibold">Bracket locked</span>
                <span className="text-emerald-100/80">
                  {lockMessage}
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
                {progress.pickedCount}/{totalGames || 0}
              </div>
            </div>
            <div className="mode-panel rounded-xl p-3">
              <div className="text-xs text-white/55">Completion</div>
              <div className="mt-1 text-lg font-semibold text-white">
                {progress.percentComplete}%
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
        totalPicks={progress.pickedCount}
        totalGames={totalGames}
        lockAtIso={leagueLockAt ? leagueLockAt.toISOString() : null}
        isLocked={isLocked}
      />
    </div>
  )
}


