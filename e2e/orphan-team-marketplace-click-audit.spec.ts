import { expect, test, type Page } from "@playwright/test"

type OrphanTeamCard = {
  id: string
  leagueId: string
  rosterId: string
  teamName: string
  leagueName: string
  leagueType: string
  sport: string
  record: { wins: number; losses: number; ties: number }
  scoringFormat: string
  rosterPreview: string[]
  draftPicksOwned: string[]
  commissionerApprovalRequired: boolean
  commissionerName: string
  memberCount: number
  aiEvaluationPreview: string
  myRequestStatus: "pending" | "approved" | "rejected" | null
}

function buildCard(id: string, overrides: Partial<OrphanTeamCard> = {}): OrphanTeamCard {
  return {
    id,
    leagueId: "league-alpha",
    rosterId: "roster-alpha",
    teamName: "Orphan Contenders",
    leagueName: "Dynasty Prime",
    leagueType: "Dynasty",
    sport: "NFL",
    record: { wins: 8, losses: 5, ties: 0 },
    scoringFormat: "PPR",
    rosterPreview: ["Patrick Mahomes", "CeeDee Lamb", "Amon-Ra St. Brown"],
    draftPicksOwned: ["2027 R1", "2027 R2"],
    commissionerApprovalRequired: true,
    commissionerName: "Commish Ace",
    memberCount: 11,
    aiEvaluationPreview: "AI preview: contender profile in Dynasty (PPR); strong visible depth; balanced draft capital.",
    myRequestStatus: null,
    ...overrides,
  }
}

async function installOrphanMarketplaceMocks(page: Page) {
  let latestParams = new URLSearchParams()
  const pageOneCards = [
    buildCard("league-alpha:roster-alpha", {
      leagueId: "league-alpha",
      rosterId: "roster-alpha",
    }),
  ]
  const pageTwoCards = [
    buildCard("league-beta:roster-beta", {
      leagueId: "league-beta",
      rosterId: "roster-beta",
      teamName: "Beta Rebuilders",
      leagueName: "Beta League",
      sport: "NBA",
      leagueType: "Keeper",
      record: { wins: 4, losses: 9, ties: 0 },
      scoringFormat: "H2H Points",
      rosterPreview: ["Jalen Brunson", "Scottie Barnes"],
      draftPicksOwned: ["2026 R1"],
    }),
  ]

  await page.route("**/api/discover/orphan-teams**", async (route) => {
    const url = new URL(route.request().url())
    latestParams = url.searchParams
    const pageNum = Math.max(1, Number(url.searchParams.get("page") ?? "1"))
    const cards = pageNum === 1 ? pageOneCards : pageTwoCards
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        cards,
        pagination: {
          page: pageNum,
          limit: 12,
          total: 24,
          hasMore: pageNum < 2,
        },
      }),
    })
  })

  await page.route("**/api/orphan-teams/requests", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        request: {
          id: "req-1",
          status: "pending",
        },
      }),
    })
  })

  return {
    getLatestParams: () => latestParams,
  }
}

test.describe("@orphan-team-marketplace click audit", () => {
  test("cards render, request adoption works, and filters/pagination are wired", async ({ page }) => {
    const mocks = await installOrphanMarketplaceMocks(page)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/orphan-teams", { waitUntil: "domcontentloaded" })

    const card = page.getByTestId("orphan-team-card-league-alpha-roster-alpha")
    await expect(card).toBeVisible()
    await expect(card).toContainText("Sport:")
    await expect(card).toContainText("League:")
    await expect(card).toContainText("Record:")
    await expect(card).toContainText("Scoring:")
    await expect(card).toContainText("Roster preview")
    await expect(card).toContainText("Draft picks owned")
    await expect(card).toContainText("AI preview:")

    await expect(page.getByTestId("orphan-team-request-league-alpha-roster-alpha")).toBeEnabled()
    await page.getByTestId("orphan-team-request-league-alpha-roster-alpha").click()
    await expect(page.getByTestId("orphan-team-request-league-alpha-roster-alpha")).toContainText("Pending approval")
    await expect(page.getByTestId("orphan-team-request-league-alpha-roster-alpha")).toBeDisabled()

    await page.getByTestId("orphan-teams-search-input").fill("alpha")
    await page.getByTestId("orphan-teams-sport-filter").selectOption("NFL")
    await page.getByTestId("orphan-teams-league-type-filter").fill("dynasty")
    await page.getByTestId("orphan-teams-search-submit").click()

    const latestParams = mocks.getLatestParams()
    expect(latestParams.get("q")).toBe("alpha")
    expect(latestParams.get("sport")).toBe("NFL")
    expect(latestParams.get("leagueType")).toBe("dynasty")

    await page.getByTestId("orphan-teams-pagination-next").click()
    await expect(page.getByTestId("orphan-team-card-league-beta-roster-beta")).toBeVisible()
    await expect(page.getByTestId("orphan-teams-pagination-next")).toBeDisabled()

    await page.getByTestId("orphan-teams-pagination-prev").click()
    await expect(page.getByTestId("orphan-team-card-league-alpha-roster-alpha")).toBeVisible()
    await expect(page.getByTestId("orphan-teams-pagination-prev")).toBeDisabled()
  })
})

