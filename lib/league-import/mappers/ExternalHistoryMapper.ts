/**
 * Maps provider-specific draft/transactions/standings into normalized history.
 */

import type {
  NormalizedDraftPick,
  NormalizedTransaction,
  NormalizedStandingsEntry,
} from '../types'

export interface NormalizedHistory {
  draft_picks: NormalizedDraftPick[]
  transactions: NormalizedTransaction[]
  standings: NormalizedStandingsEntry[]
}

export interface IExternalHistoryMapper<P = unknown> {
  map(source: P): NormalizedHistory
}
