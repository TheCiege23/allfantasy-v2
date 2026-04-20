/**
 * Create League v2 — submit handler.
 *
 * Routing:
 *   - tournament → POST /api/tournament/create
 *   - all other formats → POST /api/leagues (canonical preset engine + Prisma transaction)
 */

import type { CreateLeagueV2State } from './state'
import { getEffectiveLeagueType, isFootballLike } from './state'
import { buildPostCreateLeagueHomeHref } from '@/lib/league/post-create-navigation'
import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'

/** Maps API validation `path` (e.g. teamCount) → message for inline UI. */
export type CreateLeagueFieldErrors = Partial<Record<string, string>>

export interface CreateLeagueV2Result {
  ok: boolean
  leagueId?: string
  error?: string
  redirectTo?: string
  fieldErrors?: CreateLeagueFieldErrors
}

// ── Endpoint routing ────────────────────────────────────────────────

function getEndpoint(state: CreateLeagueV2State): string {
  const lt = getEffectiveLeagueType(state)
  if (lt === 'tournament') return '/api/tournament/create'
  return '/api/leagues'
}

// ── Canonical API (POST /api/leagues) ───────────────────────────────

/**
 * Body matches `createLeagueBodySchema` / `validateCreatePayload` on the server.
 * `concept` uses format ids; IDP is sent as `idp` (maps to redraft shell + IDP modifiers server-side).
 */
function buildCanonicalPayload(state: CreateLeagueV2State): Record<string, unknown> {
  const lt = getEffectiveLeagueType(state) as LeagueTypeId
  const concept = state.idpSelected ? 'idp' : lt

  const conceptSetup: Record<string, unknown> = {}
  if (lt === 'survivor') {
    conceptSetup.survivorTribeCount = state.survivorTribeCount
  }
  if (isFootballLike(state.sport) && state.thirdRoundReversal && state.draftType === 'snake') {
    conceptSetup.thirdRoundReversal = true
  }

  const tradeReviewMode =
    state.tradeReviewMode === 'none'
      ? 'none'
      : state.tradeReviewMode === 'league_vote'
        ? 'league_vote'
        : 'commissioner'

  const payload: Record<string, unknown> = {
    concept,
    sport: state.sport,
    scoringPreset: state.scoringPresetId,
    teamCount: state.teamCount,
    draftType: state.draftType,
    leagueName: state.name.trim(),
    timezone: state.timezone,
    language: state.language === 'es' ? 'es' : 'en',
    tradeReviewMode,
    ...(state.sport === 'SOCCER' && state.soccerPipeline ? { soccerPipeline: state.soccerPipeline } : {}),
  }

  if (Object.keys(conceptSetup).length > 0) {
    payload.conceptSetup = conceptSetup
  }

  return payload
}

function buildTournamentPayload(state: CreateLeagueV2State) {
  return {
    name: state.name.trim(),
    sport: state.sport,
    settings: {
      participantPoolSize: state.teamCount,
      initialLeagueSize: 12,
      draftType: state.draftType === 'auction' ? 'auction' : 'snake',
      leagueNamingMode: 'app_generated',
    },
  }
}

// ── Response parsing ────────────────────────────────────────────────

function parseRedirectUrl(state: CreateLeagueV2State, json: Record<string, unknown>): string {
  const lt = getEffectiveLeagueType(state) ?? 'redraft'
  if (typeof json.homepageUrl === 'string' && json.homepageUrl.length > 0) return json.homepageUrl

  if (typeof json.tournamentId === 'string') {
    return buildPostCreateLeagueHomeHref({ leagueType: 'tournament', tournamentId: json.tournamentId })
  }

  const leagueId =
    (typeof json.leagueId === 'string' ? json.leagueId : null) ??
    (json.league && typeof json.league === 'object' && json.league !== null && 'id' in json.league
      ? String((json.league as { id: string }).id)
      : null)

  if (leagueId) {
    return buildPostCreateLeagueHomeHref({
      leagueId,
      leagueType: lt,
      allowInviteLink: true,
    })
  }

  return '/dashboard'
}

function parseLeagueId(json: Record<string, unknown>): string | undefined {
  if (typeof json.leagueId === 'string') return json.leagueId
  if (typeof json.tournamentId === 'string') return json.tournamentId
  if (json.league && typeof json.league === 'object' && json.league !== null && 'id' in json.league) {
    return String((json.league as { id: string }).id)
  }
  return undefined
}

function parseFieldErrors(json: Record<string, unknown>): CreateLeagueFieldErrors {
  const out: CreateLeagueFieldErrors = {}
  const raw = Array.isArray(json.errors)
    ? json.errors
    : Array.isArray(json.issues)
      ? json.issues
      : []
  for (const item of raw as { path?: string; message?: string }[]) {
    const msg = typeof item?.message === 'string' ? item.message : ''
    if (!msg) continue
    let key = 'general'
    if (typeof item.path === 'string' && item.path.length > 0) {
      key = item.path.split('.')[0] ?? 'general'
    }
    if (key === 'request' || key === 'body') key = 'general'
    if (!out[key]) out[key] = msg
  }
  return out
}

function formatErrorJson(json: Record<string, unknown>, resStatus: number): string {
  const fromErrors = Array.isArray(json.errors)
    ? (json.errors as { message?: string }[])
        .map((e) => (typeof e?.message === 'string' ? e.message : null))
        .filter(Boolean)
        .join('; ')
    : ''
  if (fromErrors) return fromErrors

  const legacyIssues = Array.isArray(json.issues)
    ? (json.issues as { message?: string }[])
        .map((i) => (typeof i?.message === 'string' ? i.message : null))
        .filter(Boolean)
        .join('; ')
    : ''
  if (legacyIssues) return legacyIssues

  if (typeof json.error === 'string' && json.error.length > 0) return json.error
  if (typeof json.detail === 'string' && json.detail.length > 0) return json.detail
  return `Create league failed (${resStatus})`
}

// ── Main submit ─────────────────────────────────────────────────────

export async function submitCreateLeagueV2(state: CreateLeagueV2State): Promise<CreateLeagueV2Result> {
  if (!getEffectiveLeagueType(state)) {
    return { ok: false, error: 'Choose a league concept to continue.' }
  }
  if (!state.scoringPresetId?.trim()) {
    return { ok: false, error: 'Choose a scoring preset.' }
  }

  const endpoint = getEndpoint(state)

  let payload: unknown
  if (endpoint === '/api/tournament/create') {
    payload = buildTournamentPayload(state)
  } else {
    payload = buildCanonicalPayload(state)
  }

  let res: Response
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }

  let json: Record<string, unknown> = {}
  try {
    json = (await res.json()) as Record<string, unknown>
  } catch {
    // Body may be empty or non-JSON
  }

  if (!res.ok) {
    return {
      ok: false,
      error: formatErrorJson(json, res.status),
      fieldErrors: parseFieldErrors(json),
    }
  }

  if (json.success === false) {
    return {
      ok: false,
      error: formatErrorJson(json, res.status),
      fieldErrors: parseFieldErrors(json),
    }
  }

  const leagueId = parseLeagueId(json)
  const redirectTo = parseRedirectUrl(state, json)

  return { ok: true, leagueId, redirectTo }
}
