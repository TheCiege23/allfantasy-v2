import 'server-only'

import { prisma } from '@/lib/prisma'
import { getProviderStatus } from '@/lib/provider-config'
import type { IntelligenceChipState, IntelligencePlatformHealth } from '@/lib/intelligence/types'

function chip(ok: boolean): IntelligenceChipState {
  return ok ? 'connected' : 'unavailable'
}

function chipDegraded(primary: boolean, secondary: boolean): IntelligenceChipState {
  if (primary && secondary) return 'connected'
  if (primary || secondary) return 'degraded'
  return 'unavailable'
}

/**
 * Real integration health for AI surfaces — DB reachability, cached sports/news rows, AI providers,
 * Rolling Insights / ClearSports configuration plus data pipeline signals.
 */
export async function computeIntelligencePlatformHealth(): Promise<IntelligencePlatformHealth> {
  const computedAt = new Date().toISOString()

  let databaseOk = false
  let sportsDataOk = false
  let newsOk = false

  try {
    await prisma.$queryRaw`SELECT 1`
    databaseOk = true
  } catch {
    databaseOk = false
  }

  try {
    const row = await prisma.sportsPlayer.findFirst({
      where: { expiresAt: { gt: new Date() } },
      select: { id: true },
    })
    sportsDataOk = row != null
  } catch {
    sportsDataOk = false
  }

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const n = await prisma.sportsNews.count({
      where: {
        OR: [{ createdAt: { gte: since } }, { publishedAt: { gte: since } }],
      },
    })
    newsOk = n > 0
  } catch {
    newsOk = false
  }

  const providers = getProviderStatus()
  const aiEngineOk = providers.anyAi === true
  const riConfigured = providers.rollingInsights === true
  const csConfigured = providers.clearsports === true

  const rollingInsights: IntelligenceChipState = chipDegraded(riConfigured && sportsDataOk, riConfigured)
  const clearSports: IntelligenceChipState = chipDegraded(csConfigured && sportsDataOk, csConfigured)

  return {
    database: chip(databaseOk),
    sportsData: chip(sportsDataOk),
    news: newsOk ? 'connected' : 'degraded',
    aiEngine: chip(aiEngineOk),
    rollingInsights,
    clearSports,
    computedAt,
  }
}
