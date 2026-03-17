/**
 * Post-draft automation types. Deterministic summaries; AI optional for narrative.
 * Supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer.
 */

export interface PickLogEntry {
  id: string
  overall: number
  round: number
  slot: number
  rosterId: string
  displayName: string | null
  playerName: string
  position: string
  team: string | null
  amount?: number | null
  pickLabel: string
}

export interface TeamResultEntry {
  rosterId: string
  displayName: string
  slot: number
  pickCount: number
  picks: PickLogEntry[]
  /** Auction: total spent. */
  totalSpent?: number
}

export interface ValueReachEntry {
  position: string
  earliestOverall: number
  /** First pick at this position: displayName (optional). */
  firstPickBy?: string | null
}

export interface BudgetSummaryEntry {
  rosterId: string
  displayName: string
  slot: number
  budget: number
  spent: number
  remaining: number
}

export interface KeeperOutcomeEntry {
  rosterId: string
  displayName: string
  roundCost: number
  playerName: string
  position: string
  team: string | null
}

export interface PostDraftSummary {
  leagueId: string
  leagueName: string | null
  sport: string
  draftType: string
  status: string
  rounds: number
  teamCount: number
  totalPicks: number
  pickCount: number
  byPosition: Record<string, number>
  pickLog: PickLogEntry[]
  teamResults: TeamResultEntry[]
  valueReach: ValueReachEntry[]
  /** Present when draftType === 'auction'. */
  budgetSummary?: BudgetSummaryEntry[]
  /** Present when keeper config had selections. */
  keeperOutcome?: KeeperOutcomeEntry[]
  /** Present when devy enabled. */
  devyRounds?: number[]
  /** Present when C2C enabled. */
  c2cCollegeRounds?: number[]
}
