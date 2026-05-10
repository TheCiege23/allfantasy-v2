/**
 * Demo/test fixture data for World Cup bracket testing.
 * Used before real World Cup fixtures are synced from API.
 */

type MatchLike = {
  id: string
  round: string
  roundIndex?: number | null
  matchNumber: number
  homeTeamId?: string | null
  awayTeamId?: string | null
  homeTeamName?: string | null
  awayTeamName?: string | null
  homeTeamLogo?: string | null
  awayTeamLogo?: string | null
  status?: string | null
  startsAt?: Date | string | null
}

export interface WorldCupDemoTeam {
  id: string
  name: string
  fifaCode: string
  flagUrl: string
  groupName: string
  seed: number
}

export type WorldCupDemoFixturePatch = {
  matchId: string
  home: WorldCupDemoTeam
  away: WorldCupDemoTeam
  data: {
    homeTeamId: string
    homeTeamName: string
    homeTeamLogo: string
    awayTeamId: string
    awayTeamName: string
    awayTeamLogo: string
    status: "scheduled"
    startsAt: Date
    venueName: string
    venueCity: string
    apiStatusShort: "TEST"
  }
}

/**
 * 32 demo World Cup teams with stable test IDs.
 */
export const WORLD_CUP_DEMO_TEAMS: WorldCupDemoTeam[] = [
  { id: "demo_team_brazil", name: "Brazil", fifaCode: "BRA", flagUrl: "https://flagcdn.com/w80/br.png", groupName: "A", seed: 1 },
  { id: "demo_team_argentina", name: "Argentina", fifaCode: "ARG", flagUrl: "https://flagcdn.com/w80/ar.png", groupName: "A", seed: 2 },
  { id: "demo_team_france", name: "France", fifaCode: "FRA", flagUrl: "https://flagcdn.com/w80/fr.png", groupName: "B", seed: 3 },
  { id: "demo_team_england", name: "England", fifaCode: "ENG", flagUrl: "https://flagcdn.com/w80/gb-eng.png", groupName: "B", seed: 4 },
  { id: "demo_team_spain", name: "Spain", fifaCode: "ESP", flagUrl: "https://flagcdn.com/w80/es.png", groupName: "C", seed: 5 },
  { id: "demo_team_portugal", name: "Portugal", fifaCode: "POR", flagUrl: "https://flagcdn.com/w80/pt.png", groupName: "C", seed: 6 },
  { id: "demo_team_germany", name: "Germany", fifaCode: "GER", flagUrl: "https://flagcdn.com/w80/de.png", groupName: "D", seed: 7 },
  { id: "demo_team_netherlands", name: "Netherlands", fifaCode: "NED", flagUrl: "https://flagcdn.com/w80/nl.png", groupName: "D", seed: 8 },
  { id: "demo_team_usa", name: "USA", fifaCode: "USA", flagUrl: "https://flagcdn.com/w80/us.png", groupName: "E", seed: 9 },
  { id: "demo_team_mexico", name: "Mexico", fifaCode: "MEX", flagUrl: "https://flagcdn.com/w80/mx.png", groupName: "E", seed: 10 },
  { id: "demo_team_canada", name: "Canada", fifaCode: "CAN", flagUrl: "https://flagcdn.com/w80/ca.png", groupName: "F", seed: 11 },
  { id: "demo_team_japan", name: "Japan", fifaCode: "JPN", flagUrl: "https://flagcdn.com/w80/jp.png", groupName: "F", seed: 12 },
  { id: "demo_team_south_korea", name: "South Korea", fifaCode: "KOR", flagUrl: "https://flagcdn.com/w80/kr.png", groupName: "G", seed: 13 },
  { id: "demo_team_morocco", name: "Morocco", fifaCode: "MAR", flagUrl: "https://flagcdn.com/w80/ma.png", groupName: "G", seed: 14 },
  { id: "demo_team_senegal", name: "Senegal", fifaCode: "SEN", flagUrl: "https://flagcdn.com/w80/sn.png", groupName: "H", seed: 15 },
  { id: "demo_team_uruguay", name: "Uruguay", fifaCode: "URU", flagUrl: "https://flagcdn.com/w80/uy.png", groupName: "H", seed: 16 },
  { id: "demo_team_colombia", name: "Colombia", fifaCode: "COL", flagUrl: "https://flagcdn.com/w80/co.png", groupName: "I", seed: 17 },
  { id: "demo_team_belgium", name: "Belgium", fifaCode: "BEL", flagUrl: "https://flagcdn.com/w80/be.png", groupName: "I", seed: 18 },
  { id: "demo_team_croatia", name: "Croatia", fifaCode: "CRO", flagUrl: "https://flagcdn.com/w80/hr.png", groupName: "J", seed: 19 },
  { id: "demo_team_switzerland", name: "Switzerland", fifaCode: "SUI", flagUrl: "https://flagcdn.com/w80/ch.png", groupName: "J", seed: 20 },
  { id: "demo_team_denmark", name: "Denmark", fifaCode: "DEN", flagUrl: "https://flagcdn.com/w80/dk.png", groupName: "K", seed: 21 },
  { id: "demo_team_sweden", name: "Sweden", fifaCode: "SWE", flagUrl: "https://flagcdn.com/w80/se.png", groupName: "K", seed: 22 },
  { id: "demo_team_ghana", name: "Ghana", fifaCode: "GHA", flagUrl: "https://flagcdn.com/w80/gh.png", groupName: "L", seed: 23 },
  { id: "demo_team_nigeria", name: "Nigeria", fifaCode: "NGA", flagUrl: "https://flagcdn.com/w80/ng.png", groupName: "L", seed: 24 },
  { id: "demo_team_australia", name: "Australia", fifaCode: "AUS", flagUrl: "https://flagcdn.com/w80/au.png", groupName: "A", seed: 25 },
  { id: "demo_team_new_zealand", name: "New Zealand", fifaCode: "NZL", flagUrl: "https://flagcdn.com/w80/nz.png", groupName: "B", seed: 26 },
  { id: "demo_team_iran", name: "Iran", fifaCode: "IRN", flagUrl: "https://flagcdn.com/w80/ir.png", groupName: "C", seed: 27 },
  { id: "demo_team_saudi_arabia", name: "Saudi Arabia", fifaCode: "KSA", flagUrl: "https://flagcdn.com/w80/sa.png", groupName: "D", seed: 28 },
  { id: "demo_team_tunisia", name: "Tunisia", fifaCode: "TUN", flagUrl: "https://flagcdn.com/w80/tn.png", groupName: "E", seed: 29 },
  { id: "demo_team_ecuador", name: "Ecuador", fifaCode: "ECU", flagUrl: "https://flagcdn.com/w80/ec.png", groupName: "F", seed: 30 },
  { id: "demo_team_paraguay", name: "Paraguay", fifaCode: "PAR", flagUrl: "https://flagcdn.com/w80/py.png", groupName: "G", seed: 31 },
  { id: "demo_team_south_africa", name: "South Africa", fifaCode: "RSA", flagUrl: "https://flagcdn.com/w80/za.png", groupName: "H", seed: 32 },
]

