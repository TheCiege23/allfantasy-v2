import 'server-only'

import { prisma } from '@/lib/prisma'
import { SUPPORTED_SPORTS, normalizeToSupportedSport } from '@/lib/sport-scope'
import { normalizeTeamAbbrev } from '@/lib/team-abbrev'
import { apiChain } from '@/lib/workers/api-chain'

const UPSERT_BATCH_SIZE = 100

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function inferCurrentWeek(): number | null {
  const day = new Date().getUTCDate()
  return Math.max(1, Math.min(18, Math.ceil(day / 7)))
}

export function isNflPriorityInjuryWindow(date: Date = new Date()): boolean {
  const day = date.getUTCDay()
  return day >= 3 && day <= 6
}

export async function runInjuryImporter(options?: {
  sports?: string[]
  week?: number
}): Promise<{ imported: number; sports: string[]; priorityWindow: boolean }> {
  const sports = Array.from(
    new Set((options?.sports?.length ? options.sports : SUPPORTED_SPORTS).map((sport) => normalizeToSupportedSport(sport)))
  )
  const week = options?.week ?? inferCurrentWeek()
  const priorityWindow = isNflPriorityInjuryWindow()
  let imported = 0

  for (const sport of sports) {
    let rows: Array<{
      sport: string
      playerId: string
      playerName: string
      team: string
      status: string
      bodyPart?: string | null
      notes?: string | null
      practice?: string | null
      gameStatus?: string | null
      reportDate: Date
      week?: number | null
    }> = []

    const response = await apiChain.fetch({
      sport,
      dataType: 'injuries',
      query: { week, season: String(new Date().getFullYear()) },
    })

    if (Array.isArray(response.data) && response.data.length > 0) {
      rows = response.data.map((injury: any) => ({
        sport,
        playerId: String(injury.playerId ?? injury.externalId ?? ''),
        playerName: String(injury.playerName ?? injury.player ?? 'Unknown Player'),
        team: normalizeTeamAbbrev(injury.team) ?? injury.team ?? 'FA',
        status: String(injury.status ?? 'questionable'),
        bodyPart: typeof injury.bodyPart === 'string' ? injury.bodyPart : null,
        notes: typeof injury.notes === 'string' ? injury.notes : null,
        practice: priorityWindow ? 'limited' : null,
        gameStatus: typeof injury.status === 'string' ? injury.status : null,
        reportDate: injury.reportDate ? new Date(injury.reportDate) : new Date(),
        week,
      }))
    } else {
      const legacyRows = await prisma.sportsInjury.findMany({
        where: { sport },
        orderBy: { fetchedAt: 'desc' },
        take: 1000,
      })

      rows = legacyRows.map((injury) => ({
        sport,
        playerId: injury.playerId ?? injury.externalId,
        playerName: injury.playerName,
        team: injury.team ?? 'FA',
        status: injury.status ?? 'questionable',
        bodyPart: injury.type ?? null,
        notes: injury.description ?? null,
        practice: null,
        gameStatus: injury.status ?? null,
        reportDate: injury.date ?? injury.fetchedAt,
        week: injury.week ?? week,
      }))
    }

    for (const batch of chunk(rows, UPSERT_BATCH_SIZE)) {
      await prisma.$transaction(
        batch.map((row) =>
          prisma.injuryReportRecord.upsert({
            where: {
              uniq_injury_reports_player_report_status: {
                sport: row.sport,
                playerId: row.playerId,
                reportDate: row.reportDate,
                status: row.status,
              },
            },
            update: {
              playerName: row.playerName,
              team: row.team,
              bodyPart: row.bodyPart,
              notes: row.notes,
              practice: row.practice,
              gameStatus: row.gameStatus,
              week: row.week ?? null,
            },
            create: {
              sport: row.sport,
              playerId: row.playerId,
              playerName: row.playerName,
              team: row.team,
              status: row.status,
              bodyPart: row.bodyPart,
              notes: row.notes,
              practice: row.practice,
              gameStatus: row.gameStatus,
              reportDate: row.reportDate,
              week: row.week ?? null,
            },
          })
        )
      )
      imported += batch.length
    }
  }

  return { imported, sports, priorityWindow }
}
