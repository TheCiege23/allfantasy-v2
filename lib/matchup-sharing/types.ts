/**
 * Matchup Sharing (PROMPT 295) — types for matchup share cards and API.
 */

export interface MatchupSharePayload {
  /** Team or manager name 1 */
  team1Name: string
  /** Team or manager name 2 */
  team2Name: string
  /** Projected winner (team name) */
  projectedWinner: string
  /** Win probability for winner (0–100) */
  winProbability?: number
  /** Projected score team 1 */
  projectedScore1: number
  /** Projected score team 2 */
  projectedScore2: number
  /** Key players to highlight (e.g. ["Josh Allen", "CeeDee Lamb"]) */
  keyPlayers?: string[]
  /** Optional sport */
  sport?: string
  /** Optional week/round label */
  weekOrRound?: string
}
