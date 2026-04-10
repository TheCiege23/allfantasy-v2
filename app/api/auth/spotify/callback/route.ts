import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? ''
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? ''
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI ?? 'https://www.allfantasy.ai/api/auth/spotify/callback'
const SETTINGS_BASE = process.env.NEXTAUTH_URL ?? 'https://www.allfantasy.ai'

/**
 * GET /api/auth/spotify/callback — Handle Spotify OAuth callback.
 * Exchanges code for tokens, stores in UserProfile.
 */
export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login?callbackUrl=/settings?tab=connected', SETTINGS_BASE))
  }

  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const err = searchParams.get('error')

  const cookieStore = await cookies()
  const stored = cookieStore.get('spotify_oauth_state')?.value
  cookieStore.delete('spotify_oauth_state')

  if (err) {
    console.warn('[spotify/callback] User denied:', err)
    return NextResponse.redirect(new URL('/settings?tab=connected&spotify=error', SETTINGS_BASE))
  }

  if (!code) {
    return NextResponse.redirect(new URL('/settings?tab=connected&spotify=error&reason=no_code', SETTINGS_BASE))
  }

  // State validation must reject missing or mismatched values.
  if (!state || !stored || stored !== state) {
    console.warn('[spotify/callback] State mismatch')
    return NextResponse.redirect(new URL('/settings?tab=connected&spotify=error&reason=state_mismatch', SETTINGS_BASE))
  }

  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return NextResponse.redirect(new URL('/settings?tab=connected&spotify=error&reason=not_configured', SETTINGS_BASE))
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: SPOTIFY_REDIRECT_URI,
    }),
  })

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text().catch(() => 'unknown')
    console.error('[spotify/callback] Token exchange failed:', tokenRes.status, errBody)
    return NextResponse.redirect(new URL('/settings?tab=connected&spotify=error&reason=token_exchange', SETTINGS_BASE))
  }

  const tokens = (await tokenRes.json()) as {
    access_token: string
    refresh_token: string
    expires_in: number
    token_type: string
    scope: string
  }

  // Get user profile from Spotify
  const profileRes = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })

  let spotifyUser: { id: string; display_name?: string; email?: string; product?: string; images?: Array<{ url: string }> } | null = null
  if (profileRes.ok) {
    spotifyUser = await profileRes.json()
  }

  const isPremium = spotifyUser?.product === 'premium'

  // Store non-sensitive Spotify profile metadata in notificationPreferences,
  // and keep OAuth tokens in auth_accounts.
  try {
    const existing = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { notificationPreferences: true },
    })

    const prefs = (existing?.notificationPreferences ?? {}) as Record<string, unknown>
    const spotifyAccountKey = `user:${session.user.id}`
    const expiresAtSeconds = Math.floor(Date.now() / 1000) + tokens.expires_in
    const spotifyData = {
      userId: spotifyUser?.id ?? null,
      displayName: spotifyUser?.display_name ?? null,
      email: spotifyUser?.email ?? null,
      isPremium,
      connectedAt: new Date().toISOString(),
    }

    await prisma.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        notificationPreferences: { ...prefs, spotify: spotifyData },
      },
      update: {
        notificationPreferences: { ...prefs, spotify: spotifyData },
      },
    })

    const existingSpotifyAccount = await prisma.authAccount.findFirst({
      where: {
        userId: session.user.id,
        provider: 'spotify',
      },
      select: { id: true },
    })

    if (existingSpotifyAccount) {
      await prisma.authAccount.update({
        where: { id: existingSpotifyAccount.id },
        data: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          expires_at: expiresAtSeconds,
          token_type: tokens.token_type ?? null,
          scope: tokens.scope ?? null,
        },
      })
    } else {
      await prisma.authAccount.create({
        data: {
          userId: session.user.id,
          type: 'oauth',
          provider: 'spotify',
          providerAccountId: spotifyAccountKey,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          expires_at: expiresAtSeconds,
          token_type: tokens.token_type ?? null,
          scope: tokens.scope ?? null,
        },
      })
    }
  } catch (e) {
    console.error('[spotify/callback] Profile upsert failed:', e)
    return NextResponse.redirect(new URL('/settings?tab=connected&spotify=error&reason=db_error', SETTINGS_BASE))
  }

  return NextResponse.redirect(new URL('/settings?tab=connected&spotify=connected', SETTINGS_BASE))
}
