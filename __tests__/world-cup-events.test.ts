import { describe, expect, it } from "vitest"
import { worldCupIdempotencyKeys } from "@/lib/world-cup/worldCupBracketEventIdempotency"
import {
  shouldEmitWorldCupEvent,
  type WorldCupCommissionerSettingsResolved,
} from "@/lib/world-cup/worldCupBracketEventService"
import { WORLD_CUP_BRACKET_EVENT_TYPES } from "@/lib/world-cup/worldCupBracketEvents"

const baseSettings = (): WorldCupCommissionerSettingsResolved => ({
  enableSystemEvents: true,
  enableAiSummaries: true,
  enableUpsetAlerts: true,
  enableLeaderboardAlerts: true,
  enableChampionBustAlerts: true,
  enableLockReminders: true,
})

describe("World Cup bracket events", () => {
  it("builds stable idempotency keys", () => {
    const a = worldCupIdempotencyKeys.challengeCreated("c1")
    const b = worldCupIdempotencyKeys.challengeCreated("c1")
    const c = worldCupIdempotencyKeys.challengeCreated("c2")
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it("isolates upset keys by match id", () => {
    const k1 = worldCupIdempotencyKeys.upset("c", "m1", "seed")
    const k2 = worldCupIdempotencyKeys.upset("c", "m2", "seed")
    expect(k1).not.toBe(k2)
  })

  it("gates AI-flagged events behind enableAiSummaries", () => {
    const s = baseSettings()
    s.enableAiSummaries = false
    expect(
      shouldEmitWorldCupEvent(s, WORLD_CUP_BRACKET_EVENT_TYPES.CHALLENGE_CREATED, true)
    ).toBe(false)
  })

  it("allows template system events without enableAiSummaries", () => {
    const s = baseSettings()
    s.enableAiSummaries = false
    expect(
      shouldEmitWorldCupEvent(s, WORLD_CUP_BRACKET_EVENT_TYPES.CHALLENGE_CREATED, false)
    ).toBe(true)
  })

  it("blocks non-AI events when system events disabled", () => {
    const s = baseSettings()
    s.enableSystemEvents = false
    expect(
      shouldEmitWorldCupEvent(s, WORLD_CUP_BRACKET_EVENT_TYPES.MATCH_FINAL, false)
    ).toBe(false)
  })

  it("allows upset events when toggle on", () => {
    const s = baseSettings()
    expect(
      shouldEmitWorldCupEvent(s, WORLD_CUP_BRACKET_EVENT_TYPES.UPSET, false)
    ).toBe(true)
    s.enableUpsetAlerts = false
    expect(
      shouldEmitWorldCupEvent(s, WORLD_CUP_BRACKET_EVENT_TYPES.UPSET, false)
    ).toBe(false)
  })

  it("gates commissioner brain chat lines behind AI summaries toggle", () => {
    const s = baseSettings()
    s.enableAiSummaries = false
    expect(
      shouldEmitWorldCupEvent(
        s,
        WORLD_CUP_BRACKET_EVENT_TYPES.COMMISSIONER_BRAIN_MESSAGE,
        true
      )
    ).toBe(false)
  })

  it("gates scheduled lock windows behind enableLockReminders", () => {
    const s = baseSettings()
    s.enableLockReminders = false
    expect(
      shouldEmitWorldCupEvent(
        s,
        WORLD_CUP_BRACKET_EVENT_TYPES.LOCK_REMINDER_24H,
        false
      )
    ).toBe(false)
  })

  it("gates incomplete bracket warnings behind enableLockReminders", () => {
    const s = baseSettings()
    s.enableLockReminders = false
    expect(
      shouldEmitWorldCupEvent(
        s,
        WORLD_CUP_BRACKET_EVENT_TYPES.INCOMPLETE_BRACKETS_WARNING,
        false
      )
    ).toBe(false)
  })

  it("stable lock reminder window keys per challenge lock fingerprint", () => {
    const k = worldCupIdempotencyKeys.lockReminderWindow("c1", "24h", "2026-06-15T18:00")
    expect(k).toBe(
      worldCupIdempotencyKeys.lockReminderWindow("c1", "24h", "2026-06-15T18:00")
    )
    expect(k).not.toBe(
      worldCupIdempotencyKeys.lockReminderWindow("c1", "6h", "2026-06-15T18:00")
    )
  })
})
