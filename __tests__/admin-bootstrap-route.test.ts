import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  appUserFindFirst: vi.fn(),
  appUserUpdate: vi.fn(),
  appUserCreate: vi.fn(),
  bcryptHash: vi.fn(),
  signAdminSessionCookie: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    appUser: {
      findFirst: mocks.appUserFindFirst,
      update: mocks.appUserUpdate,
      create: mocks.appUserCreate,
    },
  },
}))

vi.mock("bcryptjs", () => ({
  default: { hash: mocks.bcryptHash },
  hash: mocks.bcryptHash,
}))

vi.mock("@/lib/adminSession", () => ({
  signAdminSessionCookie: mocks.signAdminSessionCookie,
}))

describe("admin bootstrap route", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.ADMIN_BOOTSTRAP_ENABLED
    delete process.env.ADMIN_BOOTSTRAP_EMAIL
    delete process.env.ADMIN_BOOTSTRAP_PASSWORD
    delete process.env.ADMIN_BOOTSTRAP_USERNAME
    delete process.env.ADMIN_BOOTSTRAP_DISPLAY_NAME
    mocks.bcryptHash.mockResolvedValue("hashed-bootstrap-password")
    mocks.signAdminSessionCookie.mockReturnValue("signed-admin-session")
  })

  it("is unavailable unless explicitly enabled", async () => {
    const { POST } = await import("@/app/api/admin/bootstrap/route")

    const res = await POST(
      new Request("http://localhost/api/admin/bootstrap", {
        method: "POST",
        body: JSON.stringify({ email: "founder@example.com", password: "long-secret-password" }),
      })
    )

    expect(res.status).toBe(404)
    expect(mocks.appUserFindFirst).not.toHaveBeenCalled()
  })

  it("hashes the bootstrap password and signs an admin session when enabled", async () => {
    process.env.ADMIN_BOOTSTRAP_ENABLED = "true"
    process.env.ADMIN_BOOTSTRAP_EMAIL = "Founder@Example.com"
    process.env.ADMIN_BOOTSTRAP_PASSWORD = "long-secret-password"
    mocks.appUserFindFirst.mockResolvedValueOnce({ id: "user-1", username: "TheCiege26" })
    mocks.appUserUpdate.mockResolvedValueOnce({ id: "user-1", username: "TheCiege26" })

    const { POST } = await import("@/app/api/admin/bootstrap/route")
    const res = await POST(
      new Request("http://localhost/api/admin/bootstrap", {
        method: "POST",
        body: JSON.stringify({ email: "founder@example.com", password: "long-secret-password" }),
      })
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ ok: true, userId: "user-1", username: "TheCiege26", next: "/admin" })
    expect(mocks.bcryptHash).toHaveBeenCalledWith("long-secret-password", 12)
    expect(mocks.appUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ passwordHash: "hashed-bootstrap-password" }),
      })
    )
    expect(mocks.signAdminSessionCookie).toHaveBeenCalledWith(
      expect.objectContaining({ authenticated: true, email: "founder@example.com", role: "admin" })
    )
    expect(res.headers.get("set-cookie")).toContain("admin_session=signed-admin-session")
  })

  it("rejects wrong bootstrap credentials without touching users", async () => {
    process.env.ADMIN_BOOTSTRAP_ENABLED = "true"
    process.env.ADMIN_BOOTSTRAP_EMAIL = "founder@example.com"
    process.env.ADMIN_BOOTSTRAP_PASSWORD = "long-secret-password"

    const { POST } = await import("@/app/api/admin/bootstrap/route")
    const res = await POST(
      new Request("http://localhost/api/admin/bootstrap", {
        method: "POST",
        body: JSON.stringify({ email: "founder@example.com", password: "wrong-password" }),
      })
    )

    expect(res.status).toBe(401)
    expect(mocks.appUserUpdate).not.toHaveBeenCalled()
    expect(mocks.appUserCreate).not.toHaveBeenCalled()
  })
})
