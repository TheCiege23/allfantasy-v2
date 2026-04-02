import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { consumeRateLimit, getClientIp } from '@/lib/rate-limit'

const PLATFORM_VALUES = ['sleeper', 'yahoo', 'mfl', 'fantrax', 'espn'] as const

const bodySchema = z.object({
  platform: z.enum(PLATFORM_VALUES),
})

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const json = await request.json().catch(() => null)
  const parsed = bodySchema.safeParse(json)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
  }

  const { platform } = parsed.data
  const ip = getClientIp(request)
  const rl = consumeRateLimit({
    scope: 'legacy',
    action: `rank_dispute_${platform}`,
    sleeperUsername: userId,
    ip,
    maxRequests: 1,
    windowMs: 24 * 60 * 60 * 1000,
  })

  if (!rl.success) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded. Try again later.',
        retryAfterSec: rl.retryAfterSec,
        remaining: rl.remaining,
      },
      {
        status: 429,
        headers: { 'Retry-After': String(rl.retryAfterSec) },
      }
    )
  }

  const identity = await prisma.platformIdentity.findFirst({
    where: { userId, platform },
  })

  if (!identity) {
    return NextResponse.json({ error: 'No import found for this platform' }, { status: 400 })
  }

  if (!identity.rankLocked) {
    return NextResponse.json({ error: 'Rank is not locked for this platform' }, { status: 400 })
  }

  await prisma.platformIdentity.update({
    where: { id: identity.id },
    data: { rankLocked: false },
  })

  return NextResponse.json({
    ok: true,
    message: 'Re-rank unlocked. Re-import to trigger new rank.',
  })
}
