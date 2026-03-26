import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league-access'
import { buildStoryPayload } from '@/lib/league-story-engine'
import type { LeagueStoryContext, LeagueStoryType } from '@/lib/league-story-engine/types'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

const VALID_STORY_TYPES: LeagueStoryType[] = [
  'closest_matchup',
  'underdog_story',
  'dominant_team',
  'rivalry_spotlight',
  'comeback_trajectory',
  'league_spotlight',
]

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const leagueId = String(body.leagueId ?? '').trim()
  const week = body.week != null ? Number(body.week) : undefined
  const season = body.season != null ? String(body.season) : undefined
  const sport = body.sport != null ? String(body.sport) : undefined
  const storyType = VALID_STORY_TYPES.includes(body.storyType) ? body.storyType : undefined
  const customTitle = typeof body.customTitle === 'string' ? body.customTitle.trim() || undefined : undefined
  const customNarrative = typeof body.customNarrative === 'string' ? body.customNarrative.trim() || undefined : undefined
  const standings = Array.isArray(body.standings)
    ? body.standings.map((s: any) => ({
        name: String(s.name ?? s.teamName ?? ''),
        wins: Number(s.wins ?? 0),
        losses: Number(s.losses ?? 0),
        pointsFor: s.pointsFor != null ? Number(s.pointsFor) : undefined,
        rank: s.rank != null ? Number(s.rank) : undefined,
      }))
    : undefined
  const matchups = Array.isArray(body.matchups)
    ? body.matchups.map((m: any) => ({
        team1: String(m.team1 ?? m.teamA ?? ''),
        team2: String(m.team2 ?? m.teamB ?? ''),
        score1: m.score1 ?? m.scoreA != null ? Number(m.score1 ?? m.scoreA) : undefined,
        score2: m.score2 ?? m.scoreB != null ? Number(m.score2 ?? m.scoreB) : undefined,
        projectedMargin: m.projectedMargin != null ? Number(m.projectedMargin) : undefined,
      }))
    : undefined

  if (!leagueId) {
    return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { name: true, sport: true },
  })
  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 })
  }
  try {
    await assertLeagueMember(leagueId, session.user.id)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const leagueName = league.name?.trim() || `League ${leagueId}`
  const leagueSport = normalizeToSupportedSport(sport ?? league.sport ?? 'NFL')

  const ctx: LeagueStoryContext = {
    leagueId,
    leagueName,
    week,
    season,
    sport: leagueSport,
    standings,
    matchups,
  }

  const payload = buildStoryPayload(ctx, {
    storyType,
    customTitle,
    customNarrative,
  })

  const moment = await prisma.shareableMoment.create({
    data: {
      userId: session.user.id,
      sport: leagueSport,
      shareType: 'league_story',
      title: payload.title,
      summary: payload.narrative.slice(0, 500),
      metadata: { payload } as object,
    },
  })

  const base =
    process.env.NEXTAUTH_URL ??
    (req.headers.get('x-forwarded-host') ? `https://${req.headers.get('x-forwarded-host')}` : '')
  const shareUrl = base ? `${base.replace(/\/$/, '')}/share/${moment.id}` : ''

  return NextResponse.json({
    shareId: moment.id,
    shareUrl,
    payload,
    title: moment.title,
    summary: moment.summary,
  })
}
