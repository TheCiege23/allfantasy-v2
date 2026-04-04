import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function requireAfSub(): Promise<string | NextResponse> {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const profile = await prisma.userProfile.findFirst({
    where: { userId: session.user.id },
    select: { afCommissionerSub: true },
  })
  if (!profile?.afCommissionerSub) {
    return NextResponse.json(
      {
        error: 'AF Commissioner Subscription required for AI features.',
        upgrade: true,
      },
      { status: 402 },
    )
  }
  return session.user.id
}

/** Same subscription gate as `requireAfSub`, but throws for use in lib/services (not Route handlers). */
export async function requireAfSubUserIdOrThrow(): Promise<string> {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  if (!session?.user?.id) {
    throw new Error('Not authenticated')
  }
  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { afCommissionerSub: true },
  })
  if (!profile?.afCommissionerSub) {
    throw new Error('AF Commissioner Subscription required for AI features.')
  }
  return session.user.id
}
