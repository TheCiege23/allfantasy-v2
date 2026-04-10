import { prisma } from '@/lib/prisma'
import type { FantasyCalcPlayer, FantasyCalcSettings } from '@/lib/fantasycalc'

const KEY_PREFIX = 'fantasycalc:values:'

type CachedFantasyCalcPayload = {
  players: FantasyCalcPlayer[]
  settings: FantasyCalcSettings
  syncedAt: string
}

export function buildFantasyCalcCacheKey(settings: FantasyCalcSettings): string {
  return `${KEY_PREFIX}dynasty:${settings.isDynasty ? '1' : '0'}:qbs:${settings.numQbs}:teams:${settings.numTeams}:ppr:${settings.ppr}`
}

function parseCachedPayload(data: unknown): CachedFantasyCalcPayload | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const payload = data as Partial<CachedFantasyCalcPayload>
  if (!Array.isArray(payload.players)) return null
  if (!payload.settings || typeof payload.settings !== 'object') return null
  if (typeof payload.syncedAt !== 'string') return null
  return payload as CachedFantasyCalcPayload
}

export async function writeFantasyCalcValuesToDb(
  settings: FantasyCalcSettings,
  players: FantasyCalcPlayer[],
  options?: { ttlMs?: number; syncedAt?: Date }
): Promise<{ cacheKey: string; expiresAt: Date; count: number }> {
  const now = new Date()
  const ttlMs = options?.ttlMs ?? 1000 * 60 * 60 * 6
  const syncedAt = options?.syncedAt ?? now
  const expiresAt = new Date(now.getTime() + ttlMs)
  const cacheKey = buildFantasyCalcCacheKey(settings)

  const payload: CachedFantasyCalcPayload = {
    players,
    settings,
    syncedAt: syncedAt.toISOString(),
  }

  await prisma.sportsDataCache.upsert({
    where: { cacheKey },
    update: {
      data: payload,
      expiresAt,
    },
    create: {
      cacheKey,
      data: payload,
      expiresAt,
    },
  })

  return {
    cacheKey,
    expiresAt,
    count: players.length,
  }
}

export async function readFantasyCalcValuesFromDb(
  settings: FantasyCalcSettings,
  options?: { allowStale?: boolean }
): Promise<{
  players: FantasyCalcPlayer[]
  stale: boolean
  syncedAt: string | null
  expiresAt: string | null
}> {
  const allowStale = options?.allowStale ?? true
  const cacheKey = buildFantasyCalcCacheKey(settings)
  const row = await prisma.sportsDataCache.findUnique({ where: { cacheKey } })

  if (!row) {
    return { players: [], stale: false, syncedAt: null, expiresAt: null }
  }

  const parsed = parseCachedPayload(row.data)
  if (!parsed) {
    return { players: [], stale: false, syncedAt: null, expiresAt: row.expiresAt.toISOString() }
  }

  const stale = row.expiresAt.getTime() <= Date.now()
  if (stale && !allowStale) {
    return {
      players: [],
      stale: true,
      syncedAt: parsed.syncedAt,
      expiresAt: row.expiresAt.toISOString(),
    }
  }

  return {
    players: parsed.players,
    stale,
    syncedAt: parsed.syncedAt,
    expiresAt: row.expiresAt.toISOString(),
  }
}

export async function getFantasyCalcCacheHealth(): Promise<{
  totalKeys: number
  freshKeys: number
  latestSyncedAt: string | null
}> {
  const now = new Date()
  const [totalKeys, freshKeys, latest] = await Promise.all([
    prisma.sportsDataCache.count({ where: { cacheKey: { startsWith: KEY_PREFIX } } }),
    prisma.sportsDataCache.count({ where: { cacheKey: { startsWith: KEY_PREFIX }, expiresAt: { gt: now } } }),
    prisma.sportsDataCache.findFirst({
      where: { cacheKey: { startsWith: KEY_PREFIX } },
      orderBy: { createdAt: 'desc' },
      select: { data: true },
    }),
  ])

  const latestParsed = latest ? parseCachedPayload(latest.data) : null

  return {
    totalKeys,
    freshKeys,
    latestSyncedAt: latestParsed?.syncedAt ?? null,
  }
}
