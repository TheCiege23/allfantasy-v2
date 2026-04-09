import type { SportAdapter } from './types'
import { mlbAdapter } from './mlb'
import { nbaAdapter } from './nba'
import { ncaabAdapter } from './ncaab'
import { ncaafAdapter } from './ncaaf'
import { nflAdapter } from './nfl'
import { nhlAdapter } from './nhl'
import { soccerAdapter } from './soccer'

const ADAPTERS: Record<string, SportAdapter> = {
  NFL: nflAdapter,
  NBA: nbaAdapter,
  MLB: mlbAdapter,
  NHL: nhlAdapter,
  NCAAF: ncaafAdapter,
  NCAAB: ncaabAdapter,
  SOCCER: soccerAdapter,
}

function normalizeSport(sport: string): string {
  const upper = sport.trim().toUpperCase()
  if (upper === 'NCAAFB') return 'NCAAF'
  if (upper === 'NCAABB') return 'NCAAB'
  return upper
}

export function getSportAdapter(sport: string): SportAdapter {
  const key = normalizeSport(sport)
  const adapter = ADAPTERS[key]
  if (!adapter) throw new Error(`Unsupported redraft sport adapter: ${sport}`)
  return adapter
}

export function tryGetSportAdapter(sport: string): SportAdapter | null {
  try {
    return getSportAdapter(sport)
  } catch {
    return null
  }
}

export const SUPPORTED_REDRAFT_ADAPTER_SPORTS = Object.keys(ADAPTERS)
