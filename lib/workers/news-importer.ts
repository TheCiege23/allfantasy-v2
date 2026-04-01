import 'server-only'

import { prisma } from '@/lib/prisma'
import { SUPPORTED_SPORTS, normalizeToSupportedSport } from '@/lib/sport-scope'
import { normalizeTeamAbbrev } from '@/lib/team-abbrev'
import { apiChain } from '@/lib/workers/api-chain'

function inferImpact(text: string): 'high' | 'medium' | 'low' {
  const lower = text.toLowerCase()
  if (/(out|ir|injured reserve|trade|traded|waived|surgery|season-ending|starting job)/.test(lower)) return 'high'
  if (/(questionable|limited|target share|role|practice|depth chart|committee)/.test(lower)) return 'medium'
  return 'low'
}

function extractPlayerName(row: Record<string, unknown>): string {
  const playerName = row.playerName ?? row.player ?? row.name
  if (typeof playerName === 'string' && playerName.trim()) return playerName.trim()
  return 'General Update'
}

function normalizeNewsRecord(
  sport: string,
  row: Record<string, unknown>,
  source: string
): {
  sport: string
  playerId?: string | null
  playerName: string
  team?: string | null
  headline: string
  body: string
  impact: string
  fantasyRelevant: boolean
  source: string
  publishedAt: Date
} | null {
  const headline = String(row.title ?? row.headline ?? '').trim()
  const body = String(row.content ?? row.description ?? row.body ?? '').trim()
  if (!headline) return null
  const playerName = extractPlayerName(row)
  const normalizedTeam = normalizeTeamAbbrev(String(row.team ?? row.teamAbbrev ?? ''))
  const team = normalizedTeam ?? (String(row.team ?? '').trim() || null)
  const publishedAtRaw = row.publishedAt ?? row.date ?? row.createdAt
  const publishedAt = publishedAtRaw ? new Date(String(publishedAtRaw)) : new Date()
  const impact = inferImpact(`${headline} ${body}`)

  return {
    sport,
    playerId: typeof row.playerId === 'string' ? row.playerId : null,
    playerName,
    team,
    headline,
    body,
    impact,
    fantasyRelevant: impact !== 'low' || /fantasy|waiver|start|sit|lineup|injur|trade/i.test(`${headline} ${body}`),
    source,
    publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
  }
}

export async function runNewsImporter(options?: {
  sports?: string[]
}): Promise<{ imported: number; sports: string[] }> {
  const sports = Array.from(
    new Set((options?.sports?.length ? options.sports : SUPPORTED_SPORTS).map((sport) => normalizeToSupportedSport(sport)))
  )

  let imported = 0
  for (const sport of sports) {
    const [legacyRows, chainResponse] = await Promise.all([
      prisma.sportsNews.findMany({
        where: { sport },
        orderBy: { publishedAt: 'desc' },
        take: 250,
      }),
      apiChain.fetch({
        sport,
        dataType: 'news',
        query: { limit: 40 },
      }),
    ])

    const providerRows = Array.isArray(chainResponse.data)
      ? chainResponse.data.filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
      : []

    const records = [
      ...legacyRows
        .map((row) =>
          normalizeNewsRecord(
            sport,
            {
              playerId: row.playerId,
              playerName: row.playerName,
              team: row.team,
              title: row.title,
              description: row.description,
              content: row.content,
              publishedAt: row.publishedAt ?? row.createdAt,
            },
            row.source
          )
        )
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
      ...providerRows
        .map((row) => normalizeNewsRecord(sport, row, chainResponse.source))
        .filter((row): row is NonNullable<typeof row> => Boolean(row)),
    ]

    if (records.length === 0) continue
    await prisma.playerNewsRecord.createMany({
      data: records,
      skipDuplicates: true,
    })
    imported += records.length
  }

  return { imported, sports }
}
