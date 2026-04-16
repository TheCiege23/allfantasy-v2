/**
 * Create League v2 — submit handler.
 *
 * Routes to the correct API endpoint based on league type:
 *   - redraft  → POST /api/leagues/redraft/create
 *   - tournament → POST /api/tournament/create
 *   - zombie (universe) → POST /api/zombie/universe/create
 *   - all others → POST /api/league/create
 */

import type { CreateLeagueV2State } from './state'
import { isFootballLike } from './state'
import { resolveEffectiveDraftType } from './rules-engine'
import { buildPostCreateLeagueHomeHref } from '@/lib/league/post-create-navigation'

export interface CreateLeagueV2Result {
  ok: boolean
  leagueId?: string
  error?: string
  redirectTo?: string
}

// ── Scoring payload builder ─────────────────────────────────────────

function buildScoringPayload(state: CreateLeagueV2State): {
  scoring: string
  scoringSettings: Record<string, unknown>
} {
  const pprMap = { standard: 0, half: 0.5, full: 1 } as const
  const pprValue = pprMap[state.pprMode]
  const scoring =
    state.pprMode === 'full' ? 'ppr' : state.pprMode === 'half' ? 'half_ppr' : 'standard'

  if (!isFootballLike(state.sport)) {
    return {
      scoring: 'default',
      scoringSettings: { preset: 'sport_default', source: state.scoringSource },
    }
  }

  return {
    scoring,
    scoringSettings: {
      source: state.scoringSource,
      ppr: pprValue,
      superflex: state.superflex,
      tePremium: state.tePremium,
      tePremiumMultiplier: state.tePremium ? state.tePremiumMultiplier : 1,
      thirdRoundReversal: state.thirdRoundReversal,
    },
  }
}

// ── Endpoint routing ────────────────────────────────────────────────

function getEndpoint(state: CreateLeagueV2State): string {
  if (state.leagueType === 'redraft' && !state.idpSelected) return '/api/leagues/redraft/create'
  if (state.leagueType === 'tournament') return '/api/tournament/create'
  // Zombie universe tiers use a separate endpoint — single zombie goes to /api/league/create
  return '/api/league/create'
}

// ── Per-endpoint payload builders ───────────────────────────────────

function buildRedraftPayload(state: CreateLeagueV2State) {
  return {
    leagueType: 'redraft' as const,
    sport: state.sport,
    draftType: state.draftType,
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
      participantPoolSize: state.teamCount, // teamCount holds pool size for tournaments
      initialLeagueSize: 12,
      draftType: state.draftType === 'auction' ? 'auction' : 'snake',
      leagueNamingMode: 'app_generated',
    },
  }
}

function buildGenericPayload(state: CreateLeagueV2State) {
  const { scoring, scoringSettings } = buildScoringPayload(state)
  const effectiveDraftType = resolveEffectiveDraftType(state.leagueType, state.draftType)
  const isDynasty = ['dynasty', 'devy', 'c2c', 'salary_cap'].includes(state.leagueType)

  const leagueVariant = state.idpSelected
    ? 'IDP'
    : state.leagueType === 'guillotine'
      ? 'guillotine'
      : state.leagueType === 'zombie'
        ? 'zombie'
        : state.leagueType === 'survivor'
          ? 'survivor'
          : state.leagueType === 'devy'
            ? 'devy_dynasty'
            : state.leagueType === 'c2c'
              ? 'merged_devy_c2c'
              : state.leagueType === 'salary_cap'
                ? 'salary_cap'
                : state.leagueType === 'big_brother'
                  ? 'big_brother'
                  : undefined

  return {
    platform: 'manual' as const,
    name: state.name.trim(),
    sport: state.sport,
    leagueSize: state.teamCount,
    league_type: state.leagueType,
    draft_type: effectiveDraftType,
    scoring,
    scoringSettings,
    isSuperflex: state.superflex,
    isDynasty,
    ...(leagueVariant ? { leagueVariant } : {}),
    ...(state.sport === 'SOCCER' && state.soccerPipeline ? { soccerPipeline: state.soccerPipeline } : {}),
    settings: {
      league_type: state.leagueType,
      draft_type: effectiveDraftType,
      description: state.description.trim() || undefined,
      league_timezone: state.timezone,
      language: state.language,
      trade_review_mode: state.tradeReviewMode === 'none' ? 'instant' : state.tradeReviewMode,
      ...(state.leagueType === 'survivor'
        ? {
            survivor_suggested_tribe_count: state.survivorTribeCount,
            survivor_tribe_name_mode: 'auto',
          }
        : {}),
      ...(state.leagueType === 'devy'
        ? { devy_rounds: [1, 2, 3], devy_slots: 3 }
        : {}),
      ...(state.leagueType === 'c2c'
        ? { c2c_college_rounds: [1, 2, 3], c2c_college_roster_size: 5 }
        : {}),
      ...(state.draftType === 'auction' || state.leagueType === 'salary_cap'
        ? { auction_budget_per_team: 200 }
        : {}),
      ...(state.sport === 'SOCCER' && state.soccerPipeline
        ? { soccer_pipeline: state.soccerPipeline }
        : {}),
      createdFromFlow: 'create-league-v2',
    },
  }
}

// ── Response parsing ────────────────────────────────────────────────

function parseRedirectUrl(state: CreateLeagueV2State, json: Record<string, unknown>): string {
  // Redraft endpoint returns homepageUrl directly
  if (typeof json.homepageUrl === 'string') return json.homepageUrl

  // Tournament endpoint returns tournamentId
  if (typeof json.tournamentId === 'string') {
    return buildPostCreateLeagueHomeHref({ leagueType: 'tournament', tournamentId: json.tournamentId })
  }

  // Generic endpoint returns league.id
  const leagueId =
    (typeof json.leagueId === 'string' ? json.leagueId : null) ??
    (json.league && typeof json.league === 'object' && 'id' in json.league
      ? String((json.league as { id: string }).id)
      : null)

  if (leagueId) {
    return buildPostCreateLeagueHomeHref({
      leagueId,
      leagueType: state.leagueType,
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

  // Redraft endpoint uses { success: true/false }
  if (json.success === false) {
    return { ok: false, error: (json.error as string) ?? 'Create failed' }
  }

  const leagueId = parseLeagueId(json)
  const redirectTo = parseRedirectUrl(state, json)

  return { ok: true, leagueId, redirectTo }
}
