import type { IExternalScheduleMapper } from '../../mappers/ExternalScheduleMapper'
import type { NormalizedMatchup } from '../../types'
import type { SleeperImportPayload } from './types'

/** Group Sleeper matchups by matchup_id so we have roster_id_1 vs roster_id_2. */
function pairMatchups(matchups: { roster_id: number; matchup_id: number; points: number }[]) {
  const byMatchup: Record<number, { roster_id: number; points: number }[]> = {}
  matchups.forEach((m) => {
    if (!byMatchup[m.matchup_id]) byMatchup[m.matchup_id] = []
    byMatchup[m.matchup_id].push({ roster_id: m.roster_id, points: m.points })
  })
  return Object.values(byMatchup).map((pair) => {
    const [a, b] = pair
    return {
      roster_id_1: String(a?.roster_id ?? ''),
      roster_id_2: String(b?.roster_id ?? ''),
      points_1: a?.points,
      points_2: b?.points,
    }
  })
}

export const SleeperScheduleMapper: IExternalScheduleMapper<SleeperImportPayload> = {
  map(source) {
    const byWeek = source.matchupsByWeek ?? []
    const season = source.league?.season ? parseInt(source.league.season, 10) : new Date().getFullYear()
    return byWeek.map(({ week, matchups }) => ({
      week,
      season: Number.isNaN(season) ? new Date().getFullYear() : season,
      matchups: pairMatchups(matchups),
    }))
  },
}
