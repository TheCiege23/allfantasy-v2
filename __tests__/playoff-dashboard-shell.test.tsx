import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import PlayoffBracketShell from "@/components/brackets/playoffs/PlayoffBracketShell"
import type { PlayoffChallengeView } from "@/lib/playoffs/types"

const pushMock = vi.hoisted(() => vi.fn())
const createPlayoffBracketEntryClientMock = vi.hoisted(() => vi.fn())
const getPlayoffBracketViewClientMock = vi.hoisted(() => vi.fn())
const savePlayoffBracketPickClientMock = vi.hoisted(() => vi.fn())
const toastErrorMock = vi.hoisted(() => vi.fn())
const toastSuccessMock = vi.hoisted(() => vi.fn())
const toastWarningMock = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("@/lib/playoffs/playoffClientApi", () => ({
  createPlayoffBracketEntryClient: createPlayoffBracketEntryClientMock,
  getPlayoffBracketViewClient: getPlayoffBracketViewClientMock,
  savePlayoffBracketPickClient: savePlayoffBracketPickClientMock,
}))

vi.mock("sonner", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
      warning: toastWarningMock,
  },
}))

function buildView(overrides: Partial<PlayoffChallengeView> = {}): PlayoffChallengeView {
  return {
    viewerUserId: "user-1",
    challenge: {
      id: "challenge-1",
      name: "NBA Playoff Bracket",
      ownerUserId: "user-1",
      sport: "nba",
      seasonYear: 2026,
      status: "open",
      isTestMode: false,
      visibility: "private",
      maxParticipants: 100,
      maxEntriesPerParticipant: 5,
      scoringStyle: "series_winner",
      lockRule: "first_tipoff",
      inviteCode: "ABCDEFGH",
      inviteUrl: "/brackets/leagues/challenge-1",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    participants: [{ userId: "user-1", displayName: "Test User", entryCount: 1 }],
    activeEntry: {
      id: "entry-1",
      name: "Bracket 1",
      userId: "user-1",
      pickCount: 0,
      isComplete: false,
      createdAt: new Date().toISOString(),
    },
    entries: [
      {
        id: "entry-1",
        name: "Bracket 1",
        userId: "user-1",
        pickCount: 0,
        isComplete: false,
        createdAt: new Date().toISOString(),
      },
    ],
    series: [],
    picks: [],
    rounds: ["round_1", "conference_semifinals", "conference_finals", "finals"],
    ...overrides,
  }
}

describe("PlayoffBracketShell dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getPlayoffBracketViewClientMock.mockResolvedValue(buildView())
  })

  it("renders NBA dashboard title and does not show NCAA label", () => {
    render(<PlayoffBracketShell initialView={buildView()} />)

    expect(screen.getByRole("heading", { name: "NBA Playoff Bracket" })).toBeInTheDocument()
    expect(screen.queryByText("NCAA Bracket")).not.toBeInTheDocument()
  })

  it("renders NHL dashboard title", () => {
    render(
      <PlayoffBracketShell
        initialView={buildView({
          challenge: {
            ...buildView().challenge,
            sport: "nhl",
            name: "NHL Playoff Bracket",
          },
        })}
      />
    )

    expect(screen.getByRole("heading", { name: "NHL Playoff Bracket" })).toBeInTheDocument()
  })

  it("renders Soccer dashboard title and does not show NCAA label", () => {
    render(
      <PlayoffBracketShell
        initialView={buildView({
          challenge: {
            ...buildView().challenge,
            sport: "soccer" as any,
            name: "Soccer Playoff Bracket",
          },
        })}
      />
    )

    expect(screen.getByRole("heading", { name: "Soccer Playoff Bracket" })).toBeInTheDocument()
    expect(screen.queryByText("NCAA Bracket")).not.toBeInTheDocument()
  })

  it("renders participants, my brackets, leaderboard, and first-entry CTA", () => {
    render(
      <PlayoffBracketShell
        initialView={buildView({
          activeEntry: null,
          entries: [],
          participants: [{ userId: "user-1", displayName: "Test User", entryCount: 0 }],
        })}
      />
    )

    expect(screen.getByRole("heading", { name: "Participants" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "My Brackets / Entries" })).toBeInTheDocument()
    expect(screen.getByTestId("playoff-dashboard-leaderboard")).toBeInTheDocument()
    expect(screen.getByText("Pick-count leaderboard until series results sync.")).toBeInTheDocument()
    expect(screen.getByTestId("playoff-fill-bracket-cta")).toHaveTextContent("Create Your First Bracket")
  })

  it("ranks leaderboard by synced score when results exist", () => {
    render(
      <PlayoffBracketShell
        initialView={buildView({
          entries: [
            {
              id: "entry-1",
              name: "Wrong Bracket",
              userId: "user-1",
              pickCount: 15,
              isComplete: true,
              totalScore: 0,
              correctPicks: 0,
              createdAt: new Date().toISOString(),
            },
            {
              id: "entry-2",
              name: "Correct Bracket",
              userId: "user-2",
              pickCount: 10,
              isComplete: false,
              totalScore: 1,
              correctPicks: 1,
              createdAt: new Date().toISOString(),
            },
          ],
        })}
      />
    )

    expect(screen.getByText("Scored leaderboard from completed series results.")).toBeInTheDocument()
    expect(screen.getByText("#1 Correct Bracket")).toBeInTheDocument()
    expect(screen.getByText(/1 pts/)).toBeInTheDocument()
  })

  it("creates another bracket entry and redirects to canonical pool entry route", async () => {
    createPlayoffBracketEntryClientMock.mockResolvedValue({
      challengeId: "challenge-1",
      entryId: "entry-2",
      redirectUrl: "/brackets/leagues/challenge-1/entries/entry-2",
    })

    render(<PlayoffBracketShell initialView={buildView()} />)

    fireEvent.click(screen.getByRole("button", { name: "Create Another Bracket" }))

    await waitFor(() => {
      expect(createPlayoffBracketEntryClientMock).toHaveBeenCalled()
      expect(pushMock).toHaveBeenCalledWith("/brackets/leagues/challenge-1/entries/entry-2")
    })
  })

  it("opens an existing entry from the Complete Bracket CTA", () => {
    render(<PlayoffBracketShell initialView={buildView()} />)

    fireEvent.click(screen.getByTestId("playoff-fill-bracket-cta"))

    expect(pushMock).toHaveBeenCalledWith("/brackets/leagues/challenge-1/entries/entry-1")
    expect(createPlayoffBracketEntryClientMock).not.toHaveBeenCalled()
  })

  it("shows template warning until series sync runs and calls sync route", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, warnings: ["No playoff series matched provider games."] }),
    } as Response)
    getPlayoffBracketViewClientMock.mockResolvedValue(buildView())
    render(
      <PlayoffBracketShell
        initialView={buildView({
          challenge: { ...buildView().challenge, isTestMode: true },
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
        })}
      />
    )

    expect(screen.getByTestId("playoff-template-warning")).toHaveTextContent("Template teams shown until playoff series sync runs.")
    fireEvent.click(screen.getByTestId("playoff-sync-series-button"))

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/brackets/playoffs/challenge-1/admin/sync-series", expect.objectContaining({ method: "POST" }))
      expect(toastWarningMock).toHaveBeenCalledWith("No playoff series matched provider games.")
    })

    fetchMock.mockRestore()
  })

  it("does not show sync action to a non-owner", () => {
    render(
      <PlayoffBracketShell
        initialView={buildView({
          viewerUserId: "user-2",
          challenge: { ...buildView().challenge, ownerUserId: "user-1", isTestMode: true },
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
        })}
      />
    )

    expect(screen.getByTestId("playoff-template-warning")).toBeInTheDocument()
    expect(screen.queryByTestId("playoff-sync-series-button")).not.toBeInTheDocument()
  })

  it("shows only the viewer's entries in My Brackets while keeping leaderboard entries", () => {
    render(
      <PlayoffBracketShell
        initialView={buildView({
          entries: [
            {
              id: "entry-1",
              name: "My Bracket",
              userId: "user-1",
              pickCount: 4,
              isComplete: false,
              createdAt: new Date().toISOString(),
            },
            {
              id: "entry-2",
              name: "Other User Bracket",
              userId: "user-2",
              pickCount: 6,
              isComplete: true,
              createdAt: new Date().toISOString(),
            },
          ],
        })}
      />
    )

    expect(screen.getByText("My Bracket")).toBeInTheDocument()
    expect(screen.getByText("#1 Other User Bracket")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Other User Bracket/i })).not.toBeInTheDocument()
  })

  it("blocks 6th entry creation", async () => {
    const fiveEntries = Array.from({ length: 5 }).map((_, index) => ({
      id: `entry-${index + 1}`,
      name: `Bracket ${index + 1}`,
      userId: "user-1",
      pickCount: 0,
      isComplete: false,
      createdAt: new Date().toISOString(),
    }))

    render(
      <PlayoffBracketShell
        initialView={buildView({
          entries: fiveEntries,
          participants: [{ userId: "user-1", displayName: "Test User", entryCount: 5 }],
        })}
      />
    )

    expect(screen.queryByRole("button", { name: "Create Another Bracket" })).not.toBeInTheDocument()
    expect(screen.getByText("Entry limit reached. Bracket 6 is blocked.")).toBeInTheDocument()
  })
})
