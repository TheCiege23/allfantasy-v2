import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildMatchupCenterPayload } from '@/server/services/matchupCenterService'
import { runLeagueMatchupAiEngine } from '@/lib/ai-matchup-engine/runLeagueMatchupAiEngine'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

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
  const sport = normalizeToSupportedSport(String(league.sport))
  if (sport) parts.push(`Sport: ${sport}`)
  const s = league.settings
  if (s && typeof s === 'object' && !Array.isArray(s)) {
    const o = s as Record<string, unknown>
    if (typeof o.scoringType === 'string') parts.push(`Scoring type: ${o.scoringType}`)
    if (typeof o.scoringFormat === 'string') parts.push(`Format: ${o.scoringFormat}`)
  }
  return parts.length ? parts.join(' · ') : null
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leagueId } = await params
  let season: number | undefined
  let week: number | undefined
  try {
    const body = (await req.json()) as { season?: number; week?: number }
    if (body.season != null && Number.isFinite(Number(body.season))) season = Number(body.season)
    if (body.week != null && Number.isFinite(Number(body.week))) week = Number(body.week)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const payload = await buildMatchupCenterPayload({
    leagueId,
    viewerUserId: session.user.id,
    season,
    week,
  })

  if ('error' in payload) {
    return NextResponse.json({ error: payload.error }, { status: payload.status })
  }

  const hint = await leagueScoringHint(leagueId)
  const analysis = await runLeagueMatchupAiEngine({ payload, leagueScoringHint: hint })

  return NextResponse.json({ analysis, leagueId, season: payload.season, week: payload.week })
}
