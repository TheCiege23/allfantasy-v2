import React from "react"
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import WorldCupBracketShell from "@/components/brackets/world-cup/WorldCupBracketShell"
import WorldCupGuidedMatchupPicker, { type GuidedPickPayload } from "@/components/brackets/world-cup/WorldCupGuidedMatchupPicker"
import WorldCupMatchupCard from "@/components/brackets/world-cup/WorldCupMatchupCard"
import type { WorldCupMatchView, WorldCupPickView, WorldCupRound } from "@/lib/world-cup/types"

const listEntriesMock = vi.fn()
const getEntryMock = vi.fn()
const isWorldCupChallengeLockedMock = vi.fn()
const adminSyncWorldCupLiveMock = vi.fn()

const installLocalStorageMock = () => {
  const store = new Map<string, string>()
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, String(value)),
      removeItem: (key: string) => store.delete(key),
      clear: () => store.clear(),
    },
  })
}

vi.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children, ...props }: any) => (
    <a href={typeof href === "string" ? href : "#"} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("next/image", () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}))

vi.mock("@/lib/world-cup/worldCupClientApi", () => ({
  listWorldCupBracketEntries: (...args: any[]) => listEntriesMock(...args),
  adminLoadWorldCupTestFixtures: vi.fn().mockResolvedValue({ ok: true, result: { success: true, matchesUpdated: 16, pickableMatchesAfter: 16, unresolvedMatchesAfter: 15 } }),
  adminResetWorldCupSimulation: vi.fn().mockResolvedValue({ ok: true, result: { resetMatches: 0 } }),
  adminSimulateWorldCupMatch: vi.fn().mockResolvedValue({ ok: true, result: { advancedMatches: 0 } }),
  adminSimulateWorldCupRound: vi.fn().mockResolvedValue({ ok: true, result: { simulatedMatches: 0 } }),
  adminSimulateWorldCupTournament: vi.fn().mockResolvedValue({ ok: true, result: { rounds: [] } }),
  adminSyncWorldCupFixtures: vi.fn().mockResolvedValue({ updated: 0, warnings: [] }),
  adminSyncWorldCupLive: (...args: any[]) => adminSyncWorldCupLiveMock(...args),
  adminSyncWorldCupTeams: vi.fn().mockResolvedValue({ created: 0, updated: 0, warnings: [] }),
  clearWorldCupBracketEntryPicks: vi.fn().mockResolvedValue({}),
  createWorldCupBracketEntry: vi.fn().mockResolvedValue({ id: "entry-2", name: "Bracket 2", totalScore: 0, rank: null, correctPicks: 0, championTeamName: null }),
  deleteWorldCupBracketEntry: vi.fn().mockResolvedValue({}),
  getWorldCupIntegrityReport: vi.fn().mockResolvedValue({ ok: true, errors: [], warnings: [], stats: { participants: 1, entries: 1, matches: 31, picks: 0 } }),
  getWorldCupBracketEntry: (...args: any[]) => getEntryMock(...args),
  getWorldCupAiMatchupPreview: vi.fn().mockResolvedValue({
    matchId: "m1",
    recommendedTeamId: "arg",
    homeWinProbability: 0.55,
    awayWinProbability: 0.45,
    upsetRisk: "medium",
    confidence: "medium",
    generative: false,
    keyFactors: [],
    summary: "Mock preview",
    safePick: "Home",
    contrarianPick: "Away",
    recommendedSide: "home",
    recommendedTeamName: "Home",
  }),
  renameWorldCupBracketEntry: vi.fn().mockResolvedValue({ name: "Renamed" }),
  saveWorldCupBracketEntryPick: vi.fn().mockResolvedValue({ ok: true, pick: null }),
}))

vi.mock("@/lib/world-cup/worldCupBracketBuilder", () => ({
  isWorldCupChallengeLocked: (...args: any[]) => isWorldCupChallengeLockedMock(...args),
}))

