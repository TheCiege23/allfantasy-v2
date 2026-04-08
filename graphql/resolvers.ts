import { GraphQLScalarType, Kind } from 'graphql'
import type { SportsGraphQLContext } from '@/graphql/context'

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON (roster rows from Rolling Insights)',
  serialize(value: unknown) {
    return value
  },
  parseValue(value: unknown) {
    return value
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      try {
        return JSON.parse(ast.value) as unknown
      } catch {
        return ast.value
      }
    }
    return null
  },
})

export const resolvers = {
  JSON: JSONScalar,
  Query: {
    supportedSports(_: unknown, __: unknown, ctx: SportsGraphQLContext) {
      return ctx.sports.supportedSports()
    },
    teamsBySport(
      _: unknown,
      args: { sport: string },
      ctx: SportsGraphQLContext
    ) {
      return ctx.sports.getTeamsBySport(args.sport)
    },
    schedulesBySport(
      _: unknown,
      args: { sport: string; season?: string | null; limit?: number | null },
      ctx: SportsGraphQLContext
    ) {
      return ctx.sports.getSchedulesBySport(args.sport, {
        season: args.season ?? undefined,
        limit: args.limit ?? undefined,
      })
    },
    rosterBySport(
      _: unknown,
      args: {
        sport: string
        season?: string | null
        teamId?: string | null
        playerName?: string | null
        limit?: number | null
      },
      ctx: SportsGraphQLContext
    ) {
      return ctx.sports.getRosterBySport(args.sport, {
        season: args.season ?? undefined,
        teamId: args.teamId ?? undefined,
        playerName: args.playerName ?? undefined,
        limit: args.limit ?? undefined,
      })
    },
    liveGamesBySport(
      _: unknown,
      args: { sport: string; limit?: number | null },
      ctx: SportsGraphQLContext
    ) {
      return ctx.sports.getLiveGameBySport(args.sport, args.limit ?? 10)
    },
  },
}
