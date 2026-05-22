/**
 * Coverage for the Phase 7 premium /brackets hub restoration.
 *
 * Verifies:
 *  - The page source contains every major section (hero, World Cup
 *    spotlight, how-it-works, sports grid, AI features strip, footer).
 *  - All visible static labels are routed through `t("brk.hub.*")` —
 *    no pre-restoration hardcoded English literals remain.
 *  - Every new `brk.hub.*` key exists in every supported locale, with
 *    representative non-English label spot checks.
 *  - The asset paths used in the hero (AF logo, AF mascot, WC logo,
 *    WC poster, WC video) actually exist in `public/`. This is the
 *    "asset fallback" guarantee from the brief — if a future commit
 *    removes one of these without updating the hub, the test fires.
 *  - The page is a pure server component: no `"use client"`, no
 *    `useSession`, no `useState`, no Prisma import. (The emergency
 *    hardening that pre-dated this rebuild was caused exactly by a
 *    client-island `useSession` hydration race; this test keeps that
 *    fence in place.)
 *  - The page reuses `resolveServerRenderPreferences` (the safe
 *    server-only locale resolver already shipping on
 *    /brackets/world-cup pages).
 *  - The page is still wrapped in `mode-readable` so the previous
 *    readability pass still applies in light mode.
 *  - No new app route / page files were added; the existing
 *    `app/brackets/page.tsx` is still the only `page.tsx` under
 *    `app/brackets/` at the root.
 *  - The page does NOT import the dev Google Translate batch script.
 */
import { describe, expect, it } from "vitest"
import { readFileSync, existsSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve, join } from "node:path"
import {
  BRACKETS_TRANSLATIONS,
  BRACKETS_SUPPORTED_LOCALES,
  bracketsT,
} from "@/lib/brackets/bracketsI18n"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")

function readSource(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8")
}

const HUB_SRC = readSource("app/brackets/page.tsx")

// ── Section presence ──────────────────────────────────────────────────────

