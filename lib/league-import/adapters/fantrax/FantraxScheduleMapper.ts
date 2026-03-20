import type { IExternalScheduleMapper } from '../../mappers/ExternalScheduleMapper'
import type { NormalizedMatchup } from '../../types'
import type { FantraxImportPayload } from './types'

export const FantraxScheduleMapper: IExternalScheduleMapper<FantraxImportPayload> = {
  map(source) {
    return source.schedule.map((week) => {
      return {
        week: week.week,
        season: week.season,
        matchups: week.matchups.map((matchup) => ({
          roster_id_1: matchup.teamId1,
          roster_id_2: matchup.teamId2,
          points_1: matchup.points1,
          points_2: matchup.points2,
        })),
      } satisfies NormalizedMatchup
    })
  },
}
