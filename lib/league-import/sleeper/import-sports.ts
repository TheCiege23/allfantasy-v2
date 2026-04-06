import { SUPPORTED_SPORTS, type SupportedSport } from '@/lib/sport-scope'

export const SLEEPER_SPORT_BY_SUPPORTED: Record<SupportedSport, string> = {
  NFL: 'nfl',
  NHL: 'nhl',
  NBA: 'nba',
  MLB: 'mlb',
  NCAAF: 'nfl',
  NCAAB: 'nba',
  SOCCER: 'mls',
}

export const SLEEPER_IMPORT_SPORTS = Array.from(
  new Set(SUPPORTED_SPORTS.map((sport) => SLEEPER_SPORT_BY_SUPPORTED[sport]))
)
