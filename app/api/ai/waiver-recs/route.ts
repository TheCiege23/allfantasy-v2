import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueAccess, requireSleeper } from '@/lib/ai/league-settings-ai/access'
import { callClaudeJson } from '@/lib/ai/league-settings-ai/claude'
import {
  fetchPlayersMap,
  fetchSleeperLeagueBundle,
  fetchTrendingAdds,
  nameForPlayer,
  rosterForOwner,
} from '@/lib/ai/league-settings-ai/sleeper'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const sessionUserId = session?.user?.id
  if (!sessionUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { leagueId?: string; userId?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId.trim() : ''
  const targetUserId = typeof body.userId === 'string' ? body.userId.trim() : sessionUserId
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })
  }

  const league = await assertLeagueAccess(leagueId, sessionUserId)
  if (!league) {
    return NextResponse.json({ error: 'League not found or forbidden' }, { status: 403 })
  }

  if (targetUserId !== sessionUserId && league.userId !== sessionUserId) {
    return NextResponse.json({ error: 'Cannot run waivers for another user' }, { status: 403 })
  }

  const sleeperId = requireSleeper(league)
  if (!sleeperId) {
    return NextResponse.json({ error: 'Waiver recommendations require a Sleeper-synced league' }, { status: 400 })
  }

  try {
    const bundle = await fetchSleeperLeagueBundle(sleeperId)
    const playersMap = await fetchPlayersMap(bundle.sport)
    const teams = await prisma.leagueTeam.findMany({
      where: { leagueId },
      select: { platformUserId: true, claimedByUserId: true },
    })
    const sleeperUserId =
      teams.find((t) => t.claimedByUserId === targetUserId)?.platformUserId ?? null
    if (!sleeperUserId) {
      return NextResponse.json({ error: 'No Sleeper user linked to this manager in the league' }, { status: 400 })
    }

    const myRoster = rosterForOwner(bundle.rosters, sleeperUserId)
    const myPlayerIds = [...new Set([...(myRoster?.starters ?? []), ...(myRoster?.players ?? [])])].filter(Boolean)
    const myRosterNames = myPlayerIds.slice(0, 40).map((id) => ({
      id,
      name: nameForPlayer(playersMap, id),
      pos: playersMap[id]?.position ?? '',
    }))

    const trending = await fetchTrendingAdds(bundle.sport, 15)
    const trendingNames = trending
      .map((t) => (t.player_id ? nameForPlayer(playersMap, t.player_id) : null))
      .filter(Boolean)

    const system = `You are Chimmy, AllFantasy's waiver wire assistant. Identify roster weaknesses using the roster sample and suggest realistic adds using trending names. Respond with ONLY valid JSON (no markdown):
{"recommendations":[{"addPlayer":string,"dropPlayer":string,"rationale":string}]}
Provide up to 5 objects. dropPlayer should name a realistic cut from the user's roster; if unclear use "bench stash".`

    const userPayload = `League: ${String(bundle.league.name ?? '')} (${bundle.sport})\nMy roster (sample):\n${JSON.stringify(myRosterNames, null, 2)}\n\nTrending adds / available buzz (names only):\n${JSON.stringify(trendingNames, null, 2)}`

    const raw = await callClaudeJson({ system, user: userPayload })
    return NextResponse.json(raw)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Waiver recommendations failed'
    console.error('[api/ai/waiver-recs]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
