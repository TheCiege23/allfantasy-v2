import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import NewBracketLeaguePage from "@/app/brackets/leagues/new/page"

const pushMock = vi.hoisted(() => vi.fn())
const backMock = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, back: backMock }),
  useSearchParams: () => new URLSearchParams(),
}))

describe("/brackets/leagues/new create page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("renders Create Pool form", () => {
    render(<NewBracketLeaguePage />)

    expect(screen.getByText("Create Bracket Challenge Pool")).toBeInTheDocument()
    expect(screen.getByTestId("bracket-create-form")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create Pool" })).toBeInTheDocument()
  })
})
