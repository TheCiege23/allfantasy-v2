/**
 * Returns the current session user's ID and admin status.
 * Use this to verify which user ID is in the JWT and update STATIC_ADMIN_USER_IDS.
 *
 * GET /api/admin/whoami
 */
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isDevAdminUserId } from '@/lib/dev-admin/access'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = (await getServerSession(authOptions as any)) as {
    user?: { id?: string; email?: string; name?: string }
  } | null

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  return NextResponse.json({
    userId: session.user.id,
    email: session.user.email,
    name: session.user.name,
    isAdmin: isDevAdminUserId(session.user.id),
  })
}
