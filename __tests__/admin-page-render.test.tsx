import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAdminAccessState: vi.fn(),
  getAdminCommandCenterMetrics: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
}))

vi.mock("@/lib/adminAuth", () => ({
  getAdminAccessState: mocks.getAdminAccessState,
}))

vi.mock("@/lib/admin-dashboard/AdminCommandCenterService", () => ({
  getAdminCommandCenterMetrics: mocks.getAdminCommandCenterMetrics,
}))

function metricsFixture() {
  return {
    generatedAt: "2026-06-04T12:00:00.000Z",
    morning: [
      { label: "New signups", value: 1, tracked: true },
      { label: "AI cost yesterday", value: "Not tracked yet", tracked: false },
    ],
    users: [
      { label: "Total accounts", value: 4, tracked: true },
      { label: "Active users", value: "Not tracked yet", tracked: false },
    ],
    subscriptions: [{ label: "MRR estimate", value: "Not tracked yet", tracked: false }],
    tokens: [{ label: "Token balances total", value: 1000, tracked: true }],
    ai: [{ label: "Chimmy replies", value: 3, tracked: true }],
    worldCup: [{ label: "World Cup pools", value: 2, tracked: true }],
    health: [{ label: "Database", value: "healthy", tracked: true }],
    traffic: [{ label: "Analytics events today", value: 8, tracked: true }],
    integrity: [{ label: "Failed sync jobs 24h", value: 0, tracked: true }],
    dataQuality: [{ label: "Provider env gaps", value: 1, tracked: true }],
    productionReadiness: {
      env: [
        {
          id: "database",
          category: "Platform",
          label: "Database",
          status: "configured",
          severity: "critical",
          required: "DATABASE_URL",
          note: "Required.",
        },
      ],
      crons: [
        {
          id: "world-cup-official",
          category: "World Cup",
          label: "Official teams/fixtures/standings/live sync",
          status: "configured",
          schedule: "/api/brackets/world-cup/cron/sync?job=live (*/5 * * * *)",
          configuredPaths: ["/api/brackets/world-cup/cron/sync?job=live (*/5 * * * *)"],
          missing: [],
          recommended: "Live every 5m.",
          note: "Cron ready.",
        },
      ],
      trafficLocations: [
        {
          label: "Atlanta, Georgia, United States",
          country: "United States",
          region: "Georgia",
          city: "Atlanta",
          visits: 5,
          visitors: 2,
        },
      ],
      trafficNotes: ["Raw IPs are not rendered."],
    },
    emailStatus: {
      configured: false,
      missingEnv: ["RESEND_API_KEY"],
      senderConfigured: false,
      totalUsersWithEmail: 4,
      productUpdateOptOuts: 1,
      unsubscribed: 0,
      pendingEmailOutbox: 0,
      recentBroadcasts: 0,
      recentProviderFailures: 0,
      lastSendAt: null,
      lastError: null,
      audiences: [{ id: "all", label: "All signed-up users", description: "All users." }],
    },
    providerHealth: [
      {
        id: "api_football_world_cup",
        name: "API-Football / API-Sports World Cup",
        category: "World Cup soccer",
        status: "missing_env",
        configured: false,
        envVars: ["API_SPORTS_KEY"],
        dataCategories: ["teams", "fixtures"],
        consumedBy: ["World Cup sync cron"],
        storage: ["world_cup_official_fixtures"],
        requestCount24h: 0,
        avgLatencyMs24h: null,
        rateLimit: "Not tracked yet",
        importedRows: 0,
        lastSyncAt: null,
        lastError: null,
        costProtection: ["server-only provider client"],
        note: "Missing provider key.",
      },
    ],
    usersSearch: [],
    activeWorldCupPools: [],
    recentUsers: [
      {
        id: "user-1",
        username: "TheCiege26",
        emailMasked: "th***@example.com",
        createdAt: "2026-06-04T11:00:00.000Z",
        subscriptionStatus: "active",
        tokenBalance: 1000,
      },
    ],
    recentSubscriptions: [],
    recentPayments: [],
    recentTokenActivity: [],
  }
}

describe("/admin page render states", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("redirects unauthenticated users to admin login", async () => {
    mocks.getAdminAccessState.mockResolvedValueOnce({ status: "unauthenticated", source: "none" })
    const { default: AdminPage } = await import("@/app/admin/page")

    await expect(AdminPage({ searchParams: {} })).rejects.toThrow("redirect:/admin-login?next=/admin")
    expect(mocks.getAdminCommandCenterMetrics).not.toHaveBeenCalled()
  })

  it("renders access denied for authenticated non-admin users", async () => {
    mocks.getAdminAccessState.mockResolvedValueOnce({
      status: "forbidden",
      source: "app_session",
      user: { id: "user-1", email: "member@example.com" },
    })
    const { default: AdminPage } = await import("@/app/admin/page")

    render(await AdminPage({ searchParams: {} }))

    expect(screen.getByRole("heading", { name: /access denied/i })).toBeInTheDocument()
    expect(mocks.getAdminCommandCenterMetrics).not.toHaveBeenCalled()
  })

  it("renders the command center for admins", async () => {
    mocks.getAdminAccessState.mockResolvedValueOnce({
      status: "admin",
      source: "app_session",
      user: { id: "admin-1", email: "founder@example.com", role: "admin" },
    })
    mocks.getAdminCommandCenterMetrics.mockResolvedValueOnce(metricsFixture())
    const { default: AdminPage } = await import("@/app/admin/page")

    render(await AdminPage({ searchParams: { q: "ciege" } }))

    expect(screen.getByRole("heading", { name: /command center/i })).toBeInTheDocument()
    expect(screen.getByText("Total accounts")).toBeInTheDocument()
    expect(screen.getByText("World Cup pools")).toBeInTheDocument()
    expect(screen.getByText(/Provider Health/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Production Env/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/Traffic \/ Visitors/i)).toBeInTheDocument()
    expect(screen.getByText(/Email Notifications/i)).toBeInTheDocument()
    expect(screen.getByText(/Integrity \/ Fraud/i)).toBeInTheDocument()
    expect(screen.getByText("API-Football / API-Sports World Cup")).toBeInTheDocument()
    expect(screen.getByText(/Recent Users/i)).toBeInTheDocument()
    expect(mocks.getAdminCommandCenterMetrics).toHaveBeenCalledWith("ciege")
  })
})
