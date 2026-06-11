import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import WorldCupMatchImpactCenter from "@/components/brackets/world-cup/WorldCupMatchImpactCenter"
import { DEFAULT_WORLD_CUP_SCORING } from "@/lib/world-cup/worldCupBracketBuilder"
import type { WorldCupPickView, WorldCupMatchView, WorldCupLeaderboardRow } from "@/lib/world-cup/types"
import type { WorldCupDataTrustReport } from "@/lib/world-cup/worldCupDataTrustService"

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SCORING = { ...DEFAULT_WORLD_CUP_SCORING }

function match(overrides: Partial<WorldCupMatchView> = {}): WorldCupMatchView {
  return {
    id: "m-sf-1",
    apiFixtureId: null,
    round: "semifinal",
    roundIndex: 3,
    matchNumber: 61,
    homeSlotKey: "SF1H",
    awaySlotKey: "SF1A",
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
    status: "scheduled",
    startsAt: "2026-07-09T18:00:00.000Z",
    winnerTeamId: null,
    winnerTeamName: null,
    nextMatchId: null,
    nextMatchSlot: null,
    elapsedMinute: null,
    injuryTime: null,
    period: null,
    venueName: null,
    venueCity: null,
    apiStatusShort: "NS",
    lastScoreSyncedAt: null,
    ...overrides,
  }
}

function pick(overrides: Partial<WorldCupPickView> = {}): WorldCupPickView {
  return {
    id: "pick-1",
    matchId: "m-sf-1",
    matchNumber: 61,
    round: "semifinal",
    selectedTeamId: "team-brazil",
    selectedSlotKey: "SF1H",
    selectedTeamName: "Brazil",
    pointsAwarded: 0,
    isCorrect: null,
    lockedAt: null,
    ...overrides,
  }
}

function lbRow(overrides: Partial<WorldCupLeaderboardRow> = {}): WorldCupLeaderboardRow {
  return {
    rank: 1,
    entryId: "entry-1",
    entryName: "Test Bracket",
    participantId: "p-1",
    userId: "u-1",
    username: "testuser",
    avatarUrl: null,
    displayName: "Test User",
    totalScore: 30,
    maxPossibleScore: 400,
    correctPicks: 3,
    incorrectPicks: 0,
    championPickName: null,
    championTeamId: null,
    championStillAlive: true,
    championCorrect: false,
    finalistsCorrect: 0,
    knockoutPicksCorrect: 3,
    groupWinnersCorrect: 0,
    roundBreakdown: {},
    joinedAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-10T00:00:00.000Z",
    submittedAt: "2026-06-01T12:00:00.000Z",
    ...overrides,
  }
}

function dataTrustReport(overrides: Partial<WorldCupDataTrustReport> = {}): WorldCupDataTrustReport {
  return {
    challengeId: "wc-1",
    dataFreshness: "live",
    completenessGaps: [],
    liveMatchCount: 1,
    fixtureCount: 64,
    teamCount: 32,
    entryCount: 10,
    lastScoreSyncAt: new Date(Date.now() - 3 * 60_000).toISOString(), // 3 min ago
    lastFixtureSyncAt: new Date(Date.now() - 30 * 60_000).toISOString(),
    ...overrides,
  }
}

