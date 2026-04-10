import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? ''
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? ''

type SpotifyData = {
  userId?: string | null
  displayName?: string | null
  email?: string | null
  accessToken?: string | null
  refreshToken?: string | null
  tokenExpiresAt?: string | null
  isPremium?: boolean
  connectedAt?: string | null
}

/**
 * GET /api/spotify/token — Get a valid Spotify access token for the current user.
 * Auto-refreshes if expired. Used by the Web Playback SDK on the client.
 */
export async function GET() {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { notificationPreferences: true },
  })

  const prefs = (profile?.notificationPreferences ?? {}) as Record<string, unknown>
  const spotify = (prefs.spotify ?? {}) as SpotifyData

  if (!spotify.accessToken) {
    return NextResponse.json({ error: 'Spotify not connected', connected: false }, { status: 404 })
  }

  // Check if token is expired (with 5-minute buffer)
  const expiresAt = spotify.tokenExpiresAt ? new Date(spotify.tokenExpiresAt).getTime() : 0
  const isExpired = Date.now() > expiresAt - 5 * 60 * 1000

  if (isExpired && spotify.refreshToken) {
    const refreshRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: spotify.refreshToken,
      }),
    })

    if (!refreshRes.ok) {
      return NextResponse.json({ error: 'Token refresh failed', connected: true, expired: true }, { status: 401 })
    }

    const tokens = (await refreshRes.json()) as {
      access_token: string
      expires_in: number
      refresh_token?: string
    }

    // Update stored tokens in JSON
    const updatedSpotify: SpotifyData = {
      ...spotify,
      accessToken: tokens.access_token,
      tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
    }

    await prisma.userProfile.update({
      where: { userId: session.user.id },
      data: {
        notificationPreferences: { ...prefs, spotify: updatedSpotify },
      },
    })

    return NextResponse.json({
      token: tokens.access_token,
      expiresIn: tokens.expires_in,
      isPremium: spotify.isPremium ?? false,
      displayName: spotify.displayName ?? null,
      connected: true,
    })
  }

  return NextResponse.json({
    token: spotify.accessToken,
    expiresIn: expiresAt > 0 ? Math.max(0, Math.floor((expiresAt - Date.now()) / 1000)) : 3600,
    isPremium: spotify.isPremium ?? false,
    displayName: spotify.displayName ?? null,
    connected: true,
  })
}
