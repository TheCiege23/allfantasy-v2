import { NextRequest, NextResponse } from 'next/server'
import {
  SPORT_CONFIGS,
  getCommissionerSettings,
  getRosterSlots,
  getScoringCategories,
  getSportConfig,
  tryGetSportConfig,
} from '@/lib/sportConfig'

export const dynamic = 'force-dynamic'

function parseToggles(param: string | null): string[] {
  if (!param?.trim()) return []
  return param
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const sport = searchParams.get('sport')?.trim()
  const toggles = parseToggles(searchParams.get('toggles'))

  if (!sport) {
    const list = Object.values(SPORT_CONFIGS).map((c) => ({
      sport: c.sport,
      displayName: c.displayName,
      slug: c.slug,
    }))
    return NextResponse.json({ sports: list })
  }

  const cfg = tryGetSportConfig(sport)
  if (!cfg) {
    return NextResponse.json({ error: `Unknown sport: ${sport}` }, { status: 404 })
  }

  if (searchParams.has('toggles')) {
    return NextResponse.json({
      sport: cfg.sport,
      displayName: cfg.displayName,
      slug: cfg.slug,
      toggles,
      scoringCategories: getScoringCategories(cfg.sport, toggles),
      rosterSlots: getRosterSlots(cfg.sport, toggles),
      commissionerSettings: getCommissionerSettings(cfg.sport, toggles),
    })
  }

  try {
    const full = getSportConfig(sport)
    return NextResponse.json(full)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Not found' }, { status: 404 })
  }
}
