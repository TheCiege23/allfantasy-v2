export type MatchupInsight = { insight: string }

export async function generateMatchupInsight(_matchupId: string): Promise<MatchupInsight> {
  return { insight: 'Matchup insight pending wiring.' }
}
