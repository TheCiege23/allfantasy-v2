import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

const requireUserMock = vi.hoisted(() => vi.fn())
const memberAccessMock = vi.hoisted(() => vi.fn())
const managerAccessMock = vi.hoisted(() => vi.fn())
const hasAiMock = vi.hoisted(() => vi.fn())
const generateChimmyReplyMock = vi.hoisted(() => vi.fn())
const cookiesGetMock = vi.hoisted(() => vi.fn())
const notifyChimmyReplyMock = vi.hoisted(() => vi.fn())
const notifyMentionMock = vi.hoisted(() => vi.fn())
const notifyAllMentionMock = vi.hoisted(() => vi.fn())
const findManyMessagesMock = vi.hoisted(() => vi.fn())
const findFirstMessageMock = vi.hoisted(() => vi.fn())
const createMessageMock = vi.hoisted(() => vi.fn())
const updateMessageMock = vi.hoisted(() => vi.fn())
const countMessagesMock = vi.hoisted(() => vi.fn())
const findManyParticipantsMock = vi.hoisted(() => vi.fn())

vi.mock("@/app/api/brackets/world-cup/_utils", () => ({
  requireWorldCupApiUser: requireUserMock,
  assertWorldCupChallengeMemberOrManager: memberAccessMock,
  assertWorldCupManager: managerAccessMock,
  worldCupChallengeParamsSchema: z.object({ challengeId: z.string().min(1) }),
}))

vi.mock("@/lib/bracket-brain/bracketBrainAccess", () => ({
  userHasBracketBrainAi: hasAiMock,
}))

vi.mock("@/lib/world-cup/worldCupNotifications", () => ({
  notifyWorldCupMention: notifyMentionMock,
  notifyWorldCupAllMention: notifyAllMentionMock,
  notifyWorldCupChimmyReply: notifyChimmyReplyMock,
}))

vi.mock("@/lib/world-cup/worldCupChimmyPrivateReply", () => ({
  generateWorldCupChimmyPrivateReply: generateChimmyReplyMock,
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: cookiesGetMock,
  }),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    worldCupBracketChatEvent: {
      findMany: findManyMessagesMock,
      findFirst: findFirstMessageMock,
      create: createMessageMock,
      update: updateMessageMock,
      count: countMessagesMock,
    },
    worldCupBracketParticipant: {
      findMany: findManyParticipantsMock,
    },
  },
}))

function request(body: unknown) {
  return new Request("http://localhost/api/brackets/world-cup/c1/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function dbMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg-1",
    challengeId: "c1",
    userId: "user-1",
    eventType: "world_cup.pool_chat_message",
    eventTitle: "Pool chat",
    eventBody: "hello",
    metadata: { visibility: "public", messageType: "text" },
    createdAt: new Date("2026-06-01T12:00:00.000Z"),
    isAiGenerated: false,
    user: { displayName: "User One", username: "userone", email: "u1@example.com", avatarUrl: null },
    ...overrides,
  }
}

function generatedAiRows(count: number, userId = "user-1") {
  return Array.from({ length: count }, (_, index) => ({
    metadata: {
      targetUserId: userId,
      provider: "openai",
      model: `gpt-test-${index}`,
    },
  }))
}

describe("Chimmy rate limit helper", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("counts only the caller's model-backed Chimmy replies in the current UTC day", async () => {
    findManyMessagesMock.mockResolvedValue([
      ...generatedAiRows(5, "user-42"),
      { metadata: { targetUserId: "user-42", provider: "deterministic", model: "policy" } },
      { metadata: { targetUserId: "other-user", provider: "openai", model: "gpt-test" } },
      { metadata: { targetUserId: "user-42", provider: "unavailable", model: "policy" } },
    ])

    const { countChimmyAiCallsToday, WORLD_CUP_CHIMMY_DAILY_LIMIT } = await import(
      "@/lib/world-cup/worldCupChimmyRateLimit"
    )

    const at = new Date("2026-06-15T14:30:00.000Z")
    const used = await countChimmyAiCallsToday("user-42", at)

    expect(used).toBe(5)
    expect(WORLD_CUP_CHIMMY_DAILY_LIMIT).toBe(20)
    expect(findManyMessagesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isAiGenerated: true,
          eventType: "world_cup.pool_chat_chimmy_private",
          createdAt: { gte: new Date("2026-06-15T00:00:00.000Z") },
        }),
        select: { metadata: true },
      })
    )
  })

  it("fails open (returns 0) if the count query throws", async () => {
    findManyMessagesMock.mockRejectedValue(new Error("db unreachable"))

    const { countChimmyAiCallsToday } = await import(
      "@/lib/world-cup/worldCupChimmyRateLimit"
    )

    const used = await countChimmyAiCallsToday("user-1")
    expect(used).toBe(0)
  })

  it("checkWorldCupChimmyRateLimit returns allowed:true under limit, false at limit", async () => {
    const { checkWorldCupChimmyRateLimit } = await import("@/lib/world-cup/worldCupChimmyRateLimit")
    const { DAILY_CAP_LIMITS } = await import("@/lib/ai/dailyCaps")
    // Pro tier default is 30/day (DAILY_CAP_LIMITS.chimmy.pro).
    // WORLD_CUP_CHIMMY_DAILY_LIMIT (=20) is deprecated; pass tier explicitly.
    const proLimit = DAILY_CAP_LIMITS.chimmy.pro

    findManyMessagesMock.mockResolvedValue(generatedAiRows(proLimit - 1))
    const under = await checkWorldCupChimmyRateLimit("user-1", undefined, "pro")
    expect(under).toEqual({
      allowed: true,
      used: proLimit - 1,
      limit: proLimit,
    })

    findManyMessagesMock.mockResolvedValue(generatedAiRows(proLimit))
    const at = await checkWorldCupChimmyRateLimit("user-1", undefined, "pro")
    expect(at.allowed).toBe(false)

    findManyMessagesMock.mockResolvedValue(generatedAiRows(proLimit + 99))
    const over = await checkWorldCupChimmyRateLimit("user-1", undefined, "pro")
    expect(over.allowed).toBe(false)
  })
})

