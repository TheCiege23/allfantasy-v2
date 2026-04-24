/**
 * GET: Read-only commissioner audit log for a league's draft pick edits.
 * Commissioner-gated via assertLeagueActionGate('draft_commissioner_control').
 *
 * Query params:
 *   limit   — 1..100 (default 25)
 *   cursor  — opaque id of last seen row (Prisma cursor pagination)
 *   action  — one of COMMISSIONER_PICK_EDIT_ACTIONS (optional filter)
 *   since   — ISO timestamp (optional lower bound, inclusive)
 *   until   — ISO timestamp (optional upper bound, exclusive)
 *
 * Response:
 *   { items: AuditLogRow[], nextCursor: string | null }
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertLeagueActionGate } from '@/server/services/leagueActionGate'
import { prisma } from '@/lib/prisma'
import { COMMISSIONER_PICK_EDIT_ACTIONS } from '@/lib/live-draft-engine/commissioner/commissionerPickEditService'

export const dynamic = 'force-dynamic'

const MAX_LIMIT = 100
const DEFAULT_LIMIT = 25

function clampLimit(raw: string | null): number {
  if (!raw) return DEFAULT_LIMIT
  const n = Number(raw)
  if (!Number.isFinite(n)) return DEFAULT_LIMIT
  return Math.min(MAX_LIMIT, Math.max(1, Math.floor(n)))
}

function parseIsoOrNull(raw: string | null): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  return Number.isFinite(d.getTime()) ? d : null
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ leagueId: string }> }) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const gate = await assertLeagueActionGate(leagueId, userId, 'draft_commissioner_control')
  if (!gate.ok) {
    return NextResponse.json({ error: gate.err.error, code: gate.err.code }, { status: gate.err.status })
  }

  const url = new URL(req.url)
  const limit = clampLimit(url.searchParams.get('limit'))
  const cursor = url.searchParams.get('cursor')?.trim() || null
  const actionRaw = url.searchParams.get('action')?.trim() || null
  const since = parseIsoOrNull(url.searchParams.get('since'))
  const until = parseIsoOrNull(url.searchParams.get('until'))

  const action =
    actionRaw && (COMMISSIONER_PICK_EDIT_ACTIONS as readonly string[]).includes(actionRaw)
      ? actionRaw
      : null

  const where: Record<string, unknown> = { leagueId }
  if (action) where.action = action
  if (since || until) {
    where.createdAt = {
      ...(since ? { gte: since } : {}),
      ...(until ? { lt: until } : {}),
    }
  }

  try {
    const rows = await prisma.draftPickAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // peek one extra to decide if nextCursor exists
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        action: true,
        overallPickNumber: true,
        round: true,
        actorUserId: true,
        oldRosterId: true,
        newRosterId: true,
        oldPlayerId: true,
        oldPlayerName: true,
        newPlayerId: true,
        newPlayerName: true,
        reason: true,
        metadata: true,
        createdAt: true,
      },
    })

    const hasMore = rows.length > limit
    const items = (hasMore ? rows.slice(0, limit) : rows).map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
    }))
    const nextCursor = hasMore ? rows[limit - 1].id : null

    return NextResponse.json({ items, nextCursor })
  } catch (err) {
    console.error('[draft/commissioner/audit-log GET]', err)
    return NextResponse.json(
      { error: (err as Error).message ?? 'Server error' },
      { status: 500 },
    )
  }
}
