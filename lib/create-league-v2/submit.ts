/**
 * Translate the v2 state object into the existing `POST /api/league/create`
 * payload and submit it. The backend contract lives in app/api/league/create/route.ts
 * and accepts a flexible shape — we map v2's 4-page flow onto those fields.
 */

import type { CreateLeagueV2State } from './state'
import { isFootballLike } from './state'

export interface CreateLeagueV2Result {
  ok: boolean
  leagueId?: string
  error?: string
  redirectTo?: string
}

/** Build the scoring/settings subtree for the existing create API. */
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

export async function submitCreateLeagueV2(
  state: CreateLeagueV2State,
): Promise<CreateLeagueV2Result> {
  const { scoring, scoringSettings } = buildScoringPayload(state)

  const payload = {
    platform: 'manual' as const,
    name: state.name.trim(),
    sport: state.sport,
    leagueSize: state.teamCount,
    leagueType: state.leagueType,
    draftType: state.draftType,
    scoring,
    scoringSettings,
    isSuperflex: state.superflex,
    isDynasty: state.leagueType === 'dynasty',
    settings: {
      description: state.description.trim() || undefined,
      timezone: state.timezone,
      language: state.language,
      tradeReviewMode: state.tradeReviewMode,
      // Survivor-only knob — harmless on other league types.
      survivorTribeCount: state.leagueType === 'survivor' ? state.survivorTribeCount : undefined,
      createdFromFlow: 'create-league-v2',
    },
  }

  let res: Response
  try {
    res = await fetch('/api/league/create', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }

  let json: unknown = null
  try {
    json = await res.json()
  } catch {
    // Body may be empty on success for some providers.
  }

  if (!res.ok) {
    const errorMessage =
      (json && typeof json === 'object' && 'error' in json && typeof (json as { error: unknown }).error === 'string'
        ? (json as { error: string }).error
        : null) ?? `Create league failed (${res.status})`
    return { ok: false, error: errorMessage }
  }

  const body = (json ?? {}) as {
    leagueId?: string
    id?: string
    redirectTo?: string
    league?: { id?: string }
  }
  const leagueId = body.leagueId ?? body.id ?? body.league?.id
  return {
    ok: true,
    leagueId,
    redirectTo: body.redirectTo ?? (leagueId ? `/league/${leagueId}` : '/dashboard'),
  }
}
