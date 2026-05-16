import React from "react"
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.hoisted(() => vi.fn())
const getPlayoffBracketViewMock = vi.hoisted(() => vi.fn())
const bracketLeagueFindUniqueMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/playoffs/playoffService", () => ({
  getPlayoffBracketView: getPlayoffBracketViewMock,
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bracketLeague: { findUnique: bracketLeagueFindUniqueMock },
  },
}))
vi.mock("@/components/brackets/playoffs/PlayoffBracketShell", () => ({
  default: () => <div data-testid="playoff-bracket-shell" />,
}))
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

describe("app/brackets/leagues/[leagueId] migration warning", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    getPlayoffBracketViewMock.mockResolvedValue(null)
    bracketLeagueFindUniqueMock.mockResolvedValue({ id: "legacy-world-cup-league" })
  })

  it("still shows the migrated pool warning when a legacy bracket league route is accessed directly", async () => {
    const mod = await import("@/app/brackets/leagues/[leagueId]/page")
    const element = await (mod.default as any)({
      params: { leagueId: "legacy-world-cup-league" },
      searchParams: {},
    })
    render(element)

    expect(screen.getByText("This pool has been migrated")).toBeInTheDocument()
    expect(
      screen.getByText(/This bracket pool is no longer accessible via this route/i),
    ).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Back to Brackets/i })).toHaveAttribute("href", "/brackets")
  })
})
