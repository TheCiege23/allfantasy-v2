import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

const requireUserMock = vi.hoisted(() => vi.fn())
const managerAccessMock = vi.hoisted(() => vi.fn())
const hasAiMock = vi.hoisted(() => vi.fn())
const buildRecapMock = vi.hoisted(() => vi.fn())
const generateLinesMock = vi.hoisted(() => vi.fn())
const emitEventMock = vi.hoisted(() => vi.fn())
const getSettingsMock = vi.hoisted(() => vi.fn())
const challengeFindUniqueMock = vi.hoisted(() => vi.fn())

vi.mock("@/app/api/brackets/world-cup/_utils", () => ({
  requireWorldCupApiUser: requireUserMock,
  assertWorldCupManager: managerAccessMock,
  worldCupChallengeParamsSchema: z.object({ challengeId: z.string().min(1) }),
}))

vi.mock("@/lib/bracket-brain/bracketBrainAccess", () => ({
  userHasBracketBrainAi: hasAiMock,
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    worldCupBracketChallenge: {
      findUnique: challengeFindUniqueMock,
    },
  },
}))

vi.mock("@/lib/world-cup/worldCupCommissionerBrainService", () => ({
  buildWorldCupAiPoolRecapLines: buildRecapMock,
  generateAiWrappedLines: generateLinesMock,
  getWorldCupCommissionerBrainSnapshot: vi.fn(),
}))

vi.mock("@/lib/world-cup/worldCupBracketEventService", () => ({
  emitWorldCupBracketChatEvent: emitEventMock,
  getWorldCupCommissionerSettings: getSettingsMock,
}))

vi.mock("@/lib/world-cup/worldCupBracketSettingsService", () => ({
  isWorldCupBracketBrainEnabledForChallenge: () => true,
}))

function request(body: unknown) {
  return new Request("http://localhost/api/brackets/world-cup/c1/commissioner-brain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("World Cup commissioner AI recap route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireUserMock.mockResolvedValue({
      ok: true,
      user: { id: "user-1", email: "owner@example.com", name: "Owner" },
    })
    managerAccessMock.mockResolvedValue({ ok: true })
    hasAiMock.mockResolvedValue(true)
    challengeFindUniqueMock.mockResolvedValue({ sourcePayload: {} })
    buildRecapMock.mockResolvedValue([
      "Chimmy pool recap: Office Cup",
      "Finalized entries included: 1.",
      "Prediction and scoring complexity only.",
    ])
    generateLinesMock.mockResolvedValue(["Generated"])
    emitEventMock.mockResolvedValue({ ok: true })
    getSettingsMock.mockResolvedValue({
      enableSystemEvents: true,
      enableAiSummaries: true,
      enableUpsetAlerts: true,
      enableLeaderboardAlerts: true,
      enableChampionBustAlerts: true,
      enableLockReminders: true,
    })
  })

  it("previews a recap without posting a chat event", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/commissioner-brain/route")

    const res = await POST(request({ action: "preview_recap", tone: "serious" }), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json).toMatchObject({
      action: "preview_recap",
      posted: false,
      source: "deterministic_finalized_public",
    })
    expect(buildRecapMock).toHaveBeenCalledWith("c1", "serious")
    expect(emitEventMock).not.toHaveBeenCalled()
  })

  it("blocks recap generation for users without AI access", async () => {
    hasAiMock.mockResolvedValue(false)
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/commissioner-brain/route")

    const res = await POST(request({ action: "preview_recap", tone: "fun" }), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(402)
    expect(json.upgrade).toBe(true)
    expect(buildRecapMock).not.toHaveBeenCalled()
    expect(emitEventMock).not.toHaveBeenCalled()
  })

  it("posts a previewed recap as a public pool chat event", async () => {
    const lines = [
      "Chimmy pool recap: Office Cup",
      "Current leader: Finalized Entry with 20 points.",
      "Finalized entries included: 1.",
    ]
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/commissioner-brain/route")

    const res = await POST(request({ action: "post_recap", tone: "fun", lines }), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.posted).toBe(true)
    expect(emitEventMock).toHaveBeenCalledWith(expect.objectContaining({
      challengeId: "c1",
      eventTitle: "AI pool recap",
      eventBody: lines.join("\n"),
      isAiGenerated: true,
      metadata: expect.objectContaining({
        action: "post_recap",
        visibility: "public",
        messageType: "ai_recap",
        source: "deterministic_finalized_public",
      }),
    }))
  })
})
