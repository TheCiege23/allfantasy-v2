import "server-only"
import {
  fetchWorldCupTeams,
  fetchWorldCupFixtures,
  normalizeWorldCupStatus,
  normalizeWorldCupRound,
  getWorldCupLeagueId,
  type ApiFootballWorldCupFixture,
} from "../apiSportsWorldCup"
import {
  WorldCupProviderConfigError,
  type WorldCupDataProvider,
  type WorldCupProviderFixture,
  type WorldCupProviderTeam,
} from "../worldCupDataProvider"

/**
 * ApiFootballWorldCupProvider
 *
 * Wraps the existing apiSportsWorldCup.ts client (API-Football / api-sports.io).
 *
 * Env vars required:
 *   API_SPORTS_KEY       — primary key
 *   API_FOOTBALL_KEY     — alias
 *   APISPORTS_FOOTBALL_KEY — alias
 *
 * Optional:
 *   API_FOOTBALL_WORLD_CUP_LEAGUE_ID  — defaults to "1"
 *   API_SPORTS_WORLD_CUP_LEAGUE_ID    — alias
 */
export class ApiFootballWorldCupProvider implements WorldCupDataProvider {
  readonly name = "apifootball" as const

  private checkConfig(): void {
    const key =
      process.env.API_FOOTBALL_KEY ||
      process.env.APISPORTS_FOOTBALL_KEY ||
      process.env.API_SPORTS_KEY ||
      process.env.RAPIDAPI_KEY
    if (!key) {
      throw new WorldCupProviderConfigError(
        "apifootball",
        "No API key configured. Set API_SPORTS_KEY or API_FOOTBALL_KEY in your environment."
      )
    }
  }

  async getTeams(seasonYear: number): Promise<WorldCupProviderTeam[]> {
    this.checkConfig()
    const rows = await fetchWorldCupTeams(seasonYear)
    return rows.map((row) => ({
      providerId: String(row.team.id),
      fifaCode: row.team.code ?? null,
      countryName: row.team.country ?? row.team.name,
      displayName: row.team.name,
      flagUrl: row.team.logo ?? null,
      groupName: null,
      confederation: null,
      fifaRank: null,
      qualificationStatus: "qualified",
    }))
  }

  async getFixtures(seasonYear: number): Promise<WorldCupProviderFixture[]> {
    this.checkConfig()
    const rows = await fetchWorldCupFixtures(seasonYear)
    return rows.map((f) => this.normalizeFixture(f))
  }

  async getLiveFixtures(seasonYear: number): Promise<WorldCupProviderFixture[]> {
    // api-football supports live=all but it requires a separate endpoint.
    // For now, fall back to full fixture list and filter live/halftime in the sync service.
    // TODO: implement https://v3.football.api-sports.io/fixtures?live=all&league=1&season=YEAR
    // when confirmed endpoint is available and quota allows.
    const all = await this.getFixtures(seasonYear)
    return all.filter(
      (f) => f.status === "live" || f.status === "halftime" || f.status === "extra_time"
    )
  }

  async getFixtureById(
    providerId: string,
    _seasonYear: number
  ): Promise<WorldCupProviderFixture | null> {
    // TODO: implement GET /fixtures?id={providerId} when needed.
    void providerId
    return null
  }

  private normalizeFixture(f: ApiFootballWorldCupFixture): WorldCupProviderFixture {
    const status = normalizeWorldCupStatus(
      f.fixture.status?.short,
      f.fixture.status?.long
    )
    const round = normalizeWorldCupRound(f.league.round)

    const homeScore =
      f.goals?.home ?? f.score?.fulltime?.home ?? null
    const awayScore =
      f.goals?.away ?? f.score?.fulltime?.away ?? null
    const hp = f.score?.penalty?.home ?? null
    const ap = f.score?.penalty?.away ?? null

    let winnerProviderId: string | null = null
    let winnerName: string | null = null
    if (f.teams.home.winner === true) {
      winnerProviderId = String(f.teams.home.id)
      winnerName = f.teams.home.name
    } else if (f.teams.away.winner === true) {
      winnerProviderId = String(f.teams.away.id)
      winnerName = f.teams.away.name
    } else if (hp != null && ap != null && hp !== ap) {
      const homeWon = hp > ap
      winnerProviderId = homeWon
        ? String(f.teams.home.id)
        : String(f.teams.away.id)
      winnerName = homeWon ? f.teams.home.name : f.teams.away.name
    } else if (
      homeScore != null &&
      awayScore != null &&
      homeScore !== awayScore
    ) {
      const homeWon = homeScore > awayScore
      winnerProviderId = homeWon
        ? String(f.teams.home.id)
        : String(f.teams.away.id)
      winnerName = homeWon ? f.teams.home.name : f.teams.away.name
    }

    return {
      providerId: String(f.fixture.id),
      homeProviderId: String(f.teams.home.id),
      awayProviderId: String(f.teams.away.id),
      homeName: f.teams.home.name,
      awayName: f.teams.away.name,
      homeLogo: f.teams.home.logo ?? null,
      awayLogo: f.teams.away.logo ?? null,
      startsAt: f.fixture.date ?? null,
      roundName: round ?? f.league.round ?? null,
      stage: f.league.round ?? null,
      status,
      apiStatusShort: f.fixture.status?.short ?? null,
      homeScore,
      awayScore,
      homePenaltyScore: hp,
      awayPenaltyScore: ap,
      winnerProviderId,
      winnerName,
      raw: f,
    }
  }
}

// Export the league id helper so admin routes can display it
export { getWorldCupLeagueId }
