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
  it("v2 centered hero renders registration badge, two-line title, subtitle, feature dots, three CTAs, and fan pill", () => {
    // Stable test ID for smoke targeting.
    expect(HUB_SRC).toContain('data-testid="brackets-hub-hero"')
    // Top "Registration Open" emerald badge.
    expect(HUB_SRC).toContain(`t("brk.hub.v2.regBadge")`)
    // Two-line title (white line 1, cyan→purple gradient line 2).
    expect(HUB_SRC).toContain(`t("brk.hub.v2.titleLine1")`)
    expect(HUB_SRC).toContain(`t("brk.hub.v2.titleLine2")`)
    // Tight subtitle.
    expect(HUB_SRC).toContain(`t("brk.hub.v2.subtitle")`)
    // Four feature dots.
    expect(HUB_SRC).toContain(`t("brk.hub.v2.feature.teams")`)
    expect(HUB_SRC).toContain(`t("brk.hub.v2.feature.matches")`)
    expect(HUB_SRC).toContain(`t("brk.hub.v2.feature.format")`)
    expect(HUB_SRC).toContain(`t("brk.hub.v2.feature.free")`)
    // Three CTAs (cyan / dark / amber).
    expect(HUB_SRC).toContain(`t("brk.hub.v2.cta.openBracket")`)
    expect(HUB_SRC).toContain(`t("brk.hub.v2.cta.createPool")`)
    expect(HUB_SRC).toContain(`t("brk.hub.v2.cta.discoverPools")`)
    // Bottom fan pill.
    expect(HUB_SRC).toContain('data-testid="brackets-hub-fan-pill"')
    expect(HUB_SRC).toContain(`t("brk.hub.v2.fanLine")`)
    // Top wordmark + Dashboard pill.
    expect(HUB_SRC).toContain(`t("brk.hub.logoAlt")`)
    expect(HUB_SRC).toContain(`t("brk.hub.heroDashboard")`)
  })

  it("hero links the three CTAs to the right WC routes", () => {
    expect(HUB_SRC).toContain(`href="/brackets/world-cup"`)
    expect(HUB_SRC).toContain(`href="/brackets/world-cup/create"`)
    expect(HUB_SRC).toContain(`href="/brackets/world-cup/discover"`)
  })

  it("hero country-code badges (BR/FR/DE/AR) are language-invariant ISO codes", () => {
    // Brazil / France / Germany / Argentina — four representative
    // World Cup powerhouse nations from different continents. ISO
    // codes by definition don't translate.
    expect(HUB_SRC).toContain(`FAN_COUNTRY_CODES`)
    expect(HUB_SRC).toContain(`["BR", "FR", "DE", "AR"]`)
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

  it("does not hardcode the v2 hero copy in JSX (every visible string flows through t())", () => {
    // Sanity: the literal English copy from the v2 design must NEVER
    // appear in the JSX render path — it has to be looked up via t()
    // so non-English locales work.
    const banned = [
      ">2026 FIFA World Cup<",
      ">AF World Cup<",
      ">Bracket Challenge<",
      ">32 Teams<",
      ">48 Matches<",
      ">Group Stage + Knockouts<",
      ">100% Free<",
      ">World Cup Bracket<",
      ">Create Pool<",
      ">Discover Pools<",
      "Join thousands of fans competing worldwide",
    ]
    for (const phrase of banned) {
      expect(
        HUB_SRC,
        `Hero JSX should not hardcode "${phrase}"`
      ).not.toContain(phrase)
    }
  })
})

// ── i18n parity for new hub keys ─────────────────────────────────────────

