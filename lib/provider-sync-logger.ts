import { prisma } from './prisma'

export type ProviderSyncContext = {
  provider: string
  entityType: string
  sport?: string
  key?: string
  fallbackProvider?: string
  sourcePriority?: number
}

export type ProviderSyncStats = {
  recordsImported?: number
  recordsUpdated?: number
  recordsSkipped?: number
  lastPayloadBytes?: number
  error?: string | null
}

export async function recordProviderSync(
  ctx: ProviderSyncContext,
  stats: ProviderSyncStats,
): Promise<void> {
  const now = new Date()
  const {
    provider,
    entityType,
    sport,
    key,
    fallbackProvider,
    sourcePriority,
  } = ctx

  const {
    recordsImported = 0,
    recordsUpdated = 0,
    recordsSkipped = 0,
    lastPayloadBytes = 0,
    error = null,
  } = stats

  try {
    await (prisma as any).providerSyncState.upsert({
      where: {
        provider_entityType_sport_key: {
          provider,
          entityType,
          sport: sport ?? null,
          key: key ?? null,
        },
      },
      update: {
        lastCompletedAt: now,
        lastSuccessAt: error ? undefined : now,
        lastErrorAt: error ? now : undefined,
        lastError: error,
        recordsImported,
        recordsUpdated,
        recordsSkipped,
        lastPayloadBytes,
        fallbackProvider: fallbackProvider ?? null,
        sourcePriority: sourcePriority ?? null,
      },
      create: {
        provider,
        entityType,
        sport: sport ?? null,
        key: key ?? null,
        lastStartedAt: now,
        lastCompletedAt: now,
        lastSuccessAt: error ? null : now,
        lastErrorAt: error ? now : null,
        lastError: error,
        recordsImported,
        recordsUpdated,
        recordsSkipped,
        lastPayloadBytes,
        fallbackProvider: fallbackProvider ?? null,
        sourcePriority: sourcePriority ?? null,
      },
    })
  } catch (e) {
    console.error('[provider-sync-logger] Failed to record sync state:', e)
  }
}

