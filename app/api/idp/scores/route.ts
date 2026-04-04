import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { isIdpLeague } from '@/lib/idp'
import { prisma } from '@/lib/prisma'
import { getAllPlayers } from '@/lib/sleeper-client'
import { computeIdpFantasyPoints, getMergedScoringRulesForLeague } from '@/lib/idp/scoringEngine'
import { generateDeterministicWeeklyStatLine } from '@/lib/idp/statIngestionEngine'
import { parseIdpRowsFromPlayerData } from '@/lib/idp/idpRouteHelpers'

export const dynamic = 'force-dynamic'

const MAX_IDS = 80

type ScoreEntry = {
  playerId: string
  name: string
  position: string
  team: string | null
  stats: ReturnType<typeof generateDeterministicWeeklyStatLine>
  fantasyPoints: number
  breakdown: Record<string, number>
}

async function buildEntries(
  leagueId: string,
  week: number,
  playerIds: string[],
  playersMap: Record<string, { full_name?: string; first_name?: string; last_name?: string; position?: string; team?: string | null }>,
): Promise<{ rules: Record<string, number>; entries: ScoreEntry[] }> {
  const rules = await getMergedScoringRulesForLeague(leagueId)
  const entries: ScoreEntry[] = []
  for (const playerId of playerIds) {
    const line = generateDeterministicWeeklyStatLine(playerId, week)
    const { total, breakdown } = computeIdpFantasyPoints(line, rules)
    const sp = playersMap[playerId]
    const name =
      sp?.full_name?.trim() ||
      [sp?.first_name, sp?.last_name].filter(Boolean).join(' ').trim() ||
      playerId
    entries.push({
      playerId,
      name,
      position: sp?.position ?? '—',
      team: sp?.team ?? null,
      stats: line,
      fantasyPoints: Math.round(total * 100) / 100,
      breakdown,
    })
  }
  return { rules, entries }
}

/**
 * GET /api/idp/scores?leagueId=&week=
 *   &scope=mine — current user's IDP roster in this league
 *   &playerIds=id1,id2 — explicit list (required if scope not mine)
 *
 * POST /api/idp/scores — body: { leagueId, week, playerIds?: string[], scope?: 'mine' }
 * (playerIds for large batches)
 *
 * Points use league merged scoring rules × deterministic weekly stat lines until live stats are wired.
 */
export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const leagueId = searchParams.get('leagueId')?.trim() ?? ''
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const weekRaw = Number(searchParams.get('week') || '1')
  const week = Math.min(18, Math.max(1, Number.isFinite(weekRaw) ? weekRaw : 1))

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isIdp = await isIdpLeague(leagueId)
  if (!isIdp) return NextResponse.json({ error: 'Not an IDP league' }, { status: 404 })

  const scope = (searchParams.get('scope') ?? 'explicit').toLowerCase()
  let playerIds: string[]

  if (scope === 'mine') {
    const roster = await prisma.roster.findFirst({
      where: { leagueId, platformUserId: userId },
      select: { playerData: true },
    })
    playerIds = parseIdpRowsFromPlayerData(roster?.playerData).map((r) => r.playerId)
    if (playerIds.length === 0) {
      return NextResponse.json({
        leagueId,
        week,
        source: 'deterministic_simulation',
        message: 'No IDP players found on your roster snapshot.',
        scoringRules: await getMergedScoringRulesForLeague(leagueId),
        entries: [],
      })
    }
  } else {
    const raw = searchParams.get('playerIds')?.trim() ?? ''
    playerIds = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, MAX_IDS)
    if (playerIds.length === 0) {
      return NextResponse.json(
        { error: 'playerIds required (or use scope=mine)' },
        { status: 400 },
      )
    }
  }

  const allPlayers = await getAllPlayers()
  const { rules, entries } = await buildEntries(leagueId, week, playerIds, allPlayers)

  return NextResponse.json({
    leagueId,
    week,
    source: 'deterministic_simulation',
    scoringRules: rules,
    entries,
  })
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId.trim() : ''
  const weekRaw = Number(body.week)
  const week = Math.min(18, Math.max(1, Number.isFinite(weekRaw) ? weekRaw : 1))
  const scope = typeof body.scope === 'string' ? body.scope.toLowerCase() : 'explicit'

  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isIdp = await isIdpLeague(leagueId)
  if (!isIdp) return NextResponse.json({ error: 'Not an IDP league' }, { status: 404 })

  let playerIds: string[]

  if (scope === 'mine') {
    const roster = await prisma.roster.findFirst({
      where: { leagueId, platformUserId: userId },
      select: { playerData: true },
    })
    playerIds = parseIdpRowsFromPlayerData(roster?.playerData).map((r) => r.playerId)
  } else {
    const arr = Array.isArray(body.playerIds) ? body.playerIds : []
    playerIds = arr
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((s) => s.trim())
      .slice(0, MAX_IDS)
    if (playerIds.length === 0) {
      return NextResponse.json({ error: 'playerIds array required (or scope=mine)' }, { status: 400 })
    }
  }

  const allPlayers = await getAllPlayers()
  const { rules, entries } = await buildEntries(leagueId, week, playerIds, allPlayers)

  return NextResponse.json({
    leagueId,
    week,
    source: 'deterministic_simulation',
    scoringRules: rules,
    entries,
  })
}
