/**
 * Returns the resolved roster template for a league, aggregated into the flat
 * shape consumed by the draft-room team panel (DraftRosterStrip). Reuses the
 * same `getRosterTemplateForLeague` helper the post-draft lineup finalizer
 * uses (lib/live-draft-engine/RosterAssignmentService), so the strip reflects
 * whatever slots will actually be assigned when the draft completes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { assertLeagueMember } from '@/lib/league/league-access'
import { getRosterTemplateForLeague } from '@/lib/multi-sport/MultiSportRosterService'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: NextRequest,
  { params }: { params: { leagueId: string } },
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leagueId = params.leagueId?.trim()
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  const gate = await assertLeagueMember(leagueId, userId)
  if (!gate.ok) {
    return NextResponse.json(
      { error: gate.status === 404 ? 'League not found' : 'Forbidden' },
      { status: gate.status },
    )
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { sport: true, settings: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const formatType =
    (league.settings && typeof league.settings === 'object' && !Array.isArray(league.settings)
      ? ((league.settings as Record<string, unknown>).formatType as string | undefined)
      : undefined) ?? 'standard'

  const template = await getRosterTemplateForLeague(league.sport, formatType, leagueId).catch(
    () => null,
  )
  if (!template) {
    return NextResponse.json({ error: 'Template unavailable' }, { status: 500 })
  }

  // Aggregate template slots into the flat shape DraftRosterStrip consumes.
  const starterSlots: Record<string, number> = {}
  let benchSlots = 0
  let taxiSlots = 0
  let devySlots = 0
  for (const slot of template.slots) {
    if ((slot.starterCount ?? 0) > 0) {
      const key = slot.slotName.trim().toUpperCase()
      starterSlots[key] = (starterSlots[key] ?? 0) + (slot.starterCount ?? 0)
    }
    benchSlots += slot.benchCount ?? 0
    taxiSlots += slot.taxiCount ?? 0
    devySlots += slot.devyCount ?? 0
  }

  return NextResponse.json({
    templateId: template.templateId,
    sportType: template.sportType,
    formatType: template.formatType,
    starterSlots,
    benchSlots,
    taxiSlots,
    devySlots,
    slots: template.slots,
  })
}
