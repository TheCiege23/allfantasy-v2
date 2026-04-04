/**
 * POST /api/tournament/[tournamentId]/ai — Tournament AI overlay (explanations, announcements, recaps).
 * All outcomes are deterministic; AI only explains, narrates, summarizes. PROMPT 4.
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateTournamentAI } from '@/lib/tournament-mode/ai/TournamentAIService'
import { buildTournamentAIContext } from '@/lib/tournament-mode/ai/TournamentAIContext'
import type { TournamentAIType } from '@/lib/tournament-mode/ai/TournamentAIPrompts'

const VALID_TYPES: TournamentAIType[] = [
  'commissioner_assistant',
  'round_announcement',
  'weekly_recap',
  'bubble_watch',
  'finals_hype',
  'champion_story',
  'draft_prep',
  'standings_analysis',
  'bracket_preview',
]

export async function POST(
  req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tournamentId } = await params
  const tournament = await prisma.legacyTournament.findUnique({
    where: { id: tournamentId },
    select: { id: true, creatorId: true, hubSettings: true },
  })
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
  }

  const hubSettings = (tournament.hubSettings as Record<string, unknown>) ?? {}
  const visibility = (hubSettings.visibility as string) ?? 'unlisted'
  const isCreator = tournament.creatorId === userId
  if (visibility === 'private' && !isCreator) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { type?: string; announcementType?: string; roundIndex?: number }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const type = (body.type ?? 'standings_analysis') as TournamentAIType
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const purpose =
    type === 'commissioner_assistant' ? 'commissioner' :
    type === 'round_announcement' || type === 'finals_hype' || type === 'champion_story' ? 'announcement' :
    type === 'weekly_recap' || type === 'bubble_watch' ? 'recap' :
    type === 'standings_analysis' ? 'standings' :
    type === 'bracket_preview' ? 'bracket' :
    type === 'draft_prep' ? 'draft_prep' : 'standings'

  const context = await buildTournamentAIContext(tournamentId, purpose)
  const result = await generateTournamentAI(type, context, {
    roundIndex: body.roundIndex,
    announcementType: body.announcementType,
  })

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? 'AI generation failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ text: result.text, ok: true })
}
