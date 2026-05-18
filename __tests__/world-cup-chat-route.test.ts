import { beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

const requireUserMock = vi.hoisted(() => vi.fn())
const memberAccessMock = vi.hoisted(() => vi.fn())
const managerAccessMock = vi.hoisted(() => vi.fn())
const hasAiMock = vi.hoisted(() => vi.fn())
const notifyMentionMock = vi.hoisted(() => vi.fn())
const notifyAllMentionMock = vi.hoisted(() => vi.fn())
const notifyChimmyReplyMock = vi.hoisted(() => vi.fn())
const findManyMessagesMock = vi.hoisted(() => vi.fn())
const createMessageMock = vi.hoisted(() => vi.fn())
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

vi.mock("@/lib/prisma", () => ({
  prisma: {
    worldCupBracketChatEvent: {
      findMany: findManyMessagesMock,
      create: createMessageMock,
    },
    worldCupBracketParticipant: {
      findMany: findManyParticipantsMock,
    },
  },
}))

function request(body?: unknown) {
  return new Request("http://localhost/api/brackets/world-cup/c1/chat", {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  })
}

function dbMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: "msg-1",
    challengeId: "c1",
    userId: "user-1",
    eventType: "world_cup.pool_chat_message",
    eventTitle: "Pool chat",
    eventBody: "hello pool",
    metadata: { visibility: "public", messageType: "text" },
    createdAt: new Date("2026-06-01T12:00:00.000Z"),
    isAiGenerated: false,
    user: { displayName: "User One", username: "userone", email: "u1@example.com", avatarUrl: null },
    ...overrides,
  }
}

