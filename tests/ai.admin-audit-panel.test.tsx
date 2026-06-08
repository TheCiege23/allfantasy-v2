/**
 * AI Audit Logs Panel — component + behaviour tests
 *
 * Verifies:
 * 1. Panel shows empty state when no logs returned
 * 2. Panel renders a table row for each returned log
 * 3. Blocked rows are highlighted with data-testid="ai-audit-blocked-row"
 * 4. Filter controls exist and are labelled
 * 5. Summary line shows total and blocked counts
 * 6. Missing/null fields don't crash the table
 */
import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { AiAuditLogsPanel } from "@/components/admin/AiAuditLogsPanel"

// ── Minimal row factory ───────────────────────────────────────────────────────

function makeRow(overrides: Partial<{
  id: string
  createdAt: string
  sport: string
  feature: string
  route: string | null
  plan: string | null
  providerSource: string | null
  freshnessTier: string | null
  validatorResult: string | null
  blockedReason: string | null
  modelUsed: string | null
  tokenCost: number | null
  wasDeterministic: boolean
}> = {}) {
  return {
    id: "log-001",
    createdAt: new Date().toISOString(),
    sport: "world_cup",
    feature: "pool_chat",
    route: "/api/brackets/world-cup/[challengeId]/chat",
    plan: "pro",
    providerSource: "openai",
    freshnessTier: "pool_only",
    validatorResult: "clean",
    blockedReason: null,
    modelUsed: "gpt-4o-mini",
    tokenCost: 120,
    wasDeterministic: false,
    ...overrides,
  }
}

// ── Mock fetch ────────────────────────────────────────────────────────────────

function mockFetch(response: object, ok = true) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: async () => response,
  }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("AiAuditLogsPanel", () => {
  it("shows empty state when log is empty", async () => {
    mockFetch({ since: new Date().toISOString(), totalCount: 0, blockedCount: 0, returnedCount: 0, rows: [] })

    render(<AiAuditLogsPanel />)

    await waitFor(() => {
      expect(screen.getByTestId("ai-audit-empty")).toBeTruthy()
    })
  })

  it("renders table with rows when logs are returned", async () => {
    mockFetch({
      since: new Date().toISOString(),
      totalCount: 2,
      blockedCount: 0,
      returnedCount: 2,
      rows: [makeRow({ id: "r1" }), makeRow({ id: "r2", sport: "nfl" })],
    })

    render(<AiAuditLogsPanel />)

    await waitFor(() => {
      expect(screen.getByTestId("ai-audit-table")).toBeTruthy()
    })
  })

  it("marks blocked rows with data-testid ai-audit-blocked-row", async () => {
    mockFetch({
      since: new Date().toISOString(),
      totalCount: 1,
      blockedCount: 1,
      returnedCount: 1,
      rows: [makeRow({ id: "b1", validatorResult: "blocked", blockedReason: "score_invention" })],
    })

    render(<AiAuditLogsPanel />)

    await waitFor(() => {
      expect(screen.getByTestId("ai-audit-blocked-row")).toBeTruthy()
    })
  })

  it("displays summary totalCount and blockedCount", async () => {
    mockFetch({
      since: new Date().toISOString(),
      totalCount: 47,
      blockedCount: 3,
      returnedCount: 47,
      rows: [makeRow()],
    })

    render(<AiAuditLogsPanel />)

    await waitFor(() => {
      expect(screen.getByText(/47 total/i)).toBeTruthy()
      expect(screen.getByText(/3 blocked/i)).toBeTruthy()
    })
  })

  it("filter dropdowns and toggles are present and labelled", async () => {
    mockFetch({ since: new Date().toISOString(), totalCount: 0, blockedCount: 0, returnedCount: 0, rows: [] })

    render(<AiAuditLogsPanel />)

    // These render immediately, before data loads
    expect(screen.getByRole("combobox", { name: "Filter by sport" })).toBeTruthy()
    expect(screen.getByRole("combobox", { name: "Filter by validator result" })).toBeTruthy()
    expect(screen.getByRole("combobox", { name: "Filter by time range" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "LLM only" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Provider unavailable" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Refresh AI audit logs" })).toBeTruthy()
  })

  it("handles rows with null optional fields without crashing", async () => {
    mockFetch({
      since: new Date().toISOString(),
      totalCount: 1,
      blockedCount: 0,
      returnedCount: 1,
      rows: [makeRow({
        route: null,
        plan: null,
        providerSource: null,
        freshnessTier: null,
        validatorResult: null,
        blockedReason: null,
        modelUsed: null,
        tokenCost: null,
      })],
    })

    render(<AiAuditLogsPanel />)

    await waitFor(() => {
      expect(screen.getByTestId("ai-audit-table")).toBeTruthy()
    })
    // Should render em-dashes for nulls, not crash
    const dashes = screen.getAllByText("—")
    expect(dashes.length).toBeGreaterThan(0)
  })

  it("shows error message when fetch fails", async () => {
    mockFetch({}, false) // HTTP 500

    render(<AiAuditLogsPanel />)

    await waitFor(() => {
      expect(screen.getByText(/http 500/i)).toBeTruthy()
    })
  })
})
