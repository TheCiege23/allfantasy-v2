import { beforeEach, describe, expect, it, vi } from "vitest"

const resolvePlatformUserMock = vi.fn()
const searchPlatformThreadMessagesMock = vi.fn()

vi.mock("@/lib/platform/current-user", () => ({
  resolvePlatformUser: resolvePlatformUserMock,
}))

vi.mock("@/lib/platform/chat-service", () => ({
  searchPlatformThreadMessages: searchPlatformThreadMessagesMock,
}))

vi.mock("@/lib/chat-core", () => ({
  isLeagueVirtualRoom: () => false,
  getLeagueIdFromVirtualRoom: () => null,
}))

describe("chat search route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns matched platform thread messages", async () => {
    const { GET } = await import("../app/api/shared/chat/threads/[threadId]/search/route")

    resolvePlatformUserMock.mockResolvedValueOnce({ appUserId: "u1" })
    searchPlatformThreadMessagesMock.mockResolvedValueOnce([
      {
        id: "m1",
        threadId: "thread-1",
        body: "Trade offer accepted",
      },
    ])

    const req = new Request("http://localhost/api/shared/chat/threads/thread-1/search?q=trade")
    const res = await GET(req as any, { params: { threadId: "thread-1" } } as any)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      status: "ok",
      query: "trade",
      messages: [{ id: "m1" }],
    })
    expect(searchPlatformThreadMessagesMock).toHaveBeenCalledWith("u1", "thread-1", "trade", 25)
  })
})
