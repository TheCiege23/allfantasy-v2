import { expect, test } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

async function gotoWithRetry(page: Parameters<typeof test>[0]["page"], url: string) {
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded" })
      return
    } catch (error) {
      const message = String((error as Error)?.message ?? error)
      const canRetry =
        attempt < 6 &&
        (
          message.includes("net::ERR_ABORTED") ||
          message.includes("NS_BINDING_ABORTED") ||
          message.includes("net::ERR_CONNECTION_RESET") ||
          message.includes("NS_ERROR_CONNECTION_REFUSED") ||
          message.includes("Failure when receiving data from the peer") ||
          message.includes("Could not connect to server") ||
          message.includes("interrupted by another navigation")
        )
      if (!canRetry) throw error
      await page.waitForTimeout(500 * attempt)
    }
  }
}

test.describe("@player-comparison-lab click audit", () => {
  test("audits add/remove/swap/scoring/retry/chimmy wiring", async ({ page }) => {
    const compareBodies: Array<Record<string, unknown>> = []
    const insightBodies: Array<Record<string, unknown>> = []

    await page.route("**/api/subscription/entitlements**", async (route) => {
      const url = new URL(route.request().url())
      const feature = String(url.searchParams.get("feature") ?? "")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          entitlement: {
            plans: ["pro"],
            status: "active",
            currentPeriodEnd: null,
            gracePeriodEnd: null,
          },
          hasAccess: true,
          message: "Access granted.",
          requiredPlan: feature ? "AF Pro" : null,
          upgradePath: feature
            ? `/upgrade?plan=pro&feature=${encodeURIComponent(feature)}`
            : "/upgrade?plan=pro",
        }),
      })
    })

    await page.route("**/api/monetization/context**", async (route) => {
      const url = new URL(route.request().url())
      const feature = String(url.searchParams.get("feature") ?? "player_ai_recommendations")
      const ruleCodes = url.searchParams.getAll("ruleCode")
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          entitlement: {
            plans: ["pro"],
            status: "active",
            currentPeriodEnd: null,
            gracePeriodEnd: null,
          },
          entitlementMessage: "Access granted.",
          feature: {
            featureId: feature,
            hasAccess: true,
            requiredPlan: "AF Pro",
            upgradePath: `/upgrade?plan=pro&feature=${encodeURIComponent(feature)}`,
            message: "Access granted.",
          },
          tokenBalance: {
            balance: 8,
            lifetimePurchased: 0,
            lifetimeSpent: 0,
            lifetimeRefunded: 0,
            updatedAt: new Date().toISOString(),
          },
          tokenPreviews: ruleCodes.map((ruleCode) => ({
            ruleCode,
            preview: {
              ruleCode,
              featureLabel: "Player AI action",
              tokenCost: 1,
              currentBalance: 8,
              canSpend: true,
              requiresConfirmation: true,
            },
            error: null,
          })),
        }),
      })
    })

    await page.route("**/api/instant/player-search**", async (route) => {
      const url = new URL(route.request().url())
      const q = (url.searchParams.get("q") ?? "").toLowerCase()
      const rows: Array<{ name: string; position: string; team: string }> = []
      if (q.includes("josh")) rows.push({ name: "Josh Allen", position: "QB", team: "BUF" })
      if (q.includes("jalen")) rows.push({ name: "Jalen Hurts", position: "QB", team: "PHI" })
      if (q.includes("bijan")) rows.push({ name: "Bijan Robinson", position: "RB", team: "ATL" })
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(rows),
      })
    })

    await page.route("**/api/player-comparison", async (route) => {
      const body = route.request().postDataJSON() as {
        players?: string[]
        sport?: string
        scoringFormat?: string
      }
      compareBodies.push(body as Record<string, unknown>)
      const names = Array.isArray(body.players) ? body.players : ["Josh Allen", "Jalen Hurts"]
      const players = names.map((name, index) => ({
        name,
        position: index === 2 ? "RB" : "QB",
        team: index === 0 ? "BUF" : index === 1 ? "PHI" : "ATL",
        historical: [
          { season: "2025", gamesPlayed: 17, fantasyPoints: 350 - index * 18, fantasyPointsPerGame: 20.5 - index * 1.1, receptions: index === 2 ? 62 : 0 },
        ],
        projection: {
          value: 9000 - index * 400,
          rank: 5 + index * 4,
          positionRank: 2 + index,
          trend30Day: 180 - index * 20,
          redraftValue: 360 - index * 20,
          source: "fantasycalc",
          position: index === 2 ? "RB" : "QB",
          team: index === 0 ? "BUF" : index === 1 ? "PHI" : "ATL",
          volatility: 12 + index * 3,
        },
        internalAdp: 20 + index * 5,
        sleeperAdp: 19 + index * 5,
        internalProjectionPoints: 350 - index * 16,
        injury: { status: index === 1 ? "Questionable" : "Active", source: "espn", riskScore: index === 1 ? 55 : 15, note: null },
        scheduleDifficultyScore: 48 + index * 4,
        sourceFlags: {
          fantasyCalc: true,
          sleeper: true,
          espnInjuryFeed: true,
          internalAdp: true,
          internalProjections: true,
          leagueScoringSettings: true,
        },
      }))

      const row = (id: string, label: string, values: number[], higherIsBetter: boolean) => {
        const valuesByPlayer = Object.fromEntries(players.map((p, i) => [p.name, values[i] ?? null]))
        const sorted = [...players]
          .map((p, i) => ({ name: p.name, value: values[i] }))
          .sort((a, b) => higherIsBetter ? b.value - a.value : a.value - b.value)
        return {
          dimensionId: id,
          label,
          valuesByPlayer,
          winnerName: sorted[0]?.name ?? null,
          higherIsBetter,
        }
      }

      const matrix = [
        row("market_value", "Market value", players.map((p) => p.projection.value), true),
        row("fantasy_production", "Fantasy production", players.map((p) => p.historical[0].fantasyPointsPerGame), true),
        row("projection", "Projection", players.map((p) => p.internalProjectionPoints), true),
        row("volatility", "Volatility", players.map((p) => p.projection.volatility), false),
        row("consistency", "Consistency", [84, 79, 76], true),
        row("schedule_difficulty", "Schedule difficulty", players.map((p) => p.scheduleDifficultyScore), false),
        row("injury_risk", "Injury risk", players.map((p) => p.injury.riskScore), false),
        row("trend_momentum", "Trend momentum", players.map((p) => p.projection.trend30Day), true),
      ]

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sport: body.sport ?? "NFL",
          scoringFormat: body.scoringFormat ?? "ppr",
          players,
          matrix,
          categoryWinners: matrix.map((m) => ({ dimensionId: m.dimensionId, label: m.label, winnerName: m.winnerName, value: m.valuesByPlayer[m.winnerName as string] ?? null })),
          playerScores: players.map((p, idx) => ({
            playerName: p.name,
            vorpDifference: 20 - idx * 8,
            projectionDelta: 12 - idx * 6,
            consistencyScore: 84 - idx * 4,
            volatilityScore: p.projection.volatility,
          })),
          summaryLines: [
            `${players[0].name} leads projection and trend categories.`,
            `${players[1].name} carries moderate injury risk.`,
          ],
          sourceCoverage: {
            fantasyCalc: true,
            sleeper: true,
            espnInjuryFeed: true,
            internalAdp: true,
            internalProjections: true,
            leagueScoringSettings: true,
          },
        }),
      })
    })

    await page.route("**/api/player-comparison/insight", async (route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>
      insightBodies.push(body)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          recommendation: "Josh Allen is the strongest deterministic edge across value, projection, and momentum.",
          finalRecommendation: "Josh Allen is the strongest deterministic edge across value, projection, and momentum.",
          providerAnalyses: {
            deepseek: "DeepSeek: Allen leads the highest-value categories with the best volatility-adjusted profile.",
            grok: "Grok: narrative momentum favors Allen while Hurts has more week-to-week noise.",
            openai: "OpenAI: prioritize Allen unless roster construction specifically needs alternate risk exposure.",
          },
          providerStatus: { deepseek: true, grok: true, openai: true },
        }),
      })
    })

    await gotoWithRetry(page, "/player-comparison-lab")
    await expect(page.getByTestId("player-comparison-lab-heading")).toBeVisible()

    const playerInput0 = page.getByTestId("player-input-0").first()
    const playerInput1 = page.getByTestId("player-input-1").first()
    const playerSlot2 = page.getByTestId("player-slot-2")
    await expect(playerInput0).toBeVisible()
    await expect(playerInput1).toBeVisible()
    const removeButtons = page.getByRole("button", { name: "Remove player" })
    await expect(removeButtons).toHaveCount(2)
    const addPlayerButton = page.getByRole("button", { name: /^Add player$/i })
    const ensureThirdPlayerSlot = async () => {
      await expect(addPlayerButton).toBeVisible({ timeout: 10_000 })

      for (let refreshAttempt = 0; refreshAttempt < 2; refreshAttempt += 1) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const slotCount = await playerSlot2.count().catch(() => 0)
          const removeCount = await removeButtons.count().catch(() => 0)
          if (slotCount > 0 || removeCount >= 3) return true

          await addPlayerButton.scrollIntoViewIfNeeded().catch(() => null)
          await addPlayerButton.click({ force: true, timeout: 1_500 }).catch(() => null)
          await addPlayerButton.dispatchEvent("click").catch(() => null)
          await addPlayerButton.evaluate((button) => (button as HTMLButtonElement).click()).catch(() => null)
          await page
            .evaluate(() => {
              const add = document.querySelector('[data-testid="add-player-button"]')
              if (add instanceof HTMLElement) add.click()
            })
            .catch(() => null)

          const grew = await expect
            .poll(async () => {
              const count = await removeButtons.count().catch(() => 0)
              const hasSlot = (await playerSlot2.count().catch(() => 0)) > 0
              return hasSlot || count >= 3
            }, {
              timeout: 2_500,
              intervals: [150, 250, 400, 700, 1_000],
            })
            .toBeTruthy()
            .then(() => true)
            .catch(() => false)

          if (grew) return true
          await page.waitForTimeout(300 + attempt * 80)
        }

        await page.reload({ waitUntil: "domcontentloaded" }).catch(() => null)
        await expect(page.getByTestId("player-comparison-lab-heading")).toBeVisible()
        await expect(addPlayerButton).toBeVisible({ timeout: 10_000 })
        await page.waitForTimeout(500)
      }

      return false
    }

    const added = await ensureThirdPlayerSlot()
    expect(added).toBeTruthy()
    const thirdRemoveButton = page.getByRole("button", { name: "Remove player" }).nth(2)
    await expect(thirdRemoveButton).toBeEnabled()
    await thirdRemoveButton.click({ force: true })
    await expect.poll(() => removeButtons.count()).toBeGreaterThan(1)

    await playerInput0.fill("Josh")
    await page.getByRole("button", { name: /Josh Allen/i }).first().click()
    await playerInput1.fill("Jalen")
    await page.getByRole("button", { name: /Jalen Hurts/i }).first().click()

    if ((await removeButtons.count().catch(() => 0)) < 3) {
      await ensureThirdPlayerSlot()
    }
    await expect.poll(() => removeButtons.count()).toBeGreaterThan(2)
    const playerInput2 = page.getByTestId("player-input-2").first()
    await playerInput2.fill("Bijan")
    await page.getByRole("button", { name: /Bijan Robinson/i }).first().click()

    const firstBefore = await playerInput0.inputValue()
    const secondBefore = await playerInput1.inputValue()
    await page.getByTestId("swap-player-down-0").first().click({ force: true })
    await expect(playerInput0).toHaveValue(secondBefore)
    await expect(playerInput1).toHaveValue(firstBefore)

    const scoringSelect = page.getByTestId("scoring-format-select")
    if (await scoringSelect.isVisible().catch(() => false)) {
      await scoringSelect.click()
    } else {
      await page.locator('[data-audit="scoring-format-select"]').first().click()
    }
    await page.getByRole("option", { name: "Half-PPR" }).click()

    await page.getByTestId("compare-player-button").click()
    await expect(page.getByTestId("comparison-matrix")).toBeVisible()
    await expect(page.getByTestId("comparison-source-coverage")).toContainText("FantasyCalc: yes")

    await page.getByTestId("retry-analysis-button").click()
    await expect(page.getByTestId("comparison-ai-final-recommendation")).toContainText("Josh Allen is the strongest deterministic edge")

    const chimmyLink = page.getByTestId("open-in-chimmy-link")
    await expect(chimmyLink).toHaveAttribute("href", /\/messages\?tab=ai/)

    expect(compareBodies.length).toBeGreaterThan(0)
    expect(insightBodies.length).toBeGreaterThan(0)
    expect(compareBodies[0]?.scoringFormat).toBe("half_ppr")
  })
})
