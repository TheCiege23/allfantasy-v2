import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { openaiChatText } from '@/lib/openai-client'
import { prisma } from '@/lib/prisma'
import { buildDisputeContext } from '@/lib/ai-commissioner'
import { buildAIPrestigeContext } from '@/lib/prestige-governance/AIPrestigeContextResolver'
import { getUnifiedManagerSummary } from '@/lib/prestige-governance/UnifiedPrestigeQueryService'

export const dynamic = 'force-dynamic'

export async function POST(
  req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = (await req.json().catch(() => ({}))) as Partial<{ alertId: string }>
  const alertId = String(body.alertId ?? '').trim()
  if (!alertId) return NextResponse.json({ error: 'alertId is required' }, { status: 400 })

  const alert = await prisma.aiCommissionerAlert.findFirst({
    where: { alertId, leagueId },
  })
  if (!alert) return NextResponse.json({ error: 'Alert not found' }, { status: 404 })

  const sport = String(alert.sport)
  const relatedManagerIds = Array.isArray(alert.relatedManagerIds) ? alert.relatedManagerIds : []
  const [disputeContext, prestigeContext, relatedManagerSummaries] = await Promise.all([
    buildDisputeContext({
      leagueId,
      relatedTradeId: alert.relatedTradeId,
      relatedMatchupId: alert.relatedMatchupId,
    }),
    buildAIPrestigeContext(leagueId, sport).catch(() => null),
    Promise.all(
      relatedManagerIds
        .slice(0, 4)
        .map((managerId) =>
          getUnifiedManagerSummary(leagueId, String(managerId), sport).catch(() => null)
        )
    ).catch(() => []),
  ])
  const payload = {
    leagueId,
    sport,
    alert: {
      alertId: alert.alertId,
      alertType: alert.alertType,
      severity: alert.severity,
      headline: alert.headline,
      summary: alert.summary,
      relatedManagerIds,
      relatedTradeId: alert.relatedTradeId,
      relatedMatchupId: alert.relatedMatchupId,
      status: alert.status,
      createdAt: alert.createdAt.toISOString(),
    },
    disputeContext,
    prestigeContext,
    relatedManagerSummaries: relatedManagerSummaries.filter(Boolean),
  }

  const fallback = `${alert.headline}: ${alert.summary} ${disputeContext.summary}`.trim()
  const ai = await openaiChatText({
    messages: [
      {
        role: 'system',
        content:
          'You are an AI fantasy league commissioner assistant. Provide a concise explanation (3-5 sentences) of why this governance alert matters, what evidence it uses, and what safe commissioner action to take next. When relevant, connect commissioner trust, legacy, and Hall of Fame context. Do not imply automatic rule override.',
      },
      {
        role: 'user',
        content: JSON.stringify(payload),
      },
    ],
    temperature: 0.35,
    maxTokens: 320,
  }).catch(() => null)

  return NextResponse.json({
    narrative: ai?.ok && ai.text?.trim() ? ai.text.trim() : fallback,
    source: ai?.ok && ai.text?.trim() ? 'ai' : 'template',
    context: payload,
  })
}
