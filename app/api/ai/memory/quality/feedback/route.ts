import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resolvePlatformUser } from '@/lib/platform/current-user'
import { recordChimmyQualityEvent } from '@/lib/chimmy-quality/ChimmyQualityAnalytics'

export const dynamic = 'force-dynamic'

const BodySchema = z.object({
  action: z.enum(['memory_item_corrected', 'memory_item_ignored']),
  memoryScope: z.string().max(40).optional(),
  memoryKey: z.string().max(80).optional(),
  reason: z.string().max(120).optional(),
  leagueId: z.string().max(64).optional(),
})

export async function POST(req: Request) {
  const user = await resolvePlatformUser()
  if (!user.appUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  await recordChimmyQualityEvent({
    userId: user.appUserId,
    leagueId: parsed.data.leagueId ?? null,
    eventType: parsed.data.action,
    meta: {
      memoryScope: parsed.data.memoryScope,
      memoryKey: parsed.data.memoryKey,
      reason: parsed.data.reason,
      source: 'memory_feedback_api',
    },
  })

  return NextResponse.json({ ok: true })
}
