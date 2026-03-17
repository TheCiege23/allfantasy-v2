/**
 * POST: Commit import. Body: { preview }. Commissioner only. Creates backup before commit.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertCommissioner } from '@/lib/commissioner/permissions'
import { commitImport } from '@/lib/draft-import'
import { buildSessionSnapshot } from '@/lib/live-draft-engine/DraftSessionService'
import type { DraftImportPreview } from '@/lib/draft-import'

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

  try {
    await assertCommissioner(leagueId, userId)
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const preview = body.preview as DraftImportPreview | undefined
  if (!preview?.slotOrder || !Array.isArray(preview.picks)) {
    return NextResponse.json({ error: 'preview with slotOrder and picks required' }, { status: 400 })
  }

  const result = await commitImport(leagueId, preview, { backupBeforeCommit: true })
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const updated = await buildSessionSnapshot(leagueId)
  return NextResponse.json({
    ok: true,
    backupId: result.backupId,
    session: updated,
  })
}
