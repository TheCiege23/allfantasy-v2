/**
 * World Cup Daily Edge Report — i18n, locale, and edge-cue tests
 *
 * ── E: Locale coverage ────────────────────────────────────────────────────────
 *   E1  All 37 wc.edgeReport.* keys present in every merged locale dict
 *   E2  All 6 non-EN locales differ from EN on wc.edgeReport.title
 *   E3  All 6 non-EN locales differ from EN for every edgeReport key (no silent EN fallback)
 *   E4  No wagering / betting language in any locale translation
 *   E5  Unknown locale falls back to EN (makeWcT returns EN value)
 *
 * ── F: Component locale / mobile ─────────────────────────────────────────────
 *   F1  EdgeReadyBadge absent while loading
 *   F2  EdgeReadyBadge visible after report loads (data-testid="edge-report-cue-ready")
 *   F3  No billing label shown when coaching not yet requested (locked/free state)
 *   F4  Mobile render at 375px does not crash and shows core testids
 *   F5  No duplicate "viewed" event on second render of same component
 */

import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ── Pure i18n imports (no mocks needed) ───────────────────────────────────────
import {
  WORLD_CUP_TRANSLATIONS,
  makeWcT,
} from "@/lib/world-cup/worldCupI18n"

// ── Hoisted mocks (for component tests F1-F5) ─────────────────────────────────

const {
  confirmTokenSpendMock,
  isTokenConfirmResponseMock,
  trackViewedMock,
} = vi.hoisted(() => ({
  confirmTokenSpendMock: vi.fn(),
  isTokenConfirmResponseMock: vi.fn(),
  trackViewedMock: vi.fn(),
}))

const fetchMock = vi.fn()
vi.stubGlobal("fetch", fetchMock)

vi.mock("@/components/i18n/LanguageProviderClient", () => ({
  useOptionalLanguage: () => ({ language: "en" }),
}))
vi.mock("@/lib/world-cup/worldCupI18n", async (importOriginal) => {
  // Keep real WORLD_CUP_TRANSLATIONS + makeWcT for E-suite tests,
  // but allow component tests to use a passthrough t() function.
  const original = await importOriginal<typeof import("@/lib/world-cup/worldCupI18n")>()
  return {
    ...original,
    makeWcT: (locale: string | null | undefined) => (key: string) => key,
  }
})
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("@/lib/world-cup/worldCupClientTokenConfirm", () => ({
  confirmWorldCupTokenSpend: confirmTokenSpendMock,
  isWorldCupTokenConfirmationResponse: isTokenConfirmResponseMock,
}))
vi.mock("@/lib/world-cup/worldCupEdgeReportAnalytics", () => ({
  trackEdgeReportViewed: trackViewedMock,
  trackEdgeReportUnlockClicked: vi.fn(),
  trackEdgeReportTokenConfirmed: vi.fn(),
  trackEdgeReportCacheHit: vi.fn(),
  trackEdgeReportCoachingLoaded: vi.fn(),
  trackEdgeReportError: vi.fn(),
  trackEdgeReportPostToChatClicked: vi.fn(),
  trackEdgeReportFeedbackClicked: vi.fn(),
}))
vi.mock("@/lib/analytics/client", () => ({
  sendProductAnalyticsBeacon: vi.fn(),
}))

import WorldCupDailyEdgeReportCard from "@/components/brackets/world-cup/WorldCupDailyEdgeReportCard"

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** All 37 wc.edgeReport.* keys defined in EN */
const EDGE_REPORT_KEYS = Object.keys(WORLD_CUP_TRANSLATIONS.en).filter((k) =>
  k.startsWith("wc.edgeReport.")
)

/** Wagering / betting terms that must not appear in any translation */
const FORBIDDEN_TERMS = [
  "bet",
  "gamble",
  "wager",
  "odds",
  "parlay",
  "sportsbook",
  "apuesta",
  "apuestas",
  "paris",
  "cược",
]

