import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { joinByInviteCode } from '@/lib/creator-system'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const code = typeof body.code === 'string' ? body.code.trim() : null
  if (!code) return NextResponse.json({ error: 'Missing code' }, { status: 400 })

  const result = await joinByInviteCode(code, userId)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json(result)
}
