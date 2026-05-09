import "server-only"
import { fetchWorldCupFixtures } from "../apiSportsWorldCup"
import { apiFootballFixtureToNormalizedLive } from "../worldCupLiveScoreNormalizer"
import type { WorldCupLiveScoreAdapter } from "./worldCupLiveProviderTypes"

function hasApiSportsKey(): boolean {
  return Boolean(
    process.env.API_FOOTBALL_KEY?.trim() ||
      process.env.APISPORTS_FOOTBALL_KEY?.trim() ||
      process.env.API_SPORTS_KEY?.trim() ||
      process.env.RAPIDAPI_KEY?.trim()
  )
}

/**
 * API-Football (api-sports.io) — recommended primary for FIFA World Cup live scoring.
 */
export class ApiSportsWorldCupLiveProvider implements WorldCupLiveScoreAdapter {
  readonly id = "api_sports" as const
  readonly label = "API-SPORTS / API-Football"

  isConfigured(): boolean {
    return hasApiSportsKey()
  }

  async fetchLiveMatches(seasonYear: number) {
    if (!this.isConfigured()) return []
    const rows = await fetchWorldCupFixtures(seasonYear)
    return rows.map(apiFootballFixtureToNormalizedLive)
  }
}