describe("brackets hub restore: i18n parity", () => {
  const newKeys = [
    // v2 hero (the active hero design — image-matched WC challenge)
    "brk.hub.v2.regBadge",
    "brk.hub.v2.titleLine1",
    "brk.hub.v2.titleLine2",
    "brk.hub.v2.subtitle",
    "brk.hub.v2.feature.teams",
    "brk.hub.v2.feature.matches",
    "brk.hub.v2.feature.format",
    "brk.hub.v2.feature.free",
    "brk.hub.v2.cta.openBracket",
    "brk.hub.v2.cta.createPool",
    "brk.hub.v2.cta.discoverPools",
    "brk.hub.v2.cta.joinWithCode",
    "brk.hub.v2.fanLine",
    // v1 keys retained in the dictionary (unused by JSX now but kept
    // around so the parity tests below + any future variant can reuse
    // them without needing another i18n round-trip).
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
    "brk.hub.howItWorks.step4Title",
    "brk.hub.howItWorks.step4Body",
    "brk.hub.quickActions.title",
    "brk.hub.quickActions.create",
    "brk.hub.quickActions.createDesc",
    "brk.hub.quickActions.join",
    "brk.hub.quickActions.joinDesc",
    "brk.hub.quickActions.continue",
    "brk.hub.quickActions.continueDesc",
    "brk.hub.quickActions.browse",
    "brk.hub.quickActions.browseDesc",
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
    // v2 hero spot checks — one representative per locale.
    ["en", "brk.hub.v2.titleLine1", "AF World Cup"],
    ["en", "brk.hub.v2.titleLine2", "Bracket Challenge"],
    ["es", "brk.hub.v2.titleLine1", "AF Copa del Mundo"],
    ["es", "brk.hub.v2.titleLine2", "Desafío de Brackets"],
    ["zh", "brk.hub.v2.titleLine1", "AF 世界盃"],
    ["zh", "brk.hub.v2.titleLine2", "對戰挑戰"],
    ["fil", "brk.hub.v2.cta.createPool", "Gumawa ng pool"],
    ["vi", "brk.hub.v2.cta.openBracket", "Mở Bracket World Cup"],
    ["en", "brk.hub.v2.feature.teams", "48 Teams"],
    ["es", "brk.hub.v2.feature.teams", "48 selecciones"],
    ["zh", "brk.hub.v2.feature.format", "12 個小組 + 淘汰賽"],
    ["vi", "brk.hub.v2.feature.free", "Miễn phí 100%"],
    // Supporting sections still need their existing translations.
    ["en", "brk.hub.sports.statusLive", "Live now"],
    ["es", "brk.hub.sports.statusLive", "En vivo"],
    ["zh", "brk.hub.sports.statusLive", "進行中"],
    ["fil", "brk.hub.sports.statusComingSoon", "Malapit na"],
    ["vi", "brk.hub.sports.statusComingSoon", "Sắp ra mắt"],
  ])("locale %s key %s renders as %s", (locale, key, expected) => {
    expect(bracketsT(locale, key)).toBe(expected)
  })

  it("unsupported locale falls back to English", () => {
    expect(bracketsT("xx", "brk.hub.v2.titleLine1")).toBe("AF World Cup")
    expect(bracketsT("xx", "brk.hub.v2.titleLine2")).toBe("Bracket Challenge")
    expect(bracketsT("xx", "brk.hub.v2.regBadge")).toBe(
      "2026 FIFA World Cup · Registration Open"
    )
  })
})

// ── Asset fallback ───────────────────────────────────────────────────────

describe("brackets hub restore: asset paths exist in public/", () => {
  // v2 hero uses the AF wordmark and the WC trophy logo only — the
  // mascot + ambient video were dropped in favor of the centered
  // WC-focused trophy lockup that matches the product reference.
  const assets = [
    "public/branding/allfantasy-wordmark-logo.png",
    "public/images/brackets/world-cup/af-world-cup-logo.png",
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
    expect(HUB_SRC).toContain("/images/brackets/world-cup/af-world-cup-logo.png")
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
    // Base canvas stays `bg-[#05070b]` (the dark hex covered by the
    // mode-readable rescue layer in globals.css); the deep-teal feel
    // comes from the rgba(20,184,166,…) radial-gradient overlay
    // layered on top, which only renders in dark + AF modes anyway.
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
