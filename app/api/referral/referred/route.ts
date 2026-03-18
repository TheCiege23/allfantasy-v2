/**
 * GET /api/referral/referred — list users this referrer invited (who invited who).
 * Returns displayName (or null for privacy) and createdAt per signup.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getReferredUsers } from '@/lib/referral'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const referred = await getReferredUsers(userId)
  return NextResponse.json({ ok: true, referred })
}
