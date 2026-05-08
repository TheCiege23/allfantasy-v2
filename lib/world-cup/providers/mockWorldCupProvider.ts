import "server-only"
import type {
  WorldCupDataProvider,
  WorldCupProviderFixture,
  WorldCupProviderTeam,
} from "../worldCupDataProvider"

/**
 * MockWorldCupProvider
 *
 * Safe no-op provider for local development when no sports API key is configured.
 * Returns empty arrays with a console warning so sync functions don't crash.
 * Also used as the "manual" provider — data is expected to be seeded directly via
 * the admin seed helpers in worldCupSeedData.ts.
 */
export class MockWorldCupProvider implements WorldCupDataProvider {
  readonly name = "mock" as const

  async getTeams(_seasonYear: number): Promise<WorldCupProviderTeam[]> {
    console.warn(
      "[MockWorldCupProvider] getTeams() called — no external API configured. " +
        "Set WORLD_CUP_DATA_PROVIDER=apifootball and API_SPORTS_KEY to use real data."
    )
    return []
  }

  async getFixtures(_seasonYear: number): Promise<WorldCupProviderFixture[]> {
    console.warn(
      "[MockWorldCupProvider] getFixtures() called — no external API configured. " +
        "Set WORLD_CUP_DATA_PROVIDER=apifootball and API_SPORTS_KEY to use real data."
    )
    return []
  }

  async getLiveFixtures(_seasonYear: number): Promise<WorldCupProviderFixture[]> {
    return []
  }

  async getFixtureById(
    _providerId: string,
    _seasonYear: number
  ): Promise<WorldCupProviderFixture | null> {
    return null
  }
}
