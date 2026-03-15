/**
 * Minimal bracket node shape for shared lock/cascade logic.
 * Full Node type in components may extend this with game, region, etc.
 */
export type BracketNodeLike = {
  id: string
  round: number
  nextNodeId: string | null
  nextNodeSide: string | null
  homeTeamName: string | null
  awayTeamName: string | null
  game?: { startTime?: string | null } | null
}
