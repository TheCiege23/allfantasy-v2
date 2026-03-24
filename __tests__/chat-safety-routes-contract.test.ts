import { beforeEach, describe, expect, it, vi } from "vitest"

const resolvePlatformUserMock = vi.fn()
const submitMessageReportForUserMock = vi.fn()
const submitUserReportForUserMock = vi.fn()
const getPlatformChatThreadsMock = vi.fn()
const createPlatformThreadMock = vi.fn()
const resolveConversationSafetyForUserMock = vi.fn()

vi.mock("@/lib/platform/current-user", () => ({
  resolvePlatformUser: resolvePlatformUserMock,
}))

vi.mock("@/lib/moderation", () => ({
  submitMessageReportForUser: submitMessageReportForUserMock,
  submitUserReportForUser: submitUserReportForUserMock,
  resolveConversationSafetyForUser: resolveConversationSafetyForUserMock,
}))

vi.mock("@/lib/platform/chat-service", () => ({
  getPlatformChatThreads: getPlatformChatThreadsMock,
  createPlatformThread: createPlatformThreadMock,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: {
      findMany: vi.fn(),
    },
  },
}))

describe("chat safety route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("submits message reports through moderation service", async () => {
    const { POST } = await import("@/app/api/shared/chat/report/message/route")
    resolvePlatformUserMock.mockResolvedValueOnce({ appUserId: "user-1" })
    submitMessageReportForUserMock.mockResolvedValueOnce({ ok: true, reportId: "rep-message-1" })

    const req = new Request("http://localhost/api/shared/chat/report/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: "msg-1", threadId: "thread-1", reason: "spam" }),
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ status: "ok", reportId: "rep-message-1" })
    expect(submitMessageReportForUserMock).toHaveBeenCalledWith({
      reporterUserId: "user-1",
      messageId: "msg-1",
      threadId: "thread-1",
      reason: "spam",
    })
  })

  it("submits user reports through moderation service", async () => {
    const { POST } = await import("@/app/api/shared/chat/report/user/route")
    resolvePlatformUserMock.mockResolvedValueOnce({ appUserId: "user-1" })
    submitUserReportForUserMock.mockResolvedValueOnce({ ok: true, reportId: "rep-user-1" })

    const req = new Request("http://localhost/api/shared/chat/report/user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedUserId: "user-2", reason: "harassment" }),
    })
    const res = await POST(req as any)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ status: "ok", reportId: "rep-user-1" })
    expect(submitUserReportForUserMock).toHaveBeenCalledWith({
      reporterUserId: "user-1",
      reportedUserId: "user-2",
      reason: "harassment",
    })
  })

  it("filters thread list through safety resolver", async () => {
    const { GET } = await import("@/app/api/shared/chat/threads/route")
    resolvePlatformUserMock.mockResolvedValueOnce({ appUserId: "user-1" })
    getPlatformChatThreadsMock.mockResolvedValueOnce([{ id: "dm-1", threadType: "dm" }])
    resolveConversationSafetyForUserMock.mockResolvedValueOnce({
      threads: [{ id: "group-1", threadType: "group" }],
      blockedUserIds: ["user-2"],
    })

    const res = await GET()
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({
      status: "ok",
      threads: [{ id: "group-1", threadType: "group" }],
    })
    expect(resolveConversationSafetyForUserMock).toHaveBeenCalledWith("user-1", [{ id: "dm-1", threadType: "dm" }])
  })
})
