import { describe, expect, it } from "vitest"

import { selectProvidersForIntent } from "@/lib/chimmy-context/intent/ProviderSelector"

const ALWAYS_ON = ["user", "subscription", "league", "importedHistory"]

describe("selectProvidersForIntent", () => {
  it("includes always-on providers for every intent", () => {
    for (const intent of [
      "general",
      "trade",
      "waiver",
      "dynasty",
      "rankings",
      "matchup",
      "draft",
      "start_sit",
    ] as const) {
      const got = selectProvidersForIntent(intent)
      for (const ao of ALWAYS_ON) expect(got).toContain(ao)
    }
  })

  it("general intent loads only always-on providers", () => {
    expect(selectProvidersForIntent("general").sort()).toEqual([...ALWAYS_ON].sort())
  })

  it("matchup intent adds matchup, roster, standings", () => {
    const got = new Set(selectProvidersForIntent("matchup"))
    expect(got.has("matchup")).toBe(true)
    expect(got.has("roster")).toBe(true)
    expect(got.has("standings")).toBe(true)
  })

  it("start_sit intent adds matchup, roster, ranking", () => {
    const got = new Set(selectProvidersForIntent("start_sit"))
    expect(got.has("matchup")).toBe(true)
    expect(got.has("roster")).toBe(true)
    expect(got.has("ranking")).toBe(true)
  })

  it("trade intent adds roster, standings, ranking, leagueDifficulty", () => {
    const got = new Set(selectProvidersForIntent("trade"))
    expect(got.has("roster")).toBe(true)
    expect(got.has("standings")).toBe(true)
    expect(got.has("ranking")).toBe(true)
    expect(got.has("leagueDifficulty")).toBe(true)
  })

  it("draft intent adds only ranking", () => {
    const got = selectProvidersForIntent("draft")
    expect(got.filter((p) => !ALWAYS_ON.includes(p))).toEqual(["ranking"])
  })

  it("returns unique, stable-ordered provider list", () => {
    const got = selectProvidersForIntent("trade")
    expect(new Set(got).size).toBe(got.length)
    // Always-on come first.
    expect(got.slice(0, ALWAYS_ON.length)).toEqual(ALWAYS_ON)
  })
})
