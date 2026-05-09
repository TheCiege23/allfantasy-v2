import { describe, expect, it } from "vitest"
import { analyzeWorldCupEntryPickCompletion } from "@/lib/world-cup/worldCupBracketCompletionService"

const baseMatch = (id: string, homeName: string, awayName: string) => ({
  id,
  round: "group_a",
  matchNumber: Number(id.replace(/\D/g, "")) || 1,
  homeSlotKey: "A1",
  awaySlotKey: "A2",
  homeTeamId: `${id}-h`,
  awayTeamId: `${id}-a`,
  homeTeamName: homeName,
  awayTeamName: awayName,
  status: "scheduled",
  winnerTeamId: null,
  winnerTeamName: null,
  nextMatchId: null,
  nextMatchSlot: null,
})

describe("World Cup bracket completion analysis", () => {
  it("ignores placeholder picks (no selectedTeamId / slot)", () => {
    const matches = [baseMatch("m1", "Brazil", "Argentina"), baseMatch("m2", "France", "Germany")]
    const analysis = analyzeWorldCupEntryPickCompletion({
      matches: matches as any,
      picks: [
        { matchId: "m1", selectedTeamId: null, selectedSlotKey: null },
        {
          matchId: "m2",
          selectedTeamId: `${matches[1].awayTeamId}`,
          selectedTeamName: "Germany",
          selectedSlotKey: null,
        },
      ] as any,
      includeThirdPlace: false,
      entryId: "e1",
      userId: "u1",
      entryName: "Test",
      displayName: "Player",
    })
    expect(analysis.completedRealPickCount).toBe(1)
    expect(analysis.missingPickCount).toBe(1)
    expect(analysis.isComplete).toBe(false)
  })

  it("marks entry complete when all pickable slots have real selections", () => {
    const m1 = baseMatch("m1", "Brazil", "Argentina")
    const m2 = baseMatch("m2", "France", "Germany")
    const analysis = analyzeWorldCupEntryPickCompletion({
      matches: [m1, m2] as any,
      picks: [
        {
          matchId: "m1",
          selectedTeamId: m1.homeTeamId,
          selectedTeamName: "Brazil",
          selectedSlotKey: null,
        },
        {
          matchId: "m2",
          selectedTeamId: m2.awayTeamId,
          selectedTeamName: "Germany",
          selectedSlotKey: null,
        },
      ] as any,
      includeThirdPlace: false,
      entryId: "e1",
      userId: "u1",
      entryName: "Test",
      displayName: "Player",
    })
    expect(analysis.isComplete).toBe(true)
    expect(analysis.missingPickCount).toBe(0)
  })

  it("does not treat completed DB rows as complete when projection requires more picks", () => {
    const matches = [baseMatch("m1", "Brazil", "Argentina"), baseMatch("m2", "France", "Germany")]
    const analysis = analyzeWorldCupEntryPickCompletion({
      matches: matches as any,
      picks: [
        {
          matchId: "m1",
          selectedTeamId: `${matches[0].homeTeamId}`,
          selectedTeamName: "Brazil",
          selectedSlotKey: null,
        },
      ] as any,
      includeThirdPlace: false,
      entryId: "e1",
      userId: "u1",
      entryName: "Test",
      displayName: "Player",
    })
    expect(analysis.requiredPickableMatchCount).toBe(2)
    expect(analysis.missingPickCount).toBe(1)
  })
})
