/** Normalized 25-level payload from `GET /api/user/rank` (shared by dashboard + `/af-rankings`). */
export type RankLevelApiPayload = {
  tier: string
  level: number
  levelName: string
  tierGroup: number
  color: string
  bgColor: string
  xpTotal: number
  xpIntoLevel: number
  xpForLevel: number
  progressPct: number
  nextLevelName: string | null
  careerWins: number | null
  careerLosses: number | null
  careerChampionships: number | null
  careerPlayoffAppearances: number | null
  careerSeasonsPlayed: number | null
  careerLeaguesPlayed: number | null
  rankCalculatedAt: string | null
}
