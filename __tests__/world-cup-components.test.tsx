import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"

const clientApiMocks = vi.hoisted(() => ({
  listEntries: vi.fn(),
  getEntry: vi.fn(),
  adminLoadTestFixtures: vi.fn(),
  adminResetSimulation: vi.fn(),
  adminSimulateMatch: vi.fn(),
  adminSimulateRound: vi.fn(),
  adminSimulateTournament: vi.fn(),
  adminSyncTeams: vi.fn(),
  adminSyncFixtures: vi.fn(),
  adminSyncLive: vi.fn(),
  clearPicks: vi.fn(),
  createEntry: vi.fn(),
  deleteEntry: vi.fn(),
  getIntegrityReport: vi.fn(),
  renameEntry: vi.fn(),
  savePick: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}))

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    message: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt?: string; src: string }) => <img alt={alt ?? ""} src={src} />,
}))

vi.mock("@/components/brackets/world-cup/WorldCupMatchupIntelligencePanel", () => ({
  default: () => <div data-testid="wc-intel-stub" />,
}))

vi.mock("@/lib/world-cup/worldCupClientApi", () => ({
  adminLoadWorldCupTestFixtures: clientApiMocks.adminLoadTestFixtures,
  adminResetWorldCupSimulation: clientApiMocks.adminResetSimulation,
  adminSimulateWorldCupMatch: clientApiMocks.adminSimulateMatch,
  adminSimulateWorldCupRound: clientApiMocks.adminSimulateRound,
  adminSimulateWorldCupTournament: clientApiMocks.adminSimulateTournament,
  adminSyncWorldCupFixtures: clientApiMocks.adminSyncFixtures,
  adminSyncWorldCupLive: clientApiMocks.adminSyncLive,
  adminSyncWorldCupTeams: clientApiMocks.adminSyncTeams,
  clearWorldCupBracketEntryPicks: clientApiMocks.clearPicks,
  createWorldCupBracketEntry: clientApiMocks.createEntry,
  deleteWorldCupBracketEntry: clientApiMocks.deleteEntry,
  getWorldCupIntegrityReport: clientApiMocks.getIntegrityReport,
  getWorldCupBracketEntry: clientApiMocks.getEntry,
  getEntryStatus: (entry: { isLocked?: boolean; isComplete?: boolean; correctPicks?: number; totalScore?: number }) =>
    entry.isLocked ? "locked" : entry.isComplete ? "complete" : (entry.correctPicks ?? 0) > 0 || (entry.totalScore ?? 0) > 0 ? "in_progress" : "not_started",
  listWorldCupBracketEntries: clientApiMocks.listEntries,
  renameWorldCupBracketEntry: clientApiMocks.renameEntry,
  saveWorldCupBracketEntryPick: clientApiMocks.savePick,
}))

function mockSettingsPayload(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    challenge: {
      id: "ch1",
      name: "Test Cup",
      visibility: "private",
      inviteCode: "WCUP123",
      maxParticipants: 100,
      maxEntriesPerParticipant: 5,
      includeThirdPlace: true,
    },
    scoring: {
      roundOf32Points: 10,
      roundOf16Points: 20,
      quarterFinalPoints: 40,
      semiFinalPoints: 80,
      finalPoints: 160,
      championBonusPoints: 320,
      thirdPlacePoints: 4,
    },
    leagueSettings: {
      scoringStyle: "standard",
      tiebreakerFinalScore: false,
      allowLateJoin: false,
      showPublicPicks: "after_lock",
      bracketBrainEnabled: true,
      inviteGateConfigured: false,
    },
    commissioner: {
      enableSystemEvents: true,
      enableUpsetAlerts: true,
      enableLeaderboardAlerts: true,
      enableChampionBustAlerts: true,
      enableLockReminders: true,
      enableAiSummaries: false,
    },
    hasAfPro: false,
    isAdmin: false,
    earlyPublicPicksAllowed: false,
    ...overrides,
  }
}

describe("World Cup commissioner UI modules", () => {
  it("loads commissioner brain panel module", async () => {
    const m = await import("@/components/brackets/world-cup/WorldCupCommissionerBrainPanel")
    expect(m.default).toBeDefined()
  })
})

