import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  getEmailCenterStatus: vi.fn(),
  runAdminEmailAction: vi.fn(),
}))

vi.mock("@/lib/adminAuth", () => ({
  requireAdmin: mocks.requireAdmin,
}))

vi.mock("@/lib/admin-dashboard/AdminEmailCenterService", () => ({
  EMAIL_AUDIENCES: [{ id: "all", label: "All", description: "All users" }],
  getEmailCenterStatus: mocks.getEmailCenterStatus,
  runAdminEmailAction: mocks.runAdminEmailAction,
}))

describe("/api/admin/email/broadcast", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("blocks non-admin users", async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ ok: false, res: new Response("Forbidden", { status: 403 }) })
    const { GET } = await import("@/app/api/admin/email/broadcast/route")

    const response = await GET()

    expect(response.status).toBe(403)
    expect(mocks.getEmailCenterStatus).not.toHaveBeenCalled()
  })

  it("previews an admin broadcast without sending", async () => {
    mocks.requireAdmin.mockResolvedValueOnce({ ok: true, user: { email: "founder@example.com" } })
    mocks.runAdminEmailAction.mockResolvedValueOnce({
      ok: true,
      mode: "preview",
      message: "Preview only.",
      preview: { audience: "all", recipientCount: 2, cappedAt: 500, sample: [], excludedOptOuts: 1 },
      sent: 0,
      failed: 0,
    })
    const { POST } = await import("@/app/api/admin/email/broadcast/route")

    const response = await POST(
      new Request("http://localhost/api/admin/email/broadcast", {
        method: "POST",
        body: JSON.stringify({ mode: "preview", audience: "all", subject: "World Cup launch", body: "World Cup pools are live." }),
      })
    )

    expect(response.status).toBe(200)
    expect(mocks.runAdminEmailAction).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "preview", adminEmail: "founder@example.com" })
    )
  })
})
