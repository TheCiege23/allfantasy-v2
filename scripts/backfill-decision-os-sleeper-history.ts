/**
 * Phase 4.3 — Historical Intelligence Backfill.
 *
 * Populates the native AllFantasy tables that Decision OS's behavioral event
 * port (`lib/decision-os/behavioral/port.ts`) reads from — `WaiverClaim`,
 * `AfLeagueTrade`, `AfLeagueTradeItem` — using REAL Sleeper transaction
 * history fetched directly from Sleeper's public API. No fabricated rows:
 * every field is either a real Sleeper value (transaction id, player id,
 * roster id, timestamp, status) or a deterministic re-derivation of one
 * (e.g. `claimType` defaults to the schema's own default value).
 *
 * Scope: only leagues where `League.platform === 'sleeper'` (real Sleeper
 * imports) — NOT the manually-created native leagues, which have no Sleeper
 * history to backfill in the first place.
 *
 * Trade safety: `AfLeagueTrade.proposedByUserId` has a real FK to `AppUser`.
 * Only the importing user (the one real AppUser in these leagues — every
 * other manager is a placeholder with no AppUser row) has a valid id to use
 * here, so only trades where the importing user's roster is one of the two
 * parties are inserted as `AfLeagueTrade` rows. This avoids misattributing
 * a trade to an account that didn't actually recieve/send it.
 *
 * Idempotent: every inserted row's `metadata` carries the real Sleeper
 * `transaction_id`; re-running this script skips rows already inserted.
 *
 * Run: node --env-file=.env --require ./scripts/_audit-preload.cjs --import tsx scripts/backfill-decision-os-sleeper-history.ts
 */

import { prisma } from '@/lib/prisma'
import { getLeagueTransactions, type SleeperTransaction } from '@/lib/sleeper-client'

const OWNER_APP_USER_ID = '9791bae0-e47f-418a-ae40-285f6a2e7887' // TheCiege26
const MAX_WEEKS = 18

interface LeagueTarget {
  leagueId: string
  platformLeagueId: string
  name: string
}

interface LeagueBackfillSummary {
  leagueId: string
  name: string
  weeksScanned: number
  transactionsSeen: number
  waiverClaimsInserted: number
  waiverClaimsSkippedExisting: number
  tradesInserted: number
  tradesSkippedExisting: number
  tradesSkippedNoOwnerParty: number
  tradeItemsInserted: number
  errors: string[]
}

async function findRealSleeperLeagues(): Promise<LeagueTarget[]> {
  const rosters = await prisma.roster.findMany({
    where: { platformUserId: OWNER_APP_USER_ID },
    select: { leagueId: true },
  })
  const leagueIds = rosters.map((r) => r.leagueId)
  const leagues = await prisma.league.findMany({
    where: { id: { in: leagueIds }, platform: 'sleeper' },
    select: { id: true, name: true, platformLeagueId: true },
  })
  return leagues.map((l) => ({ leagueId: l.id, platformLeagueId: l.platformLeagueId, name: l.name ?? l.id }))
}

/**
 * Sleeper roster_id (string, e.g. "1".."12") -> native Roster.id.
 *
 * For placeholder (non-owner) managers, `LeagueTeam.platformUserId` is the
 * raw Sleeper user id and matches `Roster.platformUserId` directly (both
 * hold the same placeholder value). For the importing owner specifically,
 * `Roster.platformUserId` gets upgraded to their real AppUser.id at import
 * time, but `LeagueTeam.platformUserId` is never updated to match — it
 * stays the original Sleeper user id. Confirmed by direct query: the owner's
 * `LeagueTeam.platformUserId` equals `UserProfile.sleeperUserId`, not
 * `Roster.platformUserId`. Without this fallback, the owner's own roster_id
 * silently fails to resolve and their real transactions get dropped.
 */
