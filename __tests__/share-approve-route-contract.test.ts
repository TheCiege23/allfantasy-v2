import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.hoisted(() => vi.fn())
const shareableMomentFindFirstMock = vi.hoisted(() => vi.fn())
const shareableMomentUpdateMock = vi.hoisted(() => vi.fn())
const autoPublishApprovedShareMock = vi.hoisted(() => vi.fn())
const getSharePublishLogsMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    shareableMoment: {
      findFirst: shareableMomentFindFirstMock,
      update: shareableMomentUpdateMock,
    },
  },
}))

vi.mock("@/lib/social-sharing/SocialPublishService", () => ({
  autoPublishApprovedShare: autoPublishApprovedShareMock,
  getSharePublishLogs: getSharePublishLogsMock,
}))

describe("Share approve route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns unauthorized when session is missing", async () => {
    getServerSessionMock.mockResolvedValueOnce(null)

    const { POST } = await import("@/app/api/share/[shareId]/approve/route")
    const req = new Request("http://localhost/api/share/share-1/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approved: true }),
    })
    const res = await POST(req, { params: Promise.resolve({ shareId: "share-1" }) })
    expect(res.status).toBe(401)
  })

  it("approves and triggers optional auto-publish", async () => {
    getServerSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    shareableMomentFindFirstMock.mockResolvedValueOnce({
      id: "share-1",
      userId: "user-1",
      metadata: { context: { leagueName: "Alpha" } },
    })
    shareableMomentUpdateMock.mockResolvedValueOnce({ id: "share-1" })
    autoPublishApprovedShareMock.mockResolvedValueOnce([
      { platform: "x", status: "success", logId: "log-1" },
    ])
    getSharePublishLogsMock.mockResolvedValueOnce([{ id: "log-1", status: "success" }])

    const { POST } = await import("@/app/api/share/[shareId]/approve/route")
    const req = new Request("http://localhost/api/share/share-1/approve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ approved: true }),
    })
    const res = await POST(req, { params: Promise.resolve({ shareId: "share-1" }) })

    expect(res.status).toBe(200)
    expect(autoPublishApprovedShareMock).toHaveBeenCalledWith("share-1", "user-1")
    await expect(res.json()).resolves.toMatchObject({
      shareId: "share-1",
      approved: true,
      autoPublishResults: [{ platform: "x", status: "success" }],
      logs: [{ id: "log-1", status: "success" }],
    })
  })
})
