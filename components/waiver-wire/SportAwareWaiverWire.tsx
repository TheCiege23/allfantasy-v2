'use client'

import WaiverWirePage from '@/components/waiver-wire/WaiverWirePage'

export interface SportAwareWaiverWireProps {
  leagueId: string
}

/**
 * SportAwareWaiverWire — sport-aware waiver surface wrapper.
 * WaiverWirePage resolves sport-specific pools/filters from league settings.
 */
export function SportAwareWaiverWire({ leagueId }: SportAwareWaiverWireProps) {
  return <WaiverWirePage leagueId={leagueId} />
}
