import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { syncOutboundLeagueChat } from '@/lib/discord/sync-outbound'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const body = (await req.json().catch(() => null)) as {
    leagueId?: string
    messageId?: string
    authorName?: string
    authorAvatarUrl?: string | null
    text?: string
    gifUrl?: string | null
  } | null

  const leagueId = typeof body?.leagueId === 'string' ? body.leagueId.trim() : ''
  const messageId = typeof body?.messageId === 'string' ? body.messageId.trim() : ''
  if (!leagueId || !messageId) {
    return NextResponse.json({ error: 'leagueId and messageId required' }, { status: 400 })
  }

  // Internal/cron may omit session; allow server-to-server with secret header
  const internal = req.headers.get('x-discord-sync-secret')
  const secret = process.env.DISCORD_SYNC_INTERNAL_SECRET ?? process.env.CRON_SECRET
  const allowInternal = secret && internal === secret

  if (!allowInternal && !session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await syncOutboundLeagueChat({
    leagueId,
    messageId,
    authorName: typeof body?.authorName === 'string' ? body.authorName : 'Manager',
    authorAvatarUrl: body?.authorAvatarUrl ?? null,
    text: typeof body?.text === 'string' ? body.text : '',
    gifUrl: body?.gifUrl ?? null,
  })

  return NextResponse.json(result)
}