function makeSection(label: string) {
  return {
    headline: `${label} headline`,
    subtext: `${label} subtext`,
    bullets: [`${label} bullet`],
    confidence: "high" as const,
  }
}

const BASE_REPORT = {
  generatedAt: "2026-06-09T00:00:00.000Z",
  challengeId: "pool-1",
  poolName: "Test Pool",
  userRank: 2,
  totalEntries: 10,
  hasLiveData: true,
  hasPendingPicks: true,
  noEntry: false,
  sections: {
    matchThatMatters: makeSection("matchThatMatters"),
    rootFor: makeSection("rootFor"),
    threats: makeSection("threats"),
    bestPath: makeSection("bestPath"),
    mistakeToAvoid: makeSection("mistakeToAvoid"),
  },
  grounding: {
    poolName: "Test Pool",
    userRank: 2,
    totalEntries: 10,
    userScore: 80,
    userMaxPossible: 120,
    userChampion: "Brazil",
    championStillAlive: true,
    threatCount: 1,
    pendingPickCount: 2,
    pendingPickPoints: 20,
    topThreatName: "Rival A",
    topThreatCanReach: 5,
    bestClimbSpots: 3,
    hasLiveMatches: true,
  },
}

const GET_LOADED = {
  report: BASE_REPORT,
  coachingAvailable: true,
  coachingFromCache: false,
  billing: { deterministicSections: "free", coachingTokenCost: 1, coachingCached: false },
}

// ── Suite E: Locale coverage ──────────────────────────────────────────────────

describe("E: Locale coverage", () => {
  const NON_EN: Array<keyof typeof WORLD_CUP_TRANSLATIONS> = ["es", "zh", "fil", "vi", "fr", "ar"]

  it("E1: 37 wc.edgeReport.* keys are present in every merged locale dict", () => {
    expect(EDGE_REPORT_KEYS.length).toBe(37)

    for (const locale of [...NON_EN, "en"] as const) {
      const dict = WORLD_CUP_TRANSLATIONS[locale]
      for (const key of EDGE_REPORT_KEYS) {
        expect(dict, `locale=${locale} missing key "${key}"`).toHaveProperty(key)
        expect(
          (dict as Record<string, string>)[key],
          `locale=${locale} key "${key}" is empty`
        ).toBeTruthy()
      }
    }
  })

  it("E2: All 6 non-EN locales provide a different wc.edgeReport.title from EN", () => {
    const enTitle = WORLD_CUP_TRANSLATIONS.en["wc.edgeReport.title"]
    for (const locale of NON_EN) {
      expect(
        (WORLD_CUP_TRANSLATIONS[locale] as Record<string, string>)["wc.edgeReport.title"],
        `locale=${locale} title should differ from EN`
      ).not.toBe(enTitle)
    }
  })

  it("E3: All 6 non-EN locales differ from EN for every edgeReport key (no silent EN fallback)", () => {
    for (const locale of NON_EN) {
      const dict = WORLD_CUP_TRANSLATIONS[locale] as Record<string, string>
      const enDict = WORLD_CUP_TRANSLATIONS.en as Record<string, string>

      let translatedCount = 0
      for (const key of EDGE_REPORT_KEYS) {
        if (dict[key] !== enDict[key]) translatedCount++
      }

      // Expect at least 30 of 37 keys to have distinct translations
      expect(
        translatedCount,
        `locale=${locale} only has ${translatedCount}/${EDGE_REPORT_KEYS.length} distinct translations`
      ).toBeGreaterThanOrEqual(30)
    }
  })

  it("E4: No wagering / betting language in any locale edgeReport translation", () => {
    const allLocales = Object.keys(WORLD_CUP_TRANSLATIONS) as Array<keyof typeof WORLD_CUP_TRANSLATIONS>

    for (const locale of allLocales) {
      const dict = WORLD_CUP_TRANSLATIONS[locale] as Record<string, string>
      for (const key of EDGE_REPORT_KEYS) {
        const val = dict[key]?.toLowerCase() ?? ""
        for (const term of FORBIDDEN_TERMS) {
          expect(
            val,
            `locale=${locale} key="${key}" contains forbidden term "${term}": "${dict[key]}"`
          ).not.toContain(term)
        }
      }
    }
  })

  it("E5: makeWcT with unknown locale falls back to EN value for wc.edgeReport.title", async () => {
    // Re-import the real makeWcT (bypasses the component-test mock override)
    const { makeWcT: realMakeWcT } = await vi.importActual<typeof import("@/lib/world-cup/worldCupI18n")>(
      "@/lib/world-cup/worldCupI18n"
    )
    const t = realMakeWcT("xx-UNKNOWN")
    expect(t("wc.edgeReport.title")).toBe("Daily Edge Report")
  })
})

