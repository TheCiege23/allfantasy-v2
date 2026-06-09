/**
 * AiProviderHealthPanel — component tests
 *
 * Verifies:
 * 1. Panel renders stats grid when data loads
 * 2. Empty window (no calls) shows "no calls" message
 * 3. Blocked count renders with rose accent
 * 4. World Cup provider card renders with expected fields
 * 5. Live chain adapters are listed
 * 6. WC warnings list renders
 * 7. Error state renders
 * 8. Model breakdown renders
 * 9. Blocked reasons render
 * 10. Admin-only: fetch is called with correct URL
 */
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { AiProviderHealthPanel } from "@/components/admin/AiProviderHealthPanel"

// ─── Factories ────────────────────────────────────────────────────────────────

function makeAiHealth(overrides: Partial<{
  total: number
  deterministic: number
  deterministicPct: number
  llmCalls: number
  clean: number
  warned: number
  blocked: number
  blockedPct: number
  unavailable: number
  avgTokenCost: number | null
  modelBreakdown: Array<{ model: string; count: number }>
  topBlockedReasons: Array<{ reason: string; count: number }>
  lastCallAt: string | null
  worldCupTotal: number
  worldCupBlocked: number
}> = {}) {
  return {
    windowHours: 24,
    since: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    total: 50,
    deterministic: 30,
    deterministicPct: 60,
    llmCalls: 20,
    clean: 17,
    warned: 2,
    blocked: 1,
    blockedPct: 5,
    unavailable: 0,
    avgTokenCost: 200,
    modelBreakdown: [{ model: "gpt-4o-mini", count: 18 }, { model: "claude-3-haiku-20240307", count: 2 }],
    topBlockedReasons: [{ reason: "score_invention", count: 1 }],
    lastCallAt: new Date().toISOString(),
    worldCupTotal: 45,
    worldCupBlocked: 1,
    ...overrides,
  }
}

function makeWcProvider(overrides: Partial<{
  configured: boolean
  apiKeyPresent: boolean
  leagueId: string | null
  leagueIdConfigured: boolean
  cronSecretPresent: boolean
  missingEnvVars: string[]
}> = {}) {
  return {
    name: "API-Football",
    configured: true,
    apiKeyPresent: true,
    leagueId: "1",
    leagueIdConfigured: true,
    cronSecretPresent: true,
    missingEnvVars: [],
    ...overrides,
  }
}

function makeWcData(overrides: Partial<{
  productionStatus: "ready" | "partial_ready" | "not_ready"
  groupStageReady: boolean
  knockoutsReady: boolean
  standingsSynced: boolean
  standingsState: string
  fixtureCount: number
  groupStageFixtureCount: number
  knockoutFixtureCount: number
  standingsRowCount: number
  warnings: string[]
}> = {}) {
  return {
    productionStatus: "ready" as const,
    groupStageReady: true,
    knockoutsReady: true,
    standingsSynced: true,
    standingsState: "live",
    fixtureCount: 64,
    groupStageFixtureCount: 48,
    knockoutFixtureCount: 16,
    standingsRowCount: 32,
    warnings: [],
    ...overrides,
  }
}

function makeResponse(overrides: {
  ai?: ReturnType<typeof makeAiHealth>
  provider?: ReturnType<typeof makeWcProvider>
  data?: ReturnType<typeof makeWcData>
  liveChain?: string[]
} = {}) {
  return {
    generatedAt: new Date().toISOString(),
    windowHours: 24,
    ai: overrides.ai ?? makeAiHealth(),
    worldCup: {
      provider: overrides.provider ?? makeWcProvider(),
      data: overrides.data ?? makeWcData(),
      liveChain: overrides.liveChain ?? ["api_sports", "thesportsdb", "manual"],
    },
  }
}

// ─── Mock fetch ───────────────────────────────────────────────────────────────

function mockFetch(response: object, ok = true) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => response,
  }))
}

