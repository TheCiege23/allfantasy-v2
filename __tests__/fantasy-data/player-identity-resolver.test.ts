/**
 * Player identity resolver unit tests.
 */
import { describe, it, expect, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    playerIdentityMap: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { beforeEach } from "vitest"
import {
  resolvePlayerIdentity,
  resolvePlayerIdentityBatch,
} from "@/lib/fantasy-data/playerIdentityResolver"
import { prisma } from "@/lib/prisma"

const mockFindFirst = (prisma as any).playerIdentityMap.findFirst as ReturnType<typeof vi.fn>
const mockFindMany = (prisma as any).playerIdentityMap.findMany as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockFindFirst.mockResolvedValue(null)
  mockFindMany.mockResolvedValue([])
})

const MOCK_ROW = {
  canonicalName: "Patrick Mahomes",
  normalizedName: "patrick mahomes",
  sleeperId: "4046",
  fantasyCalcId: "mahomes-2018",
  rollingInsightsId: "ri-mahomes",
  apiSportsId: "api-123",
  mflId: "mfl-456",
  espnId: "espn-3139477",
  fleaflickerId: "ff-789",
  clearSportsId: "cs-abc",
}

describe("resolvePlayerIdentity", () => {
  it("resolves by sleeperId", async () => {
    mockFindFirst.mockResolvedValueOnce(MOCK_ROW)
    const result = await resolvePlayerIdentity({ by: "sleeperId", value: "4046" })
    expect(result?.canonicalName).toBe("Patrick Mahomes")
    expect(result?.sleeperId).toBe("4046")
    expect(mockFindFirst).toHaveBeenCalledWith({ where: { sleeperId: "4046" } })
  })

  it("resolves by name", async () => {
    mockFindFirst.mockResolvedValueOnce(MOCK_ROW)
    const result = await resolvePlayerIdentity({ by: "name", value: "Patrick Mahomes" })
    expect(result?.canonicalName).toBe("Patrick Mahomes")
  })

  it("normalizes name lookup (lowercase, strip punctuation)", async () => {
    mockFindFirst.mockResolvedValueOnce(MOCK_ROW)
    await resolvePlayerIdentity({ by: "name", value: "Patrick Mahomes II" })
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { normalizedName: "patrick mahomes ii" },
    })
  })

  it("returns null when not found", async () => {
    mockFindFirst.mockResolvedValueOnce(null)
    const result = await resolvePlayerIdentity({ by: "sleeperId", value: "unknown-999" })
    expect(result).toBeNull()
  })

  it("returns null on DB error (never throws)", async () => {
    mockFindFirst.mockRejectedValueOnce(new Error("DB down"))
    const result = await resolvePlayerIdentity({ by: "sleeperId", value: "4046" })
    expect(result).toBeNull()
  })

  it("returns all provider IDs", async () => {
    mockFindFirst.mockResolvedValueOnce(MOCK_ROW)
    const result = await resolvePlayerIdentity({ by: "espnId", value: "espn-3139477" })
    expect(result?.espnId).toBe("espn-3139477")
    expect(result?.rollingInsightsId).toBe("ri-mahomes")
    expect(result?.fantasyCalcId).toBe("mahomes-2018")
  })
})

describe("resolvePlayerIdentityBatch", () => {
  it("returns a map keyed by normalizedName", async () => {
    mockFindMany.mockResolvedValueOnce([MOCK_ROW])
    const map = await resolvePlayerIdentityBatch(["Patrick Mahomes"])
    expect(map.get("patrick mahomes")?.canonicalName).toBe("Patrick Mahomes")
  })

  it("returns empty map for empty input", async () => {
    const map = await resolvePlayerIdentityBatch([])
    expect(map.size).toBe(0)
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it("returns empty map on DB error (never throws)", async () => {
    mockFindMany.mockRejectedValueOnce(new Error("DB error"))
    const map = await resolvePlayerIdentityBatch(["Patrick Mahomes"])
    expect(map.size).toBe(0)
  })
})
