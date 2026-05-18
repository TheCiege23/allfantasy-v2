import { beforeEach, describe, expect, it, vi } from "vitest"

const readinessMocks = vi.hoisted(() => ({
  getWorldCupOfficialGroupsReadiness: vi.fn(),
  prisma: {
    worldCupOfficialFixture: {
      count: vi.fn(),
    },
    worldCupOfficialGroupStanding: {
      count: vi.fn(),
    },
  },
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({ prisma: readinessMocks.prisma }))
vi.mock("@/lib/world-cup/worldCupDataSyncService", () => ({
  getWorldCupOfficialGroupsReadiness: readinessMocks.getWorldCupOfficialGroupsReadiness,
}))

import {
  getWorldCupOperationsReadiness,
  getWorldCupOriginOpsStatus,
  getWorldCupProviderOpsStatus,
  isWorldCupBestThirdMappingConfigured,
} from "@/lib/world-cup/worldCupOperationsReadiness"

describe("World Cup operations readiness helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv("WORLD_CUP_DATA_PROVIDER", "")
    vi.stubEnv("API_SPORTS_KEY", "")
    vi.stubEnv("API_FOOTBALL_KEY", "")
    vi.stubEnv("APISPORTS_FOOTBALL_KEY", "")
    vi.stubEnv("RAPIDAPI_KEY", "")
    vi.stubEnv("WORLD_CUP_BEST_THIRD_MAPPING_CONFIRMED", "")
  })

  it("detects configured API-Football provider without exposing keys", () => {
    const status = getWorldCupProviderOpsStatus({
      WORLD_CUP_DATA_PROVIDER: "apifootball",
      API_SPORTS_KEY: "secret-value",
    } as NodeJS.ProcessEnv)

    expect(status).toEqual({
      name: "apifootball",
      configured: true,
      apiKeyPresent: true,
      leagueId: "1",
      leagueIdConfigured: false,
      cronSecretPresent: false,
      missingEnvVars: ["API_FOOTBALL_WORLD_CUP_LEAGUE_ID", "WORLD_CUP_CRON_SECRET"],
    })
    expect(JSON.stringify(status)).not.toContain("secret-value")
  })

  it("does not treat mock provider as production configured", () => {
    expect(getWorldCupProviderOpsStatus({ WORLD_CUP_DATA_PROVIDER: "mock" } as NodeJS.ProcessEnv)).toEqual({
      name: "mock",
      configured: false,
      apiKeyPresent: false,
      leagueId: null,
      leagueIdConfigured: true,
      cronSecretPresent: false,
      missingEnvVars: ["WORLD_CUP_DATA_PROVIDER", "WORLD_CUP_CRON_SECRET"],
    })
  })

  it("rejects localhost production origins", () => {
    const status = getWorldCupOriginOpsStatus({
      NEXTAUTH_URL: "http://localhost:3010",
      NEXT_PUBLIC_APP_URL: "http://localhost:3010",
      APP_URL: "http://localhost:3010",
    } as NodeJS.ProcessEnv)

    expect(status.productionSafe).toBe(false)
  })

  it("accepts aligned HTTPS production origins", () => {
    const status = getWorldCupOriginOpsStatus({
      NEXTAUTH_URL: "https://www.allfantasy.ai",
      NEXT_PUBLIC_APP_URL: "https://www.allfantasy.ai",
      APP_URL: "https://www.allfantasy.ai",
      PUBLIC_SITE_URL: "https://www.allfantasy.ai",
    } as NodeJS.ProcessEnv)

    expect(status.productionSafe).toBe(true)
  })

  it("requires explicit best-third mapping confirmation", () => {
    expect(isWorldCupBestThirdMappingConfigured({ WORLD_CUP_BEST_THIRD_MAPPING_CONFIRMED: "false" } as NodeJS.ProcessEnv)).toBe(false)
    expect(isWorldCupBestThirdMappingConfigured({ WORLD_CUP_BEST_THIRD_MAPPING_CONFIRMED: "true" } as NodeJS.ProcessEnv)).toBe(true)
  })

  it("surfaces group-stage fixture readiness while knockout data and best-third mapping remain gated", async () => {
    vi.stubEnv("WORLD_CUP_DATA_PROVIDER", "apifootball")
    vi.stubEnv("API_FOOTBALL_WORLD_CUP_LEAGUE_ID", "1")
    vi.stubEnv("API_SPORTS_KEY", "secret-value")
    vi.stubEnv("WORLD_CUP_CRON_SECRET", "cron-secret")
    vi.stubEnv("WORLD_CUP_BEST_THIRD_MAPPING_CONFIRMED", "false")
    readinessMocks.getWorldCupOfficialGroupsReadiness.mockResolvedValue({
      ready: true,
      assignedTeams: 48,
      incompleteGroups: [],
    })
    readinessMocks.prisma.worldCupOfficialFixture.count
      .mockResolvedValueOnce(72)
      .mockResolvedValueOnce(72)
      .mockResolvedValueOnce(0)
    readinessMocks.prisma.worldCupOfficialGroupStanding.count.mockResolvedValueOnce(48)

    const readiness = await getWorldCupOperationsReadiness({ seasonYear: 2026 })

    expect(readiness.provider).toEqual({
      name: "apifootball",
      configured: true,
      apiKeyPresent: true,
      leagueId: "1",
      leagueIdConfigured: true,
      cronSecretPresent: true,
      missingEnvVars: [],
    })
    expect(readiness.data).toMatchObject({
      groupsComplete: true,
      assignedTeams: 48,
      fixtureCount: 72,
      groupStageFixtureCount: 72,
      knockoutFixtureCount: 0,
      knockoutFixturesAvailable: false,
      standingsSynced: true,
      bestThirdMappingConfigured: false,
    })
    expect(readiness.data.warnings).toEqual([
      "knockout_fixtures_pending: provider has not supplied Round of 32 or later fixtures yet.",
      "best_third_mapping_gated: keep WORLD_CUP_BEST_THIRD_MAPPING_CONFIRMED=false until FIFA mapping is official.",
    ])
    expect(JSON.stringify(readiness)).not.toContain("secret-value")
  })
})
