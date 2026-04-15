/**
 * Zombie league media under `/public/zombie/videos/`.
 * Filenames match current assets; rename files anytime and update paths here.
 */

export const ZOMBIE_VIDEO_DIRS = {
  humanToZombie: '/zombie/videos/human-to-zombie',
  zombieToHuman: '/zombie/videos/zombie-to-human',
  bashing: '/zombie/videos/bashing',
  ambush: '/zombie/videos/ambush',
  whisperer: '/zombie/videos/whisperer',
} as const

/** Canonical URLs for animation overlays (see `animationEngine` metadata enrichment). */
export const ZOMBIE_VIDEO_ASSETS = {
  /** Survivor → Zombie (infection). If your file names differ, swap these two paths. */
  humanToZombie: '/zombie/videos/human-to-zombie/revival-win.mp4',
  /** Zombie → Survivor (revival / serum). */
  zombieToHuman: '/zombie/videos/zombie-to-human/infection-win.mp4',
  bashing: '/zombie/videos/bashing/bashing.mp4',
  ambush: '/zombie/videos/ambush/ambush.mp4',
  whispererChosen: '/zombie/videos/whisperer/Whisperer.mp4',
} as const

export type ZombieClip = { url: string; type: 'video' | 'image' }

/**
 * Default clip for an animation row. Callers may override via metadata; `animationEngine` merges this in.
 */
export function zombieClipForAnimation(animationType: string): ZombieClip | null {
  switch (animationType) {
    case 'zombie_turn':
      return { url: ZOMBIE_VIDEO_ASSETS.humanToZombie, type: 'video' }
    case 'player_revived':
      return { url: ZOMBIE_VIDEO_ASSETS.zombieToHuman, type: 'video' }
    case 'bashing':
      return { url: ZOMBIE_VIDEO_ASSETS.bashing, type: 'video' }
    case 'ambush_triggered':
      return { url: ZOMBIE_VIDEO_ASSETS.ambush, type: 'video' }
    case 'whisperer_selected':
    case 'whisperer_replaced':
      return { url: ZOMBIE_VIDEO_ASSETS.whispererChosen, type: 'video' }
    default:
      return null
  }
}
