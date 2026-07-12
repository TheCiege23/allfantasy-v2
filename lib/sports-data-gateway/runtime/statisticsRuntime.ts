import 'server-only'
import crypto from 'node:crypto'
/**
 * Fantasy OS Phase 5F-a — certified player-statistics runtime.
 *
 * Certified, append-only player-game statistics snapshots keyed by (sport, capability='statistics',
 * scope_ref=`<season>-w<week>`). Real observed box-score stats only — NO derived fantasy points, NO projections.
 * Mirrors the schedule runtime's certification pattern (schema validation → identity classification → duplicate
 * detection via content hash → canCertify → append-only persist). Rejected drafts never replace certified ones.
 *
 * PROVIDER TRUTH: box scores come from ESPN's public summary endpoint (verified, same source lib/espn-data.ts
 * uses). ESPN athlete ids are provider-native; a cross-provider canonical player map does not yet exist, so
 * player identity is classified `unresolved` (canonical key `unresolved:espn:<athleteId>`) and disclosed — the
 * snapshot still certifies (unresolved is a valid classified identity outcome), the game/team identity resolves.
 */
import type { CanonicalPlayerGameStat, CanonicalGameStatus } from '../contracts'
import { fetchEspnBoxScore, mapEspnStatus, type EspnBoxScoreAthlete, type EspnBoxScoreFetch } from '../providers/espn'
import { SportsRuntimeStore } from './store'
import { canCertify, type SnapshotDraft, type SnapshotRecordDraft } from './snapshot'

export function statContentHash(s: CanonicalPlayerGameStat): string {
  return crypto.createHash('sha256').update(`${s.canonicalGameId}|${s.canonicalPlayerId}|${s.position ?? 'na'}|${JSON.stringify(s.statCategories)}|${s.gameStatus}`).digest('hex')
}

/** Optional resolver seam: provider athlete id → canonical player id. Returns null when unresolved (the norm today). */
export type PlayerIdentityResolver = (providerAthleteId: string) => string | null

/** Pure normalize: one ESPN box-score athlete → CanonicalPlayerGameStat. Team ids are provider-neutral `nfl:<ABBREV>`. */
export function normalizeEspnStat(
  a: EspnBoxScoreAthlete,
  ctx: { eventId: string; season: string; week: string | null; gameStatus: CanonicalGameStatus; homeAbbrev: string | null; awayAbbrev: string | null; fetchedAt: string; snapshotVersion: string },
  resolve?: PlayerIdentityResolver,
): CanonicalPlayerGameStat {
  const resolved = resolve?.(a.providerAthleteId) ?? null
  const teamId = a.teamAbbrev ? `nfl:${a.teamAbbrev.toUpperCase()}` : 'nfl:UNKNOWN'
  const opponentAbbrev = a.teamAbbrev && ctx.homeAbbrev && ctx.awayAbbrev
    ? (a.teamAbbrev.toUpperCase() === ctx.homeAbbrev.toUpperCase() ? ctx.awayAbbrev : ctx.homeAbbrev)
    : null
  return {
    canonicalPlayerId: resolved ?? `unresolved:espn:${a.providerAthleteId}`,
    canonicalGameId: `espn:nfl:${ctx.eventId}`,
    teamId,
    opponentTeamId: opponentAbbrev ? `nfl:${opponentAbbrev.toUpperCase()}` : null,
    season: ctx.season,
    week: ctx.week,
    gameStatus: ctx.gameStatus,
    position: a.position,
    statCategories: a.stats,
    identityResolution: resolved ? 'resolved' : 'unresolved',
    source: { primaryProvider: 'espn', providerRecordId: a.providerAthleteId, fetchedAt: ctx.fetchedAt, sourceUpdatedAt: null, snapshotVersion: ctx.snapshotVersion },
  }
}

export type StatisticsSyncResult = {
  certified: boolean; season: string; week: string | null; snapshotId: string | null; statCount: number; resolvedCount: number; unresolvedCount: number
  gamesFetched: number; gamesFailed: number; created: number; changed: number; suppressed: number; attempts: number; logical: number; reason?: string
}

/**
 * Fetch ESPN box scores for a set of game event ids, normalize, and certify an append-only statistics snapshot.
 * `eventIds` are the raw ESPN ids (strip the `espn:nfl:` prefix if you have canonical game ids).
 */
