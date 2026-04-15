import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID ?? ''
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET ?? ''

export async function POST() {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { spotifyRefreshToken: true },
  })

  if (!profile?.spotifyRefreshToken) {
    return NextResponse.json({ error: 'Not connected' }, { status: 400 })
  }

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: profile.spotifyRefreshToken,
    }),
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Refresh failed' }, { status: 502 })
  }

  const data = (await res.json()) as {
    access_token: string
    expires_in: number
    refresh_token?: string
  }

  await prisma.userProfile.update({
    where: { userId: session.user.id },
    data: {
      spotifyAccessToken: data.access_token,
      spotifyExpiresAt: new Date(Date.now() + data.expires_in * 1000),
      ...(data.refresh_token ? { spotifyRefreshToken: data.refresh_token } : {}),
    },
  })

  return NextResponse.json({ accessToken: data.access_token, expiresIn: data.expires_in })
}