describe("WorldCupBracketSettingsPanel", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSettingsPayload(),
      })
    )
  })

  it("renders defaults and scoring preview after load", async () => {
    const WorldCupBracketSettingsPanel = (await import("@/components/brackets/world-cup/WorldCupBracketSettingsPanel"))
      .default
    render(<WorldCupBracketSettingsPanel challengeId="ch1" />)

    await waitFor(() => {
      expect(screen.queryByTestId("world-cup-settings-loading")).not.toBeInTheDocument()
    })

    expect(screen.getByTestId("world-cup-settings-panel")).toBeInTheDocument()
    const preview = screen.getByTestId("world-cup-settings-scoring-preview")
    expect(preview.textContent).toMatch(/Round of 32/)
    expect(preview.textContent).toMatch(/Champion bonus/)
  })

  it("does not show Bracket Brain toggle for non-Pro", async () => {
    const WorldCupBracketSettingsPanel = (await import("@/components/brackets/world-cup/WorldCupBracketSettingsPanel"))
      .default
    render(<WorldCupBracketSettingsPanel challengeId="ch1" />)

    await waitFor(() => {
      expect(screen.queryByTestId("world-cup-settings-loading")).not.toBeInTheDocument()
    })

    expect(screen.queryByTestId("world-cup-settings-bracket-brain")).toBeNull()
  })

  it("shows basic alert toggles without AF Pro", async () => {
    const WorldCupBracketSettingsPanel = (await import("@/components/brackets/world-cup/WorldCupBracketSettingsPanel"))
      .default
    render(<WorldCupBracketSettingsPanel challengeId="ch1" />)

    await waitFor(() => {
      expect(screen.queryByTestId("world-cup-settings-loading")).not.toBeInTheDocument()
    })

    expect(screen.getByText(/^Upset alerts$/i)).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: /^Lock reminders$/i })).toBeInTheDocument()
  })

  it("shows client validation for max users above cap", async () => {
    const WorldCupBracketSettingsPanel = (await import("@/components/brackets/world-cup/WorldCupBracketSettingsPanel"))
      .default
    render(<WorldCupBracketSettingsPanel challengeId="ch1" />)

    await waitFor(() => {
      expect(screen.queryByTestId("world-cup-settings-loading")).not.toBeInTheDocument()
    })

    fireEvent.change(screen.getByTestId("world-cup-settings-max-users"), { target: { value: "120" } })
    expect(screen.getByText(/Max users must be between 1 and 100/)).toBeInTheDocument()
  })

  it("shows Bracket Brain toggle for Pro", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockSettingsPayload({ hasAfPro: true }),
      })
    )
    const WorldCupBracketSettingsPanel = (await import("@/components/brackets/world-cup/WorldCupBracketSettingsPanel"))
      .default
    render(<WorldCupBracketSettingsPanel challengeId="ch1" />)

    await waitFor(() => {
      expect(screen.getByTestId("world-cup-settings-bracket-brain")).toBeInTheDocument()
    })
  })
})

describe("World Cup mobile polish — matchup card & guided picker", () => {
  const sampleMatch = {
    id: "m1",
    apiFixtureId: 1,
    round: "round_of_16" as const,
    roundIndex: 0,
    matchNumber: 1,
    homeSlotKey: "H1",
    awaySlotKey: "A1",
    homeTeamId: "t1",
    awayTeamId: "t2",
    homeTeamName: "Brazil",
    awayTeamName: "France",
    homeTeamLogo: null,
    awayTeamLogo: null,
    homeScore: null,
    awayScore: null,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    status: "scheduled" as const,
    startsAt: "2026-07-01T12:00:00.000Z",
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
  }

  it("matchup card team buttons expose accessible pick labels", async () => {
    const WorldCupMatchupCard = (await import("@/components/brackets/world-cup/WorldCupMatchupCard")).default
    render(
      <WorldCupMatchupCard
        match={sampleMatch}
        onPick={() => {}}
      />
    )
    expect(screen.getByRole("button", { name: /Pick Brazil to win/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Pick France to win/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Pick Brazil to win/i })).toHaveAttribute("aria-pressed", "false")
  })

  it("guided picker renders close control and team pick labels", async () => {
    const WorldCupGuidedMatchupPicker = (await import("@/components/brackets/world-cup/WorldCupGuidedMatchupPicker")).default
    const onSavePick = vi.fn().mockResolvedValue([])
    render(
      <WorldCupGuidedMatchupPicker
        challengeId="ch1"
        entryId="e1"
        entryName="Bracket 1"
        matches={[sampleMatch]}
        picks={[]}
        isOpen
        isLocked={false}
        includeThirdPlace={false}
        onClose={() => {}}
        onSavePick={onSavePick}
      />
    )
    expect(screen.getByTestId("world-cup-guided-close")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Pick Brazil to win/i })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Pick France to win/i })).toBeInTheDocument()
  })
})

function makeShellEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: "entry-1",
    challengeId: "c1",
    participantId: "participant-1",
    userId: "user-1",
    name: "Bracket 1",
    championTeamId: null,
    championTeamName: null,
    totalScore: 0,
    maxPossibleScore: 0,
    correctPicks: 0,
    incorrectPicks: 0,
    rank: null,
    roundBreakdown: {},
    isComplete: false,
    isLocked: false,
    submittedAt: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  }
}

function makeShellMatch(overrides: Record<string, unknown> = {}) {
  return {
    id: "m1",
    apiFixtureId: null,
    round: "round_of_32" as const,
    roundIndex: 1,
    matchNumber: 1,
    homeSlotKey: "A1",
    awaySlotKey: "B2",
    homeTeamId: "demo_team_brazil",
    awayTeamId: "demo_team_argentina",
    homeTeamName: "Brazil",
    awayTeamName: "Argentina",
    homeTeamLogo: "https://flagcdn.com/w80/br.png",
    awayTeamLogo: "https://flagcdn.com/w80/ar.png",
    homeScore: null,
    awayScore: null,
    homePenaltyScore: null,
    awayPenaltyScore: null,
    status: "scheduled" as const,
    startsAt: "2099-07-01T18:00:00.000Z",
    winnerTeamId: null,
    winnerTeamName: null,
    nextMatchId: null,
    nextMatchSlot: null,
    elapsedMinute: null,
    injuryTime: null,
    period: null,
    venueName: "MetLife Stadium",
    venueCity: "East Rutherford",
    apiStatusShort: "TEST",
    lastScoreSyncedAt: null,
    ...overrides,
  }
}

function makeShellView(overrides: Record<string, unknown> = {}) {
  const entry = makeShellEntry()
  return {
    challenge: {
      id: "c1",
      name: "Cup",
      ownerUserId: "user-1",
      seasonYear: 2026,
      inviteCode: "INVITE",
      inviteUrl: null,
      visibility: "private" as const,
      pickLockStrategy: "tournament_start" as const,
      pickLockAt: null,
      maxParticipants: 100,
      maxEntriesPerParticipant: 5,
      effectivePickLockAt: "2099-07-01T18:00:00.000Z",
      status: "open",
      includeThirdPlace: false,
      isTestMode: true,
      simulationEnabled: false,
      simulatedAt: null,
      simulationStatus: null,
      hasSimulatedResults: false,
      lastSyncedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
    scoring: {
      roundOf32Points: 10,
      roundOf16Points: 20,
      quarterFinalPoints: 40,
      semiFinalPoints: 80,
      finalPoints: 160,
      championBonusPoints: 320,
      thirdPlacePoints: 4,
    },
    slots: [],
    matches: [makeShellMatch()],
    participant: {
      id: "participant-1",
      userId: "user-1",
      displayName: "Owner",
      joinedAt: "2026-01-01T00:00:00.000Z",
      totalScore: 0,
      maxPossibleScore: 0,
      championPickTeamId: null,
      championPickName: null,
      correctPicks: 0,
      rank: null,
    },
    activeEntry: { id: entry.id, name: entry.name },
    entries: [{ id: entry.id, name: entry.name, createdAt: entry.createdAt, totalScore: 0, rank: null, isComplete: false }],
    picks: [],
    leaderboard: [],
    isOwner: true,
    isAdmin: false,
    hasBracketBrainAi: true,
    ...overrides,
  }
}

describe("WorldCupBracketShell fixture readiness", () => {
  beforeEach(() => {
    clientApiMocks.listEntries.mockReset()
    clientApiMocks.getEntry.mockReset()
    clientApiMocks.adminLoadTestFixtures.mockReset()
    clientApiMocks.listEntries.mockResolvedValue([makeShellEntry()])
    clientApiMocks.getEntry.mockResolvedValue({ ...makeShellEntry(), picks: [] })
    clientApiMocks.adminLoadTestFixtures.mockResolvedValue({
      ok: true,
      result: {
        success: true,
        teamsCreated: 32,
        teamsUpdated: 0,
        matchesUpdated: 16,
        pickableMatchesAfter: 16,
        totalMatchesAfter: 31,
        unresolvedMatchesAfter: 15,
        warnings: [],
      },
    })
    vi.stubGlobal("fetch", vi.fn())
  })

  it("shows Seed Test Fixtures CTA for commissioner/admin when fixtures are missing", async () => {
    const WorldCupBracketShell = (await import("@/components/brackets/world-cup/WorldCupBracketShell")).default
    render(
      <WorldCupBracketShell
        initialView={makeShellView({
          matches: [],
          hasBracketBrainAi: true,
        }) as any}
      />
    )

    await waitFor(() => expect(clientApiMocks.listEntries).toHaveBeenCalled())
    expect(screen.getAllByRole("button", { name: /Seed Test Fixtures/i }).length).toBeGreaterThan(0)
  })

  it("shows seeded matchups, enables guided picker, and renders Bracket Brain panel", async () => {
    const WorldCupBracketShell = (await import("@/components/brackets/world-cup/WorldCupBracketShell")).default
    render(<WorldCupBracketShell initialView={makeShellView() as any} />)

    await waitFor(() => expect(screen.getAllByRole("button", { name: /Start Making Picks/i })[0]).toBeEnabled())
    expect(screen.getByAltText("Brazil flag")).toBeInTheDocument()
    expect(screen.getAllByText("Brazil").length).toBeGreaterThan(0)
    expect(screen.queryByText("Fixtures Not Ready")).not.toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: /Start Making Picks/i })[0])

    expect(await screen.findByTestId("world-cup-guided-close")).toBeInTheDocument()
    expect(screen.getByTestId("wc-intel-stub")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Pick Brazil to win/i }).length).toBeGreaterThan(0)
  })
})