async function buildSleeperRosterIdMap(leagueId: string, ownerAppUserId: string): Promise<Map<string, string>> {
  const teams = await prisma.leagueTeam.findMany({
    where: { leagueId },
    select: { externalId: true, platformUserId: true },
  })
  const rosters = await prisma.roster.findMany({
    where: { leagueId },
    select: { id: true, platformUserId: true },
  })
  const rosterIdByPlatformUserId = new Map(rosters.map((r) => [r.platformUserId, r.id]))
  const map = new Map<string, string>()
  for (const team of teams) {
    if (!team.platformUserId) continue
    const rosterId = rosterIdByPlatformUserId.get(team.platformUserId)
    if (rosterId) map.set(team.externalId, rosterId)
  }

  const ownerRoster = rosters.find((r) => r.platformUserId === ownerAppUserId)
  if (ownerRoster) {
    const ownerProfile = await prisma.userProfile.findFirst({
      where: { userId: ownerAppUserId },
      select: { sleeperUserId: true },
    })
    if (ownerProfile?.sleeperUserId) {
      const ownerTeam = teams.find((t) => t.platformUserId === ownerProfile.sleeperUserId)
      if (ownerTeam) map.set(ownerTeam.externalId, ownerRoster.id)
    }
  }

  return map
}

async function waiverClaimAlreadyExists(leagueId: string, transactionId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM waiver_claims
    WHERE "leagueId" = ${leagueId} AND metadata->>'sleeperTransactionId' = ${transactionId}
    LIMIT 1
  `
  return rows.length > 0
}

async function tradeAlreadyExists(leagueId: string, transactionId: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM af_league_trades
    WHERE "leagueId" = ${leagueId} AND metadata->>'sleeperTransactionId' = ${transactionId}
    LIMIT 1
  `
  return rows.length > 0
}

