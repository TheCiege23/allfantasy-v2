/**
 * Tests for fantasy data evidence and freshness computation.
 * Pure unit tests — no DB, no server-only imports.
 */
import { describe, it, expect } from "vitest"
import { computeFantasyFreshness } from "@/lib/fantasy-data/fantasyFreshness"
import type { FantasyDataEvidenceSnapshot } from "@/lib/fantasy-data/fantasyDataEvidence"

function makeEvidence(overrides: Partial<FantasyDataEvidenceSnapshot> = {}): FantasyDataEvidenceSnapshot {
  return {
    sport: "NFL",
    season: 2026,
    builtAt: new Date().toISOString(),
    players: { count: 100, lastImportedAt: new Date().toISOString(), provider: "sleeper" },
    adp: { count: 200, lastImportedAt: new Date().toISOString(), provider: "sleeper", formats: ["redraft"] },
    injuries: { count: 30, lastImportedAt: new Date().toISOString(), provider: "api_sports" },
    schedules: { count: 272, lastImportedAt: new Date().toISOString(), provider: "rolling_insights" },
    lastFullSyncAt: new Date().toISOString(),
    lastImportRun: null,
    dataAvailability: "full",
    missingEnv: [],
    warnings: [],
    ...overrides,
  }
}

describe("computeFantasyFreshness", () => {
  it("returns fresh tier when data is < 6h old", () => {
    const evidence = makeEvidence({ lastFullSyncAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() })
    const report = computeFantasyFreshness(evidence)
    expect(report.tier).toBe("fresh")
    expect(report.showWarning).toBe(false)
    expect(report.ageHours).toBeLessThan(6)
  })

  it("returns recent tier when data is 6–24h old", () => {
    const evidence = makeEvidence({
      lastFullSyncAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    })
    const report = computeFantasyFreshness(evidence)
    expect(report.tier).toBe("recent")
    expect(report.showWarning).toBe(false)
  })

  it("returns stale tier when data is 1–7 days old", () => {
    const evidence = makeEvidence({
      lastFullSyncAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    })
    const report = computeFantasyFreshness(evidence)
    expect(report.tier).toBe("stale")
    expect(report.showWarning).toBe(true)
    expect(report.aiInstruction).toContain("stale")
  })

  it("returns very_stale tier when data is > 7 days old", () => {
    const evidence = makeEvidence({
      lastFullSyncAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    })
    const report = computeFantasyFreshness(evidence)
    expect(report.tier).toBe("very_stale")
    expect(report.showWarning).toBe(true)
  })

  it("returns unavailable tier when dataAvailability is unavailable", () => {
    const evidence = makeEvidence({ dataAvailability: "unavailable" })
    const report = computeFantasyFreshness(evidence)
    expect(report.tier).toBe("unavailable")
    expect(report.showWarning).toBe(true)
    expect(report.aiInstruction).toContain("No NFL data is available")
  })

  it("returns pending tier when data exists but lastFullSyncAt is null", () => {
    const evidence = makeEvidence({ lastFullSyncAt: null })
    const report = computeFantasyFreshness(evidence)
    expect(report.tier).toBe("pending")
    expect(report.showWarning).toBe(true)
  })

  it("includes sport name in summary", () => {
    const evidence = makeEvidence({ sport: "NCAAF", dataAvailability: "unavailable" })
    const report = computeFantasyFreshness(evidence)
    expect(report.summary).toContain("NCAAF")
  })

  it("aiInstruction for unavailable NCAAF prevents hallucination", () => {
    const evidence = makeEvidence({ sport: "NCAAF", dataAvailability: "unavailable" })
    const report = computeFantasyFreshness(evidence)
    expect(report.aiInstruction).toMatch(/do not/i)
  })

  it("aiInstruction for pending includes 'import needed'", () => {
    const evidence = makeEvidence({ lastFullSyncAt: null, dataAvailability: "partial" })
    const report = computeFantasyFreshness(evidence)
    expect(report.tier).toBe("pending")
    expect(report.aiInstruction).toMatch(/import/i)
  })
})
