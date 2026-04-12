/**
 * [UPDATED] app/api/tournament/[tournamentId]/ai/route.ts
 * POST: Generate tournament AI content (recaps, standings analysis, bubble watch, etc.)
 * Uses deterministic context only — AI never decides outcomes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateTournamentAI } from '@/lib/tournament-mode/ai/TournamentAIService'
import { buildTournamentAIContext } from '@/lib/tournament-mode/ai/TournamentAIContext'
import type { TournamentAIType } from '@/lib/tournament-mode/ai/TournamentAIPrompts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const AI_TYPE_TO_PURPOSE: Record<string, 'commissioner' | 'announcement' | 'recap' | 'standings' | 'bracket' | 'draft_prep'> = {
  commissioner_assistant: 'commissioner',
  round_announcement: 'announcement',
  weekly_recap: 'recap',
  bubble_watch: 'standings',
  finals_hype: 'bracket',
  champion_story: 'recap',
  draft_prep: 'draft_prep',
  standings_analysis: 'standings',
  bracket_preview: 'bracket',
}

const VALID_AI_TYPES = new Set<string>([
  'commissioner_assistant',
  'round_announcement',
  'weekly_recap',
  'bubble_watch',
  'finals_hype',
  'champion_story',
  'draft_prep',
  'standings_analysis',
  'bracket_preview',
])

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { tournamentId } = await params

  // Verify tournament exists and user has access
  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true },
  })
  if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const aiType = body.type as string
  if (!aiType || !VALID_AI_TYPES.has(aiType)) {
    return NextResponse.json(
      { error: `Invalid AI type. Valid types: ${[...VALID_AI_TYPES].join(', ')}` },
      { status: 400 }
    )
  }

  // Commissioner-only types
  const commissionerOnlyTypes = new Set(['commissioner_assistant'])
  if (commissionerOnlyTypes.has(aiType) && tournament.creatorId !== userId) {
    return NextResponse.json({ error: 'Commissioner access required for this AI type' }, { status: 403 })
  }

  try {
    const purpose = AI_TYPE_TO_PURPOSE[aiType] ?? 'recap'
    const context = await buildTournamentAIContext(tournamentId, purpose)

    if (!context) {
      return NextResponse.json({ error: 'Could not build tournament context' }, { status: 500 })
    }

    const result = await generateTournamentAI(
      aiType as TournamentAIType,
      context,
      {
        roundIndex: typeof body.roundIndex === 'number' ? body.roundIndex : undefined,
        announcementType: typeof body.announcementType === 'string' ? body.announcementType : undefined,
      }
    )

    if (!result.ok) {
      return NextResponse.json({ error: result.error ?? 'AI generation failed' }, { status: 500 })
    }

    return NextResponse.json({ text: result.text, model: result.model })
  } catch (e) {
    console.error('[tournament/ai] Error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'AI generation failed' },
      { status: 500 }
    )
  }
}
