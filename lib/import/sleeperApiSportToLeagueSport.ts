import { LeagueSport } from '@prisma/client'

/** Maps Sleeper API `.../leagues/{segment}/{season}` segment to Prisma `LeagueSport`. */
export function sleeperApiSportToLeagueSport(apiSegment: string): LeagueSport {
  switch (apiSegment) {
    case 'nfl':
      return LeagueSport.NFL
    case 'nba':
      return LeagueSport.NBA
    case 'nhl':
      return LeagueSport.NHL
    case 'mlb':
      return LeagueSport.MLB
    case 'mls':
      return LeagueSport.SOCCER
    default:
      return LeagueSport.NFL
  }
}
