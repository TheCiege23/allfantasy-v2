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

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(),
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
      inviteUrl: "/brackets/playoffs/challenge-1",
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

  it("renders participants, entries, leaderboard, and Fill In Bracket CTA", () => {
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
    expect(screen.getByRole("heading", { name: "Entries" })).toBeInTheDocument()
    expect(screen.getByTestId("playoff-dashboard-leaderboard")).toBeInTheDocument()
    expect(screen.getByTestId("playoff-fill-bracket-cta")).toHaveTextContent("Fill In Bracket")
  })

  it("creates a bracket entry and redirects to board entry", async () => {
    createPlayoffBracketEntryClientMock.mockResolvedValue({
      challengeId: "challenge-1",
      entryId: "entry-2",
      redirectUrl: "/brackets/playoffs/challenge-1?entryId=entry-2",
    })

    render(<PlayoffBracketShell initialView={buildView()} />)

    fireEvent.click(screen.getByRole("button", { name: "Create Bracket Entry" }))

    await waitFor(() => {
      expect(createPlayoffBracketEntryClientMock).toHaveBeenCalled()
      expect(pushMock).toHaveBeenCalledWith("/brackets/playoffs/challenge-1?entryId=entry-2")
    })
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

    const createButton = screen.getByRole("button", { name: "Create Bracket Entry" })
    expect(createButton).toBeDisabled()
    expect(screen.getByText("Entry limit reached. Bracket 6 is blocked.")).toBeInTheDocument()
  })
})
