/**
 * world-cup-countdown-banner.test.tsx
 *
 * Tests for WorldCupPoolCountdownBanner — unit + integration inside the shell.
 *
 * Strategy
 * ────────
 * • Unit tests use fake timers (vi.useFakeTimers) to control Date.now() and
 *   setInterval without real waits.
 * • Integration tests render WorldCupBracketShell with overridden lock times
 *   and assert the banner appears on every tab.
 * • All lock times use either the past (locked) or far future (not locked)
 *   to keep assertions deterministic.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act, fireEvent } from "@testing-library/react"

// ── Router / Link mocks ───────────────────────────────────────────────────────

const routerMocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  replace: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => routerMocks,
}))

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}))

vi.mock("next/image", () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}))

// ── Client-API mocks (needed for shell integration) ───────────────────────────

const clientApiMocks = vi.hoisted(() => ({
  listEntries: vi.fn(),
  getEntry: vi.fn(),
  fetchCompletionReview: vi.fn(),
  finalizeEntry: vi.fn(),
  fetchGroupStageView: vi.fn(),
  saveGroupRanking: vi.fn(),
  saveThirdPlaceAdvancers: vi.fn(),
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
  adminSyncGroupStandings: vi.fn(),
}))

vi.mock("@/lib/world-cup/worldCupClientApi", () => ({
  listWorldCupBracketEntries: clientApiMocks.listEntries,
  getWorldCupBracketEntry: clientApiMocks.getEntry,
  fetchWorldCupEntryCompletionReview: clientApiMocks.fetchCompletionReview,
  finalizeWorldCupEntryClient: clientApiMocks.finalizeEntry,
  fetchWorldCupGroupStageView: clientApiMocks.fetchGroupStageView,
  saveWorldCupGroupRanking: clientApiMocks.saveGroupRanking,
  saveWorldCupThirdPlaceAdvancers: clientApiMocks.saveThirdPlaceAdvancers,
  adminLoadWorldCupTestFixtures: clientApiMocks.adminLoadTestFixtures,
  adminResetWorldCupSimulation: clientApiMocks.adminResetSimulation,
  adminSimulateWorldCupMatch: clientApiMocks.adminSimulateMatch,
  adminSimulateWorldCupRound: clientApiMocks.adminSimulateRound,
  adminSimulateWorldCupTournament: clientApiMocks.adminSimulateTournament,
  adminSyncWorldCupTeams: clientApiMocks.adminSyncTeams,
  adminSyncWorldCupFixtures: clientApiMocks.adminSyncFixtures,
  adminSyncWorldCupLive: clientApiMocks.adminSyncLive,
  adminSyncWorldCupGroupStandings: clientApiMocks.adminSyncGroupStandings,
  clearWorldCupBracketEntryPicks: clientApiMocks.clearPicks,
  createWorldCupBracketEntry: clientApiMocks.createEntry,
  deleteWorldCupBracketEntry: clientApiMocks.deleteEntry,
  getWorldCupIntegrityReport: clientApiMocks.getIntegrityReport,
  renameWorldCupBracketEntry: clientApiMocks.renameEntry,
  saveWorldCupBracketEntryPick: clientApiMocks.savePick,
  getEntryStatus: () => "not_started",
}))

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Returns an ISO string N milliseconds from a given base time. */
function futureIso(baseMs: number, deltaMs: number): string {
  return new Date(baseMs + deltaMs).toISOString()
}

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

// ── Unit tests — WorldCupPoolCountdownBanner ──────────────────────────────────

describe("WorldCupPoolCountdownBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function renderBanner(props: {
    lockAt: string | null
    isLocked?: boolean
    firstMatch?: { homeTeamName: string; awayTeamName: string; startsAt: string | null }
  }) {
    const { default: WorldCupPoolCountdownBanner } = await import(
      "@/components/brackets/world-cup/WorldCupPoolCountdownBanner"
    )
    const onFinishPicks = vi.fn()
    const onViewLeaderboard = vi.fn()
    render(
      <WorldCupPoolCountdownBanner
        lockAt={props.lockAt}
        isLocked={props.isLocked ?? false}
        firstMatch={props.firstMatch}
        onFinishPicks={onFinishPicks}
        onViewLeaderboard={onViewLeaderboard}
      />
    )
    return { onFinishPicks, onViewLeaderboard }
  }

  it("shows fallback when lockAt is null and not locked", async () => {
    const now = Date.now()
    vi.setSystemTime(now)
    await renderBanner({ lockAt: null })
    expect(screen.getByTestId("wc-countdown-banner-fallback")).toBeInTheDocument()
    expect(screen.getByText(/World Cup countdown coming soon/i)).toBeInTheDocument()
    expect(screen.getByText(/Picks remain editable until kickoff is confirmed/i)).toBeInTheDocument()
  })

  it("shows locked state when isLocked is true", async () => {
    const now = Date.now()
    vi.setSystemTime(now)
    // lockAt is in the past (already locked)
    const pastLockAt = new Date(now - HOUR).toISOString()
    await renderBanner({ lockAt: pastLockAt, isLocked: true })
    expect(screen.getByTestId("wc-countdown-banner-locked")).toBeInTheDocument()
    expect(screen.getByText(/Group picks are locked/i)).toBeInTheDocument()
    expect(screen.getByText(/Live scoring is now active/i)).toBeInTheDocument()
  })

  it("shows locked state when lockAt is in the past (even if isLocked is false)", async () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const pastLockAt = new Date(now - HOUR).toISOString()
    await renderBanner({ lockAt: pastLockAt, isLocked: false })
    // After hydration the interval fires and detects totalMs === 0 → locked state
    await act(async () => {
      vi.advanceTimersByTime(1100) // trigger first interval tick
    })
    expect(screen.getByTestId("wc-countdown-banner-locked")).toBeInTheDocument()
  })

  it("shows countdown state when >24h before lock", async () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const lockAt = futureIso(now, 3 * DAY + 5 * HOUR)
    await renderBanner({ lockAt })
    // Tick to trigger useEffect → setTimeLeft
    await act(async () => { vi.advanceTimersByTime(100) })
    expect(screen.getByTestId("wc-countdown-banner")).toBeInTheDocument()
    // CTA label for countdown state
    expect(screen.getByRole("button", { name: /Make Picks/i })).toBeInTheDocument()
    // Urgency label
    expect(screen.getByText(/World Cup starts in/i)).toBeInTheDocument()
  })

  it("shows urgent state (amber) when <24h before lock", async () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const lockAt = futureIso(now, 20 * HOUR) // 20 hours away
    await renderBanner({ lockAt })
    await act(async () => { vi.advanceTimersByTime(100) })
    expect(screen.getByTestId("wc-countdown-banner")).toBeInTheDocument()
    expect(screen.getByText(/Picks lock soon/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Finish My Bracket/i })).toBeInTheDocument()
  })

  it("shows final-hour state (rose) when <1h before lock", async () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const lockAt = futureIso(now, 30 * 60 * 1000) // 30 minutes away
    await renderBanner({ lockAt })
    await act(async () => { vi.advanceTimersByTime(100) })
    expect(screen.getByTestId("wc-countdown-banner")).toBeInTheDocument()
    expect(screen.getByText(/Final chance — picks lock at kickoff/i)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Finish Picks Now/i })).toBeInTheDocument()
  })

  it("displays team names when firstMatch has real teams", async () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const lockAt = futureIso(now, 3 * DAY)
    await renderBanner({
      lockAt,
      firstMatch: {
        homeTeamName: "Mexico",
        awayTeamName: "South Africa",
        startsAt: lockAt,
      },
    })
    await act(async () => { vi.advanceTimersByTime(100) })
    expect(screen.getByText(/Mexico vs South Africa/i)).toBeInTheDocument()
  })

  it("displays fallback match label when team names are TBD", async () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const lockAt = futureIso(now, 3 * DAY)
    await renderBanner({
      lockAt,
      firstMatch: {
        homeTeamName: "TBD",
        awayTeamName: "TBD",
        startsAt: lockAt,
      },
    })
    await act(async () => { vi.advanceTimersByTime(100) })
    expect(screen.getByText(/First group-stage match/i)).toBeInTheDocument()
  })

  it("view leaderboard CTA fires callback", async () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const pastLockAt = new Date(now - HOUR).toISOString()
    const { onViewLeaderboard } = await renderBanner({ lockAt: pastLockAt, isLocked: true })
    fireEvent.click(screen.getByRole("button", { name: /View Leaderboard/i }))
    expect(onViewLeaderboard).toHaveBeenCalledTimes(1)
  })

  it("finish picks CTA fires callback", async () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const lockAt = futureIso(now, 3 * DAY)
    const { onFinishPicks } = await renderBanner({ lockAt })
    await act(async () => { vi.advanceTimersByTime(100) })
    fireEvent.click(screen.getByRole("button", { name: /Make Picks/i }))
    expect(onFinishPicks).toHaveBeenCalledTimes(1)
  })

  it("stops interval and freezes at 00:00:00 when lock time is reached", async () => {
    const now = Date.now()
    vi.setSystemTime(now)
    const lockAt = futureIso(now, 5000) // 5 seconds away
    await renderBanner({ lockAt })
    await act(async () => { vi.advanceTimersByTime(100) })
    // Still showing countdown
    expect(screen.getByTestId("wc-countdown-banner")).toBeInTheDocument()
    // Advance past lock
    await act(async () => { vi.advanceTimersByTime(6000) })
    // Should now show locked state
    expect(screen.getByTestId("wc-countdown-banner-locked")).toBeInTheDocument()
  })
})

