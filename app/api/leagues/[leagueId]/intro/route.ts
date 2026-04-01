import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ leagueId: string }> }
) {
  const session = (await getServerSession(authOptions as any)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { leagueId } = await params

  await (prisma as any).leagueIntroView.upsert({
    where: {
      leagueId_userId: {
        leagueId,
        userId: session.user.id,
      },
    },
    update: {
      seenAt: new Date(),
    },
    create: {
      leagueId,
      userId: session.user.id,
    },
  })

  return NextResponse.json({ ok: true })
}