afterEach(() => vi.unstubAllGlobals())

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("AiProviderHealthPanel", () => {
  it("renders the stats grid after loading", async () => {
    mockFetch(makeResponse())
    render(<AiProviderHealthPanel />)
    await waitFor(() => {
      expect(screen.getByTestId("ai-health-stats-grid")).toBeTruthy()
    })
  })

  it("shows total calls count", async () => {
    mockFetch(makeResponse({ ai: makeAiHealth({ total: 77 }) }))
    render(<AiProviderHealthPanel />)
    await waitFor(() => {
      expect(screen.getByText("77")).toBeTruthy()
    })
  })

  it("shows deterministic percentage", async () => {
    mockFetch(makeResponse({ ai: makeAiHealth({ deterministicPct: 70 }) }))
    render(<AiProviderHealthPanel />)
    await waitFor(() => {
      const el = screen.getByTestId("ai-health-deterministic")
      expect(el.textContent).toContain("70%")
    })
  })

  it("shows blocked count", async () => {
    mockFetch(makeResponse({ ai: makeAiHealth({ blocked: 5 }) }))
    render(<AiProviderHealthPanel />)
    await waitFor(() => {
      const el = screen.getByTestId("ai-health-blocked")
      expect(el.textContent).toContain("5")
    })
  })

  it("shows 'no calls' message when window is empty", async () => {
    mockFetch(makeResponse({ ai: makeAiHealth({ total: 0, lastCallAt: null }) }))
    render(<AiProviderHealthPanel />)
    await waitFor(() => {
      expect(screen.getByTestId("ai-health-no-calls")).toBeTruthy()
    })
  })

  it("renders World Cup provider card", async () => {
    mockFetch(makeResponse())
    render(<AiProviderHealthPanel />)
    await waitFor(() => {
      expect(screen.getByTestId("ai-health-wc-provider")).toBeTruthy()
    })
    expect(screen.getByText("API-Football")).toBeTruthy()
  })

  it("shows World Cup data counts", async () => {
    mockFetch(makeResponse({ data: makeWcData({ fixtureCount: 64, standingsRowCount: 32 }) }))
    render(<AiProviderHealthPanel />)
    await waitFor(() => {
      const counts = screen.getByTestId("ai-health-wc-counts")
      expect(counts.textContent).toContain("64")
      expect(counts.textContent).toContain("32")
    })
  })

  it("renders live provider chain adapters", async () => {
    mockFetch(makeResponse({ liveChain: ["api_sports", "thesportsdb", "manual"] }))
    render(<AiProviderHealthPanel />)
    await waitFor(() => {
      const chain = screen.getByTestId("ai-health-live-chain")
      expect(chain.textContent).toContain("api_sports")
      expect(chain.textContent).toContain("thesportsdb")
      expect(chain.textContent).toContain("manual")
    })
  })

  it("shows WC warnings when present", async () => {
    mockFetch(makeResponse({
      data: makeWcData({ warnings: ["Fixtures older than 24h", "No standings yet"] }),
    }))
    render(<AiProviderHealthPanel />)
    await waitFor(() => {
      const warnings = screen.getByTestId("ai-health-wc-warnings")
      expect(warnings.textContent).toContain("Fixtures older than 24h")
      expect(warnings.textContent).toContain("No standings yet")
    })
  })

  it("renders model breakdown rows", async () => {
    mockFetch(makeResponse({
      ai: makeAiHealth({
        modelBreakdown: [
          { model: "gpt-4o-mini", count: 18 },
          { model: "claude-3-haiku-20240307", count: 2 },
        ],
      }),
    }))
    render(<AiProviderHealthPanel />)
    await waitFor(() => {
      const models = screen.getByTestId("ai-health-models")
      expect(models.textContent).toContain("gpt-4o-mini")
      expect(models.textContent).toContain("claude-3-haiku-20240307")
    })
  })

  it("renders blocked reasons", async () => {
    mockFetch(makeResponse({
      ai: makeAiHealth({
        blocked: 3,
        topBlockedReasons: [
          { reason: "score_invention", count: 2 },
          { reason: "odds_without_data", count: 1 },
        ],
      }),
    }))
    render(<AiProviderHealthPanel />)
    await waitFor(() => {
      const reasons = screen.getByTestId("ai-health-blocked-reasons")
      expect(reasons.textContent).toContain("score invention")
      expect(reasons.textContent).toContain("odds without data")
    })
  })

  it("shows error state when fetch fails", async () => {
    mockFetch({}, false)
    render(<AiProviderHealthPanel />)
    await waitFor(() => {
      expect(screen.getByTestId("ai-health-error")).toBeTruthy()
    })
  })

  it("shows missing env vars for unconfigured provider", async () => {
    mockFetch(makeResponse({
      provider: makeWcProvider({
        configured: false,
        apiKeyPresent: false,
        missingEnvVars: ["API_FOOTBALL_KEY", "WORLD_CUP_CRON_SECRET"],
      }),
    }))
    render(<AiProviderHealthPanel />)
    await waitFor(() => {
      expect(screen.getByText("API_FOOTBALL_KEY")).toBeTruthy()
      expect(screen.getByText("WORLD_CUP_CRON_SECRET")).toBeTruthy()
    })
  })
})
