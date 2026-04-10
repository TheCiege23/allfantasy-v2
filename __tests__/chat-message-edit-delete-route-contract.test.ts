import { beforeEach, describe, expect, it, vi } from "vitest"

const resolvePlatformUserMock = vi.fn()
const editPlatformThreadMessageMock = vi.fn()
const deletePlatformThreadMessageMock = vi.fn()

vi.mock("@/lib/platform/current-user", () => ({
  resolvePlatformUser: resolvePlatformUserMock,
}))

vi.mock("@/lib/platform/chat-service", () => ({
  editPlatformThreadMessage: editPlatformThreadMessageMock,
  deletePlatformThreadMessage: deletePlatformThreadMessageMock,
}))

vi.mock("@/lib/chat-core", () => ({
  isLeagueVirtualRoom: () => false,
  getLeagueIdFromVirtualRoom: () => null,
}))

describe("chat message edit/delete route contract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("edits a platform message", async () => {
    const { PATCH } = await import("../app/api/shared/chat/threads/[threadId]/messages/[messageId]/route")

    resolvePlatformUserMock.mockResolvedValueOnce({ appUserId: "u1" })
    editPlatformThreadMessageMock.mockResolvedValueOnce({ id: "m1", body: "Updated body" })

    const req = new Request("http://localhost/api/shared/chat/threads/t1/messages/m1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: "Updated body" }),
    })
    const res = await PATCH(req as any, { params: { threadId: "t1", messageId: "m1" } } as any)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toMatchObject({ status: "ok", message: { id: "m1" } })
    expect(editPlatformThreadMessageMock).toHaveBeenCalledWith("u1", "t1", "m1", "Updated body")
  })

  it("soft-deletes a platform message", async () => {
    const { DELETE } = await import("../app/api/shared/chat/threads/[threadId]/messages/[messageId]/route")

    resolvePlatformUserMock.mockResolvedValueOnce({ appUserId: "u1" })
    deletePlatformThreadMessageMock.mockResolvedValueOnce(true)

    const req = new Request("http://localhost/api/shared/chat/threads/t1/messages/m1", {
      method: "DELETE",
    })
    const res = await DELETE(req as any, { params: { threadId: "t1", messageId: "m1" } } as any)

    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ status: "ok" })
    expect(deletePlatformThreadMessageMock).toHaveBeenCalledWith("u1", "t1", "m1")
  })
})
