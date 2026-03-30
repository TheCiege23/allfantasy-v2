/**
 * Sport Defaults API — load defaults by sport for league creation or display.
 * GET ?sport=NFL&load=creation → full league creation payload via unified orchestrator (templates + defaults)
 * GET ?sport=NFL → raw default set (metadata, league, roster, scoring, draft, waiver)
 */
import { NextRequest, NextResponse } from 'next/server'
import { loadSportPresetForCreation } from '@/lib/league-creation/SportPresetLoader'
import { resolveSportDefaults } from '@/lib/sport-defaults/SportDefaultsResolver'
import {
  SPORT_DEFAULTS_CORE_REGISTRY_VERSION,
  getSupportedSportDefaultsSports,
} from '@/lib/sport-defaults/SportDefaultsRegistry'
import { normalizeToSupportedSport } from '@/lib/sport-scope'

const CREATION_CACHE_CONTROL = 'public, max-age=60, s-maxage=60, stale-while-revalidate=300'
const DEFAULTS_CACHE_CONTROL = 'public, max-age=300, s-maxage=300, stale-while-revalidate=900'
const FEATURE_FLAGS_CACHE_CONTROL = 'public, max-age=30, s-maxage=30, stale-while-revalidate=120'
const SPORT_DEFAULTS_SERVER_TIMING_METRIC = 'sport_defaults'

function buildTimedHeaders(cacheControl: string, startedAtMs: number, metricSuffix: string): HeadersInit {
  const durationMs = Math.max(0, Date.now() - startedAtMs)
  return {
    'Cache-Control': cacheControl,
    'Server-Timing': `${SPORT_DEFAULTS_SERVER_TIMING_METRIC}_${metricSuffix};dur=${durationMs}`,
  }
}

export async function GET(request: NextRequest) {
  const startedAtMs = Date.now()
  try {
    const { searchParams } = new URL(request.url)
    const sportParam = searchParams.get('sport') ?? 'NFL'
    const variantParam = searchParams.get('variant') ?? searchParams.get('leagueVariant') ?? null
    const load = searchParams.get('load') ?? ''

    const sport = normalizeToSupportedSport(sportParam)

    if (load === 'creation') {
      const payload = await loadSportPresetForCreation(sport, variantParam)
      return NextResponse.json({
        ...payload,
        registry: {
          version: SPORT_DEFAULTS_CORE_REGISTRY_VERSION,
          supported_sports: getSupportedSportDefaultsSports(),
        },
      }, {
        headers: buildTimedHeaders(CREATION_CACHE_CONTROL, startedAtMs, 'creation'),
      })
    }

    if (load === 'featureFlags') {
      const { getSportFeatureFlags } = await import('@/lib/sport-defaults/SportFeatureFlagsService')
      const featureFlags = await getSportFeatureFlags(sport)
      return NextResponse.json({ sport, featureFlags }, {
        headers: buildTimedHeaders(FEATURE_FLAGS_CACHE_CONTROL, startedAtMs, 'feature_flags'),
      })
    }

    const defaults = resolveSportDefaults(sport, variantParam)
    return NextResponse.json({
      ...defaults,
      registry: {
        version: SPORT_DEFAULTS_CORE_REGISTRY_VERSION,
        supported_sports: getSupportedSportDefaultsSports(),
      },
    }, {
      headers: buildTimedHeaders(DEFAULTS_CACHE_CONTROL, startedAtMs, 'defaults'),
    })
  } catch (e) {
    console.error('[sport-defaults] Error:', e)
    return NextResponse.json({ error: 'Failed to load sport defaults' }, { status: 500 })
  }
}