function setupFetch(report: WorldCupDataTrustReport | null = dataTrustReport()) {
  return vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: report !== null,
      json: () => Promise.resolve(report ? { report } : {}),
    })
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("WorldCupMatchImpactCenter", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("M1: renders null when no picks intersect upcoming matches", () => {
    setupFetch()
    const { container } = render(
      <WorldCupMatchImpactCenter
        challengeId="wc-1"
        picks={[pick({ matchId: "m-other" })]}
        matches={[match()]}
        scoring={SCORING}
        userLeaderboardRow={null}
      />
    )
    // No picks share a matchId with the upcoming match — nothing renders
    expect(container.firstChild).toBeNull()
  })

  it("M2: renders match title and round label for a direct pick", async () => {
    setupFetch()
    render(
      <WorldCupMatchImpactCenter
        challengeId="wc-1"
        picks={[pick()]}
        matches={[match()]}
        scoring={SCORING}
        userLeaderboardRow={lbRow()}
      />
    )
    expect(screen.getByTestId("match-impact-match-title")).toHaveTextContent(
      "Brazil vs Argentina"
    )
    expect(screen.getByTestId("match-impact-match-title")).toHaveTextContent("Semifinal")
  })

  it("M3: shows correct root-for team", async () => {
    setupFetch()
    render(
      <WorldCupMatchImpactCenter
        challengeId="wc-1"
        picks={[pick({ selectedTeamId: "team-brazil" })]}
        matches={[match()]}
        scoring={SCORING}
        userLeaderboardRow={lbRow()}
      />
    )
    expect(screen.getByTestId("match-impact-root-for")).toHaveTextContent("Brazil")
  })

  it("M4: shows worst result as the opposing team", async () => {
    setupFetch()
    render(
      <WorldCupMatchImpactCenter
        challengeId="wc-1"
        picks={[pick({ selectedTeamId: "team-brazil" })]}
        matches={[match()]}
        scoring={SCORING}
        userLeaderboardRow={lbRow()}
      />
    )
    expect(screen.getByTestId("match-impact-worst-result")).toHaveTextContent("Argentina")
  })

  it("M5: shows correct points at stake for a semifinal", async () => {
    setupFetch()
    render(
      <WorldCupMatchImpactCenter
        challengeId="wc-1"
        picks={[pick()]}
        matches={[match()]}
        scoring={SCORING}
        userLeaderboardRow={lbRow()}
      />
    )
    // DEFAULT_WORLD_CUP_SCORING.semiFinalPoints = 80
    expect(screen.getByTestId("match-impact-points")).toHaveTextContent("80 pts")
  })

  it("M6: champion risk note appears when champion team is in the match", async () => {
    setupFetch()
    render(
      <WorldCupMatchImpactCenter
        challengeId="wc-1"
        picks={[pick()]}
        matches={[match()]}
        scoring={SCORING}
        userLeaderboardRow={lbRow({ championTeamId: "team-brazil", championPickName: "Brazil" })}
      />
    )
    expect(screen.getByTestId("match-impact-champion-risk")).toBeInTheDocument()
    expect(screen.getByTestId("match-impact-champion-risk")).toHaveTextContent("Brazil")
  })

  it("M7: no champion risk note when champion is not in this match", async () => {
    setupFetch()
    render(
      <WorldCupMatchImpactCenter
        challengeId="wc-1"
        picks={[pick()]}
        matches={[match()]}
        scoring={SCORING}
        userLeaderboardRow={lbRow({ championTeamId: "team-france", championPickName: "France" })}
      />
    )
    expect(screen.queryByTestId("match-impact-champion-risk")).toBeNull()
  })

  it("M8: prefers final over semifinal when both present", async () => {
    setupFetch()
    render(
      <WorldCupMatchImpactCenter
        challengeId="wc-1"
        picks={[
          pick({ matchId: "m-sf-1", round: "semifinal", selectedTeamId: "team-brazil" }),
          pick({
            id: "pick-2",
            matchId: "m-final",
            round: "final",
            selectedTeamId: "team-germany",
          }),
        ]}
        matches={[
          match(),
          match({
            id: "m-final",
            round: "final",
            roundIndex: 5,
            matchNumber: 64,
            homeSlotKey: "FH",
            awaySlotKey: "FA",
            homeTeamId: "team-germany",
            awayTeamId: "team-spain",
            homeTeamName: "Germany",
            awayTeamName: "Spain",
          }),
        ]}
        scoring={SCORING}
        userLeaderboardRow={null}
      />
    )
    // Final should rank higher than semifinal
    expect(screen.getByTestId("match-impact-match-title")).toHaveTextContent("Germany vs Spain")
  })

  it("M9: trust chip appears after fetch resolves with live tier", async () => {
    setupFetch(dataTrustReport({ dataFreshness: "live" }))
    render(
      <WorldCupMatchImpactCenter
        challengeId="wc-1"
        picks={[pick()]}
        matches={[match()]}
        scoring={SCORING}
        userLeaderboardRow={null}
      />
    )
    await waitFor(() => {
      expect(screen.getByTestId("chimmy-freshness-chip")).toBeInTheDocument()
    })
  })

  it("M10: trust chip renders with cached tier label", async () => {
    setupFetch(
      dataTrustReport({
        dataFreshness: "cached",
        liveMatchCount: 0,
        lastFixtureSyncAt: new Date(Date.now() - 2 * 60 * 60_000).toISOString(), // 2 hr ago
      })
    )
    render(
      <WorldCupMatchImpactCenter
        challengeId="wc-1"
        picks={[pick()]}
        matches={[match()]}
        scoring={SCORING}
        userLeaderboardRow={null}
      />
    )
    await waitFor(() => {
      const chip = screen.getByTestId("chimmy-freshness-chip")
      expect(chip).toHaveTextContent(/Cached/i)
    })
  })
})
