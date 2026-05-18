import { describe, expect, it } from "vitest"
import {
  DEFAULT_WORLD_CUP_NOTIFICATION_PREFERENCES,
  isWorldCupNotificationTypeEnabled,
  resolveWorldCupNotificationPreferences,
  serializeWorldCupNotificationPreferences,
} from "@/lib/world-cup/worldCupNotificationPreferences"

describe("worldCupNotificationPreferences", () => {
  it("defaults to safe in-app notifications with SMS off", () => {
    const prefs = resolveWorldCupNotificationPreferences(null, "pool-1")

    expect(prefs).toEqual(DEFAULT_WORLD_CUP_NOTIFICATION_PREFERENCES)
    expect(prefs.inAppEnabled).toBe(true)
    expect(prefs.smsEnabled).toBe(false)
    expect(prefs.poolMuted).toBe(false)
    expect(prefs.generalChatEnabled).toBe(false)
    expect(isWorldCupNotificationTypeEnabled(prefs, "usernameMention")).toBe(true)
  })

  it("supports pool-specific mute and per-type overrides", () => {
    const prefs = resolveWorldCupNotificationPreferences({
      worldCup: {
        smsEnabled: true,
        generalChatEnabled: true,
        pools: {
          "pool-1": {
            poolMuted: true,
            usernameMentionsEnabled: false,
          },
        },
      },
    }, "pool-1")

    expect(prefs.smsEnabled).toBe(true)
    expect(prefs.generalChatEnabled).toBe(true)
    expect(prefs.poolMuted).toBe(true)
    expect(prefs.usernameMentionsEnabled).toBe(false)
    expect(isWorldCupNotificationTypeEnabled(prefs, "usernameMention")).toBe(false)
  })

  it("serializes pool-specific updates without clobbering global preferences", () => {
    const next = serializeWorldCupNotificationPreferences({
      worldCup: {
        smsEnabled: true,
        pools: {
          other: { poolMuted: true },
        },
      },
      dashboardToggles: { leagueChatMessages: true },
    }, "pool-1", {
      poolMuted: true,
      smsEnabled: false,
    }) as any

    expect(next.dashboardToggles.leagueChatMessages).toBe(true)
    expect(next.worldCup.smsEnabled).toBe(true)
    expect(next.worldCup.pools.other.poolMuted).toBe(true)
    expect(next.worldCup.pools["pool-1"]).toMatchObject({ poolMuted: true, smsEnabled: false })
  })
})
