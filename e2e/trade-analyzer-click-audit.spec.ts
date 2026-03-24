import { expect, test, type Page } from "@playwright/test"

type AnalyzeAuditContext = {
  analyzeCalls: number
  lastPayload: Record<string, unknown> | null
}

async function mockTradeEvaluator(page: Page): Promise<AnalyzeAuditContext> {
  const state: AnalyzeAuditContext = {
    analyzeCalls: 0,
    lastPayload: null,
  }
  await page.route("**/api/trade-evaluator", async (route) => {
    if (route.request().method() !== "POST") {
      await route.fallback()
      return
    }
    state.analyzeCalls += 1
    try {
      state.lastPayload = route.request().postDataJSON() as Record<string, unknown>
    } catch {
      state.lastPayload = null
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        evaluation: {
          fairness_score_0_to_100: 54,
          winner: "even",
          summary: "Balanced exchange with a slight future edge to the receiver.",
          explanation: "Both sides stay competitive while shifting risk profiles.",
          risk_flags: ["Future pick volatility", "Injury variance"],
        },
        tradeInsights: {
          fairnessScore: 54,
          fairnessMethod: "lineup",
          netDeltaPct: 2,
          labels: [
            {
              id: "fit",
              name: "Roster Fit",
              emoji: "✅",
              description: "Both teams address a positional weakness.",
            },
          ],
          warnings: [
            {
              id: "future",
              name: "Future Risk",
              emoji: "⚠️",
              description: "Future value depends on player development.",
            },
          ],
          veto: false,
          vetoReason: null,
          expertWarning: null,
          idpLineupWarning: null,
        },
        user_message: {
          to_sender: "I can add a future 3rd if needed.",
          to_receiver: "This gives you immediate WR depth.",
        },
        improvements: {
          best_counter_offer: {
            sender_gives_changes: ["Swap a 2nd for a 3rd"],
            receiver_gives_changes: ["Add bench RB depth"],
            why_this_is_better: "Tightens fairness while keeping upside on both sides.",
          },
        },
        dynasty_idp_outlook: {
          sender: "Future depth remains stable over 2-3 years.",
          receiver: "Long-term upside improves if young assets hit.",
        },
        end_of_season_projection: {
          sender: "Slight points increase over next 6 weeks.",
          receiver: "Neutral short-term impact with more depth.",
        },
      }),
    })
  })
  return state
}

async function settleTradeEvaluator(page: Page) {
  await expect(page.getByRole("heading", { name: "AF Trade Analyzer" })).toBeVisible()
  await page.waitForLoadState("networkidle")
}

async function fillMinimalTrade(page: Page) {
  const evaluateButton = page.getByTestId("trade-evaluate-button")
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.locator("#trade-sender-manager-name").fill("Team Alpha")
    await page.locator("#trade-receiver-manager-name").fill("Team Beta")
    await page.getByLabel("sender player 1 name").fill("Josh Allen")
    await page.getByLabel("receiver player 1 name").fill("CeeDee Lamb")
    await page.locator("#trade-sender-faab").fill("10")
    await page.locator("#trade-receiver-faab").fill("5")
    if (await evaluateButton.isEnabled()) return
    await page.waitForTimeout(400)
  }
  await expect(evaluateButton).toBeEnabled({ timeout: 10_000 })
}

