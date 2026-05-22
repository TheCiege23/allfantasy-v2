import { beforeEach, describe, expect, it, vi } from "vitest"

const requireUserMock = vi.hoisted(() => vi.fn())
const hasAiMock = vi.hoisted(() => vi.fn())
const findFirstMock = vi.hoisted(() => vi.fn())
const findManyMock = vi.hoisted(() => vi.fn())

vi.mock("@/app/api/brackets/world-cup/_utils", () => ({
  requireWorldCupApiUser: requireUserMock,
}))

vi.mock("@/lib/bracket-brain/bracketBrainAccess", () => ({
  userHasBracketBrainAi: hasAiMock,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    worldCupBracketEntry: {
      findFirst: findFirstMock,
      findMany: findManyMock,
    },
  },
}))

function request() {
  return new Request(
    "http://localhost/api/brackets/world-cup/c1/entries/e1/explain?action=uniqueness"
  )
}

const params = { params: { challengeId: "c1", entryId: "e1" } }

describe("GET /api/brackets/world-cup/[challengeId]/entries/[entryId]/uniqueness", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireUserMock.mockResolvedValue({
      ok: true,
      user: { id: "user-1", email: "owner@example.com" },
    })
    hasAiMock.mockResolvedValue(true)
    findFirstMock.mockResolvedValue({
      id: "e1",
      championTeamName: "Argentina",
      picks: [
        { round: "final", selectedTeamName: "Argentina" },
        { round: "semifinal", selectedTeamName: "Argentina" },
        { round: "semifinal", selectedTeamName: "France" },
      ],
    })
    findManyMock.mockResolvedValue([
      {
        id: "e-fin-1",
        championTeamName: "Brazil",
        picks: [
          { round: "final", selectedTeamName: "Brazil" },
          { round: "semifinal", selectedTeamName: "Brazil" },
          { round: "semifinal", selectedTeamName: "Argentina" },
        ],
      },
      {
        id: "e-fin-2",
        championTeamName: "Argentina",
        picks: [
          { round: "final", selectedTeamName: "Argentina" },
          { round: "semifinal", selectedTeamName: "Argentina" },
        ],
      },
      {
        id: "e-fin-3",
        championTeamName: "France",
        picks: [
          { round: "final", selectedTeamName: "France" },
          { round: "semifinal", selectedTeamName: "France" },
        ],
      },
    ])
  })

  it("returns 401 when unauthenticated", async () => {
    requireUserMock.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "UNAUTHENTICATED" }), {
        status: 401,
      }),
    })
    const { GET } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )

    const res = await GET(request() as any, params)
    expect(res.status).toBe(401)
    expect(findFirstMock).not.toHaveBeenCalled()
    expect(findManyMock).not.toHaveBeenCalled()
  })

  it("returns 404 when entry is not owned (silent non-owner)", async () => {
    findFirstMock.mockResolvedValue(null)
    const { GET } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )

    const res = await GET(request() as any, params)
    expect(res.status).toBe(404)
    expect(findManyMock).not.toHaveBeenCalled()
  })

  it("ownership query filters by id+challengeId+userId", async () => {
    const { GET } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )
    await GET(request() as any, params)

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "e1", challengeId: "c1", userId: "user-1" },
      })
    )
  })

  it("comparison query filters to finalized entries only (isComplete + submittedAt:not-null)", async () => {
    const { GET } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )
    await GET(request() as any, params)

    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          challengeId: "c1",
          isComplete: true,
          submittedAt: { not: null },
        },
      })
    )
  })

  it("returns aggregated champion + per-round distributions (counts only, no PII)", async () => {
    const { GET } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )

    const res = await GET(request() as any, params)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.ok).toBe(true)
    expect(body.finalizedEntryCount).toBe(3)

    // Champion distribution: Argentina=1, Brazil=1, France=1.
    expect(body.distributions.champion).toEqual(
      expect.arrayContaining([
        { teamName: "Argentina", count: 1 },
        { teamName: "Brazil", count: 1 },
        { teamName: "France", count: 1 },
      ])
    )

    // Final round: Argentina=1, Brazil=1, France=1.
    expect(body.distributions.final).toEqual(
      expect.arrayContaining([
        { teamName: "Argentina", count: 1 },
        { teamName: "Brazil", count: 1 },
        { teamName: "France", count: 1 },
      ])
    )

    // Semifinal: Brazil entry picked Brazil and Argentina; Argentina entry picked Argentina; France entry picked France.
    // So Argentina=2 (one per entry, dedup within entry), Brazil=1, France=1.
    const semis = body.distributions.semifinal
    const semiMap = new Map(semis.map((d: any) => [d.teamName, d.count]))
    expect(semiMap.get("Argentina")).toBe(2)
    expect(semiMap.get("Brazil")).toBe(1)
    expect(semiMap.get("France")).toBe(1)

    // Own picks returned for client-side comparison.
    expect(body.ownChampionTeamName).toBe("Argentina")
    expect(body.ownPicksByRound.final).toEqual(["Argentina"])
    expect(body.ownPicksByRound.semifinal).toEqual(
      expect.arrayContaining(["Argentina", "France"])
    )
  })

  it("response never contains other-user emails, user IDs, or entry IDs", async () => {
    const { GET } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )

    const res = await GET(request() as any, params)
    const body = await res.json()
    const responseText = JSON.stringify(body)

    expect(responseText).not.toMatch(/owner@example\.com/i)
    expect(responseText).not.toMatch(/\buser-1\b/i)
    // No raw entry IDs from finalized entries leak.
    expect(responseText).not.toMatch(/e-fin-1|e-fin-2|e-fin-3/i)
  })

  it("dedupes same-team picks within one entry per round", async () => {
    findManyMock.mockResolvedValue([
      {
        id: "e-fin-1",
        championTeamName: "Brazil",
        // Same entry picked Brazil multiple times in semifinal — should count once.
        picks: [
          { round: "semifinal", selectedTeamName: "Brazil" },
          { round: "semifinal", selectedTeamName: "Brazil" },
          { round: "semifinal", selectedTeamName: "Brazil" },
        ],
      },
      {
        id: "e-fin-2",
        championTeamName: "Argentina",
        picks: [{ round: "semifinal", selectedTeamName: "Argentina" }],
      },
      {
        id: "e-fin-3",
        championTeamName: "France",
        picks: [{ round: "semifinal", selectedTeamName: "France" }],
      },
    ])
    const { GET } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )

    const res = await GET(request() as any, params)
    const body = await res.json()

    const semis = body.distributions.semifinal
    const brazilEntry = semis.find((d: any) => d.teamName === "Brazil")
    expect(brazilEntry?.count).toBe(1) // dedupe within entry: 1 not 3
  })

  it("returns finalizedEntryCount: 0 when pool has no finalized entries", async () => {
    findManyMock.mockResolvedValue([])
    const { GET } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )

    const res = await GET(request() as any, params)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.finalizedEntryCount).toBe(0)
    expect(body.distributions.champion).toEqual([])
  })

  it("returns 400 when challengeId or entryId missing", async () => {
    const { GET } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )

    const res = await GET(request() as any, {
      params: { challengeId: "", entryId: "e1" },
    })
    expect(res.status).toBe(400)
  })
})
