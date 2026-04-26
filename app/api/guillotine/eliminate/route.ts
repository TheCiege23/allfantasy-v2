import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireCronAuth } from '@/app/api/cron/_auth'
import { runEliminationCheck } from '@/lib/guillotine/eliminationEngine'
import { requireCommissionerRole } from '@/lib/league/permissions'
import { isChopDay } from '@/lib/guillotine/sportConfig'
import { postGuillotineEliminationToChat } from '@/lib/guillotine/guillotineChatPoster'
import { queueLeagueEventVideo } from '@/lib/fantasy-media/EventVideoAutomation'
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function queueGuillotineEliminationVideos(args: {
  actorUserId: string
  leagueId: string
  leagueName: string
  sport: string
  scoringPeriod: number
  seasonId: string
  eliminated: {
    rosterId: string
    score: number
    teamName: string | null
    marginBelowSafe: number
    wasTiebreaker: boolean
    playersReleased: number
  }[]
  trigger: 'cron' | 'manual'
}): Promise<void> {
  const {
    actorUserId,
    leagueId,
    leagueName,
    sport,
    scoringPeriod,
    seasonId,
    eliminated,
    trigger,
  } = args
  if (!actorUserId || eliminated.length === 0) return

  for (const elim of eliminated) {
    const teamName = elim.teamName?.trim() || 'A team'
    const tieNote = elim.wasTiebreaker ? ' The tiebreaker decided the chop.' : ''
    const script = [
      `Guillotine alert from ${leagueName}.`,
      `${teamName} was chopped in period ${scoringPeriod} with ${elim.score.toFixed(1)} points.`,
      `They finished ${elim.marginBelowSafe.toFixed(1)} points below the safe line.${tieNote}`,
      `${elim.playersReleased} player(s) were released back into waivers.`,
    ].join(' ')

    const title = `${leagueName} · Guillotine Chop · ${teamName}`
    await queueLeagueEventVideo({
      userId: actorUserId,
      leagueId,
      leagueName,
      sport,
      title,
      script,
      contentType: 'league_recap',
      eventType: 'guillotine_elimination',
      eventPayload: {
        seasonId,
        scoringPeriod,
        rosterId: elim.rosterId,
        teamName,
        score: elim.score,
        marginBelowSafe: elim.marginBelowSafe,
        wasTiebreaker: elim.wasTiebreaker,
        playersReleased: elim.playersReleased,
        trigger,
      },
    })
  }
}

/**
 * Vercel cron calls GET with no query string — sweep active guillotine seasons using each linked RedraftSeason.currentWeek.
 */
async function sweepActiveGuillotineSeasons() {
  const seasons = await prisma.guillotineSeason.findMany({
    where: {
      status: { notIn: ['setup', 'complete'] },
      redraftSeasonId: { not: null },
    },
    include: {
      redraftSeason: true,
      league: { select: { userId: true, name: true, sport: true } },
    },
  })

  const results: {
    seasonId: string
    scoringPeriod: number
    skipped?: boolean
    eliminated?: number
    error?: string
  }[] = []

  for (const g of seasons) {
    const rs = g.redraftSeason
    if (!rs) continue

    // Only run elimination on the sport's chop day
    const sport = g.sport ?? 'NFL'
    if (!isChopDay(sport)) {
      results.push({ seasonId: g.id, scoringPeriod: 0, skipped: true })
      continue
    }

    const scoringPeriod = Math.max(1, rs.currentWeek || g.currentScoringPeriod || 1)
    try {
      const out = await runEliminationCheck(g.id, scoringPeriod, { skipIfAlreadyProcessed: true })
      const eliminated = out.eliminated

      // Post elimination to league chat
      if (eliminated.length > 0) {
        for (const elim of eliminated) {
          await postGuillotineEliminationToChat(
            g.leagueId,
            elim.teamName ?? 'Unknown',
            elim.score ?? 0,
            scoringPeriod,
            elim.marginBelowSafe ?? 0,
            elim.wasTiebreaker ?? false,
            elim.playersReleased ?? 0,
          ).catch(() => {})
        }

        const uiSettings = await getDraftUISettingsForLeague(g.leagueId).catch(() => null)
        if (uiSettings?.guillotineAutoHeyGenEnabled ?? true) {
          await queueGuillotineEliminationVideos({
            actorUserId: g.league?.userId ?? '',
            leagueId: g.leagueId,
            leagueName: g.league?.name?.trim() || 'Guillotine League',
            sport: String(g.league?.sport ?? g.sport ?? 'nfl'),
            scoringPeriod,
            seasonId: g.id,
            eliminated,
            trigger: 'cron',
          }).catch(() => {})
        }
      }

      results.push({
        seasonId: g.id,
        scoringPeriod,
        skipped: out.skipped,
        eliminated: eliminated.length,
      })
    } catch (e) {
      results.push({
        seasonId: g.id,
        scoringPeriod,
        error: e instanceof Error ? e.message : String(e),
      })
    }
  }

  return { ok: true as const, swept: seasons.length, results }
}

export async function GET(req: NextRequest) {
  if (!requireCronAuth(req, 'CRON_SECRET')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const seasonId = req.nextUrl.searchParams?.get('seasonId')?.trim()
  const sp = Number(req.nextUrl.searchParams?.get('scoringPeriod'))
  if (seasonId && Number.isFinite(sp)) {
    const out = await runEliminationCheck(seasonId, sp, { skipIfAlreadyProcessed: true })
    return NextResponse.json({ ok: true, seasonId, scoringPeriod: sp, ...out })
  }
  return NextResponse.json(await sweepActiveGuillotineSeasons())
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { seasonId?: string; scoringPeriod?: number }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }
  if (!body.seasonId || body.scoringPeriod == null) {
    return NextResponse.json({ error: 'seasonId and scoringPeriod required' }, { status: 400 })
  }

  const g = await prisma.guillotineSeason.findFirst({
    where: { id: body.seasonId },
    include: {
      league: { select: { name: true, sport: true } },
    },
  })
  if (!g) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    await requireCommissionerRole(g.leagueId, userId)
  } catch (err) {
    if (err instanceof Response) {
      const responseText = await err.text().catch(() => '')
      return new NextResponse(responseText || 'Forbidden', {
        status: err.status,
        headers: { 'content-type': err.headers.get('content-type') ?? 'text/plain' },
      })
    }
    throw err
  }

  const out = await runEliminationCheck(body.seasonId, body.scoringPeriod, {
    skipIfAlreadyProcessed: false,
  })

  if (out.eliminated.length > 0) {
    const uiSettings = await getDraftUISettingsForLeague(g.leagueId).catch(() => null)
    if (uiSettings?.guillotineAutoHeyGenEnabled ?? true) {
      await queueGuillotineEliminationVideos({
        actorUserId: userId,
        leagueId: g.leagueId,
        leagueName: g.league?.name?.trim() || 'Guillotine League',
        sport: String(g.league?.sport ?? g.sport ?? 'nfl'),
        scoringPeriod: body.scoringPeriod,
        seasonId: g.id,
        eliminated: out.eliminated,
        trigger: 'manual',
      })
    }
  }

  return NextResponse.json(out)
}

