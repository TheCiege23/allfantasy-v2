/**
 * GET: Whether a rollback backup exists for this league. Commissioner or member.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'
import { hasImportBackup } from '@/lib/draft-import'
import { getDraftUISettingsForLeague } from '@/lib/draft-defaults/DraftUISettingsResolver'

export const dynamic = 'force-dynamic'

export async function GET(
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

  const uiSettings = await getDraftUISettingsForLeague(leagueId)
  if (!uiSettings.importEnabled) {
    return NextResponse.json({ hasBackup: false, importEnabled: false })
  }

  const hasBackup = await hasImportBackup(leagueId)
  return NextResponse.json({ hasBackup, importEnabled: true })
}
