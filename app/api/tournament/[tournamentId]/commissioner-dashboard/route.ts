/**
 * GET: Aggregated data for the Tournament Commissioner Dashboard (legacy tournaments).
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DEFAULT_TOURNAMENT_SETTINGS } from '@/lib/tournament-mode/constants'
import type { TournamentSettings } from '@/lib/tournament-mode/types'
import { computeLeagueCount } from '@/lib/tournament-mode/TournamentCreationService'
import { TOURNAMENT_TEAMS_PER_LEAGUE } from '@/lib/tournament-mode/tournament-sport-cutoffs'
import {
  getLegacyTournamentAccess,
  canViewCommissionerDashboard,
} from '@/lib/tournament/legacyTournamentAccess'
import { EntitlementResolver } from '@/lib/subscription/EntitlementResolver'
import { TokenBalanceResolver } from '@/lib/tokens/TokenBalanceResolver'
import { resolveAfPlanFromEntitlement } from '@/lib/tournament/resolve-af-plan-from-subscription'
import { parseAiAutomationV1 } from '@/lib/tournament/ai-automation-hub'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function mergeSettings(raw: unknown): TournamentSettings {
  const patch =
    typeof raw === 'object' && raw !== null && !Array.isArray(raw) ? (raw as Partial<TournamentSettings>) : {}
  return { ...DEFAULT_TOURNAMENT_SETTINGS, ...patch }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> },
) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string; email?: string | null }
  } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params

  const access = await getLegacyTournamentAccess(userId, tournamentId)
  if (!canViewCommissionerDashboard(access)) {
    return NextResponse.json({ error: 'Commissioner access required' }, { status: 403 })
  }

  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: {
      id: true,
      name: true,
      sport: true,
      season: true,
      status: true,
      settings: true,
      hubSettings: true,
      createdAt: true,
      lockedAt: true,
      creatorId: true,
    },
  })
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const entitlementResolver = new EntitlementResolver()
  const tokenBalanceResolver = new TokenBalanceResolver()
  const [entitlementSnapshot, tokenBalance] = await Promise.all([
    entitlementResolver.resolveSnapshot(userId, session?.user?.email),
    tokenBalanceResolver.resolveForUser(userId, session?.user?.email),
  ])
  const afPlan = resolveAfPlanFromEntitlement(entitlementSnapshot.plans, entitlementSnapshot.status)

  const settings = mergeSettings(tournament.settings)
  const hub = (tournament.hubSettings as Record<string, unknown>) ?? {}

  const [rounds, leagueRows, participantTotal, eliminatedCount, activeParticipantCount] = await Promise.all([
    prisma.legacyTournamentRound.findMany({
      where: { tournamentId },
      orderBy: { roundIndex: 'asc' },
    }),
    prisma.legacyTournamentLeague.findMany({
      where: { tournamentId },
      include: {
        league: { select: { id: true, name: true, leagueSize: true, settings: true } },
        conference: { select: { name: true } },
      },
    }),
    prisma.legacyTournamentParticipant.count({ where: { tournamentId } }),
    prisma.legacyTournamentParticipant.count({ where: { tournamentId, status: 'eliminated' } }),
    prisma.legacyTournamentParticipant.count({ where: { tournamentId, status: 'active' } }),
  ])

  let waitlistCount = 0
  try {
    waitlistCount = await prisma.legacyTournamentWaitlistEntry.count({ where: { tournamentId } })
  } catch {
    waitlistCount = 0
  }

  const rosterCounts =
    leagueRows.length > 0
      ? await Promise.all(
          leagueRows.map((row) =>
            prisma.roster.count({ where: { leagueId: row.leagueId } }).catch(() => 0),
          ),
        )
      : []

  let totalFilled = 0
  let totalCapacity = 0
  const feederLeagues = leagueRows.map((row, i) => {
    const cap = row.league.leagueSize ?? TOURNAMENT_TEAMS_PER_LEAGUE
    const n = rosterCounts[i] ?? 0
    totalFilled += n
    totalCapacity += cap
    const ls = (row.league.settings as Record<string, unknown> | null) ?? {}
    const inviteCode = typeof ls.inviteCode === 'string' ? ls.inviteCode : ''
    const joinUrl = typeof ls.inviteLink === 'string' ? ls.inviteLink : ''
    return {
      tournamentLeagueId: row.id,
      leagueId: row.leagueId,
      name: row.league.name,
      conferenceName: row.conference?.name ?? 'Conference',
      filledSlots: n,
      capacity: cap,
      shell: {
        homepage: true,
        leagueChat: true,
        draftBoard: true,
        rosterShell: true,
      },
      inviteCode,
      joinUrl,
    }
  })

  const poolSize = settings.participantPoolSize
  const leagueCount = computeLeagueCount(poolSize, TOURNAMENT_TEAMS_PER_LEAGUE)

  const qualRound = rounds.find((r) => r.phase === 'qualification') ?? rounds[0]

  return NextResponse.json({
    tournament: {
      id: tournament.id,
      name: tournament.name,
      sport: tournament.sport,
      season: tournament.season,
      status: tournament.status,
      lockedAt: tournament.lockedAt?.toISOString() ?? null,
      createdAt: tournament.createdAt.toISOString(),
    },
    settingsSnapshot: {
      participantPoolSize: settings.participantPoolSize,
      qualificationWeeks: settings.qualificationWeeks,
      draftType: settings.draftType,
      roundRedraftSchedule: settings.roundRedraftSchedule,
      finalsRedraftEnabled: settings.finalsRedraftEnabled,
      bubbleWeekEnabled: settings.bubbleWeekEnabled,
      faabBudgetDefault: settings.faabBudgetDefault,
    },
    hub: {
      visibility: typeof hub.visibility === 'string' ? hub.visibility : settings.universalPageVisibility,
      waitlistEnabled: hub.waitlistEnabled === true,
      maxWaitlist: typeof hub.maxWaitlist === 'number' ? hub.maxWaitlist : null,
      /** Default: all rankings may join unless commissioner sets `rank_bands` or `invite_only`. */
      eligibilityMode: typeof hub.eligibilityMode === 'string' ? hub.eligibilityMode : 'open',
      draftScheduleV1:
        hub.draftScheduleV1 != null &&
        typeof hub.draftScheduleV1 === 'object' &&
        !Array.isArray(hub.draftScheduleV1)
          ? hub.draftScheduleV1
          : null,
      aiAutomationV1: parseAiAutomationV1(hub.aiAutomationV1),
    },
    monetization: {
      afPlan,
      afTokensRemaining: Number(tokenBalance.balance ?? 0),
      subscriptionPlans: entitlementSnapshot.plans,
      subscriptionStatus: entitlementSnapshot.status,
    },
    feederLeagues,
    counts: {
      subLeagues: leagueRows.length,
      expectedSubLeagues: leagueCount,
      totalFilledTeams: totalFilled,
      totalEmptySlots: Math.max(0, totalCapacity - totalFilled),
      totalCapacity,
      participants: participantTotal,
      waitlisted: waitlistCount,
      activeParticipants: activeParticipantCount,
      eliminated: eliminatedCount,
    },
    rounds: rounds.map((r) => ({
      id: r.id,
      roundIndex: r.roundIndex,
      phase: r.phase,
      name: r.name,
      startWeek: r.startWeek,
      endWeek: r.endWeek,
      status: r.status,
    })),
    currentPhase: tournament.status,
    scheduleHints: {
      qualificationWeeks: qualRound?.endWeek ?? settings.qualificationWeeks,
      redraftWeeks: settings.roundRedraftSchedule,
    },
  })
}
