import { makeExecutableSchema } from '@graphql-tools/schema'
import { resolvers } from '@/graphql/resolvers'

export const typeDefs = /* GraphQL */ `
  scalar JSON

  enum LeagueSport {
    NFL
    MLB
    NBA
    NHL
    NCAAF
    NCAAB
    SOCCER
  }

  type SportsVenue {
    arena: String
    city: String
    state: String
    dome: Boolean
  }

  type ScheduleGame {
    gameId: String!
    awayTeam: String!
    homeTeam: String!
    date: String!
    status: String!
    season: String!
    venue: SportsVenue
  }

  type SportsDataTeam {
    id: String!
    name: String!
    abbr: String!
    sport: LeagueSport!
    mascot: String
    logoUrl: String
  }

  type Query {
    supportedSports: [LeagueSport!]!
    teamsBySport(sport: LeagueSport!): [SportsDataTeam!]!
    schedulesBySport(sport: LeagueSport!, season: String, limit: Int): [ScheduleGame!]!
    rosterBySport(
      sport: LeagueSport!
      season: String
      teamId: String
      playerName: String
      limit: Int
    ): [JSON!]!
    liveGamesBySport(sport: LeagueSport!, limit: Int): [ScheduleGame!]!
  }
`

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
})
