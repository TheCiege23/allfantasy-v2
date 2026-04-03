import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DISCORD_CLIENT_ID } from '@/lib/discord/constants'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { discordAccessToken: true },
  })

  const token = profile?.discordAccessToken
  const secret = process.env.DISCORD_CLIENT_SECRET

  if (token && secret) {
    const basic = Buffer.from(`${DISCORD_CLIENT_ID}:${secret}`).toString('base64')
    void fetch('https://discord.com/api/oauth2/token/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${basic}`,
      },
      body: new URLSearchParams({
        token,
        token_type_hint: 'access_token',
      }),
    }).catch(() => {})
  }

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: {
      discordUserId: null,
      discordUsername: null,
      discordEmail: null,
      discordAvatar: null,
      discordAccessToken: null,
      discordRefreshToken: null,
      discordConnectedAt: null,
      discordGuildId: null,
    },
  })

  return NextResponse.json({ success: true })
}
