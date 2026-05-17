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
        sport: "nba",
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
})
