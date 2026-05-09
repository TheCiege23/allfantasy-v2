import React from "react"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import WorldCupBracketShell from "@/components/brackets/world-cup/WorldCupBracketShell"

const listEntriesMock = vi.fn()

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@/lib/world-cup/worldCupClientApi", () => ({
  listWorldCupBracketEntries: (...args: any[]) => listEntriesMock(...args),
  adminLoadWorldCupTestFixtures: vi.fn().mockResolvedValue({ ok: true, result: { success: true, matchesUpdated: 16, pickableMatchesAfter: 16, unresolvedMatchesAfter: 15 } }),
  adminResetWorldCupSimulation: vi.fn().mockResolvedValue({ ok: true, result: { resetMatches: 0 } }),
  adminSimulateWorldCupMatch: vi.fn().mockResolvedValue({ ok: true, result: { advancedMatches: 0 } }),
  adminSimulateWorldCupRound: vi.fn().mockResolvedValue({ ok: true, result: { simulatedMatches: 0 } }),
  adminSimulateWorldCupTournament: vi.fn().mockResolvedValue({ ok: true, result: { rounds: [] } }),
  adminSyncWorldCupFixtures: vi.fn().mockResolvedValue({ updated: 0, warnings: [] }),
  adminSyncWorldCupLive: vi.fn().mockResolvedValue({ updated: 0, finalMatches: 0, recalculated: false, warnings: [] }),
  adminSyncWorldCupTeams: vi.fn().mockResolvedValue({ created: 0, updated: 0, warnings: [] }),
  clearWorldCupBracketEntryPicks: vi.fn().mockResolvedValue({}),
  createWorldCupBracketEntry: vi.fn().mockResolvedValue({ id: "entry-2", name: "Bracket 2", totalScore: 0, rank: null, correctPicks: 0, championTeamName: null }),
  deleteWorldCupBracketEntry: vi.fn().mockResolvedValue({}),
  getWorldCupIntegrityReport: vi.fn().mockResolvedValue({ ok: true, errors: [], warnings: [], stats: { participants: 1, entries: 1, matches: 31, picks: 0 } }),
  renameWorldCupBracketEntry: vi.fn().mockResolvedValue({ name: "Renamed" }),
  saveWorldCupBracketEntryPick: vi.fn().mockResolvedValue({ ok: true, pick: null }),
}))

vi.mock("@/lib/world-cup/worldCupBracketBuilder", () => ({
  isWorldCupChallengeLocked: vi.fn().mockReturnValue({ locked: false }),
}))

vi.mock("@/lib/world-cup/worldCupProjectedBracket", () => ({
  assertWorldCupPickPayloadReady: vi.fn(),
  buildWorldCupProjectedMatches: vi.fn().mockImplementation((matches: any[]) => matches),
  countRemainingPicks: vi.fn().mockReturnValue(16),
  getInvalidDownstreamPickIds: vi.fn().mockReturnValue([]),
  getOrderedRounds: vi.fn().mockReturnValue(["round_of_32"]),
  getWorldCupGuidedPicksState: vi.fn().mockReturnValue("fixtures_not_ready"),
  getWorldCupUnpickableReason: vi.fn().mockReturnValue(null),
  isWorldCupMatchPickable: vi.fn().mockReturnValue(false),
}))

vi.mock("@/lib/world-cup/worldCupAiInsights", () => ({
  getWorldCupPickRecommendation: vi.fn().mockReturnValue({ recommendedTeamId: "t1", recommendedSide: "home" }),
}))

vi.mock("@/components/brackets/world-cup/WorldCupLiveScoreTicker", () => ({
  __esModule: true,
  default: () => <div>LiveTicker</div>,
}))

vi.mock("@/components/brackets/world-cup/WorldCupEntryDashboard", () => ({
  __esModule: true,
  default: () => <div>EntryDashboard</div>,
}))

vi.mock("@/components/brackets/world-cup/WorldCupBracketHealthCard", () => ({
  __esModule: true,
  default: () => <div>HealthCard</div>,
}))

vi.mock("@/components/brackets/world-cup/WorldCupLeaderboard", () => ({
  __esModule: true,
  default: () => <div>Leaderboard</div>,
}))

vi.mock("@/components/brackets/world-cup/WorldCupLeaderboardInsights", () => ({
  __esModule: true,
  default: () => <div>LeaderboardInsights</div>,
}))

