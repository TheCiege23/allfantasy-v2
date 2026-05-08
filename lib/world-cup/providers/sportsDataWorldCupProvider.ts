import "server-only"
import {
  WorldCupProviderConfigError,
  type WorldCupDataProvider,
  type WorldCupProviderFixture,
  type WorldCupProviderTeam,
} from "../worldCupDataProvider"

/**
 * SportsDataWorldCupProvider
 *
 * Scaffold for SportsData.io integration.
 *
 * Env vars required:
 *   SPORTSDATA_API_KEY — SportsData.io API key
 *
 * TODO: Verify exact SportsData.io soccer/World Cup endpoint paths and payload
 *       shapes before enabling in production. The base URL and endpoints below
 *       are based on the SportsData.io Soccer API v3 docs but must be confirmed
 *       against an active subscription.
 *
 * Docs: https://sportsdata.io/developers/api-documentation/soccer
 */
export class SportsDataWorldCupProvider implements WorldCupDataProvider {
  readonly name = "sportsdata" as const

  private readonly BASE_URL =
    "https://api.sportsdata.io/v4/soccer/scores/json"

  /** SportsData uses competition-specific tournament IDs.
   *  TODO: confirm the correct ID for FIFA World Cup 2026. */
  private readonly COMPETITION_ID =
    process.env.SPORTSDATA_WORLD_CUP_COMPETITION_ID ?? "FIFA2026"

  private checkConfig(): void {
    if (!process.env.SPORTSDATA_API_KEY) {
      throw new WorldCupProviderConfigError(
        "sportsdata",
        "SPORTSDATA_API_KEY is not configured."
      )
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async sdFetch(path: string): Promise<any> {
    this.checkConfig()
    const url = `${this.BASE_URL}/${path}?key=${process.env.SPORTSDATA_API_KEY}`
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) {
      throw new Error(
        `SportsData fetch ${path} failed: ${res.status} ${res.statusText}`
      )
    }
    return res.json()
  }

  async getTeams(_seasonYear: number): Promise<WorldCupProviderTeam[]> {
    // TODO: confirm correct SportsData.io teams endpoint for World Cup.
    // Likely: /Teams/{CompetitionId} or /CompetitionDetails/{CompetitionId}
    void this.sdFetch // suppress unused error until implemented
    throw new WorldCupProviderConfigError(
      "sportsdata",
      "getTeams() is not yet implemented for SportsData.io. " +
        "Set WORLD_CUP_DATA_PROVIDER=apifootball or mock to continue."
    )
  }

  async getFixtures(_seasonYear: number): Promise<WorldCupProviderFixture[]> {
    // TODO: confirm correct SportsData.io fixtures endpoint for World Cup.
    // Likely: /Schedule/{CompetitionId}/{season} or /Games/{CompetitionId}/{season}
    throw new WorldCupProviderConfigError(
      "sportsdata",
      "getFixtures() is not yet implemented for SportsData.io. " +
        "Set WORLD_CUP_DATA_PROVIDER=apifootball or mock to continue."
    )
  }

  async getLiveFixtures(_seasonYear: number): Promise<WorldCupProviderFixture[]> {
    throw new WorldCupProviderConfigError(
      "sportsdata",
      "getLiveFixtures() is not yet implemented for SportsData.io."
    )
  }
}
