export type DynastyStoryline = { headline: string; body: string; tags?: string[] }

export async function generateBestBallWeeklyRecap(
  leagueId: string,
  contestId: string | null,
  week: number,
): Promise<DynastyStoryline> {
  void contestId
  return {
    headline: `Week ${week} best ball recap`,
    body: `League ${leagueId}: optimized lineups captured spike weeks — full narrative pending score feed.`,
    tags: ['best_ball', 'recap'],
  }
}

export async function generateDraftStorylines(
  leagueId: string,
  contestId: string | null,
  sport: string,
): Promise<DynastyStoryline[]> {
  void contestId
  return [
    {
      headline: 'Draft storylines',
      body: `${sport} best ball draft complete for league ${leagueId} — value and depth themes TBD.`,
      tags: ['best_ball', 'draft'],
    },
  ]
}
