import { describe, expect, it } from "vitest"
import { getDashboardQuickActions, getUnifiedDashboardPayload } from "@/lib/dashboard"

describe("unified dashboard service", () => {
  it("builds sport-aware payload with counts and grouped leagues", () => {
    const payload = getUnifiedDashboardPayload(
      {
        appLeagues: [
          { id: "l1", name: "Soccer League", sport: "SOCCER", platform: "manual", leagueSize: 12, isDynasty: false },
          { id: "l2", name: "College Football", sport: "NCAAF", platform: "manual", leagueSize: 10, isDynasty: true },
        ],
        bracketLeagues: [{ id: "b1", name: "Bracket One", tournamentId: "t1", memberCount: 5 }],
        bracketEntries: [{ id: "e1", name: "Entry One", tournamentId: "t1", score: 8 }],
      },
      { isVerified: true, isAgeConfirmed: true, profileComplete: true },
      { isAdmin: false }
    )

    expect(payload.leagueCounts.totalLeagues).toBe(2)
    expect(payload.leagueCounts.totalBracketPools).toBe(1)
    expect(payload.leagueCounts.totalBracketEntries).toBe(1)
    expect(payload.appLeaguesBySport.some((group) => group.sport === "SOCCER")).toBe(true)
    expect(payload.appLeaguesBySport.some((group) => group.sport === "NCAAF")).toBe(true)
  })

  it("includes setup alerts when user profile is incomplete", () => {
    const payload = getUnifiedDashboardPayload(
      {
        appLeagues: [],
        bracketLeagues: [],
        bracketEntries: [],
      },
      { isVerified: false, isAgeConfirmed: false, profileComplete: false },
      { isAdmin: false }
    )

    expect(payload.needsSetup).toBe(true)
    expect(payload.setupAlerts.length).toBeGreaterThan(0)
    expect(payload.sections.some((section) => section.id === "alerts" && section.visible)).toBe(true)
  })

  it("adds admin quick action for admin context", () => {
    const actions = getDashboardQuickActions({ isAdmin: true })
    expect(actions.some((action) => action.id === "open_admin" && action.href === "/admin")).toBe(true)
  })
})
