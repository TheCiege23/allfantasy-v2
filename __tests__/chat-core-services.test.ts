import { describe, expect, it } from "vitest"
import {
  clampLimit,
  getMessageQueryOptions,
  getPollIntervalMs,
  getPresenceStatus,
  isLeagueVirtualRoom,
  parseCursor,
  resolveChatRoom,
  resolveSportForChatRoom,
  validateMessageBody,
} from "@/lib/chat-core"

describe("chat core services", () => {
  it("parses message query options with limits and cursor", () => {
    const params = new URLSearchParams()
    params.set("limit", "999")
    params.set("before", "2026-03-22T00:00:00.000Z")
    const query = getMessageQueryOptions(params)

    expect(query.limit).toBe(100)
    expect(query.before).toBe("2026-03-22T00:00:00.000Z")
    expect(clampLimit(0)).toBe(1)
    expect(parseCursor(query.before ?? null)?.toISOString()).toBe("2026-03-22T00:00:00.000Z")
    expect(parseCursor("bad-date")).toBeNull()
  })

  it("resolves room source and type for virtual and platform rooms", () => {
    expect(isLeagueVirtualRoom("league:l1")).toBe(true)
    expect(resolveChatRoom("league:l1")).toMatchObject({
      roomType: "league",
      source: "bracket_league",
      leagueId: "l1",
    })
    expect(resolveChatRoom("ai:session-1")).toMatchObject({
      roomType: "ai",
      source: "platform",
    })
    expect(resolveChatRoom("thread-1")).toMatchObject({
      roomType: "dm",
      source: "platform",
    })
  })

  it("validates composer and polling behavior", () => {
    expect(validateMessageBody("")).toMatchObject({ valid: false })
    expect(validateMessageBody("ok")).toMatchObject({ valid: true })
    expect(getPollIntervalMs({ active: true })).toBe(4000)
    expect(getPollIntervalMs({ active: false })).toBe(8000)
  })

  it("resolves sport context and presence status", () => {
    expect(resolveSportForChatRoom({ sport: "NFL" })).toBe("NFL")
    expect(resolveSportForChatRoom({ sport: "NCAAF" })).toBe("NCAAF")
    expect(resolveSportForChatRoom({ sport: "SOCCER" })).toBe("SOCCER")
    expect(resolveSportForChatRoom({ sport: "unsupported" })).toBeNull()

    expect(getPresenceStatus(new Date(Date.now() - 30_000))).toBe("online")
    expect(getPresenceStatus(new Date(Date.now() - 120_000))).toBe("away")
    expect(getPresenceStatus(new Date(Date.now() - 900_000))).toBe("offline")
  })
})
