import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? ''
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? ''

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
    select: {
      spotifyAccessToken: true,
      spotifyRefreshToken: true,
      spotifyTokenExpiresAt: true,
      spotifyIsPremium: true,
      spotifyDisplayName: true,
    },
  })

  if (!profile?.spotifyAccessToken) {
    return NextResponse.json({ error: 'Spotify not connected', connected: false }, { status: 404 })
  }

  // Check if token is expired (with 5-minute buffer)
  const isExpired = profile.spotifyTokenExpiresAt
    ? Date.now() > profile.spotifyTokenExpiresAt.getTime() - 5 * 60 * 1000
    : true

  if (isExpired && profile.spotifyRefreshToken) {
    // Refresh the token
    const refreshRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: profile.spotifyRefreshToken,
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

    // Update stored tokens
    await prisma.userProfile.update({
      where: { userId: session.user.id },
      data: {
        spotifyAccessToken: tokens.access_token,
        spotifyTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        ...(tokens.refresh_token ? { spotifyRefreshToken: tokens.refresh_token } : {}),
      },
    })

    return NextResponse.json({
      token: tokens.access_token,
      expiresIn: tokens.expires_in,
      isPremium: profile.spotifyIsPremium,
      displayName: profile.spotifyDisplayName,
      connected: true,
    })
  }

  return NextResponse.json({
    token: profile.spotifyAccessToken,
    expiresIn: profile.spotifyTokenExpiresAt
      ? Math.max(0, Math.floor((profile.spotifyTokenExpiresAt.getTime() - Date.now()) / 1000))
      : 3600,
    isPremium: profile.spotifyIsPremium,
    displayName: profile.spotifyDisplayName,
    connected: true,
  })
}
