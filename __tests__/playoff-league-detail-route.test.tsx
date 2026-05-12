import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect, beforeEach, vi } from "vitest"

const getServerSessionMock = vi.hoisted(() => vi.fn())
const getPlayoffBracketViewMock = vi.hoisted(() => vi.fn())
const redirectMock = vi.hoisted(() => vi.fn())
const bracketLeagueFindUniqueMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/playoffs/playoffService", () => ({
  getPlayoffBracketView: getPlayoffBracketViewMock,
}))

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    bracketLeague: {
      findUnique: bracketLeagueFindUniqueMock,
    },
  },
}))

vi.mock("@/components/brackets/playoffs/PlayoffBracketShell", () => ({
  default: ({ initialView }: { initialView: { challenge: { id: string } } }) => (
    <div data-testid="playoff-dashboard-shell">dashboard-{initialView.challenge.id}</div>
  ),
}))

const playoffView = {
  challenge: {
    id: "challenge-1",
    sport: "nba",
    name: "NBA Playoff Bracket",
  },
  participants: [{ userId: "u1", displayName: "User 1", entryCount: 1 }],
  entries: [{ id: "e1", name: "Bracket 1", userId: "u1", pickCount: 0, isComplete: false, createdAt: new Date().toISOString() }],
  viewerUserId: "u1",
  activeEntry: null,
  picks: [],
  rounds: [],
  series: [],
}

describe("/brackets/leagues/[leagueId] detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    bracketLeagueFindUniqueMock.mockResolvedValue(null)
  })

  it("renders dashboard when pool exists", async () => {
    getPlayoffBracketViewMock.mockResolvedValue(playoffView)
    const mod = await import("@/app/brackets/leagues/[leagueId]/page")

    const element = await mod.default({ params: { leagueId: "challenge-1" }, searchParams: {} })
    expect((element as React.ReactElement).props.initialView.challenge.id).toBe("challenge-1")
  })

  it("does not render create pool form on existing pool detail route", async () => {
    getPlayoffBracketViewMock.mockResolvedValue(playoffView)
    const mod = await import("@/app/brackets/leagues/[leagueId]/page")

    const element = await mod.default({ params: { leagueId: "challenge-1" }, searchParams: {} })
    render(element as React.ReactElement)
    expect(screen.queryByText("Create Bracket Challenge Pool")).not.toBeInTheDocument()
  })

  it("redirects to league dashboard for existing non-playoff pool", async () => {
    getPlayoffBracketViewMock.mockResolvedValue(null)
    bracketLeagueFindUniqueMock.mockResolvedValue({ id: "league-123" })
    const mod = await import("@/app/brackets/leagues/[leagueId]/page")

    await mod.default({ params: { leagueId: "league-123" }, searchParams: {} })

    expect(redirectMock).toHaveBeenCalledWith("/league/league-123")
  })

  it("shows friendly not-found state for missing pool", async () => {
    getPlayoffBracketViewMock.mockResolvedValue(null)
    bracketLeagueFindUniqueMock.mockResolvedValue(null)
    const mod = await import("@/app/brackets/leagues/[leagueId]/page")

    const element = await mod.default({ params: { leagueId: "missing-pool" }, searchParams: {} })
    render(element as React.ReactElement)
    expect(screen.getByText("Pool not found")).toBeInTheDocument()
  })
})
