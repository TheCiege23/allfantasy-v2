import 'server-only'

import { prisma } from '@/lib/prisma'
import { SUPPORTED_SPORTS, normalizeToSupportedSport, type SupportedSport } from '@/lib/sport-scope'
import { normalizeTeamAbbrev } from '@/lib/team-abbrev'
import { apiChain } from '@/lib/workers/api-chain'

type ImagePayload = {
  headshotUrl?: string | null
  headshotUrlSm?: string | null
  headshotUrlLg?: string | null
  headshotSource?: string | null
  logoUrl?: string | null
  logoUrlSm?: string | null
  logoUrlLg?: string | null
  logoSource?: string | null
  teamCode?: string | null
  teamName?: string | null
}

function asImagePayload(value: unknown): ImagePayload | null {
  return value && typeof value === 'object' ? (value as ImagePayload) : null
}

function uniqueSports(input?: string[]): SupportedSport[] {
  const sports = input?.length ? input : SUPPORTED_SPORTS
  return Array.from(new Set(sports.map((sport) => normalizeToSupportedSport(sport))))
}

export function shouldRunMonthlyTeamLogoRefresh(date: Date = new Date()): boolean {
  return date.getUTCDate() <= 7
}

export async function runImageImporter(options?: {
  sports?: string[]
  forceRefresh?: boolean
  includePlayerHeadshots?: boolean
  includeTeamLogos?: boolean
}): Promise<{
  sports: string[]
  forceRefresh: boolean
  playersUpdated: number
  teamsUpdated: number
}> {
  const sports = uniqueSports(options?.sports)
  const forceRefresh = Boolean(options?.forceRefresh)
  const includePlayerHeadshots = options?.includePlayerHeadshots ?? true
  const includeTeamLogos = options?.includeTeamLogos ?? true
  let playersUpdated = 0
  let teamsUpdated = 0

  for (const sport of sports) {
    if (includePlayerHeadshots) {
      const players = await prisma.sportsPlayerRecord.findMany({
        where: {
          sport,
          ...(forceRefresh ? {} : { headshotUrl: null }),
        },
        select: {
          id: true,
          name: true,
          team: true,
        },
        orderBy: { lastUpdated: 'desc' },
      })

      for (const player of players) {
        const response = await apiChain.fetch({
          sport,
          dataType: 'player_headshots',
          query: {
            playerName: player.name,
            teamCode: player.team,
            team: player.team,
          },
        })

        const payload = asImagePayload(response.data)
        if (!payload?.headshotUrl) continue

        await prisma.sportsPlayerRecord.update({
          where: { id: player.id },
          data: {
            headshotUrl: payload.headshotUrl,
            headshotUrlSm: payload.headshotUrlSm ?? payload.headshotUrl,
            headshotUrlLg: payload.headshotUrlLg ?? payload.headshotUrl,
            headshotSource: payload.headshotSource ?? response.source,
          },
        })
        playersUpdated += 1
      }
    }

    if (includeTeamLogos) {
      const [sportsTeams, existingAssets] = await Promise.all([
        prisma.sportsTeam.findMany({
          where: { sport },
          select: {
            shortName: true,
            name: true,
          },
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.teamAsset.findMany({
          where: { sport },
          select: {
            teamCode: true,
            teamName: true,
            logoUrl: true,
          },
        }),
      ])

      const teamMap = new Map<string, { teamCode: string; teamName: string | null; logoUrl: string | null }>()
      for (const team of sportsTeams) {
        const teamCode = normalizeTeamAbbrev(team.shortName) ?? null
        if (!teamCode) continue
        teamMap.set(teamCode, {
          teamCode,
          teamName: team.name,
          logoUrl: null,
        })
      }
      for (const asset of existingAssets) {
        const teamCode = normalizeTeamAbbrev(asset.teamCode) ?? asset.teamCode
        if (!teamCode) continue
        teamMap.set(teamCode, {
          teamCode,
          teamName: asset.teamName,
          logoUrl: asset.logoUrl,
        })
      }

      for (const team of teamMap.values()) {
        if (!forceRefresh && team.logoUrl) continue

        const response = await apiChain.fetch({
          sport,
          dataType: 'team_logos',
          query: {
            teamCode: team.teamCode,
            teamName: team.teamName,
          },
        })

        const payload = asImagePayload(response.data)
        if (!payload?.logoUrl) continue

        await prisma.teamAsset.upsert({
          where: {
            uniq_team_assets_sport_team_code: {
              sport,
              teamCode: team.teamCode,
            },
          },
          update: {
            teamName: payload.teamName ?? team.teamName ?? team.teamCode,
            logoUrl: payload.logoUrl,
            logoUrlSm: payload.logoUrlSm ?? payload.logoUrl,
            logoUrlLg: payload.logoUrlLg ?? payload.logoUrl,
            logoSource: payload.logoSource ?? response.source,
          },
          create: {
            sport,
            teamCode: team.teamCode,
            teamName: payload.teamName ?? team.teamName ?? team.teamCode,
            logoUrl: payload.logoUrl,
            logoUrlSm: payload.logoUrlSm ?? payload.logoUrl,
            logoUrlLg: payload.logoUrlLg ?? payload.logoUrl,
            logoSource: payload.logoSource ?? response.source,
          },
        })

        await prisma.sportsPlayerRecord.updateMany({
          where: {
            sport,
            team: team.teamCode,
            ...(forceRefresh ? {} : { logoUrl: null }),
          },
          data: {
            logoUrl: payload.logoUrl,
          },
        })

        teamsUpdated += 1
      }
    }
  }

  return {
    sports,
    forceRefresh,
    playersUpdated,
    teamsUpdated,
  }
}
