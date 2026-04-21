/**
 * Template URL helpers for player/team media (no Prisma).
 * Keeps client bundles from importing lib/prisma via lib/player-media.ts.
 * Uses registry-only logo URLs — do not import TeamLogoResolver (it statically imports prisma).
 */

import type { SportType } from '@/lib/sport-teams/types'
import { getPrimaryLogoUrlForTeam } from '@/lib/sport-teams/SportTeamMetadataRegistry'

function toSportType(s: string): SportType {
  const u = s.toUpperCase()
  if (u === 'NFL' || u === 'NBA' || u === 'MLB' || u === 'NHL' || u === 'NCAAF' || u === 'NCAAB' || u === 'SOCCER') {
    return u as SportType
  }
  return 'NFL'
}

const SLEEPER_NFL_HEADSHOT_BASE = 'https://sleepercdn.com/content/nfl/players/thumb'
const SLEEPER_NBA_HEADSHOT_BASE = 'https://sleepercdn.com/content/nba/players'
const SLEEPER_MLB_HEADSHOT_BASE = 'https://sleepercdn.com/content/mlb/players'
const SLEEPER_NHL_HEADSHOT_BASE = 'https://sleepercdn.com/content/nhl/players'
const ESPN_LOGO_BASE = 'https://a.espncdn.com/i/teamlogos/nfl/500'
const ESPN_PLAYER_HEADSHOT_BASE = 'https://a.espncdn.com/i/headshots'

const ESPN_TEAM_MAP: Record<string, string> = {
  ARI: 'ari', ATL: 'atl', BAL: 'bal', BUF: 'buf',
  CAR: 'car', CHI: 'chi', CIN: 'cin', CLE: 'cle',
  DAL: 'dal', DEN: 'den', DET: 'det', GB: 'gb',
  HOU: 'hou', IND: 'ind', JAX: 'jax', KC: 'kc',
  LAC: 'lac', LAR: 'lar', LV: 'lv', MIA: 'mia',
  MIN: 'min', NE: 'ne', NO: 'no', NYG: 'nyg',
  NYJ: 'nyj', PHI: 'phi', PIT: 'pit', SEA: 'sea',
  SF: 'sf', TB: 'tb', TEN: 'ten', WAS: 'was',
}

export type SportKey = 'nfl' | 'nba' | 'mlb' | 'nhl' | 'ncaaf' | 'ncaab' | string

/** NFL ESPN-style logo URL from abbrev; non-NFL uses TeamLogoResolver. */
export function getTeamLogoUrl(teamAbbr: string | null, sport: string = 'nfl'): string | null {
  if (!teamAbbr) return null
  if (sport.toLowerCase() !== 'nfl') {
    return getPrimaryLogoUrlForTeam(toSportType(sport), teamAbbr.trim())
  }
  const upper = teamAbbr.toUpperCase()
  const key = ESPN_TEAM_MAP[upper]
  return key ? `${ESPN_LOGO_BASE}/${key}.png` : null
}

export function buildHeadshotUrl(playerId: string | null): string | null {
  return playerId ? `${SLEEPER_NFL_HEADSHOT_BASE}/${playerId}.jpg` : null
}

/** Returns the best-known CDN headshot URL for a player ID by sport, or null if unsupported. */
export function sleeperHeadshotUrl(playerId: string, sport: SportKey = 'nfl'): string | null {
  if (!playerId) return null
  const s = String(sport).toLowerCase()
  if (s === 'nfl') return `${SLEEPER_NFL_HEADSHOT_BASE}/${playerId}.jpg`
  if (s === 'nba') return `${SLEEPER_NBA_HEADSHOT_BASE}/${playerId}.jpg`
  if (s === 'mlb') return `${SLEEPER_MLB_HEADSHOT_BASE}/${playerId}.jpg`
  if (s === 'nhl') return `${SLEEPER_NHL_HEADSHOT_BASE}/${playerId}.jpg`
  // NCAAF / NCAAB: ESPN player headshot (requires espn_id in future; skip for now)
  // Soccer: no reliable free CDN without sport-specific ID mapping
  return null
}

/** ESPN player headshot URL. Requires ESPN player ID (not Sleeper ID). */
export function espnPlayerHeadshotUrl(espnPlayerId: string | null | undefined, sport: SportKey = 'nfl'): string | null {
  if (!espnPlayerId) return null
  const s = String(sport).toLowerCase()
  const sportPath = s === 'nfl' ? 'nfl' : s === 'nba' ? 'nba' : s === 'mlb' ? 'mlb' : s === 'nhl' ? 'nhl' : null
  if (!sportPath) return null
  return `${ESPN_PLAYER_HEADSHOT_BASE}/${sportPath}/players/full/${espnPlayerId}.png`
}

export function sleeperTeamLogoUrl(teamAbbr: string, sport: SportKey = 'nfl'): string | null {
  if (!teamAbbr) return null
  if (sport === 'nfl') return `https://sleepercdn.com/images/team_logos/nfl/${teamAbbr.toLowerCase()}.png`
  return getPrimaryLogoUrlForTeam(toSportType(String(sport)), teamAbbr.trim())
}

export function normalizeTeamAbbr(team?: string | null): string | null {
  const t = (team || '').trim()
  return t ? t.toUpperCase() : null
}