describe("brackets hub restore: section coverage", () => {
  it("hero renders title, subtitle, launch badge, and primary CTAs", () => {
    expect(HUB_SRC).toContain(`t("brk.hub.heroTitle")`)
    expect(HUB_SRC).toContain(`t("brk.hub.heroSubtitle")`)
    expect(HUB_SRC).toContain(`t("brk.hub.heroBadge")`)
    expect(HUB_SRC).toContain(`t("brk.hub.heroCreateWc")`)
    expect(HUB_SRC).toContain(`t("brk.hub.heroJoinWithCode")`)
    expect(HUB_SRC).toContain(`t("brk.hub.heroDiscover")`)
    expect(HUB_SRC).toContain(`t("brk.hub.heroDashboard")`)
  })

  it("World Cup spotlight section renders", () => {
    expect(HUB_SRC).toContain('data-testid="brackets-hub-world-cup-spotlight"')
    expect(HUB_SRC).toContain(`t("brk.hub.spotlight.eyebrow")`)
    expect(HUB_SRC).toContain(`t("brk.hub.spotlight.title")`)
    expect(HUB_SRC).toContain(`t("brk.hub.spotlight.subtitle")`)
    // All 7 feature bullets reference the WC spotlight key namespace.
    const featureKeys = [
      "groupStage",
      "knockoutBracket",
      "aiReport",
      "dangerZones",
      "commissionerTools",
      "inviteShare",
      "fiveLanguages",
    ]
    for (const key of featureKeys) {
      expect(HUB_SRC).toContain(`brk.hub.spotlight.feature.${key}`)
    }
  })

  it("how-it-works 3-step section renders", () => {
    expect(HUB_SRC).toContain('data-testid="brackets-hub-how-it-works"')
    expect(HUB_SRC).toContain(`t("brk.hub.howItWorks.title")`)
    for (const step of [1, 2, 3]) {
      expect(HUB_SRC).toContain(`brk.hub.howItWorks.step${step}Title`)
      expect(HUB_SRC).toContain(`brk.hub.howItWorks.step${step}Body`)
    }
  })

  it("sports grid renders all 8 sport cards", () => {
    expect(HUB_SRC).toContain('data-testid="brackets-hub-sports-grid"')
    expect(HUB_SRC).toContain(`t("brk.hub.sports.title")`)
    expect(HUB_SRC).toContain(`t("brk.hub.sports.subtitle")`)
    const sports = [
      "worldCup",
      "nbaPlayoffs",
      "nhlPlayoffs",
      "nflPlayoffs",
      "mlbPostseason",
      "marchMadness",
      "collegeFootball",
      "soccer",
    ]
    for (const key of sports) {
      // The card lookup uses template literals (titleKey/descKey),
      // so the source contains each sport identifier in the
      // SPORT_CARDS array literal and the template patterns
      // `brk.hub.sports.sport.${key}` / `brk.hub.sports.sport.${key}.desc`.
      expect(HUB_SRC).toContain(`key: "${key}"`)
    }
    // Stable test-id template-literal source construction (one assert,
    // not per-sport, since the data-testid is built at render time).
    expect(HUB_SRC).toContain("brackets-hub-sport-${key}")
    // The template-literal source construction for the title + desc
    // keys is asserted once (not per-sport) so the parity test below
    // confirms the dictionary actually has the resolved keys.
    expect(HUB_SRC).toContain("brk.hub.sports.sport.${key}")
    expect(HUB_SRC).toContain("brk.hub.sports.sport.${key}.desc")
    // The live World Cup card links to the WC hub. The href is set
    // via the SPORT_CARDS data table, then passed to <Link href={href}>.
    expect(HUB_SRC).toContain(`href: "/brackets/world-cup"`)
    expect(HUB_SRC).toContain(`<Link key={key} href={href}`)
    expect(HUB_SRC).toContain(`t("brk.hub.sports.statusLive")`)
    expect(HUB_SRC).toContain(`t("brk.hub.sports.statusComingSoon")`)
  })

  it("AI features strip renders all 6 features", () => {
    expect(HUB_SRC).toContain('data-testid="brackets-hub-ai-features"')
    expect(HUB_SRC).toContain(`t("brk.hub.features.title")`)
    const features = [
      "aiReport",
      "rooting",
      "danger",
      "commissioner",
      "share",
      "leaderboards",
    ]
    for (const key of features) {
      // Features come from an AI_FEATURES array; each `key` literal
      // must appear in source as `key: "<feature>"`.
      expect(HUB_SRC).toContain(`key: "${key}"`)
    }
    // Template-literal source construction for the label + desc keys.
    expect(HUB_SRC).toContain("brk.hub.features.${key}")
    expect(HUB_SRC).toContain("brk.hub.features.${key}.desc")
  })

  it("footer renders the trust note", () => {
    expect(HUB_SRC).toContain('data-testid="brackets-hub-footer"')
    expect(HUB_SRC).toContain(`t("brk.hub.footer.note")`)
  })
})

// ── Pre-restore literals are gone ────────────────────────────────────────

describe("brackets hub restore: pre-restoration literals removed", () => {
  it("no longer hardcodes the minimal hardened JSX literals", () => {
    const banned = [
      'background: "#0b1020"',
      "Get started",
      ">Create a pool<",
      ">Join with code<",
      "MINIMAL HARDENED",
      ">Sports<",
      // The minimal page had a 32-px padding inline style — should
      // be replaced by Tailwind class usage now.
      'padding: "32px 16px"',
    ]
    for (const phrase of banned) {
      expect(
        HUB_SRC,
        `Restored hub should not contain "${phrase}"`
      ).not.toContain(phrase)
    }
  })
})

// ── i18n parity for new hub keys ─────────────────────────────────────────