vi.mock("@/lib/world-cup/worldCupAiInsights", () => ({
  getWorldCupPickRecommendation: vi.fn().mockReturnValue({ recommendedTeamId: "t1", recommendedTeamName: "Team 1", recommendedSide: "home" }),
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

const makeMatch = (overrides: Partial<WorldCupMatchView> = {}): WorldCupMatchView => ({
  id: "m1",
  apiFixtureId: null,
  round: "round_of_32",
  roundIndex: 1,
  matchNumber: 1,
  homeSlotKey: "A1",
  awaySlotKey: "B2",
  homeTeamId: "arg",
  awayTeamId: "bra",
  homeTeamName: "Argentina",
  awayTeamName: "Brazil",
  homeTeamLogo: null,
  awayTeamLogo: null,
  homeScore: null,
  awayScore: null,
  homePenaltyScore: null,
  awayPenaltyScore: null,
  status: "scheduled",
  startsAt: null,
  winnerTeamId: null,
  winnerTeamName: null,
  nextMatchId: null,
  nextMatchSlot: null,
  elapsedMinute: null,
  injuryTime: null,
  period: null,
  venueName: null,
  venueCity: null,
  apiStatusShort: null,
  lastScoreSyncedAt: null,
  ...overrides,
})

const makePick = (
  matchId: string,
  selectedTeamId: string,
  round: WorldCupRound = "round_of_32",
  selectedSlotKey: string | null = "A1",
  selectedTeamName = "Argentina"
): WorldCupPickView => ({
  id: `pick-${matchId}-${selectedTeamId}`,
  matchId,
  round,
  selectedTeamId,
  selectedSlotKey,
  selectedTeamName,
  pointsAwarded: 0,
  isCorrect: null,
  lockedAt: null,
})

const makeEntry = (id: string, name = id, isComplete = false): any => ({
  id,
  challengeId: "wc1",
  participantId: "participant-1",
  userId: "user-1",
  name,
  championTeamId: null,
  championTeamName: null,
  totalScore: 0,
  maxPossibleScore: 0,
  correctPicks: 0,
  incorrectPicks: 0,
  rank: null,
  roundBreakdown: {},
  isComplete,
  isLocked: false,
  submittedAt: null,
  createdAt: new Date("2026-01-01").toISOString(),
  updatedAt: new Date("2026-01-01").toISOString(),
})

const makeShellView = ({
  matches,
  activeEntryId = "entry-1",
  picks = [],
  entries = [makeEntry("entry-1", "Bracket 1")],
}: {
  matches: WorldCupMatchView[]
  activeEntryId?: string
  picks?: WorldCupPickView[]
  entries?: any[]
}) => ({
  ...baseView,
  challenge: {
    ...baseView.challenge,
    maxEntriesPerParticipant: Math.max(5, entries.length),
  },
  matches,
  activeEntry: { id: activeEntryId, name: entries.find((entry) => entry.id === activeEntryId)?.name ?? "Bracket 1" },
  entries,
  picks,
})

const pickFromPayload = (payload: GuidedPickPayload): WorldCupPickView =>
  makePick(
    payload.matchId,
    payload.selectedTeamId ?? "slot-pick",
    payload.round,
    payload.selectedSlotKey ?? payload.sourceSlotKey ?? null,
    payload.selectedTeamName ?? "Selected team"
  )

const renderGuidedPicker = ({
  matches,
  picks = [],
  onSavePick,
  onPicksUpdated = vi.fn(),
  initialMatchId = null,
}: {
  matches: WorldCupMatchView[]
  picks?: WorldCupPickView[]
  onSavePick: (
    payload: GuidedPickPayload,
    currentPicks: WorldCupPickView[]
  ) => Promise<WorldCupPickView[]>
  onPicksUpdated?: (picks: WorldCupPickView[]) => void
  initialMatchId?: string | null
}) =>
  render(
    <WorldCupGuidedMatchupPicker
      challengeId="wc1"
      entryId="entry-1"
      entryName="My Entry"
      matches={matches}
      picks={picks}
      isOpen
      initialMatchId={initialMatchId}
      isLocked={false}
      onClose={vi.fn()}
      onSavePick={onSavePick}
      onPicksUpdated={onPicksUpdated}
    />
  )

const makeProjectedPathMatches = (): WorldCupMatchView[] => [
  makeMatch({
    id: "m1",
    matchNumber: 1,
    homeSlotKey: "A1",
    awaySlotKey: "B2",
    homeTeamId: "arg",
    awayTeamId: "bra",
    homeTeamName: "Argentina",
    awayTeamName: "Brazil",
    nextMatchId: "m3",
    nextMatchSlot: "home",
  }),
  makeMatch({
    id: "m2",
    matchNumber: 2,
    homeSlotKey: "C1",
    awaySlotKey: "D2",
    homeTeamId: "fra",
    awayTeamId: "jpn",
    homeTeamName: "France",
    awayTeamName: "Japan",
    nextMatchId: "m3",
    nextMatchSlot: "away",
  }),
  makeMatch({
    id: "m3",
    round: "final",
    roundIndex: 5,
    matchNumber: 3,
    homeSlotKey: "W1",
    awaySlotKey: "W2",
    homeTeamId: null,
    awayTeamId: null,
    homeTeamName: "TBD",
    awayTeamName: "TBD",
  }),
]

const advancePickerFeedback = async () => {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 450))
  })
}

