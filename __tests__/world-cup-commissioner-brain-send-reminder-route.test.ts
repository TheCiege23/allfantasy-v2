import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

const requireUserMock = vi.hoisted(() => vi.fn())
const managerAccessMock = vi.hoisted(() => vi.fn())
const hasAiMock = vi.hoisted(() => vi.fn())
const buildIncompleteDetailedMock = vi.hoisted(() => vi.fn())
const buildBroadcastMock = vi.hoisted(() => vi.fn())
const generateLinesMock = vi.hoisted(() => vi.fn())
const emitEventMock = vi.hoisted(() => vi.fn())

vi.mock("@/app/api/brackets/world-cup/_utils", () => ({
  requireWorldCupApiUser: requireUserMock,
  assertWorldCupManager: managerAccessMock,
  worldCupChallengeParamsSchema: z.object({ challengeId: z.string().min(1) }),
}))

vi.mock("@/lib/bracket-brain/bracketBrainAccess", () => ({
  userHasBracketBrainAi: hasAiMock,
}))

vi.mock("@/lib/world-cup/worldCupCommissionerBrainService", () => ({
  buildIncompleteBracketReminderDetailedLines: buildIncompleteDetailedMock,
  buildPoolBroadcastReminderLines: buildBroadcastMock,
  generateAiWrappedLines: generateLinesMock,
}))

vi.mock("@/lib/world-cup/worldCupBracketEventService", () => ({
  emitWorldCupBracketChatEvent: emitEventMock,
}))

vi.mock("@/lib/world-cup/worldCupBracketEventIdempotency", () => ({
  worldCupIdempotencyKeys: {
    lockReminder: (challengeId: string, key: string) => `lock-reminder:${challengeId}:${key}`,
  },
}))

vi.mock("@/lib/world-cup/worldCupBracketEvents", () => ({
  WORLD_CUP_BRACKET_EVENT_TYPES: {
    INCOMPLETE_BRACKETS_WARNING: "INCOMPLETE_BRACKETS_WARNING",
    LOCK_REMINDER: "LOCK_REMINDER",
  },
}))

function request(body: unknown) {
  return new Request("http://localhost/api/brackets/world-cup/c1/commissioner-brain/send-reminder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("World Cup commissioner send-reminder route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireUserMock.mockResolvedValue({
      ok: true,
      user: { id: "user-1", email: "owner@example.com", name: "Owner" },
    })
    managerAccessMock.mockResolvedValue({ ok: true })
    hasAiMock.mockResolvedValue(true)
    buildIncompleteDetailedMock.mockResolvedValue([
      "Incomplete brackets reminder:",
      "Bracket 1 — 3 missing knockout picks.",
    ])
    buildBroadcastMock.mockResolvedValue([
      "Pool reminder: \"Office Cup\" — submit picks before lock.",
      "https://allfantasy.ai/join/bracket/INVITE",
    ])
    generateLinesMock.mockResolvedValue(["AI-enhanced reminder copy"])
    emitEventMock.mockResolvedValue({ ok: true })
  })

  it("incomplete target without AI uses detailed deterministic copy", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/commissioner-brain/send-reminder/route")

    const res = await POST(request({ target: "incomplete" }), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.target).toBe("incomplete")
    expect(json.useAi).toBe(false)
    expect(buildIncompleteDetailedMock).toHaveBeenCalledWith("c1")
    expect(generateLinesMock).not.toHaveBeenCalled()
    expect(emitEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        challengeId: "c1",
        eventTitle: "Incomplete brackets — finish picks",
        eventType: "INCOMPLETE_BRACKETS_WARNING",
        isAiGenerated: false,
        metadata: expect.objectContaining({
          manual: true,
          target: "incomplete",
          useAi: false,
        }),
      })
    )
  })

  it("broadcast target without AI uses public-safe deterministic copy", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/commissioner-brain/send-reminder/route")

    const res = await POST(request({ target: "broadcast" }), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.target).toBe("broadcast")
    expect(buildBroadcastMock).toHaveBeenCalledWith("c1")
    expect(emitEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventTitle: "Pool reminder",
        eventType: "LOCK_REMINDER",
        isAiGenerated: false,
      })
    )
    // Broadcast must not leak emails or user IDs into the public chat event.
    const event = emitEventMock.mock.calls[0][0] as { eventBody: string }
    expect(event.eventBody).not.toMatch(/@example\.com|user-1|owner@/i)
  })

  it("useAi: true with Pro routes through generateAiWrappedLines", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/commissioner-brain/send-reminder/route")

    const res = await POST(request({ target: "incomplete", useAi: true }), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.useAi).toBe(true)
    expect(generateLinesMock).toHaveBeenCalledWith("incomplete_reminder", "c1")
    expect(buildIncompleteDetailedMock).not.toHaveBeenCalled()
    expect(emitEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        isAiGenerated: true,
        metadata: expect.objectContaining({ useAi: true }),
      })
    )
  })

  it("useAi: true without Pro returns 402 upgrade and does not post", async () => {
    hasAiMock.mockResolvedValue(false)
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/commissioner-brain/send-reminder/route")

    const res = await POST(request({ target: "incomplete", useAi: true }), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(402)
    expect(json.upgrade).toBe(true)
    expect(emitEventMock).not.toHaveBeenCalled()
    expect(generateLinesMock).not.toHaveBeenCalled()
  })

  it("useAi: false works for free users (no Pro gate on deterministic path)", async () => {
    hasAiMock.mockResolvedValue(false)
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/commissioner-brain/send-reminder/route")

    const res = await POST(request({ target: "broadcast" }), { params: { challengeId: "c1" } })

    expect(res.status).toBe(200)
    expect(buildBroadcastMock).toHaveBeenCalledWith("c1")
    expect(emitEventMock).toHaveBeenCalled()
  })

  it("blocks non-manager (manager gate enforced)", async () => {
    managerAccessMock.mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }),
    })
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/commissioner-brain/send-reminder/route")

    const res = await POST(request({ target: "broadcast" }), { params: { challengeId: "c1" } })

    expect(res.status).toBe(403)
    expect(emitEventMock).not.toHaveBeenCalled()
  })

  it("truncates body to 4000 chars before posting", async () => {
    buildBroadcastMock.mockResolvedValueOnce([
      "x".repeat(5000),
      "y".repeat(2000),
    ])
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/commissioner-brain/send-reminder/route")

    await POST(request({ target: "broadcast" }), { params: { challengeId: "c1" } })

    const event = emitEventMock.mock.calls[0][0] as { eventBody: string }
    expect(event.eventBody.length).toBeLessThanOrEqual(4000)
  })
})
