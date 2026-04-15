import { Prisma } from '@prisma/client'

import { prisma } from '@/lib/prisma'

const DEFAULT_DAILY_LIMIT = 1

function startOfUtcDay(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
}

function endOfUtcDay(dayStart: Date) {
  return new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
}

export async function consumeDailyLimit(args: {
  provider: string
  endpoint: string
  callsLimit?: number
}) {
  const now = new Date()
  const windowStart = startOfUtcDay(now)
  const windowEnd = endOfUtcDay(windowStart)
  const callsLimit = Math.max(1, Math.floor(args.callsLimit ?? DEFAULT_DAILY_LIMIT))

  const tryCreate = async () => {
    await prisma.apiRateLimitRecord.create({
      data: {
        provider: args.provider,
        endpoint: args.endpoint,
        callsMade: 1,
        callsLimit,
        windowStart,
        windowEnd,
      },
    })
    return true
  }

  try {
    const created = await tryCreate()
    if (created) {
      return { success: true, retryAfterSec: 0 }
    }
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
      throw error
    }
  }

  const updated = await prisma.apiRateLimitRecord.updateMany({
    where: {
      provider: args.provider,
      endpoint: args.endpoint,
      windowStart,
      windowEnd,
      callsMade: { lt: callsLimit },
    },
    data: {
      callsMade: { increment: 1 },
    },
  })

  if (updated.count > 0) {
    return { success: true, retryAfterSec: 0 }
  }

  const retryAfterSec = Math.max(0, Math.ceil((windowEnd.getTime() - now.getTime()) / 1000))
  return { success: false, retryAfterSec }
}
