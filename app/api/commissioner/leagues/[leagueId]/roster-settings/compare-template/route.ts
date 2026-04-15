import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { compareLeagueRosterToTemplate } from '@/lib/roster-engine'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { leagueId } = await params
    const result = await compareLeagueRosterToTemplate(leagueId)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to compare roster template' }, { status: 400 })
  }
}
