import 'server-only'

import { prisma } from '@/lib/prisma'
import { apiChainSportToDbSport, type ApiChainSport, type ApiDataType } from '@/lib/workers/api-config'

const SOURCE = 'rolling_insights'

function ttlMsForRow(kind: 'player' | 'injury' | 'news'): number {
  if (kind === 'news') return 24 * 60 * 60 * 1000
  if (kind === 'injury') return 6 * 60 * 60 * 1000
  return 7 * 24 * 60 * 60 * 1000
}

export async function persistNormalizedSportsRows(
  sport: ApiChainSport,
  dataType: ApiDataType,
  data: unknown
): Promise<void> {
  const dbSport = apiChainSportToDbSport(sport)
  const expiresBase = new Date(Date.now() + ttlMsForRow('player'))

  if (dataType === 'players' && Array.isArray(data)) {
    for (const raw of data) {
      if (!raw || typeof raw !== 'object') continue
      const player = raw as Record<string, unknown>
      const id = String(player.id ?? player.playerId ?? '').trim()
      if (!id) continue
      const name = String(player.name ?? player.player ?? '').trim()
      if (!name) continue
      await prisma.sportsPlayer
        .upsert({
          where: {
            sport_externalId_source: {
              sport: dbSport,
              externalId: id,
              source: SOURCE,
            },
          },
          update: {
            name,
            position: typeof player.position === 'string' ? player.position : null,
            team: typeof player.team === 'string' ? player.team : null,
            teamId: player.teamId != null ? String(player.teamId) : null,
            status: typeof player.status === 'string' ? player.status : null,
            imageUrl: typeof player.imageUrl === 'string' ? player.imageUrl : null,
            updatedAt: new Date(),
            expiresAt: expiresBase,
          },
          create: {
            sport: dbSport,
            externalId: id,
            name,
            position: typeof player.position === 'string' ? player.position : null,
            team: typeof player.team === 'string' ? player.team : null,
            teamId: player.teamId != null ? String(player.teamId) : null,
            status: typeof player.status === 'string' ? player.status : null,
            imageUrl: typeof player.imageUrl === 'string' ? player.imageUrl : null,
            source: SOURCE,
            expiresAt: expiresBase,
          },
        })
        .catch(() => {})
    }
    return
  }

  if (dataType === 'injuries' && Array.isArray(data)) {
    const exp = new Date(Date.now() + ttlMsForRow('injury'))
    for (const raw of data) {
      if (!raw || typeof raw !== 'object') continue
      const injury = raw as Record<string, unknown>
      const externalId = String(
        injury.externalId ?? injury.playerId ?? `${injury.playerName ?? 'unk'}:${injury.reportDate ?? ''}`
      ).slice(0, 180)
      const playerName = String(injury.playerName ?? injury.player ?? 'Unknown')
      const reportDate = injury.reportDate ? new Date(String(injury.reportDate)) : new Date()
      await prisma.sportsInjury
        .upsert({
          where: {
            sport_externalId_source: {
              sport: dbSport,
              externalId,
              source: SOURCE,
            },
          },
          update: {
            status: typeof injury.status === 'string' ? injury.status : null,
            description:
              typeof injury.notes === 'string'
                ? injury.notes
                : typeof injury.bodyPart === 'string'
                  ? injury.bodyPart
                  : null,
            date: reportDate,
            playerName,
            updatedAt: new Date(),
            expiresAt: exp,
          },
          create: {
            sport: dbSport,
            externalId,
            playerName,
            playerId: injury.playerId != null ? String(injury.playerId) : null,
            team: typeof injury.team === 'string' ? injury.team : null,
            status: typeof injury.status === 'string' ? injury.status : null,
            description:
              typeof injury.notes === 'string'
                ? injury.notes
                : typeof injury.bodyPart === 'string'
                  ? injury.bodyPart
                  : null,
            date: reportDate,
            source: SOURCE,
            expiresAt: exp,
          },
        })
        .catch(() => {})
    }
    return
  }

  if (dataType === 'news' && Array.isArray(data)) {
    const exp = new Date(Date.now() + ttlMsForRow('news'))
    for (const raw of data) {
      if (!raw || typeof raw !== 'object') continue
      const article = raw as Record<string, unknown>
      const externalId = String(article.id ?? article.sourceId ?? article.headline ?? '').slice(0, 180)
      if (!externalId) continue
      const title = String(article.title ?? article.headline ?? '').trim()
      if (!title) continue
      const publishedAt = article.publishedAt
        ? new Date(String(article.publishedAt))
        : article.date
          ? new Date(String(article.date))
          : new Date()
      await prisma.sportsNews
        .upsert({
          where: {
            sport_externalId_source: {
              sport: dbSport,
              externalId,
              source: SOURCE,
            },
          },
          update: {
            title,
            sourceId: externalId,
            description: typeof article.description === 'string' ? article.description : null,
            content:
              typeof article.body === 'string'
                ? article.body
                : typeof article.content === 'string'
                  ? article.content
                  : null,
            publishedAt,
            updatedAt: new Date(),
            expiresAt: exp,
          },
          create: {
            sport: dbSport,
            externalId,
            sourceId: externalId,
            title,
            description: typeof article.description === 'string' ? article.description : null,
            content:
              typeof article.body === 'string'
                ? article.body
                : typeof article.content === 'string'
                  ? article.content
                  : null,
            source: SOURCE,
            publishedAt,
            expiresAt: exp,
          },
        })
        .catch(() => {})
    }
  }
}
