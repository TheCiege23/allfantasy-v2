import { beforeEach, describe, expect, it, vi } from "vitest"

const getServerSessionMock = vi.hoisted(() => vi.fn())
const userProfileFindUniqueMock = vi.hoisted(() => vi.fn())
const legacyUserFindUniqueMock = vi.hoisted(() => vi.fn())
const legacyImportJobFindFirstMock = vi.hoisted(() => vi.fn())

vi.mock("next-auth", () => ({
  getServerSession: getServerSessionMock,
}))

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: userProfileFindUniqueMock,
    },
    legacyUser: {
      findUnique: legacyUserFindUniqueMock,
    },
    legacyImportJob: {
      findFirst: legacyImportJobFindFirstMock,
    },
  },
}))

describe("Legacy import status route contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getServerSessionMock.mockResolvedValue({ user: { id: "u1" } })
    userProfileFindUniqueMock.mockResolvedValue({
      sleeperUsername: null,
      sleeperLinkedAt: null,
      sleeperVerifiedAt: null,
    })
    legacyUserFindUniqueMock.mockResolvedValue(null)
    legacyImportJobFindFirstMock.mockResolvedValue(null)
  })

  it("requires authentication", async () => {
    getServerSessionMock.mockResolvedValueOnce(null)
    const { GET } = await import("@/app/api/user/legacy-import-status/route")
    const res = await GET()

    expect(res.status).toBe(401)
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" })
  })

  it("returns placeholders when sleeper is not linked", async () => {
    const { GET } = await import("@/app/api/user/legacy-import-status/route")
    const res = await GET()

    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      sleeperUsername: string | null
      providers: Record<string, { linked: boolean; available: boolean; importStatus: string | null }>
    }
    expect(data.sleeperUsername).toBeNull()
    expect(data.providers.sleeper).toMatchObject({
      linked: false,
      available: true,
      importStatus: null,
    })
    expect(data.providers.yahoo).toMatchObject({
      linked: false,
      available: false,
      importStatus: null,
    })
  })

  it("returns sleeper import failure details for retry rendering", async () => {
    userProfileFindUniqueMock.mockResolvedValueOnce({
      sleeperUsername: "SleeperUser",
      sleeperLinkedAt: new Date("2026-01-01T00:00:00.000Z"),
      sleeperVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
    })
    legacyUserFindUniqueMock.mockResolvedValueOnce({ id: "legacy_u1" })
    legacyImportJobFindFirstMock.mockResolvedValueOnce({
      status: "failed",
      progress: 50,
      completedAt: null,
      createdAt: new Date("2026-02-01T00:00:00.000Z"),
      error: "Provider timeout",
    })

    const { GET } = await import("@/app/api/user/legacy-import-status/route")
    const res = await GET()
    expect(res.status).toBe(200)
    const data = (await res.json()) as {
      sleeperUsername: string | null
      providers: Record<string, { linked: boolean; available: boolean; importStatus: string | null; error?: string; lastJobAt?: string }>
    }

    expect(data.sleeperUsername).toBe("@sleeperuser")
    expect(data.providers.sleeper).toMatchObject({
      linked: true,
      available: true,
      importStatus: "failed",
      error: "Provider timeout",
    })
    expect(typeof data.providers.sleeper.lastJobAt).toBe("string")
  })
})
