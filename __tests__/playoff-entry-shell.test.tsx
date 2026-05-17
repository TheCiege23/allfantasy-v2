import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import PlayoffBracketEntryShell from "@/components/brackets/playoffs/PlayoffBracketEntryShell"
import type { PlayoffChallengeView } from "@/lib/playoffs/types"

const pushMock = vi.hoisted(() => vi.fn())
const getPlayoffBracketViewClientMock = vi.hoisted(() => vi.fn())
const savePlayoffBracketPickClientMock = vi.hoisted(() => vi.fn())
const submitPlayoffBracketEntryClientMock = vi.hoisted(() => vi.fn())
const toastWarningMock = vi.hoisted(() => vi.fn())
const toastErrorMock = vi.hoisted(() => vi.fn())
const toastSuccessMock = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("@/lib/playoffs/playoffClientApi", () => ({
  getPlayoffBracketViewClient: getPlayoffBracketViewClientMock,
  savePlayoffBracketPickClient: savePlayoffBracketPickClientMock,
  submitPlayoffBracketEntryClient: submitPlayoffBracketEntryClientMock,
}))

vi.mock("sonner", () => ({
  toast: {
    warning: toastWarningMock,
    error: toastErrorMock,
    success: toastSuccessMock,
  },
}))

function buildEntryView(overrides: Partial<PlayoffChallengeView> = {}): PlayoffChallengeView {
  return {
    viewerUserId: "user-1",
    challenge: {
      id: "challenge-1",
      name: "NBA Playoff Pool",
      ownerUserId: "user-1",
      sport: "nba",
      seasonYear: 2026,
      status: "open",
      isTestMode: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    activeEntry: {
      id: "entry-1",
      name: "Bracket 1",
      userId: "user-1",
      pickCount: 0,
      isComplete: false,
      createdAt: new Date().toISOString(),
    },
    entries: [],
    picks: [],
    rounds: ["round_1", "conference_semifinals", "conference_finals", "finals"],
    series: [
      {
        id: "s9",
        round: "conference_semifinals",
        roundIndex: 2,
        seriesNumber: 9,
        conference: "east",
        homeSeed: 0,
        awaySeed: 0,
        homeTeamName: "Winner S1",
        awayTeamName: "Winner S2",
        winnerTeamName: null,
        bestOf: 7,
        status: "scheduled",
        startsAt: null,
        nextSeriesNumber: 13,
        nextSeriesSlot: "home",
        sourceSeriesHome: 1,
        sourceSeriesAway: 2,
      },
    ],
    ...overrides,
  }
}

describe("PlayoffBracketEntryShell", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPlayoffBracketViewClientMock.mockResolvedValue(buildEntryView())
  })

  it("shows template warning and owner sync action on entry page", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        ok: true,
        warnings: ["No playoff series matched provider games."],
        attemptedProviders: ["rolling_insights_schedule_season"],
        source: "rolling_insights_schedule_season",
        sport: "nba",
        challengeSeasonYear: 2026,
        selectedProviderSeason: 2025,
        providerSeasonAttempts: [
          { provider: "rolling_insights_schedule_season", seasonYear: 2026, rowsReturned: 0, postseasonRows: 0 },
          { provider: "rolling_insights_schedule_season", seasonYear: 2025, rowsReturned: 1379, postseasonRows: 74 },
        ],
        seasonYear: 2026,
        postseasonGames: 0,
        gamesSeen: 0,
        gamesMatched: 0,
        seriesReturned: 0,
        seriesMatched: 0,
        seriesUpdated: 0,
        winnersUpdated: 0,
        unmatchedExamples: [],
        diagnostics: {
          seasonYear: 2026,
          challengeSeasonYear: 2026,
          selectedProviderSeason: 2025,
          providerSeasonAttempts: [
            { provider: "rolling_insights_schedule_season", seasonYear: 2026, rowsReturned: 0, postseasonRows: 0 },
            { provider: "rolling_insights_schedule_season", seasonYear: 2025, rowsReturned: 1379, postseasonRows: 74 },
          ],
          seasonSelectionExplanation: "Rolling Insights uses season start year; 2025 was selected for the 2025-26 season.",
          sport: "nba",
          selectedProvider: "rolling_insights_schedule_season",
          providerAttempts: [{ provider: "rolling_insights_schedule_season", gamesReturned: 0 }],
          existingSeriesExamples: [{ round: 2, homeTeam: "Winner S1", awayTeam: "Winner S2" }],
          providerGameExamples: [],
          providerSeriesExamples: [],
        },
      }),
    } as Response)

    render(<PlayoffBracketEntryShell initialView={buildEntryView()} />)

    expect(screen.getByTestId("playoff-entry-template-warning")).toHaveTextContent("Template teams shown until playoff series sync runs.")
    fireEvent.click(screen.getByTestId("playoff-entry-sync-series-button"))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/brackets/playoffs/challenge-1/admin/sync-series", expect.objectContaining({ method: "POST" }))
      expect(toastWarningMock).toHaveBeenCalledWith("No playoff series matched provider games.")
    })
    expect(screen.getByTestId("playoff-entry-sync-diagnostics")).toHaveTextContent("existingSeriesExamples")
    expect(screen.getByTestId("playoff-entry-sync-diagnostics")).toHaveTextContent("Rolling Insights uses season start year")

    fetchMock.mockRestore()
  })

  it("hides unsafe sync action for non-owner entry viewers", () => {
    render(
      <PlayoffBracketEntryShell
        initialView={buildEntryView({
          viewerUserId: "user-2",
          challenge: { ...buildEntryView().challenge, ownerUserId: "user-1" },
        })}
      />
    )

    expect(screen.getByTestId("playoff-entry-template-warning")).toBeInTheDocument()
    expect(screen.queryByTestId("playoff-entry-sync-series-button")).not.toBeInTheDocument()
  })
})