test.describe("@shell trade analyzer click audit", () => {
  test.describe.configure({ mode: "serial" })

  test("routes from SEO landing into trade evaluator", async ({ page }) => {
    await page.goto("/trade-analyzer", { waitUntil: "domcontentloaded" })
    await page.getByRole("link", { name: "Open Trade Analyzer" }).first().click()
    await expect(page).toHaveURL(/\/trade-evaluator/)
    await settleTradeEvaluator(page)
  })

  test("runs deterministic analyze flow with sport-aware AI routing", async ({ page }) => {
    const state = await mockTradeEvaluator(page)
    await page.goto("/trade-evaluator", { waitUntil: "domcontentloaded" })
    await settleTradeEvaluator(page)

    const sportOptionValues = await page.locator('label:has-text("Sport") + select option').evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLOptionElement).value)
    )
    expect(sportOptionValues).toEqual(["NFL", "NHL", "NBA", "MLB", "NCAAF", "NCAAB", "SOCCER"])

    await page.getByLabel("Sport").selectOption("SOCCER")
    await fillMinimalTrade(page)
    await page.getByTestId("trade-evaluate-button").click()

    await expect.poll(() => state.analyzeCalls).toBe(1)
    await expect(page.getByText("Fairness Score", { exact: true })).toBeVisible()
    await expect(page.getByTestId("trade-ai-explanation-link")).toHaveAttribute("href", /\/messages\?tab=ai/)
    await expect(page.getByTestId("trade-ai-explanation-link")).toHaveAttribute("href", /sport=SOCCER/)

    await page.getByTestId("trade-result-tab-breakdown").click()
    await expect(page.getByText("Current vs Future Value Lens")).toBeVisible()
    await expect(page.getByTestId("trade-propose-flow-link")).toHaveAttribute("href", /\/trade-finder\?context=analyzer&sport=SOCCER/)

    await page.getByTestId("trade-result-tab-outlook").click()
    await page.getByTestId("trade-outlook-current-toggle").click()
    await expect(page.getByRole("heading", { name: "End of Season Projection" })).toBeVisible()
    await page.getByTestId("trade-outlook-future-toggle").click()
    await expect(page.getByRole("heading", { name: "Dynasty Outlook" })).toBeVisible()

    await page.getByLabel("sender player 1 name").fill("Amon-Ra St. Brown")
    await expect(page.getByText("Inputs changed. Re-run analysis to refresh this result.")).toBeVisible()
    await page.getByTestId("trade-evaluate-button").click()
    await expect.poll(() => state.analyzeCalls).toBe(2)
    await expect(page.getByText("Inputs changed. Re-run analysis to refresh this result.")).toHaveCount(0)

    expect(state.lastPayload).not.toBeNull()
    const analyzedPayload = state.lastPayload as { league?: { sport?: string } } | null
    expect(analyzedPayload?.league?.sport).toBe("SOCCER")
  })

  test("audits builder controls, swap/reset, and mobile tab clicks", async ({ page }) => {
    await mockTradeEvaluator(page)
    await page.goto("/trade-evaluator", { waitUntil: "domcontentloaded" })
    await settleTradeEvaluator(page)

    const senderPlayerRemovers = page.getByRole("button", { name: /Remove sender player/i })
    const senderPlayerCount = await senderPlayerRemovers.count()
    await page.getByTestId("trade-add-player-sender").click()
    await expect(senderPlayerRemovers).toHaveCount(senderPlayerCount + 1)
    await senderPlayerRemovers.last().click()
    await expect(senderPlayerRemovers).toHaveCount(senderPlayerCount)

    const senderPickRemovers = page.getByRole("button", { name: /Remove sender pick/i })
    const senderPickCount = await senderPickRemovers.count()
    await page.getByTestId("trade-add-pick-sender").click()
    await expect(senderPickRemovers).toHaveCount(senderPickCount + 1)
    await senderPickRemovers.last().click()
    await expect(senderPickRemovers).toHaveCount(senderPickCount)

    await fillMinimalTrade(page)
    await page.getByTestId("trade-swap-sides-button").click()
    await fillMinimalTrade(page)
    await page.getByTestId("trade-evaluate-button").click()
    await expect(page.getByText("Fairness Score", { exact: true })).toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByTestId("trade-result-tab-overview").click()
    await expect(page.getByText("Winner:")).toBeVisible()
    await page.getByTestId("trade-result-tab-breakdown").click()
    await expect(page.getByText("Suggested Counter-Offer")).toBeVisible()

    await page.getByTestId("trade-reset-button").click()
    await expect(page.getByText("Add players and picks to both sides")).toBeVisible()
    await expect(page.getByTestId("trade-evaluate-button")).toBeDisabled()
  })
})
