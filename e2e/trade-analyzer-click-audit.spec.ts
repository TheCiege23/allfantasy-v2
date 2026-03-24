import { expect, test } from "@playwright/test"

test.describe("@shell trade analyzer click audit", () => {
  test("audits trade analyzer interactions end to end", async ({ page }) => {
    let analyzeCalls = 0
    let lastPayload: Record<string, unknown> | null = null

    await page.route("**/api/trade-evaluator", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback()
        return
      }
      analyzeCalls += 1
      try {
        lastPayload = route.request().postDataJSON() as Record<string, unknown>
      } catch {
        lastPayload = null
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

    await page.goto("/trade-evaluator", { waitUntil: "domcontentloaded" })

    await expect(page.getByRole("heading", { name: "AF Trade Analyzer" })).toBeVisible()
    const sportOptionValues = await page.locator('label:has-text("Sport") + select option').evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLOptionElement).value)
    )
    expect(sportOptionValues).toEqual(["NFL", "NHL", "NBA", "MLB", "NCAAF", "NCAAB", "SOCCER"])
    await expect(page.getByText("Add players and picks to both sides")).toBeVisible()

    const managerInputs = page.getByPlaceholder("e.g., Dynasty Destroyers")
    await managerInputs.nth(0).fill("Team Alpha")
    await managerInputs.nth(1).fill("Team Beta")

    const playerInputs = page.getByPlaceholder("Player name")
    await playerInputs.nth(0).fill("Josh Allen")
    await playerInputs.nth(1).fill("CeeDee Lamb")

    await page.getByLabel("Sport").selectOption("SOCCER")
    await page.getByTestId("trade-add-pick-sender").click()
    await page.getByTestId("trade-add-pick-receiver").click()
    await page.getByTestId("trade-remove-pick-receiver-0").click()
    await page.getByTestId("trade-add-pick-receiver").click()

    const faabInputs = page.getByLabel("FAAB Giving")
    await faabInputs.nth(0).fill("10")
    await faabInputs.nth(1).fill("5")

    await page.getByTestId("trade-swap-sides-button").click()
    await expect(managerInputs.nth(0)).toHaveValue("Team Beta")
    await expect(managerInputs.nth(1)).toHaveValue("Team Alpha")

    await page.getByTestId("trade-evaluate-button").click()
    await expect.poll(() => analyzeCalls).toBeGreaterThan(0)
    await expect(page.getByText("Fairness Score")).toBeVisible()
    await expect(page.getByTestId("trade-ai-explanation-link")).toBeVisible()
    await expect(page.getByTestId("trade-ai-explanation-link")).toHaveAttribute("href", /\/messages\?tab=ai/)
    await expect(page.getByTestId("trade-ai-explanation-link")).toHaveAttribute("href", /sport=SOCCER/)

    await page.getByTestId("trade-clear-side-sender").click()
    await expect(page.getByTestId("trade-evaluate-button")).toBeDisabled()

    await playerInputs.nth(0).fill("Amon-Ra St. Brown")
    await page.getByTestId("trade-evaluate-button").click()
    await expect.poll(() => analyzeCalls).toBeGreaterThan(1)
    await expect(page.getByText("Inputs changed. Re-run analysis to refresh this result.")).toHaveCount(0)

    await page.getByTestId("trade-result-tab-breakdown").click()
    await expect(page.getByText("Open trade finder / propose flow")).toBeVisible()
    await expect(page.getByTestId("trade-propose-flow-link")).toHaveAttribute("href", /\/trade-finder\?context=analyzer&sport=SOCCER/)

    await page.getByTestId("trade-result-tab-outlook").click()
    await page.getByTestId("trade-outlook-current-toggle").click()
    await expect(page.getByText("End of Season Projection")).toBeVisible()
    await page.getByTestId("trade-outlook-future-toggle").click()
    await expect(page.getByText("Dynasty Outlook")).toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })
    await page.getByTestId("trade-result-tab-overview").click()
    await expect(page.getByText("Winner:")).toBeVisible()
    await page.getByTestId("trade-result-tab-breakdown").click()
    await expect(page.getByText("Suggested Counter-Offer")).toBeVisible()

    await page.getByTestId("trade-reset-button").click()
    await expect(page.getByText("Add players and picks to both sides")).toBeVisible()

    expect(lastPayload).not.toBeNull()
    const analyzedPayload = lastPayload as { league?: { sport?: string } } | null
    expect(analyzedPayload?.league?.sport).toBe("SOCCER")
  })
})
