import React from "react"
import { render, screen } from "@testing-library/react"
import { describe, it, expect, beforeEach, vi } from "vitest"

const getServerSessionMock = vi.hoisted(() => vi.fn())
const areBracketChallengesEnabledMock = vi.hoisted(() => vi.fn())
const getEnabledSportsMock = vi.hoisted(() => vi.fn())
const bracketLeagueMemberFindManyMock = vi.hoisted(() => vi.fn())
const playoffBracketChallengeFindManyMock = vi.hoisted(() => vi.fn())
const listUserWorldCupChallengesMock = vi.hoisted(() => vi.fn())
const resolvePlayoffCardHrefMock = vi.hoisted(() => vi.fn(({ sport }: any) => `/brackets/playoffs/create?sport=${sport}`))
const resolveMyPoolCardHrefMock = vi.hoisted(() => vi.fn(({ poolId }: any) => `/brackets/leagues/${poolId}`))

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
vi.mock("@/lib/world-cup", () => ({
  listUserWorldCupChallenges: listUserWorldCupChallengesMock,
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
    <div data-testid="my-pools-tab">
      <span>pools:{pools.length}</span>
      {pools.map((pool) => (
        <a key={pool.id} href={pool.href} data-testid={`my-pool-${pool.id}`}>
          {pool.name}
        </a>
      ))}
    </div>
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
vi.mock("@/lib/playoffs/playoffHomeRouting", () => ({
  resolveMyPoolCardHref: resolveMyPoolCardHrefMock,
  resolvePlayoffCardHref: resolvePlayoffCardHrefMock,
  resolvePlayoffCardMode: () => "create",
}))

describe("app/brackets/page — P2021 playoff table missing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    areBracketChallengesEnabledMock.mockResolvedValue(true)
    getEnabledSportsMock.mockResolvedValue(["NFL", "NBA", "NHL"])
    bracketLeagueMemberFindManyMock.mockResolvedValue([])
    playoffBracketChallengeFindManyMock.mockResolvedValue([])
    listUserWorldCupChallengesMock.mockResolvedValue([])
    resolvePlayoffCardHrefMock.mockImplementation(({ sport }: any) => `/brackets/playoffs/create?sport=${sport}`)
  })

  it("renders the page when session lookup throws", async () => {
    getServerSessionMock.mockRejectedValue(new Error("session crashed"))

    const mod = await import("@/app/brackets/page")
    const element = await (mod.default as () => Promise<React.ReactElement>)()
    render(element)

    expect(screen.getByTestId("bracket-home-tabs")).toBeInTheDocument()
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

  it("renders the page when bracketLeagueMember.findMany throws P2021", async () => {
    const p2021 = Object.assign(
      new Error("The table `public.bracket_league_members` does not exist in the current database."),
      { code: "P2021" }
    )
    bracketLeagueMemberFindManyMock.mockRejectedValue(p2021)
    playoffBracketChallengeFindManyMock.mockResolvedValue([])

    const mod = await import("@/app/brackets/page")
    const element = await (mod.default as () => Promise<React.ReactElement>)()
    render(element)

    expect(screen.getByTestId("bracket-home-tabs")).toBeInTheDocument()
    expect(screen.getByTestId("my-pools-tab")).toHaveTextContent("pools:0")
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

  it("dedupes duplicate pool rows before rendering My Pools", async () => {
    bracketLeagueMemberFindManyMock.mockResolvedValue([
      {
        league: {
          id: "league-1",
          name: "NBA Finals Pool",
          scoringRules: { challengeType: "playoff_challenge", bracketType: null },
          tournament: { sport: "NBA" },
          _count: { members: 4, entries: 12 },
        },
      },
      {
        league: {
          id: "league-1",
          name: "NBA Finals Pool Duplicate",
          scoringRules: { challengeType: "playoff_challenge", bracketType: null },
          tournament: { sport: "NBA" },
          _count: { members: 1, entries: 1 },
        },
      },
    ])

    const mod = await import("@/app/brackets/page")
    const element = await (mod.default as () => Promise<React.ReactElement>)()
    render(element)

    expect(screen.getByTestId("my-pools-tab")).toHaveTextContent("pools:1")
  })

  it("routes the World Cup main button to the current World Cup hub", async () => {
    const mod = await import("@/app/brackets/page")
    const element = await (mod.default as () => Promise<React.ReactElement>)()
    render(element)

    expect(screen.getByTestId("world-cup-bracket-card")).toHaveAttribute("href", "/brackets/world-cup")
  })

  it("routes active World Cup challenge cards to the current World Cup challenge page", async () => {
    listUserWorldCupChallengesMock.mockResolvedValue([
      {
        id: "wc-current-1",
        name: "Current World Cup Challenge",
        participantCount: 8,
      },
    ])

    const mod = await import("@/app/brackets/page")
    const element = await (mod.default as () => Promise<React.ReactElement>)()
    render(element)

    expect(screen.getByTestId("my-pool-wc-current-1")).toHaveAttribute(
      "href",
      "/brackets/world-cup/wc-current-1",
    )
  })

  it("does not render migrated legacy World Cup pools as active clickable cards", async () => {
    bracketLeagueMemberFindManyMock.mockResolvedValue([
      {
        league: {
          id: "legacy-world-cup-league",
          name: "World Cup Bracket Challenge",
          scoringRules: { challengeType: "playoff_challenge", bracketType: null },
          tournament: { name: "FIFA World Cup", sport: "SOCCER" },
          _count: { members: 1, entries: 0 },
        },
      },
    ])

    const mod = await import("@/app/brackets/page")
    const element = await (mod.default as () => Promise<React.ReactElement>)()
    render(element)

    expect(screen.getByTestId("my-pools-tab")).toHaveTextContent("pools:0")
    expect(screen.queryByTestId("my-pool-legacy-world-cup-league")).not.toBeInTheDocument()
  })

  it("keeps NBA and NHL playoff pool cards on the active My Pools list", async () => {
    playoffBracketChallengeFindManyMock.mockResolvedValue([
      {
        id: "nba-playoff-1",
        name: "NBA Playoff Pool",
        sport: "NBA",
        ownerUserId: "u1",
        entries: [{ userId: "u1" }, { userId: "u2" }],
        _count: { entries: 2 },
      },
      {
        id: "nhl-playoff-1",
        name: "NHL Playoff Pool",
        sport: "NHL",
        ownerUserId: "u3",
        entries: [{ userId: "u1" }],
        _count: { entries: 1 },
      },
    ])

    const mod = await import("@/app/brackets/page")
    const element = await (mod.default as () => Promise<React.ReactElement>)()
    render(element)

    expect(screen.getByTestId("my-pool-nba-playoff-1")).toHaveAttribute(
      "href",
      "/brackets/leagues/nba-playoff-1",
    )
    expect(screen.getByTestId("my-pool-nhl-playoff-1")).toHaveAttribute(
      "href",
      "/brackets/leagues/nhl-playoff-1",
    )
  })

  it("renders when bracketLeagueMember.findMany throws Prisma validation error", async () => {
    const prismaValidation = Object.assign(
      new Error("Unknown field `name` for select statement on model `AppUser`"),
      { name: "PrismaClientValidationError" }
    )
    bracketLeagueMemberFindManyMock.mockRejectedValue(prismaValidation)

    const mod = await import("@/app/brackets/page")
    const element = await (mod.default as () => Promise<React.ReactElement>)()
    render(element)

    expect(screen.getByTestId("bracket-home-tabs")).toBeInTheDocument()
  })

  it("renders when playoffBracketChallenge.findMany throws Prisma validation error", async () => {
    const prismaValidation = Object.assign(
      new Error("Unknown field `name` for select statement on model `AppUser`"),
      { name: "PrismaClientValidationError" }
    )
    playoffBracketChallengeFindManyMock.mockRejectedValue(prismaValidation)

    const mod = await import("@/app/brackets/page")
    const element = await (mod.default as () => Promise<React.ReactElement>)()
    render(element)

    expect(screen.getByTestId("bracket-home-tabs")).toBeInTheDocument()
  })

  it("renders when playoff lookup fails with not-a-function style error", async () => {
    playoffBracketChallengeFindManyMock.mockRejectedValue(new TypeError("findMany is not a function"))

    const mod = await import("@/app/brackets/page")
    const element = await (mod.default as () => Promise<React.ReactElement>)()
    render(element)

    expect(screen.getByTestId("bracket-home-tabs")).toBeInTheDocument()
  })

  it("renders when resolvePlayoffCardHref throws", async () => {
    resolvePlayoffCardHrefMock.mockImplementation(() => {
      throw new TypeError("(0 , r.resolvePlayoffCardHref) is not a function")
    })

    const mod = await import("@/app/brackets/page")
    const element = await (mod.default as () => Promise<React.ReactElement>)()
    render(element)

    expect(screen.getByTestId("bracket-home-tabs")).toBeInTheDocument()
  })

  it("renders when playoff query throws non-prisma runtime error", async () => {
    playoffBracketChallengeFindManyMock.mockRejectedValue(new Error("connection refused"))

    const mod = await import("@/app/brackets/page")
    const element = await (mod.default as () => Promise<React.ReactElement>)()
    render(element)

    expect(screen.getByTestId("bracket-home-tabs")).toBeInTheDocument()
  })
})
