'use client'

/**
 * NFL redraft league dashboard — Playwright harness.
 *
 * Mounts the real `LeagueShell` with a deterministic NFL-redraft fixture so
 * Playwright can verify the Phase 1 settings-gear consolidation (Commit B):
 *   - Tab bar shows exactly the 6 core tabs (no settings/history/war_room).
 *   - Settings gear is visible in the header.
 *   - Clicking the gear opens the league settings modal.
 *   - Audit Log + League History cards render in the modal General grid.
 *   - Commissioner controls are reachable for commissioner fixture users.
 *
 * No real DB / auth / Sleeper data — all props are stubbed in-memory.
 * Internal fetches inside LeagueShell (e.g. /idp/config, /league/settings)
 * are tolerated; they 404 in dev and the shell renders the dashboard anyway.
 */

import type { League, LeagueInvite, LeagueTeam } from '@prisma/client'
import { LeagueShell } from '@/app/league/[leagueId]/LeagueShell'
import type { LeagueDashboardView } from '@/app/league/[leagueId]/league-dashboard-types'

const FIXTURE_LEAGUE_ID = 'e2e-nfl-redraft-fixture'
const FIXTURE_USER_ID = 'e2e-commissioner'
const FIXTURE_USER_NAME = 'E2E Commissioner'

/**
 * Minimal League fixture. Casting through `unknown` is intentional — the real
 * Prisma row has dozens of nullable settings fields (waiver/playoff/IDP/devy
 * defaults) that the rendered code path doesn't read for the gear / tab-bar
 * assertions Commit B's Playwright smoke covers.
 */
const fixtureLeague = {
  id: FIXTURE_LEAGUE_ID,
  userId: FIXTURE_USER_ID,
  platform: 'allfantasy',
  platformLeagueId: FIXTURE_LEAGUE_ID,
  name: 'E2E NFL Redraft',
  sport: 'NFL',
  season: 2026,
  leagueSize: 12,
  scoring: 'half_ppr',
  isDynasty: false,
  rosterSize: 16,
  status: 'pre_draft',
  settings: {},
  leagueType: 'redraft',
  leagueVariant: null,
  bestBallMode: false,
  guillotineMode: false,
  keeperPhaseActive: false,
  isCommissioner: true,
  lifecycleState: 'pre_draft',
  teams: [] as LeagueTeam[],
  invites: [] as LeagueInvite[],
  rosters: [],
} as unknown as League & {
  teams: LeagueTeam[]
  invites: LeagueInvite[]
  rosters?: { platformUserId: string; faabRemaining: number | null; waiverPriority: number | null }[]
}

const fixtureLeagueDashboard: LeagueDashboardView = {
  settingsRows: [],
  standings: { mode: 'standard' },
  scoring: null,
}

export default function NflRedraftLeagueDashboardHarnessClient() {
  return (
    <div data-testid="nfl-redraft-league-dashboard-harness" className="min-h-screen bg-[#060b18] text-white">
      <LeagueShell
        league={fixtureLeague}
        userTeam={null}
        isOwner
        isCommissioner
        isHeadCommissioner
        allLeagues={[fixtureLeague]}
        userId={FIXTURE_USER_ID}
        userName={FIXTURE_USER_NAME}
        userImage={null}
        draftDateIso={null}
        sleeperCommissionerId={null}
        sleeperUsersByPlatformId={{}}
        currentSleeperUserId={null}
        leagueDashboard={fixtureLeagueDashboard}
      />
    </div>
  )
}
