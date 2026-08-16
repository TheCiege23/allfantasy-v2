import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { getDashboardLeagueListForUser } from '@/lib/dashboard/get-dashboard-league-list'
import { deriveOutstandingIssues } from '@/lib/core-app/outstandingIssues'
import { describeAge } from '@/lib/sports-data/freshnessPolicy'
import AfCoreShell, { type CoreNavKey, type RailLeague } from '@/components/core-app/AfCoreShell'
import type { UserLeague } from '@/app/dashboard/types'
import DashboardAllLeagues from '@/components/core-app/screens/DashboardAllLeagues'
import LeagueHome from '@/components/core-app/screens/LeagueHome'
import { getLeagueHomeData } from '@/lib/core-app/leagueHome'
import PlayerFinder from '@/components/core-app/screens/PlayerFinder'
import { searchPlayers, getPlayerDetail } from '@/lib/core-app/playerFinder'
import MyTeam from '@/components/core-app/screens/MyTeam'
import { getMyTeamData } from '@/lib/core-app/myTeam'
import Matchup from '@/components/core-app/screens/Matchup'
import { getMatchupData } from '@/lib/core-app/matchup'
import Trades from '@/components/core-app/screens/Trades'
import { getTradesData } from '@/lib/core-app/trades'
import Waivers from '@/components/core-app/screens/Waivers'
import { getWaiversData } from '@/lib/core-app/waivers'
import DraftHq from '@/components/core-app/screens/DraftHq'
import { getDraftHqData } from '@/lib/core-app/draftHq'

export const dynamic = 'force-dynamic'

/**
 * AF Core — every screen from the design handoff, behind ONE route.
 *
 * An optional catch-all rather than nine sibling routes on purpose: this repo
 * sits against Vercel's hard 2048-route ceiling (see
 * scripts/vercel-next-build.cjs), and nine page routes for one product surface
 * is exactly the kind of spend that pushed it there. `/core`, `/core/players`,
 * `/core/my-team` and the rest all resolve here and cost one route between them.
 *
 * Screens land incrementally. Anything not yet built renders an explicit
 * "not built yet" panel instead of a blank page or a redirect, so the nav is
 * honest about what exists.
 */

const SCREEN_KEYS: Record<string, CoreNavKey> = {
  '': 'home',
  players: 'players',
  'my-team': 'my-team',
  matchup: 'matchup',
  trades: 'trades',
  waivers: 'waivers',
  'war-room': 'war-room',
  'draft-hq': 'draft-hq',
  portfolio: 'portfolio',
  career: 'career',
  rankings: 'rankings',
  commissioner: 'commissioner',
  tools: 'tools',
}

const PLATFORM_MARK: Record<string, string> = {
  sleeper: 'S',
  espn: 'E',
  yahoo: 'Y',
  cbs: 'C',
  mfl: 'M',
  fantrax: 'F',
}

