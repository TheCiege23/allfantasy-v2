import type { NormalizedDraftRoomPlayer } from '@/lib/players/normalizePlayer'

export type PlayerImageSource = Pick<NormalizedDraftRoomPlayer, 'imageUrl' | 'name'>

/**
 * Preferred headshot URL for UI, or null to trigger letter/initial fallback.
 */
export function getPlayerImage(player: PlayerImageSource): string | null {
  const u = player.imageUrl?.trim()
  if (u) return u
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
