import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getLegacyTournamentAccess,
  canViewCommissionerDashboard,
  canUseControlConsole,
  canEditHubSettings,
} from '@/lib/tournament/legacyTournamentAccess'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** GET: Viewer permissions for legacy tournament commissioner surfaces. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ tournamentId: string }> }) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id ?? null
  if (!userId) {
    return NextResponse.json({
      authenticated: false,
      canViewCommissionerDashboard: false,
      canUseControlConsole: false,
      canEditHubSettings: false,
      isCreator: false,
    })
  }

  const { tournamentId } = await params
  const access = await getLegacyTournamentAccess(userId, tournamentId)

  return NextResponse.json({
    authenticated: true,
    isCreator: access.isCreator,
    isStaff: Boolean(access.staff),
    canViewCommissionerDashboard: canViewCommissionerDashboard(access),
    canUseControlConsole: canUseControlConsole(access),
    canEditHubSettings: canEditHubSettings(access),
    staffPermissions: access.staff?.permissions ?? null,
  })
}
