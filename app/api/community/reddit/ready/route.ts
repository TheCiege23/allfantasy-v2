/**
 * POST /api/community/reddit/ready — get Reddit-ready post (title + body + submit URL).
 */

import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildRedditReadyPost } from '@/lib/community-integration'
import type { CommunityShareInput } from '@/lib/community-integration/types'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const input: CommunityShareInput = {
    kind: (body.kind as CommunityShareInput['kind']) ?? 'generic',
    title: String(body.title ?? ''),
    description: String(body.description ?? ''),
    url: body.url ? String(body.url) : undefined,
    imageUrl: body.imageUrl ? String(body.imageUrl) : undefined,
    extraLines: Array.isArray(body.extraLines) ? body.extraLines.map(String) : undefined,
  }

  const post = buildRedditReadyPost(input)
  return NextResponse.json({ ok: true, ...post })
}
