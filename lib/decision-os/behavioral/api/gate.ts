/**
 * Decision OS — Phase 5.7 Intelligence API feature gate + API key validator.
 *
 * Pure — reads only `process.env`. No IO, no DB, no mutations.
 *
 * Feature flag: `DECISION_OS_INTELLIGENCE_API_ENABLED=true` must be set explicitly.
 * Key format:   `X-AllFantasy-API-Key: afk_{env}_{token}` (env ∈ {test, live}; token ≥16 alphanum)
 *
 * Tier resolution:
 *   Reads `INTELLIGENCE_API_TEST_KEYS` env var (JSON map of full key → IntelligenceTier).
 *   - test env + key in map   → mapped tier
 *   - test env + key not found → 'basic' (dev mode — local integration testing)
 *   - live env + key in map   → mapped tier
 *   - live env + key not found → 401 UNAUTHORIZED (live keys must be registered)
 *
 * ADR: ADR_F5_7_INTELLIGENCE_API_ROUTES.md
 */

import type { IntelligenceTier, IntelligenceApiError, IntelligenceApiErrorCode } from './contracts'

// ── Key format ─────────────────────────────────────────────────────────────────

const KEY_REGEX = /^afk_(test|live)_([A-Za-z0-9]{16,})$/

export type GateEnv = 'test' | 'live'

// ── Gate result types ─────────────────────────────────────────────────────────

export interface GateOk {
  ok:        true
  tier:      IntelligenceTier
  requestId: string
  env:       GateEnv
}

export interface GateErr {
  ok:     false
  status: number
  error:  IntelligenceApiError
}

export type GateResult = GateOk | GateErr

// ── Internal helpers ──────────────────────────────────────────────────────────

function makeRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function makeError(
  code:      IntelligenceApiErrorCode,
  message:   string,
  requestId: string,
): IntelligenceApiError {
  return { code, message, requestId }
}

function parseTestKeysMap(): Record<string, IntelligenceTier> {
  const raw = process.env.INTELLIGENCE_API_TEST_KEYS
  if (!raw) return {}
  try {
    return JSON.parse(raw) as Record<string, IntelligenceTier>
  } catch {
    return {}
  }
}

// ── Public gate check ─────────────────────────────────────────────────────────

/**
 * Validates the feature flag, API key header, and resolves the caller's tier.
 * Called once at the top of every Phase 5.7 route handler.
 *
 * @param headers  Any `{ get(key: string): string | null }` — compatible with
 *                 `NextRequest.headers` (which is case-insensitive) and test fakes.
 */
export function checkIntelligenceGate(
  headers: { get(key: string): string | null },
): GateResult {
  // 1. Feature flag (fail-safe: must be explicitly enabled)
  if (process.env.DECISION_OS_INTELLIGENCE_API_ENABLED !== 'true') {
    return {
      ok: false,
      status: 503,
      error: makeError(
        'INTELLIGENCE_UNAVAILABLE',
        'Intelligence API is not enabled on this environment.',
        makeRequestId(),
      ),
    }
  }

  const requestId = makeRequestId()

  // 2. API key header (NextRequest.headers.get() is already case-insensitive)
  const rawKey = headers.get('x-allfantasy-api-key')
  if (!rawKey) {
    return {
      ok: false,
      status: 401,
      error: makeError('UNAUTHORIZED', 'Missing X-AllFantasy-API-Key header.', requestId),
    }
  }

  // 3. Format validation
  const match = KEY_REGEX.exec(rawKey)
  if (!match) {
    return {
      ok: false,
      status: 401,
      error: makeError(
        'UNAUTHORIZED',
        'Invalid API key format. Expected: afk_{test|live}_{16+ char token}.',
        requestId,
      ),
    }
  }

  const env = match[1] as GateEnv
  const map = parseTestKeysMap()

  // 4. Tier resolution
  if (env === 'test') {
    const tier: IntelligenceTier = map[rawKey] ?? 'basic'
    return { ok: true, tier, requestId, env }
  }

  // live env — key must be registered
  const tier = map[rawKey]
  if (!tier) {
    return {
      ok: false,
      status: 401,
      error: makeError('UNAUTHORIZED', 'Unknown API key.', requestId),
    }
  }

  return { ok: true, tier, requestId, env }
}
