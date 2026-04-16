import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getSavedRecommendationById,
  markSavedRecommendationActedOn,
} from '@/lib/chimmy-actions/server-store'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const sessionUserId = session?.user?.id
  if (!sessionUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  const row = await getSavedRecommendationById(id, sessionUserId)
  if (!row) {
    return NextResponse.json({ ok: true, row: null })
  }

  return NextResponse.json({ ok: true, row })
}

export async function PATCH(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const sessionUserId = session?.user?.id
  if (!sessionUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await ctx.params
  await markSavedRecommendationActedOn(id, sessionUserId)
  return NextResponse.json({ ok: true })
}