vi.mock("@/components/brackets/world-cup/WorldCupInvitePanel", () => ({
  __esModule: true,
  default: () => <div>InvitePanel</div>,
}))

vi.mock("@/components/brackets/world-cup/WorldCupGuidedMatchupPicker", () => ({
  __esModule: true,
  default: () => null,
}))

const baseView: any = {
  challenge: {
    id: "wc1",
    name: "Office World Cup",
    ownerUserId: "u1",
    seasonYear: 2026,
    inviteCode: "INVITE",
    inviteUrl: "http://localhost:3000/join/bracket/INVITE",
    visibility: "private",
    pickLockStrategy: "per_match",
    pickLockAt: null,
    maxParticipants: 100,
    maxEntriesPerParticipant: 3,
    effectivePickLockAt: null,
    status: "open",
    includeThirdPlace: false,
    isTestMode: false,
    simulationEnabled: false,
    simulatedAt: null,
    simulationStatus: null,
    hasSimulatedResults: false,
    lastSyncedAt: null,
    createdAt: new Date("2026-01-01").toISOString(),
    updatedAt: new Date("2026-01-02").toISOString(),
  },
  scoring: {
    roundOf32Points: 1,
    roundOf16Points: 2,
    quarterFinalPoints: 4,
    semiFinalPoints: 8,
    finalPoints: 16,
    championBonusPoints: 0,
    thirdPlacePoints: 4,
  },
  slots: [],
  matches: [
    {
      id: "m1",
      round: "round_of_32",
      roundIndex: 1,
      matchNumber: 1,
      homeSlotKey: "A1",
      awaySlotKey: "B2",
      homeTeamId: null,
      awayTeamId: null,
      homeTeamName: "TBD",
      awayTeamName: "TBD",
      homeTeamLogo: null,
      awayTeamLogo: null,
      status: "scheduled",
      nextMatchId: null,
      nextMatchSlot: null,
    },
  ],
  participant: null,
  activeEntry: null,
  entries: [],
  picks: [],
  leaderboard: [],
  isOwner: true,
  isAdmin: true,
}

describe("World Cup bracket shell navigation", () => {
  beforeEach(() => {
    listEntriesMock.mockResolvedValue([
      {
        id: "entry-1",
        name: "My Entry",
        totalScore: 0,
        rank: null,
        correctPicks: 0,
        championTeamName: null,
      },
    ])
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ view: baseView }) }))
  })

  it("renders sticky nav buttons and anchors", async () => {
    render(<WorldCupBracketShell initialView={baseView} />)

    const stickySubnav = screen.getByTestId("world-cup-sticky-subnav")
    expect(stickySubnav).toBeInTheDocument()
    expect(within(stickySubnav).getByRole("button", { name: "Top" })).toBeInTheDocument()
    expect(within(stickySubnav).getByRole("button", { name: "Picks" })).toBeInTheDocument()
    expect(within(stickySubnav).getByRole("button", { name: "Bracket" })).toBeInTheDocument()
    expect(within(stickySubnav).getByRole("button", { name: "Admin/Test" })).toBeInTheDocument()
    expect(within(stickySubnav).getByRole("button", { name: "Leaderboard" })).toBeInTheDocument()
    expect(within(stickySubnav).getByRole("button", { name: "Invite" })).toBeInTheDocument()

    await waitFor(() => expect(document.getElementById("world-cup-picks")).toBeTruthy())
    expect(document.getElementById("world-cup-top")).toBeTruthy()
    expect(document.getElementById("world-cup-bracket")).toBeTruthy()
    expect(document.getElementById("world-cup-admin")).toBeTruthy()

    fireEvent.click(within(stickySubnav).getByRole("button", { name: "Leaderboard" }))
    await waitFor(() => expect(document.getElementById("world-cup-leaderboard")).toBeTruthy())

    fireEvent.click(within(stickySubnav).getByRole("button", { name: "Invite" }))
    await waitFor(() => expect(document.getElementById("world-cup-invite")).toBeTruthy())
  })

  it("renders back-to-top, inline Load Test Fixtures, and bracket scroll wrapper", async () => {
    render(<WorldCupBracketShell initialView={baseView} />)

    expect(screen.getByTestId("world-cup-back-to-top")).toBeInTheDocument()

    await waitFor(() => expect(screen.getAllByRole("button", { name: /Load Test Fixtures/i }).length).toBeGreaterThan(0))
    expect(screen.getByTestId("world-cup-bracket-scroll")).toBeInTheDocument()
  })
})


