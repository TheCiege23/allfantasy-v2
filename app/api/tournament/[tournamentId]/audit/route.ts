/**
 * [UPDATED] GET: Retrieve tournament audit logs.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTournamentAuditLogs } from '@/lib/tournament-mode/TournamentAuditService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params
  const tournament = await prisma.legacyTournament.findUnique({ where: { id: tournamentId }, select: { creatorId: true } })
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (tournament.creatorId !== userId) return NextResponse.json({ error: 'Commissioner only' }, { status: 403 })

  const limitParam = req.nextUrl.searchParams?.get('limit')
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 200) : 50
  const action = req.nextUrl.searchParams?.get('action') as string | undefined

  const logs = await getTournamentAuditLogs(tournamentId, { limit, action: action as any })
  return NextResponse.json({ logs })
}
