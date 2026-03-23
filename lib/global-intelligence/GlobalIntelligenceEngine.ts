/**
 * Global Intelligence Engine — integrates Meta, Simulation, Advisor, Media, Draft into one layer.
 */

import { normalizeToSupportedSport } from '@/lib/sport-scope'
import { prisma } from '@/lib/prisma'
import type {
  GlobalIntelligenceInput,
  GlobalIntelligenceResult,
  MetaIntelligence,
  SimulationIntelligence,
  AdvisorIntelligence,
  MediaIntelligence,
  DraftIntelligence,
  IntelligenceModule,
} from './types'

const DEFAULT_MODULES: IntelligenceModule[] = [
  'meta',
  'simulation',
  'advisor',
  'media',
  'draft',
]

type LeagueContext = {
  sport: string | null
  season: number | null
}

function toPositiveInt(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  const n = Math.trunc(value)
  return n > 0 ? n : undefined
}

async function resolveLeagueContext(leagueId: string): Promise<LeagueContext> {
  try {
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { sport: true, season: true },
    })
    return {
      sport: league?.sport ? normalizeToSupportedSport(league.sport) : null,
      season: typeof league?.season === 'number' ? league.season : null,
    }
  } catch {
    return { sport: null, season: null }
  }
}

export async function getGlobalIntelligence(
  input: GlobalIntelligenceInput
): Promise<GlobalIntelligenceResult> {
  const leagueId = input.leagueId
  const leagueContext = await resolveLeagueContext(leagueId)
  const sport = input.sport
    ? normalizeToSupportedSport(input.sport)
    : leagueContext.sport
  const season =
    toPositiveInt(input.season) ??
    toPositiveInt(leagueContext.season) ??
    new Date().getFullYear()
  const week = toPositiveInt(input.week) ?? 1
  const include = input.include?.length
    ? input.include
    : DEFAULT_MODULES
  const userId = input.userId ?? null

  const result: GlobalIntelligenceResult = {
    leagueId,
    sport,
    meta: null,
    simulation: null,
    advisor: null,
    media: null,
    draft: null,
    generatedAt: new Date().toISOString(),
  }

  const run = include.includes('meta')
    ? (async () => {
        try {
          const { GlobalMetaEngine } = await import('@/lib/global-meta-engine')
          const data = await GlobalMetaEngine.getAIMetaSummary(
            sport ?? undefined,
            undefined,
            '7d'
          )
          const summary =
            typeof data === 'string' ? data : (data as { summary?: string })?.summary ?? null
          const topTrends = (data as { topTrends?: string[] })?.topTrends
          return { summary, topTrends } as MetaIntelligence
        } catch (e) {
          return { summary: null, topTrends: undefined, error: e instanceof Error ? e.message : 'Meta failed' }
        }
      })()
    : Promise.resolve(null)

  const runSim = include.includes('simulation')
    ? (async () => {
        try {
          const { getSimulationAndWarehouseContextForLeague } = await import(
            '@/lib/ai-simulation-integration/AISimulationQueryService'
          )
          const ctx = await getSimulationAndWarehouseContextForLeague(leagueId, {
            season,
            week,
          })
          if (!ctx)
            return {
              playoffOddsSummary: null,
              matchupSummary: null,
              dynastySummary: null,
              warehouseSummary: null,
            } as SimulationIntelligence
          return {
            playoffOddsSummary: ctx.playoffOddsSummary ?? null,
            matchupSummary: ctx.matchupSummary ?? null,
            dynastySummary: ctx.dynastySummary ?? null,
            warehouseSummary: ctx.warehouseSummary ?? null,
          } as SimulationIntelligence
        } catch (e) {
          return {
            playoffOddsSummary: null,
            matchupSummary: null,
            dynastySummary: null,
            warehouseSummary: null,
            error: e instanceof Error ? e.message : 'Simulation failed',
          }
        }
      })()
    : Promise.resolve(null)

  const runAdvisor = include.includes('advisor') && userId
    ? (async () => {
        try {
          const { getLeagueAdvisorAdvice } = await import('@/lib/league-advisor')
          const advice = await getLeagueAdvisorAdvice({ leagueId, userId })
          if (!advice)
            return {
              lineup: [],
              trade: [],
              waiver: [],
              injury: [],
              error: 'No advisor data',
            } as AdvisorIntelligence
          return {
            lineup: advice.lineup.map((x) => ({ summary: x.summary, priority: x.priority })),
            trade: advice.trade.map((x) => ({ summary: x.summary, priority: x.priority })),
            waiver: advice.waiver.map((x) => ({ summary: x.summary, priority: x.priority })),
            injury: advice.injury.map((x) => ({
              summary: x.summary,
              priority: x.priority,
              playerName: x.playerName,
            })),
          } as AdvisorIntelligence
        } catch (e) {
          return {
            lineup: [],
            trade: [],
            waiver: [],
            injury: [],
            error: e instanceof Error ? e.message : 'Advisor failed',
          }
        }
      })()
    : Promise.resolve(null)

  const runMedia = include.includes('media')
    ? (async () => {
        try {
          const { listArticles } = await import('@/lib/sports-media-engine/LeagueMediaEngine')
          const out = await listArticles({
            leagueId,
            sport: sport ?? undefined,
            limit: 5,
          })
          const articles = (out.articles ?? []).map((a: { id: string; headline: string; tags?: string[]; createdAt?: Date }) => ({
            id: a.id,
            headline: a.headline,
            tags: a.tags,
            createdAt: a.createdAt?.toISOString?.(),
          }))
          return { articles } as MediaIntelligence
        } catch (e) {
          return {
            articles: [],
            error: e instanceof Error ? e.message : 'Media failed',
          }
        }
      })()
    : Promise.resolve(null)

  const runDraft = include.includes('draft')
    ? (async () => {
        try {
          const { getInsightContext } = await import(
            '@/lib/ai-simulation-integration/AIInsightRouter'
          )
          const context = await getInsightContext(leagueId, 'draft', {
            sport: sport ?? undefined,
            season,
            week,
          })
          return { context: context || null } as DraftIntelligence
        } catch (e) {
          return {
            context: null,
            error: e instanceof Error ? e.message : 'Draft intelligence failed',
          }
        }
      })()
    : Promise.resolve(null)

  const [meta, simulation, advisor, media, draft] = await Promise.all([
    run,
    runSim,
    runAdvisor,
    runMedia,
    runDraft,
  ])

  result.meta = meta
  result.simulation = simulation
  result.advisor = advisor
  result.media = media
  result.draft = draft

  return result
}
