/**
 * Global Intelligence — POST returns unified Meta, Simulation, Advisor, Media, Draft for a league.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getGlobalIntelligence } from '@/lib/global-intelligence'
import type { GlobalIntelligenceInput, IntelligenceModule } from '@/lib/global-intelligence'

export const dynamic = 'force-dynamic'

function parseOptionalPositiveInt(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const n = Math.trunc(raw)
    return n > 0 ? n : undefined
  }
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) && n > 0 ? n : undefined
  }
  return undefined
}

export async function POST(req: NextRequest) {
  try {
    const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
    const userId = session?.user?.id ?? null

    const body = (await req.json().catch(() => ({}))) as GlobalIntelligenceInput & {
      season?: unknown
      week?: unknown
    }
    const leagueId = body.leagueId
    if (!leagueId || typeof leagueId !== 'string') {
      return NextResponse.json(
        { error: 'leagueId (string) required' },
        { status: 400 }
      )
    }

    const include = body.include as IntelligenceModule[] | undefined
    const validModules: IntelligenceModule[] = ['meta', 'simulation', 'advisor', 'media', 'draft']
    const filteredInclude =
      include?.length && Array.isArray(include)
        ? include.filter((m) => validModules.includes(m))
        : undefined

    const result = await getGlobalIntelligence({
      leagueId,
      userId,
      sport: body.sport ?? null,
      season: parseOptionalPositiveInt(body.season),
      week: parseOptionalPositiveInt(body.week),
      include: filteredInclude,
    })

    return NextResponse.json(result)
  } catch (e) {
    console.error('[intelligence/global]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Global intelligence failed' },
      { status: 500 }
    )
  }
}
