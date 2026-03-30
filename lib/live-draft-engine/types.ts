/**
 * Live draft engine types.
 * Supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, SOCCER.
 */

export type DraftSessionStatus = 'pre_draft' | 'in_progress' | 'paused' | 'completed'

export type DraftType = 'snake' | 'linear' | 'auction'

export interface SlotOrderEntry {
  slot: number
  rosterId: string
  displayName: string
  platformUserId?: string
}

/** One traded pick: ownership change for (round, slot) from originalRosterId to newRosterId. */
export interface TradedPickRecord {
  round: number
  originalRosterId: string
  previousOwnerName: string
  newRosterId: string
  newOwnerName: string
  season?: string
}

export interface DraftSessionSnapshot {
  id: string
  leagueId: string
  status: DraftSessionStatus
  draftType: DraftType
  rounds: number
  teamCount: number
  thirdRoundReversal: boolean
  timerSeconds: number | null
  timerEndAt: string | null
  pausedRemainingSeconds: number | null
  slotOrder: SlotOrderEntry[]
  /** Resolved pick ownership for display; used for future picks and current-on-clock. */
  tradedPicks: TradedPickRecord[]
  version: number
  picks: DraftPickSnapshot[]
  currentPick: CurrentOnTheClock | null
  timer: TimerState
  updatedAt: string
  /** Present when draftType === 'auction'. */
  auction?: AuctionSessionSnapshot
  /** True when long timer or overnight pause (slow draft). */
  isSlowDraft?: boolean
  /** Keeper draft: config and locks for board. */
  keeper?: KeeperSessionSnapshot
  /** Devy draft: which rounds are devy-only. */
  devy?: DevySessionSnapshot
  /** C2C draft: college vs pro rounds. */
  c2c?: C2CSessionSnapshot
  /** Whether any AI provider is currently available for orphan AI drafter mode. */
  orphanAiProviderAvailable?: boolean
  /** Effective orphan drafter mode after provider fallback ('cpu' when AI unavailable). */
  orphanDrafterEffectiveMode?: 'cpu' | 'ai'
}

export interface C2CSessionSnapshot {
  enabled: boolean
  /** 1-based round numbers that are college-only; all other rounds are pro-only. */
  collegeRounds: number[]
}

export interface DevySessionSnapshot {
  enabled: boolean
  /** 1-based round numbers that are devy-only (e.g. [14, 15]). */
  devyRounds: number[]
}

export interface KeeperSessionSnapshot {
  config: { maxKeepers: number; deadline?: string | null; maxKeepersPerPosition?: Record<string, number> }
  selections: Array<{ rosterId: string; roundCost: number; playerName: string; position: string; team: string | null; playerId: string | null; commissionerOverride?: boolean }>
  locks: Array<{ round: number; slot: number; overall: number; rosterId: string; displayName: string | null; playerName: string; position: string; team: string | null; playerId: string | null; isKeeper: true }>
}

export interface DraftPickSnapshot {
  id: string
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
  tradedPickMeta: TradedPickMeta | null
  source: string
  pickLabel: string
  /** Auction: winning bid amount. */
  amount?: number | null
  createdAt: string
}

export interface TradedPickMeta {
  originalRosterId?: string
  previousOwnerName?: string
  newOwnerName?: string
  showNewOwnerInRed?: boolean
  tintColor?: string
}

export interface CurrentOnTheClock {
  overall: number
  round: number
  slot: number
  rosterId: string
  displayName: string
  pickLabel: string
}

export interface TimerState {
  status: 'running' | 'paused' | 'expired' | 'none'
  remainingSeconds: number | null
  timerEndAt: string | null
}

export interface QueueEntry {
  playerName: string
  position: string
  team?: string | null
  playerId?: string | null
}

export type DraftEventType =
  | 'session_created'
  | 'session_started'
  | 'session_paused'
  | 'session_resumed'
  | 'session_completed'
  | 'pick_submitted'
  | 'pick_undone'
  | 'timer_reset'
  | 'autopick_triggered'
  | 'auction_nominated'
  | 'auction_bid'
  | 'auction_sold'

export interface DraftEvent {
  type: DraftEventType
  sessionId: string
  leagueId: string
  at: string
  payload?: Record<string, unknown>
}

// ————— Auction draft (deterministic) —————

export interface AuctionNomination {
  playerName: string
  position: string
  team: string | null
  playerId: string | null
  byeWeek?: number | null
}

export interface AuctionState {
  /** Index into slotOrder for who nominates next (0-based). */
  nominationOrderIndex: number
  /** Currently nominated player (on the block). */
  currentNomination: AuctionNomination | null
  /** Current high bid amount. */
  currentBid: number
  /** RosterId of current high bidder. */
  currentBidderRosterId: string | null
  /** When bid timer expires (UTC ISO). */
  bidTimerEndAt: string | null
  /** Minimum next bid (currentBid + minIncrement). */
  minNextBid: number
}

/** Per-roster remaining budget. */
export type AuctionBudgets = Record<string, number>

export interface AuctionSessionSnapshot {
  draftType: 'auction'
  budgetPerTeam: number
  budgets: AuctionBudgets
  auctionState: AuctionState
  /** Minimum bid increment (e.g. 1). */
  minBidIncrement: number
  /** Nomination order (same as slotOrder for auction). */
  nominationOrder: SlotOrderEntry[]
}
