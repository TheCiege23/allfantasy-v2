import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect, beforeEach, vi } from "vitest"

const getServerSessionMock = vi.hoisted(() => vi.fn())
const areBracketChallengesEnabledMock = vi.hoisted(() => vi.fn())
const getEnabledSportsMock = vi.hoisted(() => vi.fn())
const bracketLeagueMemberFindManyMock = vi.hoisted(() => vi.fn())
const playoffBracketChallengeFindManyMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({ getServerSession: getServerSessionMock }))
vi.mock("@/lib/auth", () => ({ authOptions: {} }))
vi.mock("@/lib/feature-toggle", () => ({
  areBracketChallengesEnabled: areBracketChallengesEnabledMock,
  getEnabledSports: getEnabledSportsMock,
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    bracketLeagueMember: { findMany: bracketLeagueMemberFindManyMock },
    playoffBracketChallenge: { findMany: playoffBracketChallengeFindManyMock },
  },
}))
vi.mock("@/lib/auth/PostAuthIntentRouter", () => ({
  buildLoginHrefWithIntent: (p: string) => `/login?next=${p}`,
  buildSignupHrefWithIntent: (p: string) => `/signup?next=${p}`,
}))
vi.mock("@/components/bracket/BracketShell", () => ({
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock("@/components/bracket/BracketHomeTabs", () => ({
  default: () => <div data-testid="bracket-home-tabs" />,
}))
vi.mock("@/components/bracket/MyPoolsTab", () => ({
  default: ({ pools }: { pools: any[] }) => (
    <div data-testid="my-pools-tab">pools:{pools.length}</div>
  ),
}))
vi.mock("@/components/bracket/BracketAICoachTab", () => ({ default: () => null }))
vi.mock("@/components/bracket/CreatePoolTab", () => ({ default: () => null }))
vi.mock("@/components/bracket/PlayoffChallengeTab", () => ({ default: () => null }))
vi.mock("@/components/bracket/JoinPoolTab", () => ({ default: () => null }))
vi.mock("@/components/bracket/StandingsTab", () => ({ default: () => null }))
vi.mock("@/components/bracket/BracketHistoryTab", () => ({ default: () => null }))
vi.mock("@/components/engagement/EngagementEventTracker", () => ({ default: () => null }))
vi.mock("next/image", () => ({ default: (p: any) => <img {...p} /> }))
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: any) => <a href={href} {...rest}>{children}</a> }))
vi.mock("@/lib/sport-scope", () => ({ SUPPORTED_SPORTS: ["NFL", "NBA", "NHL"] }))
vi.mock("@/lib/bracket-challenge", () => ({
  resolveBracketChallengeLabel: () => "Bracket",
  resolveBracketSportUI: () => ({ badge: "NBA", shortLabel: "NBA", label: "NBA" }),
}))
vi.mock("@/lib/playoffs", () => ({
  resolveMyPoolCardHref: ({ poolId }: any) => `/brackets/leagues/${poolId}`,
  resolvePlayoffCardHref: ({ sport }: any) => `/brackets/playoffs/create?sport=${sport}`,
  resolvePlayoffCardMode: () => "create",
}))

describe("app/brackets/page — P2021 playoff table missing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    areBracketChallengesEnabledMock.mockResolvedValue(true)
    getEnabledSportsMock.mockResolvedValue(["NFL", "NBA", "NHL"])
    bracketLeagueMemberFindManyMock.mockResolvedValue([])
  })

  it("renders the page without playoff My Pools when P2021 is thrown", async () => {
    const p2021 = Object.assign(
      new Error("The table `public.playoff_bracket_challenges` does not exist in the current database."),
      { code: "P2021" }
    )
    playoffBracketChallengeFindManyMock.mockRejectedValue(p2021)

    const mod = await import("@/app/brackets/page")
    const element = await (mod.default as () => Promise<React.ReactElement>)()
    render(element)

    // Page still renders bracket home tabs without crashing
    expect(screen.getByTestId("bracket-home-tabs")).toBeInTheDocument()
  })

  it("renders with empty playoff pools when P2021 is thrown", async () => {
    const p2021 = Object.assign(new Error("does not exist in the current database"), { code: "P2021" })
    playoffBracketChallengeFindManyMock.mockRejectedValue(p2021)

    const mod = await import("@/app/brackets/page")
    const element = await (mod.default as () => Promise<React.ReactElement>)()
    render(element)

    // My Pools tab renders with 0 pools (graceful empty)
    expect(screen.getByTestId("my-pools-tab")).toHaveTextContent("pools:0")
  })

  it("re-throws non-P2021 errors from playoffBracketChallenge.findMany", async () => {
    playoffBracketChallengeFindManyMock.mockRejectedValue(new Error("connection refused"))

    const mod = await import("@/app/brackets/page")
    await expect((mod.default as () => Promise<React.ReactElement>)()).rejects.toThrow("connection refused")
  })
})