// ── Integration: banner appears in WorldCupBracketShell ───────────────────────

describe("WorldCupPoolCountdownBanner in shell", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clientApiMocks.fetchGroupStageView.mockResolvedValue({ ok: true, json: async () => ({ challengeId: "c1", entryId: "entry-1", groups: [], groupRankingPicks: [], thirdPlaceAdvancerPicks: [] }) })
    clientApiMocks.listEntries.mockResolvedValue([])
    clientApiMocks.getIntegrityReport.mockResolvedValue({ issues: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function makeShellView(overrides: Record<string, unknown> = {}) {
    const now = Date.now()
    // Lock 3 days in the future so banner shows countdown state
    const lockAt = new Date(now + 3 * DAY).toISOString()
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
        effectivePickLockAt: lockAt,
        status: "open",
        includeThirdPlace: false,
        knockoutMode: "predictive" as const,
        isTestMode: false,
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
      matches: [
        {
          id: "m1",
          apiFixtureId: null,
          round: "round_of_32" as const,
          roundIndex: 1,
          matchNumber: 1,
          homeSlotKey: "A1",
          awaySlotKey: "B2",
          homeTeamId: "team-brazil",
          awayTeamId: "team-argentina",
          homeTeamName: "Brazil",
          awayTeamName: "Argentina",
          homeTeamLogo: null,
          awayTeamLogo: null,
          homeScore: null,
          awayScore: null,
          homePenaltyScore: null,
          awayPenaltyScore: null,
          status: "scheduled" as const,
          startsAt: lockAt,
          winnerTeamId: null,
          winnerTeamName: null,
          nextMatchId: null,
          nextMatchSlot: null,
          elapsedMinute: null,
          injuryTime: null,
          period: null,
          venueName: "MetLife Stadium",
          venueCity: "East Rutherford",
          apiStatusShort: null,
          lastScoreSyncedAt: null,
        },
      ],
      participant: null,
      activeEntry: null,
      entries: [],
      picks: [],
      leaderboard: [],
      isOwner: false,
      isAdmin: false,
      hasBracketBrainAi: false,
      ...overrides,
    }
  }

  it("banner appears on the home tab", async () => {
    const { default: WorldCupBracketShell } = await import(
      "@/components/brackets/world-cup/WorldCupBracketShell"
    )
    render(<WorldCupBracketShell initialView={makeShellView() as any} defaultTab="home" />)
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(screen.getByTestId("wc-countdown-banner")).toBeInTheDocument()
  })

  it("banner appears on the picks tab", async () => {
    const { default: WorldCupBracketShell } = await import(
      "@/components/brackets/world-cup/WorldCupBracketShell"
    )
    render(<WorldCupBracketShell initialView={makeShellView() as any} defaultTab="picks" />)
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(screen.getByTestId("wc-countdown-banner")).toBeInTheDocument()
  })

  it("banner appears on the leaderboard tab", async () => {
    const { default: WorldCupBracketShell } = await import(
      "@/components/brackets/world-cup/WorldCupBracketShell"
    )
    render(<WorldCupBracketShell initialView={makeShellView() as any} defaultTab="leaderboard" />)
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(screen.getByTestId("wc-countdown-banner")).toBeInTheDocument()
  })

  it("shows locked state in shell when isLocked (past effectivePickLockAt)", async () => {
    const { default: WorldCupBracketShell } = await import(
      "@/components/brackets/world-cup/WorldCupBracketShell"
    )
    const pastLock = new Date(Date.now() - HOUR).toISOString()
    render(
      <WorldCupBracketShell
        initialView={makeShellView({
          challenge: {
            ...makeShellView().challenge,
            effectivePickLockAt: pastLock,
            pickLockAt: pastLock,
            status: "locked",
          },
        } as any) as any}
        defaultTab="home"
      />
    )
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(screen.getByTestId("wc-countdown-banner-locked")).toBeInTheDocument()
  })

  it("shows fallback in shell when no effectivePickLockAt", async () => {
    const { default: WorldCupBracketShell } = await import(
      "@/components/brackets/world-cup/WorldCupBracketShell"
    )
    render(
      <WorldCupBracketShell
        initialView={makeShellView({
          challenge: {
            ...makeShellView().challenge,
            effectivePickLockAt: null,
            pickLockAt: null,
            pickLockStrategy: "per_match",
          },
          matches: [],
        } as any) as any}
        defaultTab="home"
      />
    )
    await act(async () => { vi.advanceTimersByTime(200) })
    expect(screen.getByTestId("wc-countdown-banner-fallback")).toBeInTheDocument()
  })
})
