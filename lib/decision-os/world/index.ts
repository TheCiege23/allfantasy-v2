/**
 * Decision OS — Phase 2 Canonical World Assembly: public entry point.
 *
 * `resolveCanonicalWorld` is the read-only orchestrator: it loads canonical rows through a
 * {@link CanonicalWorldPort} (default: prisma find* only) and hands them to the pure
 * {@link assembleCanonicalWorld}. It returns null when the league row is missing.
 *
 * STATUS: substrate only. No Decision OS slice (lineup / waiver / trade / commissioner) consumes this
 * in production or shadow routes yet. This is the shared, origin-blind fact layer those future
 * assemblers will build on. Nothing here writes.
 *
 * CRITICAL-DEBT NOTE (read-only identity resolution): the legacy redraft path resolves a roster's
 * owner via `resolveRedraftRosterLookup`, which performs owner repair with `prisma.redraftRoster.update`
 * (a WRITE). This substrate deliberately does NOT use that path; it joins Roster→LeagueTeam with the
 * pure, write-free {@link matchTeamIdForRoster}. Extracting a guaranteed read-only resolver out of
 * `resolveRedraftRosterLookup` remains the recommended first follow-up before the lineup bridge, so
 * the existing redraft callers can share the same write-free resolution.
 */
import { assembleCanonicalWorld, type AssembleOptions } from './assemble'
import type { CanonicalWorld } from './facts'
import { defaultCanonicalWorldPort, type CanonicalWorldPort } from './port'

export interface ResolveCanonicalWorldOptions extends AssembleOptions {
  port?: CanonicalWorldPort
}

/**
 * Load + assemble the canonical world for a league. Read-only. Returns null when the league does not
 * exist. Origin (provider vs native) is never branched on — it survives only as provenance.
 */
export async function resolveCanonicalWorld(
  leagueId: string,
  options?: ResolveCanonicalWorldOptions,
): Promise<CanonicalWorld | null> {
  const port = options?.port ?? defaultCanonicalWorldPort

  const league = await port.loadLeague(leagueId)
  if (!league) return null

  const teams = await port.loadTeams(leagueId)
  const rosters = await port.loadRosters(leagueId)
  const performances = await port.loadPerformances(
    teams.map((t) => t.id),
    league.season,
  )

  return assembleCanonicalWorld(
    { league, teams, rosters, performances },
    { now: options?.now, staleAfterMs: options?.staleAfterMs },
  )
}

