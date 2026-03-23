import { describe, expect, it } from "vitest"
import {
  DEFAULT_TIMEZONE,
  isValidTimezone,
} from "@/lib/preferences/TimezonePreferenceService"
import { resolveTimezonePreferenceSync } from "@/lib/preferences/TimezonePreferenceSyncService"
import { formatInTimezone } from "@/lib/preferences/TimezoneFormattingResolver"

describe("preferences timezone services", () => {
  it("accepts only supported North America timezones", () => {
    expect(isValidTimezone("America/New_York")).toBe(true)
    expect(isValidTimezone("America/Toronto")).toBe(true)
    expect(isValidTimezone("America/Mexico_City")).toBe(true)
    expect(isValidTimezone("Europe/London")).toBe(false)
    expect(isValidTimezone("Asia/Tokyo")).toBe(false)
  })

  it("does not auto-persist unsupported browser timezones", () => {
    const resolved = resolveTimezonePreferenceSync({
      profileTimezone: null,
      browserTimezone: "Europe/London",
    })

    expect(resolved.timezone).toBe(DEFAULT_TIMEZONE)
    expect(resolved.shouldPersistToProfile).toBe(false)
  })

  it("formats with fallback timezone and spanish locale", () => {
    const rendered = formatInTimezone(
      "2026-01-15T20:00:00.000Z",
      "Europe/London",
      { dateStyle: "short" },
      "es"
    )

    expect(typeof rendered).toBe("string")
    expect(rendered.length).toBeGreaterThan(0)
  })
})