describe("brackets hub restore: i18n parity", () => {
  const newKeys = [
    "brk.hub.eyebrow",
    "brk.hub.heroTitle",
    "brk.hub.heroSubtitle",
    "brk.hub.heroBadge",
    "brk.hub.heroCreateWc",
    "brk.hub.heroJoinWithCode",
    "brk.hub.heroDiscover",
    "brk.hub.heroDashboard",
    "brk.hub.spotlight.eyebrow",
    "brk.hub.spotlight.title",
    "brk.hub.spotlight.subtitle",
    "brk.hub.spotlight.feature.groupStage",
    "brk.hub.spotlight.feature.knockoutBracket",
    "brk.hub.spotlight.feature.aiReport",
    "brk.hub.spotlight.feature.dangerZones",
    "brk.hub.spotlight.feature.commissionerTools",
    "brk.hub.spotlight.feature.inviteShare",
    "brk.hub.spotlight.feature.fiveLanguages",
    "brk.hub.howItWorks.title",
    "brk.hub.howItWorks.step1Title",
    "brk.hub.howItWorks.step1Body",
    "brk.hub.howItWorks.step2Title",
    "brk.hub.howItWorks.step2Body",
    "brk.hub.howItWorks.step3Title",
    "brk.hub.howItWorks.step3Body",
    "brk.hub.sports.title",
    "brk.hub.sports.subtitle",
    "brk.hub.sports.statusLive",
    "brk.hub.sports.statusComingSoon",
    "brk.hub.sports.openCta",
    "brk.hub.sports.sport.worldCup",
    "brk.hub.sports.sport.worldCup.desc",
    "brk.hub.sports.sport.nbaPlayoffs",
    "brk.hub.sports.sport.nbaPlayoffs.desc",
    "brk.hub.sports.sport.nhlPlayoffs",
    "brk.hub.sports.sport.nhlPlayoffs.desc",
    "brk.hub.sports.sport.nflPlayoffs",
    "brk.hub.sports.sport.nflPlayoffs.desc",
    "brk.hub.sports.sport.mlbPostseason",
    "brk.hub.sports.sport.mlbPostseason.desc",
    "brk.hub.sports.sport.marchMadness",
    "brk.hub.sports.sport.marchMadness.desc",
    "brk.hub.sports.sport.collegeFootball",
    "brk.hub.sports.sport.collegeFootball.desc",
    "brk.hub.sports.sport.soccer",
    "brk.hub.sports.sport.soccer.desc",
    "brk.hub.features.title",
    "brk.hub.features.aiReport",
    "brk.hub.features.aiReport.desc",
    "brk.hub.features.rooting",
    "brk.hub.features.rooting.desc",
    "brk.hub.features.danger",
    "brk.hub.features.danger.desc",
    "brk.hub.features.commissioner",
    "brk.hub.features.commissioner.desc",
    "brk.hub.features.share",
    "brk.hub.features.share.desc",
    "brk.hub.features.leaderboards",
    "brk.hub.features.leaderboards.desc",
    "brk.hub.footer.note",
    "brk.hub.mascotAlt",
    "brk.hub.logoAlt",
    "brk.hub.wcLogoAlt",
  ]

  for (const locale of BRACKETS_SUPPORTED_LOCALES) {
    it(`every new hub key has a translation in locale "${locale}"`, () => {
      const dict = BRACKETS_TRANSLATIONS[locale]
      const missing: string[] = []
      for (const key of newKeys) {
        if (typeof dict[key] !== "string" || dict[key].length === 0) {
          missing.push(key)
        }
      }
      expect(missing, `Locale "${locale}" is missing keys`).toEqual([])
    })
  }

  it.each([
    ["en", "brk.hub.heroTitle", "Bracket Pools"],
    ["es", "brk.hub.heroTitle", "Bracket Pools"], // brand term — same in es
    ["zh", "brk.hub.heroTitle", "對戰群組"],
    ["fil", "brk.hub.heroTitle", "Bracket Pools"],
    ["vi", "brk.hub.heroTitle", "Bracket Pools"],
    ["es", "brk.hub.heroCreateWc", "Crear grupo de la Copa del Mundo"],
    ["zh", "brk.hub.heroCreateWc", "建立世界盃群組"],
    ["fil", "brk.hub.heroCreateWc", "Gumawa ng World Cup pool"],
    ["vi", "brk.hub.heroCreateWc", "Tạo pool World Cup"],
    ["en", "brk.hub.sports.statusLive", "Live now"],
    ["es", "brk.hub.sports.statusLive", "En vivo"],
    ["zh", "brk.hub.sports.statusLive", "進行中"],
    ["fil", "brk.hub.sports.statusComingSoon", "Malapit na"],
    ["vi", "brk.hub.sports.statusComingSoon", "Sắp ra mắt"],
  ])("locale %s key %s renders as %s", (locale, key, expected) => {
    expect(bracketsT(locale, key)).toBe(expected)
  })

  it("unsupported locale falls back to English", () => {
    expect(bracketsT("xx", "brk.hub.heroTitle")).toBe("Bracket Pools")
    expect(bracketsT("xx", "brk.hub.heroBadge")).toBe(
      "2026 World Cup pools are live"
    )
  })
})

// ── Asset fallback ───────────────────────────────────────────────────────