describe("World Cup chat route — Chimmy rate-limit integration", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cookiesGetMock.mockReturnValue(undefined)
    requireUserMock.mockResolvedValue({
      ok: true,
      user: { id: "user-1", email: "u1@example.com", name: "User One" },
    })
    memberAccessMock.mockResolvedValue({ ok: true })
    managerAccessMock.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) })
    hasAiMock.mockResolvedValue(true)
    notifyMentionMock.mockResolvedValue([])
    notifyAllMentionMock.mockResolvedValue([])
    notifyChimmyReplyMock.mockResolvedValue([])
    generateChimmyReplyMock.mockResolvedValue({
      reply: "Keep it simple: prioritize the group winner path.",
      conversationId: "chimmy:user-1:world-cup:c1",
      provider: "openai",
      model: "gpt-test",
    })
    findManyMessagesMock.mockResolvedValue([])
    findFirstMessageMock.mockResolvedValue(null)
    findManyParticipantsMock.mockResolvedValue([])
    countMessagesMock.mockResolvedValue(0)
    createMessageMock.mockImplementation(async ({ data }: { data: any }) =>
      dbMessage({
        id: data.isAiGenerated ? "chimmy-response-1" : "created-1",
        userId: data.userId,
        eventType: data.eventType,
        eventTitle: data.eventTitle,
        eventBody: data.eventBody,
        metadata: data.metadata,
        isAiGenerated: data.isAiGenerated,
      })
    )
  })

  it("free user still hits 402 BEFORE the rate-limit check (no count query made)", async () => {
    hasAiMock.mockResolvedValue(false)
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await POST(request({ body: "@chimmy help me" }), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(402)
    expect(json.code).toBe("WORLD_CUP_CHIMMY_LOCKED")
    expect(countMessagesMock).not.toHaveBeenCalled()
    expect(findManyMessagesMock).not.toHaveBeenCalled()
    expect(generateChimmyReplyMock).not.toHaveBeenCalled()
  })

  it("Pro user UNDER limit triggers OpenAI and creates the reply (201)", async () => {
    findManyMessagesMock.mockResolvedValue(generatedAiRows(5))
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await POST(request({ body: "@chimmy help me" }), { params: { challengeId: "c1" } })

    expect(res.status).toBe(201)
    expect(generateChimmyReplyMock).toHaveBeenCalled()
  })

  it("Pro user AT limit returns 429 with daily_ai_limit_reached and skips OpenAI", async () => {
    // Pro tier is 30/day (DAILY_CAP_LIMITS.chimmy.pro). Use count == limit to trigger cap.
    findManyMessagesMock.mockResolvedValue(generatedAiRows(30))
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await POST(request({ body: "@chimmy help me" }), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(429)
    expect(json.error).toBe("daily_ai_limit_reached")
    // Route returns "You've used today's 30 Chimmy questions. They reset at midnight UTC."
    expect(json.message).toMatch(/today's.*chimmy/i)
    expect(json.limit).toBe(30)
    expect(json.used).toBe(30)
    // Critical cost protection: OpenAI is never called when over the limit.
    expect(generateChimmyReplyMock).not.toHaveBeenCalled()
    expect(createMessageMock).not.toHaveBeenCalled()
    // Response must not leak provider keys.
    expect(JSON.stringify(json)).not.toMatch(/OPENAI|sk-|gpt-/i)
  })

  it("Pro user OVER limit also returns 429 (defensive — count > limit)", async () => {
    findManyMessagesMock.mockResolvedValue(generatedAiRows(50))
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await POST(request({ body: "@chimmy help me" }), { params: { challengeId: "c1" } })

    expect(res.status).toBe(429)
    expect(generateChimmyReplyMock).not.toHaveBeenCalled()
  })

  it("non-Chimmy normal chat messages are NOT rate-limited (no count query made)", async () => {
    findManyMessagesMock.mockResolvedValue(generatedAiRows(50)) // would block Chimmy but should not affect normal chat
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await POST(request({ body: "regular pool chat message" }), { params: { challengeId: "c1" } })

    expect(res.status).toBe(201)
    expect(countMessagesMock).not.toHaveBeenCalled()
    expect(findManyMessagesMock).not.toHaveBeenCalled()
    expect(generateChimmyReplyMock).not.toHaveBeenCalled()
  })

  it("count window starts at UTC 00:00 (cross-day boundary check)", async () => {
    findManyMessagesMock.mockResolvedValue([])
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    await POST(request({ body: "@chimmy hello" }), { params: { challengeId: "c1" } })

    expect(findManyMessagesMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: expect.objectContaining({
            gte: expect.any(Date),
          }),
        }),
      })
    )
    const args = findManyMessagesMock.mock.calls[0][0]
    const gte: Date = args.where.createdAt.gte
    expect(gte.getUTCHours()).toBe(0)
    expect(gte.getUTCMinutes()).toBe(0)
    expect(gte.getUTCSeconds()).toBe(0)
    expect(gte.getUTCMilliseconds()).toBe(0)
  })
})
