/**
 * NBA Devy eligibility adapter. PROMPT 2/6.
 * Devy pool = NCAA Basketball (G, F, C). Combo tags PG/SG/SF/PF map to G/F.
 */

import type { DevyEligibilityAdapter } from '../types'
import { NBA_DEVY_ELIGIBLE_POSITIONS, NBA_POSITION_TO_DEVY } from '../constants'

export const NBA_DEVY_ADAPTER: DevyEligibilityAdapter = {
  adapterId: 'nba_devy',
  devyEligiblePositions: [...NBA_DEVY_ELIGIBLE_POSITIONS],

  isDevyPositionEligible(position: string): boolean {
    const mapped = this.mapPositionToDevyPosition?.(position) ?? position
    const pos = (mapped ?? '').trim().toUpperCase()
    if (!pos) return false
    return NBA_DEVY_ELIGIBLE_POSITIONS.includes(pos as typeof NBA_DEVY_ELIGIBLE_POSITIONS[number])
  },

  mapPositionToDevyPosition(position: string): string {
    const p = (position ?? '').trim().toUpperCase()
    return NBA_POSITION_TO_DEVY[p] ?? p
  },
}
