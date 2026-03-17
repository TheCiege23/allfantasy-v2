/**
 * POST /api/draft-ai — Draft AI Assistant (PROMPT 240).
 * Deterministic: best available player, roster needs. AI optional: explanation.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runDraftAIAssist } from '@/lib/draft-ai-engine'

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
  const sport = String(body.sport || 'NFL').toUpperCase()
  const isDynasty = Boolean(body.isDynasty)
  const isSF = Boolean(body.isSF)
  const mode: 'bpa' | 'needs' = body.mode === 'bpa' ? 'bpa' : 'needs'
  const aiAdpByKey = body.aiAdpByKey && typeof body.aiAdpByKey === 'object' ? body.aiAdpByKey : undefined
  const byeByKey = body.byeByKey && typeof body.byeByKey === 'object' ? body.byeByKey : undefined
  const explanation = Boolean(body.explanation)
  const leagueId = body.leagueId ?? undefined

  const normalized = available.slice(0, 200).map((p: Record<string, unknown>) => ({
    name: String(p.name ?? p.playerName ?? ''),
    position: String(p.position ?? ''),
    team: p.team ?? null,
    adp: p.adp ?? p.rank ?? null,
    byeWeek: p.byeWeek ?? null,
  }))

  const input = {
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
    byeByKey:
      byeByKey ??
      (normalized.length
        ? Object.fromEntries(
            normalized
              .filter((p: { byeWeek?: number | null }) => p.byeWeek != null)
              .map((p: { name: string; position: string; team: string | null; byeWeek: number }) => [
                `${(p.name || '').toLowerCase()}|${(p.position || '').toLowerCase()}|${(p.team || '').toLowerCase()}`,
                p.byeWeek,
              ])
          )
        : undefined),
  }

  const result = await runDraftAIAssist(input, {
    explanation,
    sport,
    leagueId,
  })

  return NextResponse.json({
    ok: true,
    recommendation: result.recommendation.recommendation,
    alternatives: result.recommendation.alternatives,
    reachWarning: result.recommendation.reachWarning,
    valueWarning: result.recommendation.valueWarning,
    scarcityInsight: result.recommendation.scarcityInsight,
    byeNote: result.recommendation.byeNote,
    explanation: result.explanation ?? result.recommendation.explanation,
    caveats: result.recommendation.caveats,
  })
}
