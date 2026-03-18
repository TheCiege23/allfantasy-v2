/**
 * NFL Devy eligibility adapter. PROMPT 2/6.
 * Devy pool = NCAA Football (QB, RB, WR, TE). K/DST exclusion is commissioner toggle (default OFF).
 */

import type { DevyEligibilityAdapter } from '../types'
import { NFL_DEVY_ELIGIBLE_POSITIONS } from '../constants'

export const NFL_DEVY_ADAPTER: DevyEligibilityAdapter = {
  adapterId: 'nfl_devy',
  devyEligiblePositions: [...NFL_DEVY_ELIGIBLE_POSITIONS],

  isDevyPositionEligible(position: string): boolean {
    const pos = (position ?? '').trim().toUpperCase()
    if (!pos) return false
    return NFL_DEVY_ELIGIBLE_POSITIONS.includes(pos as typeof NFL_DEVY_ELIGIBLE_POSITIONS[number])
  },
}
