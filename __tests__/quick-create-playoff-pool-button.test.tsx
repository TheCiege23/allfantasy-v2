import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import QuickCreatePlayoffPoolButton from "@/components/bracket/QuickCreatePlayoffPoolButton"

const pushMock = vi.hoisted(() => vi.fn())
const createPlayoffMock = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("@/lib/playoffs/playoffClientApi", () => ({
  createPlayoffBracketChallengeClient: createPlayoffMock,
}))

describe("QuickCreatePlayoffPoolButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createPlayoffMock.mockResolvedValue({
      challengeId: "challenge-nba",
      redirectUrl: "/brackets/leagues/challenge-nba",
    })
  })

  it("quick creates an NBA playoff pool with default config", async () => {
    render(<QuickCreatePlayoffPoolButton sport="nba" label="Quick Create NBA Pool" />)

    fireEvent.click(screen.getByTestId("quick-create-nba-pool-button"))

    await waitFor(() => {
      expect(createPlayoffMock).toHaveBeenCalledWith(expect.objectContaining({
        name: "NBA Playoff Pool",
        sport: "nba",
        visibility: "private",
        maxUsers: 50,
        bracketsPerUser: 1,
        scoringStyle: "standard",
        lockRule: "series_start",
        config: expect.objectContaining({
          visibility: "private",
          maxEntriesPerParticipant: 1,
          includePlayIn: false,
          pickSeriesScore: false,
          pickSpread: false,
          pickOverUnder: false,
        }),
      }))
      expect(pushMock).toHaveBeenCalledWith("/brackets/leagues/challenge-nba")
    })
  })

  it("quick creates an NHL playoff pool with default config", async () => {
    createPlayoffMock.mockResolvedValue({
      challengeId: "challenge-nhl",
      redirectUrl: "/brackets/leagues/challenge-nhl",
    })
    render(<QuickCreatePlayoffPoolButton sport="nhl" label="Quick Create NHL Pool" />)

    fireEvent.click(screen.getByTestId("quick-create-nhl-pool-button"))

    await waitFor(() => {
      expect(createPlayoffMock).toHaveBeenCalledWith(expect.objectContaining({
        name: "NHL Playoff Pool",
        sport: "nhl",
        visibility: "private",
        maxUsers: 50,
        bracketsPerUser: 1,
      }))
      expect(pushMock).toHaveBeenCalledWith("/brackets/leagues/challenge-nhl")
    })
  })

  it("shows safe server errors from quick create", async () => {
    createPlayoffMock.mockRejectedValue(new Error("Playoff pool creation failed. Please try again."))
    render(<QuickCreatePlayoffPoolButton sport="nba" label="Quick Create NBA Pool" />)

    fireEvent.click(screen.getByTestId("quick-create-nba-pool-button"))

    expect(await screen.findByTestId("quick-create-nba-error")).toHaveTextContent("Playoff pool creation failed. Please try again.")
  })
})
