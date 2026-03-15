/**
 * League Discovery AI — POST suggests leagues from preferences + candidates or from public pools (tournamentId).
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { suggestLeagues } from '@/lib/league-discovery'
import type { CandidateLeague, UserDiscoveryPreferences } from '@/lib/league-discovery'

export const dynamic = 'force-dynamic'

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
        return {
          id: lg.id,
          name: lg.name,
          joinCode: lg.joinCode,
          memberCount: lg._count?.members ?? 0,
          entryCount: lg._count?.entries ?? 0,
          maxManagers: lg.maxManagers ?? 100,
          scoringMode: rules?.mode || rules?.scoringMode || 'fancred_edge',
          tournamentName: lg.tournament?.name ?? '',
          sport: lg.tournament?.sport ?? undefined,
          activityLevel: 'moderate',
          competitionSpread: 'balanced',
        } as CandidateLeague
      })
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: 'Provide either candidates or tournamentId to get suggestions.' },
        { status: 400 }
      )
    }

    const result = await suggestLeagues({ preferences, candidates })
    return NextResponse.json(result)
  } catch (e) {
    console.error('[league/discovery/suggest]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Suggestion failed' },
      { status: 500 }
    )
  }
}
