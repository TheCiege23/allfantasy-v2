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
 *   4. dataProvider.get*(…)  → 503 INTELLIGENCE_UNAVAILABLE if null (Phase 5.7 stub)
 *   5. resolve*(intel, …)    → IntelligenceApiResponse<T> via Phase 5.6 resolvers
 *
 * ADR: ADR_F5_7_INTELLIGENCE_API_ROUTES.md
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
import type {
  IntelligenceApiError,
  IntelligenceApiErrorCode,
  IntelligenceApiScope,
  IntelligenceTier,
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

  const intel = await dataProvider.getPlatformIntelligence()
  if (!intel) return dataUnavailable(requestId)

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

  const intel = await dataProvider.getLeagueIntelligence(leagueId)
  if (!intel) return dataUnavailable(requestId)

  return { status: 200, body: resolveLeagueIntelligence(intel, requestId, tier) }
}

// ── Manager handler ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/intelligence/manager?leagueId={id}&managerId={id}
 *
 * Required scope: `intelligence:manager:read` (manager + platform tiers).
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

  const intel = await dataProvider.getManagerIntelligence(managerId, leagueId)
  if (!intel) return dataUnavailable(requestId)

  return { status: 200, body: resolveManagerIntelligence(intel, requestId, tier) }
}
