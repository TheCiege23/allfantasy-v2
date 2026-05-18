import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

const requireUserMock = vi.hoisted(() => vi.fn())
const memberAccessMock = vi.hoisted(() => vi.fn())
const searchGifsMock = vi.hoisted(() => vi.fn())

vi.mock("@/app/api/brackets/world-cup/_utils", () => ({
  requireWorldCupApiUser: requireUserMock,
  assertWorldCupChallengeMemberOrManager: memberAccessMock,
  worldCupChallengeParamsSchema: z.object({ challengeId: z.string().min(1) }),
}))

vi.mock("@/lib/rich-message/GIFIntegrationResolver", () => ({
  searchGifs: searchGifsMock,
}))

function request(query = "goal") {
  return new Request(`http://localhost/api/brackets/world-cup/c1/chat/gifs?q=${encodeURIComponent(query)}`)
}

describe("World Cup chat GIF search route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireUserMock.mockResolvedValue({ ok: true, user: { id: "user-1", email: "u1@example.com" } })
    memberAccessMock.mockResolvedValue({ ok: true })
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
    const { GET } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/gifs/route")

    const res = await GET(request(), { params: { challengeId: "c1" } })

    expect(res.status).toBe(403)
    expect(searchGifsMock).not.toHaveBeenCalled()
  })

  it("lets members search GIFs without exposing provider keys", async () => {
    const { GET } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/gifs/route")

    const res = await GET(request("goal<script>"), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(searchGifsMock).toHaveBeenCalledWith("goalscript", 12)
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
})
