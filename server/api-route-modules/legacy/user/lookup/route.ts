import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAuthOrOrigin, forbiddenResponse } from '@/lib/api-auth'
import { getSleeperUser } from '@/lib/sleeper-client'
import { withApiUsage } from '@/lib/telemetry/usage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  username: z.string().min(1).max(100),
})

export const POST = withApiUsage({ endpoint: '/api/legacy/user/lookup', tool: 'LegacyUserLookup' })(
  async (request: NextRequest) => {
    const auth = requireAuthOrOrigin(request)
    if (!auth.authenticated) {
      return forbiddenResponse(auth.error || 'Unauthorized')
    }

    const body = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const username = parsed.data.username.trim()
    const user = await getSleeperUser(username)
    if (!user?.user_id) {
      return NextResponse.json({ error: 'Sleeper user not found' }, { status: 404 })
    }

    return NextResponse.json({
      user_id: user.user_id,
      username: user.username,
      display_name: user.display_name,
      avatar: user.avatar,
    })
  }
)
