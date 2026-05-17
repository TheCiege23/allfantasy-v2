import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import NewBracketLeaguePage from "@/app/brackets/leagues/new/page"

const pushMock = vi.hoisted(() => vi.fn())
const backMock = vi.hoisted(() => vi.fn())
const searchParamsMock = vi.hoisted(() => vi.fn(() => new URLSearchParams()))
const createPlayoffMock = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
  useSearchParams: () => searchParamsMock(),
}))

vi.mock("@/lib/playoffs/playoffClientApi", () => ({
  createPlayoffBracketChallengeClient: createPlayoffMock,
}))

describe("/brackets/leagues/new create page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    searchParamsMock.mockReturnValue(new URLSearchParams())
    createPlayoffMock.mockResolvedValue({
      challengeId: "challenge-nba",
      redirectUrl: "/brackets/leagues/challenge-nba",
    })
  })

  it("renders Create Pool form", () => {
    render(<NewBracketLeaguePage />)

    expect(screen.getByText("Create Bracket Challenge Pool")).toBeInTheDocument()
    expect(screen.getByTestId("bracket-create-form")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create Pool" })).toBeInTheDocument()
  })

  it("renders NBA sport preselected from query without auto-creating", () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("sport=nba&challengeType=playoff_challenge"))

    render(<NewBracketLeaguePage />)

    expect(screen.getByTestId("bracket-create-sport-NBA")).toHaveTextContent("NBA")
    expect(screen.getByText("Build a NBA Playoff Challenge pool.")).toBeInTheDocument()
    expect(createPlayoffMock).not.toHaveBeenCalled()
  })

  it("submits NBA playoff pools through the playoff challenge API and redirects", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams("sport=nba&challengeType=playoff_challenge"))
    render(<NewBracketLeaguePage />)

    fireEvent.change(screen.getByTestId("bracket-create-name-input"), {
      target: { value: "Friends NBA Pool" },
    })
    fireEvent.click(screen.getByTestId("bracket-create-submit-button"))

    await waitFor(() => {
      expect(createPlayoffMock).toHaveBeenCalledWith(expect.objectContaining({
        name: "Friends NBA Pool",
        sport: "nba",
        visibility: "private",
        maxUsers: 50,
        bracketsPerUser: 1,
        scoringStyle: "momentum",
        lockRule: "series_start",
        config: expect.objectContaining({
          includePlayIn: false,
          pickSpread: false,
          pickOverUnder: false,
          maxEntriesPerParticipant: 1,
        }),
      }))
      expect(pushMock).toHaveBeenCalledWith("/brackets/leagues/challenge-nba")
    })
  })

  it("shows safe server errors from playoff create", async () => {
    createPlayoffMock.mockRejectedValue(new Error("Playoff pool creation needs the latest database migration."))
    searchParamsMock.mockReturnValue(new URLSearchParams("sport=nba&challengeType=playoff_challenge"))
    render(<NewBracketLeaguePage />)

    fireEvent.change(screen.getByTestId("bracket-create-name-input"), {
      target: { value: "Friends NBA Pool" },
    })
    fireEvent.click(screen.getByTestId("bracket-create-submit-button"))

    expect(await screen.findByText("Playoff pool creation needs the latest database migration.")).toBeInTheDocument()
  })

  it("renders locked AF Commissioner preview and upgrade link", () => {
    render(<NewBracketLeaguePage />)

    expect(screen.getByTestId("af-commissioner-options")).toHaveTextContent("Locked Preview")
    expect(screen.getByTestId("af-commissioner-upgrade-link")).toHaveAttribute("href", "/pricing")
    expect(screen.getByTestId("af-commissioner-option-exact-series-score-picks")).toBeDisabled()
  })
})