async function backfillLeague(target: LeagueTarget): Promise<LeagueBackfillSummary> {
  const summary: LeagueBackfillSummary = {
    leagueId: target.leagueId,
    name: target.name,
    weeksScanned: 0,
    transactionsSeen: 0,
    waiverClaimsInserted: 0,
    waiverClaimsSkippedExisting: 0,
    tradesInserted: 0,
    tradesSkippedExisting: 0,
    tradesSkippedNoOwnerParty: 0,
    tradeItemsInserted: 0,
    errors: [],
  }

  const rosterIdMap = await buildSleeperRosterIdMap(target.leagueId, OWNER_APP_USER_ID)
  const ownerRoster = await prisma.roster.findFirst({
    where: { leagueId: target.leagueId, platformUserId: OWNER_APP_USER_ID },
    select: { id: true },
  })

  for (let week = 1; week <= MAX_WEEKS; week++) {
    let txs: SleeperTransaction[] = []
    try {
      txs = await getLeagueTransactions(target.platformLeagueId, week)
    } catch (err) {
      summary.errors.push(`week ${week}: ${err instanceof Error ? err.message : String(err)}`)
      continue
    }
    if (!txs.length) continue
    summary.weeksScanned++
    summary.transactionsSeen += txs.length

    for (const t of txs) {
      try {
        if (t.type === 'waiver' || t.type === 'free_agent') {
          const rosterIdRaw = t.roster_ids?.[0]
          const rosterId = rosterIdRaw != null ? rosterIdMap.get(String(rosterIdRaw)) : undefined
          if (!rosterId) continue

          const addEntries = Object.entries(t.adds ?? {})
          if (addEntries.length === 0) continue // WaiverClaim.addPlayerId is required
          const addPlayerId = addEntries[0][0]
          const dropEntries = Object.entries(t.drops ?? {})
          const dropPlayerId = dropEntries[0]?.[0] ?? null

          if (await waiverClaimAlreadyExists(target.leagueId, t.transaction_id)) {
            summary.waiverClaimsSkippedExisting++
            continue
          }

          const createdAt = new Date(t.created)
          await prisma.waiverClaim.create({
            data: {
              leagueId: target.leagueId,
              rosterId,
              userId: rosterId === ownerRoster?.id ? OWNER_APP_USER_ID : null,
              addPlayerId,
              dropPlayerId,
              status: t.status === 'complete' ? 'awarded' : t.status,
              processedAt: createdAt,
              createdAt,
              metadata: {
                sleeperTransactionId: t.transaction_id,
                sleeperTransactionType: t.type,
                backfilledFrom: 'sleeper-historical-backfill-script',
                backfilledAt: new Date().toISOString(),
              },
            },
          })
          summary.waiverClaimsInserted++
        } else if (t.type === 'trade') {
          const rosterIdsRaw = (t.roster_ids ?? []).map(String)
          const nativeRosterIds = rosterIdsRaw
            .map((rid) => rosterIdMap.get(rid))
            .filter((id): id is string => Boolean(id))
          if (nativeRosterIds.length < 2) continue
          if (!ownerRoster || !nativeRosterIds.includes(ownerRoster.id)) {
            summary.tradesSkippedNoOwnerParty++
            continue
          }

          if (await tradeAlreadyExists(target.leagueId, t.transaction_id)) {
            summary.tradesSkippedExisting++
            continue
          }

          const [rosterA, rosterB] = nativeRosterIds
          const createdAt = new Date(t.created)
          const trade = await prisma.afLeagueTrade.create({
            data: {
              leagueId: target.leagueId,
              proposedByUserId: OWNER_APP_USER_ID,
              proposerRosterId: rosterA === ownerRoster.id ? rosterA : rosterB,
              receiverRosterId: rosterA === ownerRoster.id ? rosterB : rosterA,
              status: 'accepted',
              reviewType: 'no_veto',
              acceptedAt: createdAt,
              processedAt: createdAt,
              createdAt,
              metadata: {
                sleeperTransactionId: t.transaction_id,
                backfilledFrom: 'sleeper-historical-backfill-script',
                backfilledAt: new Date().toISOString(),
              },
            },
          })
          summary.tradesInserted++

          const adds = t.adds ?? {}
          for (const [playerId, rosterIdRaw] of Object.entries(adds)) {
            const toRosterId = rosterIdMap.get(String(rosterIdRaw))
            if (!toRosterId) continue
            const fromRosterId = nativeRosterIds.find((id) => id !== toRosterId) ?? toRosterId
            await prisma.afLeagueTradeItem.create({
              data: {
                tradeId: trade.id,
                itemType: 'player',
                itemReference: playerId,
                fromRosterId,
                toRosterId,
                metadata: { sleeperTransactionId: t.transaction_id },
              },
            })
            summary.tradeItemsInserted++
          }

          for (const pick of t.draft_picks ?? []) {
            const toRosterId = rosterIdMap.get(String(pick.owner_id))
            const fromRosterId = rosterIdMap.get(String(pick.previous_owner_id))
            if (!toRosterId || !fromRosterId) continue
            await prisma.afLeagueTradeItem.create({
              data: {
                tradeId: trade.id,
                itemType: 'draft_pick',
                itemReference: `${pick.season}-round-${pick.round}`,
                fromRosterId,
                toRosterId,
                metadata: { sleeperTransactionId: t.transaction_id },
              },
            })
            summary.tradeItemsInserted++
          }
        }
      } catch (err) {
        summary.errors.push(
          `transaction ${t.transaction_id} (week ${week}): ${err instanceof Error ? err.message : String(err)}`
        )
      }
    }
  }

  return summary
}

async function main() {
  const targets = await findRealSleeperLeagues()
  console.log(`Found ${targets.length} real Sleeper-sourced league(s) for owner ${OWNER_APP_USER_ID}:`)
  for (const t of targets) console.log(`  - ${t.name} (${t.leagueId}) -> Sleeper league ${t.platformLeagueId}`)

  const summaries: LeagueBackfillSummary[] = []
  for (const target of targets) {
    console.log(`\nBackfilling ${target.name} (${target.leagueId})...`)
    const summary = await backfillLeague(target)
    summaries.push(summary)
    console.log(JSON.stringify(summary, null, 2))
  }

  console.log('\n=== TOTALS ===')
  console.log(JSON.stringify(
    {
      leaguesProcessed: summaries.length,
      totalWaiverClaimsInserted: summaries.reduce((s, x) => s + x.waiverClaimsInserted, 0),
      totalTradesInserted: summaries.reduce((s, x) => s + x.tradesInserted, 0),
      totalTradeItemsInserted: summaries.reduce((s, x) => s + x.tradeItemsInserted, 0),
      totalErrors: summaries.reduce((s, x) => s + x.errors.length, 0),
    },
    null,
    2
  ))
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
