import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { aiAccessResolver } from '@/lib/ai-access/AIAccessResolver'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/ai/access
 *
 * Returns the current AI access posture for the signed-in user:
 *   - trial days remaining (10-day signup trial)
 *   - active subscription plans
 *   - spendable token balance
 *
 * Used by dashboard surfaces to render "AI Tokens / Trial" instead of winnings.
 */
export async function GET() {
  const session = (await getServerSession(authOptions as never).catch(() => null)) as
    | { user?: { id?: string; email?: string | null } }
    | null

  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const user = await prisma.appUser
    .findUnique({ where: { id: userId }, select: { createdAt: true, email: true } })
    .catch(() => null)

  const status = await aiAccessResolver.resolveForUser({
    userId,
    userEmail: user?.email ?? session?.user?.email ?? null,
    createdAt: user?.createdAt ?? null,
  })

  return NextResponse.json(status, {
    headers: { 'Cache-Control': 'private, no-store, max-age=0' },
  })
}
