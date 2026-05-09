import { describe, expect, it } from "vitest"

import {
  AutomationError,
  FatalAutomationError,
  RetryableAutomationError,
  isRetryableAutomationError,
} from "@/lib/automation/errors"
import { buildIdempotencyKey, hashIdempotencyKey } from "@/lib/automation/idempotency"

describe("automation idempotency", () => {
  it("buildIdempotencyKey is stable for the same parts", () => {
    const d = new Date("2026-05-09T12:00:00.000Z")
    expect(buildIdempotencyKey(["a", 1, d, null])).toBe(
      buildIdempotencyKey(["a", 1, d, null])
    )
  })

  it("hashIdempotencyKey returns the same digest for the same raw string", () => {
    const raw = buildIdempotencyKey(["league", "x", 3])
    expect(hashIdempotencyKey(raw)).toBe(hashIdempotencyKey(raw))
  })
})

describe("automation errors", () => {
  it("detects RetryableAutomationError", () => {
    expect(isRetryableAutomationError(new RetryableAutomationError("transient"))).toBe(true)
    expect(isRetryableAutomationError(new FatalAutomationError("nope"))).toBe(false)
    expect(isRetryableAutomationError(new AutomationError("generic"))).toBe(false)
    expect(isRetryableAutomationError(new Error("plain"))).toBe(false)
  })
})

/*
 * Lock helpers (`locks.ts`) integrate Upstash REST + Postgres — integration coverage belongs in a DB-backed suite.
 */
