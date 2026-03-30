import { expect, test, type Page } from '@playwright/test'

type DiscoveryCard = {
  source: 'fantasy' | 'creator' | 'bracket'
  id: string
  name: string
  description: string | null
  sport: string
  memberCount: number
  maxMembers: number
  joinUrl: string
  detailUrl: string
  ownerName: string | null
  ownerAvatar: string | null
  creatorSlug: string | null
  creatorName: string | null
  tournamentName: string | null
  season: number | null
  scoringMode: string | null
  isPaid: boolean
  isPrivate: boolean
  createdAt: string
  fillPct: number
  leagueType: 'fantasy' | 'creator' | 'bracket'
  leagueStyle: string | null
  draftType: string | null
  draftStatus: string | null
  teamCount: number
  draftDate: string | null
  commissionerName: string | null
  aiFeatures: string[]
  rankingEffectScore?: number
  inviteOnlyByTier?: boolean
  canJoinByRanking?: boolean
}

function buildPaidCard(id: string): DiscoveryCard {
  return {
    source: 'fantasy',
    id,
    name: 'Paid Dynasty League',
    description: 'High-competition paid league',
    sport: 'NFL',
    memberCount: 10,
    maxMembers: 12,
    joinUrl: `/join?code=${id.toUpperCase()}`,
    detailUrl: `/leagues/${id}`,
    ownerName: 'Commissioner One',
    ownerAvatar: null,
    creatorSlug: null,
    creatorName: null,
    tournamentName: null,
    season: 2026,
    scoringMode: 'PPR',
    isPaid: true,
    isPrivate: false,
    createdAt: new Date('2026-03-20T12:00:00.000Z').toISOString(),
    fillPct: 84,
    leagueType: 'fantasy',
    leagueStyle: 'dynasty',
    draftType: 'snake',
    draftStatus: 'pre_draft',
    teamCount: 12,
    draftDate: new Date('2026-08-20T22:00:00.000Z').toISOString(),
    commissionerName: 'Commissioner One',
    aiFeatures: ['Draft helper'],
    rankingEffectScore: 40,
    inviteOnlyByTier: false,
    canJoinByRanking: true,
  }
}

async function mockFindLeagueApi(page: Page) {
  await page.route('**/api/discover/recommendations**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, personalized: false, leagues: [] }),
    })
  })

  await page.route('**/api/discover/leagues**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        leagues: [buildPaidCard('paid-alpha')],
        total: 1,
        page: 1,
        limit: 12,
        totalPages: 1,
        hasMore: false,
        viewerTier: 3,
        viewerTierName: 'Contender',
        hiddenByTierPolicy: 0,
      }),
    })
  })
}

async function mockBracketPaidSettingsHarnessApis(page: Page) {
  await page.route('**/api/bracket/live?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        tournamentId: 'e2e-bracket-paid-settings-tournament',
        games: [],
        standings: [],
        hasLiveGames: false,
        pollIntervalMs: 12000,
      }),
    })
  })

  await page.route('**/api/bracket/leagues/*/chat', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ messages: [] }),
    })
  })
}

test.describe('@monetization fancred boundary disclosure click audit', () => {
  test('paid league creation flow shows FanCred boundary disclosure copy', async ({ page }) => {
    await page.goto('/brackets/leagues/new?sport=NFL&challengeType=playoff_challenge')
    await expect(page.getByTestId('bracket-create-paid-boundary-copy')).toBeVisible()
    await expect(page.getByTestId('bracket-create-paid-boundary-copy')).toContainText('FanCred')
    await expect(page.getByTestId('bracket-create-paid-boundary-copy')).toContainText(
      'does not process league dues'
    )
  })

  test('league settings paid mode section exposes disclosure and live FanCred action', async ({ page }) => {
    await mockBracketPaidSettingsHarnessApis(page)
    await page.goto('/e2e/bracket-paid-settings')

    await page.getByTestId('bracket-settings-toggle-button').click()
    await expect(page.getByTestId('bracket-settings-rules')).toBeVisible()
    await expect(page.getByTestId('bracket-settings-rules')).toContainText(
      'Paid league dues and payouts are handled externally via FanCred.'
    )

    const fanCredLink = page.getByRole('link', { name: /Pay League Dues on FanCred/i })
    await expect(fanCredLink).toBeVisible()
    await expect(fanCredLink).toHaveAttribute('href', /fancred/)
    await expect(fanCredLink).toHaveAttribute('target', '_blank')
  })

  test('discovery paid badge and join CTA show boundary tooltip copy', async ({ page }) => {
    await mockFindLeagueApi(page)
    await page.goto('/find-league')

    const card = page.getByTestId('find-league-card-paid-alpha')
    await expect(card).toBeVisible()
    await expect(card).toContainText('Paid league dues and payouts are managed externally via FanCred.')

    const paidBadge = card.locator('span', { hasText: /^Paid$/ }).first()
    await expect(paidBadge).toHaveAttribute('title', /FanCred/)

    const joinButton = page.getByTestId('find-league-join-paid-alpha')
    await expect(joinButton).toBeVisible()
    await expect(joinButton).toHaveAttribute('title', /FanCred/)
  })
})
