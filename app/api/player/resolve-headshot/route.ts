/**
 * /api/player/resolve-headshot — server-side player-headshot resolver.
 *
 * Wraps `lib/player-assets/resolvePlayerHeadshot.ts` for callers (Roster /
 * Players-Waivers / Trades / Matchups) that want the full provider chain
 * (TheSportsDB → ClearSports → Sleeper for NFL; UI then falls through to ESPN
 * when an `espnId` already exists on the client)
 * resolved on the server, where the provider keys live.
 *
 * Auth: requires a signed-in user (`getServerSession`). Headshots are public
 * data but the resolver hits external APIs and the SportsPlayer DB cache —
 * gating to authenticated sessions prevents anonymous callers from
 * fan-out-walking provider rate limits.
 *
 * Phase 1: non-persistent. The resolver returns a fresh URL per call without
 * writing back to a `Player.headshotUrl` (no schema field at this branch).
 * Phase 2 should add Prisma persistence + a server-side cache key once the
 * schema lands.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  resolvePlayerHeadshot,
  type ResolveHeadshotResult,
} from '@/lib/player-assets/resolvePlayerHeadshot'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type ResolveHeadshotResponseBody = {
  headshotUrl: string | null
  source: ResolveHeadshotResult['source']
  fallbackUsed: boolean
  confidence: ResolveHeadshotResult['confidence']
}

async function handle(req: NextRequest): Promise<NextResponse> {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const name = (url.searchParams.get('name') ?? '').trim()
  const sport = (url.searchParams.get('sport') ?? 'NFL').trim().toUpperCase()
  const team = url.searchParams.get('team')?.trim() || null
  const position = url.searchParams.get('position')?.trim() || null
  const sleeperId = url.searchParams.get('sleeperId')?.trim() || null
  const sportsDbId = url.searchParams.get('sportsDbId')?.trim() || null

  if (!name) {
    return NextResponse.json(
      { error: 'name is required' },
      { status: 400 },
    )
  }

  try {
    const result = await resolvePlayerHeadshot({
      name,
      sport,
      team,
      position,
      externalIds: {
        sleeperId,
        sportsDbId,
      },
    })
    const body: ResolveHeadshotResponseBody = {
      headshotUrl: result.imageUrl,
      source: result.source,
      fallbackUsed: result.source !== 'none' && result.confidence !== 'exact',
      confidence: result.confidence,
    }
    return NextResponse.json(body, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { headshotUrl: null, source: 'none', fallbackUsed: false, confidence: 'none', error: message },
      { status: 500 },
    )
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  return handle(req)
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handle(req)
}
