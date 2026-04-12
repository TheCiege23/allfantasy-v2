/**
 * [UPDATED] app/api/tournament/[tournamentId]/export/route.ts
 * GET: Export tournament standings as CSV download.
 * Supports Legacy tournaments via TournamentExportService.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { buildTournamentExportRows, serializeExportToCSV } from '@/lib/tournament-mode/TournamentExportService'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params

  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { name: true, creatorId: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    const rows = await buildTournamentExportRows(tournamentId)
    const csv = serializeExportToCSV(rows)
    const safeName = tournament.name.replace(/[^a-zA-Z0-9_-]/g, '_')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${safeName}_standings.csv"`,
      },
    })
  } catch (e) {
    console.error('[tournament/export]', e)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