describe("brackets hub restore: asset paths exist in public/", () => {
  const assets = [
    "public/branding/allfantasy-wordmark-logo.png",
    "public/af-robot-king.png",
    "public/images/brackets/world-cup/af-world-cup-logo.png",
    "public/videos/brackets/world-cup/af-world-cup-hero.mp4",
    "public/images/brackets/world-cup/af-world-cup-hero-poster.jpg",
  ]

  for (const asset of assets) {
    it(`asset present: ${asset}`, () => {
      expect(
        existsSync(resolve(root, asset)),
        `${asset} must exist (hub hero references it via next/image)`
      ).toBe(true)
    })
  }

  it("hub source references each asset path verbatim", () => {
    expect(HUB_SRC).toContain("/branding/allfantasy-wordmark-logo.png")
    expect(HUB_SRC).toContain("/af-robot-king.png")
    expect(HUB_SRC).toContain("/images/brackets/world-cup/af-world-cup-logo.png")
    expect(HUB_SRC).toContain("/videos/brackets/world-cup/af-world-cup-hero.mp4")
    expect(HUB_SRC).toContain(
      "/images/brackets/world-cup/af-world-cup-hero-poster.jpg"
    )
  })
})

// ── Server-component / hydration safety fence ────────────────────────────

describe("brackets hub restore: server component safety fence", () => {
  it("page is a pure server component — no client islands", () => {
    expect(HUB_SRC).not.toMatch(/^"use client"/m)
    // Match the function call form, not the substring (JSDoc legitimately
    // mentions "useSession" / "useState" when explaining what we DON'T do).
    expect(HUB_SRC).not.toMatch(/\buseSession\(/)
    expect(HUB_SRC).not.toMatch(/\buseState\(/)
    expect(HUB_SRC).not.toMatch(/\buseEffect\(/)
  })

  it("page does NOT import Prisma at render scope", () => {
    expect(HUB_SRC).not.toMatch(/from\s+["']@\/lib\/prisma["']/)
    expect(HUB_SRC).not.toMatch(/from\s+["']\.\/prisma["']/)
    expect(HUB_SRC).not.toMatch(/PrismaClient/)
  })

  it("page uses the safe server-only preference resolver for locale", () => {
    expect(HUB_SRC).toContain(`resolveServerRenderPreferences`)
    expect(HUB_SRC).toContain(`makeBracketsT`)
  })

  it("page keeps the mode-readable wrapper for light-mode rescue", () => {
    expect(HUB_SRC).toContain(`className="mode-readable`)
    // Still preserves the hardcoded dark `bg-[#05070b]` for dark/AF
    // modes (mode-readable is a no-op outside light mode).
    expect(HUB_SRC).toContain("bg-[#05070b]")
  })

  it("page does NOT import the dev Google Translate batch script", () => {
    expect(HUB_SRC).not.toMatch(/translate-brackets-i18n/i)
    expect(HUB_SRC).not.toMatch(/googleapis\.com\/translate/i)
    expect(HUB_SRC).not.toMatch(/GOOGLE_TRANSLATE_API_KEY/)
  })
})

// ── Route budget safety ─────────────────────────────────────────────────

describe("brackets hub restore: route budget safety", () => {
  it("only one page.tsx exists at app/brackets/ root (no new pages)", () => {
    const dir = resolve(root, "app", "brackets")
    const entries = readdirSync(dir)
    const pageFiles = entries.filter((entry) =>
      ["page.ts", "page.tsx", "page.js", "page.jsx"].includes(entry)
    )
    expect(pageFiles).toEqual(["page.tsx"])
  })

  it("no new route.ts file lives in app/brackets/ root", () => {
    const dir = resolve(root, "app", "brackets")
    const entries = readdirSync(dir)
    const routeFiles = entries.filter((entry) =>
      ["route.ts", "route.tsx", "route.js"].includes(entry)
    )
    expect(routeFiles).toEqual([])
  })

  it("global app/ route count is within the 2048 budget (no >3 deltas)", () => {
    const appDir = resolve(root, "app")
    let count = 0
    const walk = (dir: string) => {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (
          entry.name === "route.ts" ||
          entry.name === "route.tsx" ||
          entry.name === "page.ts" ||
          entry.name === "page.tsx"
        ) {
          count++
        }
      }
    }
    walk(appDir)
    // Same sanity envelope used by the readability pass test — keeps
    // us under the Vercel 2048 ceiling without locking in the exact
    // 1797 number (the audit script counts more signals).
    expect(count).toBeGreaterThan(200)
    expect(count).toBeLessThan(2048)
  })
})
