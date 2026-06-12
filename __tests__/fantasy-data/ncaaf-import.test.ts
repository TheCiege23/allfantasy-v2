/**
 * NCAAF fantasy data import service tests.
 * Key requirement: provider unavailable → structured "pending" result,
 * not a crash or hallucinated data.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/workers/sports-data-importer", () => ({
  runSportsDataImporter: vi.fn().mockResolvedValue({ imported: 0, sports: ["NCAAF"], staleFallbackApplied: false }),
}))
vi.mock("@/lib/workers/injury-importer", () => ({
  runInjuryImporter: vi.fn().mockResolvedValue({ imported: 0, sports: ["NCAAF"], priorityWindow: false }),
}))
vi.mock("@/lib/workers/news-importer", () => ({
  runNewsImporter: vi.fn().mockResolvedValue({ imported: 0, sports: ["NCAAF"] }),
}))
vi.mock("@/lib/workers/schedule-importer", () => ({
  runScheduleImporter: vi.fn().mockResolvedValue({ imported: 0, sports: ["NCAAF"], season: 2026 }),
}))
vi.mock("@/lib/fantasy-data/importProviderDomainData", () => ({
  importProviderDomainData: vi.fn().mockResolvedValue({ imported: 0, results: [], warnings: [], errors: [] }),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: { syncJobRun: { create: vi.fn().mockResolvedValue({}) } },
}))

import { importNcaafFantasyData } from "@/lib/fantasy-data/importNcaafFantasyData"

const CFBD_KEY = "CFBD_API_KEY"

describe("importNcaafFantasyData — provider unavailable", () => {
  let savedKey: string | undefined
  let savedCfbdAlias: string | undefined
  let savedApiSports: string | undefined
  let savedApiSportsAlias: string | undefined

  beforeEach(() => {
    savedKey = process.env[CFBD_KEY]
    savedCfbdAlias = process.env.CFBD_KEY
    savedApiSports = process.env.APISPORTS_API_KEY
    savedApiSportsAlias = process.env.API_SPORTS_KEY
    delete process.env[CFBD_KEY]
    delete process.env.CFBD_KEY
    delete process.env.APISPORTS_API_KEY
    delete process.env.API_SPORTS_KEY
  })

  afterEach(() => {
    if (savedKey !== undefined) process.env[CFBD_KEY] = savedKey
    else delete process.env[CFBD_KEY]
    if (savedCfbdAlias !== undefined) process.env.CFBD_KEY = savedCfbdAlias
    else delete process.env.CFBD_KEY
    if (savedApiSports !== undefined) process.env.APISPORTS_API_KEY = savedApiSports
    else delete process.env.APISPORTS_API_KEY
    if (savedApiSportsAlias !== undefined) process.env.API_SPORTS_KEY = savedApiSportsAlias
    else delete process.env.API_SPORTS_KEY
  })

  it("returns ok: false when CFBD key is missing", async () => {
    const result = await importNcaafFantasyData()
    expect(result.ok).toBe(false)
    expect(result.sport).toBe("NCAAF")
  })

  it("returns all zero counts when provider unavailable", async () => {
    const result = await importNcaafFantasyData()
    expect(result.counts.players).toBe(0)
    expect(result.counts.adp).toBe(0)
    expect(result.counts.injuries).toBe(0)
    expect(result.counts.schedules).toBe(0)
  })

  it("includes CFBD_API_KEY in missingEnv when absent", async () => {
    const result = await importNcaafFantasyData()
    expect(result.missingEnv.some((k) => k.includes("CFBD"))).toBe(true)
  })

  it("warns about devy/C2C beta pending state", async () => {
    const result = await importNcaafFantasyData()
    expect(result.warnings.some((w) => w.includes("beta"))).toBe(true)
  })

  it("mentions player pool pending in warnings", async () => {
    const result = await importNcaafFantasyData()
    expect(result.warnings.some((w) => w.includes("pending"))).toBe(true)
  })

  it("does not throw — returns structured response", async () => {
    await expect(importNcaafFantasyData()).resolves.not.toThrow()
  })

  it("dryRun also returns unavailable state gracefully", async () => {
    const result = await importNcaafFantasyData({ dryRun: true })
    expect(result.ok).toBe(false)
    expect(result.dryRun).toBe(true)
  })
})

describe("importNcaafFantasyData — provider available", () => {
  let savedKey: string | undefined
  let savedApiSports: string | undefined

  beforeEach(() => {
    savedKey = process.env[CFBD_KEY]
    savedApiSports = process.env.APISPORTS_API_KEY
    process.env[CFBD_KEY] = "test-cfbd-key-12345"
    process.env.APISPORTS_API_KEY = "test-api-sports-key-12345"
  })

  afterEach(() => {
    if (savedKey !== undefined) process.env[CFBD_KEY] = savedKey
    else delete process.env[CFBD_KEY]
    if (savedApiSports !== undefined) process.env.APISPORTS_API_KEY = savedApiSports
    else delete process.env.APISPORTS_API_KEY
  })

  it("attempts player import when CFBD key is set", async () => {
    const { runSportsDataImporter } = await import("@/lib/workers/sports-data-importer")
    const mock = runSportsDataImporter as ReturnType<typeof vi.fn>
    mock.mockResolvedValue({ imported: 150, sports: ["NCAAF"], staleFallbackApplied: false })

    const result = await importNcaafFantasyData({ season: 2026 })

    expect(result.counts.players).toBe(150)
  })

  it("NCAAF ADP count is 0 (not available via mainstream providers yet)", async () => {
    const result = await importNcaafFantasyData({ season: 2026 })
    expect(result.counts.adp).toBe(0)
  })
})
