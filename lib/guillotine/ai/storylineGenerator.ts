export type DynastyStoryline = { headline: string; body: string; tags?: string[] }

export async function generateWeeklyGuillotineRecap(seasonId: string, scoringPeriod: number): Promise<DynastyStoryline> {
  return {
    headline: `The Blade Falls — Week ${scoringPeriod}`,
    body: `Guillotine recap for season ${seasonId}: elimination drama pending score feed.`,
    tags: ['guillotine', 'recap'],
  }
}

export async function generateEliminationPage(eliminationId: string): Promise<DynastyStoryline> {
  return {
    headline: 'Elimination post',
    body: `Elimination record ${eliminationId} — expand with AI collapse reason.`,
    tags: ['guillotine', 'elimination'],
  }
}

export async function generateWaiverWarRecap(seasonId: string, scoringPeriod: number): Promise<DynastyStoryline> {
  return {
    headline: 'Waiver war recap',
    body: `Season ${seasonId} period ${scoringPeriod}: top bids and steals — wire claims.`,
    tags: ['guillotine', 'faab'],
  }
}

export async function generateFinalStagePreview(seasonId: string): Promise<DynastyStoryline> {
  return {
    headline: 'Final stage preview',
    body: `Season ${seasonId}: finalists, strengths, FAAB — wire standings.`,
    tags: ['guillotine', 'finals'],
  }
}
