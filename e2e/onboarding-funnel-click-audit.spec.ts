import { expect, test, type Request } from "@playwright/test"

test.describe.configure({ timeout: 180_000 })

function parseBody(request: Request): Record<string, unknown> {
  try {
    const json = request.postDataJSON()
    if (json && typeof json === "object") {
      return json as Record<string, unknown>
    }
  } catch {}

  const raw = request.postData() ?? "{}"
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

test.describe("@activation onboarding funnel click audit", () => {
  test("next/skip flow works and sports preferences are persisted", async ({ page }) => {
    let completeCalled = false
    const funnelCalls: Array<{ step?: string; completeFunnel?: boolean; preferredSports?: string[] }> = []

    await page.route("**/api/onboarding/funnel", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            currentStep: "welcome",
            completedAt: null,
            isComplete: false,
          }),
        })
        return
      }

      const body = parseBody(route.request()) as {
        step?: string
        completeFunnel?: boolean
        preferredSports?: string[]
      }
      funnelCalls.push(body)
      const step = String(body.step ?? "")
      const completeFunnel = Boolean(body.completeFunnel)

      if (completeFunnel) {
        completeCalled = true
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true, nextStep: "completed" }),
        })
        return
      }

      const nextByStep: Record<string, string> = {
        welcome: "app_walkthrough",
        app_walkthrough: "sport_selection",
        sport_selection: "tool_suggestions",
        tool_suggestions: "league_prompt",
        league_prompt: "completed",
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          nextStep: nextByStep[step] ?? "completed",
        }),
      })
    })

    await page.goto("/e2e/onboarding-funnel?step=welcome", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(1200)

    await expect(page.getByTestId("onboarding-step-welcome")).toBeVisible()
    await expect(page.getByTestId("onboarding-next-welcome")).toBeVisible()
    await expect(page.getByTestId("onboarding-skip-welcome")).toBeVisible()
    await page.getByTestId("onboarding-next-welcome").click()
    await expect
      .poll(() => funnelCalls.some((call) => call.step === "welcome" && !call.completeFunnel))
      .toBeTruthy()

    await page.goto("/e2e/onboarding-funnel?step=sport_selection", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(1200)
    await expect(page.getByTestId("onboarding-step-sport-selection")).toBeVisible()
    const soccerOption = page.getByTestId("onboarding-sport-option-SOCCER")
    await soccerOption.evaluate((button) => (button as HTMLButtonElement).click())
    await page.getByTestId("onboarding-next-sport-selection").click()

    await expect
      .poll(() => {
        const sportCall = funnelCalls.find((call) => call.step === "sport_selection")
        if (!sportCall?.preferredSports) return false
        return sportCall.preferredSports.includes("SOCCER")
      }, { timeout: 10_000 })
      .toBeTruthy()

    await page.goto("/e2e/onboarding-funnel?step=league_prompt", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(400)
    await expect(page.getByTestId("onboarding-step-league-prompt")).toBeVisible()
    await expect(page.getByTestId("onboarding-league-create-link")).toBeVisible()
    await expect(page.getByTestId("onboarding-league-discover-link")).toBeVisible()
    await expect(page.getByTestId("onboarding-league-create-bracket-link")).toBeVisible()
    await page.getByTestId("onboarding-skip-league-prompt").click()

    await expect.poll(() => completeCalled).toBeTruthy()
  })

  test("tool links route correctly and track tool-visit milestone", async ({ page }) => {
    const toolMilestones: Array<Record<string, unknown>> = []

    await page.route("**/api/onboarding/checklist", async (route) => {
      const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>
      toolMilestones.push(body)
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          tasks: [],
          completedCount: 1,
          totalCount: 5,
          isFullyComplete: false,
        }),
      })
    })

    await page.route("**/api/onboarding/funnel", async (route) => {
      const body = parseBody(route.request())
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          nextStep: body.completeFunnel ? "completed" : "league_prompt",
        }),
      })
    })

    await page.goto("/e2e/onboarding-funnel?step=tool_suggestions", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(1200)
    await expect(page.getByTestId("onboarding-step-tool-suggestions")).toBeVisible()

    await expect(page.getByTestId("onboarding-tool-link-trade-analyzer")).toHaveAttribute("href", "/trade-analyzer")
    await expect(page.getByTestId("onboarding-tool-link-waiver-ai")).toHaveAttribute("href", "/waiver-ai")
    await expect(page.getByTestId("onboarding-tool-link-draft-war-room")).toHaveAttribute("href", "/mock-draft")
    await expect(page.getByTestId("onboarding-tool-link-chimmy-chat")).toHaveAttribute("href", "/chimmy")

    await page.getByTestId("onboarding-tool-link-trade-analyzer").click()
    await expect(page).toHaveURL(/\/trade-analyzer/, { timeout: 15_000 })

    const milestoneRequest = toolMilestones.find(
      (m) => m.milestone === "onboarding_tool_visit" && typeof m.meta === "object"
    )
    expect(milestoneRequest).toBeTruthy()
  })
})
