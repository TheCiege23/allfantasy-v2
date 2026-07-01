/**
 * Decision OS — Phase 5.7 Intelligence API handler cores.
 *
 * Pure handler functions with an injected data provider. Route files are thin wrappers
 * that pass the real deps; tests inject fakes. No IO, no DB, no Next.js imports.
 *
 * Flow per handler:
 *   1. checkIntelligenceGate  → tier + requestId (or error response)
 *   2. hasScope               → 403 FORBIDDEN if tier lacks required scope
 *   3. param validation       → 400 INVALID_REQUEST if required params missing
 *   4. view param validation  → 400 INVALID_REQUEST if view is an unknown value
 *   5. dataProvider.get*(…)  → 503 INTELLIGENCE_UNAVAILABLE if null (Phase 5.7 stub)
 *   6. view=presentation      → IPM presentation response (Phase 7.2)
 *      view=raw / omitted     → IntelligenceApiResponse<T> via Phase 5.6 resolvers (unchanged)
 *
 * ADR: ADR_F5_7_INTELLIGENCE_API_ROUTES.md
 * ADR: ADR_F7_2_PRESENTATION_VIEW_MODE.md
 */

import type { ManagerBehavioralIntelligence } from '../manager-intelligence'
import type { LeagueBehavioralIntelligence }  from '../league-intelligence'
import type { PlatformBehavioralIntelligence } from '../platform-intelligence'
import {
  resolveManagerIntelligence,
  resolveLeagueIntelligence,
  resolvePlatformIntelligenceBasic,
  resolvePlatformIntelligenceFull,
} from './resolvers'
import {
  adaptLeagueBehavioralToPresentation,
  adaptManagerBehavioralToPresentation,
  adaptPlatformBehavioralToPresentation,
  PRESENTATION_VERSION,
} from './presentation-adapters'
import type {
  IntelligenceApiError,
  IntelligenceApiErrorCode,
  IntelligenceApiScope,
  IntelligenceTier,
  IntelligenceApiMeta,
} from './contracts'
import { TIER_SCOPE_MAP } from './contracts'
import { checkIntelligenceGate } from './gate'

// ── Context ────────────────────────────────────────────────────────────────────

/**
 * Minimal request context — testable without NextRequest.
 * Compatible with `{ headers: req.headers, searchParams: new URL(req.url).searchParams }`.
 */
export interface IntelligenceApiContext {
  headers:      { get(key: string): string | null }
  searchParams: URLSearchParams
}

// ── Result ─────────────────────────────────────────────────────────────────────

export interface IntelligenceHandlerResult {
  status: number
  body:   unknown
}

// ── Data provider ─────────────────────────────────────────────────────────────

/**
 * Data source abstraction. Phase 5.7 ships `stubDataProvider` (returns null → 503).
 * Phase 5.8 replaces it with a real behavioral intelligence pipeline without changing
 * any route file or handler core.
 */
export interface IntelligenceDataProvider {
  getManagerIntelligence(
    managerId: string,
    leagueId:  string,
  ): Promise<ManagerBehavioralIntelligence | null>
  getLeagueIntelligence(leagueId: string): Promise<LeagueBehavioralIntelligence | null>
  getPlatformIntelligence():               Promise<PlatformBehavioralIntelligence | null>
}

/** Phase 5.7 stub — all methods return null; live requests return 503 until Phase 5.8. */
export const stubDataProvider: IntelligenceDataProvider = {
  getManagerIntelligence:  async () => null,
  getLeagueIntelligence:   async () => null,
  getPlatformIntelligence: async () => null,
}

// ── View param ────────────────────────────────────────────────────────────────

/** Valid values for the `?view=` query parameter. */
export type IntelligenceViewParam = 'raw' | 'presentation'

const VALID_VIEW_VALUES: ReadonlySet<string> = new Set<IntelligenceViewParam>(['raw', 'presentation'])

/**
 * Parses and validates the `view` query parameter.
 * Returns `{ ok: true, view }` or `{ ok: false }` when the value is invalid.
 * Omitted view param is treated as `'raw'`.
 */
function parseViewParam(
  searchParams: URLSearchParams,
  requestId: string,
): { ok: true; view: IntelligenceViewParam } | { ok: false; result: IntelligenceHandlerResult } {
  const raw = searchParams.get('view')
  if (raw === null || raw === '') {
    return { ok: true, view: 'raw' }
  }
  if (VALID_VIEW_VALUES.has(raw)) {
    return { ok: true, view: raw as IntelligenceViewParam }
  }
  return {
    ok: false,
    result: errorResult(
      400,
      'INVALID_REQUEST',
      "Unknown view parameter value. Use 'presentation' or 'raw'.",
      requestId,
    ),
  }
}

// ── Presentation meta ──────────────────────────────────────────────────────────

/**
 * Extended meta block returned when view=presentation.
 * Extends IntelligenceApiMeta with presentation-layer version stamp.
 */
export interface PresentationApiMeta extends IntelligenceApiMeta {
  view: 'presentation'
  presentationVersion: string
}

export interface PresentationApiResponse<T> {
  data: T
  meta: PresentationApiMeta
}

