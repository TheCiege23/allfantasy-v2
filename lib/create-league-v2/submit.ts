/**
 * Create League v2 — submit handler.
 *
 * Routes to the correct API endpoint based on league type:
 *   - redraft  → POST /api/leagues/redraft/create
 *   - tournament → POST /api/tournament/create
 *   - all others → POST /api/league/create
 */

import type { CreateLeagueV2State } from './state'
import { getEffectiveLeagueType, isFootballLike } from './state'
import { resolveEffectiveDraftType } from './rules-engine'
import { buildPostCreateLeagueHomeHref } from '@/lib/league/post-create-navigation'
import {
  buildScoringFromPresetId,
} from '@/lib/league-creation-preset/scoring-presets'
import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'

export interface CreateLeagueV2Result {
  ok: boolean
  leagueId?: string
  error?: string
  redirectTo?: string
}

function scoringPayloadFromPreset(state: CreateLeagueV2State): {
  scoring: string
  scoringSettings: Record<string, unknown>
  isSuperflex: boolean
} {
  const lt = getEffectiveLeagueType(state)
  if (!lt) {
    return { scoring: 'half_ppr', scoringSettings: { source: 'af' }, isSuperflex: false }
  }
  const ctx = { leagueType: lt, sport: state.sport, idpSelected: state.idpSelected }
  return buildScoringFromPresetId(state.scoringPresetId || 'fb_half_ppr', ctx)
}

// ── Endpoint routing ────────────────────────────────────────────────

function getEndpoint(state: CreateLeagueV2State): string {
  const lt = getEffectiveLeagueType(state)
  if (!lt) return '/api/league/create'
  if (lt === 'redraft' && !state.idpSelected) return '/api/leagues/redraft/create'
  if (lt === 'tournament') return '/api/tournament/create'
  return '/api/league/create'
}

// ── Per-endpoint payload builders ───────────────────────────────────

