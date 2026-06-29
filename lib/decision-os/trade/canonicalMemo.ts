/**
 * Decision OS — Phase E.2: the Canonical Trade Memo.
 *
 * REHOSTS the existing deterministic trade value engine (`lib/trade-value/*`) onto Canonical World
 * inputs. It does NOT invent a valuation — it adapts `CanonicalAsset[]` + `TeamFacts` into the EXACT
 * inputs `buildTradeValueSnapshot` already consumes, then calls that pure engine verbatim. The memo can
 * therefore be produced on demand for ANY league (native or imported) WITHOUT `RedraftSeason` /
 * `RedraftRoster` / `RedraftTradeProposal` / the redraft snapshot tables.
 *
 * Pure + read-only: no prisma, no writes, no persistence, no AI. The provider-agnostic enrichment inputs
 * (ADP via `AdpDataRecord`, position via the D.1 `SportsPlayer` metadata seam) are pre-resolved at the
 * route seam through read-only ports and INJECTED here; this module never reads them. Missing inputs
 * degrade honestly (null sources, lower completeness, explicit uncertainty) — never fabricated.
 *
 * Reusable-memo posture (ADR-DOS-003 §10): Trade CONSUMES the reusable `CanonicalAsset`; direction lives
 * in {@link TradeMovement}, never on the asset. The memo envelope ({snapshot, completeness, uncertainty,
 * provenance}) is the same "deterministic decision memo" shape any future domain adapter could produce.
 */
import type { CanonicalWorld } from '@/lib/decision-os/world/facts'
import type { CanonicalAsset, CanonicalAssetType } from '@/lib/decision-os/world/assets'
import { buildTradeValueSnapshot, type EnrichedTradeAsset } from '@/lib/trade-value/snapshot'
import { buildTeamProfile } from '@/lib/trade-value/teamProfile'
import type { TeamProfile, TradeValueContext, TradeValueSnapshot } from '@/lib/trade-value/types'

/**
 * Trade adds direction to a reusable asset (ADR-DOS-003 §3). The `CanonicalAsset` records only its
 * current `owner`; THIS wrapper is where a trade says "this asset moves from X to Y". Trade consumes the
 * asset — it never stores trade direction on it.
 */
export interface TradeMovement {
  asset: CanonicalAsset
  fromRosterId: string
  toRosterId: string
}

/**
 * Provider-agnostic enrichment, pre-resolved at the seam via READ-ONLY ports and injected. All keyed by
 * canonical player id. Every entry is honest-optional — absent ⇒ the engine input is null, never guessed.
 */
export interface CanonicalMemoEnrichment {
  /** ADP per player — from the provider-neutral `AdpDataRecord` (same source the redraft harness reads). */
  adpByPlayerId?: Record<string, number | null | undefined>
  /** Rest-of-season projection per player. Honest-empty today: no canonical projection source yet (Phase F). */
  projectionByPlayerId?: Record<string, number | null | undefined>
  /** Position per player — from the D.1 `resolvePlayerMetadata` seam; falls back to the asset's own metadata. */
  positionByPlayerId?: Record<string, string | null | undefined>
}

export interface BuildCanonicalTradeMemoInput {
  world: CanonicalWorld
  movements: TradeMovement[]
  proposerRosterId: string
  receiverRosterId: string
  /** All optional — sensible, deterministic defaults are derived from the world. */
  context?: {
    sport?: string
    scoring?: string
    rosterFormat?: string
    leagueType?: string
    /** Deterministic capture stamp; defaults to the world's `assembledAt` (NOT wall-clock — parity-safe). */
    capturedAt?: string
  }
  currentSeason?: number | null
  enrichment?: CanonicalMemoEnrichment
}

export interface CanonicalTradeMemoProvenance {
  memoSource: 'canonical_world'
  valuationSource: 'deterministic_engine'
  /** Canonical models the assets were resolved from (provenance only). */
  assetSourceModels: string[]
  /** Provider name — provenance/debug ONLY, never a decision input. */
  provider: string | null
}

