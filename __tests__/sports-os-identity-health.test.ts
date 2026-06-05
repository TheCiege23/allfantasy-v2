import { describe, expect, it } from "vitest"
import { buildSportsIdentityHealthSnapshot } from "@/lib/sports-os/SportsIdentityHealthService"

describe("Sports OS identity and image health", () => {
  it("summarizes player/team identity gaps by sport from cached aggregate counts", () => {
    const snapshot = buildSportsIdentityHealthSnapshot({
      now: new Date("2026-06-05T12:00:00.000Z"),
      rows: [
        {
          id: "nfl",
          sport: "NFL",
          label: "NFL",
          playerCount: 900,
          sportsPlayerRecordCount: 100,
          teamCount: 32,
          canonicalIdentityCount: 850,
          playersMissingProviderIds: 12,
          playersMissingTeam: 5,
          playerRecordsMissingTeam: 1,
          playersMissingPosition: 3,
          duplicatePlayerNameGroups: 2,
          duplicateProviderMappingGroups: 1,
          teamMappingMismatches: 4,
          playersMissingHeadshots: 40,
          teamsMissingLogos: 1,
          duplicateHeadshotGroups: 2,
        },
        {
          id: "nba",
          sport: "NBA",
          label: "NBA",
          playerCount: 0,
          teamCount: 0,
        },
      ],
    })

    expect(snapshot.generatedAt).toBe("2026-06-05T12:00:00.000Z")
    expect(snapshot.summary.sportsAudited).toBe(2)
    expect(snapshot.summary.totalPlayers).toBe(1000)
    expect(snapshot.rows[0]).toMatchObject({
      label: "NFL",
      playerCount: 1000,
      playersMissingProviderIds: 12,
      playersMissingTeam: 6,
      duplicatePlayerNameGroups: 2,
      duplicateProviderMappingGroups: 1,
      teamMappingMismatches: 4,
      status: "partial",
    })
    expect(snapshot.rows[1]?.status).toBe("missing")
    expect(snapshot.topProblems.map((problem) => problem.id)).toContain("nfl:missing-headshots")
  })

  it("reports image/logo audit gaps without needing external image requests", () => {
    const snapshot = buildSportsIdentityHealthSnapshot({
      rows: [
        {
          id: "mlb",
          sport: "MLB",
          label: "MLB",
          playerCount: 400,
          teamCount: 30,
          playersMissingHeadshots: 50,
          playerRecordsMissingHeadshots: 25,
          teamsMissingLogos: 4,
          teamAssetsMissingLogos: 2,
          duplicateHeadshotGroups: 8,
          duplicateLogoGroups: 1,
          invalidHeadshotUrlPatterns: 3,
          invalidLogoUrlPatterns: 2,
        },
      ],
    })

    expect(snapshot.imageRows[0]).toMatchObject({
      label: "MLB",
      playersMissingHeadshots: 75,
      teamsMissingLogos: 6,
      duplicateHeadshotGroups: 8,
      duplicateLogoGroups: 1,
      invalidHeadshotUrlPatterns: 3,
      invalidLogoUrlPatterns: 2,
      status: "partial",
    })
    expect(snapshot.summary.imageProblems).toBe(95)
  })
})
