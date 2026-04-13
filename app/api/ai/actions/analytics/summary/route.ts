import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'
import { authOptions } from '@/lib/auth'
import { getChimmyLearningSnapshot } from '@/lib/chimmy-actions'

const QuerySchema = z.object({
  limit: z.coerce.number().int().min(50).max(5000).optional(),
  includeSavedRecommendations: z
    .union([z.literal('true'), z.literal('false')])
    .optional(),
})

export async function GET(request: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const parsedQuery = QuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get('limit') ?? undefined,
    includeSavedRecommendations:
      request.nextUrl.searchParams.get('includeSavedRecommendations') ?? undefined,
  })

  if (!parsedQuery.success) {
    return NextResponse.json(
      {
        error: 'Invalid query parameters.',
        details: parsedQuery.error.flatten(),
      },
      { status: 400 },
    )
  }

  const { limit, includeSavedRecommendations } = parsedQuery.data

  const snapshot = await getChimmyLearningSnapshot(userId, {
    limit,
    includeSavedRecommendations: includeSavedRecommendations === 'true',
  })

  return NextResponse.json({
    ok: true,
    snapshot,
  })
}