beforeEach(() => {
  adminSyncWorldCupLiveMock.mockReset()
  adminSyncWorldCupLiveMock.mockResolvedValue({ updated: 0, finalMatches: 0, recalculated: false, warnings: [] })
})

describe("World Cup matchup live scoring display", () => {
  it("renders real team names and flag assets", () => {
    render(
      <WorldCupMatchupCard
        match={makeMatch({
          homeTeamLogo: "https://flagcdn.com/w80/ar.png",
          awayTeamLogo: "https://flagcdn.com/w80/br.png",
        })}
      />
    )

    expect(screen.getByText("Argentina")).toBeInTheDocument()
    expect(screen.getByText("Brazil")).toBeInTheDocument()
    expect(screen.getByAltText("Argentina flag")).toBeInTheDocument()
    expect(screen.getByAltText("Brazil flag")).toBeInTheDocument()
  })

  it("renders unresolved slot labels instead of blanks", () => {
    render(
      <WorldCupMatchupCard
        match={makeMatch({
          homeTeamId: null,
          awayTeamId: null,
          homeTeamName: "TBD",
          awayTeamName: "TBD",
          homeSlotKey: "A1",
          awaySlotKey: "B2",
        })}
      />
    )

    expect(screen.getByText("Winner Group A")).toBeInTheDocument()
    expect(screen.getByText("Runner-up Group B")).toBeInTheDocument()
    expect(screen.getByText("Not ready for picks")).toBeInTheDocument()
  })

  it("renders scheduled kickoff date/time and venue before the match", () => {
    render(
      <WorldCupMatchupCard
        match={makeMatch({
          startsAt: "2026-07-04T16:00:00.000Z",
          venueName: "MetLife Stadium",
          venueCity: "East Rutherford",
        })}
      />
    )

    expect(screen.getAllByText(/Jul 4/i).length).toBeGreaterThan(0)
    expect(screen.getByText("MetLife Stadium, East Rutherford")).toBeInTheDocument()
  })

  it("renders live match status, minute, and current score", () => {
    render(
      <WorldCupMatchupCard
        match={makeMatch({
          status: "live",
          apiStatusShort: "2H",
          elapsedMinute: 58,
          homeScore: 2,
          awayScore: 1,
        })}
        pick={makePick("m1", "arg", "round_of_32", "A1", "Argentina")}
      />
    )

    expect(screen.getByText(/2H 58/)).toBeInTheDocument()
    expect(screen.getAllByText("2").length).toBeGreaterThan(0)
    expect(screen.getAllByText("1").length).toBeGreaterThan(0)
    expect(screen.getByTestId("world-cup-team-m1-home").className).toContain("border-cyan")
  })

  it("renders final score and green correct pick state", () => {
    render(
      <WorldCupMatchupCard
        match={makeMatch({
          status: "final",
          homeScore: 2,
          awayScore: 1,
          winnerTeamId: "arg",
          winnerTeamName: "Argentina",
        })}
        pick={{
          ...makePick("m1", "arg", "round_of_32", "A1", "Argentina"),
          isCorrect: true,
          pointsAwarded: 1,
        }}
      />
    )

    expect(screen.getByText("Final")).toBeInTheDocument()
    expect(screen.getByText("Correct")).toBeInTheDocument()
    expect(screen.getByText("Winner")).toBeInTheDocument()
    expect(screen.getByTestId("world-cup-team-m1-home").className).toContain("emerald")
  })

  it("renders final incorrect picks in the losing state", () => {
    render(
      <WorldCupMatchupCard
        match={makeMatch({
          status: "final",
          homeScore: 2,
          awayScore: 1,
          winnerTeamId: "arg",
          winnerTeamName: "Argentina",
        })}
        pick={{
          ...makePick("m1", "bra", "round_of_32", "B2", "Brazil"),
          isCorrect: false,
          pointsAwarded: 0,
        }}
      />
    )

    expect(screen.getByText("Final")).toBeInTheDocument()
    expect(screen.getByText("Incorrect")).toBeInTheDocument()
    expect(screen.getByTestId("world-cup-team-m1-away").className).toContain("rose")
  })
})