const WORLD_CUP_DEMO_VENUES = [
  { venueName: "MetLife Stadium", venueCity: "East Rutherford" },
  { venueName: "AT&T Stadium", venueCity: "Arlington" },
  { venueName: "SoFi Stadium", venueCity: "Inglewood" },
  { venueName: "Mercedes-Benz Stadium", venueCity: "Atlanta" },
  { venueName: "Lumen Field", venueCity: "Seattle" },
  { venueName: "BC Place", venueCity: "Vancouver" },
  { venueName: "Estadio Azteca", venueCity: "Mexico City" },
  { venueName: "BMO Field", venueCity: "Toronto" },
]

export function getWorldCupDemoStartTime(matchIndex: number): Date {
  const now = new Date()
  const daysFromNow = Math.floor(matchIndex / 8) + 1
  const hourOffset = (matchIndex % 8) * 2
  const start = new Date(now)
  start.setDate(start.getDate() + daysFromNow)
  start.setHours(12 + hourOffset, 0, 0, 0)
  return start
}

function getFutureSafeWorldCupDemoStartTime(
  candidate: Date | string | null | undefined,
  matchIndex: number
): Date {
  const fallback = getWorldCupDemoStartTime(matchIndex)
  if (!candidate) return fallback

  const parsed = new Date(candidate)
  if (Number.isNaN(parsed.getTime())) return fallback

  // Keep existing fixture times only when they are still safely in the future.
  const minFuture = Date.now() + 30 * 60 * 1000
  if (parsed.getTime() <= minFuture) return fallback

  return parsed
}

function isRoundOf32(match: MatchLike): boolean {
  if (match.round === "round_of_32") return true
  return Number(match.roundIndex ?? 0) === 1
}

/**
 * Assigns demo teams to the first 16 round-of-32 matches only.
 * Later rounds are intentionally left unresolved.
 */
export function buildWorldCupDemoRoundOf32Fixtures(matches: MatchLike[]): WorldCupDemoFixturePatch[] {
  const firstRound = matches
    .filter((m) => isRoundOf32(m))
    .sort((a, b) => a.matchNumber - b.matchNumber)
    .slice(0, 16)

  const patches: WorldCupDemoFixturePatch[] = []

  for (let i = 0; i < firstRound.length; i++) {
    const match = firstRound[i]
    const home = WORLD_CUP_DEMO_TEAMS[i * 2]
    const away = WORLD_CUP_DEMO_TEAMS[i * 2 + 1]
    const venue = WORLD_CUP_DEMO_VENUES[i % WORLD_CUP_DEMO_VENUES.length]
    if (!home || !away) break

    patches.push({
      matchId: match.id,
      home,
      away,
      data: {
        homeTeamId: home.id,
        homeTeamName: home.name,
        homeTeamLogo: home.flagUrl,
        awayTeamId: away.id,
        awayTeamName: away.name,
        awayTeamLogo: away.flagUrl,
        status: "scheduled",
        startsAt: getFutureSafeWorldCupDemoStartTime(match.startsAt, i),
        venueName: venue.venueName,
        venueCity: venue.venueCity,
        apiStatusShort: "TEST",
      },
    })
  }

  return patches
}
