import { NextResponse } from 'next/server'
import { getProfileById } from '@/lib/psychological-profiles/ManagerBehaviorQueryService'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * POST /api/leagues/[leagueId]/psychological-profiles/explain
 * Body: { profileId: string }
 * Returns a short narrative explanation of the manager's behavior profile (for "Explain this manager style" UI).
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  try {
    const { leagueId } = await ctx.params
    if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const profileId = body.profileId
    if (!profileId) return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })

    const profile = await getProfileById(profileId)
    if (!profile || profile.leagueId !== leagueId) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const evidence = await prisma.profileEvidenceRecord.findMany({
      where: { profileId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    const labelsSummary = profile.profileLabels.length > 0
      ? profile.profileLabels.join(', ')
      : 'No behavioral labels yet'

    const narrative = [
      `Manager ${profile.managerId} has a ${profile.sportLabel} behavior profile.`,
      `Labels: ${labelsSummary}.`,
      `Scores — Aggression: ${profile.aggressionScore.toFixed(0)}, Activity: ${profile.activityScore.toFixed(0)}, Trade frequency: ${profile.tradeFrequencyScore.toFixed(0)}, Waiver focus: ${profile.waiverFocusScore.toFixed(0)}, Risk tolerance: ${profile.riskToleranceScore.toFixed(0)}.`,
      profile.evidenceCount && profile.evidenceCount > 0
        ? `Evidence: ${profile.evidenceCount} recorded signals (trades, waivers, rebuild/contention).`
        : 'Evidence is being collected.',
    ].join(' ')

    return NextResponse.json({
      profileId,
      leagueId,
      narrative,
      profileLabels: profile.profileLabels,
      evidencePreview: evidence.slice(0, 5).map((e) => ({
        evidenceType: e.evidenceType,
        value: e.value,
        sourceReference: e.sourceReference,
      })),
    })
  } catch (e) {
    console.error('[psychological-profiles/explain POST]', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to explain profile' },
      { status: 500 }
    )
  }
}
