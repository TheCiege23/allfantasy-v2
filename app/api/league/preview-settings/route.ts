/**
 * Returns the exact League.settings object that would be persisted when creating a league
 * for the given sport and variant. Use so frontend preview matches saved league configuration.
 * GET ?sport=NFL&variant=IDP&superflex=true&dynasty=false
 */
import { NextRequest, NextResponse } from 'next/server'
import { getInitialSettingsForCreation, getSettingsPreviewSummary } from '@/lib/league-defaults-orchestrator/LeagueDefaultsOrchestrator'

const SPORTS = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB', 'SOCCER'] as const

function toSport(s: string): (typeof SPORTS)[number] {
  const u = (s || 'NFL').toUpperCase()
  if (SPORTS.includes(u as any)) return u as (typeof SPORTS)[number]
  return 'NFL'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sport = toSport(searchParams.get('sport') ?? 'NFL')
    const variant = searchParams.get('variant') ?? searchParams.get('leagueVariant') ?? null
    const superflex = searchParams.get('superflex') === 'true'
    const dynasty = searchParams.get('dynasty') === 'true'

    const overrides = {
      superflex,
      roster_mode: dynasty ? ('dynasty' as const) : undefined,
    }

    const initialSettings = getInitialSettingsForCreation(sport, variant, overrides)
    const summary = getSettingsPreviewSummary(sport, variant, overrides)

    return NextResponse.json({
      initialSettings,
      summary,
      sport,
      variant,
    })
  } catch (e) {
    console.error('[league/preview-settings] Error:', e)
    return NextResponse.json({ error: 'Failed to build settings preview' }, { status: 500 })
  }
}