describe("World Cup pool chat route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireUserMock.mockResolvedValue({
      ok: true,
      user: { id: "user-1", email: "u1@example.com", name: "User One" },
    })
    memberAccessMock.mockResolvedValue({ ok: true })
    managerAccessMock.mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) })
    hasAiMock.mockResolvedValue(false)
    notifyMentionMock.mockResolvedValue([])
    notifyAllMentionMock.mockResolvedValue([])
    notifyChimmyReplyMock.mockResolvedValue([])
    findManyMessagesMock.mockResolvedValue([])
    findManyParticipantsMock.mockResolvedValue([])
    createMessageMock.mockImplementation(async ({ data }) => dbMessage({
      id: "created-1",
      userId: data.userId,
      eventType: data.eventType,
      eventBody: data.eventBody,
      metadata: data.metadata,
    }))
  })

  it("allows a member to GET visible chat messages", async () => {
    findManyMessagesMock.mockResolvedValue([dbMessage()])
    const { GET } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await GET(request(), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.messages).toHaveLength(1)
    expect(json.messages[0]).toMatchObject({ body: "hello pool", authorName: "User One" })
  })

  it("rejects non-members from GET", async () => {
    memberAccessMock.mockResolvedValue({ ok: false, response: Response.json({ error: "Forbidden" }, { status: 403 }) })
    const { GET } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await GET(request(), { params: { challengeId: "c1" } })

    expect(res.status).toBe(403)
  })

  it("allows a member to POST public text", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await POST(request({ body: "hello @friend" }), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(createMessageMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: "world_cup.pool_chat_message",
        eventBody: "hello @friend",
      }),
    }))
    expect(json.message.body).toBe("hello @friend")
  })

  it("persists safe GIF metadata with a chat message", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const gif = {
      id: "gif-1",
      title: "Goal",
      previewUrl: "https://media.klipy.com/gifs/goal.webp",
      gifUrl: "https://media.klipy.com/gifs/goal.gif",
      width: 320,
      height: 180,
      provider: "klipy",
    }
    const res = await POST(request({ body: "Goal GIF", gif }), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(createMessageMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventBody: "Goal GIF",
        metadata: expect.objectContaining({
          messageType: "gif",
          gif,
        }),
      }),
    }))
    expect(json.message.gif).toMatchObject(gif)
  })

  it("rejects arbitrary external GIF URLs", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await POST(request({
      body: "bad gif",
      gif: {
        id: "bad",
        title: "Bad",
        previewUrl: "https://evil.example.com/gif.webp",
        gifUrl: "https://evil.example.com/gif.gif",
        width: 1,
        height: 1,
        provider: "klipy",
      },
    }), { params: { challengeId: "c1" } })

    expect(res.status).toBe(400)
  })

  it("blocks @global for normal users", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await POST(request({ body: "@global update" }), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toMatch(/commissioner-only/i)
  })

  it("returns coming soon for @global managers", async () => {
    managerAccessMock.mockResolvedValue({ ok: true })
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await POST(request({ body: "@global update" }), { params: { challengeId: "c1" } })
    const json = await res.json()

    expect(res.status).toBe(409)
    expect(json.code).toBe("WORLD_CUP_GLOBAL_BROADCAST_COMING_SOON")
  })

  it("blocks @all for normal users and allows managers", async () => {
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const blocked = await POST(request({ body: "@all deadline" }), { params: { challengeId: "c1" } })
    expect(blocked.status).toBe(403)

    managerAccessMock.mockResolvedValue({ ok: true })
    const allowed = await POST(request({ body: "@all deadline" }), { params: { challengeId: "c1" } })
    expect(allowed.status).toBe(201)
  })

  it("keeps @chimmy locked without AI and private when AI is enabled", async () => {
    const { POST, GET } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const locked = await POST(request({ body: "@chimmy help me" }), { params: { challengeId: "c1" } })
    expect(locked.status).toBe(402)

    hasAiMock.mockResolvedValue(true)
    const created = await POST(request({ body: "@chimmy help me" }), { params: { challengeId: "c1" } })
    expect(created.status).toBe(201)
    expect(createMessageMock).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: "world_cup.pool_chat_chimmy_private",
        metadata: expect.objectContaining({ visibility: "private_to_user", targetUserId: "user-1" }),
      }),
    }))

    requireUserMock.mockResolvedValue({ ok: true, user: { id: "user-2", email: "u2@example.com" } })
    findManyMessagesMock.mockResolvedValue([
      dbMessage({
        eventType: "world_cup.pool_chat_chimmy_private",
        metadata: { visibility: "private_to_user", targetUserId: "user-1" },
      }),
    ])
    const privateList = await GET(request(), { params: { challengeId: "c1" } })
    const json = await privateList.json()
    expect(json.messages).toHaveLength(0)
  })

  it("calls World Cup notification helper for resolved @username mentions", async () => {
    findManyParticipantsMock.mockResolvedValue([
      { userId: "user-2", displayName: "Friend", user: { id: "user-2", username: "friend", displayName: "Friend", email: "friend@example.com" } },
    ])
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await POST(request({ body: "hey @friend" }), { params: { challengeId: "c1" } })

    expect(res.status).toBe(201)
    expect(notifyMentionMock).toHaveBeenCalledWith(expect.objectContaining({
      challengeId: "c1",
      senderUserId: "user-1",
      messageId: "created-1",
      targetUserIds: ["user-2"],
    }))
  })

  it("@all calls pool-wide notification helper for managers", async () => {
    managerAccessMock.mockResolvedValue({ ok: true })
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await POST(request({ body: "@all deadline" }), { params: { challengeId: "c1" } })

    expect(res.status).toBe(201)
    expect(notifyAllMentionMock).toHaveBeenCalledWith(expect.objectContaining({
      challengeId: "c1",
      senderUserId: "user-1",
      messageId: "created-1",
      body: "@all deadline",
    }))
  })

  it("@chimmy calls private sender notification helper when AI is enabled", async () => {
    hasAiMock.mockResolvedValue(true)
    const { POST } = await import("@/app/api/brackets/world-cup/[challengeId]/chat/route")

    const res = await POST(request({ body: "@chimmy help me" }), { params: { challengeId: "c1" } })

    expect(res.status).toBe(201)
    expect(notifyChimmyReplyMock).toHaveBeenCalledWith(expect.objectContaining({
      challengeId: "c1",
      userId: "user-1",
      messageId: "created-1",
    }))
  })
})
