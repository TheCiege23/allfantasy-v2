/**
 * GET /api/viral/attribution
 * Returns current user's growth attribution (how they signed up) — PROMPT 291.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAttribution } from '@/lib/viral-loop'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const attribution = await getAttribution(userId)
  return NextResponse.json({ attribution: attribution ?? null })
}
