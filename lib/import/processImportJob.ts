import { LeagueSport, Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'
import { calculateAndSaveRank } from '@/lib/rank/calculateRank'

import { sendImportCompleteNotification } from '@/lib/import/sendNotification'

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

type SeasonSummaryRow = {
  season: number
  leagues: number
  wins: number
  losses: number
  championships: number
  xp: number
}

/**
 * Phased NFL Sleeper import: one season at a time, rank recalc after each season with data.
 */
export async function processImportJob(
  jobId: string,
  appUserId: string,
  sleeperUserId: string,
  seasons: number[],
): Promise<void> {
  let totalLeaguesSaved = 0
  const seasonsSummary: SeasonSummaryRow[] = []

  for (let i = 0; i < seasons.length; i++) {
    const season = seasons[i]
    const progress = seasons.length > 0 ? Math.round((i / seasons.length) * 100) : 0

    await prisma.legacyImportJob.update({
      where: { id: jobId },
      data: {
        status: 'running',
        progress,
        currentSeason: season,
        seasonsCompleted: i,
      },
    })

    await prisma.importJobSeason.upsert({
      where: { jobId_season: { jobId, season } },
      update: { status: 'processing', startedAt: new Date() },
      create: { jobId, season, status: 'processing', startedAt: new Date() },
    })

    try {
      const leagueRes = await fetch(
        `https://api.sleeper.app/v1/user/${encodeURIComponent(sleeperUserId)}/leagues/nfl/${season}`,
        { headers: { 'User-Agent': 'AllFantasy/1.0', Accept: 'application/json' } },
      )
      const sleeperLeagues: unknown = leagueRes.ok ? await leagueRes.json() : []
      if (!Array.isArray(sleeperLeagues) || sleeperLeagues.length === 0) {
        await prisma.importJobSeason.update({
          where: { jobId_season: { jobId, season } },
          data: { status: 'empty', completedAt: new Date() },
        })
        await sleep(300)
        continue
      }

      let seasonWins = 0
      let seasonLosses = 0
      let seasonChamps = 0
      let seasonPlayoffs = 0
      let savedCount = 0

      for (const league of sleeperLeagues as Array<{
        league_id?: string
        name?: string
        total_rosters?: number
        settings?: { playoff_teams?: number; num_teams?: number }
      }>) {
        try {
          const rosterRes = await fetch(
            `https://api.sleeper.app/v1/league/${encodeURIComponent(String(league.league_id))}/rosters`,
            { headers: { 'User-Agent': 'AllFantasy/1.0', Accept: 'application/json' } },
          )
          const rosters: unknown = rosterRes.ok ? await rosterRes.json() : []
          const mine = Array.isArray(rosters)
            ? rosters.find((r: { owner_id?: string; co_owners?: string[]; settings?: Record<string, unknown> }) => {
                const oid = r?.owner_id != null ? String(r.owner_id) : ''
                const co = Array.isArray(r?.co_owners) ? r.co_owners.map(String) : []
                return oid === sleeperUserId || co.includes(sleeperUserId)
              })
            : null

          const totalTeams =
            typeof league.total_rosters === 'number' && league.total_rosters >= 1
              ? league.total_rosters
              : typeof league.settings?.num_teams === 'number' && league.settings.num_teams >= 1
                ? league.settings.num_teams
                : 12
          const playoffTeams =
            typeof league.settings?.playoff_teams === 'number' && league.settings.playoff_teams >= 1
              ? league.settings.playoff_teams
              : Math.max(1, Math.ceil(totalTeams / 3))

          const settings = (mine?.settings ?? {}) as Record<string, unknown>
          const finalStandingRaw = settings.final_standing ?? settings.rank
          const finalStanding =
            typeof finalStandingRaw === 'number' && Number.isFinite(finalStandingRaw)
              ? finalStandingRaw
              : finalStandingRaw != null
                ? parseInt(String(finalStandingRaw), 10)
                : null
          const wins = typeof settings.wins === 'number' ? settings.wins : Number(settings.wins ?? 0) || 0
          const losses = typeof settings.losses === 'number' ? settings.losses : Number(settings.losses ?? 0) || 0
          const ties = typeof settings.ties === 'number' ? settings.ties : Number(settings.ties ?? 0) || 0
          const madePlayoffs =
            finalStanding != null && Number.isFinite(finalStanding) ? finalStanding <= playoffTeams : false
          const wonChampionship = finalStanding === 1

          const platformLeagueId = String(league.league_id ?? '')
          const fpts =
            typeof settings.fpts === 'number'
              ? settings.fpts
              : typeof settings.fpts_decimal === 'number'
                ? settings.fpts_decimal
                : null

          await prisma.league.upsert({
            where: {
              userId_platform_platformLeagueId_season: {
                userId: appUserId,
                platform: 'sleeper',
                platformLeagueId,
                season,
              },
            },
            update: {
              name: league.name ?? 'Unnamed League',
              leagueSize: totalTeams,
              sport: LeagueSport.NFL,
              importWins: wins,
              importLosses: losses,
              importTies: ties,
              importMadePlayoffs: madePlayoffs,
              importWonChampionship: wonChampionship,
              importFinalStanding: finalStanding,
              importPointsFor: fpts,
            },
            create: {
              userId: appUserId,
              platform: 'sleeper',
              platformLeagueId,
              name: league.name ?? 'Unnamed League',
              season,
              leagueSize: totalTeams,
              sport: LeagueSport.NFL,
              importWins: wins,
              importLosses: losses,
              importTies: ties,
              importMadePlayoffs: madePlayoffs,
              importWonChampionship: wonChampionship,
              importFinalStanding: finalStanding,
              importPointsFor: fpts,
            },
          })

          seasonWins += wins
          seasonLosses += losses
          if (wonChampionship) seasonChamps++
          if (madePlayoffs) seasonPlayoffs++
          savedCount++
          totalLeaguesSaved++
        } catch (leagueErr: unknown) {
          console.error(`[import] league ${String(league.league_id)} error:`, leagueErr)
        }
      }

      const rankResult = await calculateAndSaveRank(appUserId)
      const xpNow = rankResult?.xpTotal ?? 0

      await prisma.importJobSeason.update({
        where: { jobId_season: { jobId, season } },
        data: {
          status: 'complete',
          leagueCount: savedCount,
          wins: seasonWins,
          losses: seasonLosses,
          championships: seasonChamps,
          playoffApps: seasonPlayoffs,
          xpEarned: xpNow,
          rankAfter: rankResult?.rankTier ?? null,
          levelAfter: rankResult?.xpLevel ?? null,
          completedAt: new Date(),
        },
      })

      seasonsSummary.push({
        season,
        leagues: savedCount,
        wins: seasonWins,
        losses: seasonLosses,
        championships: seasonChamps,
        xp: xpNow,
      })

      await prisma.legacyImportJob.update({
        where: { id: jobId },
        data: {
          totalLeaguesSaved,
          seasonsCompleted: i + 1,
          currentSeasonLeagues: savedCount,
          lastRankTier: rankResult?.rankTier ?? null,
          lastRankLevel: rankResult?.xpLevel ?? null,
          lastXpTotal: xpNow,
          seasonsSummary: seasonsSummary as unknown as Prisma.InputJsonValue,
        },
      })
    } catch (seasonErr: unknown) {
      console.error(`[import] season ${season} error:`, seasonErr)
      await prisma.importJobSeason.update({
        where: { jobId_season: { jobId, season } },
        data: { status: 'error', completedAt: new Date() },
      })
    }

    await sleep(300)
  }

  await prisma.legacyImportJob.update({
    where: { id: jobId },
    data: {
      status: 'complete',
      progress: 100,
      completedAt: new Date(),
      totalLeaguesSaved,
      seasonsCompleted: seasons.length,
    },
  })

  await sendImportCompleteNotification(appUserId, jobId)
}