export interface CanonicalTradeMemo {
  /** The deterministic snapshot — byte-compatible with the persisted redraft snapshot the pipeline injects. */
  snapshot: TradeValueSnapshot
  /** 0–100 honest data completeness of the canonical inputs feeding the engine. */
  completeness: number
  uncertainty: string[]
  provenance: CanonicalTradeMemoProvenance
}

/**
 * Map a canonical asset type to the engine's value kind. The deterministic engine values ONLY
 * player/pick/FAAB; every other class is modeled honestly as a zero-value `future_consideration` with
 * explicit uncertainty — no new valuation is invented (keeps fantasy assumptions out of the core).
 */
const KIND_FOR_ASSET_TYPE: Record<CanonicalAssetType, EnrichedTradeAsset['kind']> = {
  player: 'player',
  draft_pick: 'draft_pick',
  faab: 'faab',
  keeper: 'future_consideration',
  devy: 'future_consideration',
  contract: 'future_consideration',
  salary: 'future_consideration',
  future_consideration: 'future_consideration',
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values))
}

function playerIdOf(asset: CanonicalAsset): string | null {
  return asset.metadata.player?.playerId ?? asset.metadata.keeper?.playerId ?? asset.metadata.devy?.playerId ?? null
}

/** Adapt ONE movement into the engine's `EnrichedTradeAsset`. Pure; returns honest degradation notes. */
function toEnrichedAsset(
  movement: TradeMovement,
  enrich: CanonicalMemoEnrichment,
): { asset: EnrichedTradeAsset; notes: string[] } {
  const asset = movement.asset
  const kind = KIND_FOR_ASSET_TYPE[asset.assetType]
  const notes: string[] = []

  const playerId = playerIdOf(asset)
  const adp = playerId ? enrich.adpByPlayerId?.[playerId] ?? null : null
  const projection = playerId ? enrich.projectionByPlayerId?.[playerId] ?? null : null
  const position = (playerId ? enrich.positionByPlayerId?.[playerId] : null) ?? asset.metadata.player?.position ?? null

  if (kind === 'future_consideration' && asset.assetType !== 'future_consideration') {
    notes.push(
      `Asset class "${asset.assetType}" is not yet valued by the deterministic engine — modeled as a 0-value future_consideration.`,
    )
  }
  if (kind === 'player' && projection == null) {
    notes.push('Player projection not yet sourced from the Canonical World (Phase F enrichment) — value uses ADP + scarcity only.')
  }

  return {
    asset: {
      kind,
      fromRosterId: movement.fromRosterId,
      toRosterId: movement.toRosterId,
      playerId,
      playerName: asset.metadata.player?.name ?? asset.metadata.keeper?.name ?? asset.metadata.devy?.name ?? null,
      position,
      team: asset.metadata.player?.team ?? null,
      pickSeason: asset.metadata.pick?.season ?? null,
      pickRound: asset.metadata.pick?.round ?? null,
      pickLabel: asset.metadata.pick?.label ?? null,
      faabAmount: asset.metadata.faab?.amount ?? null,
      sources: {
        projectionValue: projection ?? null,
        rankingValue: null,
        adpValue: adp ?? null,
        fantasyCalcValue: null,
      },
    },
    notes,
  }
}

/**
 * Build a deterministic `TeamProfile` for a roster purely from `TeamFacts`. `playoffSeed` maps from the
 * canonical standings `rank` (documented approximation: redraft uses `RedraftRoster.playoffSeed`; both
 * derive from standings). Positions come from the injected metadata seam; absent ⇒ depth context degrades
 * (stance/winPct/value are unaffected — they don't depend on positions).
 */
function profileForRoster(
  world: CanonicalWorld,
  rosterId: string,
  enrich: CanonicalMemoEnrichment,
): { profile: TeamProfile | undefined; positionsResolved: boolean } {
  const roster = world.rosters.find((r) => r.rosterId === rosterId)
  const team = roster?.teamId ? world.teams.find((t) => t.teamId === roster.teamId) : undefined
  if (!team) return { profile: undefined, positionsResolved: false }

  const playerIds = roster?.playerIds ?? []
  const positions = playerIds
    .map((pid) => enrich.positionByPlayerId?.[pid] ?? null)
    .filter((p): p is string => typeof p === 'string' && p.length > 0)

  const profile = buildTeamProfile({
    rosterId,
    wins: team.record.wins,
    losses: team.record.losses,
    ties: team.record.ties,
    pointsFor: team.pointsFor,
    playoffSeed: team.rank,
    leagueSize: world.teams.length,
    positions,
  })
  return { profile, positionsResolved: playerIds.length === 0 || positions.length > 0 }
}