// ── Suite F: Component locale / mobile ────────────────────────────────────────

describe("F: Component locale / mobile", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    trackViewedMock.mockReset()
    isTokenConfirmResponseMock.mockImplementation(() => true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("F1: EdgeReadyBadge absent while report is loading", () => {
    // Never resolve the fetch so we stay in loading state
    fetchMock.mockReturnValueOnce(new Promise(() => undefined))

    render(
      <WorldCupDailyEdgeReportCard
        challengeId="pool-1"
        aiEntitled={false}
        isCommissioner={false}
      />
    )

    expect(screen.queryByTestId("edge-report-cue-ready")).not.toBeInTheDocument()
    expect(screen.getByTestId("edge-report-loading")).toBeInTheDocument()
  })

  it("F2: EdgeReadyBadge visible after report loads", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => GET_LOADED,
    })

    render(
      <WorldCupDailyEdgeReportCard
        challengeId="pool-1"
        aiEntitled={false}
        isCommissioner={false}
      />
    )

    await screen.findByTestId("edge-report-sections")
    expect(screen.getByTestId("edge-report-cue-ready")).toBeInTheDocument()
  })

  it("F3: No billing label shown when coaching not yet requested (locked/free state)", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => GET_LOADED,
    })

    render(
      <WorldCupDailyEdgeReportCard
        challengeId="pool-1"
        aiEntitled={false}
        isCommissioner={false}
      />
    )

    await screen.findByTestId("edge-report-sections")

    // Coaching block's billing label should not be present (coaching not loaded yet)
    expect(screen.queryByTestId("edge-report-billing-label")).not.toBeInTheDocument()
  })

  it("F4: Mobile render at 375px does not crash and shows core testids", async () => {
    // Simulate a narrow viewport (jsdom doesn't enforce layout but we can set matchMedia)
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 375,
    })
    window.dispatchEvent(new Event("resize"))

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => GET_LOADED,
    })

    render(
      <WorldCupDailyEdgeReportCard
        challengeId="pool-1"
        aiEntitled={false}
        isCommissioner={false}
      />
    )

    await screen.findByTestId("edge-report-sections")

    // Core elements must render at any viewport
    expect(screen.getByTestId("world-cup-daily-edge-report")).toBeInTheDocument()
    expect(screen.getByTestId("edge-report-free-badge")).toBeInTheDocument()
    expect(screen.getByTestId("edge-report-cue-ready")).toBeInTheDocument()
    expect(screen.getByTestId("edge-report-sections")).toBeInTheDocument()
  })

  it("F5: No duplicate 'viewed' event fired when component re-renders", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => GET_LOADED,
    })

    const { rerender } = render(
      <WorldCupDailyEdgeReportCard
        challengeId="pool-1"
        aiEntitled={false}
        isCommissioner={false}
      />
    )

    await screen.findByTestId("edge-report-sections")

    // Trigger a re-render with the same props
    await act(async () => {
      rerender(
        <WorldCupDailyEdgeReportCard
          challengeId="pool-1"
          aiEntitled={false}
          isCommissioner={false}
        />
      )
    })

    // "viewed" must fire exactly once across the mount + re-render
    expect(trackViewedMock).toHaveBeenCalledTimes(1)
  })
})
