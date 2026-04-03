import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { DISCORD_CLIENT_ID, DISCORD_OAUTH_REDIRECT_URI } from '@/lib/discord/constants'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login?callbackUrl=/settings', process.env.NEXTAUTH_URL ?? 'https://www.allfantasy.ai'))
  }

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('discord_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 600,
    path: '/',
  })

  const url = new URL('https://discord.com/oauth2/authorize')
  url.searchParams.set('client_id', DISCORD_CLIENT_ID)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', DISCORD_OAUTH_REDIRECT_URI)
  url.searchParams.set('scope', 'identify email')
  url.searchParams.set('state', state)

  return NextResponse.redirect(url)
}
