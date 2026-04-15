import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getOrCreateLandingHomeInvite } from '@/lib/dashboard/LandingInviteLinkService'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await getOrCreateLandingHomeInvite(userId, req)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    token: result.token,
    landingUrl: result.landingUrl,
  })
}
