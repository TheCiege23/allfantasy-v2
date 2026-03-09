import { NextRequest, NextResponse } from 'next/server'
import { proxyToExisting } from '@/lib/api/proxy-adapter'
import { resolveLegacyUserKeyForCurrentSession } from '@/lib/auth/legacy-user-key'

async function getUserKey(req: NextRequest): Promise<string | null> {
  const fromQuery = req.nextUrl.searchParams.get('userId')
  if (fromQuery) return fromQuery
  return resolveLegacyUserKeyForCurrentSession()
}

function notMapped(path: string[], method: string) {
  return NextResponse.json(
    {
      error: 'LEGACY_NAMESPACE_ADAPTER_NOT_MAPPED',
      message: `No stable proxy mapping for ${method} /api/legacy/leagues/[leagueId]/${path.join('/')}`,
    },
    { status: 501 },
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: { leagueId: string; path: string[] } },
) {
  const leagueId = params.leagueId
  const path = params.path || []
  const userId = await getUserKey(req)
  if (!userId) return NextResponse.json({ error: 'Missing legacy user context' }, { status: 401 })

  if (path[0] === 'team-scan') {
    return proxyToExisting(req, {
      targetPath: '/api/legacy/offseason-dashboard',
      query: { leagueId, userId, includeLiveNews: true, includeMarketBoard: true, includeWatchlists: true },
    })
  }

  if (path[0] === 'team-direction') {
    return proxyToExisting(req, {
      targetPath: '/api/legacy/offseason-dashboard',
      query: { leagueId, userId, includeLiveNews: true, includeMarketBoard: false, includeWatchlists: false },
    })
  }

  if (path[0] === 'draft-war-room') {
    return proxyToExisting(req, {
      targetPath: '/api/legacy/draft-war-room',
      query: {
        leagueId,
        userId,
        draftId: req.nextUrl.searchParams.get('draftId') || `draft_${leagueId}_rookie`,
        overallPick: req.nextUrl.searchParams.get('overallPick') || 1,
        round: req.nextUrl.searchParams.get('round') || 1,
        includeSimulation: true,
        includePredictedPicksAhead: true,
      },
    })
  }

  if (path[0] === 'trade-command-center' || path[0] === 'renegotiation') {
    return proxyToExisting(req, {
      targetPath: '/api/legacy/trade-command-center',
      query: {
        leagueId,
        userId,
        includeIncomingOffers: true,
        includeSentOffers: true,
        includeExpiredOffers: true,
        includeOfferBuilder: true,
      },
    })
  }

  if (path[0] === 'market-board' || path[0] === 'waiver-engine') {
    return proxyToExisting(req, {
      targetPath: '/api/legacy/offseason-dashboard',
      query: { leagueId, userId, includeLiveNews: true, includeMarketBoard: true, includeWatchlists: true },
    })
  }

  if (path[0] === 'opponent-behavior') {
    return proxyToExisting(req, {
      targetPath: '/api/legacy/opponent-tendencies',
      query: { leagueId, userId },
    })
  }

  if (path[0] === 'league-fairness') {
    return proxyToExisting(req, {
      targetPath: '/api/legacy/decision-guardian/evaluate',
      query: { leagueId, userId },
    })
  }

  if (path[0] === 'history-analysis') {
    return proxyToExisting(req, {
      targetPath: '/api/legacy/rankings/historical-ratings',
      query: { leagueId, sleeper_username: userId },
    })
  }

  return notMapped(path, 'GET')
}

export async function POST(
  req: NextRequest,
  { params }: { params: { leagueId: string; path: string[] } },
) {
  const leagueId = params.leagueId
  const path = params.path || []
  const userId = await getUserKey(req)
  if (!userId) return NextResponse.json({ error: 'Missing legacy user context' }, { status: 401 })

  if (path[0] === 'team-direction' && path[1] === 'refresh') {
    return proxyToExisting(req, {
      targetPath: '/api/legacy/team/direction-refresh',
      method: 'POST',
      body: { leagueId, userId, trigger: 'manual', includeActionPlan: true, includeMarketTargets: true },
    })
  }

  if (path[0] === 'trade-review') {
    return proxyToExisting(req, {
      targetPath: '/api/legacy/trade/review',
      method: 'POST',
      body: { ...(await req.json().catch(() => ({}))), leagueId, userId },
    })
  }

  if (path[0] === 'draft-war-room' && path[1] === 'refresh') {
    return proxyToExisting(req, {
      targetPath: '/api/legacy/draft/recommendation-refresh',
      method: 'POST',
      body: { ...(await req.json().catch(() => ({}))), leagueId, userId },
    })
  }

  if ((path[0] === 'market-board' && path[1] === 'refresh') || (path[0] === 'waiver-engine' && path[1] === 'refresh')) {
    return proxyToExisting(req, {
      targetPath: '/api/legacy/market/refresh',
      method: 'POST',
      body: {
        leagueId,
        userId,
        scope: path[0] === 'waiver-engine' ? 'waivers' : 'full',
        forceLiveNewsRefresh: true,
      },
    })
  }

  if (path[0] === 'ai-chat') {
    return proxyToExisting(req, {
      targetPath: '/api/legacy/chat',
      method: 'POST',
    })
  }

  return notMapped(path, 'POST')
}
