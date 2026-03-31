import 'server-only'

import { fetchAllFFCFormats } from '@/lib/adp-data'
import { loadMultiPlatformADP } from '@/lib/multi-platform-adp'
import { prisma } from '@/lib/prisma'
import { SUPPORTED_SPORTS, normalizeToSupportedSport } from '@/lib/sport-scope'
import { normalizePlayerName, normalizePosition, normalizeTeamAbbrev } from '@/lib/team-abbrev'

function currentSeason(): number {
  return new Date().getFullYear()
}

function currentWeekOfYear(): number {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
  const diffDays = Math.floor((now.getTime() - start.getTime()) / 86_400_000)
  return Math.max(1, Math.ceil((diffDays + start.getUTCDay() + 1) / 7))
}

function buildPlayerId(sport: string, name: string, position?: string | null, team?: string | null): string {
  const slug = normalizePlayerName(name).replace(/\s+/g, '-')
  return `${sport}:${slug}:${normalizePosition(position) ?? 'FLEX'}:${normalizeTeamAbbrev(team) ?? team ?? 'FA'}`
}

type AdpRow = {
  sport: string
  format: string
  scoring: string
  playerId: string
  playerName: string
  position: string
  team: string
  adp: number
  adpChange: number | null
  week: number
  season: number
  source: string
}

async function loadPreviousMap(sport: string): Promise<Map<string, number>> {
  const rows = await prisma.adpDataRecord.findMany({
    where: { sport },
    orderBy: [{ season: 'desc' }, { week: 'desc' }, { createdAt: 'desc' }],
    take: 4000,
  })

  const map = new Map<string, number>()
  for (const row of rows) {
    const key = `${row.sport}:${row.format}:${row.scoring}:${row.playerId}:${row.source}`
    if (!map.has(key)) map.set(key, row.adp)
  }
  return map
}

export async function runAdpImporter(options?: {
  sports?: string[]
}): Promise<{ imported: number; sports: string[]; season: number; week: number }> {
  const season = currentSeason()
  const week = currentWeekOfYear()
  const sports = Array.from(
    new Set((options?.sports?.length ? options.sports : SUPPORTED_SPORTS).map((sport) => normalizeToSupportedSport(sport)))
  )

  let imported = 0
  for (const sport of sports) {
    const previousMap = await loadPreviousMap(sport)
    const rows: AdpRow[] = []

    if (sport === 'NFL') {
      const multi = loadMultiPlatformADP()
      for (const player of multi) {
        const shared = {
          sport,
          playerId: buildPlayerId(sport, player.name, player.position, player.team),
          playerName: player.name,
          position: normalizePosition(player.position) ?? 'FLEX',
          team: normalizeTeamAbbrev(player.team) ?? player.team ?? 'FA',
          week,
          season,
        }

        const candidates: Array<{ format: string; scoring: string; source: string; adp: number | null }> = [
          { format: 'redraft', scoring: 'standard', source: 'fantrax', adp: player.redraft.fantrax },
          { format: 'redraft', scoring: 'standard', source: 'sleeper', adp: player.redraft.sleeper },
          { format: 'redraft', scoring: 'standard', source: 'espn', adp: player.redraft.espn },
          { format: 'redraft', scoring: 'standard', source: 'mfl', adp: player.redraft.mfl },
          { format: 'redraft', scoring: '2qb', source: 'sleeper', adp: player.twoQB.sleeper },
          { format: 'dynasty', scoring: 'standard', source: 'sleeper', adp: player.dynasty.sleeper },
          { format: 'dynasty', scoring: 'superflex', source: 'sleeper', adp: player.dynasty2QB.sleeper },
        ]

        for (const candidate of candidates) {
          if (candidate.adp == null || !Number.isFinite(candidate.adp)) continue
          const key = `${sport}:${candidate.format}:${candidate.scoring}:${shared.playerId}:${candidate.source}`
          rows.push({
            ...shared,
            format: candidate.format,
            scoring: candidate.scoring,
            source: candidate.source,
            adp: Number(candidate.adp),
            adpChange: previousMap.has(key) ? Number((Number(candidate.adp) - Number(previousMap.get(key))).toFixed(2)) : null,
          })
        }
      }

      const ffc = await fetchAllFFCFormats(12).catch(() => ({} as Awaited<ReturnType<typeof fetchAllFFCFormats>>))
      const ffcFormats = [
        ['standard', 'redraft', 'standard'],
        ['ppr', 'redraft', 'ppr'],
        ['half-ppr', 'redraft', 'halfPPR'],
        ['2qb', 'redraft', '2qb'],
        ['dynasty', 'dynasty', 'standard'],
      ] as const

      for (const [ffcKey, format, scoring] of ffcFormats) {
        const payload = ffc[ffcKey]
        for (const player of payload?.players ?? []) {
          const playerId = buildPlayerId(sport, player.name, player.position, player.team)
          const key = `${sport}:${format}:${scoring}:${playerId}:ffc`
          rows.push({
            sport,
            format,
            scoring,
            playerId,
            playerName: player.name,
            position: normalizePosition(player.position) ?? 'FLEX',
            team: normalizeTeamAbbrev(player.team) ?? player.team ?? 'FA',
            adp: player.adp,
            adpChange: previousMap.has(key) ? Number((player.adp - Number(previousMap.get(key))).toFixed(2)) : null,
            week,
            season,
            source: 'ffc',
          })
        }
      }
    } else {
      const snapshots = await prisma.aiAdpSnapshot.findMany({
        where: { sport },
        select: { leagueType: true, formatKey: true, snapshotData: true },
      })

      for (const snapshot of snapshots) {
        const entries = Array.isArray(snapshot.snapshotData) ? snapshot.snapshotData : []
        for (const entry of entries as Array<Record<string, unknown>>) {
          const name = String(entry.playerName ?? entry.name ?? '').trim()
          if (!name) continue
          const playerId = buildPlayerId(sport, name, String(entry.position ?? ''), String(entry.team ?? ''))
          const key = `${sport}:${snapshot.leagueType}:${snapshot.formatKey}:${playerId}:ai_adp`
          rows.push({
            sport,
            format: snapshot.leagueType,
            scoring: snapshot.formatKey,
            playerId,
            playerName: name,
            position: normalizePosition(String(entry.position ?? '')) ?? 'FLEX',
            team: normalizeTeamAbbrev(String(entry.team ?? '')) ?? String(entry.team ?? 'FA'),
            adp: Number(entry.adp ?? 999),
            adpChange: previousMap.has(key) ? Number((Number(entry.adp ?? 999) - Number(previousMap.get(key))).toFixed(2)) : null,
            week,
            season,
            source: 'ai_adp',
          })
        }
      }
    }

    if (rows.length === 0) continue
    await prisma.adpDataRecord.createMany({
      data: rows,
      skipDuplicates: true,
    })
    imported += rows.length
  }

  return { imported, sports, season, week }
}
