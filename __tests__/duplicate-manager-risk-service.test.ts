import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  appUserFindUnique: vi.fn(),
  userProfileFindFirst: vi.fn(),
  identitySignalFindMany: vi.fn(),
  userSubscriptionFindFirst: vi.fn(),
  rosterFindMany: vi.fn(),
  householdExceptionFindFirst: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: { findUnique: mocks.appUserFindUnique },
    userProfile: { findFirst: mocks.userProfileFindFirst },
    identitySignal: { findMany: mocks.identitySignalFindMany },
    userSubscription: { findFirst: mocks.userSubscriptionFindFirst },
    roster: { findMany: mocks.rosterFindMany },
    householdException: { findFirst: mocks.householdExceptionFindFirst },
  },
}))

import { assessLeagueJoinRisk, canonicalUserPair } from "@/lib/identity/DuplicateManagerRiskService"

const JOINER = "user-joiner"
const SUSPECT = "user-suspect"
const LEAGUE = "league-1"

function appUser(id: string, overrides: Partial<{ email: string; username: string; displayName: string | null }> = {}) {
  return {
    id,
    email: overrides.email ?? `${id}@example.com`,
    username: overrides.username ?? id,
    displayName: overrides.displayName ?? null,
  }
}

describe("canonicalUserPair", () => {
  it("always orders the pair the same way regardless of argument order", () => {
    expect(canonicalUserPair("b", "a")).toEqual(["a", "b"])
    expect(canonicalUserPair("a", "b")).toEqual(["a", "b"])
  })
})

describe("DuplicateManagerRiskService.assessLeagueJoinRisk", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.householdExceptionFindFirst.mockResolvedValue(null)
    mocks.userSubscriptionFindFirst.mockResolvedValue(null)
    mocks.userProfileFindFirst.mockResolvedValue(null)
  })

  function setupUsers(joinerOverrides = {}, suspectOverrides = {}) {
    mocks.appUserFindUnique.mockImplementation(({ where }: { where: { id: string } }) => {
      if (where.id === JOINER) return Promise.resolve(appUser(JOINER, joinerOverrides))
      if (where.id === SUSPECT) return Promise.resolve(appUser(SUSPECT, suspectOverrides))
      return Promise.resolve(null)
    })
  }

  it("returns low risk with no comparisons when the league has no other managers", async () => {
    setupUsers()
    mocks.rosterFindMany.mockResolvedValue([])
    mocks.identitySignalFindMany.mockResolvedValue([])

    const result = await assessLeagueJoinRisk({ leagueId: LEAGUE, joiningUserId: JOINER })
    expect(result.riskLevel).toBe("low")
    expect(result.comparisons).toHaveLength(0)
  })

  it("flags high risk when the joiner shares both an IP hash and a device id with an existing manager", async () => {
    setupUsers()
    mocks.rosterFindMany.mockResolvedValue([{ id: "roster-1", platformUserId: SUSPECT, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }])
    mocks.identitySignalFindMany.mockImplementation(({ where }: { where: { userId: string } }) => {
      if (where.userId === JOINER) return Promise.resolve([{ ipHash: "ip-hash-shared", userAgentHash: null, deviceId: "device-shared" }])
      if (where.userId === SUSPECT) return Promise.resolve([{ ipHash: "ip-hash-shared", userAgentHash: null, deviceId: "device-shared" }])
      return Promise.resolve([])
    })

    const result = await assessLeagueJoinRisk({ leagueId: LEAGUE, joiningUserId: JOINER })
    expect(result.riskLevel).toBe("high")
    expect(result.comparisons).toHaveLength(1)
    expect(result.comparisons[0].suspectAppUserId).toBe(SUSPECT)
    expect(result.comparisons[0].reasons.some((r) => /network/i.test(r))).toBe(true)
    expect(result.comparisons[0].reasons.some((r) => /device/i.test(r))).toBe(true)
  })

  it("flags medium risk for a gmail dot/plus-trick email match alone", async () => {
    setupUsers({ email: "j.o.i.n.e.r+work@gmail.com" }, { email: "joiner@gmail.com" })
    mocks.rosterFindMany.mockResolvedValue([{ id: "roster-1", platformUserId: SUSPECT, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }])
    mocks.identitySignalFindMany.mockResolvedValue([])

    const result = await assessLeagueJoinRisk({ leagueId: LEAGUE, joiningUserId: JOINER })
    expect(result.riskLevel).toBe("medium")
    expect(result.comparisons[0].reasons.some((r) => /email/i.test(r))).toBe(true)
  })

  it("flags high risk when a shared payment method combines with a similar display name", async () => {
    setupUsers(
      { email: "alice.manager@example.com", displayName: "Alice Manager" },
      { email: "completely-different@example.net", displayName: "Alice Manageer" }
    )
    mocks.rosterFindMany.mockResolvedValue([{ id: "roster-1", platformUserId: SUSPECT, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }])
    mocks.identitySignalFindMany.mockResolvedValue([])
    mocks.userSubscriptionFindFirst.mockImplementation(({ where }: { where: { userId: string } }) => {
      return Promise.resolve({ stripeCustomerId: "cus_shared_123" })
    })

    const result = await assessLeagueJoinRisk({ leagueId: LEAGUE, joiningUserId: JOINER })
    expect(result.riskLevel).toBe("high")
    expect(result.comparisons[0].reasons.some((r) => /payment/i.test(r))).toBe(true)
    expect(result.comparisons[0].reasons.some((r) => /name/i.test(r))).toBe(true)
  })

  it("downgrades an otherwise-high-risk match to low when a HouseholdException covers the pair", async () => {
    setupUsers()
    mocks.rosterFindMany.mockResolvedValue([{ id: "roster-1", platformUserId: SUSPECT, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }])
    mocks.identitySignalFindMany.mockImplementation(({ where }: { where: { userId: string } }) => {
      return Promise.resolve([{ ipHash: "ip-hash-shared", userAgentHash: null, deviceId: "device-shared" }])
    })
    mocks.householdExceptionFindFirst.mockResolvedValue({ id: "exc-1" })

    const result = await assessLeagueJoinRisk({ leagueId: LEAGUE, joiningUserId: JOINER })
    expect(result.riskLevel).toBe("low")
    expect(result.comparisons[0].householdExempt).toBe(true)
  })

  it("ignores orphan AI rosters and the joiner's own roster if present", async () => {
    setupUsers()
    mocks.rosterFindMany.mockResolvedValue([{ id: "roster-self", platformUserId: JOINER, createdAt: new Date() }])
    mocks.identitySignalFindMany.mockResolvedValue([])

    const result = await assessLeagueJoinRisk({ leagueId: LEAGUE, joiningUserId: JOINER })
    expect(result.comparisons).toHaveLength(0)
  })
})
