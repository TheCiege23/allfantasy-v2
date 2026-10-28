import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import {
  FantraxApiImportError,
  fetchFantraxPlayerPoolPage,
} from '@/lib/league-import/fantrax/FantraxApiFetchService'

/** Read-only league-specific Fantrax waiver wire and free-agent pool. */
export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ip = getClientIp(req) || 'unknown'
  if (!rateLimit(`fantrax-player-pool:${userId}:${ip}`, 10, 60_000).success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const params = req.nextUrl.searchParams
  const leagueId = params.get('leagueId')?.trim() ?? ''
  const sport = params.get('sport')?.trim() ?? ''
  const status = (params.get('status') ?? 'ALL').toUpperCase()
  const page = Number(params.get('page') ?? 1)
  const limit = Number(params.get('limit') ?? 50)
  const search = params.get('search') ?? ''
  if (!['ALL', 'WW', 'FA'].includes(status) ||
      !Number.isInteger(page) || page < 1 || page > 1000 ||
      !Number.isInteger(limit) || limit < 1 || limit > 100 ||
      search.length > 100) {
    return NextResponse.json({ error: 'Invalid player-pool filters.' }, { status: 400 })
  }

  try {
    const result = await fetchFantraxPlayerPoolPage(leagueId, sport, {
      status: status as 'ALL' | 'WW' | 'FA',
      page,
      limit,
      search,
    })
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fantrax player pool is unavailable.'
    const statusCode = error instanceof FantraxApiImportError ? 400 : 502
    return NextResponse.json({ error: message }, { status: statusCode })
  }
}
