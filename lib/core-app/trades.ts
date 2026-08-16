import 'server-only'

import { prisma } from '@/lib/prisma'
import { leagueDisplayName, type SectionState, type UnavailableSection } from './leagueHome'

/**
 * Trades — "offer, grade, counter, all scored against this league's own rules".
 *
 * WHAT IS REAL: completed trade history, from dw_transaction_facts. 7,124 trade
 * rows across the imported leagues, each carrying the transaction id, the two
 * roster ids, the season and week, and how many players and picks moved each way.
 *
 * ⚠ WHAT IS NOT IN THAT DATA: WHICH players moved. The payload stores counts
 * (`playersIn: 1, playersOut: 1, picks: 0`), not identities. So a trade can be
 * listed, dated and attributed to two managers — but it cannot be valued, and
 * nothing on this screen may imply otherwise.
 *
 * ⚠ AND THIS IS WHY NO LETTER GRADE IS SHOWN. lib/trade-intel exists and will
 * happily return one, but its own hasNoSignal() documents the trap: when no
 * points are credited to either side, every net is 0, every side lands in the C
 * band, and the engine reports a tie it has not earned. A "C" from this data
 * would mean ZERO DATA while reading as "an average trade". The grade slot is
 * rendered as explicitly ungradable instead — refusing the letter is the whole
 * point, and it is easier to add a real grade later than to retract a wrong one.
 */

export type TradeRecord = {
  transactionId: string
  season: number | null
  week: number | null
  /** Roster ids on each side, as stored. */
  rosterIds: string[]
  yourSide: 'in' | 'out' | 'unknown'
  playersIn: number
  playersOut: number
  picks: number
  partnerTeamName: string | null
  at: Date
}

export type TradesData = {
  league: { id: string; name: string; platform: string }
  /** Grading context the handoff prints above every grade. */
  gradingContext: SectionState<{ leagueName: string; format: string | null; teamCount: number }>
  history: SectionState<TradeRecord[]>
  inbox: UnavailableSection
  sent: UnavailableSection
  grades: UnavailableSection
  deadline: UnavailableSection
}

export async function getTradesData(leagueId: string, userId: string): Promise<TradesData | null> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, name: true, platform: true, leagueType: true },
  })
  if (!league) return null

  const teamCount = await prisma.leagueTeam.count({ where: { leagueId } })

  const base = {
    league: {
      id: league.id,
      name: leagueDisplayName(league.name),
      platform: String(league.platform ?? 'manual').toLowerCase(),
    },
    gradingContext: {
      available: true as const,
      data: { leagueName: leagueDisplayName(league.name), format: league.leagueType ?? null, teamCount },
    },
    // Pending offers are a live platform concept. Nothing ingests them, and a
    // trade screen that shows an empty inbox implies none are waiting.
    inbox: {
      available: false as const,
      reason: 'pending offers are not ingested — open your platform to see anything waiting',
    },
    sent: { available: false as const, reason: 'outgoing offers are not ingested' },
    grades: {
      available: false as const,
      reason:
        'trades are stored as asset COUNTS, not the players involved, so there is nothing to value. A grade computed from this would land every trade in the C band and read as "dead even" when it actually means no data',
    },
    deadline: {
      available: false as const,
      reason: 'this league’s trade deadline is not ingested',
    },
  }

  const myTeam = await prisma.leagueTeam.findFirst({
    where: { leagueId, claimedByUserId: userId },
    select: { externalId: true },
  })

  const facts = await prisma.transactionFact.findMany({
    where: { leagueId, type: 'trade' },
    orderBy: [{ season: 'desc' }, { weekOrPeriod: 'desc' }],
    take: 400,
    select: {
      transactionId: true,
      managerId: true,
      season: true,
      weekOrPeriod: true,
      payload: true,
      createdAt: true,
    },
  })

  if (facts.length === 0) {
    return { ...base, history: { available: false, reason: 'no trades ingested for this league' } }
  }

  const teams = await prisma.leagueTeam.findMany({
    where: { leagueId },
    select: { externalId: true, teamName: true },
  })
  const teamByExternal = new Map(teams.map((t) => [String(t.externalId), t.teamName]))

  // Each trade writes one fact PER SIDE, so collapse on the sleeper transaction
  // id to get one row per trade rather than listing every deal twice.
  const bySleeperTx = new Map<string, typeof facts>()
  for (const f of facts) {
    const payload = (f.payload ?? {}) as Record<string, unknown>
    const key = String(payload.sleeperTransactionId ?? f.transactionId.split(':')[0])
    const bucket = bySleeperTx.get(key) ?? []
    bucket.push(f)
    bySleeperTx.set(key, bucket)
  }

  const mine = myTeam?.externalId != null ? String(myTeam.externalId) : null

  const history: TradeRecord[] = []
  for (const [txId, sides] of bySleeperTx) {
    // Prefer the user's own side so "in / out" is from their point of view.
    const ourSide = mine ? sides.find((s) => s.managerId === mine) : undefined
    const side = ourSide ?? sides[0]
    const payload = (side.payload ?? {}) as Record<string, unknown>
    const rosterIds = Array.isArray(payload.rosterIds) ? payload.rosterIds.map(String) : []
    const partnerId = rosterIds.find((r) => r !== side.managerId) ?? null

    history.push({
      transactionId: txId,
      season: side.season ?? null,
      week: side.weekOrPeriod ?? null,
      rosterIds,
      yourSide: ourSide ? 'in' : 'unknown',
      playersIn: Number(payload.playersIn ?? 0),
      playersOut: Number(payload.playersOut ?? 0),
      picks: Number(payload.picks ?? 0),
      partnerTeamName: partnerId ? teamByExternal.get(partnerId) ?? `Roster ${partnerId}` : null,
      at: side.createdAt,
    })
    if (history.length >= 60) break
  }

  return { ...base, history: { available: true, data: history } }
}
