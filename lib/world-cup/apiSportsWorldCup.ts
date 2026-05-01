import "server-only"
import type { WorldCupMatchStatus, WorldCupRound } from "./types"
const BASE_URL = "https://v3.football.api-sports.io"
export type ApiFootballWorldCupTeam = { team: { id: number; name: string; code?: string | null; country?: string | null; logo?: string | null } }
export type ApiFootballWorldCupFixture = { fixture: { id: number; date?: string | null; status?: { long?: string | null; short?: string | null } | null }; league: { id: number; season: number; round?: string | null }; teams: { home: { id: number; name: string; logo?: string | null; winner?: boolean | null }; away: { id: number; name: string; logo?: string | null; winner?: boolean | null } }; goals?: { home?: number | null; away?: number | null } | null; score?: { fulltime?: { home?: number | null; away?: number | null } | null; penalty?: { home?: number | null; away?: number | null } | null } | null }
export type NormalizedWorldCupFixture = { apiFixtureId: number; round: WorldCupRound | null; date: string | null; status: WorldCupMatchStatus; home: { apiTeamId: number; name: string; logo: string | null }; away: { apiTeamId: number; name: string; logo: string | null }; homeScore: number | null; awayScore: number | null; homePenaltyScore: number | null; awayPenaltyScore: number | null; winnerApiTeamId: number | null; winnerName: string | null; raw: ApiFootballWorldCupFixture }
type ApiFootballEnvelope<T> = { response?: T[]; errors?: unknown }
function getWorldCupApiKey() { const key = process.env.API_FOOTBALL_KEY || process.env.APISPORTS_FOOTBALL_KEY || process.env.API_SPORTS_KEY || process.env.RAPIDAPI_KEY; if (!key) throw new Error("API_FOOTBALL_KEY/API_SPORTS_KEY/RAPIDAPI_KEY is not configured"); return key }
export function getWorldCupLeagueId() { return process.env.API_FOOTBALL_WORLD_CUP_LEAGUE_ID || process.env.API_SPORTS_WORLD_CUP_LEAGUE_ID || "1" }
async function apiFootballFetch<T>(endpoint: string, params: Record<string, string>): Promise<T[]> {
  const url = new URL(`${BASE_URL}/${endpoint}`); Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const response = await fetch(url.toString(), { headers: { "x-apisports-key": getWorldCupApiKey() }, cache: "no-store" })
  if (!response.ok) throw new Error(`API-Football ${endpoint} failed: ${response.status} ${response.statusText}`)
  const payload = (await response.json()) as ApiFootballEnvelope<T>
  if (payload.errors && Object.keys(payload.errors as Record<string, unknown>).length > 0) throw new Error(`API-Football ${endpoint} returned errors: ${JSON.stringify(payload.errors)}`)
  return payload.response ?? []
}
export async function fetchWorldCupTeams(seasonYear: number) { return apiFootballFetch<ApiFootballWorldCupTeam>("teams", { league: getWorldCupLeagueId(), season: String(seasonYear) }) }
export async function fetchWorldCupFixtures(seasonYear: number) { return apiFootballFetch<ApiFootballWorldCupFixture>("fixtures", { league: getWorldCupLeagueId(), season: String(seasonYear) }) }
export function normalizeWorldCupStatus(short?: string | null, long?: string | null): WorldCupMatchStatus { const c = (short || long || "").toUpperCase(); if (["1H", "2H", "ET", "BT", "P", "LIVE"].includes(c)) return "live"; if (c === "HT") return "halftime"; if (["FT", "AET", "PEN"].includes(c) || long?.toLowerCase() === "match finished") return "final"; if (["PST", "SUSP", "INT"].includes(c)) return "postponed"; if (["CANC", "ABD", "AWD", "WO"].includes(c)) return "cancelled"; return "scheduled" }
export function normalizeWorldCupRound(roundText?: string | null): WorldCupRound | null { const v = (roundText || "").toLowerCase(); if (v.includes("round of 32") || v.includes("1/16")) return "round_of_32"; if (v.includes("round of 16") || v.includes("1/8")) return "round_of_16"; if (v.includes("quarter")) return "quarterfinal"; if (v.includes("semi")) return "semifinal"; if (v.includes("3rd") || v.includes("third")) return "third_place"; if (v.includes("final")) return "final"; return null }
export function normalizeWorldCupFixture(fixture: ApiFootballWorldCupFixture): NormalizedWorldCupFixture {
  const homeScore = fixture.goals?.home ?? fixture.score?.fulltime?.home ?? null, awayScore = fixture.goals?.away ?? fixture.score?.fulltime?.away ?? null, hp = fixture.score?.penalty?.home ?? null, ap = fixture.score?.penalty?.away ?? null
  let winnerApiTeamId: number | null = null, winnerName: string | null = null
  if (fixture.teams.home.winner === true) { winnerApiTeamId = fixture.teams.home.id; winnerName = fixture.teams.home.name }
  else if (fixture.teams.away.winner === true) { winnerApiTeamId = fixture.teams.away.id; winnerName = fixture.teams.away.name }
  else if (hp != null && ap != null && hp !== ap) { const h = hp > ap; winnerApiTeamId = h ? fixture.teams.home.id : fixture.teams.away.id; winnerName = h ? fixture.teams.home.name : fixture.teams.away.name }
  else if (homeScore != null && awayScore != null && homeScore !== awayScore) { const h = homeScore > awayScore; winnerApiTeamId = h ? fixture.teams.home.id : fixture.teams.away.id; winnerName = h ? fixture.teams.home.name : fixture.teams.away.name }
  return { apiFixtureId: fixture.fixture.id, round: normalizeWorldCupRound(fixture.league.round), date: fixture.fixture.date ?? null, status: normalizeWorldCupStatus(fixture.fixture.status?.short, fixture.fixture.status?.long), home: { apiTeamId: fixture.teams.home.id, name: fixture.teams.home.name, logo: fixture.teams.home.logo ?? null }, away: { apiTeamId: fixture.teams.away.id, name: fixture.teams.away.name, logo: fixture.teams.away.logo ?? null }, homeScore, awayScore, homePenaltyScore: hp, awayPenaltyScore: ap, winnerApiTeamId, winnerName, raw: fixture }
}
