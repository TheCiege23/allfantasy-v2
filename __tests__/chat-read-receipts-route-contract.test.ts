import { beforeEach, describe, expect, it, vi } from "vitest"

const resolvePlatformUserMock = vi.fn()
const getThreadReadReceiptsMock = vi.fn()
const markPlatformThreadReadMock = vi.fn()

vi.mock("@/lib/platform/current-user", () => ({
  resolvePlatformUser: resolvePlatformUserMock,
}))

vi.mock("@/lib/platform/chat-service", () => ({
  getThreadReadReceipts: getThreadReadReceiptsMock,
  markPlatformThreadRead: markPlatformThreadReadMock,
}))

vi.mock("@/lib/chat-core", () => ({
  isLeagueVirtualRoom: () => false,
  getLeagueIdFromVirtualRoom: () => null,
  getVirtualThreadReadReceipts: () => [],
  markVirtualThreadRead: () => undefined,
}))

describe("chat read receipts route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns read receipts for a platform thread", async () => {
    const { GET } = await import("../app/api/shared/chat/threads/[threadId]/read-receipts/route")

    resolvePlatformUserMock.mockResolvedValueOnce({ appUserId: "u1" })
    getThreadReadReceiptsMock.mockResolvedValueOnce([
      { userId: "u1", username: "alpha", displayName: "Alpha", lastReadAt: "2026-04-08T00:00:00.000Z" },
    ])

    const req = new Request("http://localhost/api/shared/chat/threads/t1/read-receipts")
    const res = await GET(req as any, { params: { threadId: "t1" } } as any)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ status: "ok", receipts: [{ userId: "u1" }] })
  })

  it("marks thread as read and returns updated receipts", async () => {
    const { POST } = await import("../app/api/shared/chat/threads/[threadId]/read-receipts/route")

    resolvePlatformUserMock.mockResolvedValueOnce({ appUserId: "u1" })
    markPlatformThreadReadMock.mockResolvedValueOnce(true)
    getThreadReadReceiptsMock.mockResolvedValueOnce([
      { userId: "u1", username: "alpha", displayName: "Alpha", lastReadAt: "2026-04-08T00:00:05.000Z" },
    ])

    const req = new Request("http://localhost/api/shared/chat/threads/t1/read-receipts", {
      method: "POST",
    })
    const res = await POST(req as any, { params: { threadId: "t1" } } as any)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ status: "ok", receipts: [{ userId: "u1" }] })
    expect(markPlatformThreadReadMock).toHaveBeenCalledWith("u1", "t1")
  })
})
