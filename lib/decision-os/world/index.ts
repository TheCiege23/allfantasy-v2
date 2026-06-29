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
