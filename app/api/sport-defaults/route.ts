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

export async function GET(request: NextRequest) {
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
      })
    }

    if (load === 'featureFlags') {
      const { getSportFeatureFlags } = await import('@/lib/sport-defaults/SportFeatureFlagsService')
      const featureFlags = await getSportFeatureFlags(sport)
      return NextResponse.json({ sport, featureFlags })
    }

    const defaults = resolveSportDefaults(sport, variantParam)
    return NextResponse.json({
      ...defaults,
      registry: {
        version: SPORT_DEFAULTS_CORE_REGISTRY_VERSION,
        supported_sports: getSupportedSportDefaultsSports(),
      },
    })
  } catch (e) {
    console.error('[sport-defaults] Error:', e)
    return NextResponse.json({ error: 'Failed to load sport defaults' }, { status: 500 })
  }
}
