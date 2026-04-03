import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueAccess, requireSleeper } from '@/lib/ai/league-settings-ai/access'
import { callClaudeJson } from '@/lib/ai/league-settings-ai/claude'
import {
  fetchPlayersMap,
  fetchSleeperLeagueBundle,
  nameForPlayer,
} from '@/lib/ai/league-settings-ai/sleeper'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { leagueId?: string }
  try {
    body = (await req.json()) as { leagueId?: string }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const leagueId = typeof body.leagueId === 'string' ? body.leagueId.trim() : ''
  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId is required' }, { status: 400 })
  }

  const league = await assertLeagueAccess(leagueId, userId)
  if (!league) {
    return NextResponse.json({ error: 'League not found or forbidden' }, { status: 403 })
  }

  const sleeperId = requireSleeper(league)
  if (!sleeperId) {
    return NextResponse.json({ error: 'Power rankings require a Sleeper-synced league' }, { status: 400 })
  }

  try {
    const bundle = await fetchSleeperLeagueBundle(sleeperId)
    const playersMap = await fetchPlayersMap(bundle.sport)
    const userById = new Map(bundle.users.map((u) => [u.user_id, u]))

    const teams = bundle.rosters
      .filter((r) => r.owner_id)
      .map((r) => {
        const u = userById.get(r.owner_id!)
        const pids = [...(r.starters ?? []), ...(r.players ?? [])].filter(Boolean)
        const uniq = Array.from(new Set(pids)).slice(0, 24)
        const playerNames = uniq.map((id) => nameForPlayer(playersMap, id))
        const wins = r.settings?.wins ?? 0
        const losses = r.settings?.losses ?? 0
        const pts = r.settings?.fpts ?? 0
        return {
          rosterId: r.roster_id,
          teamName: u?.metadata?.team_name?.trim() || u?.display_name || 'Team',
          ownerName: u?.display_name || u?.username || r.owner_id,
          record: `${wins}-${losses}`,
          seasonPoints: pts,
          playersSample: playerNames,
        }
      })

    const leagueName = String(bundle.league.name ?? league.name ?? 'League')
    const season = String(bundle.league.season ?? '')
    const scoring = JSON.stringify(bundle.league.scoring_settings ?? {}, null, 0).slice(0, 4000)

    const system = `You are Chimmy, AllFantasy's fantasy sports analyst. The league runs on Sleeper. You must rank every team from 1 to N (N = number of teams) using roster quality and season points / record as signals. Respond with ONLY valid JSON (no markdown) in this exact shape:
{"rankings":[{"rank":number,"teamName":string,"ownerName":string,"blurb":string}]}
Each blurb is exactly one sentence. League context: sport=${bundle.sport}, season=${season}.`

    const userPayload = `League: ${leagueName}\nScoring snapshot (truncated): ${scoring}\n\nTeams:\n${JSON.stringify(teams, null, 2)}`

    const raw = await callClaudeJson({ system, user: userPayload })
    return NextResponse.json(raw)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Power rankings failed'
    console.error('[api/ai/power-rankings]', e)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