describe("World Cup bracket shell navigation", () => {
  beforeEach(() => {
    installLocalStorageMock()
    listEntriesMock.mockReset()
    getEntryMock.mockReset()
    isWorldCupChallengeLockedMock.mockReset()
    isWorldCupChallengeLockedMock.mockReturnValue({ locked: false, reason: "none", lockAt: null })
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
    getEntryMock.mockResolvedValue({ picks: [] })
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

  it("refreshes visible entry scoring after live score sync recalculates the leaderboard", async () => {
    const matches = [makeMatch()]
    const entries = [makeEntry("entry-1", "Bracket 1")]
    const refreshedView = makeShellView({
      matches,
      entries: [{ ...entries[0], totalScore: 12, rank: 1 }],
      picks: [],
    })
    refreshedView.leaderboard = [
      {
        rank: 1,
        entryId: "entry-1",
        entryName: "Bracket 1",
        participantId: "participant-1",
        userId: "user-1",
        username: "player",
        avatarUrl: null,
        displayName: "Player",
        totalScore: 12,
        maxPossibleScore: 28,
        correctPicks: 2,
        incorrectPicks: 1,
        championPickName: "Argentina",
        championTeamId: "arg",
        championStillAlive: true,
        roundBreakdown: { round_of_32: 12 },
        joinedAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-07-01T20:00:00.000Z",
      },
    ]
    listEntriesMock.mockReset()
    listEntriesMock
      .mockResolvedValueOnce(entries)
      .mockResolvedValueOnce([
        {
          ...entries[0],
          totalScore: 12,
          maxPossibleScore: 28,
          correctPicks: 2,
          incorrectPicks: 1,
          rank: 1,
        },
      ])
    getEntryMock.mockResolvedValue({ ...entries[0], picks: [] })
    adminSyncWorldCupLiveMock.mockResolvedValue({ updated: 1, finalMatches: 1, recalculated: true, warnings: [] })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => refreshedView }))

    render(<WorldCupBracketShell initialView={makeShellView({ matches, entries, picks: [] })} />)

    await waitFor(() => expect(getEntryMock).toHaveBeenCalledWith("wc1", "entry-1"))
    fireEvent.click(await screen.findByRole("button", { name: /Sync Live Scores/i }))

    await waitFor(() => expect(adminSyncWorldCupLiveMock).toHaveBeenCalledWith(
      "wc1",
      expect.objectContaining({ recalculate: true })
    ))
    await waitFor(() => expect(screen.getByText("12")).toBeInTheDocument())
  })
})

