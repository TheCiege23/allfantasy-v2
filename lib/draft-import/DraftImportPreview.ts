/**
 * Draft import preview: normalized shape ready to apply. Deterministic.
 */

import type { SlotOrderEntry } from '@/lib/live-draft-engine/types'
import type { TradedPickRecord } from '@/lib/live-draft-engine/types'
import type { KeeperConfig, KeeperSelection } from '@/lib/live-draft-engine/keeper/types'

export interface MappedPick {
  overall: number
  round: number
  slot: number
  rosterId: string
  displayName: string | null
  playerName: string
  position: string
  team: string | null
  byeWeek: number | null
  playerId: string | null
  tradedPickMeta?: unknown
  source: string
  amount?: number | null
}

export interface DraftImportPreview {
  /** Resolved slot order (same length as teamCount). */
  slotOrder: SlotOrderEntry[]
  /** Mapped picks (overall 1..N). */
  picks: MappedPick[]
  /** Mapped traded picks. */
  tradedPicks: TradedPickRecord[]
  /** Keeper config if present in payload. */
  keeperConfig?: KeeperConfig | null
  /** Keeper selections if present. */
  keeperSelections?: KeeperSelection[]
  /** Metadata to apply to session (rounds, teamCount, draftType, thirdRoundReversal). */
  metadata?: {
    rounds?: number
    teamCount?: number
    draftType?: 'snake' | 'linear' | 'auction'
    thirdRoundReversal?: boolean
  }
  /** Human-readable summary for UI. */
  summary: {
    pickCount: number
    tradedPickCount: number
    keeperCount: number
    slotOrderLength: number
  }
}

export function createEmptyPreview(teamCount: number, rounds: number): DraftImportPreview {
  const slotOrder: SlotOrderEntry[] = Array.from({ length: teamCount }, (_, i) => ({
    slot: i + 1,
    rosterId: `placeholder-${i + 1}`,
    displayName: `Team ${i + 1}`,
  }))
  return {
    slotOrder,
    picks: [],
    tradedPicks: [],
    summary: {
      pickCount: 0,
      tradedPickCount: 0,
      keeperCount: 0,
      slotOrderLength: slotOrder.length,
    },
  }
}
