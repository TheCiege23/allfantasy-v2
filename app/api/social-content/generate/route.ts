import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateContent } from '@/lib/social-content-generator'
import type { SocialContentType } from '@/lib/social-content-generator/types'

export const dynamic = 'force-dynamic'

const VALID_TYPES: SocialContentType[] = [
  'draft_results',
  'weekly_recap',
  'trade_reaction',
  'power_rankings',
]

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const type = VALID_TYPES.includes(body.type as SocialContentType) ? body.type : 'weekly_recap'
  const data = body.data ?? {}

  const context = { type, data } as Parameters<typeof generateContent>[0]
  const result = generateContent(context)

  return NextResponse.json({
    ok: true,
    caption: result.caption,
    hashtags: result.hashtags,
    title: result.title,
    bodyLines: result.bodyLines,
    cardType: result.cardType,
    cardPayload: result.cardPayload,
  })
}
