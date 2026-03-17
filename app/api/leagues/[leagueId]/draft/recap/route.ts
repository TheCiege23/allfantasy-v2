/**
 * POST: Generate AI draft recap for a completed draft.
 * Auth: canAccessLeagueDraft.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { buildSessionSnapshot } from '@/lib/live-draft-engine/DraftSessionService'
import { openaiChatText } from '@/lib/openai-client'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const snapshot = await buildSessionSnapshot(leagueId)
    if (!snapshot) return NextResponse.json({ error: 'No draft session' }, { status: 404 })
    if (snapshot.status !== 'completed') {
      return NextResponse.json({ error: 'Draft is not completed' }, { status: 400 })
    }

    const picks = snapshot.picks ?? []
    const byPosition: Record<string, number> = {}
    for (const p of picks) {
      const pos = p.position || 'OTHER'
      byPosition[pos] = (byPosition[pos] ?? 0) + 1
    }
    const slotOrder = snapshot.slotOrder ?? []
    const teamSummaries = slotOrder.slice(0, 20).map((s) => {
      const teamPicks = picks.filter((p) => p.rosterId === s.rosterId)
      const names = teamPicks.slice(0, 15).map((p) => `${p.playerName} (${p.position})`)
      if (teamPicks.length > 15) names.push(`... +${teamPicks.length - 15} more`)
      return `- ${s.displayName ?? `Team ${s.slot}`}: ${names.join(', ')}`
    }).join('\n')

    const summary = [
      `Fantasy draft completed. Sport: ${snapshot.draftType ?? 'draft'}.`,
      `Rounds: ${snapshot.rounds}. Teams: ${snapshot.teamCount}. Total picks: ${picks.length}.`,
      `Positions drafted: ${Object.entries(byPosition).sort((a, b) => b[1] - a[1]).map(([p, n]) => `${p}=${n}`).join(', ')}.`,
      '',
      'Team rosters (first 15 picks per team):',
      teamSummaries,
    ].join('\n')

    const result = await openaiChatText({
      messages: [
        {
          role: 'system',
          content: 'You are a concise fantasy sports analyst. In 2-4 short paragraphs, summarize this completed draft: highlight notable picks, positional balance, and one or two strategic observations. Keep tone neutral and informative. Do not invent player names; only reference the data provided.',
        },
        {
          role: 'user',
          content: summary,
        },
      ],
      temperature: 0.5,
      maxTokens: 600,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: result.details ?? 'AI recap failed' },
        { status: 502 }
      )
    }

    return NextResponse.json({ recap: result.text })
  } catch (e) {
    console.error('[draft/recap POST]', e)
    return NextResponse.json(
      { error: (e as Error).message ?? 'Server error' },
      { status: 500 }
    )
  }
}
