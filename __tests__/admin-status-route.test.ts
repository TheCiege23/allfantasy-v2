import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getAdminAccessState: vi.fn(),
}))

vi.mock("@/lib/adminAuth", () => ({
  getAdminAccessState: mocks.getAdminAccessState,
}))

describe("admin status route", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it("returns 401 for unauthenticated users", async () => {
    mocks.getAdminAccessState.mockResolvedValueOnce({ status: "unauthenticated", source: "none" })

    const { GET } = await import("@/app/api/admin/status/route")
    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(401)
    expect(body).toMatchObject({ authenticated: false, admin: false })
  })

  it("returns 403 for authenticated non-admin users", async () => {
    mocks.getAdminAccessState.mockResolvedValueOnce({
      status: "forbidden",
      source: "app_session",
      user: { id: "user-1", email: "member@example.com", username: "MemberOne" },
    })

    const { GET } = await import("@/app/api/admin/status/route")
    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(403)
    expect(body).toMatchObject({
      authenticated: true,
      admin: false,
      user: { id: "user-1", username: "MemberOne", emailMasked: "me***@example.com" },
    })
    expect(JSON.stringify(body)).not.toContain("member@example.com")
  })

  it("returns masked admin status for admins", async () => {
    mocks.getAdminAccessState.mockResolvedValueOnce({
      status: "admin",
      source: "app_session",
      user: { id: "admin-1", email: "founder@example.com", username: "TheCiege26", role: "admin" },
    })

    const { GET } = await import("@/app/api/admin/status/route")
    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({
      authenticated: true,
      admin: true,
      source: "app_session",
      user: { id: "admin-1", username: "TheCiege26", emailMasked: "fo***@example.com" },
    })
    expect(JSON.stringify(body)).not.toContain("founder@example.com")
  })
})
