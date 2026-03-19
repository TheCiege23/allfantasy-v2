/**
 * GET: Minimal league summary (id, name, sport) for shell/header.
 * Used when league is a fantasy League (not BracketLeague) so the app shell can show the correct name.
 * Access: any user who can access the league (commissioner or has roster).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canAccessLeagueDraft } from '@/lib/live-draft-engine/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { leagueId } = await ctx.params
  if (!leagueId) return NextResponse.json({ error: 'Missing leagueId' }, { status: 400 })

  const allowed = await canAccessLeagueDraft(leagueId, userId)
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, name: true, sport: true, leagueVariant: true, avatarUrl: true, isDynasty: true, settings: true },
  })
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 })

  const settings = league.settings as Record<string, unknown> | null
  const leagueType = typeof settings?.league_type === 'string' ? String(settings.league_type).trim().toLowerCase() : null

  return NextResponse.json({
    id: league.id,
    name: league.name ?? 'League',
    sport: league.sport ?? 'NFL',
    leagueVariant: league.leagueVariant ?? null,
    avatarUrl: league.avatarUrl ?? null,
    isDynasty: league.isDynasty ?? false,
    leagueType: leagueType || null,
  })
}
