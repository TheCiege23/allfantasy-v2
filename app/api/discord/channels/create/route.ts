import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createLeagueChannel, createWebhook, isBotConfigured, postMessage } from '@/lib/discord/bot'
import { channelLink } from '@/lib/discord/deepLinks'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isBotConfigured()) {
    return NextResponse.json({ error: 'Discord bot not configured' }, { status: 503 })
  }

  const body = (await req.json().catch(() => null)) as { leagueId?: string; guildId?: string } | null
  const leagueId = typeof body?.leagueId === 'string' ? body.leagueId.trim() : ''
  const guildId = typeof body?.guildId === 'string' ? body.guildId.trim() : ''

  if (!leagueId || !guildId) {
    return NextResponse.json({ error: 'leagueId and guildId required' }, { status: 400 })
  }

  const league = await prisma.league.findFirst({
    where: { id: leagueId },
    select: { userId: true, name: true },
  })
  if (!league || league.userId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const guildLink = await prisma.discordGuildLink.findUnique({ where: { guildId } })
  if (!guildLink || guildLink.linkedByUserId !== session.user.id) {
    return NextResponse.json({ error: 'Guild not linked by you' }, { status: 403 })
  }

  const leagueName = league.name ?? 'League'
  const { channelId, channelName } = await createLeagueChannel(guildId, leagueName)
  const webhook = await createWebhook(channelId, 'AllFantasy')

  await prisma.discordLeagueChannel.upsert({
    where: { leagueId_guildId: { leagueId, guildId } },
    create: {
      leagueId,
      guildId,
      channelId,
      channelName,
      webhookId: webhook.id,
      webhookToken: webhook.token,
    },
    update: {
      channelId,
      channelName,
      webhookId: webhook.id,
      webhookToken: webhook.token,
    },
  })

  await postMessage(
    channelId,
    `🔔 **${leagueName}** is now synced with AllFantasy league chat. Post in-game updates here or in the app!`
  )

  const channelUrl = channelLink(guildId, channelId)

  return NextResponse.json({
    channelId,
    channelName,
    channelUrl,
  })
}
