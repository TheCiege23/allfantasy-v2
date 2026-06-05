import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({
  getAdminPerSportDataReliabilityRows: vi.fn(),
  getDashboardAiToolAvailability: vi.fn(),
}))

vi.mock("@/lib/admin-dashboard/AdminProviderHealthService", () => ({
  getAdminPerSportDataReliabilityRows: mocks.getAdminPerSportDataReliabilityRows,
}))

vi.mock("@/lib/admin-dashboard/SportImportMatrixService", () => ({
  getDashboardAiToolAvailability: mocks.getDashboardAiToolAvailability,
}))

describe("AI tool data availability guard", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.getAdminPerSportDataReliabilityRows.mockResolvedValue([])
  })

  it("blocks missing injury data before AI execution or token charge", async () => {
    mocks.getDashboardAiToolAvailability.mockReturnValueOnce([
      {
        id: "injury",
        label: "Injury Impact",
        status: "missing",
        supportedSports: [],
        missingData: ["Injuries"],
        lastSyncedAt: null,
      },
    ])
    const { checkAiToolDataAvailability } = await import("@/lib/ai-tools/aiToolDataAvailability")

    const result = await checkAiToolDataAvailability({ toolId: "injury", sportFilter: "NFL" })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(503)
      expect(result.body.tokenChargeBlocked).toBe(true)
      expect(result.body.missingData).toContain("Injuries")
    }
  })

  it("allows active tools for supported sports", async () => {
    mocks.getDashboardAiToolAvailability.mockReturnValueOnce([
      {
        id: "startSit",
        label: "Start/Sit",
        status: "active",
        supportedSports: ["NFL"],
        missingData: [],
        lastSyncedAt: "2026-06-04T12:00:00.000Z",
      },
    ])
    const { checkAiToolDataAvailability } = await import("@/lib/ai-tools/aiToolDataAvailability")

    await expect(checkAiToolDataAvailability({ toolId: "startSit", sportFilter: "NFL" })).resolves.toEqual({ ok: true })
  })
})
