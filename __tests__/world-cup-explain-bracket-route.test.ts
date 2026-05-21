import { beforeEach, describe, expect, it, vi } from "vitest"

const requireUserMock = vi.hoisted(() => vi.fn())
const hasAiMock = vi.hoisted(() => vi.fn())
const generateMock = vi.hoisted(() => vi.fn())

vi.mock("@/app/api/brackets/world-cup/_utils", () => ({
  requireWorldCupApiUser: requireUserMock,
}))

vi.mock("@/lib/bracket-brain/bracketBrainAccess", () => ({
  userHasBracketBrainAi: hasAiMock,
}))

vi.mock("@/lib/world-cup/worldCupExplainBracketService", () => ({
  generateWorldCupBracketExplanation: generateMock,
}))

function request() {
  return new Request(
    "http://localhost/api/brackets/world-cup/c1/entries/e1/explain",
    { method: "POST" }
  )
}

const params = { params: { challengeId: "c1", entryId: "e1" } }

describe("POST /api/brackets/world-cup/[challengeId]/entries/[entryId]/explain", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireUserMock.mockResolvedValue({
      ok: true,
      user: { id: "user-1", email: "owner@example.com", name: "Owner" },
    })
    hasAiMock.mockResolvedValue(true)
    generateMock.mockResolvedValue({
      ok: true,
      summary: "Bracket 1 is anchored around Argentina as your champion.",
      lines: [
        "Bracket 1 is anchored around Argentina as your champion.",
        "Style: chalk-leaning with one upset call.",
        "Recommendation: keep Argentina as your champion.",
      ],
      generative: true,
    })
  })

  it("returns 401 when unauthenticated", async () => {
    requireUserMock.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "UNAUTHENTICATED" }), {
        status: 401,
      }),
    })

    const { POST } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )

    const res = await POST(request() as any, params)

    expect(res.status).toBe(401)
    expect(hasAiMock).not.toHaveBeenCalled()
    expect(generateMock).not.toHaveBeenCalled()
  })

  it("returns 402 with upgrade flag when user lacks AF Pro", async () => {
    hasAiMock.mockResolvedValue(false)

    const { POST } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )

    const res = await POST(request() as any, params)
    const json = await res.json()

    expect(res.status).toBe(402)
    expect(json.upgrade).toBe(true)
    expect(json.hasBracketBrainAi).toBe(false)
    expect(generateMock).not.toHaveBeenCalled()
  })

  it("returns 404 when entry is not owned by user (silent non-owner via entry_not_found)", async () => {
    generateMock.mockResolvedValue({ ok: false, reason: "entry_not_found" })

    const { POST } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )

    const res = await POST(request() as any, params)
    const json = await res.json()

    expect(res.status).toBe(404)
    expect(json.error).toMatch(/Entry not found/i)
  })

  it("returns 500 with safe friendly message on internal error (no secret/error dump)", async () => {
    generateMock.mockResolvedValue({ ok: false, reason: "internal_error" })

    const { POST } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )

    const res = await POST(request() as any, params)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toMatch(/try again/i)
    // Critical: no provider/error details should leak through.
    expect(JSON.stringify(json)).not.toMatch(/OPENAI|stack|trace|prisma/i)
  })

  it("returns 200 with summary, lines, generative flag for Pro owner", async () => {
    const { POST } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )

    const res = await POST(request() as any, params)
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.summary).toMatch(/Argentina/)
    expect(json.lines).toHaveLength(3)
    expect(json.generative).toBe(true)
    // Owner gate: ensure userId is passed to service for the ownership check.
    expect(generateMock).toHaveBeenCalledWith({
      challengeId: "c1",
      entryId: "e1",
      userId: "user-1",
    })
  })

  it("response never contains emails or user IDs", async () => {
    const { POST } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )

    const res = await POST(request() as any, params)
    const json = await res.json()
    const responseText = JSON.stringify(json)

    expect(responseText).not.toMatch(/owner@example\.com/i)
    expect(responseText).not.toMatch(/user-1/i)
  })

  it("returns 400 when challengeId or entryId is missing from params", async () => {
    const { POST } = await import(
      "@/app/api/brackets/world-cup/[challengeId]/entries/[entryId]/explain/route"
    )

    const res = await POST(request() as any, {
      params: { challengeId: "", entryId: "e1" },
    })

    expect(res.status).toBe(400)
    expect(generateMock).not.toHaveBeenCalled()
  })
})