function buildPresentationMeta(
  derivedAt: string,
  completeness: number,
  tier: IntelligenceTier,
  requestId: string,
): PresentationApiMeta {
  return {
    requestId,
    derivedAt,
    completeness,
    version: 'v1',
    tier,
    view: 'presentation',
    presentationVersion: PRESENTATION_VERSION,
  }
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function errorResult(
  status:    number,
  code:      IntelligenceApiErrorCode,
  message:   string,
  requestId: string,
): IntelligenceHandlerResult {
  const body: IntelligenceApiError = { code, message, requestId }
  return { status, body }
}

function hasScope(tier: IntelligenceTier, required: IntelligenceApiScope): boolean {
  return (TIER_SCOPE_MAP[tier] as IntelligenceApiScope[]).includes(required)
}

function dataUnavailable(requestId: string): IntelligenceHandlerResult {
  return errorResult(503, 'INTELLIGENCE_UNAVAILABLE', 'Intelligence data is not available.', requestId)
}

// ── Platform handler ──────────────────────────────────────────────────────────

/**
 * GET /api/v1/intelligence/platform
 *
 * Required scope: `intelligence:platform:basic` (all tiers pass).
 * Platform-tier callers additionally have `intelligence:platform:full` → full response.
 * All other tiers → basic aggregate-only response.
 *
 * view=presentation → PlatformApiPresentation (IPM shape)
 */
export async function platformIntelligenceHandler(
  ctx:          IntelligenceApiContext,
  dataProvider: IntelligenceDataProvider,
): Promise<IntelligenceHandlerResult> {
  const gate = checkIntelligenceGate(ctx.headers)
  if (!gate.ok) return { status: gate.status, body: gate.error }

  const { tier, requestId } = gate
  if (!hasScope(tier, 'intelligence:platform:basic')) {
    return errorResult(403, 'FORBIDDEN', 'API key does not have platform intelligence scope.', requestId)
  }

  const viewResult = parseViewParam(ctx.searchParams, requestId)
  if (!viewResult.ok) return viewResult.result
  const { view } = viewResult

  const intel = await dataProvider.getPlatformIntelligence()
  if (!intel) return dataUnavailable(requestId)

  if (view === 'presentation') {
    const data = adaptPlatformBehavioralToPresentation(intel)
    const meta = buildPresentationMeta(intel.derivedAt, intel.completeness, tier, requestId)
    return { status: 200, body: { data, meta } satisfies PresentationApiResponse<typeof data> }
  }

  const resolved = hasScope(tier, 'intelligence:platform:full')
    ? resolvePlatformIntelligenceFull(intel, requestId)
    : resolvePlatformIntelligenceBasic(intel, requestId)

  return { status: 200, body: resolved }
}

// ── League handler ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/intelligence/league?leagueId={id}
 *
 * Required scope: `intelligence:league:read` (commissioner + platform tiers).
 *
 * view=presentation → LeagueApiPresentation (IPM shape)
 */
export async function leagueIntelligenceHandler(
  ctx:          IntelligenceApiContext,
  dataProvider: IntelligenceDataProvider,
): Promise<IntelligenceHandlerResult> {
  const gate = checkIntelligenceGate(ctx.headers)
  if (!gate.ok) return { status: gate.status, body: gate.error }

  const { tier, requestId } = gate
  if (!hasScope(tier, 'intelligence:league:read')) {
    return errorResult(403, 'FORBIDDEN', 'API key does not have league intelligence scope.', requestId)
  }

  const leagueId = ctx.searchParams.get('leagueId')?.trim() ?? ''
  if (!leagueId) {
    return errorResult(400, 'INVALID_REQUEST', 'Missing required query parameter: leagueId.', requestId)
  }

  const viewResult = parseViewParam(ctx.searchParams, requestId)
  if (!viewResult.ok) return viewResult.result
  const { view } = viewResult

  const intel = await dataProvider.getLeagueIntelligence(leagueId)
  if (!intel) return dataUnavailable(requestId)

  if (view === 'presentation') {
    const data = adaptLeagueBehavioralToPresentation(intel)
    const meta = buildPresentationMeta(intel.derivedAt, intel.completeness, tier, requestId)
    return { status: 200, body: { data, meta } satisfies PresentationApiResponse<typeof data> }
  }

  return { status: 200, body: resolveLeagueIntelligence(intel, requestId, tier) }
}

// ── Manager handler ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/intelligence/manager?leagueId={id}&managerId={id}
 *
 * Required scope: `intelligence:manager:read` (manager + platform tiers).
 *
 * view=presentation → ManagerApiPresentation (IPM shape)
 */
export async function managerIntelligenceHandler(
  ctx:          IntelligenceApiContext,
  dataProvider: IntelligenceDataProvider,
): Promise<IntelligenceHandlerResult> {
  const gate = checkIntelligenceGate(ctx.headers)
  if (!gate.ok) return { status: gate.status, body: gate.error }

  const { tier, requestId } = gate
  if (!hasScope(tier, 'intelligence:manager:read')) {
    return errorResult(403, 'FORBIDDEN', 'API key does not have manager intelligence scope.', requestId)
  }

  const leagueId  = ctx.searchParams.get('leagueId')?.trim()  ?? ''
  const managerId = ctx.searchParams.get('managerId')?.trim() ?? ''

  if (!leagueId) {
    return errorResult(400, 'INVALID_REQUEST', 'Missing required query parameter: leagueId.', requestId)
  }
  if (!managerId) {
    return errorResult(400, 'INVALID_REQUEST', 'Missing required query parameter: managerId.', requestId)
  }

  const viewResult = parseViewParam(ctx.searchParams, requestId)
  if (!viewResult.ok) return viewResult.result
  const { view } = viewResult

  const intel = await dataProvider.getManagerIntelligence(managerId, leagueId)
  if (!intel) return dataUnavailable(requestId)

  if (view === 'presentation') {
    const data = adaptManagerBehavioralToPresentation(intel)
    const meta = buildPresentationMeta(intel.derivedAt, intel.completeness, tier, requestId)
    return { status: 200, body: { data, meta } satisfies PresentationApiResponse<typeof data> }
  }

  return { status: 200, body: resolveManagerIntelligence(intel, requestId, tier) }
}
