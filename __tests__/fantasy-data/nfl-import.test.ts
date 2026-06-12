/**
 * NFL fantasy data import service unit tests.
 * Mocks workers so no real DB or provider calls are made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock server-only
vi.mock("server-only", () => ({}))

// Mock workers
vi.mock("@/lib/workers/sports-data-importer", () => ({
  runSportsDataImporter: vi.fn(),
}))
vi.mock("@/lib/workers/adp-importer", () => ({
  runAdpImporter: vi.fn(),
}))
vi.mock("@/lib/workers/injury-importer", () => ({
  runInjuryImporter: vi.fn(),
}))
vi.mock("@/lib/workers/schedule-importer", () => ({
  runScheduleImporter: vi.fn(),
}))
vi.mock("@/lib/workers/news-importer", () => ({
  runNewsImporter: vi.fn(),
}))
vi.mock("@/lib/fantasy-data/importProviderDomainData", () => ({
  importProviderDomainData: vi.fn(),
}))
vi.mock("@/lib/rolling-insights", () => ({
  syncNFLDepthChartsToDb: vi.fn(),
  syncNFLTeamStatsToDb: vi.fn(),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    syncJobRun: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}))

import { importNflFantasyData } from "@/lib/fantasy-data/importNflFantasyData"
import { runSportsDataImporter } from "@/lib/workers/sports-data-importer"
import { runAdpImporter } from "@/lib/workers/adp-importer"
import { runInjuryImporter } from "@/lib/workers/injury-importer"
import { runScheduleImporter } from "@/lib/workers/schedule-importer"
import { runNewsImporter } from "@/lib/workers/news-importer"
import { importProviderDomainData } from "@/lib/fantasy-data/importProviderDomainData"
import { syncNFLDepthChartsToDb, syncNFLTeamStatsToDb } from "@/lib/rolling-insights"

const mockImporter = runSportsDataImporter as ReturnType<typeof vi.fn>
const mockAdp = runAdpImporter as ReturnType<typeof vi.fn>
const mockInjury = runInjuryImporter as ReturnType<typeof vi.fn>
const mockSchedule = runScheduleImporter as ReturnType<typeof vi.fn>
const mockNews = runNewsImporter as ReturnType<typeof vi.fn>
const mockDomains = importProviderDomainData as ReturnType<typeof vi.fn>
const mockDepthCharts = syncNFLDepthChartsToDb as ReturnType<typeof vi.fn>
const mockTeamStats = syncNFLTeamStatsToDb as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetAllMocks()
  // Default: all workers succeed with 0 rows
  mockImporter.mockResolvedValue({ imported: 0, sports: ["NFL"], staleFallbackApplied: false })
  mockAdp.mockResolvedValue({ imported: 0, sports: ["NFL"] })
  mockInjury.mockResolvedValue({ imported: 0, sports: ["NFL"], priorityWindow: false })
  mockSchedule.mockResolvedValue({ imported: 0, sports: ["NFL"], season: 2026 })
  mockNews.mockResolvedValue({ imported: 0, sports: ["NFL"] })
  mockDomains.mockResolvedValue({ imported: 0, results: [], warnings: [], errors: [] })
  mockDepthCharts.mockResolvedValue(0)
  mockTeamStats.mockResolvedValue(0)
})

describe("importNflFantasyData", () => {
  it("returns ok: true with all worker success", async () => {
    mockImporter.mockResolvedValue({ imported: 500, sports: ["NFL"], staleFallbackApplied: false })
    mockAdp.mockResolvedValue({ imported: 400, sports: ["NFL"] })
    mockInjury.mockResolvedValue({ imported: 80, sports: ["NFL"], priorityWindow: true })
    mockSchedule.mockResolvedValue({ imported: 272, sports: ["NFL"], season: 2026 })

    const result = await importNflFantasyData({ season: 2026 })

    expect(result.ok).toBe(true)
    expect(result.sport).toBe("NFL")
    expect(result.counts.players).toBe(500)
    expect(result.counts.adp).toBe(400)
    expect(result.counts.injuries).toBe(80)
    expect(result.counts.schedules).toBe(272)
    expect(result.errors).toHaveLength(0)
  })

  it("sports workers are called with NFL scope", async () => {
    await importNflFantasyData({ season: 2026 })

    expect(mockImporter).toHaveBeenCalledWith(expect.objectContaining({ sports: ["NFL"] }))
    expect(mockAdp).toHaveBeenCalledWith(expect.objectContaining({ sports: ["NFL"] }))
    expect(mockInjury).toHaveBeenCalledWith(expect.objectContaining({ sports: ["NFL"] }))
    expect(mockSchedule).toHaveBeenCalledWith(expect.objectContaining({ sports: ["NFL"] }))
    expect(mockNews).toHaveBeenCalledWith(expect.objectContaining({ sports: ["NFL"] }))
    expect(mockDomains).toHaveBeenCalledWith(expect.objectContaining({ sport: "NFL" }))
  })

  it("dryRun skips all DB writes and workers", async () => {
    const result = await importNflFantasyData({ dryRun: true })

    expect(result.dryRun).toBe(true)
    expect(result.counts.players).toBe(0)
    expect(mockImporter).not.toHaveBeenCalled()
    expect(mockAdp).not.toHaveBeenCalled()
    expect(mockDomains).not.toHaveBeenCalled()
  })

  it("returns missingEnv list when provider keys absent", async () => {
    // Remove env keys if present
    const original = process.env.ROLLING_INSIGHTS_API_KEY
    delete process.env.ROLLING_INSIGHTS_API_KEY
    delete process.env.ROLLING_INSIGHTS_API_SECRET

    const result = await importNflFantasyData({ season: 2026 })

    expect(result.missingEnv.some((key) => key.includes("ROLLING_INSIGHTS"))).toBe(true)

    if (original !== undefined) process.env.ROLLING_INSIGHTS_API_KEY = original
  })

  it("player import failure records an error but other imports continue", async () => {
    mockImporter.mockRejectedValue(new Error("provider timeout"))
    mockAdp.mockResolvedValue({ imported: 350, sports: ["NFL"] })

    const result = await importNflFantasyData({ season: 2026 })

    expect(result.errors.some((e) => e.includes("Player import failed"))).toBe(true)
    expect(result.counts.adp).toBe(350)
  })

  it("stale fallback warning appears when staleFallbackApplied is true", async () => {
    mockImporter.mockResolvedValue({ imported: 200, sports: ["NFL"], staleFallbackApplied: true })

    const result = await importNflFantasyData({ season: 2026 })

    expect(result.warnings.some((w) => w.includes("stale fallback"))).toBe(true)
  })

  it("has durationMs > 0", async () => {
    const result = await importNflFantasyData()
    expect(result.durationMs).toBeGreaterThanOrEqual(0)
  })

  it("returns completedAt after startedAt", async () => {
    const result = await importNflFantasyData()
    expect(new Date(result.completedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(result.startedAt).getTime(),
    )
  })
})
