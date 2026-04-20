import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { runStartSitAiEngine } from '@/lib/ai-matchup-engine/runStartSitAiEngine'
import type { MatchupPlayerSlot } from '@/lib/matchup-center/types'
import { sanitizeStarterRow } from '@/lib/matchup-center/validateMatchupPayload'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function leagueScoringHint(leagueId: string): Promise<string | null> {
  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: { scoring: true, settings: true, sport: true },
  })
  if (!league) return null
  const parts: string[] = []
  if (league.scoring) parts.push(`Scoring profile: ${league.scoring}`)
  parts.push(`Sport: ${String(league.sport)}`)
  return parts.join(' · ')
}

function isMember(leagueId: string, userId: string) {
  return prisma.league.findFirst({
    where: {
      id: leagueId,
      OR: [{ userId }, { teams: { some: { platformUserId: userId } } }],
    },
    select: { id: true },
  })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leagueId } = await params
  const member = await isMember(leagueId, session.user.id)
  if (!member) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: {
    sport?: string
    playerA?: MatchupPlayerSlot
    playerB?: MatchupPlayerSlot
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.playerA || !body.playerB) {
    return NextResponse.json({ error: 'playerA and playerB required' }, { status: 400 })
  }

  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: { sport: true },
  })
  const sport = String(body.sport ?? league?.sport ?? 'NFL').trim()

  const playerA = sanitizeStarterRow(body.playerA)
  const playerB = sanitizeStarterRow(body.playerB)

  const hint = await leagueScoringHint(leagueId)
  const result = await runStartSitAiEngine({
    sport,
    playerA,
    playerB,
    leagueScoringHint: hint,
  })

  return NextResponse.json({ result, leagueId })
}
