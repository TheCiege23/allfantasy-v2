import { NextRequest, NextResponse } from 'next/server'
import { proxyToExisting } from '@/lib/api/proxy-adapter'
import { resolveLegacyUserKeyForCurrentSession } from '@/lib/auth/legacy-user-key'

export async function GET(req: NextRequest, { params }: { params: { leagueId: string } }) {
  const userId = req.nextUrl.searchParams.get('userId') || (await resolveLegacyUserKeyForCurrentSession())
  if (!userId) {
    return NextResponse.json({ error: 'Missing legacy user context' }, { status: 401 })
  }

  return proxyToExisting(req, {
    targetPath: '/api/legacy/offseason-dashboard',
    query: {
      leagueId: params.leagueId,
      userId,
      includeLiveNews: true,
      includeMarketBoard: true,
      includeWatchlists: true,
    },
  })
}

export async function POST(req: NextRequest, { params }: { params: { leagueId: string } }) {
  const userId = req.nextUrl.searchParams.get('userId') || (await resolveLegacyUserKeyForCurrentSession())
  if (!userId) {
    return NextResponse.json({ error: 'Missing legacy user context' }, { status: 401 })
  }

  return proxyToExisting(req, {
    targetPath: '/api/legacy/market/refresh',
    body: {
      leagueId: params.leagueId,
      userId,
      scope: 'full',
      forceLiveNewsRefresh: true,
    },
    method: 'POST',
  })
}
