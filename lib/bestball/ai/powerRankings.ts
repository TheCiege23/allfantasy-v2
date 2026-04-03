export type BestBallPowerRankings = {
  tiers: { label: string; rosterIds: string[] }[]
  weightsNote: string
}

export async function generateBestBallPowerRankings(
  leagueId: string,
  contestId: string | null,
  week: number,
): Promise<BestBallPowerRankings> {
  void leagueId
  void contestId
  void week
  return {
    tiers: [
      { label: 'Auto-Score Machine', rosterIds: [] },
      { label: 'Spike Week Threat', rosterIds: [] },
      { label: 'Fragile Contender', rosterIds: [] },
      { label: 'Depth Advantage', rosterIds: [] },
      { label: 'Struggling', rosterIds: [] },
    ],
    weightsNote: '45% cumulative optimized points, 30% future ceiling, 25% depth — wiring pending.',
  }
}
