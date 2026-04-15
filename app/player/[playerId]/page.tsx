import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { PlayerProfileClient } from './PlayerProfileClient'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ playerId: string }>
}): Promise<Metadata> {
  const { playerId } = await params
  const identity = await prisma.playerIdentityMap
    .findFirst({
      where: {
        OR: [
          { id: playerId },
          { sleeperId: playerId },
          { normalizedName: playerId.toLowerCase().replace(/-/g, ' ') },
        ],
      },
      select: { canonicalName: true, position: true, currentTeam: true },
    })
    .catch(() => null)

  const name = identity?.canonicalName ?? 'Player'
  return {
    title: `${name} – Player Profile – AllFantasy`,
    description: `${name} (${identity?.position ?? ''}, ${identity?.currentTeam ?? ''}) fantasy profile, news, outlook, analytics, and market trends.`,
  }
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ playerId: string }>
}) {
  const session = (await getServerSession(authOptions as never)) as {
    user?: { id?: string }
  } | null

  if (!session?.user?.id) {
    const { playerId } = await params
    redirect(`/login?callbackUrl=/player/${playerId}`)
  }

  const { playerId } = await params

  const identity = await prisma.playerIdentityMap
    .findFirst({
      where: {
        OR: [
          { id: playerId },
          { sleeperId: playerId },
          { normalizedName: playerId.toLowerCase().replace(/-/g, ' ') },
        ],
      },
    })
    .catch(() => null)

  const playerData = identity
    ? {
        id: identity.id,
        name: identity.canonicalName,
        position: identity.position ?? '',
        team: identity.currentTeam ?? 'FA',
        sport: identity.sport ?? 'NFL',
        sleeperId: identity.sleeperId ?? null,
        status: identity.status ?? 'active',
      }
    : {
        id: playerId,
        name: playerId.replace(/-/g, ' '),
        position: '',
        team: 'FA',
        sport: 'NFL',
        sleeperId: null,
        status: 'unknown',
      }

  return <PlayerProfileClient player={playerData} />
}
