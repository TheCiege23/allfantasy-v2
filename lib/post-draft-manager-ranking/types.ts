/**
 * Post-draft manager ranking types (PROMPT 231).
 * Deterministic scoring; supports NFL, NHL, NBA, MLB, NCAAB, NCAAF, Soccer.
 */

export interface PickScoreEntry {
  id: string
  overall: number
  round: number
  slot: number
  rosterId: string
  displayName: string | null
  playerName: string
  position: string
  team: string | null
  /** ADP used (from AI ADP or fallback). */
  adp: number
  /** value_score = adp - actual_pick (positive = value, negative = reach). */
  valueScore: number
}

export interface ManagerRankingEntry {
  rank: number
  rosterId: string
  displayName: string
  slot: number
  grade: string
  score: number
  totalValueScore: number
  positionalScore: number
  benchScore: number
  balanceScore: number
  pickCount: number
  picks: PickScoreEntry[]
  /** Best value pick (max valueScore). */
  bestPick: PickScoreEntry | null
  /** Worst reach (min valueScore). */
  worstReach: PickScoreEntry | null
}

export interface DraftResultsPayload {
  leagueId: string
  leagueName: string | null
  sport: string
  draftType: string
  season: string
  status: string
  rounds: number
  teamCount: number
  totalPicks: number
  /** Draft board recap: all picks in order. */
  pickLog: Array<{
    id: string
    overall: number
    round: number
    slot: number
    rosterId: string
    displayName: string | null
    playerName: string
    position: string
    team: string | null
    valueScore?: number
    adp?: number
  }>
  /** Managers ranked 1st best draft to last. */
  managerRankings: ManagerRankingEntry[]
  /** Best single pick in the draft (max valueScore across all picks). */
  bestPickOfDraft: PickScoreEntry | null
  /** Worst reach in the draft (min valueScore). */
  worstReachOfDraft: PickScoreEntry | null
  /** Steal of the draft (same as bestPickOfDraft or highlight). */
  stealOfDraft: PickScoreEntry | null
}

export const LETTER_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'] as const
export type LetterGrade = (typeof LETTER_GRADES)[number]
