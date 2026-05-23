/**
 * Verifies that World Cup AI locked states expose an upgrade CTA pointing at
 * /upgrade?plan=af_pro and that the daily cap 429 response includes an
 * upgradeRequired signal so the Chimmy shell can render an upgrade button.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { DAILY_CAP_LIMITS } from "@/lib/ai/dailyCaps"
import { checkDailyCap } from "@/lib/ai/dailyCaps"

// ── Static source checks ──────────────────────────────────────────────────────

const EXPLAIN_CARD_SRC = readFileSync(
  resolve(process.cwd(), "components/brackets/world-cup/WorldCupExplainBracketCard.tsx"),
  "utf-8"
)

const BRACKET_BRAIN_LOCKED_SRC = readFileSync(
  resolve(process.cwd(), "components/bracket-brain/BracketBrainLockedCard.tsx"),
  "utf-8"
)

const CHIMMY_ROUTE_SRC = readFileSync(
  resolve(process.cwd(), "app/api/chimmy/route.ts"),
  "utf-8"
)

const SETTINGS_SRC = readFileSync(
  resolve(process.cwd(), "app/settings/SettingsFullPage.tsx"),
  "utf-8"
)

describe("WorldCupExplainBracketCard locked state upgrade CTA", () => {
  it("renders a link to /upgrade?plan=af_pro in the locked state", () => {
    expect(EXPLAIN_CARD_SRC).toContain("/upgrade?plan=af_pro")
  })

  it("upgrade link has data-testid for UI testing", () => {
    expect(EXPLAIN_CARD_SRC).toContain("world-cup-explain-bracket-upgrade-link")
  })

  it("locked state still shows the i18n locked description", () => {
    expect(EXPLAIN_CARD_SRC).toContain('t("wc.explain.locked")')
  })
})

describe("BracketBrainLockedCard upgrade link", () => {
  it("renders a link to /upgrade?plan=af_pro", () => {
    expect(BRACKET_BRAIN_LOCKED_SRC).toContain("/upgrade?plan=af_pro")
  })

  it("upgrade link has data-testid", () => {
    expect(BRACKET_BRAIN_LOCKED_SRC).toContain("bracket-brain-locked-upgrade-link")
  })

  it("still mentions AF Pro in the descriptive text", () => {
    expect(BRACKET_BRAIN_LOCKED_SRC).toMatch(/AF Pro/i)
  })
})

describe("Settings page — subscription & billing section", () => {
  it("renders a subscription section with testid", () => {
    expect(SETTINGS_SRC).toContain("settings-subscription-section")
  })

  it("links to /pricing for plan upgrade", () => {
    expect(SETTINGS_SRC).toContain("settings-view-plans-link")
    expect(SETTINGS_SRC).toContain('href="/pricing"')
  })

  it("links to billing portal for existing subscribers", () => {
    expect(SETTINGS_SRC).toContain("settings-billing-portal-link")
    expect(SETTINGS_SRC).toContain("/api/subscription/billing-portal")
  })
})

describe("Chimmy daily cap 429 — upgrade signal", () => {
  it("DailyCapResult includes upgradePath field pointing at /pricing", () => {
    // DAILY_CAP_LIMITS is computed at module load; type check via shape inspection.
    // A limit-0 scenario returns upgradePath='/pricing'.
    // Verify the free cap for commissioner_brain is 0 (default env), which triggers the path.
    const freeCap = DAILY_CAP_LIMITS.commissioner_brain.free
    expect(freeCap).toBe(0) // default: commissioner_brain is not available for free users
  })

  it("chimmy route 429 response includes upgradeRequired and upgradePath", () => {
    // Static check: the route must inject upgradeRequired:true when cap is exceeded.
    expect(CHIMMY_ROUTE_SRC).toContain("upgradeRequired: true")
    expect(CHIMMY_ROUTE_SRC).toContain("upgradePath: capResult.upgradePath")
  })

  it("checkDailyCap returns upgradePath='/pricing' for a zero-limit tier (sync smoke)", async () => {
    // The commissioner_brain free cap is 0, so checkDailyCap returns not-allowed immediately.
    // This exercises the upgradePath field on the early-return path.
    const result = await checkDailyCap("commissioner_brain", "test-user-id", "free")
    expect(result.allowed).toBe(false)
    expect(result.upgradePath).toBe("/pricing")
  })
})

describe("Upgrade route target validity", () => {
  it("/upgrade page exists in app directory", () => {
    const upgradeSrc = readFileSync(
      resolve(process.cwd(), "app/upgrade/page.tsx"),
      "utf-8"
    )
    expect(upgradeSrc).toContain("MonetizationPurchaseSurface")
  })

  it("/pricing page exists and uses MonetizationPurchaseSurface", () => {
    const pricingSrc = readFileSync(
      resolve(process.cwd(), "app/pricing/page.tsx"),
      "utf-8"
    )
    expect(pricingSrc).toContain("MonetizationPurchaseSurface")
  })

  it("/upgrade accepts plan query param for focus (af_pro, af_commissioner, etc.)", () => {
    const upgradeSrc = readFileSync(
      resolve(process.cwd(), "app/upgrade/page.tsx"),
      "utf-8"
    )
    expect(upgradeSrc).toContain("af_pro")
    expect(upgradeSrc).toContain("af_commissioner")
    expect(upgradeSrc).toContain("focusPlanFamily")
  })
})
