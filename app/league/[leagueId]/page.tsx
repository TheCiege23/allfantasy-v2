import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getLeagueRole } from '@/lib/league/permissions'
import { resolveDashboardAvatarUrl } from '@/lib/dashboard/resolve-dashboard-avatar'
import { LeagueShell } from './LeagueShell'
import type { LeagueSeasonSnapshot } from '@/lib/league/sort-teams-standings'
import { buildLeagueDashboardView } from '@/lib/league/league-dashboard-view'
import type { LeagueDashboardView } from './league-dashboard-types'

export const dynamic = 'force-dynamic'

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ leagueId: string }>
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}) {
  const { leagueId } = await params
  const sp = searchParams ? await searchParams : {}
  const zc = sp.zombieChimmy
  const zombieChimmyPrefill = typeof zc === 'string' ? zc : Array.isArray(zc) ? zc[0] ?? null : null
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string; name?: string | null; email?: string | null; image?: string | null }
  } | null

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/league/${leagueId}`)}`)
  }

  const userId = session.user.id

  const defaultLeagueDashboardView: LeagueDashboardView = {
    settingsRows: [],
    standings: { mode: 'standard' },
    scoring: null,
  }

  let league = await prisma.league
    .findFirst({
      where: { id: leagueId },
      include: {
        teams: { orderBy: { externalId: 'asc' } },
        rosters: { select: { platformUserId: true, faabRemaining: true, waiverPriority: true } },
        invites: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })
    .catch((err) => {
      console.error('[league page] league lookup failed', { leagueId, err })
      return null
    })

  // My Leagues may use `SleeperLeague.id` when no unified `League` row exists yet — resolve to canonical League.
  if (!league) {
    const sleeperOnly = await prisma.sleeperLeague
      .findFirst({
        where: { id: leagueId, userId },
        select: { sleeperLeagueId: true },
      })
      .catch((err) => {
        console.error('[league page] sleeperLeague lookup failed', { leagueId, err })
        return null
      })
    if (sleeperOnly?.sleeperLeagueId) {
      const unified = await prisma.league
        .findFirst({
          where: {
            platform: 'sleeper',
            platformLeagueId: sleeperOnly.sleeperLeagueId,
            userId,
          },
          orderBy: { season: 'desc' },
          select: { id: true },
        })
        .catch((err) => {
          console.error('[league page] unified league resolve failed', { leagueId, err })
          return null
        })
      if (unified?.id && unified.id !== leagueId) {
        redirect(`/league/${unified.id}`)
      }
    }
    redirect('/dashboard')
  }

  // Redirect tournament feeder leagues to tournament hub
  const leagueSettings = league.settings && typeof league.settings === 'object' ? league.settings as Record<string, unknown> : {}
  if (leagueSettings.league_type === 'tournament' && typeof leagueSettings.tournamentId === 'string') {
    const tournamentId = leagueSettings.tournamentId
    redirect(`/tournament/${tournamentId}`)
  }

  const sleeperCommissionerId =
    league.platform === 'sleeper' && typeof leagueSettings.commissioner_id === 'string'
      ? leagueSettings.commissioner_id
      : null

  let draftDateIso: string | null = null
  const draftDateCandidate =
    leagueSettings.draftDate ??
    leagueSettings.draft_date ??
    leagueSettings.draft_at ??
    leagueSettings.draft_start_time ??
    null
  if (typeof draftDateCandidate === 'string' && draftDateCandidate.trim()) {
    const parsed = Date.parse(draftDateCandidate)
    if (Number.isFinite(parsed)) {
      draftDateIso = new Date(parsed).toISOString()
    }
  } else if (typeof draftDateCandidate === 'number' && Number.isFinite(draftDateCandidate)) {
    const ms = draftDateCandidate > 9_999_999_999 ? draftDateCandidate : draftDateCandidate * 1000
    draftDateIso = new Date(ms).toISOString()
  }

  const isOwner = league.userId === userId
  const userTeam = league.teams.find((t) => t.claimedByUserId === userId) ?? null
  const role = await getLeagueRole(leagueId, userId).catch((err) => {
    console.error('[league page] getLeagueRole failed', { leagueId, userId, err })
    return isOwner ? 'commissioner' : 'member'
  })
  const isCommissioner = role === 'commissioner' || role === 'co_commissioner'
  const isHeadCommissioner = role === 'commissioner'
  if (!isOwner && !userTeam) {
    redirect('/dashboard')
  }

  const allLeagues = await prisma.league
    .findMany({
      where: {
        OR: [{ userId }, { teams: { some: { claimedByUserId: userId } } }],
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    })
    .catch((err) => {
      console.error('[league page] allLeagues query failed', { userId, err })
      return []
    })

  const dbUser = await prisma.appUser
    .findUnique({
      where: { id: userId },
      select: { avatarUrl: true },
    })
    .catch((err) => {
      console.error('[league page] appUser query failed', { userId, err })
      return null
    })
  const userImage = resolveDashboardAvatarUrl(session.user.image, dbUser?.avatarUrl)

  const userProfile = await prisma.userProfile
    .findUnique({
      where: { userId },
      select: { sleeperUserId: true, discordUserId: true },
    })
    .catch((err) => {
      console.error('[league page] userProfile query failed', { userId, err })
      return null
    })
  const currentSleeperUserId = userProfile?.sleeperUserId ?? null
  const sleeperUsersByPlatformId: Record<string, { display_name: string; avatar: string | null }> = {}

  const seasonYear = league.season ?? new Date().getFullYear()
  const leagueSeasonRow = await prisma.leagueSeason
    .findUnique({
      where: { leagueId_season: { leagueId, season: seasonYear } },
      select: { championTeamId: true, teamRecords: true, status: true },
    })
    .catch((err) => {
      console.error('[league page] leagueSeason query failed', { leagueId, seasonYear, err })
      return null
    })
  const seasonSnapshot: LeagueSeasonSnapshot | null = leagueSeasonRow
    ? {
        championTeamId: leagueSeasonRow.championTeamId,
        teamRecords: leagueSeasonRow.teamRecords,
        status: leagueSeasonRow.status,
      }
    : null

  const leagueDashboard = await buildLeagueDashboardView(league).catch((err) => {
    console.error('[league page] buildLeagueDashboardView failed', { leagueId, err })
    return defaultLeagueDashboardView
  })

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <LeagueShell
        league={league}
        userTeam={userTeam}
        isOwner={isOwner}
        isCommissioner={isCommissioner}
        isHeadCommissioner={isHeadCommissioner}
        allLeagues={allLeagues}
        userId={userId}
        userName={session.user.name ?? session.user.email ?? 'Manager'}
        userImage={userImage}
        draftDateIso={draftDateIso}
        sleeperCommissionerId={sleeperCommissionerId}
        sleeperUsersByPlatformId={sleeperUsersByPlatformId}
        currentSleeperUserId={currentSleeperUserId}
        discordConnected={Boolean(userProfile?.discordUserId)}
        zombieChimmyPrefill={zombieChimmyPrefill}
        dispersalDraftInProgress={null}
        seasonSnapshot={seasonSnapshot}
        leagueDashboard={leagueDashboard}
      />
    </div>
  )
}
