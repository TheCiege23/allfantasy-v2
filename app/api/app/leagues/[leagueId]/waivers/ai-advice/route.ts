import { NextRequest } from 'next/server'
import { proxyToExisting } from '@/lib/api/proxy-adapter'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest, { params }: { params: { leagueId: string } }) {
  const incoming = await req.json().catch(() => ({}))
  const league = await prisma.league.findFirst({
    where: {
      OR: [{ id: params.leagueId }, { platformLeagueId: params.leagueId }],
    },
    select: {
      id: true,
      name: true,
      sport: true,
      leagueVariant: true,
      scoring: true,
      isDynasty: true,
      leagueSize: true,
      settings: true,
    },
  })
  const settings = league?.settings && typeof league.settings === 'object'
    ? (league.settings as Record<string, unknown>)
    : null
  const settingsSuperflex =
    settings?.isSuperflex ?? settings?.superflex ?? settings?.is_sf ?? settings?.sf
  const body = {
    ...(incoming && typeof incoming === 'object' ? incoming : {}),
    leagueId: params.leagueId,
    sport: league?.sport ?? incoming?.sport,
    leagueVariant: league?.leagueVariant ?? incoming?.leagueVariant,
    league: {
      ...(incoming?.league && typeof incoming.league === 'object' ? incoming.league : {}),
      league_id: params.leagueId,
      name: league?.name ?? incoming?.league?.name,
      sport: league?.sport ?? incoming?.league?.sport,
      leagueVariant: league?.leagueVariant ?? incoming?.league?.leagueVariant,
      format: league?.scoring ?? incoming?.league?.format,
      superflex: settingsSuperflex ?? incoming?.league?.superflex,
      isDynasty: league?.isDynasty ?? incoming?.league?.isDynasty,
      num_teams: league?.leagueSize ?? incoming?.league?.num_teams,
    },
  }
  return proxyToExisting(req, {
    targetPath: '/api/waiver-ai',
    query: { leagueId: params.leagueId },
    body,
  })
}
