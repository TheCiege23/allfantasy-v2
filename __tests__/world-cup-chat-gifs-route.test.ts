import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

const requireUserMock = vi.hoisted(() => vi.fn())
const memberAccessMock = vi.hoisted(() => vi.fn())
const searchGifsMock = vi.hoisted(() => vi.fn())
const isGifSearchConfiguredMock = vi.hoisted(() => vi.fn())
const getGifProviderNameMock = vi.hoisted(() => vi.fn())
const cacheFindUniqueMock = vi.hoisted(() => vi.fn())
const cacheUpsertMock = vi.hoisted(() => vi.fn())
const recordCallMock = vi.hoisted(() => vi.fn())

vi.mock("@/app/api/brackets/world-cup/_utils", () => ({
  requireWorldCupApiUser: requireUserMock,
  assertWorldCupChallengeMemberOrManager: memberAccessMock,
  worldCupChallengeParamsSchema: z.object({ challengeId: z.string().min(1) }),
}))

vi.mock("@/lib/rich-message/GIFIntegrationResolver", () => ({
  searchGifs: searchGifsMock,
  isGifSearchConfigured: isGifSearchConfiguredMock,
  getGifProviderName: getGifProviderNameMock,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    sportsDataCache: {
      findUnique: cacheFindUniqueMock,
      upsert: cacheUpsertMock,
    },
  },
}))

vi.mock("@/lib/workers/rate-limit-manager", () => ({
  rateLimitManager: {
    recordCall: recordCallMock,
  },
}))

function request(query = "goal") {
  return new Request(`http://localhost/api/brackets/world-cup/c1/chat?action=gifs&q=${encodeURIComponent(query)}`)
}

describe("World Cup chat GIF search route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireUserMock.mockResolvedValue({ ok: true, user: { id: "user-1", email: "u1@example.com" } })
    memberAccessMock.mockResolvedValue({ ok: true })
    isGifSearchConfiguredMock.mockReturnValue(true)
    getGifProviderNameMock.mockReturnValue("klipy")
    cacheFindUniqueMock.mockResolvedValue(null)
    cacheUpsertMock.mockResolvedValue({})
    recordCallMock.mockResolvedValue(undefined)
    searchGifsMock.mockResolvedValue([
      {
        id: "gif-1",
        url: "https://media.klipy.com/gifs/goal.gif",
        previewUrl: "https://media.klipy.com/gifs/goal.webp",
        provider: "klipy",
      },
    ])
  })

  it("blocks non-members from searching GIFs", async () => {
    memberAccessMock.mockResolvedValue({
      ok: false,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    })
    const { GET } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await GET(request(), { params: { challengeId: "c1" } })

    expect(res.status).toBe(403)
    expect(searchGifsMock).not.toHaveBeenCalled()
  })

  it("lets members search GIFs without exposing provider keys", async () => {
    const { GET } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await GET(request("goal<script>"), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(searchGifsMock).toHaveBeenCalledWith("goalscript", 12)
    expect(cacheUpsertMock).toHaveBeenCalled()
    expect(recordCallMock).toHaveBeenCalledWith("klipy", "world_cup:gifs", 200, expect.any(Number))
    expect(json.gifs).toEqual([
      {
        id: "gif-1",
        title: "GIF",
        previewUrl: "https://media.klipy.com/gifs/goal.webp",
        gifUrl: "https://media.klipy.com/gifs/goal.gif",
        width: 0,
        height: 0,
        provider: "klipy",
      },
    ])
    expect(JSON.stringify(json)).not.toMatch(/VITE_KLIPY_API|KLIPY_API_KEY|api_key|secret|token/i)
  })

  it("returns cached GIFs without calling the provider again", async () => {
    cacheFindUniqueMock.mockResolvedValue({
      expiresAt: new Date(Date.now() + 60_000),
      data: {
        gifs: [
          {
            id: "cached-1",
            title: "Cached",
            previewUrl: "https://media.klipy.com/cached.webp",
            gifUrl: "https://media.klipy.com/cached.gif",
            width: 0,
            height: 0,
            provider: "klipy",
          },
        ],
      },
    })
    const { GET } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await GET(request("goal"), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(searchGifsMock).not.toHaveBeenCalled()
    expect(json.cached).toBe(true)
    expect(json.gifs[0].id).toBe("cached-1")
    expect(recordCallMock).toHaveBeenCalledWith("klipy", "world_cup:gifs", 200, 0, { cached: true })
  })

  it("shows a graceful disabled state when no GIF provider is configured", async () => {
    isGifSearchConfiguredMock.mockReturnValue(false)
    const { GET } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await GET(request("goal"), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.disabled).toBe(true)
    expect(searchGifsMock).not.toHaveBeenCalled()
  })

  it("loads default World Cup GIFs when the query is empty", async () => {
    const { GET } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await GET(request(""), { params: { challengeId: "c1" } })

    expect(res.status).toBe(200)
    expect(searchGifsMock).toHaveBeenCalledWith("world cup soccer", 12)
  })
})