function buildRedraftPayload(state: CreateLeagueV2State) {
  const REDRAFT_ALLOWED = new Set(['snake', 'linear', 'auction', 'offline', 'auto'])
  const draftType = REDRAFT_ALLOWED.has(state.draftType) ? state.draftType : 'snake'
  return {
    leagueType: 'redraft' as const,
    sport: state.sport,
    draftType,
    name: state.name.trim(),
    timezone: state.timezone,
    language: state.language,
    tradeReviewMode: state.tradeReviewMode === 'none' ? 'instant' : state.tradeReviewMode,
    teamCount: state.teamCount,
    ...(state.sport === 'SOCCER' && state.soccerPipeline ? { soccerPipeline: state.soccerPipeline } : {}),
  }
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

function buildGenericPayload(state: CreateLeagueV2State) {
  const lt = getEffectiveLeagueType(state) as LeagueTypeId
  const { scoring, scoringSettings, isSuperflex } = scoringPayloadFromPreset(state)
  const effectiveDraftType = resolveEffectiveDraftType(lt, state.draftType)
  const isDynasty = ['dynasty', 'devy', 'c2c', 'salary_cap'].includes(lt)

  const leagueVariant = state.idpSelected
    ? 'IDP'
    : lt === 'guillotine'
      ? 'guillotine'
      : lt === 'zombie'
        ? 'zombie'
        : lt === 'survivor'
          ? 'survivor'
          : lt === 'devy'
            ? 'devy_dynasty'
            : lt === 'c2c'
              ? 'merged_devy_c2c'
              : lt === 'salary_cap'
                ? 'salary_cap'
                : lt === 'big_brother'
                  ? 'big_brother'
                  : undefined

  const presetSnapshot = {
    flow: 'create-league-v2-unified',
    scoringPresetId: state.scoringPresetId,
    sport: state.sport,
    teamCount: state.teamCount,
    draftType: state.draftType,
    leagueType: lt,
    idpSelected: state.idpSelected,
    thirdRoundReversal: state.thirdRoundReversal,
    mergedAt: new Date().toISOString(),
  }

  const mergedScoringSettings: Record<string, unknown> = {
    ...scoringSettings,
    ...(isFootballLike(state.sport) || state.idpSelected
      ? { thirdRoundReversal: state.thirdRoundReversal }
      : {}),
  }

  return {
    platform: 'manual' as const,
    name: state.name.trim(),
    sport: state.sport,
    leagueSize: state.teamCount,
    league_type: lt,
    draft_type: effectiveDraftType,
    scoring,
    scoringSettings: mergedScoringSettings,
    isSuperflex: isSuperflex,
    isDynasty,
    scoringPresetId: state.scoringPresetId,
    ...(leagueVariant ? { leagueVariant } : {}),
    ...(state.sport === 'SOCCER' && state.soccerPipeline ? { soccerPipeline: state.soccerPipeline } : {}),
    settings: {
      league_type: lt,
      draft_type: effectiveDraftType,
      description: state.description.trim() || undefined,
      league_timezone: state.timezone,
      language: state.language,
      trade_review_mode: state.tradeReviewMode === 'none' ? 'instant' : state.tradeReviewMode,
      creationPresetSnapshot: presetSnapshot,
      ...(lt === 'survivor'
        ? {
            survivor_suggested_tribe_count: state.survivorTribeCount,
            survivor_tribe_name_mode: 'auto',
          }
        : {}),
      ...(lt === 'devy' ? { devy_rounds: [1, 2, 3], devy_slots: 3 } : {}),
      ...(lt === 'c2c' ? { c2c_college_rounds: [1, 2, 3], c2c_college_roster_size: 5 } : {}),
      ...(state.draftType === 'auction' || lt === 'salary_cap' ? { auction_budget_per_team: 200 } : {}),
      ...(state.sport === 'SOCCER' && state.soccerPipeline ? { soccer_pipeline: state.soccerPipeline } : {}),
      createdFromFlow: 'create-league-v2-unified',
    },
  }
}

// ── Response parsing ────────────────────────────────────────────────

function parseRedirectUrl(state: CreateLeagueV2State, json: Record<string, unknown>): string {
  const lt = getEffectiveLeagueType(state) ?? 'redraft'
  if (typeof json.homepageUrl === 'string') return json.homepageUrl

  if (typeof json.tournamentId === 'string') {
    return buildPostCreateLeagueHomeHref({ leagueType: 'tournament', tournamentId: json.tournamentId })
  }

  const leagueId =
    (typeof json.leagueId === 'string' ? json.leagueId : null) ??
    (json.league && typeof json.league === 'object' && 'id' in json.league
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
  if (json.league && typeof json.league === 'object' && 'id' in json.league) {
    return String((json.league as { id: string }).id)
  }
  return undefined
}

// ── Main submit ─────────────────────────────────────────────────────

export async function submitCreateLeagueV2(
  state: CreateLeagueV2State,
): Promise<CreateLeagueV2Result> {
  if (!getEffectiveLeagueType(state)) {
    return { ok: false, error: 'Choose a league concept to continue.' }
  }
  if (!state.scoringPresetId?.trim()) {
    return { ok: false, error: 'Choose a scoring preset.' }
  }

  const endpoint = getEndpoint(state)

  let payload: unknown
  if (endpoint === '/api/leagues/redraft/create') {
    payload = buildRedraftPayload(state)
  } else if (endpoint === '/api/tournament/create') {
    payload = buildTournamentPayload(state)
  } else {
    payload = buildGenericPayload(state)
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
    const errorMessage =
      (typeof json.error === 'string' ? json.error : null) ??
      (typeof json.detail === 'string' ? json.detail : null) ??
      `Create league failed (${res.status})`
    return { ok: false, error: errorMessage }
  }

  if (json.success === false) {
    return { ok: false, error: (json.error as string) ?? 'Create failed' }
  }

  const leagueId = parseLeagueId(json)
  const redirectTo = parseRedirectUrl(state, json)

  return { ok: true, leagueId, redirectTo }
}
