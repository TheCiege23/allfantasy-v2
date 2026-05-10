import { describe, expect, it, vi, beforeEach } from "vitest"
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react"

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

  it("matchup card hides a broken flag image behind the emoji fallback", async () => {
    const WorldCupMatchupCard = (await import("@/components/brackets/world-cup/WorldCupMatchupCard")).default
    render(
      <WorldCupMatchupCard
        match={{ ...sampleMatch, homeTeamLogo: "https://flagcdn.com/w80/br.png" }}
        onPick={() => {}}
      />
    )

    fireEvent.error(screen.getByAltText("Brazil flag"))

    await waitFor(() => {
      expect(screen.getByRole("img", { name: /Brazil flag/i })).toHaveTextContent("🇧🇷")
    })
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

  it("renders a valid flag URL with accessible alt text", async () => {
    const WorldCupTeamFlag = (await import("@/components/brackets/world-cup/WorldCupTeamFlag")).default
    render(<WorldCupTeamFlag flagUrl="https://flagcdn.com/w80/br.png" teamName="Brazil" />)

    const flag = screen.getByAltText("Brazil flag")
    expect(flag).toBeInTheDocument()
    expect(flag).toHaveAttribute("src", "https://flagcdn.com/w80/br.png")
  })

  it("falls back from a broken flag URL to an emoji flag", async () => {
    const WorldCupTeamFlag = (await import("@/components/brackets/world-cup/WorldCupTeamFlag")).default
    render(<WorldCupTeamFlag flagUrl="https://flagcdn.com/w80/br.png" teamName="Brazil" />)

    fireEvent.error(screen.getByAltText("Brazil flag"))

    await waitFor(() => expect(screen.queryByAltText("Brazil flag")).not.toBeInTheDocument())
    expect(screen.getByRole("img", { name: /Brazil flag/i })).toHaveTextContent("🇧🇷")
  })

  it("falls back to a country code badge when no flag URL is available", async () => {
    const WorldCupTeamFlag = (await import("@/components/brackets/world-cup/WorldCupTeamFlag")).default
    render(<WorldCupTeamFlag teamName="Brazil" countryCode="BRA" />)

    expect(screen.getByLabelText("Brazil country code BRA")).toHaveTextContent("BRA")
  })

  it("falls back to a globe when no flag data is available", async () => {
    const WorldCupTeamFlag = (await import("@/components/brackets/world-cup/WorldCupTeamFlag")).default
    render(<WorldCupTeamFlag teamName="Mystery Team" />)

    expect(screen.getByTestId("world-cup-team-flag-globe")).toHaveAccessibleName("Mystery Team flag unavailable")
  })

  it("guided picker team cards use the shared broken-image fallback", async () => {
    const WorldCupGuidedMatchupPicker = (await import("@/components/brackets/world-cup/WorldCupGuidedMatchupPicker")).default
    render(
      <WorldCupGuidedMatchupPicker
        challengeId="ch1"
        entryId="e1"
        entryName="Bracket 1"
        matches={[{ ...sampleMatch, homeTeamLogo: "https://flagcdn.com/w80/br.png" }]}
        picks={[]}
        isOpen
        isLocked={false}
        includeThirdPlace={false}
        onClose={() => {}}
        onSavePick={vi.fn().mockResolvedValue([])}
      />
    )

    const dialog = screen.getByRole("dialog", { name: /Guided Matchup Picker/i })
    fireEvent.error(within(dialog).getByAltText("Brazil flag"))

    await waitFor(() => {
      expect(within(dialog).getByRole("img", { name: /Brazil flag/i })).toHaveTextContent("🇧🇷")
    })
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

function makeShellSeededMatches() {
  return [
    makeShellMatch({
      id: "m1",
      matchNumber: 1,
      homeTeamId: "demo_team_brazil",
      awayTeamId: "demo_team_argentina",
      homeTeamName: "Brazil",
      awayTeamName: "Argentina",
      homeTeamLogo: "https://flagcdn.com/w80/br.png",
      awayTeamLogo: "https://flagcdn.com/w80/ar.png",
      homeSlotKey: "A1",
      awaySlotKey: "B2",
      nextMatchId: "m17",
      nextMatchSlot: "home",
    }),
    makeShellMatch({
      id: "m2",
      matchNumber: 2,
      homeTeamId: "demo_team_france",
      awayTeamId: "demo_team_germany",
      homeTeamName: "France",
      awayTeamName: "Germany",
      homeTeamLogo: "https://flagcdn.com/w80/fr.png",
      awayTeamLogo: "https://flagcdn.com/w80/de.png",
      homeSlotKey: "C1",
      awaySlotKey: "D2",
      nextMatchId: "m17",
      nextMatchSlot: "away",
    }),
    makeShellMatch({
      id: "m17",
      round: "round_of_16" as const,
      roundIndex: 1,
      matchNumber: 17,
      homeTeamId: null,
      awayTeamId: null,
      homeTeamName: "Winner Match 1",
      awayTeamName: "Winner Match 2",
      homeTeamLogo: null,
      awayTeamLogo: null,
      homeSlotKey: "W-M1",
      awaySlotKey: "W-M2",
      nextMatchId: null,
      nextMatchSlot: null,
    }),
  ]
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

  it("keeps seeded matchups visible and advances guided picker after saving the first pick", async () => {
    const WorldCupBracketShell = (await import("@/components/brackets/world-cup/WorldCupBracketShell")).default
    const seededMatches = makeShellSeededMatches()
    const initialView = makeShellView({ matches: seededMatches })
    const savedPick = {
      id: "pick-m1",
      matchId: "m1",
      round: "round_of_32",
      selectedTeamId: "demo_team_brazil",
      selectedSlotKey: "A1",
      selectedTeamName: "Brazil",
      pointsAwarded: 0,
      isCorrect: null,
      lockedAt: null,
    }

    clientApiMocks.savePick.mockResolvedValue({
      success: true,
      entry: makeShellEntry(),
      pick: savedPick,
      picks: [savedPick],
      isComplete: false,
    })
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          challenge: {
            id: "c1",
            name: "Cup",
          },
          entries: [{ id: "entry-1", name: "Bracket 1", createdAt: "2026-01-01T00:00:00.000Z", totalScore: 0, rank: null, isComplete: false }],
          picks: [savedPick],
          matches: [],
        }),
      })
    )

    render(<WorldCupBracketShell initialView={initialView as any} />)

    await waitFor(() => expect(screen.getAllByRole("button", { name: /Start Making Picks/i })[0]).toBeEnabled())
    expect(screen.getByTestId("world-cup-match-m1")).toBeInTheDocument()
    expect(screen.getByTestId("world-cup-match-m2")).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: /Start Making Picks/i })[0])
    const dialog = await screen.findByRole("dialog", { name: /Guided Matchup Picker/i })
    fireEvent.click(within(dialog).getByRole("button", { name: /Pick Brazil to win/i }))

    await waitFor(() => expect(clientApiMocks.savePick).toHaveBeenCalledWith(
      "c1",
      "entry-1",
      expect.objectContaining({
        activeEntryId: "entry-1",
        matchId: "m1",
        selectedTeamId: "demo_team_brazil",
      })
    ))

    await waitFor(() => {
      expect(within(screen.getByTestId("world-cup-match-m1")).getByRole("button", { name: /Selected: Brazil to win/i })).toHaveAttribute("aria-pressed", "true")
    })
    expect(screen.getByTestId("world-cup-match-m2")).toBeInTheDocument()
    expect(within(screen.getByTestId("world-cup-match-m17")).getByText("Brazil")).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId("world-cup-guided-footer-context")).toHaveTextContent(/Match 2/)
    })
    expect(within(screen.getByRole("dialog", { name: /Guided Matchup Picker/i })).getByRole("button", { name: /Pick France to win/i })).toBeInTheDocument()
  })

  it("keeps the selected entry active after save refresh returns a different activeEntry", async () => {
    const WorldCupBracketShell = (await import("@/components/brackets/world-cup/WorldCupBracketShell")).default
    const entry1 = makeShellEntry({ id: "entry-1", name: "Bracket 1" })
    const entry2 = makeShellEntry({ id: "entry-2", name: "Bracket 2" })
    const savedPick = {
      id: "pick-entry-2-m1",
      matchId: "m1",
      round: "round_of_32",
      selectedTeamId: "demo_team_brazil",
      selectedSlotKey: "A1",
      selectedTeamName: "Brazil",
      pointsAwarded: 0,
      isCorrect: null,
      lockedAt: null,
    }

    clientApiMocks.listEntries.mockResolvedValue([entry1, entry2])
    clientApiMocks.getEntry.mockResolvedValue({ ...entry2, picks: [] })
    clientApiMocks.savePick.mockResolvedValue({
      success: true,
      entry: entry2,
      pick: savedPick,
      picks: [savedPick],
      isComplete: false,
    })
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ...makeShellView({
            matches: [],
            activeEntry: { id: "entry-1", name: "Bracket 1" },
            entries: [
              { id: "entry-1", name: "Bracket 1", createdAt: entry1.createdAt, totalScore: 0, rank: null, isComplete: false },
              { id: "entry-2", name: "Bracket 2", createdAt: entry2.createdAt, totalScore: 0, rank: null, isComplete: false },
            ],
          }),
          picks: [],
        }),
      })
    )

    render(
      <WorldCupBracketShell
        initialEntryId="entry-2"
        initialView={makeShellView({
          matches: makeShellSeededMatches(),
          activeEntry: { id: "entry-2", name: "Bracket 2" },
          entries: [
            { id: "entry-1", name: "Bracket 1", createdAt: entry1.createdAt, totalScore: 0, rank: null, isComplete: false },
            { id: "entry-2", name: "Bracket 2", createdAt: entry2.createdAt, totalScore: 0, rank: null, isComplete: false },
          ],
        }) as any}
      />
    )

    await waitFor(() => expect(screen.getAllByRole("button", { name: /Start Making Picks/i })[0]).toBeEnabled())
    fireEvent.click(screen.getAllByRole("button", { name: /Start Making Picks/i })[0])
    const dialog = await screen.findByRole("dialog", { name: /Guided Matchup Picker/i })
    expect(within(dialog).getByText("Bracket 2")).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole("button", { name: /Pick Brazil to win/i }))

    await waitFor(() => expect(clientApiMocks.savePick).toHaveBeenCalledWith(
      "c1",
      "entry-2",
      expect.objectContaining({
        activeEntryId: "entry-2",
        matchId: "m1",
      })
    ))
    await waitFor(() => expect(within(screen.getByRole("dialog", { name: /Guided Matchup Picker/i })).getByText("Bracket 2")).toBeInTheDocument())
    expect(within(screen.getByTestId("world-cup-match-m1")).getByRole("button", { name: /Selected: Brazil to win/i })).toHaveAttribute("aria-pressed", "true")
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
