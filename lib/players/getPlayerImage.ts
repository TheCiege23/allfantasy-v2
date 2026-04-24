import type { NormalizedDraftRoomPlayer } from '@/lib/players/normalizePlayer'
import { looksLikeSleeperExternalId } from '@/lib/draft-sports-models/player-asset-resolver'
import { sleeperHeadshotUrl } from '@/lib/player-media-urls'
import { DEFAULT_SPORT, normalizeToSupportedSport } from '@/lib/sport-scope'

export type PlayerImageSource = Pick<NormalizedDraftRoomPlayer, 'imageUrl' | 'name' | 'id'>

/**
 * Preferred headshot URL for UI, or null to trigger letter/initial fallback.
 * When `imageUrl` is missing, derives Sleeper CDN URL from a numeric external player id (same idea as `resolvePlayerAssets`).
 */
export function getPlayerImage(player: PlayerImageSource, sportOverride?: string | null): string | null {
  const u = player.imageUrl?.trim()
  if (u) return u
  const id = player.id?.trim()
  if (id && looksLikeSleeperExternalId(id)) {
    const sport = normalizeToSupportedSport(sportOverride ?? DEFAULT_SPORT)
    return sleeperHeadshotUrl(id, sport.toLowerCase())
  }
  return null
}

const preloaded = new Set<string>()

/**
 * Warm browser cache for visible rows (best-effort, no await).
 */
export function preloadPlayerImage(url: string | null | undefined): void {
  if (!url?.trim()) return
  const u = url.trim()
  if (preloaded.has(u)) return
  preloaded.add(u)
  if (typeof Image === 'undefined') return
  const img = new Image()
  img.src = u
}