/**
 * Honest data completeness of the canonical inputs feeding the engine. Transparent weighted blend:
 *   0.5 × avg asset Resolution-layer completeness (E.1)
 * + 0.25 × player enrichment coverage (share of player assets with adp OR projection)
 * + 0.25 × profile availability (both team profiles resolved)
 */
function computeMemoCompleteness(
  movements: TradeMovement[],
  enriched: EnrichedTradeAsset[],
  profiles: { a?: TeamProfile; b?: TeamProfile },
): number {
  const assetRes = movements.length
    ? movements.reduce((sum, m) => sum + m.asset.completeness.score, 0) / movements.length
    : 0
  const players = enriched.filter((e) => e.kind === 'player')
  const enrichCoverage = players.length === 0
    ? 100
    : Math.round((players.filter((e) => e.sources.adpValue != null || e.sources.projectionValue != null).length / players.length) * 100)
  const profileScore = ((profiles.a ? 100 : 0) + (profiles.b ? 100 : 0)) / 2
  return Math.round(0.5 * assetRes + 0.25 * enrichCoverage + 0.25 * profileScore)
}

/**
 * Produce the Canonical Trade Memo. Pure, read-only, on-demand. Reuses the existing deterministic engine
 * verbatim — only the inputs are adapted from canonical facts.
 */
