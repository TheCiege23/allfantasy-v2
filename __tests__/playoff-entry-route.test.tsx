import React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.hoisted(() => vi.fn())
const getPlayoffBracketViewMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/playoffs/playoffService", () => ({
  getPlayoffBracketView: getPlayoffBracketViewMock,
}))

vi.mock("@/components/brackets/playoffs/PlayoffBracketEntryShell", () => ({
  default: ({ initialView }: { initialView: { activeEntry: { id: string } } }) => (
    <div data-testid="playoff-entry-shell">entry-{initialView.activeEntry.id}</div>
  ),
}))

const playoffView = {
  challenge: {
    id: "challenge-1",
    sport: "nba",
    name: "NBA Playoff Pool",
  },
  participants: [],
  entries: [{ id: "entry-1", name: "Bracket 1", userId: "u1", pickCount: 0, isComplete: false, createdAt: new Date().toISOString() }],
  viewerUserId: "u1",
  activeEntry: { id: "entry-1", name: "Bracket 1", userId: "u1", pickCount: 0, isComplete: false, createdAt: new Date().toISOString() },
  picks: [],
  rounds: [],
  series: [],
}

describe("/brackets/leagues/[leagueId]/entries/[entryId]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
  })

  it("renders the entry shell when the entry belongs to the matching pool", async () => {
    getPlayoffBracketViewMock.mockResolvedValue(playoffView)
    const mod = await import("@/app/brackets/leagues/[leagueId]/entries/[entryId]/page")

    const element = await mod.default({ params: { leagueId: "challenge-1", entryId: "entry-1" } })
    render(element as React.ReactElement)

    expect(screen.getByTestId("playoff-entry-shell")).toHaveTextContent("entry-entry-1")
  })

  it("shows friendly not found when the entry does not match the pool request", async () => {
    getPlayoffBracketViewMock.mockResolvedValue({
      ...playoffView,
      activeEntry: { ...playoffView.activeEntry, id: "entry-2" },
    })
    const mod = await import("@/app/brackets/leagues/[leagueId]/entries/[entryId]/page")

    const element = await mod.default({ params: { leagueId: "challenge-1", entryId: "entry-1" } })
    render(element as React.ReactElement)

    expect(screen.getByText("Bracket entry not found")).toBeInTheDocument()
  })
})