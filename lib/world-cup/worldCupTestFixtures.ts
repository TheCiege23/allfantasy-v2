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
    apiStatusShort: "TEST"
  }
}

/**
 * 32 demo World Cup teams with stable test IDs.
 */
export const WORLD_CUP_DEMO_TEAMS: WorldCupDemoTeam[] = [
  { id: "demo_team_brazil", name: "Brazil", fifaCode: "BRA", flagUrl: "https://flagcdn.com/w80/br.png", seed: 1 },
  { id: "demo_team_argentina", name: "Argentina", fifaCode: "ARG", flagUrl: "https://flagcdn.com/w80/ar.png", seed: 2 },
  { id: "demo_team_france", name: "France", fifaCode: "FRA", flagUrl: "https://flagcdn.com/w80/fr.png", seed: 3 },
  { id: "demo_team_england", name: "England", fifaCode: "ENG", flagUrl: "https://flagcdn.com/w80/gb-eng.png", seed: 4 },
  { id: "demo_team_spain", name: "Spain", fifaCode: "ESP", flagUrl: "https://flagcdn.com/w80/es.png", seed: 5 },
  { id: "demo_team_portugal", name: "Portugal", fifaCode: "POR", flagUrl: "https://flagcdn.com/w80/pt.png", seed: 6 },
  { id: "demo_team_germany", name: "Germany", fifaCode: "GER", flagUrl: "https://flagcdn.com/w80/de.png", seed: 7 },
  { id: "demo_team_netherlands", name: "Netherlands", fifaCode: "NED", flagUrl: "https://flagcdn.com/w80/nl.png", seed: 8 },
  { id: "demo_team_usa", name: "USA", fifaCode: "USA", flagUrl: "https://flagcdn.com/w80/us.png", seed: 9 },
  { id: "demo_team_mexico", name: "Mexico", fifaCode: "MEX", flagUrl: "https://flagcdn.com/w80/mx.png", seed: 10 },
  { id: "demo_team_canada", name: "Canada", fifaCode: "CAN", flagUrl: "https://flagcdn.com/w80/ca.png", seed: 11 },
  { id: "demo_team_japan", name: "Japan", fifaCode: "JPN", flagUrl: "https://flagcdn.com/w80/jp.png", seed: 12 },
  { id: "demo_team_south_korea", name: "South Korea", fifaCode: "KOR", flagUrl: "https://flagcdn.com/w80/kr.png", seed: 13 },
  { id: "demo_team_morocco", name: "Morocco", fifaCode: "MAR", flagUrl: "https://flagcdn.com/w80/ma.png", seed: 14 },
  { id: "demo_team_senegal", name: "Senegal", fifaCode: "SEN", flagUrl: "https://flagcdn.com/w80/sn.png", seed: 15 },
  { id: "demo_team_uruguay", name: "Uruguay", fifaCode: "URU", flagUrl: "https://flagcdn.com/w80/uy.png", seed: 16 },
  { id: "demo_team_colombia", name: "Colombia", fifaCode: "COL", flagUrl: "https://flagcdn.com/w80/co.png", seed: 17 },
  { id: "demo_team_belgium", name: "Belgium", fifaCode: "BEL", flagUrl: "https://flagcdn.com/w80/be.png", seed: 18 },
  { id: "demo_team_croatia", name: "Croatia", fifaCode: "CRO", flagUrl: "https://flagcdn.com/w80/hr.png", seed: 19 },
  { id: "demo_team_switzerland", name: "Switzerland", fifaCode: "SUI", flagUrl: "https://flagcdn.com/w80/ch.png", seed: 20 },
  { id: "demo_team_denmark", name: "Denmark", fifaCode: "DEN", flagUrl: "https://flagcdn.com/w80/dk.png", seed: 21 },
  { id: "demo_team_sweden", name: "Sweden", fifaCode: "SWE", flagUrl: "https://flagcdn.com/w80/se.png", seed: 22 },
  { id: "demo_team_ghana", name: "Ghana", fifaCode: "GHA", flagUrl: "https://flagcdn.com/w80/gh.png", seed: 23 },
  { id: "demo_team_nigeria", name: "Nigeria", fifaCode: "NGA", flagUrl: "https://flagcdn.com/w80/ng.png", seed: 24 },
  { id: "demo_team_australia", name: "Australia", fifaCode: "AUS", flagUrl: "https://flagcdn.com/w80/au.png", seed: 25 },
  { id: "demo_team_new_zealand", name: "New Zealand", fifaCode: "NZL", flagUrl: "https://flagcdn.com/w80/nz.png", seed: 26 },
  { id: "demo_team_iran", name: "Iran", fifaCode: "IRN", flagUrl: "https://flagcdn.com/w80/ir.png", seed: 27 },
  { id: "demo_team_saudi_arabia", name: "Saudi Arabia", fifaCode: "KSA", flagUrl: "https://flagcdn.com/w80/sa.png", seed: 28 },
  { id: "demo_team_tunisia", name: "Tunisia", fifaCode: "TUN", flagUrl: "https://flagcdn.com/w80/tn.png", seed: 29 },
  { id: "demo_team_ecuador", name: "Ecuador", fifaCode: "ECU", flagUrl: "https://flagcdn.com/w80/ec.png", seed: 30 },
  { id: "demo_team_paraguay", name: "Paraguay", fifaCode: "PAR", flagUrl: "https://flagcdn.com/w80/py.png", seed: 31 },
  { id: "demo_team_south_africa", name: "South Africa", fifaCode: "RSA", flagUrl: "https://flagcdn.com/w80/za.png", seed: 32 },
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
        startsAt: match.startsAt ? new Date(match.startsAt) : getWorldCupDemoStartTime(i),
        apiStatusShort: "TEST",
      },
    })
  }

  return patches
}
