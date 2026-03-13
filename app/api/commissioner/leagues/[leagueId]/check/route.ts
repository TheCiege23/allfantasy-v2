import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isCommissioner } from '@/lib/commissioner/permissions'

export async function GET(
  _req: NextRequest,
  { params }: { params: { leagueId: string } }
) {
  const session = await getServerSession(authOptions as any)
  const userId = (session?.user as any)?.id
  const leagueId = params.leagueId
  if (!leagueId) return NextResponse.json({ error: 'League ID required' }, { status: 400 })

  const ok = await isCommissioner(leagueId, userId)
  return NextResponse.json({ isCommissioner: ok })
}
