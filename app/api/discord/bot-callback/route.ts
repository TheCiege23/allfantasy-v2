import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const BASE = process.env.NEXTAUTH_URL ?? 'https://www.allfantasy.ai'

export async function GET(req: NextRequest) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/login?callbackUrl=/settings', BASE))
  }

  const guildId = req.nextUrl.searchParams.get('guild_id')?.trim()
  if (!guildId) {
    return NextResponse.redirect(new URL('/settings?discord=bot-error', BASE))
  }

  await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      discordGuildId: guildId,
    },
    update: { discordGuildId: guildId },
  })

  return NextResponse.redirect(new URL('/settings?discord=bot-linked', BASE))
}
