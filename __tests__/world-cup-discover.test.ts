import { describe, expect, it, vi } from "vitest"
import { evaluateWorldCupNewParticipantJoinGate } from "@/lib/world-cup/worldCupJoinGate"

describe("WorldCupJoinGate", () => {
  it("blocks new joins when league is full", () => {
    const gate = evaluateWorldCupNewParticipantJoinGate({
      challenge: {
        maxParticipants: 10,
        status: "open",
        pickLockStrategy: "tournament_start",
        pickLockAt: null,
      },
      matches: [],
      sourcePayload: {},
      participantCount: 10,
    })
    expect(gate.isFull).toBe(true)
    expect(gate.joinBlockedReason).toBe("full")
  })

  it("blocks when pool locked and late join off", () => {
    const gate = evaluateWorldCupNewParticipantJoinGate({
      challenge: {
        maxParticipants: 100,
        status: "open",
        pickLockStrategy: "tournament_start",
        pickLockAt: new Date(Date.now() - 86400000).toISOString(),
      },
      matches: [],
      sourcePayload: { leagueSettings: { allowLateJoin: false } },
      participantCount: 5,
    })
    expect(gate.poolLocked).toBe(true)
    expect(gate.allowLateJoin).toBe(false)
    expect(gate.joinBlockedReason).toBe("locked_no_late_join")
  })

  it("surfaces join password requirement from stored hash flag", () => {
    const gate = evaluateWorldCupNewParticipantJoinGate({
      challenge: {
        maxParticipants: 100,
        status: "open",
        pickLockStrategy: "tournament_start",
        pickLockAt: null,
      },
      matches: [],
      sourcePayload: { leagueSettings: { joinPasswordHash: "abc" } },
      participantCount: 3,
    })
    expect(gate.requiresJoinPassword).toBe(true)
    expect(gate.joinBlockedReason).toBe(null)
  })
})

describe("World Cup discover API route module", () => {
  it("exports discover handler", async () => {
    const route = await import("@/app/api/brackets/world-cup/discover/route")
    expect(typeof route.GET).toBe("function")
  })
})
