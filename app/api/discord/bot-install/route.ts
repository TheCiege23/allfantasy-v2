import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DISCORD_BOT_CALLBACK_URI, DISCORD_BOT_PERMISSIONS, DISCORD_CLIENT_ID } from '@/lib/discord/constants'
import { isBotConfigured } from '@/lib/discord/bot'

export const dynamic = 'force-dynamic'

const BASE = process.env.NEXTAUTH_URL ?? 'https://www.allfantasy.ai'

export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login?callbackUrl=/settings', BASE))
  }

  if (!isBotConfigured()) {
    return NextResponse.redirect(new URL('/settings?discord=bot-not-ready', BASE))
  }

  const url = new URL('https://discord.com/oauth2/authorize')
  url.searchParams.set('client_id', DISCORD_CLIENT_ID)
  url.searchParams.set('scope', 'bot')
  url.searchParams.set('permissions', DISCORD_BOT_PERMISSIONS)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', DISCORD_BOT_CALLBACK_URI)

  return NextResponse.redirect(url)
}
