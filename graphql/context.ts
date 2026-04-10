import { sportsDataService } from '@/lib/sports/SportsDataService'

export type SportsGraphQLContext = {
  sports: typeof sportsDataService
}

export function createSportsGraphQLContext(): SportsGraphQLContext {
  return { sports: sportsDataService }
}