export default async function AfCorePage({
  params,
  searchParams,
}: {
  params: Promise<{ screen?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { screen } = await params
  const sp = await searchParams
  const selectedLeagueId = typeof sp.league === 'string' ? sp.league : null
  const playerQuery = typeof sp.q === 'string' ? sp.q : ''
  const selectedPlayerId = typeof sp.player === 'string' ? sp.player : null
  const segment = (screen?.[0] ?? '').toLowerCase()
  const navKey = SCREEN_KEYS[segment]

  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/core${segment ? `/${segment}` : ''}`)}`)
  }

  // Unknown segment: fall back to home rather than 404ing a nav link.
  const activeKey: CoreNavKey = navKey ?? 'home'

  // getDashboardLeagueListForUser returns { leagues, sleeperUserId } — NOT an
  // array — and types its leagues as `unknown[]`, so nothing stops a caller from
  // mapping the payload itself. The dashboard page casts the same way.
  const leagueListPayload = await getDashboardLeagueListForUser(userId).catch(() => null)
  const leagues = (leagueListPayload?.leagues ?? []) as unknown as UserLeague[]

  const rail: RailLeague[] = leagues.map((l) => ({
    id: l.id,
    name: l.name,
    platform: String(l.platform ?? 'manual').toLowerCase(),
    mark: PLATFORM_MARK[String(l.platform ?? '').toLowerCase()] ?? l.name.charAt(0).toUpperCase(),
  }))

  const { issues, detectorsUnavailable } = deriveOutstandingIssues({ leagues })

  // Screen 2 is the same route with a league selected — the handoff describes it
  // as the main column becoming "that league's world", not a separate page.
  const leagueHome =
    activeKey === 'home' && selectedLeagueId
      ? await getLeagueHomeData(selectedLeagueId, userId).catch(() => null)
      : null

  // Player Finder searches and selects entirely through query params — no client
  // fetch and no new API route, which matters because the repo is at the route
  // ceiling and a search box is not worth a route.
  const playerMatches = activeKey === 'players' ? await searchPlayers(playerQuery).catch(() => []) : []
  const playerDetail =
    activeKey === 'players' && selectedPlayerId
      ? await getPlayerDetail(
          selectedPlayerId,
          leagues.map((l) => l.id)
        ).catch(() => null)
      : null

  // My team needs a league in context; without one the screen says which league
  // to pick rather than guessing at the user's "main" league.
  const myTeam =
    activeKey === 'my-team' && selectedLeagueId
      ? await getMyTeamData(selectedLeagueId, userId).catch(() => null)
      : null

  const matchup =
    activeKey === 'matchup' && selectedLeagueId
      ? await getMatchupData(selectedLeagueId, userId).catch(() => null)
      : null

  const trades =
    activeKey === 'trades' && selectedLeagueId
      ? await getTradesData(selectedLeagueId, userId).catch(() => null)
      : null

  const waivers =
    activeKey === 'waivers' && selectedLeagueId
      ? await getWaiversData(selectedLeagueId, userId).catch(() => null)
      : null

  const draftHq =
    activeKey === 'draft-hq' && selectedLeagueId
      ? await getDraftHqData(selectedLeagueId, userId).catch(() => null)
      : null

  // The shell requires a sync age, so it cannot render without one being decided.
  // Null here means "never synced", which describeAge renders as stale — the
  // honest reading until a per-league sync timestamp is wired through.
  const syncAge = describeAge('roster', null)

  const now = new Date()

  return (
    <AfCoreShell
      active={activeKey}
      leagues={rail}
      syncAge={{ label: syncAge.label, stale: syncAge.stale }}
      selectedLeagueId={selectedLeagueId}
      weekLabel={null}
      plan={null}
    >
      {leagueHome ? (
        <LeagueHome
          data={leagueHome}
          otherLeagueIssueCount={issues.filter((i) => i.leagueId !== leagueHome.league.id).length}
        />
      ) : activeKey === 'my-team' ? (
        myTeam ? (
          <MyTeam data={myTeam} />
        ) : (
          <div className="af-frame" style={{ padding: 24, maxWidth: 720 }}>
            <h1 className="af-display" style={{ margin: 0, fontSize: 22, letterSpacing: '-0.03em' }}>
              My team
            </h1>
            <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>
              Pick a league from the rail to see your lineup. This screen is scoped to one league —
              your roster, slots and lock time only mean something inside a single league&apos;s rules.
            </p>
          </div>
        )
      ) : activeKey === 'matchup' ? (
        matchup ? (
          <Matchup data={matchup} />
        ) : (
          <div className="af-frame" style={{ padding: 24, maxWidth: 720 }}>
            <h1 className="af-display" style={{ margin: 0, fontSize: 22, letterSpacing: '-0.03em' }}>
              Matchup
            </h1>
            <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>
              Pick a league from the rail to see its matchup. A head-to-head only means something
              inside one league&apos;s schedule and scoring.
            </p>
          </div>
        )
      ) : activeKey === 'trades' ? (
        trades ? (
          <Trades data={trades} />
        ) : (
          <div className="af-frame" style={{ padding: 24, maxWidth: 720 }}>
            <h1 className="af-display" style={{ margin: 0, fontSize: 22, letterSpacing: '-0.03em' }}>
              Trades
            </h1>
            <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>
              Pick a league from the rail. Every trade grade is scored against one league&apos;s own
              scoring and roster rules, so trades only mean something inside a league.
            </p>
          </div>
        )
      ) : activeKey === 'waivers' ? (
        waivers ? (
          <Waivers data={waivers} />
        ) : (
          <div className="af-frame" style={{ padding: 24, maxWidth: 720 }}>
            <h1 className="af-display" style={{ margin: 0, fontSize: 22, letterSpacing: '-0.03em' }}>
              Waivers
            </h1>
            <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>
              Pick a league from the rail. FAAB, waiver order and bid pricing are all per-league.
            </p>
          </div>
        )
      ) : activeKey === 'draft-hq' ? (
        draftHq ? (
          <DraftHq data={draftHq} />
        ) : (
          <div className="af-frame" style={{ padding: 24, maxWidth: 720 }}>
            <h1 className="af-display" style={{ margin: 0, fontSize: 22, letterSpacing: '-0.03em' }}>
              Draft HQ
            </h1>
            <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>
              Pick a league from the rail. Draft order, pick slots and board settings are all
              per-league.
            </p>
          </div>
        )
      ) : activeKey === 'players' ? (
        <PlayerFinder
          query={playerQuery}
          matches={playerMatches}
          detail={playerDetail}
          leagueCount={leagues.length}
        />
      ) : activeKey === 'home' ? (
        <DashboardAllLeagues
          issues={issues}
          detectorsUnavailable={detectorsUnavailable}
          leagueCount={leagues.length}
          now={now.toISOString()}
        />
      ) : (
        <div className="af-frame" style={{ padding: 24, maxWidth: 720 }}>
          <h1 className="af-display" style={{ margin: 0, fontSize: 22, letterSpacing: '-0.03em' }}>
            {activeKey.replace(/-/g, ' ')}
          </h1>
          <p style={{ marginTop: 8, fontSize: 13, lineHeight: 1.5, color: 'var(--muted)' }}>
            This screen is part of the core-app redesign and has not been built yet. It is listed in
            the nav so the shell matches the design, and says so rather than rendering an empty page.
          </p>
        </div>
      )}
    </AfCoreShell>
  )
}
