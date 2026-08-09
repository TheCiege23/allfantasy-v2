/**
 * Player Command Center (Slice 5) — replacement candidate ranking (pure).
 */
import { describe, expect, it } from "vitest"
import { rankReplacementCandidates } from "@/lib/shared-services/league-hub/replacementOptions"

const pool = [
  { playerId: "a", name: "Alpha", position: "WR", projectedPoints: 11.2 },
  { playerId: "b", name: "Bravo", position: "WR", projectedPoints: 17.5 },
  { playerId: "c", name: "Charlie", position: "WR", projectedPoints: 14.0 },
  { playerId: "d", name: "Delta", position: "WR", projectedPoints: 9.9 },
]

describe("rankReplacementCandidates", () => {
  it("sorts by projection desc, caps at limit, and computes deltas vs the affected player", () => {
    const ranked = rankReplacementCandidates(pool, 12.3, 3)
    expect(ranked.map((r) => r.playerId)).toEqual(["b", "c", "a"])
    expect(ranked[0]!.delta).toBe(5.2)
    expect(ranked[1]!.delta).toBe(1.7)
    expect(ranked[2]!.delta).toBe(-1.1)
  })

  it("is honest when the affected player has no projection: delta stays null", () => {
    const ranked = rankReplacementCandidates(pool, null, 2)
    expect(ranked).toHaveLength(2)
    expect(ranked.every((r) => r.delta === null)).toBe(true)
  })

  it("does not mutate the input array", () => {
    const before = pool.map((p) => p.playerId)
    rankReplacementCandidates(pool, 10, 4)
    expect(pool.map((p) => p.playerId)).toEqual(before)
  })
})
