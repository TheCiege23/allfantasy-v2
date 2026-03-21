/**
 * POST /api/draft/recommend — deterministic draft recommendation.
 * Uses only provided pool and draft state; no invented players. For live and mock draft.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { computeDraftRecommendation } from '@/lib/draft-helper/RecommendationEngine'
import { resolveSportForAI } from '@/lib/ai/AISportContextResolver'
import { resolveSportVariantContext } from '@/lib/league-defaults-orchestrator/SportVariantContextResolver'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const available = Array.isArray(body.available) ? body.available : []
  const teamRoster = Array.isArray(body.teamRoster) ? body.teamRoster : []
  const rosterSlots = Array.isArray(body.rosterSlots) ? body.rosterSlots : []
  const round = Math.max(1, Number(body.round) || 1)
  const pick = Math.max(1, Number(body.pick) || 1)
  const totalTeams = Math.max(2, Math.min(24, Number(body.totalTeams) || 12))
  const leagueVariant =
    typeof body.leagueVariant === 'string'
      ? body.leagueVariant
      : typeof body.league_variant === 'string'
        ? body.league_variant
        : null
  const sport = resolveSportVariantContext(resolveSportForAI(body as Record<string, unknown>), leagueVariant).sport
  const isDynasty = Boolean(body.isDynasty)
  const isSF = Boolean(body.isSF)
  const mode = body.mode === 'bpa' ? 'bpa' : 'needs'
  const aiAdpByKey = body.aiAdpByKey && typeof body.aiAdpByKey === 'object' ? body.aiAdpByKey : undefined
  const byeByKey = body.byeByKey && typeof body.byeByKey === 'object' ? body.byeByKey : undefined

  const normalized = available.slice(0, 200).map((p: any) => ({
    name: String(p.name ?? p.playerName ?? ''),
    position: String(p.position ?? ''),
    team: p.team ?? null,
    adp: p.adp ?? p.rank ?? null,
    byeWeek: p.byeWeek ?? null,
  }))

  const result = computeDraftRecommendation({
    available: normalized,
    teamRoster,
    rosterSlots,
    round,
    pick,
    totalTeams,
    sport,
    isDynasty,
    isSF,
    mode,
    aiAdpByKey,
    byeByKey: byeByKey ?? (normalized.length ? Object.fromEntries(
      normalized.filter((p: any) => p.byeWeek != null).map((p: any) => [
        `${(p.name || '').toLowerCase()}|${(p.position || '').toLowerCase()}|${(p.team || '').toLowerCase()}`,
        p.byeWeek,
      ])
    ) : undefined),
  })

  return NextResponse.json({
    ok: true,
    recommendation: result.recommendation,
    alternatives: result.alternatives,
    reachWarning: result.reachWarning,
    valueWarning: result.valueWarning,
    scarcityInsight: result.scarcityInsight,
    byeNote: result.byeNote,
    explanation: result.explanation,
    caveats: result.caveats,
  })
}
