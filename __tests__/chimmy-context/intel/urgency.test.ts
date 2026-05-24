/**
 * Phase 2C Batch 3 + Batch 4 Sub-batch D — urgency tests.
 */

import { describe, expect, it } from "vitest"
import {
  URGENCY_TUNABLES,
  computeUrgency,
} from "@/lib/chimmy-context/intel/urgency"

describe("computeUrgency", () => {
  it("returns level='unknown' and score=null when there is no playoff data and no signals", () => {
    const out = computeUrgency({
      week: null,
      playoffStartWeek: null,
      weeksUntilPlayoffs: null,
      isPlayoffWeek: false,
      matchupStatus: "scheduled",
      isEliminated: null,
      hasClinchedPlayoffs: null,
    })
    expect(out.level).toBe("unknown")
    expect(out.score).toBeNull()
    expect(out.signals).toEqual([])
  })

  it("returns a numeric score >= 0 with playoff context (Batch 4 Sub-batch D promotion)", () => {
    const out = computeUrgency({
      week: 5,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 9,
      isPlayoffWeek: false,
      matchupStatus: "scheduled",
      isEliminated: null,
      hasClinchedPlayoffs: null,
    })
    expect(out.level).not.toBe("unknown")
    expect(typeof out.score).toBe("number")
    expect(out.score!).toBeGreaterThanOrEqual(0)
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

  it("(Batch 4) emits 'bye_conflict' when 2+ starters are on bye", () => {
    const out = computeUrgency({
      week: 7,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 7,
      isPlayoffWeek: false,
      matchupStatus: "scheduled",
      isEliminated: null,
      hasClinchedPlayoffs: null,
      byeWeekConflicts: 3,
    })
    expect(out.signals).toContain("bye_conflict")
  })

  it("(Batch 4) emits 'injury_pressure' when 2+ starters carry injury flags", () => {
    const out = computeUrgency({
      week: 7,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 7,
      isPlayoffWeek: false,
      matchupStatus: "scheduled",
      isEliminated: null,
      hasClinchedPlayoffs: null,
      injuryFlagCount: 2,
    })
    expect(out.signals).toContain("injury_pressure")
  })

  it("(Batch 4) emits 'waiver_window_closing' when <= 12 hours left", () => {
    const out = computeUrgency({
      week: 7,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 7,
      isPlayoffWeek: false,
      matchupStatus: "scheduled",
      isEliminated: null,
      hasClinchedPlayoffs: null,
      waiverDeadlineHoursLeft: 6,
    })
    expect(out.signals).toContain("waiver_window_closing")
  })

  it("(Batch 4) emits 'trade_window_closing' when <= 3 days left", () => {
    const out = computeUrgency({
      week: 10,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 4,
      isPlayoffWeek: false,
      matchupStatus: "scheduled",
      isEliminated: null,
      hasClinchedPlayoffs: null,
      tradeDeadlineDaysLeft: 2,
    })
    expect(out.signals).toContain("trade_window_closing")
  })

  it("(Batch 4) does NOT emit Batch 4 signals when inputs are omitted", () => {
    const out = computeUrgency({
      week: 5,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 9,
      isPlayoffWeek: false,
      matchupStatus: "scheduled",
      isEliminated: null,
      hasClinchedPlayoffs: null,
    })
    expect(out.signals).not.toContain("bye_conflict")
    expect(out.signals).not.toContain("injury_pressure")
    expect(out.signals).not.toContain("waiver_window_closing")
    expect(out.signals).not.toContain("trade_window_closing")
  })

  it("(Batch 4 Sub-batch D) maps playoff_week + bye + injury signals to 'critical' level", () => {
    const out = computeUrgency({
      week: 15,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 0,
      isPlayoffWeek: true,
      matchupStatus: "scheduled",
      isEliminated: false,
      hasClinchedPlayoffs: false,
      byeWeekConflicts: 2,
      injuryFlagCount: 2,
    })
    expect(out.signals).toEqual(
      expect.arrayContaining(["playoff_week", "bye_conflict", "injury_pressure"])
    )
    expect(out.score!).toBeGreaterThanOrEqual(
      URGENCY_TUNABLES.levelThresholds.critical
    )
    expect(out.level).toBe("critical")
  })

  it("(Batch 4 Sub-batch D) playoff_push close to playoffs lands in 'moderate' or above", () => {
    const out = computeUrgency({
      week: 13,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 1,
      isPlayoffWeek: false,
      matchupStatus: "scheduled",
      isEliminated: false,
      hasClinchedPlayoffs: false,
    })
    expect(out.signals).toContain("playoff_push")
    expect(["moderate", "high", "critical"]).toContain(out.level)
  })

  it("(Batch 4 Sub-batch D) clinched signal subtracts urgency", () => {
    const clinched = computeUrgency({
      week: 14,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 0,
      isPlayoffWeek: true,
      matchupStatus: "scheduled",
      isEliminated: false,
      hasClinchedPlayoffs: true,
    })
    const notClinched = computeUrgency({
      week: 14,
      playoffStartWeek: 14,
      weeksUntilPlayoffs: 0,
      isPlayoffWeek: true,
      matchupStatus: "scheduled",
      isEliminated: false,
      hasClinchedPlayoffs: false,
    })
    expect(clinched.score!).toBeLessThan(notClinched.score!)
  })
})
