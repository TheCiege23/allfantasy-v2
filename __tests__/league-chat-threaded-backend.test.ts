import { createMessage, getMessagesByThread, getRepliesForMessage } from "../lib/league-chat/LeagueChatMessageService"
import { prisma } from "../lib/prisma"

const hasPrismaChatModels = Boolean(
  (prisma as any)?.appUser?.upsert &&
    (prisma as any)?.league?.create &&
    (prisma as any)?.leagueChatMessage?.deleteMany
)

const describeThreadedBackend = hasPrismaChatModels ? describe : describe.skip

describeThreadedBackend("LeagueChatMessageService threaded chat backend", () => {
  let leagueId: string
  let userId: string

  beforeAll(async () => {
    // Create AppUser first
    const user = await prisma.appUser.upsert({
      where: { email: "test@example.com" },
      update: { username: "testuser", displayName: "Test User" },
      create: {
        id: "test-user",
        email: "test@example.com",
        username: "testuser",
        displayName: "Test User",
      },
    })
    userId = user.id
    // Then create League
    const league = await prisma.league.create({
      data: {
        name: "Test League",
        sport: "NFL",
        status: "active",
        season: 2026,
        platform: "test", // required field
        platformLeagueId: "test-league", // required field
        user: { connect: { id: userId } }, // required relation
      },
    })
    leagueId = league.id
  })

  afterAll(async () => {
    await prisma.leagueChatMessage.deleteMany({ where: { leagueId } })
    await prisma.league.delete({ where: { id: leagueId } })
    await prisma.appUser.delete({ where: { id: userId } })
  })

  it("creates a message with parentMessageId", async () => {
    const msg = await createMessage({
      threadId: `league:${leagueId}`,
      body: "Parent message",
      senderId: userId,
      isPrivate: false,
    })
    const reply = await createMessage({
      threadId: `league:${leagueId}`,
      body: "Reply message",
      senderId: userId,
      parentMessageId: msg.id,
      isPrivate: false,
    })
    expect(reply.parentMessageId).toBe(msg.id)
  })

  it("fetches replies for a message", async () => {
    const parent = await createMessage({ threadId: `league:${leagueId}`, body: "Root", senderId: userId, isPrivate: false })
    await createMessage({ threadId: `league:${leagueId}`, body: "Reply1", senderId: userId, parentMessageId: parent.id, isPrivate: false })
    await createMessage({ threadId: `league:${leagueId}`, body: "Reply2", senderId: userId, parentMessageId: parent.id, isPrivate: false })
    const replies = await getRepliesForMessage(parent.id)
    expect(replies).toHaveLength(2)
    expect(replies.map(r => r.parentMessageId)).toEqual([parent.id, parent.id])
  })

  it("fetches all messages in a thread including replies", async () => {
    const threadId = `league:${leagueId}`
    const m1 = await createMessage({ threadId, body: "Root", senderId: userId, isPrivate: false, source: undefined })
    const m2 = await createMessage({ threadId, body: "Reply", senderId: userId, parentMessageId: m1.id, isPrivate: false, source: undefined })
    await new Promise(res => setTimeout(res, 100)); // Wait for DB consistency
    const all = await getMessagesByThread(threadId, userId, null)
    expect(all.find(m => m.id === m1.id)).toBeTruthy()
    expect(all.find(m => m.id === m2.id)).toBeTruthy()
  })
})
