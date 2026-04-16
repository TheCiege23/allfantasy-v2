import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { createSavedRecommendation, listSavedRecommendations } from '@/lib/chimmy-actions/server-store'
import type { SavedAIRecommendation } from '@/lib/chimmy-actions'

const BodySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  leagueId: z.string().optional().nullable(),
  sport: z.string().min(1),
  leagueType: z.string().min(1),
  surface: z.string().min(1),
  recommendationText: z.string().min(1),
  action: z.any(),
  savedAt: z.number().int(),
  expiresAt: z.number().int().optional().nullable(),
  actedOn: z.boolean().optional(),
  actedOnAt: z.number().int().optional().nullable(),
})

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const sessionUserId = session?.user?.id
  if (!sessionUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body', details: parsed.error.flatten() }, { status: 400 })
  }

  if (parsed.data.userId !== sessionUserId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const recommendation: SavedAIRecommendation = {
      ...parsed.data,
      action: parsed.data.action,
      actedOn: parsed.data.actedOn,
      actedOnAt: parsed.data.actedOnAt,
      expiresAt: parsed.data.expiresAt,
      leagueId: parsed.data.leagueId,
    }
    const id = await createSavedRecommendation(recommendation)
    return NextResponse.json({ ok: true, id })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save recommendation', details: String(error) }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const sessionUserId = session?.user?.id
  if (!sessionUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limitRaw = req.nextUrl.searchParams.get('limit')
  const limit = Math.max(1, Math.min(Number(limitRaw ?? '20') || 20, 500))

  const rows = await listSavedRecommendations(sessionUserId, limit)
  return NextResponse.json({ ok: true, rows })
}
