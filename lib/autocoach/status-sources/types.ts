/** Normalized row from any status source before aggregation. */
export type NormalizedStatusHit = {
  externalId?: string | null
  playerName: string
  sport: string
  status: string
  teamAbbrev?: string | null
  source: string
  confidence: number
  sourceUrl?: string | null
  rawText?: string | null
  gameDate?: string | null
}

export type OfficialStatusRow = {
  playerId: string
  playerName: string
  sport: string
  status: string
  teamAbbrev: string | null
  gameDate: Date | null
}
