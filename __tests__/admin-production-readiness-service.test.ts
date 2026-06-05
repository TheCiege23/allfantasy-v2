import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

const prismaMock = vi.hoisted(() => ({
  visitorLocation: {
    groupBy: vi.fn(),
  },
}))

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}))

describe("AdminProductionReadinessService", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.DATABASE_URL
    delete process.env.NEXTAUTH_SECRET
    delete process.env.AUTH_SECRET
    delete process.env.ADMIN_EMAILS
    delete process.env.ADMIN_SESSION_SECRET
    prismaMock.visitorLocation.groupBy.mockResolvedValue([])
  })

  it("reports configured/missing env groups without exposing values", async () => {
    process.env.DATABASE_URL = "postgres://secret-host/db"
    process.env.NEXTAUTH_SECRET = "super-secret"
    process.env.ADMIN_EMAILS = "founder@example.com"

    const { getAdminProductionReadiness } = await import("@/lib/admin-dashboard/AdminProductionReadinessService")
    const result = await getAdminProductionReadiness()

    const database = result.env.find((row) => row.id === "database")
    const admin = result.env.find((row) => row.id === "admin")

    expect(database).toMatchObject({ status: "configured", required: "DATABASE_URL" })
    expect(admin).toMatchObject({ status: "missing" })
    expect(JSON.stringify(result)).not.toContain("postgres://secret-host/db")
    expect(JSON.stringify(result)).not.toContain("super-secret")
  })

  it("reads World Cup cron coverage from vercel.json", async () => {
    const { getAdminProductionReadiness } = await import("@/lib/admin-dashboard/AdminProductionReadinessService")
    const result = await getAdminProductionReadiness()
    const worldCup = result.crons.find((row) => row.id === "world-cup-official")

    expect(worldCup?.status).toBe("configured")
    expect(worldCup?.configuredPaths.some((row) => row.includes("job=live"))).toBe(true)
  })
})
