import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueAccess, requireSleeper } from '@/lib/ai/league-settings-ai/access'
import { callClaudeJson } from '@/lib/ai/league-settings-ai/claude'
import {
  fetchPlayersMap,
  fetchSleeperLeagueBundle,
  fetchMatchups,
  nameForPlayer,
  readSleeperStateWeek,
} from '@/lib/ai/league-settings-ai/sleeper'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const sessionUserId = session?.user?.id
  if (!sessionUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { leagueId?: string; week?: number; userId?: string }
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
    return NextResponse.json({ error: 'Cannot preview matchups for another user' }, { status: 403 })
  }

  const sleeperId = requireSleeper(league)
  if (!sleeperId) {
    return NextResponse.json({ error: 'Matchup preview requires a Sleeper-synced league' }, { status: 400 })
  }

  try {
    const bundle = await fetchSleeperLeagueBundle(sleeperId)
    const stateWeek = readSleeperStateWeek(bundle.state) ?? NaN
    const week =
      typeof body.week === 'number' && body.week > 0
        ? body.week
        : Number.isFinite(stateWeek)
          ? stateWeek
          : 1

    const teams = await prisma.leagueTeam.findMany({
      where: { leagueId },
      select: { platformUserId: true, claimedByUserId: true },
    })
    const sleeperUserId =
      teams.find((t) => t.claimedByUserId === targetUserId)?.platformUserId ?? null
    if (!sleeperUserId) {
      return NextResponse.json({ error: 'No Sleeper user linked to this manager' }, { status: 400 })
    }

    const myRoster = bundle.rosters.find((r) => r.owner_id === sleeperUserId)
    const myRid = myRoster?.roster_id

    const matchups = await fetchMatchups(sleeperId, week)
    const mine = (Array.isArray(matchups) ? matchups : []).find((m) => m.roster_id === myRid)
    const opp = (Array.isArray(matchups) ? matchups : []).find(
      (m) => m.matchup_id === mine?.matchup_id && m.roster_id !== myRid
    )

    const playersMap = await fetchPlayersMap(bundle.sport)
    const users = bundle.users
    const rosterLineup = (r: (typeof bundle.rosters)[0] | undefined) => {
      const starters = r?.starters ?? []
      return starters.map((pid) => ({
        name: nameForPlayer(playersMap, String(pid)),
        pos: playersMap[String(pid)]?.position ?? '',
      }))
    }

    const myTeam = users.find((u) => u.user_id === sleeperUserId)
    const oppOwner = opp
      ? bundle.rosters.find((x) => x.roster_id === opp.roster_id)?.owner_id
      : null
    const oppUser = oppOwner ? users.find((u) => u.user_id === oppOwner) : null

    const myR = bundle.rosters.find((x) => x.roster_id === myRid)
    const oppR = bundle.rosters.find((x) => x.roster_id === opp?.roster_id)

    const snapshot = {
      week,
      myTeam: myTeam?.metadata?.team_name || myTeam?.display_name || 'My team',
      oppTeam: oppUser?.metadata?.team_name || oppUser?.display_name || 'Opponent',
      myProjectedLineup: rosterLineup(myR),
      oppProjectedLineup: rosterLineup(oppR),
      myPointsSoFar: mine?.points,
      oppPointsSoFar: opp?.points,
    }

    const system = `You are Chimmy, AllFantasy's matchup strategist. Using the snapshot (points may be partial if mid-week), estimate outlook and lineup tweaks. Respond with ONLY valid JSON (no markdown):
{"winProbability":number,"keyMatchups":string[],"lineupRecommendation":string}
winProbability is 0-100 for the requesting manager. keyMatchups are short bullets (e.g. positional edges).`

    const userPayload = `League: ${String(bundle.league.name ?? '')} (${bundle.sport})\n${JSON.stringify(snapshot, null, 2)}`

    const raw = await callClaudeJson({ system, user: userPayload })
    return NextResponse.json(raw)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Matchup preview failed'
    console.error('[api/ai/matchup-preview]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
