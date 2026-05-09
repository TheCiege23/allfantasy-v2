import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { worldCupBracketSettingsPatchSchema } from "@/lib/world-cup/worldCupBracketSettingsSchema"
import {
  assertPositiveScoringValues,
  worldCupPublicPicksEarlyGloballyAllowed,
} from "@/lib/world-cup/worldCupBracketSettingsService"

const findUnique = vi.fn()
const challengeUpdate = vi.fn()
const scoringUpdate = vi.fn()

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: async (fn: (tx: unknown) => Promise<void>) => {
      const tx = {
        worldCupBracketChallenge: {
          findUnique,
          update: challengeUpdate,
        },
        worldCupBracketScoringProfile: {
          update: scoringUpdate,
          create: vi.fn(async () => ({ id: "new-profile" })),
        },
      }
      await fn(tx)
    },
    worldCupBracketCommissionerSettings: {
      upsert: vi.fn(async () => ({})),
      findUnique: vi.fn(async () => null),
      update: vi.fn(async () => ({})),
    },
  },
}))

vi.mock("@/lib/world-cup/worldCupBracketEventService", () => ({
  ensureWorldCupCommissionerSettings: vi.fn(async () => ({})),
  getWorldCupCommissionerSettings: vi.fn(async () => ({
    enableSystemEvents: true,
    enableAiSummaries: false,
    enableUpsetAlerts: true,
    enableLeaderboardAlerts: true,
    enableChampionBustAlerts: true,
    enableLockReminders: true,
  })),
  updateWorldCupCommissionerSettings: vi.fn(async () => ({})),
}))


describe("World Cup bracket settings validation", () => {
  beforeEach(() => {
    findUnique.mockReset()
    challengeUpdate.mockReset()
    scoringUpdate.mockReset()
  })

  it("schema rejects maxParticipants above 100", () => {
    const r = worldCupBracketSettingsPatchSchema.safeParse({ maxParticipants: 101 })
    expect(r.success).toBe(false)
  })

  it("schema rejects maxEntriesPerParticipant above 5", () => {
    const r = worldCupBracketSettingsPatchSchema.safeParse({ maxEntriesPerParticipant: 6 })
    expect(r.success).toBe(false)
  })

  it("assertPositiveScoringValues rejects non-positive numbers", () => {
    expect(() => assertPositiveScoringValues({ roundOf32Points: 0 })).toThrow()
    expect(() => assertPositiveScoringValues({ championBonusPoints: -1 })).toThrow()
  })

  it("applyPatch rejects bracketBrainEnabled without AF Pro before touching prisma", async () => {
    vi.resetModules()
    const { applyWorldCupBracketSettingsPatch } = await import(
      "@/lib/world-cup/worldCupBracketSettingsService"
    )
    await expect(
      applyWorldCupBracketSettingsPatch({
        challengeId: "c1",
        userHasAfPro: false,
        isAdmin: false,
        patch: { bracketBrainEnabled: true },
      })
    ).rejects.toThrow(/AF Pro/)
  })

  it("applyPatch rejects enableAiSummaries without AF Pro", async () => {
    vi.resetModules()
    const { applyWorldCupBracketSettingsPatch } = await import(
      "@/lib/world-cup/worldCupBracketSettingsService"
    )
    await expect(
      applyWorldCupBracketSettingsPatch({
        challengeId: "c1",
        userHasAfPro: false,
        isAdmin: true,
        patch: { commissioner: { enableAiSummaries: true } },
      })
    ).rejects.toThrow(/AF Pro/)
  })

  it("applyPatch allows Bracket Brain when user has AF Pro", async () => {
    findUnique.mockResolvedValueOnce({
      id: "c1",
      sourcePayload: { leagueSettings: { bracketBrainEnabled: false } },
      scoringProfileId: "sp1",
    })
    challengeUpdate.mockResolvedValueOnce({})
    scoringUpdate.mockResolvedValueOnce({})

    vi.resetModules()
    const { applyWorldCupBracketSettingsPatch } = await import(
      "@/lib/world-cup/worldCupBracketSettingsService"
    )

    await applyWorldCupBracketSettingsPatch({
      challengeId: "c1",
      userHasAfPro: true,
      isAdmin: false,
      patch: { bracketBrainEnabled: true },
    })

    expect(challengeUpdate).toHaveBeenCalled()
  })

  it("applyPatch rejects always public picks without admin or env gate", async () => {
    vi.resetModules()
    const { applyWorldCupBracketSettingsPatch } = await import(
      "@/lib/world-cup/worldCupBracketSettingsService"
    )
    await expect(
      applyWorldCupBracketSettingsPatch({
        challengeId: "c1",
        userHasAfPro: true,
        isAdmin: false,
        patch: { showPublicPicks: "always" },
      })
    ).rejects.toThrow(/platform approval/)
  })

  it("merges leagueSettings without dropping unrelated keys on name change", async () => {
    findUnique.mockResolvedValueOnce({
      id: "c1",
      sourcePayload: {
        leagueSettings: { scoringStyle: "standard", commissionerNote: "keep" },
        simulation: { enabled: true },
      },
      scoringProfileId: "sp1",
    })
    challengeUpdate.mockResolvedValueOnce({})
    scoringUpdate.mockResolvedValueOnce({})

    vi.resetModules()
    const { applyWorldCupBracketSettingsPatch } = await import(
      "@/lib/world-cup/worldCupBracketSettingsService"
    )

    await applyWorldCupBracketSettingsPatch({
      challengeId: "c1",
      userHasAfPro: true,
      isAdmin: true,
      patch: { name: "Renamed Cup" },
    })

    const updateArg = challengeUpdate.mock.calls[0]?.[0]
    const payload = updateArg?.data?.sourcePayload as Record<string, unknown>
    expect(payload?.simulation).toEqual({ enabled: true })
    const ls = payload?.leagueSettings as Record<string, unknown>
    expect(ls?.commissionerNote).toBe("keep")
  })
})

describe("World Cup public picks env gate helper", () => {
  const prev = process.env.WORLD_CUP_PUBLIC_PICKS_BEFORE_LOCK

  afterEach(() => {
    process.env.WORLD_CUP_PUBLIC_PICKS_BEFORE_LOCK = prev
  })

  it("earlyPublicPicksAllowed reads env", () => {
    process.env.WORLD_CUP_PUBLIC_PICKS_BEFORE_LOCK = "true"
    expect(worldCupPublicPicksEarlyGloballyAllowed()).toBe(true)
    process.env.WORLD_CUP_PUBLIC_PICKS_BEFORE_LOCK = "false"
    expect(worldCupPublicPicksEarlyGloballyAllowed()).toBe(false)
  })
})
