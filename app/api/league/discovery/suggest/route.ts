/**
 * League Discovery AI — POST suggests leagues from preferences + candidates or from public pools (tournamentId).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { suggestLeagues } from '@/lib/league-discovery'
import type { CandidateLeague, UserDiscoveryPreferences } from '@/lib/league-discovery'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

export const dynamic = 'force-dynamic'

function inferActivityLevel(input: {
  memberCount?: number | null
  entryCount?: number | null
  maxManagers?: number | null
}): 'quiet' | 'moderate' | 'active' {
  const members = Number(input.memberCount ?? 0)
  const entries = Number(input.entryCount ?? 0)
  const maxManagers = Math.max(1, Number(input.maxManagers ?? 0))
  const fillPct = maxManagers > 0 ? members / maxManagers : 0
  if (members >= 14 || entries >= 20 || fillPct >= 0.85) return 'active'
  if (members <= 6 || fillPct < 0.45) return 'quiet'
  return 'moderate'
}

function inferCompetitionSpread(input: {
  scoringMode?: string | null
  maxManagers?: number | null
  isPaidLeague?: boolean | null
}): 'casual' | 'balanced' | 'competitive' {
  const scoring = String(input.scoringMode ?? '').toLowerCase()
  const maxManagers = Number(input.maxManagers ?? 0)
  const paid = !!input.isPaidLeague
  if (paid || maxManagers >= 14 || ['fancred_edge', 'edge', 'expert'].some((k) => scoring.includes(k))) {
    return 'competitive'
  }
  if (maxManagers <= 10 || ['standard', 'casual'].some((k) => scoring.includes(k))) {
    return 'casual'
  }
  return 'balanced'
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const preferences: UserDiscoveryPreferences = body.preferences ?? {}
    let candidates: CandidateLeague[] = Array.isArray(body.candidates) ? body.candidates : []
    const tournamentId = typeof body.tournamentId === 'string' ? body.tournamentId.trim() : null

    if (candidates.length === 0 && tournamentId) {
      const where: any = { tournamentId, isPrivate: false }
      const pools = await (prisma as any).bracketLeague.findMany({
        where,
        include: {
          _count: { select: { members: true, entries: true } },
          tournament: { select: { name: true, season: true, sport: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        take: 50,
      })
      candidates = pools.map((lg: any) => {
        const rules = (lg.scoringRules || {}) as any
        const scoringMode = rules?.mode || rules?.scoringMode || 'fancred_edge'
        const memberCount = lg._count?.members ?? 0
        const entryCount = lg._count?.entries ?? 0
        const maxManagers = lg.maxManagers ?? 100
        const isPaidLeague = Boolean(rules?.isPaidLeague)
        return {
          id: lg.id,
          name: lg.name,
          joinCode: lg.joinCode,
          memberCount,
          entryCount,
          maxManagers,
          scoringMode,
          isPaidLeague,
          tournamentName: lg.tournament?.name ?? '',
          sport: normalizeToSupportedSport(lg.tournament?.sport),
          activityLevel: inferActivityLevel({ memberCount, entryCount, maxManagers }),
          competitionSpread: inferCompetitionSpread({ scoringMode, maxManagers, isPaidLeague }),
        } as CandidateLeague
      })
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'Provide either candidates or tournamentId to get suggestions.' },
        { status: 400 }
      )
    }

    const normalizedCandidates = candidates.map((c) => {
      const sport = normalizeToSupportedSport(c.sport)
      return {
        ...c,
        sport,
        activityLevel:
          c.activityLevel ??
          inferActivityLevel({
            memberCount: c.memberCount ?? null,
            entryCount: c.entryCount ?? null,
            maxManagers: c.maxManagers ?? c.leagueSize ?? null,
          }),
        competitionSpread:
          c.competitionSpread ??
          inferCompetitionSpread({
            scoringMode: c.scoringMode ?? null,
            maxManagers: c.maxManagers ?? c.leagueSize ?? null,
            isPaidLeague: c.isPaidLeague ?? null,
          }),
      } as CandidateLeague
    })

    const result = await suggestLeagues({ preferences, candidates: normalizedCandidates })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[league/discovery/suggest]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Suggestion failed' },
      { status: 500 }
    )
  }
}