describe("WorldCupLeaderboard mobile score row", () => {
  it("renders mobile score strip with totals", async () => {
    const WorldCupLeaderboard = (await import("@/components/brackets/world-cup/WorldCupLeaderboard")).default
    const view = {
      challenge: {
        id: "c1",
        name: "Cup",
        ownerUserId: "o1",
        seasonYear: 2026,
        inviteCode: "X",
        inviteUrl: null,
        visibility: "public" as const,
        pickLockStrategy: "tournament_start" as const,
        pickLockAt: null,
        maxParticipants: 100,
        maxEntriesPerParticipant: 5,
        effectivePickLockAt: null,
        status: "open",
        includeThirdPlace: false,
        isTestMode: false,
        simulationEnabled: false,
        simulatedAt: null,
        simulationStatus: null,
        hasSimulatedResults: false,
        lastSyncedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      scoring: {
        roundOf32Points: 10,
        roundOf16Points: 20,
        quarterFinalPoints: 40,
        semiFinalPoints: 80,
        finalPoints: 160,
        championBonusPoints: 320,
        thirdPlacePoints: 4,
      },
      slots: [],
      matches: [],
      participant: null,
      activeEntry: null,
      entries: [],
      picks: [],
      leaderboard: [
        {
          rank: 1,
          entryId: "ent1",
          entryName: "My bracket",
          participantId: "p1",
          userId: "u1",
          username: "u",
          avatarUrl: null,
          displayName: "Alex",
          totalScore: 42,
          maxPossibleScore: 400,
          correctPicks: 3,
          incorrectPicks: 1,
          championPickName: "Brazil",
          championTeamId: "t1",
          championStillAlive: true,
          roundBreakdown: {},
          joinedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      isOwner: false,
      isAdmin: false,
      hasBracketBrainAi: false,
    }
    render(<WorldCupLeaderboard view={view as any} />)
    expect(screen.getByTestId("wc-lb-mobile-score-row")).toBeInTheDocument()
    expect(screen.getByTestId("wc-lb-total-mobile-ent1")).toHaveTextContent("42")
    expect(screen.getByTestId("wc-lb-champion-status-ent1")).toHaveTextContent("Alive")
  })
})
