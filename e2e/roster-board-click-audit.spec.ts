import { expect, test } from '@playwright/test'

test.describe.configure({ timeout: 180_000 })

test.describe('@roster roster board click audit', () => {
  test('lineup slot actions, player card click, add/drop wiring, and reload persistence', async ({ page }) => {
    const leagueId = 'e2e-roster-league'
    let saveCalls = 0

    let persistedPlayerData: Record<string, unknown> = {
      players: ['p-qb', 'p-wr'],
      starters: ['p-qb'],
      reserve: [],
      taxi: [],
      devy: [],
      lineup_sections: {
        starters: [
          {
            id: 'p-qb',
            name: 'Test Quarterback',
            team: 'KC',
            position: 'QB',
            opponent: '@ BUF',
            gameTime: 'Sun 4:25 PM',
            projection: 21.4,
            actual: null,
            status: 'healthy',
          },
        ],
        bench: [
          {
            id: 'p-wr',
            name: 'Bench Receiver',
            team: 'NYJ',
            position: 'WR',
            opponent: 'vs MIA',
            gameTime: 'Sun 1:00 PM',
            projection: 14.2,
            actual: null,
            status: 'q',
          },
        ],
        ir: [],
        taxi: [],
        devy: [],
      },
    }

    const poolPlayers = [
      { id: 'p-lb', name: 'Available Linebacker', position: 'LB', team: 'DAL' },
      { id: 'p-rb', name: 'Reserve RB', position: 'RB', team: 'DET' },
      { id: 'p-gk', name: 'Available Keeper', position: 'GK', team: 'MIA' },
    ]

    await page.route('**/api/league/roster?leagueId=*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          rosterId: 'roster-e2e-1',
          roster: persistedPlayerData,
          faabRemaining: 80,
          waiverPriority: 2,
          sport: 'NFL',
          leagueVariant: 'IDP',
          formatType: 'IDP',
          rosterTemplateId: 'default-NFL-IDP',
          slotLimits: {
            starters: 2,
            bench: 4,
            ir: 1,
            taxi: 1,
            devy: 1,
          },
          starterAllowedPositions: [
            'QB',
            'RB',
            'WR',
            'TE',
            'K',
            'DL',
            'DB',
            'LB',
            'DE',
            'DT',
            'CB',
            'S',
            'IDP_FLEX',
            'FLEX',
          ],
        }),
      })
    })

    await page.route('**/api/waiver-wire/leagues/**/players?limit=120*', async (route) => {
      const rostered = new Set(
        Array.isArray(persistedPlayerData.players)
          ? (persistedPlayerData.players as string[])
          : []
      )
      const available = poolPlayers.filter((p) => !rostered.has(p.id))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ players: available, rosteredCount: rostered.size }),
      })
    })

    await page.route('**/api/leagues/roster/save', async (route) => {
      const payload = route.request().postDataJSON() as {
        rosterData?: Record<string, unknown>
      }
      saveCalls += 1
      if (payload?.rosterData && typeof payload.rosterData === 'object') {
        persistedPlayerData = {
          ...persistedPlayerData,
          ...payload.rosterData,
        }
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, rosterId: 'roster-e2e-1' }),
      })
    })

    await page.goto(`/e2e/roster?leagueId=${leagueId}`)
    await expect(page.getByText(/e2e roster harness/i)).toBeVisible()
    await expect(page.getByTestId('roster-player-card-p-qb')).toBeVisible()
    await expect(page.getByTestId('roster-player-card-p-wr')).toBeVisible()

    await page.getByTestId('roster-player-card-p-qb').click()
    const detailsDialog = page.getByRole('dialog', { name: /roster player details/i })
    await expect(detailsDialog).toBeVisible()
    await expect(detailsDialog.getByText(/test quarterback/i)).toBeVisible()
    await detailsDialog.getByRole('button', { name: /close/i }).click()
    await expect(detailsDialog).not.toBeVisible()

    await page.getByLabel('Search available players').fill('linebacker')
    await page.getByLabel('Choose roster section for add').selectOption('starters')
    await page.getByLabel('Available player list').selectOption('p-lb')
    await page.getByTestId('roster-add-player-button').click()
    await expect(page.getByTestId('roster-player-card-p-lb')).toBeVisible()

    await page.getByLabel('Search available players').fill('reserve rb')
    await page.getByLabel('Choose roster section for add').selectOption('starters')
    await page.getByLabel('Available player list').selectOption('p-rb')
    await page.getByTestId('roster-add-player-button').click()
    await expect(page.getByText(/STARTERS is full\./i)).toBeVisible()
    await expect(page.getByTestId('roster-player-card-p-rb')).not.toBeVisible()

    await page.getByTestId('roster-drop-p-wr').click()
    await expect(page.getByTestId('roster-player-card-p-wr')).not.toBeVisible()
    expect(saveCalls).toBeGreaterThan(0)

    await page.reload()
    await expect(page.getByTestId('roster-player-card-p-lb')).toBeVisible()
    await expect(page.getByTestId('roster-player-card-p-wr')).not.toBeVisible()
  })
})

