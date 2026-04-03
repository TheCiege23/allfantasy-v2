import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DISCORD_CLIENT_ID, DISCORD_OAUTH_REDIRECT_URI } from '@/lib/discord/constants'

export const dynamic = 'force-dynamic'

const SETTINGS_BASE = process.env.NEXTAUTH_URL ?? 'https://www.allfantasy.ai'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login?callbackUrl=/settings', SETTINGS_BASE))
  }

  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const err = searchParams.get('error')

  const cookieStore = await cookies()
  const stored = cookieStore.get('discord_oauth_state')?.value

  if (err) {
    cookieStore.delete('discord_oauth_state')
    return NextResponse.redirect(new URL(`/settings?discord=error`, SETTINGS_BASE))
  }

  if (!code || !state || !stored || stored !== state) {
    cookieStore.delete('discord_oauth_state')
    return NextResponse.redirect(new URL('/settings?discord=error', SETTINGS_BASE))
  }

  cookieStore.delete('discord_oauth_state')

  const secret = process.env.DISCORD_CLIENT_SECRET
  if (!secret) {
    return NextResponse.redirect(new URL('/settings?discord=error', SETTINGS_BASE))
  }

  const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: DISCORD_CLIENT_ID,
      client_secret: secret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: DISCORD_OAUTH_REDIRECT_URI,
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL('/settings?discord=error', SETTINGS_BASE))
  }

  const tokens = (await tokenRes.json()) as {
    access_token?: string
    refresh_token?: string
    token_type?: string
  }
  const access_token = tokens.access_token
  if (!access_token) {
    return NextResponse.redirect(new URL('/settings?discord=error', SETTINGS_BASE))
  }

  const userRes = await fetch('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${access_token}` },
  })

  if (!userRes.ok) {
    return NextResponse.redirect(new URL('/settings?discord=error', SETTINGS_BASE))
  }

  const data = (await userRes.json()) as {
    id: string
    username: string
    global_name?: string | null
    avatar?: string | null
    email?: string | null
  }

  const username = data.global_name ?? data.username

  await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      discordUserId: data.id,
      discordUsername: username,
      discordEmail: data.email ?? null,
      discordAvatar: data.avatar ?? null,
      discordAccessToken: access_token,
      discordRefreshToken: tokens.refresh_token ?? null,
      discordConnectedAt: new Date(),
    },
    update: {
      discordUserId: data.id,
      discordUsername: username,
      discordEmail: data.email ?? null,
      discordAvatar: data.avatar ?? null,
      discordAccessToken: access_token,
      discordRefreshToken: tokens.refresh_token ?? null,
      discordConnectedAt: new Date(),
    },
  })

  return NextResponse.redirect(new URL('/settings?discord=connected', SETTINGS_BASE))
}
