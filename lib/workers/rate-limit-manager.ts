import 'server-only'

import { prisma } from '@/lib/prisma'

export const RATE_LIMITS = {
  clearsports: { callsPerHour: 100, callsPerDay: 1000 },
  api_sports: { callsPerHour: 100, callsPerDay: 1000 },
  sleeper: { callsPerHour: 1000, callsPerDay: 10000 },
  yahoo: { callsPerHour: 200, callsPerDay: 2000 },
  espn: { callsPerHour: 100, callsPerDay: 1000 },
  mfl: { callsPerHour: 60, callsPerDay: 500 },
  fantrax: { callsPerHour: 60, callsPerDay: 500 },
  anthropic: { callsPerHour: 500, callsPerDay: 5000 },
  openai: { callsPerHour: 200, callsPerDay: 2000 },
  elevenlabs: { callsPerHour: 100, callsPerDay: 1000 },
  resend: { callsPerHour: 100, callsPerDay: 1000 },
} as const

type RateLimitedProvider = keyof typeof RATE_LIMITS

function normalizeProvider(provider: string): RateLimitedProvider | null {
  const key = provider.trim().toLowerCase() as RateLimitedProvider
  return key in RATE_LIMITS ? key : null
}

function startOfHour(date: Date): Date {
  const next = new Date(date)
  next.setMinutes(0, 0, 0)
  return next
}

function endOfHour(date: Date): Date {
  return new Date(startOfHour(date).getTime() + 60 * 60 * 1000)
}

function startOfDay(date: Date): Date {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

function endOfDay(date: Date): Date {
  return new Date(startOfDay(date).getTime() + 24 * 60 * 60 * 1000)
}

export class RateLimitManager {
  async canCall(provider: string, endpoint: string): Promise<boolean> {
    const normalized = normalizeProvider(provider)
    if (!normalized) return true

    try {
      const limits = RATE_LIMITS[normalized]
      const now = new Date()
      const hourStart = startOfHour(now)
      const hourEnd = endOfHour(now)
      const dayStart = startOfDay(now)
      const dayEnd = endOfDay(now)

      const [hourlyUsage, dailyUsage] = await Promise.all([
        prisma.apiRateLimitRecord.aggregate({
          _sum: { callsMade: true },
          where: {
            provider: normalized,
            windowStart: hourStart,
            windowEnd: hourEnd,
          },
        }),
        prisma.apiCallLogRecord.count({
          where: {
            provider: normalized,
            cached: false,
            calledAt: {
              gte: dayStart,
              lt: dayEnd,
            },
          },
        }),
      ])

      const hourlyUsed = hourlyUsage._sum.callsMade ?? 0
      return hourlyUsed < limits.callsPerHour && dailyUsage < limits.callsPerDay
    } catch {
      return true
    }
  }

  async recordCall(
    provider: string,
    endpoint: string,
    status: number,
    latencyMs: number,
    options?: { error?: string | null; cached?: boolean }
  ): Promise<void> {
    const normalized = normalizeProvider(provider) ?? provider.trim().toLowerCase()
    const cached = Boolean(options?.cached)
    const now = new Date()
    const hourStart = startOfHour(now)
    const hourEnd = endOfHour(now)
    const callsLimit = normalizeProvider(provider)
      ? RATE_LIMITS[normalized as RateLimitedProvider].callsPerHour
      : 0

    try {
      await prisma.$transaction([
        prisma.apiCallLogRecord.create({
          data: {
            provider: normalized,
            endpoint,
            status,
            latencyMs,
            error: options?.error?.slice(0, 500) ?? null,
            cached,
            calledAt: now,
          },
        }),
        prisma.apiRateLimitRecord.upsert({
          where: {
            uniq_api_rate_limits_window: {
              provider: normalized,
              endpoint,
              windowStart: hourStart,
              windowEnd: hourEnd,
            },
          },
          update: {
            callsMade: cached ? undefined : { increment: 1 },
            callsLimit,
          },
          create: {
            provider: normalized,
            endpoint,
            callsMade: cached ? 0 : 1,
            callsLimit,
            windowStart: hourStart,
            windowEnd: hourEnd,
          },
        }),
      ])
    } catch {
      // Never fail the user path because quota logging had an issue.
    }
  }

  async getUsage(provider: string): Promise<{ used: number; limit: number; resetAt: Date }> {
    const normalized = normalizeProvider(provider)
    const now = new Date()
    const hourStart = startOfHour(now)
    const hourEnd = endOfHour(now)

    if (!normalized) {
      return { used: 0, limit: 0, resetAt: hourEnd }
    }

    try {
      const usage = await prisma.apiRateLimitRecord.aggregate({
        _sum: { callsMade: true },
        where: {
          provider: normalized,
          windowStart: hourStart,
          windowEnd: hourEnd,
        },
      })

      return {
        used: usage._sum.callsMade ?? 0,
        limit: RATE_LIMITS[normalized].callsPerHour,
        resetAt: hourEnd,
      }
    } catch {
      return {
        used: 0,
        limit: RATE_LIMITS[normalized].callsPerHour,
        resetAt: hourEnd,
      }
    }
  }

  async getFallback(provider: string, dataType: string): Promise<unknown> {
    const normalizedProvider = provider.trim().toLowerCase()
    const normalizedType = dataType.trim().toLowerCase()

    switch (normalizedType) {
      case 'players':
        return prisma.sportsPlayerRecord.findMany({
          take: 100,
          orderBy: { lastUpdated: 'desc' },
        })
      case 'injuries':
      case 'injury_reports':
        return prisma.injuryReportRecord.findMany({
          take: 100,
          orderBy: { reportDate: 'desc' },
        })
      case 'schedule':
      case 'schedules':
      case 'games':
        return prisma.gameSchedule.findMany({
          take: 100,
          orderBy: { startTime: 'asc' },
        })
      case 'adp':
        return prisma.adpDataRecord.findMany({
          take: 100,
          orderBy: [{ season: 'desc' }, { week: 'desc' }, { adp: 'asc' }],
        })
      case 'news':
        return prisma.playerNewsRecord.findMany({
          take: 100,
          orderBy: { publishedAt: 'desc' },
        })
      default:
        return {
          provider: normalizedProvider,
          dataType: normalizedType,
          data: null,
        }
    }
  }
}

export const rateLimitManager = new RateLimitManager()
