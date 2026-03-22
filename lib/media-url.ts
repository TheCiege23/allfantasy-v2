import { normalizeToSupportedSport } from '@/lib/sport-scope'

const SLEEPER_HEADSHOT_BASE = 'https://sleepercdn.com/content/nfl/players/thumb'
const ESPN_LOGO_BASE_BY_SPORT: Record<string, string> = {
  NFL: 'https://a.espncdn.com/i/teamlogos/nfl/500',
  NBA: 'https://a.espncdn.com/i/teamlogos/nba/500',
  MLB: 'https://a.espncdn.com/i/teamlogos/mlb/500',
  NHL: 'https://a.espncdn.com/i/teamlogos/nhl/500',
  NCAAF: 'https://a.espncdn.com/i/teamlogos/ncaaf/500',
  NCAAB: 'https://a.espncdn.com/i/teamlogos/ncaab/500',
  SOCCER: 'https://a.espncdn.com/i/teamlogos/soccer/500',
}

const NFL_TEAM_MAP: Record<string, string> = {
  ARI: 'ari', ATL: 'atl', BAL: 'bal', BUF: 'buf',
  CAR: 'car', CHI: 'chi', CIN: 'cin', CLE: 'cle',
  DAL: 'dal', DEN: 'den', DET: 'det', GB: 'gb',
  HOU: 'hou', IND: 'ind', JAX: 'jax', KC: 'kc',
  LAC: 'lac', LAR: 'lar', LV: 'lv', MIA: 'mia',
  MIN: 'min', NE: 'ne', NO: 'no', NYG: 'nyg',
  NYJ: 'nyj', PHI: 'phi', PIT: 'pit', SEA: 'sea',
  SF: 'sf', TB: 'tb', TEN: 'ten', WAS: 'was',
}

export function headshotUrl(sleeperId?: string | null): string {
  if (!sleeperId) return ''
  return `${SLEEPER_HEADSHOT_BASE}/${sleeperId}.jpg`
}

export function teamLogoUrl(teamAbbr?: string | null, sport?: string | null): string {
  if (!teamAbbr) return ''
  const normalizedSport = normalizeToSupportedSport(sport ?? 'NFL')
  const base = ESPN_LOGO_BASE_BY_SPORT[normalizedSport] ?? ESPN_LOGO_BASE_BY_SPORT.NFL
  const upper = teamAbbr.toUpperCase()
  if (normalizedSport === 'NFL') {
    const key = NFL_TEAM_MAP[upper]
    return key ? `${base}/${key}.png` : ''
  }
  return `${base}/${upper.toLowerCase()}.png`
}

export interface PlayerMedia {
  headshotUrl: string | null
  teamLogoUrl: string | null
}

export function resolveHeadshot(
  media?: PlayerMedia | null,
  sleeperId?: string | null
): string {
  return media?.headshotUrl || headshotUrl(sleeperId)
}

export function resolveTeamLogo(
  media?: PlayerMedia | null,
  teamAbbr?: string | null,
  sport?: string | null,
): string {
  return media?.teamLogoUrl || teamLogoUrl(teamAbbr, sport)
}

export { NFL_TEAM_MAP }
