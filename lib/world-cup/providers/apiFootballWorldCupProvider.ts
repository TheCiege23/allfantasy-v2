import "server-only"
import {
  fetchWorldCupTeams,
  fetchWorldCupFixtures,
  fetchWorldCupTodayAndActiveFixtures,
  fetchWorldCupStandings,
  fetchWorldCupInjuries,
  normalizeWorldCupStatus,
  normalizeWorldCupRound,
  getWorldCupLeagueId,
  type ApiFootballWorldCupFixture,
  type ApiFootballWorldCupInjury,
} from "../apiSportsWorldCup"
import {
  WorldCupProviderConfigError,
  type WorldCupDataProvider,
  type WorldCupProviderFixture,
  type WorldCupProviderGroupStanding,
  type WorldCupProviderInjury,
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
    // Fetch today's matches only (UTC date filter). Includes FT/AET/PEN so bracket winners
    // propagate correctly. Returns 0 rows on off-days (saves ~104 rows vs full season dump).
    this.checkConfig()
    const rows = await fetchWorldCupTodayAndActiveFixtures(seasonYear)
    return rows.map((f) => this.normalizeFixture(f))
  }

  async getGroupStandings(seasonYear: number): Promise<WorldCupProviderGroupStanding[]> {
    this.checkConfig()
    const rows = await fetchWorldCupStandings(seasonYear)
    return rows
      .map((row) => ({
        row,
        groupName: normalizeApiFootballGroupName(row.group),
      }))
      .filter(({ groupName }) => /^[A-L]$/.test(groupName))
      .map(({ row, groupName }) => ({
        providerTeamId: String(row.team.id),
        fifaCode: null,
        teamName: row.team.name,
        groupName,
        rank: row.rank,
        points: row.points ?? 0,
        goalDifference: row.goalsDiff ?? 0,
        goalsFor: row.all?.goals?.for ?? 0,
        goalsAgainst: row.all?.goals?.against ?? 0,
        played: row.all?.played ?? 0,
        wins: row.all?.win ?? 0,
        draws: row.all?.draw ?? 0,
        losses: row.all?.lose ?? 0,
        raw: row,
      }))
  }

  async getInjuries(seasonYear: number): Promise<WorldCupProviderInjury[]> {
    this.checkConfig()
    const rows = await fetchWorldCupInjuries(seasonYear)
    return rows.map((row) => this.normalizeInjury(row)).filter(Boolean) as WorldCupProviderInjury[]
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

    const apiShort = f.fixture.status?.short ?? null
    const apiShortU = apiShort?.toUpperCase() ?? ""
    let period: string | null = null
    if (["ET", "BT", "E1", "E2"].includes(apiShortU)) period = "extra_time"
    else if (apiShortU === "P") period = "penalties"
    else if (apiShortU === "1H") period = "first_half"
    else if (apiShortU === "2H") period = "second_half"
    else if (apiShortU === "HT") period = "halftime"

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
      period,
      apiStatusShort: apiShort,
      elapsedMinute: f.fixture.status?.elapsed ?? null,
      injuryTime: f.fixture.status?.extra ?? null,
      homeScore,
      awayScore,
      homePenaltyScore: hp,
      awayPenaltyScore: ap,
      winnerProviderId,
      winnerName,
      raw: f,
    }
  }

  private normalizeInjury(row: ApiFootballWorldCupInjury): WorldCupProviderInjury | null {
    const playerId = row.player?.id == null ? "" : String(row.player.id)
    const playerName = row.player?.name?.trim() ?? ""
    const teamName = row.team?.name?.trim() ?? ""
    if (!playerId || !playerName || !teamName) return null

    const type = row.player?.type?.trim() ?? ""
    const reason = row.player?.reason?.trim() ?? ""
    const status = type || reason || "injured"
    const notes = [type && `Type: ${type}`, reason && `Reason: ${reason}`]
      .filter(Boolean)
      .join(" | ")

    return {
      providerPlayerId: playerId,
      playerName,
      teamProviderId: row.team?.id == null ? null : String(row.team.id),
      teamName,
      status,
      bodyPart: reason || null,
      notes: notes || null,
      fixtureProviderId: row.fixture?.id == null ? null : String(row.fixture.id),
      fixtureDate: row.fixture?.date ?? null,
      raw: row,
    }
  }
}

// Export the league id helper so admin routes can display it
export { getWorldCupLeagueId }

function normalizeApiFootballGroupName(value?: string | null) {
  const text = value?.trim() ?? ""
  const match = text.match(/Group\s+([A-L])/i)
  if (match?.[1]) return match[1].toUpperCase()
  return text.toUpperCase()
}