export { assembleCanonicalWorld, matchTeamIdForRoster } from './assemble'
export {
  deriveCurrentWeek,
  deriveFaab,
  derivePointsAgainst,
  projectRosterSlots,
  readWaiverBudgetUsed,
  toStringIdArray,
} from './derive'
export { defaultCanonicalWorldPort } from './port'
export type { CanonicalWorldPort } from './port'
// Native-redraft roster coverage (ADR_CANONICAL_WORLD_REDRAFT_COVERAGE.md) — pure, read-only projection.
export {
  projectRedraftRosterPlayerData,
  normalizeRedraftWaiverPriority,
  mapRedraftRosterRowToRawRoster,
  unionRosterRows,
} from './redraftRoster'
export type { RawRedraftRosterRow, RawRedraftRosterPlayerRow } from './redraftRoster'
export type { AssembleOptions } from './assemble'
export type * from './facts'
export {
  projectPlayerMetadata,
  resolvePlayerMetadata,
  defaultPlayerMetadataPort,
} from './playerMetadata'
export type {
  NormalizedPlayerMetadata,
  PlayerMetadataResult,
  PlayerMetadataPort,
} from './playerMetadata'
// F2.1 — Canonical Enrichment: player metadata derived VIEW (read-only, additive). See ADR_F2_1_PLAYER_METADATA.md.
export {
  projectEnrichedWorld,
  resolveEnrichedCanonicalWorld,
  defaultEnrichedWorldDeps,
} from './enrichedWorld'
export type {
  EnrichedPlayer,
  EnrichedRosterFacts,
  EnrichedCanonicalWorld,
  EnrichedWorldMetadataSummary,
  EnrichedWorldDeps,
} from './enrichedWorld'
// F2.2 — Canonical Enrichment: schedule / bye derived VIEW (read-only, additive). See ADR_F2_2_SCHEDULE_BYE.md.
export {
  projectScheduleContext,
  resolveScheduleContext,
  projectScheduleEnrichedWorld,
  resolveScheduleEnrichedCanonicalWorld,
  defaultScheduleContextPort,
  defaultScheduleEnrichedWorldDeps,
} from './scheduleBye'
export type {
  ScheduleHomeAway,
  ScheduleContextProvenance,
  ScheduleContextFreshness,
  TeamScheduleContext,
  ScheduleEnrichedPlayer,
  ScheduleEnrichedRosterFacts,
  ScheduleEnrichmentSummary,
  ScheduleEnrichedCanonicalWorld,
  ScheduleContextResult,
  ScheduleContextPort,
  ScheduleEnrichedWorldDeps,
} from './scheduleBye'
// F2.3 — Canonical Enrichment: injury / availability derived VIEW (read-only, additive). See ADR_F2_3_INJURY_STATUS.md.
export {
  deriveAvailabilityCategory,
  projectInjuryContext,
  projectInjuryEnrichedWorld,
  resolveInjuryContext,
  resolveInjuryEnrichedCanonicalWorld,
  defaultInjuryContextPort,
  defaultInjuryEnrichedWorldDeps,
} from './injuryEnrichedWorld'
export type {
  InjuryAvailabilityCategory,
  InjuryStatusFreshness,
  InjuryContext,
  InjuryEnrichedPlayer,
  InjuryEnrichedRosterFacts,
  InjuryEnrichmentSummary,
  InjuryEnrichedCanonicalWorld,
  InjuryContextResult,
  InjuryContextPort,
  InjuryEnrichedWorldDeps,
} from './injuryEnrichedWorld'
// F2.4 — Canonical Enrichment: ADP / market-value derived VIEW (read-only, additive). See ADR_F2_4_ADP_MARKET_VALUE.md.
export {
  deriveAdpFormat,
  deriveAdpScoring,
  selectBestAdpRow,
  projectAdpFreshness,
  projectMarketValueFreshness,
  projectAdpContext,
  projectMarketValueContext,
  projectAdpEnrichedWorld,
  resolveAdpContext,
  resolveAdpEnrichedCanonicalWorld,
  defaultAdpPort,
  defaultAdpEnrichedWorldDeps,
} from './adpEnrichedWorld'
export type {
  AdpFreshness,
  AdpContext,
  MarketValueFreshness,
  MarketValueContext,
  AdpMarketContext,
  AdpEnrichedPlayer,
  AdpEnrichedRosterFacts,
  AdpEnrichmentSummary,
  AdpEnrichedCanonicalWorld,
  AdpContextResult,
  AdpPort,
  AdpEnrichedWorldDeps,
} from './adpEnrichedWorld'
// F2.5 — Canonical Enrichment: projection derived VIEW (read-only, additive). See ADR_F2_5_PROJECTIONS.md.
export {
  selectBestProjectionRow,
  projectProjectionFreshness,
  projectProjectionContext,
  projectProjectionEnrichedWorld,
  resolveProjectionContext,
  resolveProjectionEnrichedCanonicalWorld,
  defaultProjectionPort,
} from './projectionEnrichedWorld'
export type {
  ProjectionMatchTier,
  ProjectionFreshness,
  ProjectionContext,
  ProjectionEnrichedPlayer,
  ProjectionEnrichedRosterFacts,
  ProjectionEnrichmentSummary,
  ProjectionEnrichedCanonicalWorld,
  ProjectionContextResult,
  ProjectionPort,
  ProjectionEnrichedWorldDeps,
} from './projectionEnrichedWorld'
// Phase E.1 — the reusable Canonical Asset contract + pure Resolution-layer resolver/adapters.
export {
  resolveCanonicalAssets,
  resolveCanonicalAsset,
  normalizeAssetType,
  fromAfLeagueTradeItems,
  fromRedraftTradeAssets,
  emptyEnrichment,
  emptyContext,
} from './assets'
export type {
  CanonicalAsset,
  CanonicalAssetType,
  AssetTrust,
  AssetOwner,
  AssetMetadata,
  PlayerAssetMetadata,
  PickAssetMetadata,
  FaabAssetMetadata,
  KeeperAssetMetadata,
  ContractAssetMetadata,
  SalaryAssetMetadata,
  DevyAssetMetadata,
  AssetEnrichment,
  AssetContext,
  AssetValue,
  AssetProvenance,
  AssetLayerPresence,
  AssetCompleteness,
  RawCanonicalAssetInput,
  AfLeagueTradeItemRow,
  RedraftTradeAssetRow,
} from './assets'
