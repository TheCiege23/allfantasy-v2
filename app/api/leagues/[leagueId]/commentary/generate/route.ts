import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueMember } from '@/lib/league-access'
import { generateCommentary } from '@/lib/commentary-engine'
import {
  COMMENTARY_EVENT_TYPES,
  type CommentaryContext,
  type CommentaryEventType,
} from '@/lib/commentary-engine/types'
import { isSupportedSport, normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leagues/[leagueId]/commentary/generate
 * Body: eventType + context fields per type. Optional: skipStats, persist.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    let access: { leagueSport: string; isCommissioner: boolean }
    try {
      access = await assertLeagueMember(leagueId, session.user.id)
    } catch {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (!access.isCommissioner) {
      return NextResponse.json({ error: 'Forbidden: commissioner only' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const eventTypeRaw = typeof body.eventType === 'string' ? body.eventType.trim() : ''
    if (!COMMENTARY_EVENT_TYPES.includes(eventTypeRaw as CommentaryEventType)) {
      return NextResponse.json({ error: 'Invalid eventType' }, { status: 400 })
    }
    const eventType = eventTypeRaw as CommentaryEventType

    const rawSport = body.sport
    const parsedSport =
      rawSport == null || rawSport === ''
        ? undefined
        : typeof rawSport === 'string' && isSupportedSport(rawSport)
          ? normalizeToSupportedSport(rawSport)
          : null
    if (parsedSport === null) {
      return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
    }
    const leagueSport = normalizeToSupportedSport(access.leagueSport)
    const sport = parsedSport ?? leagueSport
    if (sport !== leagueSport) {
      return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
    }

    const base = {
      leagueId,
      sport,
      leagueName: readShortText(body.leagueName, 120),
      eventType,
    }

    let context: CommentaryContext
    if (eventType === 'matchup_commentary') {
      const teamAName = readRequiredText(body.teamAName, 80)
      const teamBName = readRequiredText(body.teamBName, 80)
      const scoreA = readFiniteNumber(body.scoreA)
      const scoreB = readFiniteNumber(body.scoreB)
      if (!teamAName || !teamBName || scoreA == null || scoreB == null) {
        return NextResponse.json(
          { error: 'Invalid matchup payload' },
          { status: 400 }
        )
      }
      const week = readOptionalPositiveInt(body.week)
      const season = readOptionalPositiveInt(body.season)
      if ((body.week != null && week == null) || (body.season != null && season == null)) {
        return NextResponse.json({ error: 'Invalid matchup payload' }, { status: 400 })
      }
      const resolvedWeek = week ?? undefined
      const resolvedSeason = season ?? undefined
      context = {
        ...base,
        eventType: 'matchup_commentary',
        teamAName,
        teamBName,
        scoreA,
        scoreB,
        week: resolvedWeek,
        season: resolvedSeason,
        situation: readShortText(body.situation, 80),
      }
    } else if (eventType === 'trade_reaction') {
      const managerA = readRequiredText(body.managerA, 80)
      const managerB = readRequiredText(body.managerB, 80)
      const summary = readRequiredText(body.summary, 400)
      if (!managerA || !managerB || !summary) {
        return NextResponse.json({ error: 'Invalid trade payload' }, { status: 400 })
      }
      context = {
        ...base,
        eventType: 'trade_reaction',
        managerA,
        managerB,
        summary,
        tradeType: readShortText(body.tradeType, 48),
      }
    } else if (eventType === 'waiver_reaction') {
      const managerName = readRequiredText(body.managerName, 80)
      const playerName = readRequiredText(body.playerName, 80)
      if (!managerName || !playerName) {
        return NextResponse.json({ error: 'Invalid waiver payload' }, { status: 400 })
      }
      const faabSpent = readOptionalNonNegativeNumber(body.faabSpent)
      if (body.faabSpent != null && faabSpent == null) {
        return NextResponse.json({ error: 'Invalid waiver payload' }, { status: 400 })
      }
      const resolvedFaabSpent = faabSpent ?? undefined
      context = {
        ...base,
        eventType: 'waiver_reaction',
        managerName,
        playerName,
        action: body.action === 'drop' ? 'drop' : body.action === 'claim' ? 'claim' : 'add',
        position: readShortText(body.position, 24),
        faabSpent: resolvedFaabSpent,
      }
    } else {
      const headline = readRequiredText(body.headline, 120)
      const summary = readRequiredText(body.summary, 400)
      if (!headline || !summary) {
        return NextResponse.json({ error: 'Invalid playoff payload' }, { status: 400 })
      }
      context = {
        ...base,
        eventType: 'playoff_drama',
        headline,
        summary,
        dramaType: readShortText(body.dramaType, 48),
      }
    }

    const result = await generateCommentary(context, {
      skipStatisticalContext: !!body.skipStats,
      persist: body.persist !== false,
    })

    if (!result) return NextResponse.json({ error: 'Failed to generate' }, { status: 500 })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[commentary generate POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate commentary' },
      { status: 500 }
    )
  }
}

function readShortText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, max)
}

function readRequiredText(value: unknown, max: number): string | null {
  const text = readShortText(value, max)
  return text ?? null
}

function readFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function readOptionalNonNegativeNumber(value: unknown): number | undefined | null {
  if (value == null || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return parsed
}

function readOptionalPositiveInt(value: unknown): number | undefined | null {
  if (value == null || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) return null
  return parsed
}