describe("World Cup bracket shell pick persistence", () => {
  beforeEach(() => {
    installLocalStorageMock()
    listEntriesMock.mockReset()
    getEntryMock.mockReset()
    isWorldCupChallengeLockedMock.mockReset()
    isWorldCupChallengeLockedMock.mockReturnValue({ locked: false, reason: "none", lockAt: null })
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ view: baseView }) }))
  })

  it("picks remain after refresh by hydrating the active entry from the entry API", async () => {
    const matches = [makeMatch()]
    const entries = [makeEntry("entry-1", "Bracket 1")]
    const savedPick = makePick("m1", "arg", "round_of_32", "A1", "Argentina")
    listEntriesMock.mockResolvedValue(entries)
    getEntryMock.mockResolvedValue({ ...entries[0], picks: [savedPick] })

    render(<WorldCupBracketShell initialView={makeShellView({ matches, entries, picks: [] })} />)

    await waitFor(() => expect(getEntryMock).toHaveBeenCalledWith("wc1", "entry-1"))
    await waitFor(() =>
      expect(screen.getByTestId("world-cup-team-m1-home")).toHaveAttribute("aria-pressed", "true")
    )
  })

  it("projected next-round winners remain after refresh", async () => {
    const matches = makeProjectedPathMatches()
    const entries = [makeEntry("entry-1", "Bracket 1")]
    const savedPicks = [
      makePick("m1", "arg", "round_of_32", "A1", "Argentina"),
      makePick("m2", "jpn", "round_of_32", "D2", "Japan"),
    ]
    listEntriesMock.mockResolvedValue(entries)
    getEntryMock.mockResolvedValue({ ...entries[0], picks: savedPicks })

    render(<WorldCupBracketShell initialView={makeShellView({ matches, entries, picks: [] })} />)

    await waitFor(() => {
      expect(screen.getByTestId("world-cup-team-m3-home")).toHaveTextContent("Argentina")
      expect(screen.getByTestId("world-cup-team-m3-away")).toHaveTextContent("Japan")
    })
  })

  it("keeps an incomplete bracket incomplete after refresh", async () => {
    const matches = makeProjectedPathMatches()
    const entries = [makeEntry("entry-1", "Bracket 1")]
    const savedPicks = [makePick("m1", "arg", "round_of_32", "A1", "Argentina")]
    listEntriesMock.mockResolvedValue(entries)
    getEntryMock.mockResolvedValue({ ...entries[0], picks: savedPicks, isComplete: false })

    render(<WorldCupBracketShell initialView={makeShellView({ matches, entries, picks: [] })} />)

    await waitFor(() => expect(screen.getByText(/1 of 2 picks/i)).toBeInTheDocument())
    expect(screen.getAllByRole("button", { name: /Continue Guided Picks/i }).length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: /Review Guided Picks/i })).not.toBeInTheDocument()
  })

  it("keeps a completed bracket complete after refresh only when all required selections exist", async () => {
    const matches = makeProjectedPathMatches()
    const entries = [makeEntry("entry-1", "Bracket 1", true)]
    const savedPicks = [
      makePick("m1", "arg", "round_of_32", "A1", "Argentina"),
      makePick("m2", "jpn", "round_of_32", "D2", "Japan"),
      makePick("m3", "arg", "final", "A1", "Argentina"),
    ]
    listEntriesMock.mockResolvedValue(entries)
    getEntryMock.mockResolvedValue({ ...entries[0], picks: savedPicks, isComplete: true })

    render(<WorldCupBracketShell initialView={makeShellView({ matches, entries, picks: [] })} />)

    await waitFor(() => expect(screen.getByText(/3 of 3 picks/i)).toBeInTheDocument())
    expect(screen.getAllByRole("button", { name: /Review Guided Picks/i }).length).toBeGreaterThan(0)
  })

  it("switching entries does not leak picks between brackets", async () => {
    const matches = [makeMatch()]
    const entries = [makeEntry("entry-1", "Bracket 1"), makeEntry("entry-2", "Bracket 2")]
    const picksByEntry: Record<string, WorldCupPickView[]> = {
      "entry-1": [makePick("m1", "arg", "round_of_32", "A1", "Argentina")],
      "entry-2": [makePick("m1", "bra", "round_of_32", "B2", "Brazil")],
    }
    listEntriesMock.mockResolvedValue(entries)
    getEntryMock.mockImplementation(async (_challengeId: string, entryId: string) => ({
      ...entries.find((entry) => entry.id === entryId),
      picks: picksByEntry[entryId] ?? [],
    }))

    render(<WorldCupBracketShell initialView={makeShellView({ matches, entries, picks: [] })} />)

    await waitFor(() =>
      expect(screen.getByTestId("world-cup-team-m1-home")).toHaveAttribute("aria-pressed", "true")
    )

    fireEvent.change(screen.getByTestId("world-cup-entry-switcher"), { target: { value: "entry-2" } })

    await waitFor(() =>
      expect(screen.getByTestId("world-cup-team-m1-away")).toHaveAttribute("aria-pressed", "true")
    )
    expect(screen.getByTestId("world-cup-team-m1-home")).toHaveAttribute("aria-pressed", "false")
  })

  it("keeps each of 5 brackets on independent saved picks", async () => {
    const matches = Array.from({ length: 5 }, (_, idx) =>
      makeMatch({
        id: `m${idx + 1}`,
        matchNumber: idx + 1,
        homeSlotKey: `H${idx + 1}`,
        awaySlotKey: `A${idx + 1}`,
        homeTeamId: `home-${idx + 1}`,
        awayTeamId: `away-${idx + 1}`,
        homeTeamName: `Home ${idx + 1}`,
        awayTeamName: `Away ${idx + 1}`,
      })
    )
    const entries = Array.from({ length: 5 }, (_, idx) => makeEntry(`entry-${idx + 1}`, `Bracket ${idx + 1}`))
    const picksByEntry = Object.fromEntries(
      entries.map((entry, idx) => [
        entry.id,
        [
          makePick(
            `m${idx + 1}`,
            `home-${idx + 1}`,
            "round_of_32",
            `H${idx + 1}`,
            `Home ${idx + 1}`
          ),
        ],
      ])
    ) as Record<string, WorldCupPickView[]>
    listEntriesMock.mockResolvedValue(entries)
    getEntryMock.mockImplementation(async (_challengeId: string, entryId: string) => ({
      ...entries.find((entry) => entry.id === entryId),
      picks: picksByEntry[entryId] ?? [],
    }))

    render(<WorldCupBracketShell initialView={makeShellView({ matches, entries, picks: [] })} />)

    const switcher = await screen.findByTestId("world-cup-entry-switcher")
    for (let idx = 0; idx < entries.length; idx += 1) {
      fireEvent.change(switcher, { target: { value: entries[idx].id } })

      await waitFor(() =>
        expect(screen.getByTestId(`world-cup-team-m${idx + 1}-home`)).toHaveAttribute("aria-pressed", "true")
      )

      for (let otherIdx = 0; otherIdx < entries.length; otherIdx += 1) {
        if (otherIdx === idx) continue
        expect(screen.getByTestId(`world-cup-team-m${otherIdx + 1}-home`)).toHaveAttribute("aria-pressed", "false")
      }
    }
  })

  it("locked bracket still displays saved picks", async () => {
    isWorldCupChallengeLockedMock.mockReturnValue({
      locked: true,
      reason: "tournament_started",
      lockAt: "2026-07-01T00:00:00Z",
    })
    const matches = [makeMatch()]
    const entries = [makeEntry("entry-1", "Bracket 1")]
    const savedPick = makePick("m1", "arg", "round_of_32", "A1", "Argentina")
    listEntriesMock.mockResolvedValue(entries)
    getEntryMock.mockResolvedValue({ ...entries[0], picks: [savedPick] })

    render(<WorldCupBracketShell initialView={makeShellView({ matches, entries, picks: [] })} />)

    await waitFor(() =>
      expect(screen.getByTestId("world-cup-team-m1-home")).toHaveAttribute("aria-pressed", "true")
    )
    expect(screen.getAllByText(/Bracket Locked/i).length).toBeGreaterThan(0)
  })

  it("hides guided picker controls and disables board picks after lock", async () => {
    isWorldCupChallengeLockedMock.mockReturnValue({
      locked: true,
      reason: "tournament_started",
      lockAt: "2026-07-01T00:00:00Z",
    })
    const matches = [makeMatch()]
    const entries = [makeEntry("entry-1", "Bracket 1")]
    listEntriesMock.mockResolvedValue(entries)
    getEntryMock.mockResolvedValue({ ...entries[0], picks: [] })

    render(<WorldCupBracketShell initialView={makeShellView({ matches, entries, picks: [] })} />)

    await waitFor(() => expect(screen.getByTestId("world-cup-team-m1-home")).toBeDisabled())
    expect(screen.queryByRole("button", { name: /Start Making Picks|Continue Guided Picks|Review Guided Picks/i })).not.toBeInTheDocument()
    expect(screen.getAllByText(/Bracket Locked/i).length).toBeGreaterThan(0)
  })
})

