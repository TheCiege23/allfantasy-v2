import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listMyInviteLinks } from '@/lib/invite-engine'
import type { InviteType } from '@/lib/invite-engine/types'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const type = req.nextUrl.searchParams.get('type') as InviteType | undefined
  const links = await listMyInviteLinks(userId, type)
  return NextResponse.json({ ok: true, links })
}
