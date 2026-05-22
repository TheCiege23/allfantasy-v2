/**
 * Targeted wiring coverage for the World Cup public conversion flows
 * (Create / Discover / Join). The full helper unit tests live in
 * world-cup-i18n.test.ts and brackets-i18n.test.ts — this file proves
 * that the new keys are wired into the actual flow components and that
 * the components do not retain hardcoded English fallbacks for the
 * strings they now claim to translate.
 *
 * It does not render React; instead it greps the component source as
 * text. That's enough to catch the common regression where someone
 * adds a key but forgets to swap the JSX literal, and it doesn't drag
 * in the full Next.js + Prisma + auth test harness.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import {
  WORLD_CUP_TRANSLATIONS,
  WORLD_CUP_SUPPORTED_LOCALES,
  wcT,
  makeWcT,
} from "@/lib/world-cup/worldCupI18n"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")

function readSource(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8")
}

const CREATE_SRC = readSource(
  "components/brackets/world-cup/WorldCupBracketCreateModal.tsx"
)
const DISCOVER_SRC = readSource(
  "components/brackets/world-cup/WorldCupDiscoverClient.tsx"
)
const DISCOVER_CARD_SRC = readSource(
  "components/brackets/world-cup/WorldCupDiscoverCard.tsx"
)
const INVITE_PANEL_SRC = readSource(
  "components/brackets/world-cup/WorldCupInviteJoinPanel.tsx"
)
const JOIN_PAGE_SRC = readSource("app/brackets/world-cup/join/page.tsx")

describe("WC public flows i18n: dictionary parity for new keys", () => {
  const newCreateKeys = [
    "wc.create.header",
    "wc.create.subheader",
    "wc.create.heroTitle",
    "wc.create.heroSubtitle",
    "wc.create.poolName.label",
    "wc.create.poolName.placeholder",
    "wc.create.poolName.error.blank",
    "wc.create.poolName.default",
    "wc.create.visibility.label",
    "wc.create.visibility.private",
    "wc.create.visibility.privateHint",
    "wc.create.visibility.public",
    "wc.create.visibility.publicHint",
    "wc.create.maxUsers.label",
    "wc.create.maxUsers.hint",
    "wc.create.maxUsers.error",
    "wc.create.maxEntries.label",
    "wc.create.maxEntries.hint",
    "wc.create.maxEntries.error",
    "wc.create.lockRule.label",
    "wc.create.lockRule.tournament",
    "wc.create.lockRule.tournamentHint",
    "wc.create.lockRule.perMatch",
    "wc.create.lockRule.perMatchHint",
    "wc.create.lockRule.copyTournament",
    "wc.create.lockRule.copyPerMatch",
    "wc.create.scoring.intro",
    "wc.create.scoring.values",
    "wc.create.helper.entriesOne",
    "wc.create.helper.entriesOther",
    "wc.create.helper.leaderboard",
    "wc.create.helper.inviteLink",
    "wc.create.thirdPlace",
    "wc.create.testFixtures.label",
    "wc.create.testFixtures.hint",
    "wc.create.submit.idle",
    "wc.create.submit.creating",
    "wc.create.submit.opening",
    "wc.create.openingSuccess",
    "wc.create.error.signInRequired",
    "wc.create.error.noId",
    "wc.create.error.generic",
    "wc.create.error.requestFailed",
    "wc.create.goBack",
  ]
  const newDiscoverKeys = [
    "wc.discover.backToHub",
    "wc.discover.createPool",
    "wc.discover.title",
    "wc.discover.subtitle",
    "wc.discover.search.label",
    "wc.discover.search.placeholder",
    "wc.discover.season.label",
    "wc.discover.season.placeholder",
    "wc.discover.statusFilter.label",
    "wc.discover.statusFilter.all",
    "wc.discover.statusFilter.open",
    "wc.discover.statusFilter.locked",
    "wc.discover.statusFilter.final",
    "wc.discover.loading",
    "wc.discover.errors.couldNotLoad",
    "wc.discover.empty",
    "wc.discover.joinPanelTitle",
    "wc.discover.card.statusOpen",
    "wc.discover.card.blockedFull",
    "wc.discover.card.blockedClosed",
    "wc.discover.card.password",
    "wc.discover.card.lateJoin",
    "wc.discover.card.preview",
    "wc.discover.card.join",
  ]
  const newJoinKeys = [
    "wc.join.backToHub",
    "wc.join.brandEyebrow",
    "wc.join.brandTitle",
    "wc.join.panelTitle",
    "wc.join.panelHelper",
    "wc.join.codeInput.placeholder",
    "wc.join.previewBtn",
    "wc.join.errors.invalidCode",
    "wc.join.errors.notFound",
    "wc.join.errors.full",
    "wc.join.errors.closed",
    "wc.join.errors.couldNotJoin",
    "wc.join.preview.hostLine",
    "wc.join.preview.openCopy",
    "wc.join.preview.fullCopy",
    "wc.join.preview.closedCopy",
    "wc.join.preview.passwordLabel",
    "wc.join.preview.joinBtn",
    "wc.join.success",
  ]

  for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
    it(`every new Create/Discover/Join key has a translation in locale "${locale}"`, () => {
      const dict = WORLD_CUP_TRANSLATIONS[locale]
      const missing: string[] = []
      for (const key of [...newCreateKeys, ...newDiscoverKeys, ...newJoinKeys]) {
        if (typeof dict[key] !== "string" || dict[key].length === 0) {
          missing.push(key)
        }
      }
      expect(missing, `Locale "${locale}" is missing keys`).toEqual([])
    })
  }
})

describe("WC public flows i18n: Create modal wiring", () => {
  it("calls t(...) for the major Create labels", () => {
    // Headers
    expect(CREATE_SRC).toContain(`t("wc.create.header")`)
    expect(CREATE_SRC).toContain(`t("wc.create.subheader")`)
    expect(CREATE_SRC).toContain(`t("wc.create.heroTitle")`)
    expect(CREATE_SRC).toContain(`t("wc.create.heroSubtitle")`)
    // Form labels
    expect(CREATE_SRC).toContain(`t("wc.create.poolName.label")`)
    expect(CREATE_SRC).toContain(`t("wc.create.poolName.placeholder")`)
    expect(CREATE_SRC).toContain(`t("wc.create.visibility.label")`)
    expect(CREATE_SRC).toContain(`t("wc.create.visibility.private")`)
    expect(CREATE_SRC).toContain(`t("wc.create.visibility.public")`)
    expect(CREATE_SRC).toContain(`t("wc.create.maxUsers.label")`)
    expect(CREATE_SRC).toContain(`t("wc.create.maxEntries.label")`)
    expect(CREATE_SRC).toContain(`t("wc.create.lockRule.label")`)
    expect(CREATE_SRC).toContain(`t("wc.create.lockRule.tournament")`)
    expect(CREATE_SRC).toContain(`t("wc.create.lockRule.perMatch")`)
    expect(CREATE_SRC).toContain(`t("wc.create.thirdPlace")`)
    // Submit + status
    expect(CREATE_SRC).toContain(`t("wc.create.submit.idle")`)
    expect(CREATE_SRC).toContain(`t("wc.create.submit.creating")`)
    expect(CREATE_SRC).toContain(`t("wc.create.submit.opening")`)
    expect(CREATE_SRC).toContain(`t("wc.create.openingSuccess")`)
    // Errors
    expect(CREATE_SRC).toContain(`t("wc.create.error.signInRequired")`)
    expect(CREATE_SRC).toContain(`t("wc.create.error.noId")`)
    expect(CREATE_SRC).toContain(`t("wc.create.error.generic")`)
    // Helpers
    expect(CREATE_SRC).toContain(`t("wc.create.scoring.intro")`)
    expect(CREATE_SRC).toContain(`t("wc.create.helper.leaderboard")`)
  })

  it("does NOT retain pre-i18n English literals for the translated strings", () => {
    // These exact phrasings used to appear as hardcoded JSX literals.
    // Verify they no longer do. We assert each as a >node-text< boundary
    // to avoid false positives on incidental occurrences in comments.
    const banned = [
      ">Pool Name<",
      ">Pool Visibility<",
      ">Pick Lock Rule<",
      ">Private<",
      ">Public<",
      ">Tournament Lock<",
      ">Per-Match Lock<",
      ">Max Users<",
      ">Brackets per User<",
      ">Create Pool<",
      ">Create World Cup Bracket Pool<",
      ">Pool name cannot be blank.<",
      "Please sign in to create a bracket.",
      "Failed to create bracket",
    ]
    for (const phrase of banned) {
      expect(CREATE_SRC, `Create modal should no longer hardcode "${phrase}"`).not.toContain(
        phrase
      )
    }
  })

  it("uses the language provider", () => {
    expect(CREATE_SRC).toContain(`useOptionalLanguage`)
    expect(CREATE_SRC).toContain(`makeWcT`)
  })
})

describe("WC public flows i18n: Discover wiring", () => {
  it("calls t(...) for the major Discover labels", () => {
    expect(DISCOVER_SRC).toContain(`t("wc.discover.title")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.subtitle")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.search.label")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.search.placeholder")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.season.label")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.statusFilter.label")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.statusFilter.all")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.statusFilter.open")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.statusFilter.locked")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.statusFilter.final")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.loading")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.empty")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.backToHub")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.createPool")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.joinPanelTitle")`)
    expect(DISCOVER_SRC).toContain(`t("wc.discover.errors.couldNotLoad")`)
  })

  it("Discover card calls t(...) for label, status, and CTAs", () => {
    expect(DISCOVER_CARD_SRC).toContain(`t("wc.discover.card.preview")`)
    expect(DISCOVER_CARD_SRC).toContain(`t("wc.discover.card.join")`)
    expect(DISCOVER_CARD_SRC).toContain(`t("wc.discover.card.blockedFull")`)
    expect(DISCOVER_CARD_SRC).toContain(`t("wc.discover.card.blockedClosed")`)
    expect(DISCOVER_CARD_SRC).toContain(`t("wc.discover.card.password")`)
    expect(DISCOVER_CARD_SRC).toContain(`t("wc.discover.card.lateJoin")`)
  })

  it("does NOT retain pre-i18n English literals for translated Discover/Card strings", () => {
    const banned = [
      ">Discover public pools<",
      ">Search<",
      ">Season<",
      ">Status<",
      ">League full<",
      ">Closed to new players<",
      ">Password<",
      ">Preview<",
      ">Join<",
    ]
    for (const phrase of [...banned]) {
      if (DISCOVER_SRC.includes(phrase) && !phrase.startsWith(">Preview<")) {
        // ">Preview<" can still appear inside DISCOVER_CARD_SRC where
        // it's now t("wc.discover.card.preview"). Only assert the
        // DISCOVER_SRC for the broader phrases that are exclusively
        // shell-level.
      }
      expect(DISCOVER_SRC, `Discover client should not hardcode "${phrase}"`).not.toContain(
        phrase
      )
    }
    // For card: status pills + CTAs must be gone from raw JSX.
    expect(DISCOVER_CARD_SRC).not.toContain(">Preview<")
    expect(DISCOVER_CARD_SRC).not.toContain(">Join<")
    expect(DISCOVER_CARD_SRC).not.toContain(">Password<")
  })

  it("uses the language provider in both Discover client and card", () => {
    expect(DISCOVER_SRC).toContain(`useOptionalLanguage`)
    expect(DISCOVER_CARD_SRC).toContain(`useOptionalLanguage`)
  })
})

describe("WC public flows i18n: Join page + invite panel wiring", () => {
  it("Join page calls t(...) for the page chrome", () => {
    expect(JOIN_PAGE_SRC).toContain(`t("wc.join.backToHub")`)
    expect(JOIN_PAGE_SRC).toContain(`t("wc.join.brandEyebrow")`)
    expect(JOIN_PAGE_SRC).toContain(`t("wc.join.brandTitle")`)
    expect(JOIN_PAGE_SRC).toContain(`t("wc.join.panelTitle")`)
  })

  it("Join page uses the server preference resolver (not client localStorage)", () => {
    expect(JOIN_PAGE_SRC).toContain(`resolveServerRenderPreferences`)
    expect(JOIN_PAGE_SRC).not.toContain(`localStorage`)
    expect(JOIN_PAGE_SRC).not.toContain(`navigator.language`)
  })

  it("Invite panel calls t(...) for code input, errors, and preview labels", () => {
    expect(INVITE_PANEL_SRC).toContain(`t("wc.join.codeInput.placeholder")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.join.previewBtn")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.join.errors.invalidCode")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.join.errors.notFound")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.join.errors.full")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.join.errors.closed")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.join.preview.openCopy")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.join.preview.passwordLabel")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.join.preview.joinBtn")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.join.success")`)
    expect(INVITE_PANEL_SRC).toContain(`t("wc.join.panelHelper")`)
  })

  it("does NOT retain pre-i18n English literals for translated Join strings", () => {
    const banned = [
      ">Preview<",
      ">Join league<",
      ">Join password<",
      "Enter a valid invite code",
      "Invite not found",
      "This pool is full.",
      "This pool is closed to new players.",
      "WCUP invite code",
      `"You're in — Bracket 1 is ready."`,
    ]
    for (const phrase of banned) {
      expect(
        INVITE_PANEL_SRC,
        `Invite panel should not hardcode "${phrase}"`
      ).not.toContain(phrase)
    }
  })

  it("uses the language provider", () => {
    expect(INVITE_PANEL_SRC).toContain(`useOptionalLanguage`)
    expect(INVITE_PANEL_SRC).toContain(`makeWcT`)
  })
})

describe("WC public flows i18n: hydration safety", () => {
  for (const src of [CREATE_SRC, DISCOVER_SRC, DISCOVER_CARD_SRC, INVITE_PANEL_SRC]) {
    it("client component does not read localStorage / navigator.language at module/component scope", () => {
      // Allow these inside event handlers / effects only — flag if they
      // appear in render-path JSX directly.
      // We do a coarse check: no `localStorage.` references at all (the
      // language provider handles persistence). Same for navigator.language.
      expect(src).not.toMatch(/localStorage\./)
      expect(src).not.toMatch(/navigator\.language/)
      expect(src).not.toMatch(/window\.navigator/)
    })
  }

  it("Join server page does not read browser-only APIs", () => {
    expect(JOIN_PAGE_SRC).not.toMatch(/localStorage\./)
    expect(JOIN_PAGE_SRC).not.toMatch(/navigator\./)
    expect(JOIN_PAGE_SRC).not.toMatch(/window\./)
    expect(JOIN_PAGE_SRC).not.toMatch(/document\./)
  })

  it("translated strings used by SSR do not include locale-dependent toLocaleString output", () => {
    // toLocaleString output differs between Node SSR and browser CSR.
    // The dictionaries themselves should be static strings, never built
    // by calling toLocaleString at module scope.
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      const dict = WORLD_CUP_TRANSLATIONS[locale]
      for (const [key, value] of Object.entries(dict)) {
        expect(
          value.includes("toLocaleString"),
          `${locale}.${key} should not contain "toLocaleString"`
        ).toBe(false)
      }
    }
  })
})

describe("WC public flows i18n: render-path smoke for each locale", () => {
  // Lightweight sanity that each locale's translated copy is what we
  // expect for one representative key per flow.
  it.each([
    ["es", "wc.create.submit.idle", "Crear grupo"],
    ["zh", "wc.create.submit.idle", "建立群組"],
    ["fil", "wc.create.submit.idle", "Gumawa ng pool"],
    ["vi", "wc.create.submit.idle", "Tạo pool"],
    ["es", "wc.discover.title", "Descubrir grupos públicos"],
    ["zh", "wc.discover.title", "探索公開群組"],
    ["fil", "wc.discover.title", "Maghanap ng public pools"],
    ["vi", "wc.discover.title", "Khám phá pool công khai"],
    ["es", "wc.join.preview.joinBtn", "Unirse al grupo"],
    ["zh", "wc.join.preview.joinBtn", "加入群組"],
    ["fil", "wc.join.preview.joinBtn", "Sumali sa league"],
    ["vi", "wc.join.preview.joinBtn", "Tham gia pool"],
  ])(
    "locale %s key %s renders as %s",
    (locale, key, expected) => {
      expect(wcT(locale, key)).toBe(expected)
    }
  )

  it("makeWcT bound for each locale resolves all 3 flow representative keys", () => {
    for (const locale of WORLD_CUP_SUPPORTED_LOCALES) {
      const tt = makeWcT(locale)
      expect(typeof tt("wc.create.submit.idle")).toBe("string")
      expect(typeof tt("wc.discover.title")).toBe("string")
      expect(typeof tt("wc.join.preview.joinBtn")).toBe("string")
      expect(tt("wc.create.submit.idle").length).toBeGreaterThan(0)
      expect(tt("wc.discover.title").length).toBeGreaterThan(0)
      expect(tt("wc.join.preview.joinBtn").length).toBeGreaterThan(0)
    }
  })
})
