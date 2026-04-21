/**
 * Maps the legacy League Creation Wizard payload (POST /api/league/create, platform=manual)
 * into the canonical POST /api/leagues JSON shape for validateCreatePayload + executeCanonicalLeagueCreation.
 *
 * Keep aligned with lib/create-league-v2/submit.ts (submitCreateLeagueV2) concept / preset selection.
 */

import { getDefaultScoringPresetId } from '@/lib/league-creation-preset/scoring-presets'
import type { LeagueTypeId } from '@/lib/league-creation-wizard/types'
import type { SupportedSport } from '@/lib/create-league-v2/state'
import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { normalizeBestBallSettings } from '@/lib/bestball/rules'

export type LegacyManualCanonicalBuildInput = {
  sport: string
  leagueName: string
  teamCount: number
  requestedLeagueType: string | undefined
  requestedDraftType: string | undefined
  scoringPresetIdInput: string | undefined
  soccerPipelineInput: 'mls' | 'euro' | undefined
  settingsWizard: Record<string, unknown> | undefined
  /** True when NFL IDP card / DYNASTY_IDP / explicit idp league type */
  isIdpRequested: boolean
}

/**
 * Returns a plain object suitable for validateCreatePayload (stripForbiddenCreateLeagueFields applied by caller).
 */
export function buildLegacyManualCanonicalCreatePayload(input: LegacyManualCanonicalBuildInput): Record<string, unknown> {
  const sport = normalizeToSupportedSport(input.sport)
  const ltRaw = (input.requestedLeagueType ?? 'redraft').toLowerCase()

  let concept: string
  if (ltRaw === 'dynasty_idp') {
    concept = 'dynasty'
  } else if (ltRaw === 'idp') {
    concept = 'idp'
  } else if (input.isIdpRequested && sport === 'NFL' && (ltRaw === 'redraft' || ltRaw === '')) {
    concept = 'idp'
  } else {
    concept = input.requestedLeagueType ?? 'redraft'
  }

  const ctx = {
    leagueType: (input.requestedLeagueType ?? 'redraft') as LeagueTypeId,
    sport: sport as SupportedSport,
    idpSelected: input.isIdpRequested,
  }
  const scoringPreset =
    input.scoringPresetIdInput?.trim() ||
    getDefaultScoringPresetId(ctx)

  const draftType = input.requestedDraftType ?? 'snake'

  const sw = input.settingsWizard ?? {}
  const tz =
    typeof sw.league_timezone === 'string' && String(sw.league_timezone).trim().length > 0
      ? String(sw.league_timezone).trim()
      : 'America/New_York'

  const conceptSetup: Record<string, unknown> = {}
  if (ltRaw === 'survivor') {
    const tribe = sw.survivor_suggested_tribe_count
    if (typeof tribe === 'number' && Number.isFinite(tribe)) {
      conceptSetup.survivorTribeCount = Math.max(2, Math.min(4, Math.round(tribe)))
    }
  }
  if (ltRaw === 'best_ball') {
    const rawBestBall =
      sw.best_ball_settings && typeof sw.best_ball_settings === 'object' && !Array.isArray(sw.best_ball_settings)
        ? (sw.best_ball_settings as Record<string, unknown>)
        : sw.bestBall && typeof sw.bestBall === 'object' && !Array.isArray(sw.bestBall)
          ? (sw.bestBall as Record<string, unknown>)
          : null
    const normalizedBestBall = normalizeBestBallSettings({
      sport,
      conceptSetup: rawBestBall ? { bestBall: rawBestBall } : null,
      draftType,
      timezone: tz,
      language: sw.language === 'es' || sw.language === 'en' ? sw.language : null,
    })
    conceptSetup.bestBall = normalizedBestBall
  }

  const tradeReviewRaw = sw.trade_review_mode
  const tradeReviewMode =
    tradeReviewRaw === 'league_vote' || tradeReviewRaw === 'instant' || tradeReviewRaw === 'none'
      ? tradeReviewRaw
      : 'commissioner'

  const out: Record<string, unknown> = {
    concept: String(concept).toLowerCase(),
    sport,
    scoringPreset,
    teamCount: input.teamCount,
    draftType,
    leagueName: input.leagueName.trim(),
    timezone: tz,
    tradeReviewMode,
  }

  if (Object.keys(conceptSetup).length > 0) {
    out.conceptSetup = conceptSetup
  }

  if (sport === 'SOCCER') {
    out.soccerPipeline = input.soccerPipelineInput ?? 'euro'
  }

  const lang = sw.language
  if (lang === 'es' || lang === 'en') {
    out.language = lang
  }

  return out
}
