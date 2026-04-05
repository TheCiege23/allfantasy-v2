import { beforeEach, describe, expect, it, vi } from "vitest"

import { createMockNextRequest } from "@/__tests__/helpers/createMockNextRequest"
const getServerSessionMock = vi.hoisted(() => vi.fn())
const getSharePublishLogsMock = vi.hoisted(() => vi.fn())
const publishShareToPlatformMock = vi.hoisted(() => vi.fn())
const retrySharePublishMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/social-sharing/SocialPublishService", () => ({
  getSharePublishLogs: getSharePublishLogsMock,
  publishShareToPlatform: publishShareToPlatformMock,
  retrySharePublish: retrySharePublishMock,
}))

describe("Share publish route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "user-1" } })
  })

  it("returns logs for GET with shareId", async () => {
    getSharePublishLogsMock.mockResolvedValueOnce([{ id: "log-1", platform: "x", status: "success" }])

    const { GET } = await import("@/app/api/share/publish/route")
    const req = createMockNextRequest("http://localhost/api/share/publish?shareId=share-1")
    const res = await GET(req)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({
      logs: [{ id: "log-1", platform: "x", status: "success" }],
    })
    expect(getSharePublishLogsMock).toHaveBeenCalledWith("share-1", "user-1")
  })

  it("publishes and returns latest logs for POST publish action", async () => {
    publishShareToPlatformMock.mockResolvedValueOnce({
      platform: "x",
      status: "success",
      logId: "log-2",
      message: "Published",
    })
    getSharePublishLogsMock.mockResolvedValueOnce([{ id: "log-2", platform: "x", status: "success" }])

    const { POST } = await import("@/app/api/share/publish/route")
    const req = createMockNextRequest("http://localhost/api/share/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "publish", shareId: "share-1", platform: "x" }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(publishShareToPlatformMock).toHaveBeenCalledWith("share-1", "x", "user-1")
    await expect(res.json()).resolves.toMatchObject({
      platform: "x",
      status: "success",
      logs: [{ id: "log-2", platform: "x", status: "success" }],
    })
  })

  it("retries by logId for POST retry action", async () => {
    retrySharePublishMock.mockResolvedValueOnce({
      platform: "x",
      status: "success",
      logId: "log-3",
      message: "Retry queued",
    })

    const { POST } = await import("@/app/api/share/publish/route")
    const req = createMockNextRequest("http://localhost/api/share/publish", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "retry", logId: "log-1" }),
    })
    const res = await POST(req)

    expect(res.status).toBe(200)
    expect(retrySharePublishMock).toHaveBeenCalledWith("log-1", "user-1")
    await expect(res.json()).resolves.toMatchObject({
      platform: "x",
      status: "success",
      logId: "log-3",
    })
  })
})
