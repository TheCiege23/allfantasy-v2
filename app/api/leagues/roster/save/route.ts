import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// Placeholder save endpoint for homepage/app roster auto-save.
// In a future pass this should validate league membership and persist to a real model.
// For now, it simply validates auth and accepts the payload.
export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { leagueId, roster } = body || {}

  return NextResponse.json({ ok: true })
}


