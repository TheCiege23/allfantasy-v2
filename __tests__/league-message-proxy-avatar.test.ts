import { describe, expect, it } from "vitest"
import { bracketMessagesToPlatform } from "@/lib/chat-core/league-message-proxy"

describe("league message proxy avatar mapping", () => {
  it("maps sender avatar url and preset into platform messages", () => {
    const out = bracketMessagesToPlatform(
      [
        {
          id: "m1",
          message: "hello",
          type: "text",
          createdAt: new Date("2026-03-22T10:00:00.000Z"),
          user: {
            id: "u1",
            displayName: "Alex",
            email: "alex@example.com",
            avatarUrl: "/uploads/avatars/a.png",
            profile: { avatarPreset: "trophy" },
          },
        },
      ],
      "league:l1"
    )

    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      senderName: "Alex",
      senderAvatarUrl: "/uploads/avatars/a.png",
      senderAvatarPreset: "trophy",
    })
  })
})
