import { describe, expect, it } from "vitest"
import {
  getWorldCupPoolChatCapabilities,
  parseWorldCupPoolMentions,
  shouldKeepWorldCupMentionPrivate,
} from "@/lib/world-cup/worldCupPoolChatPlan"

describe("World Cup pool chat plan", () => {
  it("classifies username, Chimmy, all, and global mentions", () => {
    const mentions = parseWorldCupPoolMentions("@alice ask @chimmy then ping @all and @global")

    expect(mentions.map((mention) => mention.type)).toEqual([
      "username",
      "chimmy",
      "all",
      "global",
    ])
    expect(mentions[0]).toMatchObject({
      type: "username",
      value: "alice",
      visibility: "public",
      requiresCommissioner: false,
    })
    expect(mentions[1]).toMatchObject({
      type: "chimmy",
      visibility: "private_to_user",
      requiresCommissioner: false,
    })
    expect(mentions[2]).toMatchObject({
      type: "all",
      visibility: "public",
      requiresCommissioner: true,
    })
    expect(mentions[3]).toMatchObject({
      type: "global",
      visibility: "commissioner_only",
      requiresCommissioner: true,
    })
  })

  it("marks Chimmy mentions private so they do not become public pool chat", () => {
    const [chimmy] = parseWorldCupPoolMentions("what now @chimmy?")

    expect(chimmy?.type).toBe("chimmy")
    expect(shouldKeepWorldCupMentionPrivate(chimmy!)).toBe(true)
  })

  it("documents safe capability status for phased implementation", () => {
    const capabilities = getWorldCupPoolChatCapabilities()

    expect(capabilities).toContainEqual(expect.objectContaining({
      id: "activity-feed",
      status: "available",
    }))
    expect(capabilities).toContainEqual(expect.objectContaining({
      id: "private-chimmy",
      status: "blocked",
    }))
    expect(capabilities).toContainEqual(expect.objectContaining({
      id: "global-broadcast",
      status: "planned",
    }))
  })
})
