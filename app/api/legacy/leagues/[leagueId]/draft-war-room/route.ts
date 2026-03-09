import { NextRequest, NextResponse } from 'next/server'
import { proxyToExisting } from '@/lib/api/proxy-adapter'
import { resolveLegacyUserKeyForCurrentSession } from '@/lib/auth/legacy-user-key'

export async function GET(req: NextRequest, { params }: { params: { leagueId: string } }) {
  const userId = req.nextUrl.searchParams.get('userId') || (await resolveLegacyUserKeyForCurrentSession())
  if (!userId) {
    return NextResponse.json({ error: 'Missing legacy user context' }, { status: 401 })
  }

  return proxyToExisting(req, {
    targetPath: '/api/legacy/draft-war-room',
    query: {
      leagueId: params.leagueId,
      userId,
      draftId: req.nextUrl.searchParams.get('draftId') || `draft_${params.leagueId}_rookie`,
      overallPick: req.nextUrl.searchParams.get('overallPick') || 1,
      round: req.nextUrl.searchParams.get('round') || 1,
      includeSimulation: true,
      includePredictedPicksAhead: true,
    },
  })
}
