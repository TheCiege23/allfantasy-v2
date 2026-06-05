import { describe, expect, it, vi } from "vitest"
import {
  getChimmySportReadiness,
  getDashboardAiToolAvailability,
  getSportImportMatrix,
} from "@/lib/admin-dashboard/SportImportMatrixService"
import type { AdminSportDataReliabilityRow } from "@/lib/admin-dashboard/AdminProviderHealthService"

vi.mock("server-only", () => ({}))

function row(overrides: Partial<AdminSportDataReliabilityRow>): AdminSportDataReliabilityRow {
  return {
    id: "nfl",
    sport: "NFL",
    label: "NFL",
    counts: {
      teams: 32,
      players: 1800,
      schedules: 272,
      games: 272,
      liveScores: 10,
      standings: 32,
      injuries: 100,
      news: 120,
      playerStats: 500,
    },
    lastSyncAtByType: {
      teams: "2026-06-04T12:00:00.000Z",
      players: "2026-06-04T12:00:00.000Z",
      schedules: "2026-06-04T12:00:00.000Z",
      games: "2026-06-04T12:00:00.000Z",
      injuries: "2026-06-04T12:00:00.000Z",
      news: "2026-06-04T12:00:00.000Z",
      playerStats: "2026-06-04T12:00:00.000Z",
    },
    staleWarnings: [],
    configuredProviders: ["Rolling Insights", "API-Sports"],
    missingProviders: [],
    note: "test row",
    ...overrides,
  }
}

describe("SportImportMatrixService", () => {
  it("marks stored rows with sync timestamps as active importers", () => {
    const [matrixRow] = getSportImportMatrix([row({})])

    expect(matrixRow.cells.players.status).toBe("active_importer")
    expect(matrixRow.cells.schedules.status).toBe("active_importer")
    expect(matrixRow.cells.injuries.count).toBe(100)
  })

  it("marks provider-backed gaps honestly instead of pretending data is ready", () => {
    const [matrixRow] = getSportImportMatrix([
      row({
        counts: {
          teams: 0,
          players: 0,
          schedules: 0,
          games: 0,
          liveScores: 0,
          standings: 0,
          injuries: 0,
          news: 0,
          playerStats: 0,
        },
        lastSyncAtByType: {},
        configuredProviders: ["ClearSports"],
      }),
    ])

    expect(matrixRow.cells.players.status).toBe("partial_importer")
    expect(matrixRow.cells.odds.status).toBe("provider_available_no_importer")
  })

  it("drives AI tool availability from cached data coverage", () => {
    const tools = getDashboardAiToolAvailability([
      row({}),
      row({
        id: "world-cup",
        sport: "WC_SOCCER",
        label: "World Cup",
        counts: {
          teams: 48,
          players: null,
          schedules: 104,
          games: 104,
          liveScores: 104,
          standings: 0,
          injuries: 0,
          news: null,
          playerStats: null,
        },
        lastSyncAtByType: {
          teams: "2026-06-04T12:00:00.000Z",
          fixtures: "2026-06-04T12:00:00.000Z",
        },
        configuredProviders: ["API-Football"],
      }),
    ])

    expect(tools.find((tool) => tool.id === "startSit")).toMatchObject({
      status: "active",
      supportedSports: expect.arrayContaining(["NFL"]),
    })
    expect(tools.find((tool) => tool.id === "worldCupAnalysis")).toMatchObject({
      status: "preview",
      missingData: expect.arrayContaining(["Standings"]),
    })
  })

  it("returns Chimmy readiness flags and missing categories", () => {
    const [ready] = getChimmySportReadiness([
      row({
        counts: {
          teams: 32,
          players: 1800,
          schedules: 272,
          games: 272,
          liveScores: 0,
          standings: 0,
          injuries: 100,
          news: 0,
          playerStats: 500,
        },
      }),
    ])

    expect(ready.hasSchedules).toBe(true)
    expect(ready.hasLiveScores).toBe(false)
    expect(ready.missingData).toEqual(expect.arrayContaining(["live scores", "standings", "news"]))
  })
})
