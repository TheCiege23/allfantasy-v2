import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { getUserTimeContext, buildAiTimeContextPayload } from '@/lib/time-engine/userContext'
import { persistDeviceTimeContext } from '@/lib/time-engine/persistDeviceTime'
import { ensureUserProfileForUserId } from '@/lib/user-profile/ensureUserProfileForUserId'

export const dynamic = 'force-dynamic'

const postSchema = z.object({
  deviceTimezone: z.string().min(2).max(64),
  deviceLocalIso: z.string().min(10).max(80),
})

/**
 * GET — server UTC + user account timezone context + mismatch flags (for UI / AI bootstrap).
 */
export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    await ensureUserProfileForUserId(userId)
    const [context, aiPayload] = await Promise.all([
      getUserTimeContext(userId),
      buildAiTimeContextPayload(userId),
    ])
    return NextResponse.json({
      ok: true,
      context,
      aiTimeContext: aiPayload,
      fantasyTimeEngine: aiPayload,
    })
  } catch (e) {
    console.error('[time-context GET]', e)
    return NextResponse.json({ error: 'Failed to load time context' }, { status: 500 })
  }
}

/**
 * POST — device/browser timezone + local ISO time (throttled client). Updates mismatch flags.
 */
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await ensureUserProfileForUserId(userId)

  const json = await req.json().catch(() => null)
  const parsed = postSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  const out = await persistDeviceTimeContext({
    userId,
    deviceTimezone: parsed.data.deviceTimezone,
    deviceLocalIso: parsed.data.deviceLocalIso,
  })

  if (!out.ok) {
    return NextResponse.json({ ok: false, error: 'Invalid device time or timezone' }, { status: 400 })
  }

  const context = await getUserTimeContext(userId)
  return NextResponse.json({ ok: true, timeMismatchFlag: out.timeMismatchFlag, context })
}
