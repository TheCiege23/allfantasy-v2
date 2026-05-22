/**
 * Phase 2C Batch 3 — urgency scaffold tests.
 */

import { describe, expect, it } from "vitest"
import { computeUrgency } from "@/lib/chimmy-context/intel/urgency"

describe("computeUrgency (scaffold)", () => {
  it("returns level='unknown' and no signals on a quiet midseason week", () => {
    const out = computeUrgency({
      week: 5,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 9,
      isPlayoffWeek: false,
      matchupStatus: "scheduled",
      isEliminated: null,
      hasClinchedPlayoffs: null,
    })
    expect(out.level).toBe("unknown")
    expect(out.score).toBeNull()
    expect(out.signals).toEqual([])
  })

  it("emits 'playoff_push' signal when 1-2 weeks out", () => {
    const out = computeUrgency({
      week: 13,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 1,
      isPlayoffWeek: false,
      matchupStatus: "in_progress",
      isEliminated: false,
      hasClinchedPlayoffs: false,
    })
    expect(out.signals).toContain("playoff_push")
    expect(out.signals).toContain("in_progress")
  })

  it("emits 'playoff_week' when isPlayoffWeek is true", () => {
    const out = computeUrgency({
      week: 15,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 0,
      isPlayoffWeek: true,
      matchupStatus: "scheduled",
      isEliminated: false,
      hasClinchedPlayoffs: false,
    })
    expect(out.signals).toContain("playoff_week")
  })

  it("emits 'clinched' / 'eliminated' when provided", () => {
    const clinched = computeUrgency({
      week: 12,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 2,
      isPlayoffWeek: false,
      matchupStatus: "scheduled",
      isEliminated: false,
      hasClinchedPlayoffs: true,
    })
    expect(clinched.signals).toContain("clinched")

    const eliminated = computeUrgency({
      week: 12,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 2,
      isPlayoffWeek: false,
      matchupStatus: "scheduled",
      isEliminated: true,
      hasClinchedPlayoffs: false,
    })
    expect(eliminated.signals).toContain("eliminated")
  })
})