export async function runEspnStatisticsSync(input: { season: string; week: string | null; eventIds: string[]; store?: SportsRuntimeStore; resolve?: PlayerIdentityResolver }): Promise<StatisticsSyncResult> {
  const store = input.store ?? new SportsRuntimeStore()
  const scopeRef = `${input.season}-w${input.week ?? 'x'}`
  const now = new Date().toISOString()
  const version = `nfl-stats-${scopeRef}-${now.slice(0, 10)}`
  const fetchedAt = now

  const stats: CanonicalPlayerGameStat[] = []
  let gamesFetched = 0
  let gamesFailed = 0
  const limitations: string[] = []
  for (const eventId of input.eventIds) {
    const box: EspnBoxScoreFetch | { error: string } = await fetchEspnBoxScore(eventId)
    if ('error' in box) { gamesFailed++; limitations.push(`game ${eventId}: ${box.error}`); continue }
    gamesFetched++
    const gameStatus = mapEspnStatus(box.statusName)
    for (const a of box.athletes) {
      stats.push(normalizeEspnStat(a, { eventId, season: input.season, week: input.week, gameStatus, homeAbbrev: box.homeAbbrev, awayAbbrev: box.awayAbbrev, fetchedAt, snapshotVersion: version }, input.resolve))
    }
  }

  const resolvedCount = stats.filter((s) => s.identityResolution === 'resolved').length
  const unresolvedCount = stats.length - resolvedCount
  if (unresolvedCount > 0) limitations.push(`${unresolvedCount} player identities unresolved (ESPN athlete id has no canonical map yet)`)

  // Key includes the stat group (position) so a player appearing in multiple ESPN groups (e.g. passing AND
  // rushing) yields one record PER group rather than colliding into one — preserving full stat fidelity.
  const records: SnapshotRecordDraft[] = stats.map((s) => ({
    canonicalKey: `${s.canonicalGameId}:${s.canonicalPlayerId}:${s.position ?? 'na'}`,
    resolutionStatus: s.identityResolution === 'resolved' ? 'resolved' : 'unresolved',
    contentHash: statContentHash(s),
    record: s,
    schemaValid: true,
  }))

  if (records.length === 0) {
    return { certified: false, season: input.season, week: input.week, snapshotId: null, statCount: 0, resolvedCount: 0, unresolvedCount: 0, gamesFetched, gamesFailed, created: 0, changed: 0, suppressed: 0, attempts: 1, logical: 1, reason: gamesFetched === 0 ? 'no games fetched' : 'no box-score stats available (games not yet played?)' }
  }

  const checksumKey = records.map((r) => `${r.canonicalKey}:${r.contentHash}`).sort().join('|')
  const snapshotId = `nfl-stats-${scopeRef}-${crypto.createHash('sha256').update(checksumKey).digest('hex').slice(0, 20)}`
  const prev = await store.previousCertifiedHashes('NFL', 'statistics', scopeRef)

  const draft: SnapshotDraft = {
    snapshotId, version, sport: 'NFL', capability: 'statistics', provider: 'espn', generatedAt: now, sourceUpdatedAt: null,
    records, rejectedCount: gamesFailed, runPartial: false, scopeComplete: true, previousSnapshotId: prev.snapshotId,
    limitations, scopeRef,
  }
  const decision = canCertify(draft)
  if (!decision.certifiable) {
    return { certified: false, season: input.season, week: input.week, snapshotId: null, statCount: stats.length, resolvedCount, unresolvedCount, gamesFetched, gamesFailed, created: 0, changed: 0, suppressed: 0, attempts: 1, logical: 1, reason: decision.reasons.join('; ') }
  }

  // Content-hash diff for created/changed/suppressed (append-only correction replay: changed stats → a new snapshot).
  let created = 0, changed = 0, suppressed = 0
  for (const r of records) {
    const prior = prev.hashes.get(r.canonicalKey)
    if (prior === r.contentHash) suppressed++
    else if (prior === undefined) created++
    else changed++
  }

  await store.persistCertifiedSnapshot(draft)
  return { certified: true, season: input.season, week: input.week, snapshotId, statCount: stats.length, resolvedCount, unresolvedCount, gamesFetched, gamesFailed, created, changed, suppressed, attempts: 1, logical: 1 }
}

/** Consumer read: certified player-game statistics for a season/week (provider-neutral). */
export async function getCertifiedPlayerStats(store: SportsRuntimeStore, season: string, week: string | null): Promise<CanonicalPlayerGameStat[]> {
  const { records } = await store.getCertifiedRecords('NFL', 'statistics', `${season}-w${week ?? 'x'}`).catch(() => ({ records: [] as unknown[] }))
  return records as CanonicalPlayerGameStat[]
}
