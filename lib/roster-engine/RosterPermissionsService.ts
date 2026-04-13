import { prisma } from '../prisma'

export interface RosterPermissionResult {
  isCommissioner: boolean
  readOnly: boolean
  reason?: string
}

export async function checkCommissionerPermission(
  userId: string,
  leagueId: string,
): Promise<RosterPermissionResult> {
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { userId: true },
  })

  if (!league) {
    return { isCommissioner: false, readOnly: true, reason: 'League not found' }
  }

  const isCommissioner = league.userId === userId
  return {
    isCommissioner,
    readOnly: !isCommissioner,
    reason: isCommissioner ? undefined : 'Commissioner only for editing',
  }
}

export async function detectReadOnlyRosterView(
  userId: string,
  leagueId: string,
): Promise<boolean> {
  const permission = await checkCommissionerPermission(userId, leagueId)
  return permission.readOnly
}
