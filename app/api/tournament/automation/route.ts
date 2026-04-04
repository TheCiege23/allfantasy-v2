import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateLeagueStandings } from '@/lib/tournament/advancementEngine'
import { handleRoundTransition } from '@/lib/tournament/redraftScheduler'
import { requireCronAuth } from '@/app/api/cron/_auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Cron / admin: sync shell league standings and optional round transitions.
 * Set TOURNAMENT_AUTOMATION_CURRENT_WEEK (integer) to evaluate weekEnd against shell rounds.
 */
export async function GET(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runAutomation()
}

export async function POST(req: NextRequest) {
  if (!requireCronAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runAutomation()
}

async function runAutomation() {
  const processed: string[] = []
  const errors: { id: string; message: string }[] = []

  const shells = await prisma.tournamentShell.findMany({
    where: { status: { notIn: ['setup', 'complete'] } },
    include: { rounds: { orderBy: { roundNumber: 'asc' } } },
  })

  const envWeek = process.env.TOURNAMENT_AUTOMATION_CURRENT_WEEK
  const currentWeek = envWeek ? parseInt(envWeek, 10) : NaN

  for (const shell of shells) {
    try {
      const activeRound = shell.rounds.find((r) => r.roundNumber === shell.currentRoundNumber) ?? shell.rounds[0]
      const tls = await prisma.tournamentLeague.findMany({
        where: {
          tournamentId: shell.id,
          leagueId: { not: null },
          status: { not: 'archived' },
        },
      })
      for (const tl of tls) {
        try {
          await calculateLeagueStandings(tl.id)
        } catch {
          // Bubble / transition windows may briefly lack underlying leagues
        }
      }
      processed.push(shell.id)

      if (Number.isFinite(currentWeek) && activeRound) {
        if (
          currentWeek > activeRound.weekEnd &&
          (shell.status === 'active' || shell.status === 'bubble')
        ) {
          await handleRoundTransition(shell.id, activeRound.roundNumber)
        }
      }

      await prisma.tournamentAnnouncement.updateMany({
        where: {
          tournamentId: shell.id,
          isPosted: false,
          scheduledFor: { lte: new Date() },
        },
        data: { isPosted: true, postedAt: new Date() },
      })
    } catch (e) {
      errors.push({
        id: shell.id,
        message: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return NextResponse.json({ processed: processed.length, errors })
}
