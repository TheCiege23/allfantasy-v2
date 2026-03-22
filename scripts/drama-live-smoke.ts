import { prisma } from '../lib/prisma'
import { runLeagueDramaEngine } from '../lib/drama-engine/LeagueDramaEngine'
import { buildTimelineForLeague } from '../lib/drama-engine/DramaTimelineBuilder'
import { getDramaEventById } from '../lib/drama-engine/DramaQueryService'
import { buildDramaNarrative } from '../lib/drama-engine/AIDramaNarrativeAdapter'
import { SUPPORTED_SPORTS } from '../lib/sport-scope'

type SportSmokeResult = {
  sport: string
  status: 'pass' | 'skip' | 'fail'
  message: string
  leagueId?: string
  leagueName?: string
  season?: number | null
  created?: number
  updated?: number
  timelineCount?: number
  firstEventId?: string
  firstEventType?: string
  firstEventScore?: number
  storySource?: string
  storyPreview?: string
}

function preview(text: string | null | undefined, max = 140): string {
  const v = (text ?? '').trim()
  if (!v) return ''
  return v.length > max ? `${v.slice(0, max - 1)}...` : v
}

async function runForSport(sport: string): Promise<SportSmokeResult> {
  const league = await prisma.league.findFirst({
    where: { sport },
    orderBy: { updatedAt: 'desc' },
    select: { id: true, name: true, season: true, sport: true },
  })

  if (!league) {
    return {
      sport,
      status: 'skip',
      message: 'No league found for this sport in local DB.',
    }
  }

  const season = league.season ?? new Date().getUTCFullYear()
  const run = await runLeagueDramaEngine({
    leagueId: league.id,
    sport,
    season,
    replace: false,
  })

  const timeline = await buildTimelineForLeague(league.id, {
    sport,
    season,
    limit: 5,
    offset: 0,
  })

  if (timeline.length === 0) {
    return {
      sport,
      status: 'fail',
      message: 'Engine run succeeded but timeline returned zero events.',
      leagueId: league.id,
      leagueName: league.name ?? undefined,
      season,
      created: run.created,
      updated: run.updated,
      timelineCount: 0,
    }
  }

  const first = timeline[0]!
  const event = await getDramaEventById(first.id)
  if (!event) {
    return {
      sport,
      status: 'fail',
      message: 'Timeline returned event id, but detail lookup failed.',
      leagueId: league.id,
      leagueName: league.name ?? undefined,
      season,
      created: run.created,
      updated: run.updated,
      timelineCount: timeline.length,
      firstEventId: first.id,
    }
  }

  const narrative = await buildDramaNarrative({
    id: event.id,
    leagueId: event.leagueId,
    sport: event.sport,
    season: event.season,
    dramaType: event.dramaType,
    headline: event.headline,
    summary: event.summary,
    relatedManagerIds: event.relatedManagerIds,
    relatedTeamIds: event.relatedTeamIds,
    relatedMatchupId: event.relatedMatchupId,
    dramaScore: event.dramaScore,
    createdAt: event.createdAt,
  })

  return {
    sport,
    status: 'pass',
    message: 'run -> timeline -> detail -> story flow passed.',
    leagueId: league.id,
    leagueName: league.name ?? undefined,
    season,
    created: run.created,
    updated: run.updated,
    timelineCount: timeline.length,
    firstEventId: event.id,
    firstEventType: event.dramaType,
    firstEventScore: Math.round(event.dramaScore),
    storySource: narrative.source,
    storyPreview: preview(narrative.narrative),
  }
}

async function main(): Promise<void> {
  const startedAt = Date.now()
  const results: SportSmokeResult[] = []

  for (const sport of SUPPORTED_SPORTS) {
    try {
      results.push(await runForSport(sport))
    } catch (error) {
      results.push({
        sport,
        status: 'fail',
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const elapsedMs = Date.now() - startedAt
  const pass = results.filter((r) => r.status === 'pass').length
  const skip = results.filter((r) => r.status === 'skip').length
  const fail = results.filter((r) => r.status === 'fail').length

  console.log(JSON.stringify({ pass, skip, fail, elapsedMs, results }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
