/**
 * GET /api/leagues/[leagueId]/draft/[draftId]/validate-pre-draft
 *
 * Pre-draft validation report for commissioner UI (`PreDraftWizard`).
 */

import { NextRequest, NextResponse } from 'next/server'
import { DraftValidationOrchestrator } from '@/lib/draft/validation/DraftValidationOrchestrator'

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ leagueId: string; draftId: string }> },
) {
  try {
    const { leagueId, draftId } = await ctx.params

    if (!leagueId || !draftId) {
      return NextResponse.json({ error: 'Missing leagueId or draftId' }, { status: 400 })
    }

    const report = await DraftValidationOrchestrator.validateDraft(leagueId, draftId)

    return NextResponse.json(report)
  } catch (err) {
    console.error('[validate-pre-draft] error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Validation failed' },
      { status: 500 },
    )
  }
}
