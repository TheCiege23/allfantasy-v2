import 'server-only'

import { prisma } from '@/lib/prisma'
import { leagueDisplayName, type SectionState, type UnavailableSection } from './leagueHome'

/**
 * Waivers — "targets, bids and claim order, priced against this league's FAAB
 * and your holes".
 *
 * The handoff writes the honesty rule for this screen into the design itself:
 * "Some platforms don't publish remaining FAAB. When that happens AllFantasy
 * says so." That case is REAL — 735 of 1,032 stored rosters carry
 * faabRemaining, so roughly three in ten genuinely cannot show a budget — and it
 * is handled as the design asks rather than defaulted to $0, which would read as
 * "you have nothing to bid" instead of "we do not know what you have".
 *
 * What is real: your FAAB, your waiver priority, how you rank on budget against
 * the rest of the league, and how many players you hold.
 *
 * What is not: suggested claims. Ranking targets by confidence needs projections
 * and rostered-percentage data, neither of which is ingested, and a bid figure
 * invented without them would be the most actionable wrong number on the screen.
 */

export type WaiverBudget = {
  faabRemaining: number
  /** Rank among league rosters by budget left, 1 = most. */
  rankByBudget: number | null
  leagueRosters: number
  /** How many rosters in this league publish a budget at all. */
  rostersWithBudget: number
}

export type WaiversData = {
  league: { id: string; name: string; platform: string; format: string | null }
  budget: SectionState<WaiverBudget>
  waiverPriority: SectionState<{ priority: number; leagueRosters: number }>
  rosterLoad: SectionState<{ playersHeld: number; starters: number; bench: number; reserve: number }>
  claimsQueued: SectionState<{ count: number; committed: number | null }>
  waiverType: UnavailableSection
  processTime: UnavailableSection
  suggestedClaims: UnavailableSection
}

export async function getWaiversData(leagueId: string, userId: string): Promise<WaiversData | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, name: true, platform: true, leagueType: true },
  })
  if (!league) return null

  const base = {
    league: {
      id: league.id,
      name: leagueDisplayName(league.name),
      platform: String(league.platform ?? 'manual').toLowerCase(),
      format: league.leagueType ?? null,
    },
    waiverType: {
      available: false as const,
      reason: 'this league’s waiver settings are not ingested, so we cannot say whether it runs FAAB or rolling priority',
    },
    processTime: {
      available: false as const,
      reason: 'the waiver run time is not ingested for this league',
    },
    suggestedClaims: {
      available: false as const,
      reason:
        'ranking targets needs weekly projections and rostered-percentage data; neither is ingested, and a suggested bid without them would be a number to act on that nothing supports',
    },
  }

  const myTeam = await prisma.leagueTeam.findFirst({
    where: { leagueId, claimedByUserId: userId },
    select: { platformUserId: true, externalId: true },
  })

  const candidates = [myTeam?.platformUserId, myTeam?.externalId].filter(Boolean) as string[]

  const allRosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { platformUserId: true, faabRemaining: true, waiverPriority: true, playerData: true },
  })

  const mine =
    candidates.length > 0
      ? allRosters.find((r) => candidates.includes(r.platformUserId)) ?? null
      : null

  if (!mine) {
    const unknown = {
      available: false as const,
      reason: 'we cannot tell which roster in this league is yours',
    }
    return {
      ...base,
      budget: unknown,
      waiverPriority: unknown,
      rosterLoad: unknown,
      claimsQueued: unknown,
    }
  }

  const withBudget = allRosters.filter((r) => r.faabRemaining != null)

  const budget: SectionState<WaiverBudget> =
    mine.faabRemaining == null
      ? {
          available: false,
          // Exactly the case the handoff calls out. NOT defaulted to 0 — "$0"
          // reads as "you have nothing to bid", which is a different claim from
          // "we do not know what you have".
          reason:
            'your platform does not publish remaining FAAB for this league, so we cannot show a budget — this is not the same as having none',
        }
      : {
          available: true,
          data: {
            faabRemaining: mine.faabRemaining,
            rankByBudget:
              withBudget.length > 0
                ? withBudget
                    .slice()
                    .sort((a, b) => (b.faabRemaining ?? 0) - (a.faabRemaining ?? 0))
                    .findIndex((r) => r.platformUserId === mine.platformUserId) + 1
                : null,
            leagueRosters: allRosters.length,
            rostersWithBudget: withBudget.length,
          },
        }

  const waiverPriority: SectionState<{ priority: number; leagueRosters: number }> =
    mine.waiverPriority == null
      ? {
          available: false,
          reason: 'this league does not publish a waiver priority, or runs blind bidding instead',
        }
      : { available: true, data: { priority: mine.waiverPriority, leagueRosters: allRosters.length } }

  const pd = (mine.playerData ?? {}) as Record<string, unknown>
  const count = (v: unknown) => (Array.isArray(v) ? v.filter((x) => String(x) !== '0').length : 0)
  const players = count(pd.players)
  const starters = count(pd.starters)
  const reserve = count(pd.reserve) + count(pd.taxi)

  const rosterLoad: SectionState<{
    playersHeld: number
    starters: number
    bench: number
    reserve: number
  }> =
    players + starters + reserve === 0
      ? { available: false, reason: 'no roster contents stored for your team' }
      : {
          available: true,
          data: {
            playersHeld: players,
            starters,
            // `players` is the catch-all list, so bench is what is not starting.
            bench: Math.max(0, players - starters),
            reserve,
          },
        }

  const claimCount = await prisma.waiverClaim
    .count({ where: { roster: { leagueId, platformUserId: mine.platformUserId } } })
    .catch(() => null)

  const claimsQueued: SectionState<{ count: number; committed: number | null }> =
    claimCount == null
      ? { available: false, reason: 'waiver claims are not ingested for this league' }
      : { available: true, data: { count: claimCount, committed: null } }

  return { ...base, budget, waiverPriority, rosterLoad, claimsQueued }
}
