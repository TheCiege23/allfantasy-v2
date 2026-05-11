/**
 * Static Create League v2 media registry — paths match shipped files under /public.
 * Missing assets fail closed (empty string / null) so the UI never crashes.
 */

import type { SupportedSport } from '@/lib/create-league-v2/state'

/** Preferred sport clips (newer packaged assets first, then legacy root loops). */
export const SPORT_VIDEO_PRIMARY: Record<SupportedSport, string> = {
  NFL: '/media/create-league/sports/videos/Football.mp4',
  NCAAF: '/media/create-league/sports/videos/Football.mp4',
  NBA: '/media/create-league/sports/videos/Basketball.mp4',
  NCAAB: '/media/create-league/sports/videos/Basketball.mp4',
  MLB: '/media/create-league/sports/videos/Baseball.mp4',
  NHL: '/media/create-league/sports/videos/Hockey.mp4',
  SOCCER: '/media/create-league/sports/videos/Soccer.mp4',
}

export const SPORT_VIDEO_FALLBACK: Record<SupportedSport, string> = {
  NFL: '/Football.mp4',
  NCAAF: '/Football.mp4',
  NBA: '/Basketball.mp4',
  NCAAB: '/Basketball.mp4',
  MLB: '/Baseball.mp4',
  NHL: '/Hockey.mp4',
  SOCCER: '/Soccer.mp4',
}

function sportFileStem(sport: SupportedSport): string {
  if (sport === 'NFL' || sport === 'NCAAF') return 'Football'
  if (sport === 'NBA' || sport === 'NCAAB') return 'Basketball'
  if (sport === 'MLB') return 'Baseball'
  if (sport === 'NHL') return 'Hockey'
  return 'Soccer'
}

/**
 * Poster for `<video poster>` — packaged thumbnails first (matches shipped folder name `thumbnail`).
 */
export function getSportPosterUrl(sport: SupportedSport): string | undefined {
  const stem = sportFileStem(sport)
  return `/media/create-league/sports/thumbnail/${stem}.png`
}

/** Ordered candidates for `<img>` — try packaged paths before legacy root PNGs. */
export function getSportThumbnailCandidates(sport: SupportedSport): readonly string[] {
  const stem = sportFileStem(sport)
  const lower = sport.toLowerCase()
  return [
    `/media/create-league/sports/thumbnail/${stem}.png`,
    `/media/create-league/sports/thumbnail/${stem}.jpg`,
    `/media/create-league/sports/thumbnail/${stem}.webp`,
    `/media/create-league/sports/thumbnails/${lower}.png`,
    `/media/create-league/sports/thumbnails/${lower}.jpg`,
    `/media/create-league/sports/thumbnails/${lower}.webp`,
    `/${stem}.png`,
  ]
}
