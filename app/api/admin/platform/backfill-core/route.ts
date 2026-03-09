import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveAdminEmail } from '@/lib/auth/admin'
import { runPlatformCoreBackfill } from '@/lib/platform/backfill-core'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { email?: string | null }
  } | null

  const isAdmin = resolveAdminEmail(session?.user?.email || null)
  if (!isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const limit = Number(body?.limit || 5000)

  const result = await runPlatformCoreBackfill(limit)
  return NextResponse.json({ status: 'ok', result })
}
