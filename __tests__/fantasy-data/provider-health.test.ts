import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: {} }))

import { getFantasyProviderEnvStatus } from "@/lib/fantasy-data/providerHealth"

const KEYS = [
  "ROLLING_INSIGHTS_API_KEY",
  "ROLLING_INSIGHTS_CLIENT_ID",
  "ROLLING_INSIGHTS_CLIENT_SECRET",
  "ROLLING_INSIGHTS_CLIENT_ID2",
  "ROLLING_INSIGHTS_CLIENT_SECRET2",
  "APISPORTS_API_KEY",
  "API_SPORTS_KEY",
  "CFBD_API_KEY",
  "CFBD_KEY",
] as const

const saved = new Map<string, string | undefined>()

function clearProviderEnv() {
  for (const key of KEYS) {
    if (!saved.has(key)) saved.set(key, process.env[key])
    delete process.env[key]
  }
}

afterEach(() => {
  for (const key of KEYS) {
    const value = saved.get(key)
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
  saved.clear()
})

describe("getFantasyProviderEnvStatus", () => {
  it("reports NFL critical env groups as present when aliases exist", () => {
    clearProviderEnv()
    process.env.ROLLING_INSIGHTS_CLIENT_ID = "ri-client"
    process.env.ROLLING_INSIGHTS_CLIENT_SECRET = "ri-secret"
    process.env.APISPORTS_API_KEY = "api-sports"

    const status = getFantasyProviderEnvStatus("NFL")

    expect(status.missingEnv).toEqual([])
    const rollingInsights = status.envGroups.find((group) => group.name === "rolling_insights")
    expect(rollingInsights?.configured).toBe(true)
    expect(rollingInsights?.presentKeys).toContain("ROLLING_INSIGHTS_CLIENT_ID + ROLLING_INSIGHTS_CLIENT_SECRET")
  })

  it("reports NCAAF provider unavailable groups without throwing", () => {
    clearProviderEnv()

    const status = getFantasyProviderEnvStatus("NCAAF")

    expect(status.missingEnv.some((key) => key.includes("CFBD"))).toBe(true)
    expect(status.missingEnv.some((key) => key.includes("API_SPORTS"))).toBe(true)
  })
})
