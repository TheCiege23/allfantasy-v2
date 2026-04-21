import type { Page } from '@playwright/test'

/**
 * Minimal GET /api/league/settings payload for E2E — must include `scoringConfig`
 * when flows load commissioner scoring from that endpoint.
 */
export function buildLeagueSettingsWithScoring(leagueId: string, scoringConfig: unknown) {
  return {
    userRole: 'commissioner',
    viewerHasTeam: true,
    survivorFairPlayLimited: false,
    hasAfCommissionerSub: false,
    canEdit: true,
    settingsSnapshot: {},
    league: {
      id: leagueId,
      name: 'E2E League',
      sport: 'NFL',
      season: 2026,
      timezone: 'America/New_York',
      teamCount: 12,
      isDynasty: false,
      leagueVariant: null,
      bestBallMode: null,
      autoCoachEnabled: true,
      rosterSize: 22,
      totalRosterSlots: 22,
      sportConfig: {},
      teams: [],
    },
    settings: null,
    scoringConfig,
  }
}

/**
 * Fulfills GET /api/league/settings?leagueId=... with a live `scoringConfig` snapshot.
 * Other methods fall through so PATCH/POST can hit real handlers if needed.
 */
export async function mockLeagueSettingsGetForScoring(
  page: Page,
  leagueId: string,
  getScoringConfig: () => unknown,
) {
  await page.route('**/api/league/settings*', async (route) => {
    if (route.request().method() !== 'GET') {
      await route.fallback()
      return
    }
    const url = new URL(route.request().url())
    if (url.pathname !== '/api/league/settings') {
      await route.fallback()
      return
    }
    if (url.searchParams.get('leagueId') !== leagueId) {
      await route.fallback()
      return
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(buildLeagueSettingsWithScoring(leagueId, getScoringConfig())),
    })
  })
}
