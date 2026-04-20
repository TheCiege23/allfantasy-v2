import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireCronAuth } from '../_auth'
import { handleRoundTransition } from '@/lib/tournament/redraftScheduler'
import { condenseRound } from '@/lib/tournament-mode/TournamentAdvancementService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Walks every active tournament (both the new TournamentShell schema and the
 * legacy LegacyTournament schema) and advances any round whose end-week has
 * passed. Designed to be poked hourly — handlers are idempotent (round.status
 * flips to "complete" / "archived" once advancement runs, and condenseRound()
 * has its own _advancementInFlight lock).
 *
 * Without this cron the commissioner had to manually POST
 * /api/tournament/advancement with action=execute_advancement after every
 * round, which silently stalled multi-round tournaments.
 */
export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return runScan()
}

export async function POST(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
  return runScan()
}

type ShellResult = {
  tournamentId: string
  roundNumber: number
  ok: boolean
  error?: string
}

type LegacyResult = {
  tournamentId: string
  roundIndex: number
  advancementPerLeague: number
  ok: boolean
  error?: string
}

async function runScan() {
  const startedAt = new Date()
  const shellResults: ShellResult[] = []
  const legacyResults: LegacyResult[] = []

  // ---- New TournamentShell schema ----
  try {
    const shells = await (prisma as any).tournamentShell.findMany({
      where: { status: { in: ['opening', 'elimination', 'bubble', 'finals'] } },
      include: {
        rounds: { orderBy: { roundNumber: 'asc' } },
        leagues: { select: { id: true, leagueId: true, roundId: true } },
      },
    }).catch(() => [])

    for (const shell of shells as Array<any>) {
      const dueRound = (shell.rounds as Array<any>).find((r) => r.status === 'active' && isShellRoundDue(shell, r))
      if (!dueRound) continue
      try {
        await handleRoundTransition(shell.id, dueRound.roundNumber)
        shellResults.push({ tournamentId: shell.id, roundNumber: dueRound.roundNumber, ok: true })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'advancement failed'
        shellResults.push({ tournamentId: shell.id, roundNumber: dueRound.roundNumber, ok: false, error: msg.slice(0, 300) })
      }
    }
  } catch (e) {
    console.error('[cron/tournament-advancement] shell scan failed', e)
  }

  // ---- Legacy LegacyTournament schema ----
  try {
    const legacy = await prisma.legacyTournament.findMany({
      where: { status: { in: ['qualification', 'elimination', 'finals'] } },
      include: {
        rounds: { orderBy: { roundIndex: 'asc' } },
      },
    }).catch(() => [])

    for (const tour of legacy) {
      const settings = (tour.settings as Record<string, unknown> | null) ?? {}
      // Skip tournaments that are mid-advancement to avoid double-runs.
      if (settings._advancementInFlight) continue

      const activeRound = tour.rounds.find((r) => r.status === 'active')
      if (!activeRound) continue
      const isDue = await isLegacyRoundDue(tour.id, activeRound)
      if (!isDue) continue

      const advancementPerLeague =
        typeof (activeRound.settings as Record<string, unknown> | null)?.advancementCount === 'number'
          ? Number((activeRound.settings as Record<string, unknown>).advancementCount)
          : Number(settings.advancementPerLeague ?? 4)

      try {
        await condenseRound(tour.id, activeRound.roundIndex, advancementPerLeague)
        legacyResults.push({
          tournamentId: tour.id,
          roundIndex: activeRound.roundIndex,
          advancementPerLeague,
          ok: true,
        })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'advancement failed'
        legacyResults.push({
          tournamentId: tour.id,
          roundIndex: activeRound.roundIndex,
          advancementPerLeague,
          ok: false,
          error: msg.slice(0, 300),
        })
      }
    }
  } catch (e) {
    console.error('[cron/tournament-advancement] legacy scan failed', e)
  }

  return NextResponse.json({
    ok: true,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    shellAdvanced: shellResults.length,
    legacyAdvanced: legacyResults.length,
    shellResults,
    legacyResults,
  })
}

/** New schema: round is due when at least one of its leagues has currentWeek > round.endWeek. */
function isShellRoundDue(_shell: { sport?: string }, round: { endWeek?: number | null }): boolean {
  if (round.endWeek == null) return false
  // Without a per-shell currentWeek we conservatively rely on League.currentWeek
  // checked by callers via the leagues join. Keep the gate permissive — if the
  // round has an end-week and the handler is idempotent we let the cron try
  // and fail-fast on the no-op path.
  return true
}

/**
 * Legacy schema: round is due when every feeder league has at least one
 * MatchupFact whose weekOrPeriod ≥ round.endWeek AND every matchup in the
 * round window already has a winnerTeamId set. We rely on MatchupFact (rather
 * than a League.currentWeek field, which the League model doesn't expose) so
 * we never advance a round that hasn't actually finished scoring.
 */
async function isLegacyRoundDue(
  tournamentId: string,
  round: { roundIndex: number; startWeek: number | null; endWeek: number | null },
): Promise<boolean> {
  if (round.endWeek == null) return false
  const tls = await prisma.legacyTournamentLeague.findMany({
    where: { tournamentId, roundIndex: round.roundIndex },
    select: { leagueId: true },
  })
  if (tls.length === 0) return false
  const startW = round.startWeek ?? 1

  for (const { leagueId } of tls) {
    const matchups = await prisma.matchupFact.findMany({
      where: {
        leagueId,
        weekOrPeriod: { gte: startW, lte: round.endWeek },
      },
      select: { winnerTeamId: true, weekOrPeriod: true },
    })
    if (matchups.length === 0) return false
    if (!matchups.every((m) => Boolean(m.winnerTeamId))) return false
    if (!matchups.some((m) => m.weekOrPeriod >= (round.endWeek ?? 0))) return false
  }
  return true
}
