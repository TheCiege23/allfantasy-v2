import { NextResponse } from 'next/server'
import { getInjuryReport } from '@/lib/data/players'
import { prisma } from '@/lib/prisma'
import { createDemoInjuries, uiKeyToDataSport } from '@/lib/startSit/shared'

export const dynamic = 'force-dynamic'

function isUnknownPlayerName(name: string | null | undefined): boolean {
  const normalized = String(name ?? '').trim().toLowerCase()
  return !normalized || normalized === 'unknown' || normalized === 'unknown player'
}

function severityFromStatus(status: string | null | undefined): 'high' | 'medium' | 'low' {
  return /out|ir|doubtful/i.test(status || '') ? 'high' : 'medium'
}

async function readIdentityBackedInjuries(dataSport: string) {
  const sourceRows = await prisma.sportsInjury.findMany({
    where: {
      sport: dataSport,
      NOT: [
        { playerName: { equals: 'Unknown', mode: 'insensitive' } },
        { playerName: { equals: 'Unknown Player', mode: 'insensitive' } },
      ],
    },
    orderBy: { updatedAt: 'desc' },
    take: 250,
    select: {
      playerId: true,
      playerName: true,
      team: true,
      position: true,
      status: true,
      description: true,
      updatedAt: true,
    },
  })

  const playerIds = Array.from(new Set(sourceRows.map((row) => String(row.playerId ?? '').trim()).filter(Boolean)))

  const [sportsPlayers, identityRows] = await Promise.all([
    playerIds.length > 0
      ? prisma.sportsPlayerRecord.findMany({
          where: {
            sport: dataSport,
            id: { in: playerIds },
          },
          select: {
            id: true,
            name: true,
            team: true,
            position: true,
          },
        })
      : Promise.resolve([]),
    playerIds.length > 0
      ? prisma.playerIdentityMap.findMany({
          where: {
            sport: dataSport,
            OR: [
              { sleeperId: { in: playerIds } },
              { apiSportsId: { in: playerIds } },
              { fantasyCalcId: { in: playerIds } },
              { rollingInsightsId: { in: playerIds } },
              { espnId: { in: playerIds } },
              { clearSportsId: { in: playerIds } },
            ],
          },
          select: {
            sleeperId: true,
            apiSportsId: true,
            fantasyCalcId: true,
            rollingInsightsId: true,
            espnId: true,
            clearSportsId: true,
            canonicalName: true,
            currentTeam: true,
            position: true,
          },
        })
      : Promise.resolve([]),
  ])

  const sportsPlayerById = new Map(sportsPlayers.map((row) => [row.id, row]))
  const identityByAnyExternalId = new Map<string, (typeof identityRows)[number]>()
  for (const row of identityRows) {
    for (const key of [row.sleeperId, row.apiSportsId, row.fantasyCalcId, row.rollingInsightsId, row.espnId, row.clearSportsId]) {
      const normalized = String(key ?? '').trim()
      if (normalized) {
        identityByAnyExternalId.set(normalized, row)
      }
    }
  }

  return sourceRows.slice(0, 14).map((row) => {
    const playerId = String(row.playerId ?? '').trim()
    const sportsPlayer = playerId ? sportsPlayerById.get(playerId) : undefined
    const identity = playerId ? identityByAnyExternalId.get(playerId) : undefined
    const playerName =
      (!isUnknownPlayerName(row.playerName) && row.playerName) ||
      sportsPlayer?.name ||
      identity?.canonicalName ||
      'Unknown Player'
    const team = String(row.team ?? '').trim() || sportsPlayer?.team || identity?.currentTeam || null
    const position = String(row.position ?? '').trim() || sportsPlayer?.position || identity?.position || null

    const detailParts = [row.status, row.description].filter(Boolean)
    if (team || position) {
      detailParts.unshift([position, team].filter(Boolean).join(' '))
    }

    return {
      player: playerName,
      source: 'Injury report DB',
      time: new Date(row.updatedAt).toLocaleDateString(),
      severity: severityFromStatus(row.status),
      text: detailParts.join(' — ').slice(0, 220),
    }
  })
}

export async function GET(req: Request) {
  const sport = new URL(req.url).searchParams.get('sport') || 'nfl'
  const dataSport = uiKeyToDataSport(sport)

  try {
    const rows = await getInjuryReport(dataSport)
    let injuries = rows.slice(0, 14).map((r) => ({
      player: r.playerName,
      source: 'Injury report DB',
      time: new Date(r.reportDate).toLocaleDateString(),
      severity: severityFromStatus(r.status),
      text: [r.status, r.notes].filter(Boolean).join(' — ').slice(0, 220),
    }))

    // If the active normalized table is present but identity fields are degraded,
    // backfill from the DB injury table that carries player names.
    if (injuries.length > 0 && injuries.every((row) => isUnknownPlayerName(row.player))) {
      const identityBacked = await readIdentityBackedInjuries(dataSport)
      if (identityBacked.some((row) => !isUnknownPlayerName(row.player))) {
        injuries = identityBacked
      }
    }

    if (injuries.length === 0) {
      return NextResponse.json({ injuries: createDemoInjuries(sport) })
    }
    return NextResponse.json({ injuries })
  } catch (e) {
    console.warn('[start-sit/injuries]', e)
    return NextResponse.json({ injuries: createDemoInjuries(sport) })
  }
}
