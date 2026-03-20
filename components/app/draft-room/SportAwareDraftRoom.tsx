'use client'

import { PlayerPanel, type PlayerPanelProps } from '@/components/app/draft-room/PlayerPanel'

/**
 * SportAwareDraftRoom — sport-aware draft surface wrapper.
 * Delegates to PlayerPanel which resolves position filters/player pool by sport.
 */
export function SportAwareDraftRoom(props: PlayerPanelProps) {
  return <PlayerPanel {...props} />
}