describe("World Cup guided picker winner selection", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("clicking the home team saves selectedTeamId with entry and bracket metadata", async () => {
    const match = makeMatch()
    const onSavePick = vi.fn(async (payload: GuidedPickPayload) => [pickFromPayload(payload)])

    renderGuidedPicker({ matches: [match], onSavePick })

    fireEvent.click(screen.getByRole("button", { name: /Argentina/i }))

    await waitFor(() => expect(onSavePick).toHaveBeenCalledTimes(1))
    expect(onSavePick.mock.calls[0][0]).toMatchObject({
      activeEntryId: "entry-1",
      matchId: "m1",
      selectedTeamId: "arg",
      selectedTeamName: "Argentina",
      selectedSlotKey: "A1",
      selectedSide: "home",
      round: "round_of_32",
      sourceSlotKey: "A1",
      nextMatchId: null,
      nextMatchSlot: null,
      matchNumber: 1,
    })
  })

  it("clicking the away team saves selectedTeamId through the same winner handler", async () => {
    const match = makeMatch()
    const onSavePick = vi.fn(async (payload: GuidedPickPayload) => [pickFromPayload(payload)])

    renderGuidedPicker({ matches: [match], onSavePick })

    fireEvent.click(screen.getByRole("button", { name: /Brazil/i }))

    await waitFor(() => expect(onSavePick).toHaveBeenCalledTimes(1))
    expect(onSavePick.mock.calls[0][0]).toMatchObject({
      activeEntryId: "entry-1",
      matchId: "m1",
      selectedTeamId: "bra",
      selectedTeamName: "Brazil",
      selectedSlotKey: "B2",
      selectedSide: "away",
      round: "round_of_32",
      sourceSlotKey: "B2",
    })
  })

  it("keeps the modal open after a successful pick", async () => {
    const match = makeMatch()
    const onSavePick = vi.fn(async (payload: GuidedPickPayload) => [pickFromPayload(payload)])

    renderGuidedPicker({ matches: [match], onSavePick })

    fireEvent.click(screen.getByRole("button", { name: /Argentina/i }))

    await waitFor(() => expect(onSavePick).toHaveBeenCalledTimes(1))
    expect(screen.getByRole("dialog", { name: /Guided Matchup Picker/i })).toBeInTheDocument()
  })

  it("advances to the next matchup and then to the first projected next-round matchup", async () => {
    const matchOne = makeMatch({
      id: "m1",
      matchNumber: 1,
      homeSlotKey: "A1",
      awaySlotKey: "B2",
      homeTeamId: "arg",
      awayTeamId: "bra",
      homeTeamName: "Argentina",
      awayTeamName: "Brazil",
      nextMatchId: "m3",
      nextMatchSlot: "home",
    })
    const matchTwo = makeMatch({
      id: "m2",
      matchNumber: 2,
      homeSlotKey: "C1",
      awaySlotKey: "D2",
      homeTeamId: "fra",
      awayTeamId: "jpn",
      homeTeamName: "France",
      awayTeamName: "Japan",
      nextMatchId: "m3",
      nextMatchSlot: "away",
    })
    const projectedRoundMatch = makeMatch({
      id: "m3",
      round: "round_of_16",
      roundIndex: 2,
      matchNumber: 3,
      homeSlotKey: "W1",
      awaySlotKey: "W2",
      homeTeamId: null,
      awayTeamId: null,
      homeTeamName: "TBD",
      awayTeamName: "TBD",
    })
    let savedPicks: WorldCupPickView[] = []
    const onSavePick = vi.fn(async (payload: GuidedPickPayload) => {
      savedPicks = [
        ...savedPicks.filter((pick) => pick.matchId !== payload.matchId),
        pickFromPayload(payload),
      ]
      return savedPicks
    })

    renderGuidedPicker({ matches: [matchOne, matchTwo, projectedRoundMatch], onSavePick })

    fireEvent.click(screen.getByRole("button", { name: /Argentina/i }))
    await waitFor(() => expect(onSavePick).toHaveBeenCalledTimes(1))
    await advancePickerFeedback()

    expect(screen.getByRole("button", { name: /France/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Japan/i }))
    await waitFor(() => expect(onSavePick).toHaveBeenCalledTimes(2))
    await advancePickerFeedback()

    expect(screen.getByRole("button", { name: /Argentina/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Japan/i })).toBeInTheDocument()
  })

  it("does not advance or mark the matchup picked when save fails", async () => {
    const matches = [
      makeMatch(),
      makeMatch({
        id: "m2",
        matchNumber: 2,
        homeSlotKey: "C1",
        awaySlotKey: "D2",
        homeTeamId: "fra",
        awayTeamId: "jpn",
        homeTeamName: "France",
        awayTeamName: "Japan",
      }),
    ]
    const onSavePick = vi.fn(async () => {
      throw new Error("Save exploded")
    })

    renderGuidedPicker({ matches, onSavePick })

    fireEvent.click(screen.getByRole("button", { name: /Argentina/i }))

    await screen.findByText("Save exploded")
    await advancePickerFeedback()

    expect(screen.getByRole("dialog", { name: /Guided Matchup Picker/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Argentina/i })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /France/i })).not.toBeInTheDocument()
  })

  it("marks complete after the final pick only when all required pickable matches have selections", async () => {
    const openingMatch = makeMatch()
    const finalMatch = makeMatch({
      id: "final-1",
      round: "final",
      roundIndex: 5,
      matchNumber: 2,
      homeSlotKey: "W29",
      awaySlotKey: "W30",
      homeTeamId: "arg",
      awayTeamId: "fra",
      homeTeamName: "Argentina",
      awayTeamName: "France",
    })
    const openingPick = makePick("m1", "arg")
    const onSavePick = vi.fn(async (payload: GuidedPickPayload) => [
      openingPick,
      pickFromPayload(payload),
    ])

    renderGuidedPicker({
      matches: [openingMatch, finalMatch],
      picks: [openingPick],
      onSavePick,
      initialMatchId: "final-1",
    })

    fireEvent.click(screen.getByRole("button", { name: /France/i }))

    await waitFor(() => expect(onSavePick).toHaveBeenCalledTimes(1))
    await advancePickerFeedback()

    expect(screen.getByText("Bracket Complete!")).toBeInTheDocument()
  })
})