export function buildCanonicalTradeMemo(input: BuildCanonicalTradeMemoInput): CanonicalTradeMemo {
  const enrich = input.enrichment ?? {}

  const adapted = input.movements.map((m) => toEnrichedAsset(m, enrich))
  const enriched = adapted.map((x) => x.asset)
  const adapterNotes = adapted.flatMap((x) => x.notes)

  const proposer = profileForRoster(input.world, input.proposerRosterId, enrich)
  const receiver = profileForRoster(input.world, input.receiverRosterId, enrich)
  const profiles = { a: proposer.profile, b: receiver.profile }

  const currentSeason = input.currentSeason ?? input.world.league.season ?? null
  const context: TradeValueContext = {
    sport: input.context?.sport ?? input.world.league.sport,
    leagueType: input.context?.leagueType ?? (input.world.league.isDynasty ? 'dynasty' : 'redraft'),
    scoring: input.context?.scoring ?? (typeof input.world.league.scoringPresetId === 'string' ? input.world.league.scoringPresetId : 'unknown'),
    rosterFormat: input.context?.rosterFormat ?? 'unknown',
    // Deterministic stamp (not wall-clock) so an on-demand memo is reproducible and parity-safe.
    capturedAt: input.context?.capturedAt ?? input.world.provenance.assembledAt,
  }

  const snapshot = buildTradeValueSnapshot({
    proposerRosterId: input.proposerRosterId,
    receiverRosterId: input.receiverRosterId,
    assets: enriched,
    context,
    currentSeason,
    profiles,
  })

  const uncertainty = dedupe([
    ...input.movements.flatMap((m) => m.asset.uncertainty),
    ...adapterNotes,
    ...(proposer.profile ? [] : [`Team profile unavailable for proposer roster ${input.proposerRosterId} — depth context degraded.`]),
    ...(receiver.profile ? [] : [`Team profile unavailable for receiver roster ${input.receiverRosterId} — depth context degraded.`]),
    ...(proposer.profile && !proposer.positionsResolved ? [`Roster positions unavailable for ${input.proposerRosterId} — depth analysis degraded.`] : []),
    ...(receiver.profile && !receiver.positionsResolved ? [`Roster positions unavailable for ${input.receiverRosterId} — depth analysis degraded.`] : []),
  ])

  return {
    snapshot,
    completeness: computeMemoCompleteness(input.movements, enriched, profiles),
    uncertainty,
    provenance: {
      memoSource: 'canonical_world',
      valuationSource: 'deterministic_engine',
      assetSourceModels: dedupe(input.movements.map((m) => m.asset.provenance.sourceModel)),
      provider: input.world.provenance.provider,
    },
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Parity — canonical memo vs the existing redraft memo (read-only comparison)
// ──────────────────────────────────────────────────────────────────────────

export interface TradeMemoParityResult {
  passed: boolean
  valueTotalsMatch: boolean
  gradeMatch: boolean
  fairnessMatch: boolean
  confidenceMatch: boolean
  diffs: string[]
}

/**
 * Compare a canonical memo's snapshot against the existing redraft memo's snapshot on the parity-critical
 * fields (value totals, grade, fairness, confidence). Pure. Differences are reported, never hidden —
 * intentional differences from missing canonical inputs (e.g. unsourced projections) surface as diffs.
 */
export function compareTradeMemos(canonical: TradeValueSnapshot, redraft: TradeValueSnapshot): TradeMemoParityResult {
  const diffs: string[] = []

  const cTotals = canonical.sides.map((s) => s.total)
  const rTotals = redraft.sides.map((s) => s.total)
  const valueTotalsMatch = cTotals.length === rTotals.length && cTotals.every((t, i) => t === rTotals[i])
  if (!valueTotalsMatch) diffs.push(`value totals differ: canonical=[${cTotals.join(', ')}] redraft=[${rTotals.join(', ')}]`)

  const gradeMatch = canonical.grade.grade === redraft.grade.grade
  if (!gradeMatch) diffs.push(`grade differs: canonical=${canonical.grade.grade} redraft=${redraft.grade.grade}`)

  const fairnessMatch = canonical.grade.fairnessScore === redraft.grade.fairnessScore
  if (!fairnessMatch) diffs.push(`fairness differs: canonical=${canonical.grade.fairnessScore} redraft=${redraft.grade.fairnessScore}`)

  const confidenceMatch = canonical.grade.confidenceScore === redraft.grade.confidenceScore
  if (!confidenceMatch) diffs.push(`confidence differs: canonical=${canonical.grade.confidenceScore} redraft=${redraft.grade.confidenceScore}`)

  return {
    passed: valueTotalsMatch && gradeMatch && fairnessMatch && confidenceMatch,
    valueTotalsMatch,
    gradeMatch,
    fairnessMatch,
    confidenceMatch,
    diffs,
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Telemetry — pure record builder (the seam emits it in E.4)
// ──────────────────────────────────────────────────────────────────────────

export interface CanonicalMemoTelemetry {
  decision_type: 'manager.trade.evaluate'
  memo_source: 'canonical_world'
  valuation_source: 'deterministic_engine'
  completeness: number
  uncertainty_count: number
  grade: string
  fairness_score: number
  confidence_score: number
  /** Provider + asset source models — provenance/debug only (no provider name in decision-facing fields). */
  provenance: { provider: string | null; asset_source_models: string[] }
  parity?: { passed: boolean; value_totals_match: boolean; grade_match: boolean; diffs: number }
}

/** Build the telemetry record for a canonical memo (and optional parity result). Pure; no emission here. */
export function buildCanonicalMemoTelemetry(memo: CanonicalTradeMemo, parity?: TradeMemoParityResult): CanonicalMemoTelemetry {
  return {
    decision_type: 'manager.trade.evaluate',
    memo_source: memo.provenance.memoSource,
    valuation_source: memo.provenance.valuationSource,
    completeness: memo.completeness,
    uncertainty_count: memo.uncertainty.length,
    grade: memo.snapshot.grade.grade,
    fairness_score: memo.snapshot.grade.fairnessScore,
    confidence_score: memo.snapshot.grade.confidenceScore,
    provenance: { provider: memo.provenance.provider, asset_source_models: memo.provenance.assetSourceModels },
    ...(parity
      ? { parity: { passed: parity.passed, value_totals_match: parity.valueTotalsMatch, grade_match: parity.gradeMatch, diffs: parity.diffs.length } }
      : {}),
  }
}
